import { supabase } from '@/shared/api/supabase/client'
import type {
  DailySymptomEntryInsert,
  DietDailyUserInsert,
  DailySymptomEntryRow,
} from '@/shared/types/supabase'
import type {
  SymptomEntry,
  CreateSymptomEntryInput,
  UpdateSymptomEntryInput,
  SeverityLevel,
} from '../types'

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((item) => (typeof item === 'string' ? item : item != null ? String(item) : null))
    .filter((item): item is string => !!item)
}

/**
 * Symptom Diary Service
 * Uses daily_symptom_entries table (same as Web version)
 * Maps between simple mobile UI and comprehensive database structure
 */
export class SymptomDiaryService {
  /**
   * Get all symptom entries for the current user
   * Ordered by recorded_date descending (newest first)
   */
  static async getSymptomEntries(userId: string) {
    try {
      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_date', { ascending: false })

      if (error) throw error

      return {
        data: data ? data.map((entry) => this.transformFromDatabase(entry)) : null,
        error: null
      }
    } catch (error) {
      return {
        data: null,
        error: {
          message:
            error instanceof Error ? error.message : 'Failed to fetch symptom entries',
        },
      }
    }
  }

  /**
   * Get symptom entries for a specific date
   */
  static async getSymptomEntriesByDate(userId: string, date: Date) {
    try {
      const dateStr = date.toISOString().split('T')[0]
      console.log('[SymptomDiaryService] getSymptomEntriesByDate:', { userId, dateStr })

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('recorded_date', dateStr)
        .order('recorded_at', { ascending: false })

      console.log('[SymptomDiaryService] Query result:', {
        dataCount: data?.length || 0,
        error,
        rawData: data
      })

      if (error) throw error

      const transformed = data ? data.map(entry => this.transformFromDatabase(entry)) : null
      console.log('[SymptomDiaryService] Transformed:', { count: transformed?.length || 0 })

      return {
        data: transformed,
        error: null
      }
    } catch (error) {
      console.error('[SymptomDiaryService] Error:', error)
      return {
        data: null,
        error: {
          message:
            error instanceof Error ? error.message : 'Failed to fetch symptom entries',
        },
      }
    }
  }

  /**
   * Get symptom entries for a date range
   */
  static async getSymptomEntriesByDateRange(userId: string, startDate: Date, endDate: Date) {
    try {
      const startStr = startDate.toISOString().split('T')[0]
      const endStr = endDate.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_date', startStr)
        .lte('recorded_date', endStr)
        .order('recorded_at', { ascending: false })

      if (error) throw error

      return {
        data: data ? data.map(entry => this.transformFromDatabase(entry)) : null,
        error: null
      }
    } catch (error) {
      return {
        data: null,
        error: {
          message:
            error instanceof Error ? error.message : 'Failed to fetch symptom entries',
        },
      }
    }
  }

  /**
   * Create a new symptom entry
   * Note: Each entry gets a unique timestamp to allow multiple entries per day
   */
  static async createSymptomEntry(
    userId: string,
    input: CreateSymptomEntryInput
  ) {
    try {
      await this.ensureUserProfile(userId)
      console.log('[SymptomDiaryService] Creating symptom entry:', { userId, input })

      // Use current time with milliseconds to ensure uniqueness for multiple entries per day
      const occurredAt = input.occurred_at ? new Date(input.occurred_at) : new Date()
      const recordedDate = occurredAt.toISOString().split('T')[0]

      // Transform simple input to database structure
      const dbEntry = this.transformToDatabase(userId, recordedDate, occurredAt, input)

      console.log('[SymptomDiaryService] Transformed database entry:', dbEntry)

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .insert([dbEntry])
        .select()
        .single()

      if (error) {
        console.error('[SymptomDiaryService] Supabase error:', error)
        throw error
      }

      console.log('[SymptomDiaryService] Successfully created entry:', data)

      return {
        data: data ? this.transformFromDatabase(data) : null,
        error: null
      }
    } catch (error) {
      console.error('[SymptomDiaryService] Create entry failed:', error)
      const supabaseError =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message?: string; code?: string; details?: string; hint?: string })
          : null

