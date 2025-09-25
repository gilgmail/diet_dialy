// 自動同步服務 - 處理離線數據與 Supabase 的同步
import { localStorageService } from '../local-storage'
import { enhancedFoodEntriesService } from '../supabase/enhanced-food-entries'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

export interface SyncResult {
  success: number
  failed: number
  errors: string[]
  tableExists: boolean
  syncDuration: number
}

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: Date | null
  pendingCount: number
  failedCount: number
  tableExists: boolean
}

export class AutoSyncService {
  private syncInProgress = false
  private syncInterval: NodeJS.Timeout | null = null
  private lastSyncTime: Date | null = null
  private retryCount = 0
  private maxRetries = 3

  constructor() {
    this.setupAutoSync()
    this.setupNetworkListeners()
  }

  // 設置自動同步
  private setupAutoSync(): void {
    // 每30秒檢查一次是否需要同步
    this.syncInterval = setInterval(() => {
      this.checkAndSync()
    }, 30000)

    // 頁面可見性變化時觸發同步
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.checkAndSync()
        }
      })
    }
  }

  // 設置網絡狀態監聽
  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 網絡恢復，開始同步...')
        this.checkAndSync()
      })

      window.addEventListener('offline', () => {
        console.log('📱 網絡斷開，進入離線模式')
      })
    }
  }

  // 檢查並自動同步
  private async checkAndSync(): Promise<void> {
    // 避免重複同步
    if (this.syncInProgress) return

    // 檢查網絡狀態
    if (!navigator.onLine) return

    // 檢查是否有待同步的數據
    const unsyncedEntries = localStorageService.getUnsyncedEntries()
    if (unsyncedEntries.length === 0) return

    // 檢查用戶是否登錄
    try {
      // 這裡需要從上下文獲取用戶信息
      // 暫時使用一個方法來獲取當前用戶
      const userId = this.getCurrentUserId()
      if (!userId) return

      console.log(`🔄 自動同步: 發現 ${unsyncedEntries.length} 條待同步記錄`)
      await this.syncAllEntries(userId)
    } catch (error) {
      console.warn('自動同步失敗:', error)
    }
  }

  // 獲取當前用戶ID (這需要從React上下文或全局狀態獲取)
  private getCurrentUserId(): string | null {
    // 這是一個簡化的實現，實際應該從認證上下文獲取
    if (typeof window !== 'undefined') {
      return localStorage.getItem('supabase.auth.token') ? 'current-user' : null
    }
    return null
  }

  // 手動觸發完整同步
  async syncAllEntries(userId: string): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('同步正在進行中，請稍後再試')
    }

    this.syncInProgress = true
    const startTime = Date.now()
    let success = 0
    let failed = 0
    const errors: string[] = []

    try {
      // 檢查表是否存在
      const systemStatus = await enhancedFoodEntriesService.getSystemStatus()
      if (!systemStatus.tableExists) {
        return {
          success: 0,
          failed: 0,
          errors: ['food_entries 表不存在，請先創建數據表'],
          tableExists: false,
          syncDuration: Date.now() - startTime
        }
      }

      const unsyncedEntries = localStorageService.getUnsyncedEntries()
      console.log(`開始同步 ${unsyncedEntries.length} 條記錄`)

      for (const entry of unsyncedEntries) {
        try {
          // 確保記錄有 user_id
          if (!entry.user_id) {
            localStorageService.updateLocalEntry(entry.id, { user_id: userId })
          }

          // 檢查是否應該重試同步
          if (!localStorageService.shouldRetrySync(entry)) {
            console.log(`跳過記錄 ${entry.id} (超出重試次數)`)
            continue
          }

          // 嘗試同步到 Supabase
          const remoteEntry = await enhancedFoodEntriesService.createFoodEntry({
            user_id: userId,
            food_id: entry.food_id,
            food_name: entry.food_name,
            food_category: entry.food_category,
            amount: entry.amount,
            unit: entry.unit,
            calories: entry.calories,
            nutrition_data: entry.nutrition_data || {},
            medical_score: entry.medical_score,
            medical_analysis: entry.medical_analysis || {},
            consumed_at: entry.consumed_at,
            meal_type: entry.meal_type,
            symptoms_before: entry.symptoms_before || {},
            symptoms_after: entry.symptoms_after || {},
            symptom_severity: entry.symptom_severity,
            notes: entry.notes,
            photo_url: entry.photo_url,
            location: entry.location,
            sync_status: 'synced'
          })

          if (remoteEntry) {
            // 標記為已同步
            localStorageService.markAsSynced(entry.id, remoteEntry.id)
            success++
            console.log(`✅ 同步成功: ${entry.id} → ${remoteEntry.id}`)
          } else {
            throw new Error('創建遠程記錄失敗')
          }

          // 避免過快的請求
          await new Promise(resolve => setTimeout(resolve, 100))

        } catch (error: any) {
          failed++
          const errorMsg = `同步記錄 ${entry.id} 失敗: ${error.message}`
          errors.push(errorMsg)
          console.error('❌', errorMsg)

          // 根據錯誤類型決定是否增加重試次數
          const isRetryableError = !this.isNonRetryableError(error)
          if (isRetryableError) {
            localStorageService.incrementSyncAttempt(entry.id)
          } else {
            console.error('不可重試的錯誤:', error)
          }
        }
      }

      this.lastSyncTime = new Date()
      this.retryCount = 0 // 重置重試計數

      console.log(`同步完成: ${success} 成功, ${failed} 失敗`)

      return {
        success,
        failed,
        errors,
        tableExists: true,
        syncDuration: Date.now() - startTime
      }

    } catch (error: any) {
      const errorMsg = `同步過程異常: ${error.message}`
      errors.push(errorMsg)
      console.error('💥', errorMsg)

      this.retryCount++

      return {
        success,
        failed,
        errors,
        tableExists: false,
        syncDuration: Date.now() - startTime
      }
    } finally {
      this.syncInProgress = false
    }
  }

  // 判斷是否為不可重試的錯誤
  private isNonRetryableError(error: any): boolean {
    const nonRetryableCodes = ['PGRST116', '401', '403', 'PGRST301']
    return nonRetryableCodes.includes(error.code) ||
           nonRetryableCodes.includes(error.status?.toString())
  }

  // 獲取同步狀態
  getSyncStatus(): SyncStatus {
    const stats = localStorageService.getStats()
    return {
      isOnline: navigator.onLine,
      isSyncing: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      pendingCount: stats.unsynced,
      failedCount: stats.failed,
      tableExists: enhancedFoodEntriesService.getSystemStatus !== undefined
    }
  }

  // 強制同步所有數據
  async forceSyncAll(userId: string): Promise<SyncResult> {
    // 重置所有同步狀態
    localStorageService.resetSyncAttempts()
    this.syncInProgress = false
    this.retryCount = 0

    return this.syncAllEntries(userId)
  }

  // 清理失敗的同步記錄
  cleanupFailedSyncs(): number {
    return localStorageService.cleanupFailedEntries()
  }

  // 停止自動同步
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // 重新開始自動同步
  restartAutoSync(): void {
    this.stopAutoSync()
    this.setupAutoSync()
  }

  // 測試同步功能
  async testSync(userId: string): Promise<{
    canConnect: boolean
    tableExists: boolean
    testResult?: any
    error?: string
  }> {
    try {
      const systemStatus = await enhancedFoodEntriesService.getSystemStatus()

      if (!systemStatus.tableExists) {
        return {
          canConnect: systemStatus.canConnect,
          tableExists: false,
          error: 'food_entries 表不存在，需要先創建數據表'
        }
      }

      // 測試基本功能
      const testResult = await enhancedFoodEntriesService.testBasicFunctionality(userId)

      return {
        canConnect: true,
        tableExists: true,
        testResult
      }
    } catch (error: any) {
      return {
        canConnect: false,
        tableExists: false,
        error: error.message
      }
    }
  }

  // 獲取診斷信息
  async getDiagnostics(): Promise<{
    systemStatus: any
    localStats: any
    syncStatus: SyncStatus
    tableMissing: boolean
    recommendations: string[]
  }> {
    const systemStatus = await enhancedFoodEntriesService.getSystemStatus()
    const localStats = localStorageService.getStats()
    const syncStatus = this.getSyncStatus()

    const recommendations: string[] = []

    if (!systemStatus.tableExists) {
      recommendations.push('需要在 Supabase 控制台執行建表 SQL')
      recommendations.push('參考文件: sql-scripts/create_food_entries_table.sql')
    }

    if (localStats.unsynced > 0) {
      recommendations.push(`有 ${localStats.unsynced} 條記錄待同步`)
    }

    if (localStats.failed > 0) {
      recommendations.push(`有 ${localStats.failed} 條記錄同步失敗，建議清理`)
    }

    if (!navigator.onLine) {
      recommendations.push('當前處於離線狀態，無法同步')
    }

    return {
      systemStatus,
      localStats,
      syncStatus,
      tableMissing: !systemStatus.tableExists,
      recommendations
    }
  }
}

// 創建全局實例
export const autoSyncService = new AutoSyncService()