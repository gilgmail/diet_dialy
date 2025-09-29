import { offlineStorageManager, PendingFoodEntry, FoodEntry } from '@/lib/offline-storage';

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

// Mock console.log to avoid test noise
global.console = {
  ...console,
  log: jest.fn(),
};

// Mock fetch for sync tests
global.fetch = jest.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('OfflineStorageManager', () => {
  beforeEach(() => {
    // Reset mock calls and clear localStorage before each test
    jest.clearAllMocks();
    localStorageMock.clear();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    (global.fetch as jest.Mock).mockClear();
  });

  describe('addPendingEntry', () => {
    it('creates pending entry with generated ID and timestamp', () => {
      const entry: Omit<FoodEntry, 'id' | 'timestamp'> = {
        date: '2024-01-15',
        time: '12:00',
        foodName: '白米飯',
        category: '主食',
        medicalScore: 4,
        userId: 'test-user'
      };

      const pendingEntry = offlineStorageManager.addPendingEntry(entry);

      expect(pendingEntry.tempId).toMatch(/^temp_\d+_[a-z0-9]+$/);
      expect(pendingEntry.createdAt).toBeTruthy();
      expect(pendingEntry.syncStatus).toBe('pending');
      expect(pendingEntry.foodName).toBe('白米飯');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'diet_daily_pending_entries',
        expect.stringContaining(pendingEntry.tempId)
      );
    });

    it('appends to existing pending entries', () => {
      // Add first entry
      const entry1: Omit<FoodEntry, 'id' | 'timestamp'> = {
        date: '2024-01-15',
        time: '12:00',
        foodName: '白米飯',
        category: '主食',
        userId: 'test-user'
      };

      // Add second entry
      const entry2: Omit<FoodEntry, 'id' | 'timestamp'> = {
        date: '2024-01-15',
        time: '14:00',
        foodName: '深海魚',
        category: '蛋白質',
        userId: 'test-user'
      };

      offlineStorageManager.addPendingEntry(entry1);
      offlineStorageManager.addPendingEntry(entry2);

      const pendingEntries = offlineStorageManager.getPendingEntries();
      expect(pendingEntries).toHaveLength(2);
      expect(pendingEntries[0].foodName).toBe('白米飯');
      expect(pendingEntries[1].foodName).toBe('深海魚');
    });
  });

  describe('getPendingEntries', () => {
    it('returns empty array when no entries stored', () => {
      const entries = offlineStorageManager.getPendingEntries();
      expect(entries).toEqual([]);
    });

    it('returns stored pending entries', () => {
      const mockEntries: PendingFoodEntry[] = [
        {
          tempId: 'temp_123',
          createdAt: new Date().toISOString(),
          syncStatus: 'pending',
          date: '2024-01-15',
          time: '12:00',
          foodName: '白米飯',
          category: '主食',
          userId: 'test-user'
        }
      ];

      localStorageMock.setItem('diet_daily_pending_entries', JSON.stringify(mockEntries));

      const entries = offlineStorageManager.getPendingEntries();
      expect(entries).toEqual(mockEntries);
    });

    it('handles corrupted localStorage gracefully', () => {
      // Mock console.error to avoid noise during expected error
      const originalConsoleError = console.error;
      console.error = jest.fn();

      localStorageMock.setItem('diet_daily_pending_entries', 'invalid-json');

      const entries = offlineStorageManager.getPendingEntries();
      expect(entries).toEqual([]);

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        '❌ 讀取暫存記錄失敗:',
        expect.any(SyntaxError)
      );

      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('removeSyncedEntries', () => {
    it('removes synced entries', () => {
      // Add entry first
      const entry: Omit<FoodEntry, 'id' | 'timestamp'> = {
        date: '2024-01-15',
        time: '12:00',
        foodName: '白米飯',
        category: '主食',
        userId: 'test-user'
      };

      const pendingEntry = offlineStorageManager.addPendingEntry(entry);

      // Mark as synced
      offlineStorageManager.updateSyncStatus(pendingEntry.tempId, 'synced');

      // Remove synced entries
      const removedCount = offlineStorageManager.removeSyncedEntries();

      expect(removedCount).toBe(1);
      const remainingEntries = offlineStorageManager.getPendingEntries();
      expect(remainingEntries).toHaveLength(0);
    });
  });

  describe('updateSyncStatus', () => {
    it('updates sync status of specific entry', () => {
      // Add entry first
      const entry: Omit<FoodEntry, 'id' | 'timestamp'> = {
        date: '2024-01-15',
        time: '12:00',
        foodName: '白米飯',
        category: '主食',
        userId: 'test-user'
      };

      const pendingEntry = offlineStorageManager.addPendingEntry(entry);

      // Update sync status
      offlineStorageManager.updateSyncStatus(pendingEntry.tempId, 'synced');

      const updatedEntries = offlineStorageManager.getPendingEntries();
      expect(updatedEntries[0].syncStatus).toBe('synced');
    });
  });

  describe('hasPendingSync', () => {
    it('returns true when unsynced entries exist', () => {
      const entry: Omit<FoodEntry, 'id' | 'timestamp'> = {
        date: '2024-01-15',
        time: '12:00',
        foodName: '白米飯',
        category: '主食',
        userId: 'test-user'
      };

      offlineStorageManager.addPendingEntry(entry);

      expect(offlineStorageManager.getPendingCount()).toBeGreaterThan(0);
    });

    it('returns false when all entries are synced', () => {
      expect(offlineStorageManager.getPendingCount()).toBe(0);
    });
  });

  describe('getPendingCount', () => {
    it('returns correct pending count', () => {
      expect(offlineStorageManager.getPendingCount()).toBe(0);

      // Add entry
      const entry: Omit<FoodEntry, 'id' | 'timestamp'> = {
        date: '2024-01-15',
        time: '12:00',
        foodName: '白米飯',
        category: '主食',
        userId: 'test-user'
      };

      offlineStorageManager.addPendingEntry(entry);
      expect(offlineStorageManager.getPendingCount()).toBe(1);
    });
  });

  describe('getErrorCount', () => {
    it('returns correct error count', () => {
      // Add entry and mark it as error
      const entry: Omit<FoodEntry, 'id' | 'timestamp'> = {
        date: '2024-01-15',
        time: '12:00',
        foodName: '白米飯',
        category: '主食',
        userId: 'test-user'
      };

      const pendingEntry = offlineStorageManager.addPendingEntry(entry);
      offlineStorageManager.updateSyncStatus(pendingEntry.tempId, 'error', 'Test error');

      expect(offlineStorageManager.getErrorCount()).toBe(1);
    });
  });

  describe('clearAllPendingEntries', () => {
    it('removes all pending entries', () => {
      // Add some data
      const entry: Omit<FoodEntry, 'id' | 'timestamp'> = {
        date: '2024-01-15',
        time: '12:00',
        foodName: '白米飯',
        category: '主食',
        userId: 'test-user'
      };

      offlineStorageManager.addPendingEntry(entry);

      // Clear all data
      offlineStorageManager.clearAllPendingEntries();

      const entries = offlineStorageManager.getPendingEntries();
      expect(entries).toHaveLength(0);

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('diet_daily_pending_entries');
    });
  });
});