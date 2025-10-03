import { supabase } from '@/shared/api/supabase/client'
import type {
  SymptomEntry,
  CreateSymptomEntryInput,
  UpdateSymptomEntryInput,
} from '../types'

export class SymptomDiaryService {
  /**
   * Get all symptom entries for the current user
   * Ordered by occurred_at descending (newest first)
   */
  static async getSymptomEntries(userId: string) {
    try {
      const { data, error } = await supabase
        .from('symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .order('occurred_at', { ascending: false })

      if (error) throw error

      return { data: data as SymptomEntry[], error: null }
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
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('occurred_at', startOfDay.toISOString())
        .lte('occurred_at', endOfDay.toISOString())
        .order('occurred_at', { ascending: false })

      if (error) throw error

      return { data: data as SymptomEntry[], error: null }
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
   */
  static async createSymptomEntry(
    userId: string,
    input: CreateSymptomEntryInput
  ) {
    try {
      const entry = {
        user_id: userId,
        symptom_name: input.symptom_name,
        severity: input.severity,
        duration_minutes: input.duration_minutes,
        notes: input.notes,
        occurred_at: input.occurred_at || new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('symptom_entries')
        .insert(entry)
        .select()
        .single()

      if (error) throw error

      return { data: data as SymptomEntry, error: null }
    } catch (error) {
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
      const { data, error } = await supabase
        .from('symptom_entries')
        .update(input)
        .eq('id', entryId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return { data: data as SymptomEntry, error: null }
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
        .from('symptom_entries')
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
}
