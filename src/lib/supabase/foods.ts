// Supabase 食物資料庫服務
import { supabase } from './client'
import type { Food, FoodInsert, FoodUpdate } from '@/types/supabase'

export class SupabaseFoodsService {

  // 獲取所有已驗證的食物
  async getApprovedFoods(): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('verification_status', 'admin_approved')
      .order('name')

    if (error) {
      console.error('Get approved foods error:', error)
      throw error
    }

    return data || []
  }

  // 搜尋已驗證的食物
  async searchApprovedFoods(searchTerm: string): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('verification_status', 'admin_approved')
      .ilike('name', `%${searchTerm}%`)
      .order('name')
      .limit(20)

    if (error) {
      console.error('Search approved foods error:', error)
      throw error
    }

    return data || []
  }

  // 依分類獲取食物
  async getFoodsByCategory(category: string): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('category', category)
      .eq('verification_status', 'admin_approved')
      .order('name')

    if (error) {
      console.error('Get foods by category error:', error)
      throw error
    }

    return data || []
  }

  // 搜尋食物
  async searchFoods(query: string, options?: {
    category?: string
    includeCustom?: boolean
    includeUnverified?: boolean
    limit?: number
  }): Promise<Food[]> {
    let supabaseQuery = supabase
      .from('diet_daily_foods')
      .select('*')

    // 搜尋條件
    if (query) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%, name_en.ilike.%${query}%, brand.ilike.%${query}%`)
    }

    // 分類過濾
    if (options?.category) {
      supabaseQuery = supabaseQuery.eq('category', options.category)
    }

    // 驗證狀態過濾
    if (!options?.includeUnverified) {
      supabaseQuery = supabaseQuery.eq('verification_status', 'admin_approved')
    }

    // 是否包含自訂食物
    if (!options?.includeCustom) {
      supabaseQuery = supabaseQuery.eq('is_custom', false)
    }

    const { data, error } = await supabaseQuery
      .order('name')
      .limit(options?.limit || 50)

    if (error) {
      console.error('Search foods error:', error)
      throw error
    }

    return data || []
  }

  // 根據 ID 獲取食物
  async getFoodById(id: string): Promise<Food | null> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Get food by ID error:', error)
      return null
    }

    return data
  }

  // 建立自訂食物
  async createCustomFood(foodData: FoodInsert): Promise<Food | null> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .insert({
        ...foodData,
        is_custom: true,
        verification_status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Create custom food error:', error)
      throw error
    }

    return data
  }

  // 建立食物 (通用方法)
  async createFood(foodData: FoodInsert): Promise<Food | null> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .insert(foodData)
      .select()
      .single()

    if (error) {
      console.error('Create food error:', error)
      throw error
    }

    return data
  }

  // 更新食物資料
  async updateFood(id: string, updates: FoodUpdate): Promise<Food | null> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update food error:', error)
      throw error
    }

    return data
  }

  // 獲取待驗證的食物 (僅管理員)
  async getPendingFoods(): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get pending foods error:', error)
      throw error
    }

    return data || []
  }

  // 驗證食物 (僅管理員)
  async verifyFood(
    id: string,
    status: 'approved' | 'rejected',
    verifiedBy: string,
    notes?: string
  ): Promise<Food | null> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .update({
        verification_status: status,
        verified_by: verifiedBy,
        verification_notes: notes,
        verified_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Verify food error:', error)
      throw error
    }

    return data
  }

  // 獲取食物分類
  async getFoodCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('category')
      .eq('verification_status', 'admin_approved')

    if (error) {
      console.error('Get food categories error:', error)
      return []
    }

    // 去重並排序
    const categories = [...new Set(data.map(item => item.category))]
    return categories.sort()
  }

  // 獲取用戶的自訂食物
  async getUserCustomFoods(userId: string): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('created_by', userId)
      .eq('is_custom', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get user custom foods error:', error)
      throw error
    }

    return data || []
  }

  // 刪除自訂食物
  async deleteCustomFood(id: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('diet_daily_foods')
      .delete()
      .eq('id', id)
      .eq('created_by', userId)
      .eq('is_custom', true)

    if (error) {
      console.error('Delete custom food error:', error)
      throw error
    }

    return true
  }

  // 刪除食物 (管理員權限，可刪除任何食物)
  async deleteFood(id: string, adminId: string): Promise<boolean> {
    const { error } = await supabase
      .from('diet_daily_foods')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete food error:', error)
      throw error
    }

    console.log(`Admin ${adminId} deleted food ${id}`)
    return true
  }

  // 軟刪除食物 (標記為已拒絕而不是物理刪除)
  async softDeleteFood(id: string, adminId: string, reason?: string): Promise<Food | null> {
    return this.updateFood(id, {
      verification_status: 'rejected',
      verification_notes: reason || '管理員刪除',
      verified_by: adminId,
      verified_at: new Date().toISOString()
    })
  }

  // 獲取食物統計資料
  async getFoodsStats() {
    const [
      { count: totalCount },
      { count: approvedCount },
      { count: pendingCount },
      { count: rejectedCount },
      { count: customCount },
      { count: taiwanCount }
    ] = await Promise.all([
      supabase.from('diet_daily_foods').select('*', { count: 'exact', head: true }),
      supabase.from('diet_daily_foods').select('*', { count: 'exact', head: true }).eq('verification_status', 'admin_approved'),
      supabase.from('diet_daily_foods').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabase.from('diet_daily_foods').select('*', { count: 'exact', head: true }).eq('verification_status', 'rejected'),
      supabase.from('diet_daily_foods').select('*', { count: 'exact', head: true }).eq('is_custom', true),
      supabase.from('diet_daily_foods').select('*', { count: 'exact', head: true }).eq('taiwan_origin', true)
    ])

    return {
      total: totalCount || 0,
      approved: approvedCount || 0,
      pending: pendingCount || 0,
      rejected: rejectedCount || 0,
      custom: customCount || 0,
      taiwan: taiwanCount || 0
    }
  }

  // 獲取所有食物 (管理員專用，包含所有狀態)
  async getAllFoods(): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get all foods error:', error)
      throw error
    }

    return data || []
  }

  // 分頁獲取食物
  async getFoodsPaginated(page: number = 1, limit: number = 50, filters?: {
    category?: string
    verification_status?: string
    search?: string
    taiwan_origin?: boolean
    is_custom?: boolean
  }): Promise<{ data: Food[], total: number, hasMore: boolean }> {
    let query = supabase
      .from('diet_daily_foods')
      .select('*', { count: 'exact' })

    // 應用篩選
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }
    if (filters?.verification_status) {
      query = query.eq('verification_status', filters.verification_status)
    }
    if (filters?.taiwan_origin !== undefined) {
      query = query.eq('taiwan_origin', filters.taiwan_origin)
    }
    if (filters?.is_custom !== undefined) {
      query = query.eq('is_custom', filters.is_custom)
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`)
    }

    // 分頁
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get foods paginated error:', error)
      throw error
    }

    const total = count || 0
    const hasMore = total > page * limit

    return {
      data: data || [],
      total,
      hasMore
    }
  }

  // 批量驗證食物
  async bulkVerifyFoods(
    foodIds: string[],
    status: 'approved' | 'rejected',
    verifiedBy: string,
    notes?: string
  ): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .update({
        verification_status: status,
        verified_by: verifiedBy,
        verification_notes: notes,
        verified_at: new Date().toISOString()
      })
      .in('id', foodIds)
      .select()

    if (error) {
      console.error('Bulk verify foods error:', error)
      throw error
    }

    return data || []
  }

  // 檢查食物名稱是否重複
  async checkFoodNameExists(name: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('diet_daily_foods')
      .select('id')
      .eq('name', name)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('Check food name exists error:', error)
      return false
    }

    return !!data
  }

  // 獲取熱門食物 (基於使用頻率或評分)
  async getPopularFoods(limit: number = 20): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('verification_status', 'admin_approved')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Get popular foods error:', error)
      throw error
    }

    return data || []
  }

  // 批量建立食物
  async bulkCreateFoods(foods: FoodInsert[]): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .insert(foods)
      .select()

    if (error) {
      console.error('Bulk create foods error:', error)
      throw error
    }

    return data || []
  }

  // 批量更新食物驗證狀態
  async bulkUpdateVerificationStatus(
    foodIds: string[],
    status: 'approved' | 'rejected' | 'pending',
    verifiedBy: string,
    notes?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('diet_daily_foods')
      .update({
        verification_status: status,
        verified_by: verifiedBy,
        verification_notes: notes,
        verified_at: new Date().toISOString()
      })
      .in('id', foodIds)

    if (error) {
      console.error('Bulk update verification status error:', error)
      throw error
    }

    return true
  }

  // 同步食物資料 - 從本地資料庫或API獲取並更新
  async syncFoodsFromSource(sourceData: FoodInsert[]): Promise<{
    created: number,
    updated: number,
    errors: any[]
  }> {
    let created = 0
    let updated = 0
    const errors: any[] = []

    for (const foodData of sourceData) {
      try {
        // 檢查食物是否已存在 (by name and brand)
        const existing = await this.findExistingFood(foodData.name, foodData.brand || undefined)

        if (existing) {
          // 更新現有食物
          await this.updateFood(existing.id, foodData)
          updated++
        } else {
          // 建立新食物
          await this.createFood(foodData)
          created++
        }
      } catch (error) {
        errors.push({ food: foodData.name, error })
      }
    }

    return { created, updated, errors }
  }

  // 更新食物評分和備註
  async updateFoodScores(
    foodId: string,
    scores: any, // condition_scores object
    notes: string,
    updatedBy: string
  ): Promise<Food | null> {
    try {
      const { data, error } = await supabase
        .from('diet_daily_foods')
        .update({
          condition_scores: scores,
          verification_notes: notes,
          verified_by: updatedBy,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', foodId)
        .select()

      if (error) {
        console.error('Update food scores error:', error)
        throw error
      }

      // 檢查是否有更新結果
      if (!data || data.length === 0) {
        console.warn('No data returned from update, fetching food separately')

        // 如果 update 沒有返回數據，單獨查詢
        const { data: foodData, error: fetchError } = await supabase
          .from('diet_daily_foods')
          .select('*')
          .eq('id', foodId)
          .single()

        if (fetchError) {
          throw fetchError
        }

        return foodData
      }

      return data[0]
    } catch (error) {
      console.error('Update food scores error:', error)
      throw error
    }
  }

  // 批量更新食物評分
  async bulkUpdateFoodScores(
    updates: Array<{
      foodId: string
      scores: any
      notes: string
    }>,
    updatedBy: string
  ): Promise<Food[]> {
    const updatedFoods: Food[] = []

    for (const update of updates) {
      try {
        const result = await this.updateFoodScores(
          update.foodId,
          update.scores,
          update.notes,
          updatedBy
        )
        if (result) {
          updatedFoods.push(result)
        }
      } catch (error) {
        console.error(`Failed to update scores for food ${update.foodId}:`, error)
      }
    }

    return updatedFoods
  }

  // 獲取需要評分的食物（無評分或評分不完整）
  async getFoodsNeedingScores(): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('verification_status', 'admin_approved')
      .or('condition_scores.is.null,condition_scores.eq.{}')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get foods needing scores error:', error)
      throw error
    }

    return data || []
  }

  // 獲取評分統計
  async getScoreStatistics(): Promise<{
    totalFoods: number
    scoredFoods: number
    averageScores: any
    scoreDistribution: any
  }> {
    const { data: allFoods, error } = await supabase
      .from('diet_daily_foods')
      .select('condition_scores')
      .eq('verification_status', 'admin_approved')

    if (error) {
      console.error('Get score statistics error:', error)
      throw error
    }

    const totalFoods = allFoods?.length || 0
    const scoredFoods = allFoods?.filter(food =>
      food.condition_scores &&
      Object.keys(food.condition_scores).length > 0
    ).length || 0

    // 計算平均評分和分佈
    const scoreData = allFoods?.filter(food => food.condition_scores) || []
    const conditions = ['ibd', 'ibs', 'allergies', 'cancer_chemo']
    const averageScores: any = {}
    const scoreDistribution: any = {}

    conditions.forEach(condition => {
      const conditionScores = scoreData
        .map(food => food.condition_scores?.[condition]?.general_safety)
        .filter(score => typeof score === 'number')

      if (conditionScores.length > 0) {
        averageScores[condition] = conditionScores.reduce((a, b) => a + b, 0) / conditionScores.length

        scoreDistribution[condition] = [0, 1, 2, 3, 4, 5].map(score => ({
          score,
          count: conditionScores.filter(s => s === score).length
        }))
      }
    })

    return {
      totalFoods,
      scoredFoods,
      averageScores,
      scoreDistribution
    }
  }

  // 尋找現有食物 (避免重複)
  private async findExistingFood(name: string, brand?: string): Promise<Food | null> {
    let query = supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('name', name)

    if (brand) {
      query = query.eq('brand', brand)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('Find existing food error:', error)
      return null
    }

    return data
  }
}

export const foodsService = new SupabaseFoodsService()