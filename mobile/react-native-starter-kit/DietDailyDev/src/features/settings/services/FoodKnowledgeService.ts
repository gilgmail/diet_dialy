const API_BASE = process.env.EXPO_PUBLIC_API_URL

export interface FoodKnowledgeQueueItem {
  queueId: string
  foodId: string
  foodName: string
  category: string | null
  reason: string
  status: string
  priority: number
  attempts: number
  scheduledFor: string
  updatedAt: string
  completedAt: string | null
}

export interface FoodKnowledgeStatusSummary {
  pendingCount: number
  inProgressCount: number
  failedCount: number
  completedCount: number
  missingCount: number
  staleCount: number
  items: FoodKnowledgeQueueItem[]
}

export class FoodKnowledgeService {
  private static get apiBase() {
    if (!API_BASE) {
      throw new Error('EXPO_PUBLIC_API_URL is not configured')
    }
    return API_BASE.replace(/\/+$/, '')
  }

  static async getStatus(userId: string): Promise<FoodKnowledgeStatusSummary | null> {
    const endpoint = `${this.apiBase}/api/food-knowledge/status?userId=${userId}`
    const response = await fetch(endpoint, {
      headers: { 'Content-Type': 'application/json' }
    })
    if (!response.ok) {
      console.warn('[FoodKnowledgeService] status request failed:', response.status)
      return null
    }

    const payload = (await response.json()) as {
      success: boolean
      summary?: FoodKnowledgeStatusSummary
    }
    if (!payload.success || !payload.summary) {
      return null
    }
    return payload.summary
  }

  static async requestRefresh(userId: string, foodIds: string[]): Promise<boolean> {
    if (!foodIds.length) {
      return false
    }
    const endpoint = `${this.apiBase}/api/food-knowledge/refresh`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        foodIds,
        reason: 'manual_request'
      })
    })
    if (!response.ok) {
      console.warn('[FoodKnowledgeService] refresh request failed:', response.status)
      return false
    }
    const payload = await response.json()
    return Boolean(payload?.success)
  }

  static async triggerProcessor(): Promise<{ success: boolean; processed?: number; error?: string }> {
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase environment variables not configured')
      }

      const functionsUrl = supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1')
      const endpoint = `${functionsUrl}/refresh-food-analysis`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('[FoodKnowledgeService] processor trigger failed:', response.status, errorText)
        return { success: false, error: `HTTP ${response.status}` }
      }

      const result = await response.json()
      return {
        success: true,
        processed: result.processed ?? 0
      }
    } catch (error) {
      console.error('[FoodKnowledgeService] triggerProcessor error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async syncMissingFoods(userId: string): Promise<{ success: boolean; enqueued?: number; message?: string; error?: string }> {
    try {
      const endpoint = `${this.apiBase}/api/food-knowledge/sync-missing`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('[FoodKnowledgeService] sync-missing failed:', response.status, errorText)
        return { success: false, error: `HTTP ${response.status}` }
      }

      const result = await response.json()
      return {
        success: result.success ?? false,
        enqueued: result.enqueued ?? 0,
        message: result.message
      }
    } catch (error) {
      console.error('[FoodKnowledgeService] syncMissingFoods error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
