// 統一食物記錄服務 - 離線優先，自動同步
import { localStorageService, type LocalFoodEntry } from './local-storage'
import { foodEntriesService } from './supabase/food-entries'
import type { FoodEntry, FoodEntryInsert } from '@/types/supabase'

export interface UnifiedFoodEntry extends LocalFoodEntry {
  // 合併本地和遠程記錄的統一介面
}

export class UnifiedFoodEntriesService {
  private syncInProgress = false

  // 新增食物記錄 - 離線優先
  async addFoodEntry(entryData: FoodEntryInsert): Promise<UnifiedFoodEntry> {
    // 1. 先保存到本地
    const localEntry = localStorageService.addLocalEntry(entryData)

    // 2. 嘗試同步到 Supabase (不阻塞)
    this.syncToSupabase(localEntry.id).catch(error => {
      console.warn('Background sync failed:', error)
    })

    return localEntry
  }

  // 獲取今日記錄 - 混合本地和遠程
  async getTodayEntries(userId?: string): Promise<UnifiedFoodEntry[]> {
    // 1. 獲取本地記錄
    const localEntries = localStorageService.getTodayEntries()

    // 2. 如果有網路和用戶認證，嘗試獲取遠程記錄
    let remoteEntries: FoodEntry[] = []
    if (userId && navigator.onLine) {
      try {
        const today = new Date().toISOString().split('T')[0]!
        remoteEntries = await foodEntriesService.getUserFoodEntriesByDate(userId, today)
      } catch (error) {
        console.warn('Failed to fetch remote entries:', error)
      }
    }

    // 3. 合併並去重
    return this.mergeEntries(localEntries, remoteEntries)
  }

  // 獲取指定日期的記錄
  async getEntriesByDate(date: string, userId?: string): Promise<UnifiedFoodEntry[]> {
    const localEntries = localStorageService.getEntriesByDate(date)

    let remoteEntries: FoodEntry[] = []
    if (userId && navigator.onLine) {
      try {
        remoteEntries = await foodEntriesService.getUserFoodEntriesByDate(userId, date)
      } catch (error) {
        console.warn('Failed to fetch remote entries:', error)
      }
    }

    return this.mergeEntries(localEntries, remoteEntries)
  }

  // 刪除記錄
  async deleteEntry(entryId: string, userId?: string): Promise<boolean> {
    // 1. 從本地刪除
    const localDeleted = localStorageService.deleteLocalEntry(entryId)

    // 2. 如果是同步過的記錄，也要從遠程刪除
    if (userId && navigator.onLine && !entryId.startsWith('local_')) {
      try {
        await foodEntriesService.deleteFoodEntry(entryId)
      } catch (error) {
        console.warn('Failed to delete remote entry:', error)
      }
    }

    return localDeleted
  }

  // 同步單個記錄到 Supabase
  private async syncToSupabase(localId: string): Promise<boolean> {
    const entries = localStorageService.getLocalEntries()
    const entry = entries.find(e => e.id === localId)

    if (!entry || entry.synced) return true

    try {
      // 如果沒有 user_id，暫時跳過同步
      if (!entry.user_id) {
        console.warn('Cannot sync entry without user_id:', localId)
        return false
      }

      // 檢查網路連線
      if (!navigator.onLine) {
        console.warn('Offline, skipping sync for:', localId)
        return false
      }

      // 創建遠程記錄
      const remoteEntry = await foodEntriesService.createFoodEntry({
        user_id: entry.user_id,
        food_id: entry.food_id,
        food_name: entry.food_name,
        amount: entry.amount,
        unit: entry.unit,
        meal_type: entry.meal_type,
        consumed_at: entry.consumed_at,
        notes: entry.notes,
        calories: entry.calories,
        medical_score: entry.medical_score,
        sync_status: 'synced'
      })

      if (remoteEntry) {
        // 標記為已同步，並更新為遠程 ID
        localStorageService.markAsSynced(localId, remoteEntry.id)
        console.log('✅ Successfully synced entry:', localId, '→', remoteEntry.id)
        return true
      }

      return false
    } catch (error: any) {
      console.error('❌ Sync failed for entry:', localId, error)

      // 根據錯誤類型決定是否重試
      const isRetryableError = error?.code !== 'PGRST116' && // 權限錯誤不重試
                              error?.status !== 401 && // 認證錯誤不重試
                              error?.status !== 403    // 禁止錯誤不重試

      if (isRetryableError) {
        localStorageService.incrementSyncAttempt(localId)
      } else {
        console.error('Non-retryable error, marking as failed:', error)
      }

      return false
    }
  }

