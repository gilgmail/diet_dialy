// 增強版食物記錄服務 - 支持表不存在時的優雅處理
import { supabase } from './client'
import type { FoodEntry, FoodEntryInsert, FoodEntryUpdate } from '@/types/supabase'

export class EnhancedFoodEntriesService {
  private tableExists: boolean | null = null

  // 檢查表是否存在
  private async checkTableExists(): Promise<boolean> {
    if (this.tableExists !== null) return this.tableExists

    try {
      const { data, error } = await supabase
        .from('food_entries')
        .select('id')
        .limit(1)

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.warn('⚠️ food_entries 表不存在，需要創建')
          this.tableExists = false
          return false
        }
        throw error
      }

      this.tableExists = true
      return true
    } catch (err: any) {
      console.error('檢查表存在性失敗:', err.message)
      this.tableExists = false
      return false
    }
  }

  // 優雅降級處理：當表不存在時返回空結果而不是拋出錯誤
  private async safeExecute<T>(operation: () => Promise<T>, fallbackValue: T): Promise<T> {
    try {
      const tableExists = await this.checkTableExists()
      if (!tableExists) {
        console.warn('🔄 food_entries 表不存在，返回降級結果')
        return fallbackValue
      }
      return await operation()
    } catch (error: any) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.warn('🔄 表不存在，返回降級結果:', error.message)
        this.tableExists = false
        return fallbackValue
      }
      throw error
    }
  }

  // 建立食物記錄
  async createFoodEntry(entryData: FoodEntryInsert): Promise<FoodEntry | null> {
    return this.safeExecute(async () => {
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
    }, null)
  }

  // 批量建立食物記錄
  async bulkCreateFoodEntries(entries: FoodEntryInsert[]): Promise<FoodEntry[]> {
    return this.safeExecute(async () => {
      const { data, error } = await supabase
        .from('food_entries')
        .insert(entries)
        .select()

      if (error) {
        console.error('Bulk create food entries error:', error)
        throw error
      }

      return data || []
    }, [])
  }

  // 更新食物記錄
  async updateFoodEntry(id: string, updates: FoodEntryUpdate): Promise<FoodEntry | null> {
    return this.safeExecute(async () => {
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
    }, null)
  }

  // 刪除食物記錄
  async deleteFoodEntry(id: string): Promise<boolean> {
    return this.safeExecute(async () => {
      const { error } = await supabase
        .from('food_entries')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Delete food entry error:', error)
        throw error
      }

      return true
    }, false)
  }

  // 獲取用戶特定日期的食物記錄
  async getUserFoodEntriesByDate(userId: string, date: string): Promise<FoodEntry[]> {
    return this.safeExecute(async () => {
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
    }, [])
  }

  // 獲取用戶的所有食物記錄
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
    return this.safeExecute(async () => {
      let query = supabase
        .from('food_entries')
        .select('*')
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
    }, [])
  }

  // 獲取系統狀態和診斷信息
  async getSystemStatus(): Promise<{
    tableExists: boolean
    canConnect: boolean
    sampleData: any[]
    error?: string
  }> {
    try {
      const tableExists = await this.checkTableExists()

      if (!tableExists) {
        return {
          tableExists: false,
          canConnect: true,
          sampleData: [],
          error: 'food_entries 表不存在，需要執行建表 SQL'
        }
      }

      // 嘗試獲取少量示例數據
      const { data, error } = await supabase
        .from('food_entries')
        .select('id, user_id, food_name, consumed_at')
        .limit(3)

      return {
        tableExists: true,
        canConnect: true,
        sampleData: data || [],
        error: error?.message
      }
    } catch (err: any) {
      return {
        tableExists: false,
        canConnect: false,
        sampleData: [],
        error: err.message
      }
    }
  }

  // 重置表存在性檢查緩存
  resetTableCache(): void {
    this.tableExists = null
  }

  // 獲取表創建指南
  getTableCreationGuide(): {
    sqlFile: string
    consoleUrl: string
    instructions: string[]
  } {
    return {
      sqlFile: 'sql-scripts/create_food_entries_table.sql',
      consoleUrl: 'https://supabase.com/dashboard/project/lbjeyvvierxcnrytuvto/sql',
      instructions: [
        '1. 前往 Supabase 控制台 SQL 編輯器',
        '2. 複製 sql-scripts/create_food_entries_table.sql 的內容',
        '3. 在 SQL 編輯器中執行該腳本',
        '4. 確認表創建成功後，重新測試同步功能'
      ]
    }
  }

  // 測試表創建後的基本功能
  async testBasicFunctionality(userId: string): Promise<{
    success: boolean
    operations: string[]
    errors: string[]
  }> {
    const operations: string[] = []
    const errors: string[] = []

    try {
      // 測試創建
      operations.push('測試創建記錄...')
      const testEntry = await this.createFoodEntry({
        user_id: userId,
        food_name: '測試食物',
        amount: 100,
        unit: 'g',
        consumed_at: new Date().toISOString(),
        meal_type: 'snack',
        notes: '自動化測試記錄',
        sync_status: 'synced'
      })

      if (testEntry) {
        operations.push('✅ 創建記錄成功')

        // 測試查詢
        operations.push('測試查詢記錄...')
        const today = new Date().toISOString().split('T')[0]
        const entries = await this.getUserFoodEntriesByDate(userId, today!)
        operations.push(`✅ 查詢成功，找到 ${entries.length} 條記錄`)

        // 測試刪除
        operations.push('測試刪除記錄...')
        const deleted = await this.deleteFoodEntry(testEntry.id)
        if (deleted) {
          operations.push('✅ 刪除記錄成功')
        }
      }

      return { success: true, operations, errors }
    } catch (err: any) {
      errors.push(`❌ 測試失敗: ${err.message}`)
      return { success: false, operations, errors }
    }
  }
}

export const enhancedFoodEntriesService = new EnhancedFoodEntriesService()