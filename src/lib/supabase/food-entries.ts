// Supabase 食物記錄服務
import { supabase } from './client'
import type { FoodEntry, FoodEntryInsert, FoodEntryUpdate } from '@/types/supabase'

export class SupabaseFoodEntriesService {

  // 建立食物記錄
  async createFoodEntry(entryData: FoodEntryInsert): Promise<FoodEntry | null> {
    const { data, error } = await supabase
      .from('food_entries')
      .insert(entryData)
      .select()
      .single()

    if (error) {
      console.error('Create food entry error:', error)
      throw error
    }

    return data
  }

  // 更新食物記錄
  async updateFoodEntry(id: string, updates: FoodEntryUpdate): Promise<FoodEntry | null> {
    const { data, error } = await supabase
      .from('food_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update food entry error:', error)
      throw error
    }

    return data
  }

  // 刪除食物記錄
  async deleteFoodEntry(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('food_entries')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete food entry error:', error)
      throw error
    }

    return true
  }

  // 獲取用戶特定日期的食物記錄
  async getUserFoodEntriesByDate(userId: string, date: string): Promise<FoodEntry[]> {
    const startDate = `${date}T00:00:00.000Z`
    const endDate = `${date}T23:59:59.999Z`

    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('consumed_at', startDate)
      .lte('consumed_at', endDate)
      .order('consumed_at', { ascending: false })

    if (error) {
      console.error('Get user food entries by date error:', error)
      throw error
    }

    return data || []
  }

  // 獲取用戶日期範圍內的食物記錄
  async getUserFoodEntriesByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<FoodEntry[]> {
    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('consumed_at', `${startDate}T00:00:00.000Z`)
      .lte('consumed_at', `${endDate}T23:59:59.999Z`)
      .order('consumed_at', { ascending: false })

    if (error) {
      console.error('Get user food entries by date range error:', error)
      throw error
    }

    return data || []
  }

  // 獲取用戶的食物記錄
  async getUserFoodEntries(
    userId: string,
    options?: {
      limit?: number
      offset?: number
      startDate?: string
      endDate?: string
      mealType?: string
    }
  ): Promise<FoodEntry[]> {
    let query = supabase
      .from('food_entries')
      .select(`
        *,
        diet_daily_foods (
          id,
          name,
          category,
          calories,
          protein,
          carbohydrates,
          fat
        )
      `)
      .eq('user_id', userId)
      .order('consumed_at', { ascending: false })

    if (options?.startDate) {
      query = query.gte('consumed_at', options.startDate)
    }

    if (options?.endDate) {
      query = query.lte('consumed_at', options.endDate)
    }

    if (options?.mealType) {
      query = query.eq('meal_type', options.mealType)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error('Get user food entries error:', error)
      throw error
    }

    return data || []
  }

  // 獲取今日的食物記錄
  async getTodayFoodEntries(userId: string): Promise<FoodEntry[]> {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    return this.getUserFoodEntries(userId, {
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString()
    })
  }

  // 獲取最近的食物記錄
  async getRecentFoodEntries(userId: string, limit: number = 10): Promise<FoodEntry[]> {
    return this.getUserFoodEntries(userId, { limit })
  }

  // 獲取常用食物
  async getFrequentFoods(userId: string, limit: number = 10): Promise<any[]> {
    const { data, error } = await supabase
      .from('food_entries')
      .select('food_name, food_id, COUNT(*) as frequency')
      .eq('user_id', userId)
      .not('food_id', 'is', null)
      .group('food_name, food_id')
      .order('frequency', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Get frequent foods error:', error)
      throw error
    }

    return data || []
  }

  // 獲取日期範圍內的統計資料
  async getFoodEntriesStats(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    totalEntries: number
    totalCalories: number
    averageCaloriesPerDay: number
    mealTypeDistribution: Record<string, number>
    topFoods: Array<{ food_name: string; frequency: number }>
  }> {
    // 獲取基本統計
    const { data: entries, error } = await supabase
      .from('food_entries')
      .select('calories, meal_type, food_name, consumed_at')
      .eq('user_id', userId)
      .gte('consumed_at', startDate)
      .lte('consumed_at', endDate)

    if (error) {
      console.error('Get food entries stats error:', error)
      throw error
    }

    const totalEntries = entries?.length || 0
    const totalCalories = entries?.reduce((sum, entry) => sum + (entry.calories || 0), 0) || 0

    // 計算平均每日卡路里
    const startDateTime = new Date(startDate)
    const endDateTime = new Date(endDate)
    const daysDiff = Math.ceil((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 3600 * 24))
    const averageCaloriesPerDay = daysDiff > 0 ? totalCalories / daysDiff : 0

    // 餐別分佈
    const mealTypeDistribution: Record<string, number> = {}
    entries?.forEach(entry => {
      if (entry.meal_type) {
        mealTypeDistribution[entry.meal_type] = (mealTypeDistribution[entry.meal_type] || 0) + 1
      }
    })

    // 最常食用的食物
    const foodFrequency: Record<string, number> = {}
    entries?.forEach(entry => {
      foodFrequency[entry.food_name] = (foodFrequency[entry.food_name] || 0) + 1
    })

    const topFoods = Object.entries(foodFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([food_name, frequency]) => ({ food_name, frequency }))

    return {
      totalEntries,
      totalCalories,
      averageCaloriesPerDay,
      mealTypeDistribution,
      topFoods
    }
  }

  // 搜尋食物記錄
  async searchFoodEntries(
    userId: string,
    query: string,
    options?: {
      limit?: number
      startDate?: string
      endDate?: string
    }
  ): Promise<FoodEntry[]> {
    let supabaseQuery = supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .ilike('food_name', `%${query}%`)
      .order('consumed_at', { ascending: false })

    if (options?.startDate) {
      supabaseQuery = supabaseQuery.gte('consumed_at', options.startDate)
    }

    if (options?.endDate) {
      supabaseQuery = supabaseQuery.lte('consumed_at', options.endDate)
    }

    if (options?.limit) {
      supabaseQuery = supabaseQuery.limit(options.limit)
    }

    const { data, error } = await supabaseQuery

    if (error) {
      console.error('Search food entries error:', error)
      throw error
    }

    return data || []
  }

  // 獲取食物記錄與症狀的關聯分析
  async getFoodSymptomCorrelation(
    userId: string,
    foodName: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    const { data, error } = await supabase
      .from('food_entries')
      .select('symptoms_before, symptoms_after, medical_score, consumed_at')
      .eq('user_id', userId)
      .ilike('food_name', `%${foodName}%`)
      .gte('consumed_at', startDate)
      .lte('consumed_at', endDate)

    if (error) {
      console.error('Get food symptom correlation error:', error)
      throw error
    }

    return data || []
  }

  // 批量建立食物記錄
  async bulkCreateFoodEntries(entries: FoodEntryInsert[]): Promise<FoodEntry[]> {
    const { data, error } = await supabase
      .from('food_entries')
      .insert(entries)
      .select()

    if (error) {
      console.error('Bulk create food entries error:', error)
      throw error
    }

    return data || []
  }
}

export const foodEntriesService = new SupabaseFoodEntriesService()