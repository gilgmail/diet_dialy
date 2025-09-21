'use client';

import { FoodEntry } from './google/sheets-service';

/**
 * 離線食物記錄暫存管理器
 * 提供本地存儲、同步狀態管理和批量上傳功能
 */

export interface PendingFoodEntry extends Omit<FoodEntry, 'id' | 'timestamp'> {
  tempId: string;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
}

class OfflineStorageManager {
  private readonly PENDING_ENTRIES_KEY = 'diet_daily_pending_entries';
  private readonly SYNC_METADATA_KEY = 'diet_daily_sync_metadata';

  /**
   * 添加食物記錄到離線暫存
   */
  addPendingEntry(entry: Omit<FoodEntry, 'id' | 'timestamp'>): PendingFoodEntry {
    const pendingEntry: PendingFoodEntry = {
      ...entry,
      tempId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      syncStatus: 'pending'
    };

    const pendingEntries = this.getPendingEntries();
    pendingEntries.push(pendingEntry);

    localStorage.setItem(this.PENDING_ENTRIES_KEY, JSON.stringify(pendingEntries));

    console.log('📝 添加食物記錄到離線暫存:', pendingEntry.tempId);
    return pendingEntry;
  }

  /**
   * 獲取所有暫存的食物記錄
   */
  getPendingEntries(): PendingFoodEntry[] {
    try {
      const stored = localStorage.getItem(this.PENDING_ENTRIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ 讀取暫存記錄失敗:', error);
      return [];
    }
  }

  /**
   * 獲取待同步的記錄數量
   */
  getPendingCount(): number {
    const pending = this.getPendingEntries();
    return pending.filter(entry => entry.syncStatus === 'pending').length;
  }

  /**
   * 獲取同步失敗的記錄數量
   */
  getErrorCount(): number {
    const pending = this.getPendingEntries();
    return pending.filter(entry => entry.syncStatus === 'error').length;
  }

  /**
   * 更新記錄的同步狀態
   */
  updateSyncStatus(tempId: string, status: PendingFoodEntry['syncStatus'], errorMessage?: string): void {
    const pendingEntries = this.getPendingEntries();
    const entryIndex = pendingEntries.findIndex(entry => entry.tempId === tempId);

    if (entryIndex !== -1) {
      const entry = pendingEntries[entryIndex];
      if (entry) {
        entry.syncStatus = status;
        if (errorMessage) {
          entry.errorMessage = errorMessage;
        }
      }

      localStorage.setItem(this.PENDING_ENTRIES_KEY, JSON.stringify(pendingEntries));
      console.log(`🔄 更新同步狀態: ${tempId} → ${status}`);
    }
  }

  /**
   * 移除已成功同步的記錄
   */
  removeSyncedEntries(): number {
    const pendingEntries = this.getPendingEntries();
    const beforeCount = pendingEntries.length;

    const unsyncedEntries = pendingEntries.filter(entry => entry.syncStatus !== 'synced');
    localStorage.setItem(this.PENDING_ENTRIES_KEY, JSON.stringify(unsyncedEntries));

    const removedCount = beforeCount - unsyncedEntries.length;
    if (removedCount > 0) {
      console.log(`🧹 清除 ${removedCount} 筆已同步記錄`);
    }

    return removedCount;
  }

  /**
   * 清除所有暫存記錄（慎用）
   */
  clearAllPendingEntries(): void {
    localStorage.removeItem(this.PENDING_ENTRIES_KEY);
    console.log('🗑️ 清除所有暫存記錄');
  }

  /**
   * 獲取同步元數據
   */
  getSyncMetadata() {
    try {
      const stored = localStorage.getItem(this.SYNC_METADATA_KEY);
      return stored ? JSON.parse(stored) : {
        lastSyncTime: null,
        lastSyncStatus: 'none',
        totalSynced: 0,
        totalErrors: 0
      };
    } catch (error) {
      console.error('❌ 讀取同步元數據失敗:', error);
      return {
        lastSyncTime: null,
        lastSyncStatus: 'none',
        totalSynced: 0,
        totalErrors: 0
      };
    }
  }

  /**
   * 更新同步元數據
   */
  updateSyncMetadata(updates: Partial<{
    lastSyncTime: string;
    lastSyncStatus: 'success' | 'partial' | 'error' | 'none';
    totalSynced: number;
    totalErrors: number;
  }>): void {
    const current = this.getSyncMetadata();
    const updated = { ...current, ...updates };

    localStorage.setItem(this.SYNC_METADATA_KEY, JSON.stringify(updated));
  }

  /**
   * 獲取今日暫存記錄（用於統計）
   */
  getTodayPendingEntries(): PendingFoodEntry[] {
    const today = new Date().toISOString().split('T')[0];
    const pending = this.getPendingEntries();

    return pending.filter(entry => entry.date === today);
  }

  /**
   * 獲取綜合統計（包含暫存記錄）
   */
  getCombinedStats(syncedStats: { todayEntries: number; weekEntries: number; monthEntries: number }) {
    const pending = this.getPendingEntries();
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todayPending = pending.filter(entry => entry.date === today).length;
    const weekPending = pending.filter(entry => entry.date >= (weekAgo || today)).length;
    const monthPending = pending.filter(entry => entry.date >= (monthAgo || today)).length;

    return {
      todayEntries: (syncedStats.todayEntries || 0) + todayPending,
      weekEntries: (syncedStats.weekEntries || 0) + weekPending,
      monthEntries: (syncedStats.monthEntries || 0) + monthPending,
      pendingCount: this.getPendingCount(),
      errorCount: this.getErrorCount()
    };
  }

  /**
   * 批量同步到Google Sheets
   */
  async syncPendingEntries(sheetsService: any): Promise<{ success: number; failed: number }> {
    const pendingEntries = this.getPendingEntries().filter(entry =>
      entry.syncStatus === 'pending' || entry.syncStatus === 'error'
    );

    if (pendingEntries.length === 0) {
      console.log('✅ 沒有待同步的記錄');
      return { success: 0, failed: 0 };
    }

    console.log(`🔄 開始同步 ${pendingEntries.length} 筆暫存記錄`);

    let successCount = 0;
    let failedCount = 0;

    for (const entry of pendingEntries) {
      try {
        // 標記為正在同步
        this.updateSyncStatus(entry.tempId, 'syncing');

        // 呼叫 medical service 記錄食物
        const success = await sheetsService.recordFoodEntry({
          date: entry.date,
          time: entry.time,
          foodName: entry.foodName,
          category: entry.category,
          medicalScore: entry.medicalScore,
          notes: entry.notes,
          userId: entry.userId
        });

        if (success) {
          this.updateSyncStatus(entry.tempId, 'synced');
          successCount++;
          console.log(`✅ 同步成功: ${entry.foodName}`);
        } else {
          throw new Error('同步失敗：未知錯誤');
        }
      } catch (error) {
        this.updateSyncStatus(entry.tempId, 'error', error instanceof Error ? error.message : '同步失敗');
        failedCount++;
        console.error(`❌ 同步失敗: ${entry.foodName}`, error);
      }
    }

    // 注意：在新的統一資料架構中，我們不移除已同步的記錄
    // 而是依賴 unified-data-service.ts 中的去重機制來處理本地和遠端資料的合併
    // this.removeSyncedEntries();

    // 更新同步元數據
    this.updateSyncMetadata({
      lastSyncTime: new Date().toISOString(),
      lastSyncStatus: failedCount === 0 ? 'success' : successCount > 0 ? 'partial' : 'error',
      totalSynced: successCount,
      totalErrors: failedCount
    });

    console.log(`🎯 同步完成: ${successCount} 成功, ${failedCount} 失敗`);

    return { success: successCount, failed: failedCount };
  }

  /**
   * 比較本地記錄與 Google Sheets 記錄，更新同步狀態
   */
  async compareSyncStatus(sheetsService: any): Promise<void> {
    try {
      console.log('🔍 開始比較本地記錄與 Google Sheets 同步狀態...');

      // 獲取今日本地暫存記錄
      const todayEntries = this.getTodayPendingEntries();

      if (todayEntries.length === 0) {
        console.log('📝 今日沒有暫存記錄需要檢查');
        return;
      }

      // 獲取 Google Sheets 中今日的記錄
      const today = new Date().toISOString().split('T')[0];
      const sheetsEntries = await sheetsService.getFoodEntriesByDateRange(today, today);

      console.log(`📊 比較數據: 本地 ${todayEntries.length} 筆, Sheets ${sheetsEntries.length} 筆`);

      // 比較並更新狀態
      for (const localEntry of todayEntries) {
        const matchingSheetEntry = sheetsEntries.find((sheetEntry: any) =>
          sheetEntry.foodName === localEntry.foodName &&
          sheetEntry.time === localEntry.time &&
          sheetEntry.date === localEntry.date
        );

        if (matchingSheetEntry) {
          // 找到匹配記錄，標記為已同步
          this.updateSyncStatus(localEntry.tempId, 'synced');
          console.log(`✅ 記錄已存在於 Sheets: ${localEntry.foodName}`);
        } else {
          // 沒找到匹配記錄，保持待同步狀態
          if (localEntry.syncStatus === 'synced') {
            this.updateSyncStatus(localEntry.tempId, 'pending');
            console.log(`⚠️ 記錄不在 Sheets 中，重置為待同步: ${localEntry.foodName}`);
          }
        }
      }

      console.log('✅ 同步狀態比較完成');
    } catch (error) {
      console.error('❌ 同步狀態比較失敗:', error);
    }
  }

  /**
   * 自動同步配置管理
   */
  getAutoSyncSetting(): boolean {
    try {
      const setting = localStorage.getItem('diet_daily_auto_sync');
      return setting === 'true';
    } catch (error) {
      return false;
    }
  }

  setAutoSyncSetting(enabled: boolean): void {
    try {
      localStorage.setItem('diet_daily_auto_sync', enabled.toString());
      console.log(`⚙️ 自動同步設定: ${enabled ? '啟用' : '停用'}`);
    } catch (error) {
      console.error('❌ 自動同步設定儲存失敗:', error);
    }
  }

  /**
   * 執行自動同步（如果啟用）
   */
  async performAutoSync(sheetsService: any): Promise<boolean> {
    if (!this.getAutoSyncSetting()) {
      console.log('⚙️ 自動同步已停用');
      return false;
    }

    const pendingCount = this.getPendingCount();
    if (pendingCount === 0) {
      console.log('✅ 沒有待同步的記錄');
      return true;
    }

    try {
      console.log(`🔄 執行自動同步 ${pendingCount} 筆記錄...`);
      const result = await this.syncPendingEntries(sheetsService);

      const { success, failed } = result;
      console.log(`🎯 自動同步結果: ${success} 成功, ${failed} 失敗`);

      return failed === 0;
    } catch (error) {
      console.error('❌ 自動同步失敗:', error);
      return false;
    }
  }
}

// 單例導出
export const offlineStorageManager = new OfflineStorageManager();