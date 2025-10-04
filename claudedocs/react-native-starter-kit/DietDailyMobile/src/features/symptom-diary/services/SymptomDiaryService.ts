import { supabase } from '@/shared/api/supabase/client'
import type {
  SymptomEntry,
  CreateSymptomEntryInput,
  UpdateSymptomEntryInput,
  SeverityLevel,
} from '../types'

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
   * Get symptom entries for a specific date
   */
  static async getSymptomEntriesByDate(userId: string, date: Date) {
    try {
      const dateStr = date.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('recorded_date', dateStr)
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
      console.log('[SymptomDiaryService] Creating symptom entry:', { userId, input })

      // Use current time with milliseconds to ensure uniqueness for multiple entries per day
      const occurredAt = input.occurred_at ? new Date(input.occurred_at) : new Date()
      const recordedDate = occurredAt.toISOString().split('T')[0]

      // Transform simple input to database structure
      const dbEntry = this.transformToDatabase(userId, recordedDate, occurredAt, input)

      console.log('[SymptomDiaryService] Transformed database entry:', dbEntry)

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .insert(dbEntry)
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
      return {
        data: null,
        error: {
          message:
            error instanceof Error ? error.message : 'Failed to create symptom entry',
        },
      }
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
      const dbUpdate = this.transformToDatabase(userId, recordedDate, occurredAt, {
        symptom_name: input.symptom_name ?? existing.additional_symptoms?.[0] ?? '',
        severity: (input.severity ?? this.scoreToSeverity(existing.overall_health)) as SeverityLevel,
        duration_minutes: input.duration_minutes ?? existing.duration_minutes,
        notes: input.notes ?? existing.notes,
      }, existing)

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
  private static transformFromDatabase(dbEntry: any): SymptomEntry {
    // Extract symptom name from additional_symptoms array or use a default
    const symptomName = dbEntry.additional_symptoms?.[0] || '症狀記錄'

    // Determine severity from overall_health score
    const severity = this.scoreToSeverity(dbEntry.overall_health)

    return {
      id: dbEntry.id,
      user_id: dbEntry.user_id,
      recorded_date: dbEntry.recorded_date,
      recorded_at: dbEntry.recorded_at,

      // UI-friendly fields
      symptom_name: symptomName,
      severity,
      duration_minutes: dbEntry.duration_minutes,
      notes: dbEntry.notes,

      // Core scores (for compatibility)
      overall_health: dbEntry.overall_health,
      abdominal_pain: dbEntry.abdominal_pain,
      diarrhea: dbEntry.diarrhea,
      bloody_stool: dbEntry.bloody_stool,
      bloating: dbEntry.bloating,

      // Additional data
      additional_symptoms: dbEntry.additional_symptoms || [],
      medications_taken: dbEntry.medications_taken || [],
      triggers_identified: dbEntry.triggers_identified || [],

      created_at: dbEntry.created_at,
      updated_at: dbEntry.updated_at,
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
    existing?: any
  ): any {
    // Map severity to overall_health score (inverse: low health = high severity)
    const severityScore = this.severityToScore(input.severity as SeverityLevel)

    return {
      user_id: userId,
      recorded_date: recordedDate,
      recorded_at: recordedAt.toISOString(),

      // Core symptom scores - use existing or defaults
      overall_health: severityScore,
      abdominal_pain: existing?.abdominal_pain ?? 0,
      diarrhea: existing?.diarrhea ?? 0,
      bloody_stool: existing?.bloody_stool ?? 0,
      bloating: existing?.bloating ?? 0,

      // Bowel movement tracking - use existing or defaults
      bowel_movement_count: existing?.bowel_movement_count ?? null,
      stool_type: existing?.stool_type ?? null,

      // Contextual scores - use existing or defaults
      mood_score: existing?.mood_score ?? 3,
      energy_level: existing?.energy_level ?? 3,
      sleep_quality: existing?.sleep_quality ?? 3,
      stress_level: existing?.stress_level ?? 3,

      // Additional data
      additional_symptoms: input.symptom_name ? [input.symptom_name] : (existing?.additional_symptoms ?? []),
      medications_taken: existing?.medications_taken ?? [],
      triggers_identified: existing?.triggers_identified ?? [],
      improvement_factors: existing?.improvement_factors ?? [],
      related_food_entries: existing?.related_food_entries ?? [],

      // Observations
      notes: input.notes,
      duration_minutes: input.duration_minutes,

      // Medication adherence
      medication_adherence: existing?.medication_adherence ?? null,

      // Environmental
      weather_conditions: existing?.weather_conditions ?? null,
      activity_level: existing?.activity_level ?? null,

      // Metadata
      entry_source: 'manual', // Same as Web version
      data_completeness_score: 0.6, // Simplified mobile entry has less data
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
