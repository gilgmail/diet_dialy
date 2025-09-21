// Supabase 食物資料庫服務
import { supabase } from './client'
import type { Food, FoodInsert, FoodUpdate } from '@/types/supabase'

export class SupabaseFoodsService {

  // 獲取所有已驗證的食物
  async getApprovedFoods(): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('verification_status', 'approved')
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
      .eq('verification_status', 'approved')
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
      .eq('verification_status', 'approved')
      .order('name')

    if (error) {
      console.error('Get foods by category error:', error)
      throw error
    }

    return data || []
  }

  // 搜尋食物
  async searchFoods(query: string): Promise<Food[]> {
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .or(`name.ilike.%${query}%, name_en.ilike.%${query}%, brand.ilike.%${query}%`)
      .eq('verification_status', 'approved')
      .order('name')
      .limit(50)

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
      .eq('verification_status', 'approved')

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

  // 獲取食物統計資料
  async getFoodsStats() {
    const { data: totalCount } = await supabase
      .from('diet_daily_foods')
      .select('id', { count: 'exact' })
      .eq('verification_status', 'approved')

    const { data: pendingCount } = await supabase
      .from('diet_daily_foods')
      .select('id', { count: 'exact' })
      .eq('verification_status', 'pending')

    const { data: customCount } = await supabase
      .from('diet_daily_foods')
      .select('id', { count: 'exact' })
      .eq('is_custom', true)

    return {
      total: totalCount?.length || 0,
      pending: pendingCount?.length || 0,
      custom: customCount?.length || 0
    }
  }
}

export const foodsService = new SupabaseFoodsService()