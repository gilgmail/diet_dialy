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
      occurred_at: dbRecord.occurred_at,
      recorded_date: dbRecord.recorded_date,
      stool_type: dbRecord.stool_type,
      has_blood: dbRecord.has_blood,
      difficulty: dbRecord.difficulty,
      duration_minutes: dbRecord.duration_minutes,
      notes: dbRecord.notes,
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
        .from('bowel_movement_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_date', startStr)
        .lte('recorded_date', endStr)
        .order('occurred_at', { ascending: false })

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
   * Get bowel movement entries for specific date
   */
  static async getBowelMovementsByDate(userId: string, date: Date) {
    try {
      const dateStr = date.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('bowel_movement_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('recorded_date', dateStr)
        .order('occurred_at', { ascending: true })

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
   * Create new bowel movement entry
   */
  static async createBowelMovement(
    userId: string,
    input: CreateBowelMovementInput
  ) {
    try {
      const occurredAt = input.occurred_at ? new Date(input.occurred_at) : new Date()
      const recordedDate = occurredAt.toISOString().split('T')[0]

      const payload = {
        user_id: userId,
        occurred_at: occurredAt.toISOString(),
        recorded_date: recordedDate,
        stool_type: input.stool_type,
        has_blood: input.has_blood ?? false,
        difficulty: input.difficulty,
        duration_minutes: input.duration_minutes,
        notes: input.notes,
      }

      const { data, error } = await supabase
        .from('bowel_movement_entries')
        .insert(payload)
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
          message: error instanceof Error ? error.message : 'Failed to create bowel movement',
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

      if (input.stool_type !== undefined) {
        payload.stool_type = input.stool_type
      }
      if (input.has_blood !== undefined) {
        payload.has_blood = input.has_blood
      }
      if (input.difficulty !== undefined) {
        payload.difficulty = input.difficulty
      }
      if (input.duration_minutes !== undefined) {
        payload.duration_minutes = input.duration_minutes
      }
      if (input.notes !== undefined) {
        payload.notes = input.notes
      }
      if (input.occurred_at) {
        const occurredAt = new Date(input.occurred_at)
        payload.occurred_at = occurredAt.toISOString()
        payload.recorded_date = occurredAt.toISOString().split('T')[0]
      }

      const { data, error } = await supabase
        .from('bowel_movement_entries')
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
   * Delete bowel movement entry
   */
  static async deleteBowelMovement(entryId: string) {
    try {
      const { error } = await supabase
        .from('bowel_movement_entries')
        .delete()
        .eq('id', entryId)

      if (error) throw error

      return { data: true, error: null }
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
