import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  FoodAnalysisCache,
  FoodAnalysisCacheInsert,
  FoodAnalysisCacheUpdate
} from '@/types/supabase'

export const DEFAULT_FOOD_ANALYSIS_VERSION = process.env.FOOD_ANALYSIS_VERSION ?? '2025.11.01'
export const DEFAULT_FOOD_ANALYSIS_MAX_AGE_DAYS = Number(
  process.env.FOOD_ANALYSIS_MAX_AGE_DAYS ?? 90
)

export interface FoodAnalysisLookupOptions {
  targetVersion?: string
  maxAgeDays?: number
  now?: Date
}

export interface FoodAnalysisLookupResult {
  fresh: FoodAnalysisCache[]
  stale: FoodAnalysisCache[]
  missing: string[]
}

export function shouldRefreshFoodAnalysis(
  record: FoodAnalysisCache,
  options: FoodAnalysisLookupOptions = {}
): boolean {
  const targetVersion = options.targetVersion ?? DEFAULT_FOOD_ANALYSIS_VERSION
  const maxAgeDays = options.maxAgeDays ?? DEFAULT_FOOD_ANALYSIS_MAX_AGE_DAYS
  const now = options.now ?? new Date()
  const updatedAt = new Date(record.analysis_updated_at)
  const ageDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)

  if (!Number.isFinite(ageDays) || ageDays < 0) {
    return true
  }

  if (record.analysis_version !== targetVersion) {
    return true
  }

  if (ageDays >= maxAgeDays) {
    return true
  }

  return false
}

export class FoodAnalysisCacheService {
  private client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async fetchAnalyses(
    foodIds: string[],
    options: FoodAnalysisLookupOptions = {}
  ): Promise<FoodAnalysisLookupResult> {
    if (!foodIds.length) {
      return { fresh: [], stale: [], missing: [] }
    }

    const { data, error } = await this.client
      .from('food_analysis_cache')
      .select('*')
      .in('food_id', foodIds)

    if (error) {
      console.error('[FoodAnalysisCacheService] Failed to fetch analysis cache', error)
      throw error
    }

    const records = data ?? []
    const fresh: FoodAnalysisCache[] = []
    const stale: FoodAnalysisCache[] = []

    for (const record of records) {
      if (shouldRefreshFoodAnalysis(record, options)) {
        stale.push(record)
      } else {
        fresh.push(record)
      }
    }

    const existingIds = new Set(records.map((record) => record.food_id))
    const missing = foodIds.filter((id) => !existingIds.has(id))

    return { fresh, stale, missing }
  }

  async incrementUsage(foodIds: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(foodIds))
    if (!uniqueIds.length) {
      return
    }

    const { error } = await this.client.rpc('increment_food_analysis_usage', {
      p_food_ids: uniqueIds
    })

    if (error) {
      console.error('[FoodAnalysisCacheService] Failed to increment usage count', error)
      throw error
    }
  }

  async enqueueRefreshRequests(params: {
    foodIds: string[]
    requestedBy?: string
    reason?: 'missing' | 'stale' | 'manual_request'
    priority?: number
    targetVersion?: string
  }): Promise<void> {
    const uniqueIds = Array.from(new Set(params.foodIds.filter((id): id is string => Boolean(id))))
    if (!uniqueIds.length) {
      return
    }

    const now = new Date().toISOString()
    const reason = params.reason ?? 'manual_request'
    const payload = uniqueIds.map((foodId) => ({
      food_id: foodId,
      requested_by: params.requestedBy ?? null,
      reason,
      priority: params.priority ?? (reason === 'missing' ? 9 : 5),
      status: 'pending',
      target_version: params.targetVersion ?? DEFAULT_FOOD_ANALYSIS_VERSION,
      metadata: {
        reason,
      },
      scheduled_for: now,
      last_requested_at: now,
    }))

    const { error } = await this.client
      .from('food_analysis_refresh_queue')
      .upsert(payload, { onConflict: 'food_id' })

    if (error) {
      console.error('[FoodAnalysisCacheService] Failed to enqueue refresh requests', error)
      throw error
    }
  }

  async upsertAnalysis(
    payload: FoodAnalysisCacheInsert | FoodAnalysisCacheUpdate
  ): Promise<FoodAnalysisCache | null> {
    if (!payload.food_id) {
      throw new Error('Food analysis payload requires food_id')
    }

    const { data, error } = await this.client
      .from('food_analysis_cache')
      .upsert(payload, { onConflict: 'food_id' })
      .select('*')
      .single()

    if (error) {
      console.error('[FoodAnalysisCacheService] Failed to upsert analysis payload', error)
      throw error
    }

    return data
  }
}
