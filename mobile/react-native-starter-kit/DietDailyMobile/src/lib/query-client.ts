/**
 * React Query Client Configuration
 *
 * Performance-first data layer with intelligent caching and offline persistence.
 *
 * Key Features:
 * - 5-minute stale time (data considered fresh for 5 minutes)
 * - 30-minute cache time (cached data kept for 30 minutes)
 * - Automatic retry on failure (2 attempts)
 * - AsyncStorage persistence for offline support
 * - Optimistic UI updates
 *
 * Performance Targets:
 * - First load: < 2 seconds
 * - Cache hit: < 100ms
 * - Offline operations: < 100ms
 */

import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

/**
 * Main Query Client Configuration
 *
 * Optimized for mobile performance with conservative cache settings.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache Configuration
      staleTime: 5 * 60 * 1000,        // 5分鐘內數據視為新鮮
      gcTime: 30 * 60 * 1000,          // 快取保留30分鐘 (renamed from cacheTime in v5)

      // Retry Configuration
      retry: 2,                         // 失敗重試2次
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch Configuration
      refetchOnWindowFocus: false,     // 避免過度刷新
      refetchOnMount: 'always',        // 掛載時檢查更新
      refetchOnReconnect: true,        // 網路恢復時重新獲取

      // Network Mode
      networkMode: 'offlineFirst',     // 優先使用緩存，離線友好
    },
    mutations: {
      // Mutation Configuration
      retry: 1,                         // Mutations 只重試1次
      networkMode: 'offlineFirst',     // 離線時排隊，網路恢復後執行
    },
  },
});

/**
 * AsyncStorage Persister
 *
 * Persists React Query cache to AsyncStorage for offline support.
 *
 * Cache Structure:
 * - Key: 'DIET_DAILY_CACHE'
 * - Max Age: 24 hours (queries older than this are automatically removed)
 */
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'DIET_DAILY_CACHE',
  throttleTime: 1000,                  // 節流寫入，避免過度寫入
});

/**
 * Query Keys Factory
 *
 * Centralized query key management for consistency.
 *
 * Usage:
 * ```ts
 * const { data } = useQuery({
 *   queryKey: queryKeys.bowelMovements.list(userId, dateRange),
 *   queryFn: () => fetchBowelMovements(userId, dateRange)
 * });
 * ```
 */
export const queryKeys = {
  // Bowel Movement Queries
  bowelMovements: {
    all: ['bowel-movements'] as const,
    lists: () => [...queryKeys.bowelMovements.all, 'list'] as const,
    list: (userId: string, dateRange: { start: string; end: string }) =>
      [...queryKeys.bowelMovements.lists(), userId, dateRange] as const,
    stats: (userId: string, days: number) =>
      [...queryKeys.bowelMovements.all, 'stats', userId, days] as const,
    detail: (id: string) =>
      [...queryKeys.bowelMovements.all, 'detail', id] as const,
  },

  // Health Metrics Queries (HealthKit Data)
  healthMetrics: {
    all: ['health-metrics'] as const,
    lists: () => [...queryKeys.healthMetrics.all, 'list'] as const,
    list: (userId: string, metricType: string, dateRange: { start: string; end: string }) =>
      [...queryKeys.healthMetrics.lists(), userId, metricType, dateRange] as const,
    summary: (userId: string, days: number) =>
      [...queryKeys.healthMetrics.all, 'summary', userId, days] as const,
  },

  // Symptom Queries
  symptoms: {
    all: ['symptoms'] as const,
    lists: () => [...queryKeys.symptoms.all, 'list'] as const,
    list: (userId: string, dateRange: { start: string; end: string }) =>
      [...queryKeys.symptoms.lists(), userId, dateRange] as const,
    daily: (userId: string, date: string) =>
      [...queryKeys.symptoms.all, 'daily', userId, date] as const,
  },

  // Food Entry Queries
  foodEntries: {
    all: ['food-entries'] as const,
    lists: () => [...queryKeys.foodEntries.all, 'list'] as const,
    list: (userId: string, dateRange: { start: string; end: string }) =>
      [...queryKeys.foodEntries.lists(), userId, dateRange] as const,
  },

  // Analysis Queries
  analysis: {
    exercise: (userId: string, days: number) =>
      ['analysis', 'exercise-correlation', userId, days] as const,
    heartRate: (userId: string, days: number) =>
      ['analysis', 'heart-rate-stress', userId, days] as const,
    timeline: (userId: string, date: string) =>
      ['analysis', 'health-timeline', userId, date] as const,
  },
};

/**
 * Cache Invalidation Helpers
 *
 * Utility functions for invalidating related queries after mutations.
 */
export const cacheInvalidation = {
  /**
   * Invalidate all bowel movement related queries
   */
  invalidateBowelMovements: (userId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.bowelMovements.lists(),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.bowelMovements.stats(userId, 30),
    });
  },

  /**
   * Invalidate all health metrics related queries
   */
  invalidateHealthMetrics: (userId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.healthMetrics.lists(),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.healthMetrics.summary(userId, 30),
    });
  },

  /**
   * Invalidate all symptoms related queries
   */
  invalidateSymptoms: (userId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.symptoms.lists(),
    });
  },

  /**
   * Invalidate all analysis queries (triggers re-analysis)
   */
  invalidateAnalysis: (userId: string) => {
    queryClient.invalidateQueries({
      queryKey: ['analysis'],
    });
  },
};

/**
 * Prefetch Helpers
 *
 * Utility functions for prefetching data to improve perceived performance.
 */
export const prefetchHelpers = {
  /**
   * Prefetch bowel movement data for the last 30 days
   */
  prefetchBowelMovements: async (
    userId: string,
    fetchFn: () => Promise<any>
  ) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.bowelMovements.stats(userId, 30),
      queryFn: fetchFn,
      staleTime: 5 * 60 * 1000,
    });
  },

  /**
   * Prefetch health metrics summary
   */
  prefetchHealthMetrics: async (
    userId: string,
    fetchFn: () => Promise<any>
  ) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.healthMetrics.summary(userId, 30),
      queryFn: fetchFn,
      staleTime: 5 * 60 * 1000,
    });
  },
};
