import { offlineStorage, OfflineAction } from '@/lib/offline-storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock fetch
global.fetch = jest.fn();

describe('OfflineStorageManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    (navigator as any).onLine = true;
  });

  describe('storeOfflineAction', () => {
    it('stores action with generated ID and timestamp', async () => {
      const action = {
        type: 'CREATE' as const,
        entity: 'food_history' as const,
        data: { foodId: 'test_food', portion: 100 }
      };

      const actionId = await offlineStorage.storeOfflineAction(action);

      expect(actionId).toMatch(/^offline_\d+_[a-z0-9]+$/);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'diet_daily_offline_actions',
        expect.stringContaining(actionId)
      );
    });

    it('appends to existing actions', async () => {
      // Store first action
      const action1 = {
        type: 'CREATE' as const,
        entity: 'food_history' as const,
        data: { foodId: 'food1' }
      };
      await offlineStorage.storeOfflineAction(action1);

      // Store second action
      const action2 = {
        type: 'UPDATE' as const,
        entity: 'symptoms' as const,
        data: { symptomId: 'symptom1' }
      };
      await offlineStorage.storeOfflineAction(action2);

      const actions = await offlineStorage.getOfflineActions();
      expect(actions).toHaveLength(2);
      expect(actions[0].entity).toBe('food_history');
      expect(actions[1].entity).toBe('symptoms');
    });
  });

  describe('getOfflineActions', () => {
    it('returns empty array when no actions stored', async () => {
      const actions = await offlineStorage.getOfflineActions();
      expect(actions).toEqual([]);
    });

    it('returns stored actions', async () => {
      const mockActions: OfflineAction[] = [
        {
          id: 'action1',
          type: 'CREATE',
          entity: 'food_history',
          data: { foodId: 'test' },
          timestamp: Date.now(),
          synced: false
        }
      ];

      localStorageMock.setItem(
        'diet_daily_offline_actions',
        JSON.stringify(mockActions)
      );

      const actions = await offlineStorage.getOfflineActions();
      expect(actions).toEqual(mockActions);
    });

    it('handles corrupted localStorage gracefully', async () => {
      localStorageMock.setItem('diet_daily_offline_actions', 'invalid json');

      const actions = await offlineStorage.getOfflineActions();
      expect(actions).toEqual([]);
    });
  });

  describe('markActionSynced', () => {
    it('marks specific action as synced', async () => {
      const mockActions: OfflineAction[] = [
        {
          id: 'action1',
          type: 'CREATE',
          entity: 'food_history',
          data: { foodId: 'test1' },
          timestamp: Date.now(),
          synced: false
        },
        {
          id: 'action2',
          type: 'CREATE',
          entity: 'food_history',
          data: { foodId: 'test2' },
          timestamp: Date.now(),
          synced: false
        }
      ];

      localStorageMock.setItem(
        'diet_daily_offline_actions',
        JSON.stringify(mockActions)
      );

      await offlineStorage.markActionSynced('action1');

      const updatedActions = await offlineStorage.getOfflineActions();
      expect(updatedActions[0].synced).toBe(true);
      expect(updatedActions[1].synced).toBe(false);
    });
  });

  describe('clearSyncedActions', () => {
    it('removes only synced actions', async () => {
      const mockActions: OfflineAction[] = [
        {
          id: 'action1',
          type: 'CREATE',
          entity: 'food_history',
          data: { foodId: 'test1' },
          timestamp: Date.now(),
          synced: true
        },
        {
          id: 'action2',
          type: 'CREATE',
          entity: 'food_history',
          data: { foodId: 'test2' },
          timestamp: Date.now(),
          synced: false
        }
      ];

      localStorageMock.setItem(
        'diet_daily_offline_actions',
        JSON.stringify(mockActions)
      );

      await offlineStorage.clearSyncedActions();

      const remainingActions = await offlineStorage.getOfflineActions();
      expect(remainingActions).toHaveLength(1);
      expect(remainingActions[0].id).toBe('action2');
    });
  });

  describe('hasPendingSync', () => {
    it('returns true when unsynced actions exist', async () => {
      const mockActions: OfflineAction[] = [
        {
          id: 'action1',
          type: 'CREATE',
          entity: 'food_history',
          data: { foodId: 'test' },
          timestamp: Date.now(),
          synced: false
        }
      ];

      localStorageMock.setItem(
        'diet_daily_offline_actions',
        JSON.stringify(mockActions)
      );

      const hasPending = await offlineStorage.hasPendingSync();
      expect(hasPending).toBe(true);
    });

    it('returns false when all actions are synced', async () => {
      const mockActions: OfflineAction[] = [
        {
          id: 'action1',
          type: 'CREATE',
          entity: 'food_history',
          data: { foodId: 'test' },
          timestamp: Date.now(),
          synced: true
        }
      ];

      localStorageMock.setItem(
        'diet_daily_offline_actions',
        JSON.stringify(mockActions)
      );

      const hasPending = await offlineStorage.hasPendingSync();
      expect(hasPending).toBe(false);
    });
  });

  describe('syncToServer', () => {
    it('skips sync when offline', async () => {
      (navigator as any).onLine = false;

      const result = await offlineStorage.syncToServer();

      expect(result).toEqual({ success: 0, failed: 0 });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('syncs unsynced actions successfully', async () => {
      const mockActions: OfflineAction[] = [
        {
          id: 'action1',
          type: 'CREATE',
          entity: 'food_history',
          data: { foodId: 'test' },
          timestamp: Date.now(),
          synced: false
        }
      ];

      localStorageMock.setItem(
        'diet_daily_offline_actions',
        JSON.stringify(mockActions)
      );

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const result = await offlineStorage.syncToServer();

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(fetch).toHaveBeenCalledWith('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodId: 'test' })
      });
    });

    it('handles sync failures gracefully', async () => {
      const mockActions: OfflineAction[] = [
        {
          id: 'action1',
          type: 'CREATE',
          entity: 'food_history',
          data: { foodId: 'test' },
          timestamp: Date.now(),
          synced: false
        }
      ];

      localStorageMock.setItem(
        'diet_daily_offline_actions',
        JSON.stringify(mockActions)
      );

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await offlineStorage.syncToServer();

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('uses correct HTTP methods for different operations', async () => {
      const mockActions: OfflineAction[] = [
        {
          id: 'action1',
          type: 'UPDATE',
          entity: 'food_history',
          data: { foodId: 'test' },
          timestamp: Date.now(),
          synced: false
        },
        {
          id: 'action2',
          type: 'DELETE',
          entity: 'food_history',
          data: { foodId: 'test' },
          timestamp: Date.now(),
          synced: false
        }
      ];

      localStorageMock.setItem(
        'diet_daily_offline_actions',
        JSON.stringify(mockActions)
      );

      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true });

      await offlineStorage.syncToServer();

      expect(fetch).toHaveBeenCalledWith('/api/history', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodId: 'test' })
      });

      expect(fetch).toHaveBeenCalledWith('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodId: 'test' })
      });
    });
  });

  describe('getStorageInfo', () => {
    it('returns storage usage information', () => {
      localStorageMock.setItem('test', 'test data');

      const info = offlineStorage.getStorageInfo();

      expect(info).toHaveProperty('used');
      expect(info).toHaveProperty('available');
      expect(info).toHaveProperty('percentage');
      expect(info.available).toBe(5120); // 5MB in KB
    });
  });

  describe('clearAllData', () => {
    it('removes all offline storage data', async () => {
      localStorageMock.setItem('diet_daily_offline', 'test');
      localStorageMock.setItem('diet_daily_offline_actions', 'test');

      await offlineStorage.clearAllData();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('diet_daily_offline');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('diet_daily_offline_actions');
    });
  });
});