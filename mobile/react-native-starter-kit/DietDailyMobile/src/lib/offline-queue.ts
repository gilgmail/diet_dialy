/**
 * Offline Queue System
 *
 * Handles offline operations with automatic retry and conflict resolution.
 *
 * Features:
 * - Local-first: All operations saved immediately to local storage
 * - Auto-retry: Failed operations retry when network is available
 * - Conflict resolution: Last-write-wins strategy with timestamp priority
 * - Performance: < 100ms response time for offline operations
 *
 * Usage:
 * ```ts
 * await offlineQueue.enqueue({
 *   type: 'bowel_movement',
 *   payload: { ... },
 * });
 * ```
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from '@/shared/api/supabase/client';

const QUEUE_STORAGE_KEY = 'DIET_DAILY_OFFLINE_QUEUE';
const MAX_RETRIES = 3;

/**
 * Queued Action Types
 */
export type QueuedActionType =
  | 'symptom'
  | 'bowel_movement'
  | 'food_entry'
  | 'healthkit_sync'
  | 'meal_log';

/**
 * Queued Action Interface
 */
export interface QueuedAction {
  id: string;
  type: QueuedActionType;
  payload: any;
  timestamp: number;
  retryCount: number;
  userId: string;
  operation: 'create' | 'update' | 'delete';
}

/**
 * Queue Status Interface
 */
export interface QueueStatus {
  pending: number;
  processing: boolean;
  lastSyncTime: number | null;
  lastError: string | null;
}

/**
 * Offline Queue Class
 *
 * Manages offline operations with automatic retry and persistence.
 */
class OfflineQueue {
  private queue: QueuedAction[] = [];
  private isProcessing = false;
  private listeners: Array<(status: QueueStatus) => void> = [];
  private lastSyncTime: number | null = null;
  private lastError: string | null = null;

  constructor() {
    this.initialize();
    this.setupNetworkListener();
  }