      const parts: string[] = []
      if (supabaseError?.code) parts.push(`code=${supabaseError.code}`)
      if (supabaseError?.message) parts.push(supabaseError.message)
      if (supabaseError?.details) parts.push(supabaseError.details)
      if (supabaseError?.hint) parts.push(`hint: ${supabaseError.hint}`)
      const fallback =
        error instanceof Error ? error.message : 'Failed to create symptom entry'

      return {
        data: null,
        error: {
          message: parts.length ? parts.join(' | ') : fallback,
        },
      }
    }
  }

  /**
   * Ensure a matching row exists in diet_daily_users for FK constraint.
   * Some legacy accounts may be missing this row because they pre-date mobile logging.
   */
  private static async ensureUserProfile(userId: string) {
    try {
      const { data: existing, error: lookupError } = await supabase
        .from('diet_daily_users')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (lookupError) {
        console.warn('[SymptomDiaryService] Failed to lookup user profile:', lookupError)
        return
      }

      if (existing) {
        return
      }

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData?.user) {
        console.warn('[SymptomDiaryService] Unable to fetch auth user for profile sync:', authError)
        return
      }

      const { user } = authData
      if (!user.email) {
        console.warn('[SymptomDiaryService] Auth user missing email, skip profile sync')
        return
      }

      const profilePayload: DietDailyUserInsert = {
        id: user.id,
        email: user.email,
        name: (user.user_metadata?.full_name as string | undefined) ?? null,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      }

      const { error: upsertError } = await supabase
        .from('diet_daily_users')
        .upsert(profilePayload, { onConflict: 'id' })

      if (upsertError) {
        console.warn('[SymptomDiaryService] Failed to upsert user profile:', upsertError)
      }
    } catch (error) {
      console.warn('[SymptomDiaryService] Unexpected error ensuring user profile:', error)
    }
  }

  /**
   * Update an existing symptom entry
   */
  static async updateSymptomEntry(
    entryId: string,
    userId: string,
    input: UpdateSymptomEntryInput
  ) {
    try {
      // First get the existing entry to preserve values
      const { data: existing, error: fetchError } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single()

      if (fetchError) throw fetchError

      const occurredAt = input.occurred_at ? new Date(input.occurred_at) : new Date(existing.recorded_at)
      const recordedDate = occurredAt.toISOString().split('T')[0]

      // Transform update to database structure while preserving existing values
      const existingRow = existing as DailySymptomEntryRow
      const fallbackSymptoms = toStringArray(existingRow.additional_symptoms)
      const dbUpdate = this.transformToDatabase(
        userId,
        recordedDate,
        occurredAt,
        {
          symptom_name: input.symptom_name ?? fallbackSymptoms[0] ?? '症狀記錄',
          severity: (input.severity ?? this.scoreToSeverity(existingRow.overall_health)) as SeverityLevel,
          duration_minutes: input.duration_minutes,
          notes: input.notes ?? existingRow.notes ?? undefined,
        },
        existingRow
      )

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .update(dbUpdate)
        .eq('id', entryId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return {
        data: data ? this.transformFromDatabase(data) : null,
        error: null
      }
    } catch (error) {
      return {
        data: null,
        error: {
          message:
            error instanceof Error ? error.message : 'Failed to update symptom entry',
        },
      }
    }
  }

  /**
   * Delete a symptom entry
   */
  static async deleteSymptomEntry(entryId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('daily_symptom_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId)

      if (error) throw error

      return { error: null }
    } catch (error) {
      return {
        error: {
          message:
            error instanceof Error ? error.message : 'Failed to delete symptom entry',
        },
      }
    }
  }

  /**
   * Transform database entry to mobile app format
   */
  private static transformFromDatabase(dbEntry: DailySymptomEntryRow): SymptomEntry {
    const additionalSymptoms = toStringArray(dbEntry.additional_symptoms)
    const medications = toStringArray(dbEntry.medications_taken)
    const triggers = toStringArray(dbEntry.triggers_identified)
    const symptomName = additionalSymptoms[0] || '症狀記錄'
    const severity = this.scoreToSeverity(dbEntry.overall_health)

    return {
      id: dbEntry.id,
      user_id: dbEntry.user_id,
      recorded_date: dbEntry.recorded_date,
      recorded_at: dbEntry.recorded_at,

      // UI-friendly fields
      symptom_name: symptomName,
      severity,
      duration_minutes: undefined,
      notes: dbEntry.notes ?? undefined,

      // Core scores (for compatibility)
      overall_health: dbEntry.overall_health,
      abdominal_pain: dbEntry.abdominal_pain ?? 0,
      diarrhea: dbEntry.diarrhea ?? 0,
      bloody_stool: dbEntry.bloody_stool ?? 0,
      bloating: dbEntry.bloating ?? 0,

      // Additional data
      additional_symptoms: additionalSymptoms,
      medications_taken: medications,
      triggers_identified: triggers,

      created_at: dbEntry.created_at ?? dbEntry.recorded_at,
      updated_at: dbEntry.updated_at ?? dbEntry.recorded_at,
    }
  }

  /**
   * Transform mobile input to database format
   */
  private static transformToDatabase(
    userId: string,
    recordedDate: string,
    recordedAt: Date,
    input: CreateSymptomEntryInput | UpdateSymptomEntryInput,
    existing?: DailySymptomEntryRow
  ): DailySymptomEntryInsert {
    // Map severity to overall_health score (inverse: low health = high severity)
    const severityScore = this.severityToScore(input.severity as SeverityLevel)
    const existingSymptoms = existing ? toStringArray(existing.additional_symptoms) : []
    const additionalSymptoms = input.symptom_name
      ? [input.symptom_name]
      : existingSymptoms

    return {
      user_id: userId,
      recorded_date: recordedDate,
      recorded_at: recordedAt.toISOString(),

      // Core symptom scores - use existing or defaults
      overall_health: severityScore,
      abdominal_pain: existing?.abdominal_pain ?? null,
      diarrhea: existing?.diarrhea ?? null,
      bloody_stool: existing?.bloody_stool ?? null,
      bloating: existing?.bloating ?? null,

      // Bowel movement tracking - use existing or defaults
      bowel_movement_count: existing?.bowel_movement_count ?? null,
      stool_type: existing?.stool_type ?? null,

      // Contextual scores - use existing or defaults
      mood_score: existing?.mood_score ?? null,
      energy_level: existing?.energy_level ?? null,
      sleep_quality: existing?.sleep_quality ?? null,
      stress_level: existing?.stress_level ?? null,

      // Additional data
      additional_symptoms: additionalSymptoms,
      medications_taken: existing?.medications_taken ?? null,
      triggers_identified: existing?.triggers_identified ?? null,
      improvement_factors: existing?.improvement_factors ?? [],
      related_food_entries: existing?.related_food_entries ?? [],

      // Observations
      notes: input.notes ?? existing?.notes ?? null,

      // Medication adherence
      medication_adherence: existing?.medication_adherence ?? null,

      // Environmental
      weather_conditions: existing?.weather_conditions ?? null,
      activity_level: existing?.activity_level ?? null,

      // Metadata
      entry_source: 'manual',
      data_completeness_score: existing?.data_completeness_score ?? 0.6,
    }
  }

  /**
   * Convert severity level to health score (0-5)
   * Lower health score = higher severity (inverse relationship)
   */
  private static severityToScore(severity: SeverityLevel): number {
    switch (severity) {
      case 'mild': return 4    // Mild symptoms = good health (4/5)
      case 'moderate': return 2  // Moderate symptoms = fair health (2/5)
      case 'severe': return 1   // Severe symptoms = poor health (1/5)
      default: return 3
    }
  }

  /**
   * Convert health score to severity level
   */
  private static scoreToSeverity(score: number): SeverityLevel {
    if (score >= 4) return 'mild'
    if (score >= 2) return 'moderate'
    return 'severe'
  }
}
