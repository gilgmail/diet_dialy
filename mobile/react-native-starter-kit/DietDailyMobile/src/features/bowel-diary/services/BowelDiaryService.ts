import { supabase } from '@/shared/lib/supabase'
import type {
  BowelMovementEntry,
  CreateBowelMovementInput,
  UpdateBowelMovementInput,
} from '../types'

export class BowelDiaryService {
  /**
   * Transform database record to app format
   */
  private static transformFromDatabase(dbRecord: any): BowelMovementEntry {
    return {
      id: dbRecord.id,
      user_id: dbRecord.user_id,
      recorded_date: dbRecord.recorded_date,
      recorded_at: dbRecord.recorded_at,
      bowel_movement_count: dbRecord.bowel_movement_count || 0,
      stool_type: dbRecord.stool_type || 3,
      has_blood: dbRecord.has_blood || false,
      notes: dbRecord.notes || '',
      created_at: dbRecord.created_at,
      updated_at: dbRecord.updated_at,
    }
  }

  /**
   * Get bowel movement entries by date range
   */
  static async getBowelMovementsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ) {
    try {
      const startStr = startDate.toISOString().split('T')[0]
      const endStr = endDate.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_date', startStr)
        .lte('recorded_date', endStr)
        .not('bowel_movement_count', 'is', null)
        .order('recorded_date', { ascending: false })

      if (error) throw error

      const transformed = data ? data.map(entry => this.transformFromDatabase(entry)) : null
      return { data: transformed, error: null }
    } catch (error) {
      console.error('[BowelDiaryService] Error:', error)
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch bowel movements',
        },
      }
    }
  }

  /**
   * Get bowel movement entry for specific date
   */
  static async getBowelMovementByDate(userId: string, date: Date) {
    try {
      const dateStr = date.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('recorded_date', dateStr)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return { data: null, error: null }
        }
        throw error
      }

      const transformed = data ? this.transformFromDatabase(data) : null
      return { data: transformed, error: null }
    } catch (error) {
      console.error('[BowelDiaryService] Error:', error)
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch bowel movement',
        },
      }
    }
  }

  /**
   * Create or update bowel movement entry
   */
  static async upsertBowelMovement(
    userId: string,
    input: CreateBowelMovementInput
  ) {
    try {
      const occurredAt = input.occurred_at ? new Date(input.occurred_at) : new Date()
      const recordedDate = occurredAt.toISOString().split('T')[0]

      // Check if entry exists for this date
      const { data: existing } = await this.getBowelMovementByDate(userId, occurredAt)

      const payload = {
        user_id: userId,
        recorded_date: recordedDate,
        recorded_at: occurredAt.toISOString(),
        bowel_movement_count: input.bowel_movement_count,
        stool_type: input.stool_type,
        has_blood: input.has_blood,
        bloody_stool: input.has_blood ? 3 : 0, // Set bloody_stool score based on has_blood
        notes: input.notes || '',
        // Set default values for required symptom fields if creating new entry
        ...((!existing) && {
          overall_health: 3,
          abdominal_pain: 0,
          diarrhea: input.stool_type === 5 ? 3 : 0,
          bloating: 0,
        }),
      }

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .upsert(payload, {
          onConflict: 'user_id,recorded_date',
        })
        .select()
        .single()

      if (error) throw error

      const transformed = data ? this.transformFromDatabase(data) : null
      return { data: transformed, error: null }
    } catch (error) {
      console.error('[BowelDiaryService] Error:', error)
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to save bowel movement',
        },
      }
    }
  }

  /**
   * Update existing bowel movement entry
   */
  static async updateBowelMovement(
    entryId: string,
    input: UpdateBowelMovementInput
  ) {
    try {
      const payload: any = {
        updated_at: new Date().toISOString(),
      }

      if (input.bowel_movement_count !== undefined) {
        payload.bowel_movement_count = input.bowel_movement_count
      }
      if (input.stool_type !== undefined) {
        payload.stool_type = input.stool_type
        // Update diarrhea score if stool type is watery
        if (input.stool_type === 5) {
          payload.diarrhea = 3
        }
      }
      if (input.has_blood !== undefined) {
        payload.has_blood = input.has_blood
        payload.bloody_stool = input.has_blood ? 3 : 0
      }
      if (input.notes !== undefined) {
        payload.notes = input.notes
      }
      if (input.occurred_at) {
        const occurredAt = new Date(input.occurred_at)
        payload.recorded_at = occurredAt.toISOString()
        payload.recorded_date = occurredAt.toISOString().split('T')[0]
      }

      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .update(payload)
        .eq('id', entryId)
        .select()
        .single()

      if (error) throw error

      const transformed = data ? this.transformFromDatabase(data) : null
      return { data: transformed, error: null }
    } catch (error) {
      console.error('[BowelDiaryService] Error:', error)
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update bowel movement',
        },
      }
    }
  }

  /**
   * Delete bowel movement data from entry (keeps the entry, just removes bowel data)
   */
  static async deleteBowelMovement(entryId: string) {
    try {
      const { data, error} = await supabase
        .from('daily_symptom_entries')
        .update({
          bowel_movement_count: null,
          stool_type: 3, // Reset to default
          has_blood: false,
          bloody_stool: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .select()
        .single()

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('[BowelDiaryService] Error:', error)
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to delete bowel movement',
        },
      }
    }
  }
}
