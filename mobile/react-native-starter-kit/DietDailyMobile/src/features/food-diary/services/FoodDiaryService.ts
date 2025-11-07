import { supabase } from '@/shared/api/supabase/client'
import { appConfig } from '@/shared/config/appConfig'
import type { FoodEntryRow, FoodEntryInsert, FoodEntryUpdate } from '@/shared/types/supabase'
import type {
  FoodEntry,
  CreateFoodEntryInput,
  UpdateFoodEntryInput,
  MealType,
} from '../types'

function extractPortion(entry: FoodEntryRow): string | undefined {
  const unit = entry.unit?.trim()
  if (unit) return unit

  const data = entry.nutrition_data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const portion = (data as Record<string, unknown>).portion_size
    if (typeof portion === 'string' && portion.trim()) {
      return portion.trim()
    }
  }

  return undefined
}

type MealReminderMeal = Exclude<MealType, 'snack'>

function isReminderMeal(meal: MealType): meal is MealReminderMeal {
  return meal === 'breakfast' || meal === 'lunch' || meal === 'dinner'
}

function mapFoodEntry(entry: FoodEntryRow): FoodEntry {
  return {
    id: entry.id,
    user_id: entry.user_id,
    food_id: entry.food_id || undefined,
    food_name: entry.food_name,
    food_category: entry.food_category || undefined,
    meal_type: (entry.meal_type || 'breakfast') as MealType,
    portion_size: extractPortion(entry),
    calories: entry.calories ?? undefined,
    notes: entry.notes ?? undefined,
    consumed_at: entry.consumed_at,
    created_at: entry.created_at ?? entry.consumed_at,
    updated_at: entry.updated_at ?? entry.consumed_at,
  }
}

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

      return {
        data: (data as FoodEntryRow[]).map(mapFoodEntry),
        error: null,
      }
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

      return {
        data: (data as FoodEntryRow[]).map(mapFoodEntry),
        error: null,
      }
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch food entries',
        },
      }
    }
  }

  static async hasMealEntryForDate(
    userId: string,
    date: Date,
    meal: 'breakfast' | 'lunch' | 'dinner'
  ): Promise<boolean> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const { count, error } = await supabase
      .from('food_entries')
      .select('id', { head: true, count: 'exact' })
      .eq('user_id', userId)
      .eq('meal_type', meal)
      .gte('consumed_at', startOfDay.toISOString())
      .lt('consumed_at', endOfDay.toISOString())

    if (error) {
      console.warn('[FoodDiaryService] hasMealEntryForDate failed:', error)
      return false
    }

    return (count ?? 0) > 0
  }

  /**
   * Create a new food entry
   */
  static async createFoodEntry(userId: string, input: CreateFoodEntryInput) {
    try {
      if (appConfig.requireDatabaseFood && !input.food_id?.trim()) {
        throw new Error('請從資料庫選擇食物')
      }

      const portion = input.portion_size?.trim()
      const trimmedName = input.food_name.trim()
      if (!trimmedName) {
        throw new Error('請選擇有效的食物名稱')
      }

      const entry: FoodEntryInsert = {
        user_id: userId,
        food_id: input.food_id?.trim() || null,
        food_name: trimmedName,
        food_category: input.food_category || null,
        meal_type: input.meal_type,
        amount: input.amount || 1, // Default to 1 serving if not provided
        unit: portion || '份', // Default to '份' (serving) if not provided
        calories: input.calories ?? null,
        notes: input.notes ?? null,
        consumed_at: input.consumed_at || new Date().toISOString(),
        nutrition_data: {},
      }

      console.log('Creating food entry:', entry)

      const { data, error } = await supabase
        .from('food_entries')
        .insert([entry])
        .select()
        .single()

      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }

      console.log('Food entry created successfully:', data)

      const mapped = mapFoodEntry(data as FoodEntryRow)

      const reminderMeal = mapped.meal_type
      if (isReminderMeal(reminderMeal)) {
        void import('@/features/settings/services/notificationService')
          .then(({ NotificationService }) =>
            NotificationService.deferMealReminderUntilTomorrow(userId, reminderMeal)
          )
          .catch((notifyError) => {
            console.warn('[FoodDiaryService] Failed to defer meal reminder:', notifyError)
          })
      }

      return { data: mapped, error: null }
    } catch (error) {
      console.error('Create food entry error:', error)
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
      const updatePayload: FoodEntryUpdate = {}

      if (input.food_name !== undefined) {
        updatePayload.food_name = input.food_name
      }

      if (input.food_id !== undefined) {
        updatePayload.food_id = input.food_id?.trim() || null
      }

      if (input.food_category !== undefined) {
        updatePayload.food_category = input.food_category || null
      }

      if (input.meal_type !== undefined) {
        updatePayload.meal_type = input.meal_type
      }

      if (input.portion_size !== undefined) {
        const portion = input.portion_size?.trim()
        updatePayload.unit = portion || ''
      }

      if (input.calories !== undefined) {
        updatePayload.calories = input.calories ?? null
      }

      if (input.notes !== undefined) {
        updatePayload.notes = input.notes ?? null
      }

      if (input.consumed_at !== undefined) {
        updatePayload.consumed_at = input.consumed_at
      }

      const { data, error } = await supabase
        .from('food_entries')
        .update(updatePayload)
        .eq('id', entryId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error

      return { data: mapFoodEntry(data as FoodEntryRow), error: null }
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
      const { data, error} = await supabase
        .from('diet_daily_foods')
        .select('id, name, name_en, brand, category, calories, protein, carbohydrates, fat, verification_status')
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
        .select('id, name, name_en, brand, category, calories, protein, carbohydrates, fat')
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
        .select('id, name, name_en, brand, category, calories, protein, carbohydrates, fat')
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
