// 本地存儲服務 - 離線優先的食物記錄管理
import type { FoodEntry, FoodEntryInsert } from '@/types/supabase'

export interface LocalFoodEntry extends Omit<FoodEntryInsert, 'user_id'> {
  id: string
  user_id?: string
  created_at: string
  updated_at?: string
  synced: boolean
  sync_attempts: number
  last_sync_attempt?: string
  // 自訂食物相關欄位
  is_custom_food?: boolean
  custom_food_source?: string
  food_category?: string
}

export class LocalStorageService {
  private storageKey = 'diet-daily-food-entries'
  private maxSyncAttempts = 3

  // 獲取所有本地記錄
  getLocalEntries(): LocalFoodEntry[] {
    try {
      const stored = localStorage.getItem(this.storageKey)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to get local entries:', error)
      return []
    }
  }

  // 保存本地記錄
  private saveLocalEntries(entries: LocalFoodEntry[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(entries))
    } catch (error) {
      console.error('Failed to save local entries:', error)
    }
  }

  // 新增本地記錄（支持自訂食物）
  addLocalEntry(entryData: FoodEntryInsert): LocalFoodEntry {
    const newEntry: LocalFoodEntry = {
      ...entryData,
      id: this.generateLocalId(),
      created_at: new Date().toISOString(),
      synced: false,
      sync_attempts: 0,
      // 保留自訂食物資訊
      is_custom_food: (entryData as any).is_custom_food || false,
      custom_food_source: (entryData as any).custom_food_source || null,
      food_category: (entryData as any).food_category || null
    }

    const entries = this.getLocalEntries()
    entries.unshift(newEntry) // 新記錄在前面
    this.saveLocalEntries(entries)

    return newEntry
  }

  // 更新本地記錄
  updateLocalEntry(id: string, updates: Partial<LocalFoodEntry>): LocalFoodEntry | null {
    const entries = this.getLocalEntries()
    const index = entries.findIndex(entry => entry.id === id)

    if (index === -1) return null

    entries[index] = {
      ...entries[index],
      ...updates,
      updated_at: new Date().toISOString()
    }

    this.saveLocalEntries(entries)
    return entries[index]
  }

  // 刪除本地記錄
  deleteLocalEntry(id: string): boolean {
    const entries = this.getLocalEntries()
    const filteredEntries = entries.filter(entry => entry.id !== id)

    if (filteredEntries.length === entries.length) return false

    this.saveLocalEntries(filteredEntries)
    return true
  }

  // 獲取今日記錄
  getTodayEntries(): LocalFoodEntry[] {
    const entries = this.getLocalEntries()
    const today = new Date().toISOString().split('T')[0]

    return entries.filter(entry => {
      const entryDate = entry.consumed_at.split('T')[0]
      return entryDate === today
    })
  }

  // 獲取指定日期的記錄
  getEntriesByDate(date: string): LocalFoodEntry[] {
    const entries = this.getLocalEntries()
    return entries.filter(entry => {
      const entryDate = entry.consumed_at.split('T')[0]
      return entryDate === date
    })
  }

  // 獲取未同步的記錄
  getUnsyncedEntries(): LocalFoodEntry[] {
    return this.getLocalEntries().filter(entry => !entry.synced)
  }

  // 標記記錄為已同步
  markAsSynced(localId: string, supabaseId?: string): void {
    this.updateLocalEntry(localId, {
      synced: true,
      ...(supabaseId && { id: supabaseId })
    })
  }

  // 增加同步嘗試計數
  incrementSyncAttempt(localId: string): void {
    const entry = this.getLocalEntries().find(e => e.id === localId)
    if (entry) {
      this.updateLocalEntry(localId, {
        sync_attempts: entry.sync_attempts + 1,
        last_sync_attempt: new Date().toISOString()
      })
    }
  }

  // 檢查是否應該重試同步
  shouldRetrySync(entry: LocalFoodEntry): boolean {
    if (entry.synced) return false
    if (entry.sync_attempts >= this.maxSyncAttempts) return false

    // 如果從未嘗試過，或者距離上次嘗試超過 1 分鐘，就可以重試
    if (!entry.last_sync_attempt) return true

    const lastAttempt = new Date(entry.last_sync_attempt)
    const now = new Date()
    const timeDiff = now.getTime() - lastAttempt.getTime()
    const oneMinute = 60 * 1000

    return timeDiff > oneMinute
  }

  // 獲取統計資料
  getStats() {
    const entries = this.getLocalEntries()
    const unsyncedCount = entries.filter(e => !e.synced).length
    const failedSyncCount = entries.filter(e =>
      e.sync_attempts >= this.maxSyncAttempts && !e.synced
    ).length

    return {
      totalEntries: entries.length,
      unsyncedEntries: unsyncedCount,
      failedSyncEntries: failedSyncCount,
      syncedEntries: entries.length - unsyncedCount
    }
  }

  // 清理失敗的同步記錄
  cleanupFailedEntries(): number {
    const entries = this.getLocalEntries()
    const validEntries = entries.filter(entry =>
      entry.synced || entry.sync_attempts < this.maxSyncAttempts
    )

    const removedCount = entries.length - validEntries.length
    if (removedCount > 0) {
      this.saveLocalEntries(validEntries)
    }

    return removedCount
  }

  // 生成本地 ID
  private generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 清空所有本地記錄
  clearAll(): void {
    localStorage.removeItem(this.storageKey)
  }

  // 導出所有記錄（用於備份）
  exportEntries(): string {
    return JSON.stringify(this.getLocalEntries(), null, 2)
  }

  // 導入記錄（用於恢復備份）
  importEntries(jsonData: string): boolean {
    try {
      const entries = JSON.parse(jsonData)
      if (Array.isArray(entries)) {
        this.saveLocalEntries(entries)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to import entries:', error)
      return false
    }
  }
}

export const localStorageService = new LocalStorageService()