  /**
   * Initialize queue from storage
   */
  private async initialize() {
    try {
      const storedQueue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (storedQueue) {
        this.queue = JSON.parse(storedQueue);
        console.log(`[OfflineQueue] Loaded ${this.queue.length} items from storage`);
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue from storage:', error);
    }
  }

  /**
   * Setup network listener to auto-process queue when online
   */
  private setupNetworkListener() {
    NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected && this.queue.length > 0 && !this.isProcessing) {
        console.log('[OfflineQueue] Network available, processing queue');
        this.processQueue();
      }
    });
  }

  /**
   * Persist queue to storage
   */
  private async persistQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[OfflineQueue] Failed to persist queue:', error);
    }
  }

  /**
   * Check if device is online
   */
  private async isOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  /**
   * Notify listeners about queue status changes
   */
  private notifyListeners() {
    const status: QueueStatus = {
      pending: this.queue.length,
      processing: this.isProcessing,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };

    this.listeners.forEach((listener) => listener(status));
  }

  /**
   * Subscribe to queue status changes
   */
  subscribe(listener: (status: QueueStatus) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Enqueue an action
   *
   * @param action - Action to enqueue (without id, timestamp, retryCount)
   * @returns Promise that resolves immediately (< 100ms)
   */
  async enqueue(
    action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<void> {
    const queuedAction: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queuedAction);
    await this.persistQueue();

    console.log(`[OfflineQueue] Enqueued ${action.type} operation`);
    this.notifyListeners();

    // Auto-process if online
    if (await this.isOnline()) {
      // Don't await - process in background
      this.processQueue();
    }
  }

  /**
   * Process the queue
   *
   * Executes all pending actions sequentially.
   */
  async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      console.log('[OfflineQueue] Already processing, skipping');
      return;
    }

    if (this.queue.length === 0) {
      console.log('[OfflineQueue] Queue is empty');
      return;
    }

    this.isProcessing = true;
    this.lastError = null;
    this.notifyListeners();

    console.log(`[OfflineQueue] Processing ${this.queue.length} items...`);

    while (this.queue.length > 0 && (await this.isOnline())) {
      const action = this.queue[0];

      try {
        await this.executeAction(action);

        // Success - remove from queue
        this.queue.shift();
        await this.persistQueue();

        console.log(`[OfflineQueue] Successfully executed ${action.type} (ID: ${action.id})`);
      } catch (error) {
        console.error(`[OfflineQueue] Failed to execute ${action.type}:`, error);

        // Increment retry count
        action.retryCount++;

        // Remove if max retries exceeded
        if (action.retryCount >= MAX_RETRIES) {
          console.error(
            `[OfflineQueue] Max retries (${MAX_RETRIES}) exceeded for ${action.type}, removing from queue`
          );
          this.queue.shift();
          await this.persistQueue();
          this.lastError = `Failed to sync ${action.type} after ${MAX_RETRIES} attempts`;
        }

        // Stop processing on error
        break;
      }
    }

    this.isProcessing = false;
    this.lastSyncTime = Date.now();
    this.notifyListeners();

    console.log(`[OfflineQueue] Processing complete. ${this.queue.length} items remaining`);
  }

  /**
   * Execute a single action
   *
   * @param action - Action to execute
   */
  private async executeAction(action: QueuedAction): Promise<void> {
    const { type, payload, operation, userId } = action;

    switch (type) {
      case 'symptom':
        await this.executeSymptomAction(operation, payload, userId);
        break;

      case 'bowel_movement':
        await this.executeBowelMovementAction(operation, payload, userId);
        break;

      case 'food_entry':
        await this.executeFoodEntryAction(operation, payload, userId);
        break;

      case 'healthkit_sync':
        await this.executeHealthKitSync(payload, userId);
        break;

      case 'meal_log':
        await this.executeMealLogAction(operation, payload, userId);
        break;

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  /**
   * Execute symptom action
   */
  private async executeSymptomAction(
    operation: string,
    payload: any,
    userId: string
  ): Promise<void> {
    const table = 'daily_symptom_entries';

    switch (operation) {
      case 'create':
      case 'update':
        // Upsert with conflict resolution
        const { error: upsertError } = await supabase
          .from(table)
          .upsert(
            {
              ...payload,
              user_id: userId,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'user_id,recorded_date',
            }
          );

        if (upsertError) throw upsertError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', payload.id)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
        break;
    }
  }

  /**
   * Execute bowel movement action
   */
  private async executeBowelMovementAction(
    operation: string,
    payload: any,
    userId: string
  ): Promise<void> {
    const table = 'bowel_movement_entries';

    switch (operation) {
      case 'create':
        const { error: insertError } = await supabase
          .from(table)
          .insert({
            ...payload,
            user_id: userId,
          });

        if (insertError) throw insertError;
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from(table)
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.id)
          .eq('user_id', userId);

        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', payload.id)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
        break;
    }
  }

  /**
   * Execute food entry action
   */
  private async executeFoodEntryAction(
    operation: string,
    payload: any,
    userId: string
  ): Promise<void> {
    const table = 'food_entries';

    switch (operation) {
      case 'create':
        const { error: insertError } = await supabase
          .from(table)
          .insert({
            ...payload,
            user_id: userId,
          });

        if (insertError) throw insertError;
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from(table)
          .update(payload)
          .eq('id', payload.id)
          .eq('user_id', userId);

        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', payload.id)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
        break;
    }
  }

  /**
   * Execute HealthKit sync
   */
  private async executeHealthKitSync(payload: any, userId: string): Promise<void> {
    const table = 'health_metrics';

    // Batch upsert HealthKit metrics
    const metrics = payload.metrics || [];

    if (metrics.length === 0) {
      return;
    }

    const { error } = await supabase
      .from(table)
      .upsert(
        metrics.map((metric: any) => ({
          ...metric,
          user_id: userId,
          synced_at: new Date().toISOString(),
        })),
        {
          onConflict: 'user_id,source,source_identifier,start_time',
        }
      );

    if (error) throw error;
  }

  /**
   * Execute meal log action
   */
  private async executeMealLogAction(
    operation: string,
    payload: any,
    userId: string
  ): Promise<void> {
    const table = 'meal_logs';

    switch (operation) {
      case 'create':
        const { error: insertError } = await supabase
          .from(table)
          .insert({
            ...payload,
            user_id: userId,
          });

        if (insertError) throw insertError;
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from(table)
          .update(payload)
          .eq('id', payload.id)
          .eq('user_id', userId);

        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', payload.id)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;
        break;
    }
  }

  /**
   * Get current queue status
   */
  getStatus(): QueueStatus {
    return {
      pending: this.queue.length,
      processing: this.isProcessing,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
  }

  /**
   * Clear all items from queue
   *
   * WARNING: This will lose all pending offline changes!
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.persistQueue();
    this.notifyListeners();
    console.log('[OfflineQueue] Queue cleared');
  }

  /**
   * Force process queue (useful for manual sync buttons)
   */
  async forceSync(): Promise<void> {
    if (!(await this.isOnline())) {
      throw new Error('Cannot sync while offline');
    }

    await this.processQueue();
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();

// Export for testing
export default OfflineQueue;
