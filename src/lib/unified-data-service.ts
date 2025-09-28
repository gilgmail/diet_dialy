'use client';

import { offlineStorageManager, PendingFoodEntry } from './offline-storage';

/**
 * 統一的食物記錄介面 - 結合本地和遠端資料
 */
export interface UnifiedFoodEntry {
  id: string;
  tempId?: string;
  foodName: string;
  portion: string;
  time: string;
  date: string;
  notes?: string;
  category: string;
  medicalScore: number;
  status: 'local' | 'pending' | 'syncing' | 'synced' | 'error';
  createdAt: string;
  updatedAt?: string;
  errorMessage?: string;
  source: 'local' | 'remote';
  userId?: string;
}

/**
 * 統一的資料管理服務
 * 負責協調本地資料和 Supabase 資料
 */
class UnifiedDataService {
  private listeners: Array<(entries: UnifiedFoodEntry[]) => void> = [];
  private cachedEntries: UnifiedFoodEntry[] = [];
  private lastSyncTime: Date | null = null;

  /**
   * 訂閱資料變更
   */
  subscribe(callback: (entries: UnifiedFoodEntry[]) => void) {
    this.listeners.push(callback);
    // 立即回調當前資料
    callback(this.cachedEntries);

    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * 通知所有訂閱者
   */
  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.cachedEntries));
  }

  /**
   * 獲取統一的食物記錄 (本地 + 遠端)
   */
  async getUnifiedEntries(date?: string, medicalService?: any): Promise<UnifiedFoodEntry[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      // 1. 獲取本地暫存記錄
      const localEntries = this.getLocalEntries(targetDate);

      // 2. 獲取遠端記錄 (如果有服務且已認證)
      let remoteEntries: UnifiedFoodEntry[] = [];
      if (medicalService && medicalService.isReady) {
        try {
          remoteEntries = await this.getRemoteEntries(targetDate, medicalService);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知錯誤';
          console.log('📡 無法獲取遠端資料，僅顯示本地資料:', errorMessage);
        }
      }

      // 3. 合併並去重 (優先保留遠端已同步的資料)
      const mergedEntries = this.mergeAndDeduplicateEntries(localEntries, remoteEntries);

      // 4. 快取並通知
      this.cachedEntries = mergedEntries;
      this.notifyListeners();

      return mergedEntries;
    } catch (error) {
      console.error('❌ 統一資料服務錯誤:', error);
      return this.getLocalEntries(targetDate); // 失敗時回退到本地資料
    }
  }

  /**
   * 獲取本地記錄
   */
  private getLocalEntries(date: string): UnifiedFoodEntry[] {
    const pendingEntries = offlineStorageManager.getPendingEntries()
      .filter(entry => entry.date === date)
      .map(entry => ({
        id: entry.tempId,
        tempId: entry.tempId,
        foodName: entry.foodName,
        portion: '1份', // 預設份量
        time: entry.time,
        date: entry.date,
        notes: entry.notes || '',
        category: entry.category,
        medicalScore: entry.medicalScore || 5,
        status: entry.syncStatus as any,
        createdAt: entry.createdAt,
        errorMessage: entry.errorMessage,
        source: 'local' as const,
        userId: entry.userId
      }));

    return pendingEntries;
  }

  /**
   * 獲取遠端記錄
   */
  private async getRemoteEntries(date: string, medicalService: any): Promise<UnifiedFoodEntry[]> {
    try {
      const remoteData = await medicalService.getFoodEntriesByDateRange(date, date);

      return remoteData.map((entry: any) => ({
        id: entry.id || `remote_${entry.timestamp || Date.now()}`,
        foodName: entry.foodName,
        portion: '1份',
        time: entry.time,
        date: entry.date,
        notes: entry.notes || '',
        category: entry.category || '其他',
        medicalScore: entry.medicalScore || 5,
        status: 'synced' as const,
        createdAt: entry.timestamp || new Date().toISOString(),
        updatedAt: entry.updatedAt,
        source: 'remote' as const,
        userId: entry.userId
      }));
    } catch (error) {
      console.warn('📡 遠端資料獲取失敗:', error);
      return [];
    }
  }

  /**
   * 合併並去重記錄
   * 規則：
   * 1. 相同時間、食物名稱的記錄視為重複
   * 2. 遠端已同步 > 本地已同步 > 本地待同步 > 本地錯誤
   * 3. 保留最高優先級的記錄，移除重複
   */
  private mergeAndDeduplicateEntries(localEntries: UnifiedFoodEntry[], remoteEntries: UnifiedFoodEntry[]): UnifiedFoodEntry[] {
    const allEntries = [...localEntries, ...remoteEntries];
    const entryMap = new Map<string, UnifiedFoodEntry>();

    // 定義優先級
    const getPriority = (entry: UnifiedFoodEntry): number => {
      if (entry.source === 'remote') return 4; // 遠端已同步最高
      if (entry.status === 'synced') return 3;  // 本地已同步
      if (entry.status === 'pending' || entry.status === 'syncing') return 2; // 本地待同步
      return 1; // 本地錯誤或其他狀態
    };

    // 按時間和食物名稱分組，保留最高優先級
    for (const entry of allEntries) {
      const key = `${entry.date}_${entry.time}_${entry.foodName}`;
      const existing = entryMap.get(key);

      if (!existing || getPriority(entry) > getPriority(existing)) {
        entryMap.set(key, entry);
      }
    }

    // 排序並返回
    return Array.from(entryMap.values()).sort((a, b) => {
      // 按日期和時間排序
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.time.localeCompare(a.time);
    });
  }

  /**
   * 添加新記錄
   */
  async addFoodEntry(entry: Omit<UnifiedFoodEntry, 'id' | 'status' | 'createdAt' | 'source'>): Promise<boolean> {
    try {
      // 添加到本地暫存
      const pendingEntry = {
        date: entry.date,
        time: entry.time,
        foodName: entry.foodName,
        category: entry.category,
        medicalScore: entry.medicalScore || 5,
        notes: entry.notes || '',
        userId: entry.userId || 'demo-user'
      };

      offlineStorageManager.addPendingEntry(pendingEntry);

      // 重新獲取並通知更新
      await this.getUnifiedEntries(entry.date);

      return true;
    } catch (error) {
      console.error('❌ 添加記錄失敗:', error);
      return false;
    }
  }

  /**
   * 同步暫存記錄到遠端
   */
  async syncPendingEntries(medicalService: any): Promise<{ success: number; failed: number }> {
    try {
      const result = await offlineStorageManager.syncPendingEntries(medicalService);

      // 同步後重新獲取資料
      await this.getUnifiedEntries();

      return result;
    } catch (error) {
      console.error('❌ 同步失敗:', error);
      return { success: 0, failed: 1 };
    }
  }

  /**
   * 獲取統計資料 (基於完整歷史數據)
   */
  async getComprehensiveStatistics(medicalService?: any): Promise<{
    totalEntries: number;
    pendingCount: number;
    errorCount: number;
    todayCount: number;
    weekCount: number;
    monthCount: number;
    remoteEntries: number;
    localEntries: number;
    averageMedicalScore: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 獲取完整的月度數據以確保統計準確性
    let allRelevantEntries: UnifiedFoodEntry[] = [];

    try {
      if (medicalService && medicalService.isReady) {
        // 獲取完整的月度範圍數據
        allRelevantEntries = await this.getEntriesByDateRange(monthAgo, today, medicalService);
      } else {
        // 僅使用快取資料
        allRelevantEntries = this.cachedEntries;
      }
    } catch (error) {
      console.warn('📊 無法獲取完整統計數據，使用快取資料:', error);
      allRelevantEntries = this.cachedEntries;
    }

    const todayEntries = allRelevantEntries.filter(entry => entry.date === today);
    const weekEntries = allRelevantEntries.filter(entry => entry.date >= (weekAgo || today));
    const monthEntries = allRelevantEntries.filter(entry => entry.date >= (monthAgo || today));
    const remoteEntries = allRelevantEntries.filter(entry => entry.source === 'remote');
    const localEntries = allRelevantEntries.filter(entry => entry.source === 'local');

    // 計算平均醫療評分
    const validScores = allRelevantEntries
      .map(entry => entry.medicalScore)
      .filter((score): score is number => typeof score === 'number' && !isNaN(score));
    const averageMedicalScore = validScores.length > 0
      ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
      : 0;

    return {
      totalEntries: allRelevantEntries.length,
      pendingCount: offlineStorageManager.getPendingCount(),
      errorCount: offlineStorageManager.getErrorCount(),
      todayCount: todayEntries.length,
      weekCount: weekEntries.length,
      monthCount: monthEntries.length,
      remoteEntries: remoteEntries.length,
      localEntries: localEntries.length,
      averageMedicalScore: Number(averageMedicalScore.toFixed(1))
    };
  }

  /**
   * 獲取統計資料 (快速版本，基於快取)
   */
  getStatistics(): {
    totalEntries: number;
    pendingCount: number;
    errorCount: number;
    todayCount: number;
    weekCount: number;
    monthCount: number;
  } {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todayEntries = this.cachedEntries.filter(entry => entry.date === today);
    const weekEntries = this.cachedEntries.filter(entry => entry.date >= (weekAgo || today));
    const monthEntries = this.cachedEntries.filter(entry => entry.date >= (monthAgo || today));

    return {
      totalEntries: this.cachedEntries.length,
      pendingCount: offlineStorageManager.getPendingCount(),
      errorCount: offlineStorageManager.getErrorCount(),
      todayCount: todayEntries.length,
      weekCount: weekEntries.length,
      monthCount: monthEntries.length
    };
  }

  /**
   * 獲取最近的記錄 (用於 dashboard)
   */
  getRecentEntries(limit: number = 10): UnifiedFoodEntry[] {
    return this.cachedEntries
      .sort((a, b) => {
        // 按日期和時間倒序排列
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
      })
      .slice(0, limit);
  }

  /**
   * 獲取指定日期範圍的記錄
   */
  async getEntriesByDateRange(startDate: string, endDate: string, medicalService?: any): Promise<UnifiedFoodEntry[]> {
    // 為了簡化，這裡先實現單日查詢，後續可擴展到範圍查詢
    const allEntries: UnifiedFoodEntry[] = [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayEntries = await this.getUnifiedEntries(dateStr, medicalService);
      allEntries.push(...dayEntries);
    }

    return allEntries.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.time.localeCompare(a.time);
    });
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.cachedEntries = [];
    this.notifyListeners();
  }
}

// 單例導出
export const unifiedDataService = new UnifiedDataService();