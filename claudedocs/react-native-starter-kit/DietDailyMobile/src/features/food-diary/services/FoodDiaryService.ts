import { supabase } from '@/shared/api/supabase/client'
import type {
  FoodEntry,
  CreateFoodEntryInput,
  UpdateFoodEntryInput,
} from '../types'

export class FoodDiaryService {
  /**
   * Get all food entries for the current user
   * Ordered by consumed_at descending (newest first)
   */
  static async getFoodEntries(userId: string) {
    try {
      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', userId)
        .order('consumed_at', { ascending: false })

      if (error) throw error

      return { data: data as FoodEntry[], error: null }
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch food entries',
        },
      }
    }
  }

  /**
   * Get food entries for a specific date
   */
  static async getFoodEntriesByDate(userId: string, date: Date) {
    try {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('food_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('consumed_at', startOfDay.toISOString())
        .lte('consumed_at', endOfDay.toISOString())
        .order('consumed_at', { ascending: false })

      if (error) throw error

      return { data: data as FoodEntry[], error: null }
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch food entries',
        },
      }
    }
  }

  /**
   * Create a new food entry
   */
  static async createFoodEntry(userId: string, input: CreateFoodEntryInput) {
    try {
      const entry = {
        user_id: userId,
        food_name: input.food_name,
        meal_type: input.meal_type,
        portion_size: input.portion_size,
        calories: input.calories,
        notes: input.notes,
        consumed_at: input.consumed_at || new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('food_entries')
        .insert(entry)
        .select()
        .single()

      if (error) throw error

      return { data: data as FoodEntry, error: null }
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to create food entry',
        },
      }
    }
  }

  /**
   * Update an existing food entry
   */
  static async updateFoodEntry(
    entryId: string,
    userId: string,
    input: UpdateFoodEntryInput
  ) {
    try {
      const { data, error } = await supabase
        .from('food_entries')
        .update(input)
        .eq('id', entryId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return { data: data as FoodEntry, error: null }
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to update food entry',
        },
      }
    }
  }

  /**
   * Delete a food entry
   */
  static async deleteFoodEntry(entryId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('food_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId)

      if (error) throw error

      return { error: null }
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to delete food entry',
        },
      }
    }
  }

  /**
   * Search for foods in the database
   * Uses multi-field search across name, name_en, and brand (matching Web App)
   * Only returns approved foods
   */
  static async searchFoods(query: string) {
    try {
      if (!query || query.trim().length === 0) {
        // Return empty array if no query
        return { data: [], error: null }
      }

      // Define approved statuses (matching Web App)
      const APPROVED_STATUSES = ['admin_approved', 'ai_approved', 'approved']

      // Multi-field search across name, name_en, brand (matching Web App)
      const { data, error } = await supabase
        .from('diet_daily_foods')
        .select('id, name, name_en, brand, category, serving_size, calories, protein, carbohydrates, fat, verification_status')
        .or(`name.ilike.%${query}%,name_en.ilike.%${query}%,brand.ilike.%${query}%`)
        .in('verification_status', APPROVED_STATUSES)
        .order('name')
        .limit(20)

      if (error) {
        console.error('Supabase search error:', error)
        throw error
      }

      console.log(`Search for "${query}" returned ${data?.length || 0} results`)

      return {
        data: data as any[],
        error: null
      }
    } catch (error) {
      console.error('Search foods catch error:', error)
      return {
        data: [],
        error: {
          message: error instanceof Error ? error.message : 'Failed to search foods',
        },
      }
    }
  }

  /**
   * Get popular/recommended foods
   * Returns approved foods (matching Web App behavior)
   */
  static async getPopularFoods(limit: number = 10) {
    try {
      const APPROVED_STATUSES = ['admin_approved', 'ai_approved', 'approved']

      const { data, error } = await supabase
        .from('diet_daily_foods')
        .select('id, name, name_en, brand, category, serving_size, calories, protein, carbohydrates, fat')
        .in('verification_status', APPROVED_STATUSES)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return { data: data as any[], error: null }
    } catch (error) {
      return {
        data: [],
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch popular foods',
        },
      }
    }
  }

  /**
   * Get foods by category
   * Returns only approved foods (matching Web App behavior)
   */
  static async getFoodsByCategory(category: string) {
    try {
      const APPROVED_STATUSES = ['admin_approved', 'ai_approved', 'approved']

      const { data, error } = await supabase
        .from('diet_daily_foods')
        .select('id, name, name_en, brand, category, serving_size, calories, protein, carbohydrates, fat')
        .eq('category', category)
        .in('verification_status', APPROVED_STATUSES)
        .order('name')

      if (error) throw error

      return { data: data as any[], error: null }
    } catch (error) {
      return {
        data: [],
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch foods by category',
        },
      }
    }
  }
}
