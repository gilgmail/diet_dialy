// 統一食物記錄服務 - 離線優先，自動同步
import { localStorageService, type LocalFoodEntry } from './local-storage'
import { enhancedFoodEntriesService } from './supabase/enhanced-food-entries'
import type { FoodEntry, FoodEntryInsert } from '@/types/supabase'

export interface UnifiedFoodEntry extends LocalFoodEntry {
  // 合併本地和遠程記錄的統一介面
}

export class UnifiedFoodEntriesService {
  private syncInProgress = false

  // 新增食物記錄 - 離線優先（支持自訂食物）
  async addFoodEntry(entryData: FoodEntryInsert): Promise<UnifiedFoodEntry> {
    // 檢查並標記自訂食物
    const enhancedEntryData = await this.enhanceWithCustomFoodInfo(entryData)

    // 1. 先保存到本地
    const localEntry = localStorageService.addLocalEntry(enhancedEntryData)

    // 2. 嘗試同步到 Supabase (不阻塞)
    this.syncToSupabase(localEntry.id).catch(error => {
      console.warn('Background sync failed:', error)
    })

    return localEntry
  }

  // 增強食物記錄資訊，添加自訂食物相關資料
  private async enhanceWithCustomFoodInfo(entryData: FoodEntryInsert): Promise<FoodEntryInsert> {
    try {
      // 如果 food_id 以 custom_ 開頭，或者明確標記為自訂食物
      const isCustomFood = entryData.food_id?.startsWith('custom_') ||
                          entryData.food_id?.startsWith('local_') ||
                          (entryData as any).is_custom_food

      if (isCustomFood) {
        return {
          ...entryData,
          is_custom_food: true,
          custom_food_source: 'user_created',
          food_category: entryData.food_category || '自訂食物'
        }
      }

      return entryData
    } catch (error) {
      console.warn('Failed to enhance custom food info:', error)
      return entryData
    }
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
        remoteEntries = await enhancedFoodEntriesService.getUserFoodEntriesByDate(userId, today)
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
        remoteEntries = await enhancedFoodEntriesService.getUserFoodEntriesByDate(userId, date)
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
        await enhancedFoodEntriesService.deleteFoodEntry(entryId)
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

      // 創建遠程記錄（包含自訂食物資訊）
      const remoteEntry = await enhancedFoodEntriesService.createFoodEntry({
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
        // 添加自訂食物標記
        is_custom_food: entry.is_custom_food || false,
        custom_food_source: entry.custom_food_source || null,
        food_category: entry.food_category || null,
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

  // 合併本地和遠程記錄（改善重複檢查和顯示逻輯）
  private mergeEntries(localEntries: LocalFoodEntry[], remoteEntries: FoodEntry[]): UnifiedFoodEntry[] {
    console.log(`Merging entries: ${localEntries.length} local + ${remoteEntries.length} remote`)

    // 先以遠程記錄為主，確保 Supabase 上的記錄優先顯示
    const merged: UnifiedFoodEntry[] = []

    // 1. 添加所有遠程記錄（已同步的權威記錄）
    for (const remoteEntry of remoteEntries) {
      merged.push({
        ...remoteEntry,
        synced: true,
        sync_attempts: 0,
        is_custom_food: remoteEntry.is_custom_food || false,
        custom_food_source: remoteEntry.custom_food_source || undefined,
        created_at: remoteEntry.created_at || remoteEntry.consumed_at
      })
    }

    // 2. 添加本地記錄（只添加還沒有在遠程的）
    for (const localEntry of localEntries) {
      const existsInRemote = remoteEntries.some(remote => {
        // 直接 ID 匹配（已同步的記錄）
        if (localEntry.id === remote.id) return true

        // 模糊匹配（相似的記錄）
        const timeMatch = Math.abs(
          new Date(localEntry.consumed_at).getTime() - new Date(remote.consumed_at).getTime()
        ) < 300000 // 5分鐘內的誤差範圍

        return timeMatch &&
               localEntry.food_name === remote.food_name &&
               Math.abs((localEntry.amount || 0) - remote.amount) < 1 // 允許輕微誤差
      })

      if (!existsInRemote) {
        // 只添加未在遠程伺服器上的本地記錄
        merged.push(localEntry)
      }
    }

    console.log(`Merged total: ${merged.length} entries`)

    // 按時間排序（最新的在前）
    return merged.sort((a, b) => {
      const timeA = new Date(a.consumed_at).getTime()
      const timeB = new Date(b.consumed_at).getTime()
      return timeB - timeA
    })
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