  // 批量同步所有未同步的記錄
  async syncAllEntries(userId: string): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress) {
      console.log('Sync already in progress')
      return { success: 0, failed: 0 }
    }

    this.syncInProgress = true
    let success = 0
    let failed = 0

    try {
      const unsyncedEntries = localStorageService.getUnsyncedEntries()
      console.log(`Starting sync of ${unsyncedEntries.length} entries`)

      for (const entry of unsyncedEntries) {
        // 如果記錄沒有 user_id，添加當前用戶 ID
        if (!entry.user_id) {
          localStorageService.updateLocalEntry(entry.id, { user_id: userId })
        }

        if (localStorageService.shouldRetrySync(entry)) {
          const syncResult = await this.syncToSupabase(entry.id)
          if (syncResult) {
            success++
          } else {
            failed++
          }

          // 避免過快的請求
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      console.log(`Sync completed: ${success} success, ${failed} failed`)
      return { success, failed }
    } finally {
      this.syncInProgress = false
    }
  }

  // 合併本地和遠程記錄
  private mergeEntries(localEntries: LocalFoodEntry[], remoteEntries: FoodEntry[]): UnifiedFoodEntry[] {
    const merged: UnifiedFoodEntry[] = [...localEntries]

    // 添加不在本地的遠程記錄
    for (const remoteEntry of remoteEntries) {
      const existsInLocal = localEntries.some(local => {
        // 首先檢查 ID 匹配
        if (local.id === remoteEntry.id) return true

        // 檢查是否為同一個已同步的記錄
        if (local.synced && local.id === remoteEntry.id) return true

        // 檢查是否為實質上相同的記錄（模糊匹配）
        const timeMatch = Math.abs(
          new Date(local.consumed_at).getTime() - new Date(remoteEntry.consumed_at).getTime()
        ) < 60000 // 1分鐘內

        return timeMatch &&
               local.food_name === remoteEntry.food_name &&
               Math.abs((local.amount || 0) - remoteEntry.amount) < 0.01
      })

      if (!existsInLocal) {
        merged.push({
          ...remoteEntry,
          synced: true,
          sync_attempts: 0,
          created_at: remoteEntry.created_at
        })
      }
    }

    // 按時間排序
    return merged.sort((a, b) =>
      new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
    )
  }

  // 獲取同步狀態
  getSyncStatus() {
    const stats = localStorageService.getStats()
    return {
      ...stats,
      syncInProgress: this.syncInProgress,
      isOnline: navigator.onLine
    }
  }

  // 強制同步
  async forceSyncAll(userId: string): Promise<{ success: number; failed: number }> {
    this.syncInProgress = false // 重置狀態
    return this.syncAllEntries(userId)
  }

  // 清理失敗的同步記錄
  cleanupFailedSyncs(): number {
    return localStorageService.cleanupFailedEntries()
  }

  // 設置用戶 ID 到所有未同步的記錄
  async setUserIdForUnsyncedEntries(userId: string): Promise<void> {
    const unsyncedEntries = localStorageService.getUnsyncedEntries()
    for (const entry of unsyncedEntries) {
      if (!entry.user_id) {
        localStorageService.updateLocalEntry(entry.id, { user_id: userId })
      }
    }
  }

  // 導出本地記錄
  exportLocalEntries(): string {
    return localStorageService.exportEntries()
  }

  // 導入本地記錄
  importLocalEntries(jsonData: string): boolean {
    return localStorageService.importEntries(jsonData)
  }
}

export const unifiedFoodEntriesService = new UnifiedFoodEntriesService()