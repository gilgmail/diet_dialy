/**
 * Diet Daily - 離線儲存管理系統
 * 處理離線模式下的資料同步和儲存
 */

export interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'food_history' | 'medical_profile' | 'symptoms';
  data: any;
  timestamp: number;
  synced: boolean;
}

export interface OfflineData {
  food_history: any[];
  medical_profiles: any[];
  symptoms: any[];
  last_sync: number;
}

class OfflineStorageManager {
  private readonly STORAGE_KEY = 'diet_daily_offline';
  private readonly ACTIONS_KEY = 'diet_daily_offline_actions';

  /**
   * 儲存離線動作以供後續同步
   */
  async storeOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>): Promise<string> {
    const actionWithId: OfflineAction = {
      ...action,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      synced: false
    };

    try {
      const existingActions = await this.getOfflineActions();
      existingActions.push(actionWithId);

      localStorage.setItem(this.ACTIONS_KEY, JSON.stringify(existingActions));

      console.log('📱 離線動作已儲存:', actionWithId);
      return actionWithId.id;
    } catch (error) {
      console.error('儲存離線動作失敗:', error);
      throw error;
    }
  }

  /**
   * 取得所有待同步的離線動作
   */
  async getOfflineActions(): Promise<OfflineAction[]> {
    try {
      const stored = localStorage.getItem(this.ACTIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('讀取離線動作失敗:', error);
      return [];
    }
  }

  /**
   * 標記動作為已同步
   */
  async markActionSynced(actionId: string): Promise<void> {
    try {
      const actions = await this.getOfflineActions();
      const updatedActions = actions.map(action =>
        action.id === actionId ? { ...action, synced: true } : action
      );

      localStorage.setItem(this.ACTIONS_KEY, JSON.stringify(updatedActions));
    } catch (error) {
      console.error('標記同步狀態失敗:', error);
    }
  }

  /**
   * 清除已同步的動作
   */
  async clearSyncedActions(): Promise<void> {
    try {
      const actions = await this.getOfflineActions();
      const unsyncedActions = actions.filter(action => !action.synced);

      localStorage.setItem(this.ACTIONS_KEY, JSON.stringify(unsyncedActions));

      console.log(`🧹 清除了 ${actions.length - unsyncedActions.length} 個已同步動作`);
    } catch (error) {
      console.error('清除同步動作失敗:', error);
    }
  }

  /**
   * 儲存資料到本地儲存
   */
  async storeData(entity: string, data: any): Promise<void> {
    try {
      const offlineData = await this.getOfflineData();

      if (entity in offlineData) {
        offlineData[entity as keyof OfflineData] = data;
      }

      offlineData.last_sync = Date.now();

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(offlineData));

      console.log(`💾 ${entity} 資料已儲存到本地`);
    } catch (error) {
      console.error('儲存本地資料失敗:', error);
    }
  }

  /**
   * 從本地儲存讀取資料
   */
  async getData(entity: string): Promise<any[]> {
    try {
      const offlineData = await this.getOfflineData();
      return (offlineData as any)[entity] || [];
    } catch (error) {
      console.error('讀取本地資料失敗:', error);
      return [];
    }
  }

  /**
   * 取得完整的離線資料
   */
  async getOfflineData(): Promise<OfflineData> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {
        food_history: [],
        medical_profiles: [],
        symptoms: [],
        last_sync: 0
      };
    } catch (error) {
      console.error('讀取離線資料失敗:', error);
      return {
        food_history: [],
        medical_profiles: [],
        symptoms: [],
        last_sync: 0
      };
    }
  }

  /**
   * 檢查是否有待同步的資料
   */
  async hasPendingSync(): Promise<boolean> {
    try {
      const actions = await this.getOfflineActions();
      return actions.some(action => !action.synced);
    } catch (error) {
      console.error('檢查同步狀態失敗:', error);
      return false;
    }
  }

  /**
   * 同步離線資料到伺服器
   */
  async syncToServer(): Promise<{ success: number; failed: number }> {
    if (!navigator.onLine) {
      console.log('🔌 目前離線，跳過同步');
      return { success: 0, failed: 0 };
    }

    const actions = await this.getOfflineActions();
    const unsyncedActions = actions.filter(action => !action.synced);

    if (unsyncedActions.length === 0) {
      console.log('✅ 沒有待同步的資料');
      return { success: 0, failed: 0 };
    }

    console.log(`🔄 開始同步 ${unsyncedActions.length} 個離線動作`);

    let successCount = 0;
    let failedCount = 0;

    for (const action of unsyncedActions) {
      try {
        await this.syncSingleAction(action);
        await this.markActionSynced(action.id);
        successCount++;

        console.log(`✅ 同步成功: ${action.type} ${action.entity}`);
      } catch (error) {
        console.error(`❌ 同步失敗: ${action.type} ${action.entity}`, error);
        failedCount++;
      }
    }

    // 清除已同步的動作
    await this.clearSyncedActions();

    console.log(`🎯 同步完成: ${successCount} 成功, ${failedCount} 失敗`);

    return { success: successCount, failed: failedCount };
  }

  /**
   * 同步單一動作到伺服器
   */
  private async syncSingleAction(action: OfflineAction): Promise<void> {
    const { type, entity, data } = action;

    let method = 'POST';
    let url = '';

    switch (entity) {
      case 'food_history':
        url = '/api/history';
        if (type === 'UPDATE') method = 'PUT';
        else if (type === 'DELETE') method = 'DELETE';
        break;
      case 'medical_profile':
        url = '/api/medical/profile';
        if (type === 'UPDATE') method = 'PUT';
        break;
      case 'symptoms':
        url = '/api/medical/symptoms';
        if (type === 'UPDATE') method = 'PUT';
        break;
      default:
        throw new Error(`不支援的實體類型: ${entity}`);
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`同步請求失敗: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * 清空所有離線資料
   */
  async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.ACTIONS_KEY);
      console.log('🗑️ 所有離線資料已清空');
    } catch (error) {
      console.error('清空離線資料失敗:', error);
    }
  }

  /**
   * 取得儲存空間使用情況
   */
  getStorageInfo(): { used: number; available: number; percentage: number } {
    try {
      const used = JSON.stringify(localStorage).length;
      const available = 5 * 1024 * 1024; // 假設 5MB 限制
      const percentage = (used / available) * 100;

      return {
        used: Math.round(used / 1024), // KB
        available: Math.round(available / 1024), // KB
        percentage: Math.round(percentage * 100) / 100
      };
    } catch (error) {
      console.error('取得儲存資訊失敗:', error);
      return { used: 0, available: 5120, percentage: 0 };
    }
  }
}

// 匯出單例實例
export const offlineStorage = new OfflineStorageManager();

/**
 * Hook for using offline storage in React components
 */
export function useOfflineStorage() {
  const isOnline = typeof window !== 'undefined' ? navigator.onLine : true;

  const storeAction = async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>) => {
    if (isOnline) {
      // 如果在線，直接執行 API 請求
      return await performOnlineAction(action);
    } else {
      // 如果離線，儲存到本地等待同步
      return await offlineStorage.storeOfflineAction(action);
    }
  };

  const syncData = async () => {
    if (isOnline) {
      return await offlineStorage.syncToServer();
    }
    return { success: 0, failed: 0 };
  };

  return {
    isOnline,
    storeAction,
    syncData,
    hasPendingSync: () => offlineStorage.hasPendingSync(),
    getStorageInfo: () => offlineStorage.getStorageInfo()
  };
}

/**
 * 執行線上動作
 */
async function performOnlineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>): Promise<string> {
  // 這裡實作直接的 API 請求
  // 這個函數會在線上模式時直接執行動作，離線時則儲存待同步

  console.log('🌐 執行線上動作:', action);
  // 實際的 API 請求邏輯會在這裡實作

  return 'online_action_' + Date.now();
}