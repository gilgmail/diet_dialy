// Offline sync service for medical data
import type { OfflineQueueItem, SyncStatus } from '@/types/google';
import type { Symptom, Medication } from '@/types/medical';
import { mockGoogleSheetsService as googleSheetsService } from './mock-services';
import { mockGoogleDriveService as googleDriveService } from './mock-services';
import { googleAuthClientService as googleAuthService } from './auth-client';
import { encryptMedicalData } from './encryption';

class GoogleSyncService {
  private syncStatus: SyncStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastSync: null,
    pendingChanges: 0,
    syncInProgress: false,
    error: undefined
  };
  
  private offlineQueue: OfflineQueueItem[] = [];
  private readonly QUEUE_STORAGE_KEY = 'diet_daily_offline_queue';
  private readonly SYNC_STATUS_KEY = 'diet_daily_sync_status';
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeSync();
  }

  /**
   * Initialize sync service and set up event listeners
   */
  private initializeSync(): void {
    if (typeof window === 'undefined') return;

    // Load persisted data
    this.loadOfflineQueue();
    this.loadSyncStatus();

    // Set up network event listeners
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Start periodic sync when online
    if (this.syncStatus.isOnline) {
      this.startPeriodicSync();
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Add item to offline queue
   * @param item - Offline queue item
   */
  private addToQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): void {
    const queueItem: OfflineQueueItem = {
      ...item,
      id: this.generateQueueId(),
      timestamp: new Date(),
      retryCount: 0
    };

    this.offlineQueue.push(queueItem);
    this.syncStatus.pendingChanges = this.offlineQueue.length;
    
    this.persistOfflineQueue();
    this.persistSyncStatus();
  }

  /**
   * Queue symptom entry for sync
   */
  async queueSymptomEntry(
    spreadsheetId: string,
    condition: string,
    symptom: Symptom
  ): Promise<void> {
    try {
      // Encrypt sensitive data
      const encryptedData = await encryptMedicalData({
        spreadsheetId,
        condition,
        symptom
      });

      this.addToQueue({
        action: 'create',
        resource: 'symptom',
        data: {
          encrypted: encryptedData,
          spreadsheetId,
          condition,
          symptomId: symptom.id
        }
      });

      // If online, trigger immediate sync
      if (this.syncStatus.isOnline && !this.syncStatus.syncInProgress) {
        await this.syncPendingChanges();
      }
    } catch (error) {
      console.error('Failed to queue symptom entry:', error);
      throw error;
    }
  }

  /**
   * Queue medication entry for sync
   */
  async queueMedicationEntry(
    spreadsheetId: string,
    medication: Medication,
    action: 'taken' | 'missed' | 'side_effect'
  ): Promise<void> {
    try {
      const encryptedData = await encryptMedicalData({
        spreadsheetId,
        medication,
        action
      });

      this.addToQueue({
        action: 'create',
        resource: 'medication',
        data: {
          encrypted: encryptedData,
          spreadsheetId,
          medicationId: medication.id,
          medicationAction: action
        }
      });

      if (this.syncStatus.isOnline && !this.syncStatus.syncInProgress) {
        await this.syncPendingChanges();
      }
    } catch (error) {
      console.error('Failed to queue medication entry:', error);
      throw error;
    }
  }

  /**
   * Queue food entry for sync
   */
  async queueFoodEntry(spreadsheetId: string, foodEntry: any): Promise<void> {
    try {
      const encryptedData = await encryptMedicalData({
        spreadsheetId,
        foodEntry
      });

      this.addToQueue({
        action: 'create',
        resource: 'food_entry',
        data: {
          encrypted: encryptedData,
          spreadsheetId,
          foodEntryId: foodEntry.id
        }
      });

      if (this.syncStatus.isOnline && !this.syncStatus.syncInProgress) {
        await this.syncPendingChanges();
      }
    } catch (error) {
      console.error('Failed to queue food entry:', error);
      throw error;
    }
  }

  /**
   * Queue photo upload for sync
   */
  async queuePhotoUpload(
    file: File,
    metadata: any,
    category: string
  ): Promise<void> {
    try {
      // Convert file to base64 for storage
      const base64Data = await this.fileToBase64(file);
      
      const encryptedData = await encryptMedicalData({
        fileData: base64Data,
        metadata,
        category,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      this.addToQueue({
        action: 'create',
        resource: 'photo',
        data: {
          encrypted: encryptedData,
          fileName: file.name,
          category
        }
      });

      if (this.syncStatus.isOnline && !this.syncStatus.syncInProgress) {
        await this.syncPendingChanges();
      }
    } catch (error) {
      console.error('Failed to queue photo upload:', error);
      throw error;
    }
  }

  /**
   * Sync all pending changes
   */
  async syncPendingChanges(): Promise<void> {
    if (this.syncStatus.syncInProgress || !this.syncStatus.isOnline) {
      return;
    }

    if (this.offlineQueue.length === 0) {
      this.syncStatus.lastSync = new Date();
      this.persistSyncStatus();
      return;
    }

    this.syncStatus.syncInProgress = true;
    this.syncStatus.error = undefined;
    this.persistSyncStatus();

    try {
      // Ensure user is authenticated
      if (!googleAuthService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const successfullyProcessed: string[] = [];
      const failedItems: OfflineQueueItem[] = [];

      // Process queue items
      for (const item of this.offlineQueue) {
        try {
          await this.processQueueItem(item);
          successfullyProcessed.push(item.id);
        } catch (error) {
          console.error(`Failed to process queue item ${item.id}:`, error);
          
          // Increment retry count
          item.retryCount++;
          
          // If max retries reached, remove from queue
          if (item.retryCount >= 3) {
            console.error(`Removing queue item ${item.id} after max retries`);
            successfullyProcessed.push(item.id);
          } else {
            failedItems.push(item);
          }
        }
      }

      // Remove successfully processed items
      this.offlineQueue = this.offlineQueue.filter(
        item => !successfullyProcessed.includes(item.id)
      );

      // Update sync status
      this.syncStatus.pendingChanges = this.offlineQueue.length;
      this.syncStatus.lastSync = new Date();
      
      if (failedItems.length > 0) {
        this.syncStatus.error = `${failedItems.length} items failed to sync`;
      }

      this.persistOfflineQueue();
      this.persistSyncStatus();

    } catch (error) {
      console.error('Sync failed:', error);
      this.syncStatus.error = error instanceof Error ? error.message : 'Sync failed';
      this.persistSyncStatus();
    } finally {
      this.syncStatus.syncInProgress = false;
      this.persistSyncStatus();
    }
  }

  /**
   * Process individual queue item
   */
  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    switch (item.resource) {
      case 'symptom':
        await this.processSymptonEntry(item);
        break;
      case 'medication':
        await this.processMedicationEntry(item);
        break;
      case 'food_entry':
        await this.processFoodEntry(item);
        break;
      case 'photo':
        await this.processPhotoUpload(item);
        break;
      default:
        throw new Error(`Unknown resource type: ${item.resource}`);
    }
  }

  /**
   * Process symptom entry from queue
   */
  private async processSymptonEntry(item: OfflineQueueItem): Promise<void> {
    const { encrypted, spreadsheetId, condition, symptomId } = item.data;
    
    // Note: In a real implementation, you would decrypt the data here
    // and extract the symptom information to pass to the sheets service
    
    // For now, we'll create a placeholder implementation
    console.log(`Processing symptom entry for ${condition} in spreadsheet ${spreadsheetId}`);
    
    // In production, you would:
    // const decryptedData = await decryptMedicalData(encrypted);
    // await googleSheetsService.addSymptomEntry(spreadsheetId, condition, decryptedData.symptom);
  }

  /**
   * Process medication entry from queue
   */
  private async processMedicationEntry(item: OfflineQueueItem): Promise<void> {
    const { encrypted, spreadsheetId, medicationId, medicationAction } = item.data;
    
    console.log(`Processing medication entry ${medicationAction} for ${medicationId}`);
    
    // In production:
    // const decryptedData = await decryptMedicalData(encrypted);
    // await googleSheetsService.addMedicationEntry(spreadsheetId, decryptedData.medication, medicationAction);
  }

  /**
   * Process food entry from queue
   */
  private async processFoodEntry(item: OfflineQueueItem): Promise<void> {
    const { encrypted, spreadsheetId, foodEntryId } = item.data;
    
    console.log(`Processing food entry ${foodEntryId}`);
    
    // In production:
    // const decryptedData = await decryptMedicalData(encrypted);
    // await googleSheetsService.addFoodEntry(spreadsheetId, decryptedData.foodEntry);
  }

  /**
   * Process photo upload from queue
   */
  private async processPhotoUpload(item: OfflineQueueItem): Promise<void> {
    const { encrypted, fileName, category } = item.data;
    
    console.log(`Processing photo upload ${fileName} in category ${category}`);
    
    // In production:
    // const decryptedData = await decryptMedicalData(encrypted);
    // const file = await this.base64ToFile(decryptedData.fileData, fileName, decryptedData.fileType);
    // await googleDriveService.uploadMedicalPhoto(file, decryptedData.metadata, category);
  }

  /**
   * Force sync now
   */
  async forcSync(): Promise<void> {
    if (this.syncStatus.isOnline) {
      await this.syncPendingChanges();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }

  /**
   * Clear all pending changes (use with caution)
   */
  clearPendingChanges(): void {
    this.offlineQueue = [];
    this.syncStatus.pendingChanges = 0;
    this.syncStatus.error = undefined;
    
    this.persistOfflineQueue();
    this.persistSyncStatus();
  }

  /**
   * Get pending changes count
   */
  getPendingChangesCount(): number {
    return this.offlineQueue.length;
  }

  /**
   * Get offline queue items (for debugging)
   */
  getOfflineQueue(): OfflineQueueItem[] {
    return [...this.offlineQueue];
  }

  // Private helper methods

  private handleOnline(): void {
    this.syncStatus.isOnline = true;
    this.syncStatus.error = undefined;
    this.persistSyncStatus();
    
    this.startPeriodicSync();
    
    // Trigger immediate sync if there are pending changes
    if (this.offlineQueue.length > 0) {
      this.syncPendingChanges();
    }
  }

  private handleOffline(): void {
    this.syncStatus.isOnline = false;
    this.persistSyncStatus();
    
    this.stopPeriodicSync();
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      if (this.syncStatus.isOnline && !this.syncStatus.syncInProgress) {
        this.syncPendingChanges();
      }
    }, 5 * 60 * 1000);
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private generateQueueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  private async base64ToFile(base64: string, fileName: string, mimeType: string): Promise<File> {
    const response = await fetch(base64);
    const blob = await response.blob();
    return new File([blob], fileName, { type: mimeType });
  }

  private persistOfflineQueue(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }

  private loadOfflineQueue(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
        this.syncStatus.pendingChanges = this.offlineQueue.length;
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }

  private persistSyncStatus(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(this.syncStatus));
    } catch (error) {
      console.error('Failed to persist sync status:', error);
    }
  }

  private loadSyncStatus(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.SYNC_STATUS_KEY);
      if (stored) {
        const loadedStatus = JSON.parse(stored);
        this.syncStatus = {
          ...this.syncStatus,
          ...loadedStatus,
          lastSync: loadedStatus.lastSync ? new Date(loadedStatus.lastSync) : null,
          syncInProgress: false // Always reset sync in progress on load
        };
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  }

  /**
   * Clean up resources when service is destroyed
   */
  destroy(): void {
    this.stopPeriodicSync();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
  }
}

// Export singleton instance
export const googleSyncService = new GoogleSyncService();
export { GoogleSyncService };