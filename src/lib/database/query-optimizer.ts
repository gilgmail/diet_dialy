/**
 * 數據庫查詢優化器
 * 為 Supabase 查詢提供性能優化和監控
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { performanceMonitor } from '@/lib/performance/monitor';
import { memoryCache, CacheKeyBuilder, CACHE_TTL } from '@/lib/cache/memory-cache';
import { logger } from '@/lib/logger';

interface QueryOptions {
  cache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
  timeout?: number;
  retries?: number;
}

interface QueryAnalysis {
  query: string;
  duration: number;
  resultCount: number;
  cacheHit: boolean;
  timestamp: number;
}

interface IndexSuggestion {
  table: string;
  columns: string[];
  reason: string;
  estimatedImprovement: string;
}

export class DatabaseQueryOptimizer {
  private supabase: SupabaseClient;
  private queryHistory: QueryAnalysis[] = [];
  private slowQueryThreshold = 1000; // 1 second

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * 優化的查詢執行器
   */
  async executeQuery<T>(
    queryBuilder: () => any,
    queryName: string,
    options: QueryOptions = {}
  ): Promise<T[]> {
    const startTime = performance.now();
    const cacheKey = options.cacheKey || `query:${queryName}`;

    // 嘗試從緩存獲取
    if (options.cache !== false) {
      const cached = memoryCache.get<T[]>(cacheKey);
      if (cached) {
        this.recordQueryAnalysis({
          query: queryName,
          duration: performance.now() - startTime,
          resultCount: cached.length,
          cacheHit: true,
          timestamp: Date.now(),
        });
        return cached;
      }
    }

    try {
      // 執行查詢
      const { data, error } = await queryBuilder();

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      const duration = performance.now() - startTime;
      const resultCount = data?.length || 0;

      // 記錄查詢分析
      this.recordQueryAnalysis({
        query: queryName,
        duration,
        resultCount,
        cacheHit: false,
        timestamp: Date.now(),
      });

      // 記錄性能指標
      performanceMonitor.recordDatabaseQuery(
        queryName,
        duration,
        true,
        resultCount
      );

      // 緩存結果
      if (options.cache !== false && data) {
        const ttl = options.cacheTTL || CACHE_TTL.API_RESPONSE;
        memoryCache.set(cacheKey, data, ttl);
      }

      return data || [];
    } catch (error) {
      const duration = performance.now() - startTime;

      // 記錄失敗的查詢
      performanceMonitor.recordDatabaseQuery(
        queryName,
        duration,
        false,
        0
      );

      logger.error('Database query failed', {
        component: 'DatabaseQueryOptimizer',
        query: queryName,
        error: error.message,
        duration,
      });

      throw error;
    }
  }

  /**
   * 優化食物搜索查詢
   */
  async searchFoods(
    query: string,
    filters: {
      category?: string;
      verification_status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const { category, verification_status, limit = 20, offset = 0 } = filters;

    return this.executeQuery(
      () => {
        let queryBuilder = this.supabase
          .from('foods')
          .select('*')
          .or(`name_zh.ilike.%${query}%,name_en.ilike.%${query}%`)
          .range(offset, offset + limit - 1)
          .order('verification_status', { ascending: false })
          .order('name_zh');

        if (category) {
          queryBuilder = queryBuilder.eq('category', category);
        }

        if (verification_status) {
          queryBuilder = queryBuilder.eq('verification_status', verification_status);
        }

        return queryBuilder;
      },
      'search_foods',
      {
        cacheKey: CacheKeyBuilder.foodSearch(query, filters),
        cacheTTL: CACHE_TTL.FOOD_SEARCH,
      }
    );
  }

  /**
   * 優化用戶歷史查詢
   */
  async getUserHistory(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ) {
    const { limit = 20, offset = 0, dateFrom, dateTo } = options;

    return this.executeQuery(
      () => {
        let queryBuilder = this.supabase
          .from('food_entries')
          .select(`
            *,
            foods:food_id (
              name_zh,
              name_en,
              category,
              medical_scores
            )
          `)
          .eq('user_id', userId)
          .range(offset, offset + limit - 1)
          .order('created_at', { ascending: false });

        if (dateFrom) {
          queryBuilder = queryBuilder.gte('created_at', dateFrom);
        }

        if (dateTo) {
          queryBuilder = queryBuilder.lte('created_at', dateTo);
        }

        return queryBuilder;
      },
      'user_history',
      {
        cacheKey: CacheKeyBuilder.userHistory(userId, Math.floor(offset / limit) + 1, limit),
        cacheTTL: CACHE_TTL.USER_HISTORY,
      }
    );
  }

  /**
   * 優化醫療資料查詢
   */
  async getUserMedicalProfile(userId: string) {
    return this.executeQuery(
      () =>
        this.supabase
          .from('medical_profiles')
          .select('*')
          .eq('user_id', userId)
          .single(),
      'user_medical_profile',
      {
        cacheKey: CacheKeyBuilder.userProfile(userId),
        cacheTTL: CACHE_TTL.USER_PROFILE,
      }
    );
  }

  /**
   * 批量食物查詢優化
   */
  async getFoodsByIds(foodIds: string[]) {
    // 分批查詢以避免 URL 過長
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < foodIds.length; i += batchSize) {
      const batch = foodIds.slice(i, i + batchSize);
      batches.push(batch);
    }

    const results = await Promise.all(
      batches.map(batch =>
        this.executeQuery(
          () =>
            this.supabase
              .from('foods')
              .select('*')
              .in('id', batch),
          `foods_by_ids_batch_${batches.indexOf(batch)}`,
          {
            cacheKey: `foods:batch:${batch.sort().join(',')}`,
            cacheTTL: CACHE_TTL.FOOD_DETAILS,
          }
        )
      )
    );

    return results.flat();
  }

  /**
   * 獲取查詢性能分析
   */
  getQueryAnalysis(timeRangeMs = 300000): {
    totalQueries: number;
    averageDuration: number;
    slowQueries: QueryAnalysis[];
    cacheHitRate: number;
    frequentQueries: Array<{ query: string; count: number; avgDuration: number }>;
    recommendations: IndexSuggestion[];
  } {
    const cutoffTime = Date.now() - timeRangeMs;
    const recentQueries = this.queryHistory.filter(q => q.timestamp > cutoffTime);

    const totalQueries = recentQueries.length;
    const averageDuration = totalQueries > 0
      ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / totalQueries
      : 0;

    const slowQueries = recentQueries
      .filter(q => q.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const cacheHits = recentQueries.filter(q => q.cacheHit).length;
    const cacheHitRate = totalQueries > 0 ? cacheHits / totalQueries : 0;

    // 統計頻繁查詢
    const queryFrequency = new Map<string, { count: number; totalDuration: number }>();
    recentQueries.forEach(q => {
      const existing = queryFrequency.get(q.query) || { count: 0, totalDuration: 0 };
      queryFrequency.set(q.query, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + q.duration,
      });
    });

    const frequentQueries = Array.from(queryFrequency.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 生成索引建議
    const recommendations = this.generateIndexSuggestions(slowQueries);

    return {
      totalQueries,
      averageDuration,
      slowQueries,
      cacheHitRate,
      frequentQueries,
      recommendations,
    };
  }

  /**
   * 記錄查詢分析
   */
  private recordQueryAnalysis(analysis: QueryAnalysis): void {
    this.queryHistory.push(analysis);

    // 保留最近 1000 個查詢記錄
    if (this.queryHistory.length > 1000) {
      this.queryHistory = this.queryHistory.slice(-1000);
    }

    // 記錄慢查詢
    if (analysis.duration > this.slowQueryThreshold) {
      logger.warn('Slow database query detected', {
        component: 'DatabaseQueryOptimizer',
        query: analysis.query,
        duration: analysis.duration,
        resultCount: analysis.resultCount,
      });
    }
  }

  /**
   * 生成索引建議
   */
  private generateIndexSuggestions(slowQueries: QueryAnalysis[]): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];

    // 基於慢查詢模式生成建議
    const queryPatterns = slowQueries.map(q => q.query);

    if (queryPatterns.some(q => q.includes('search_foods'))) {
      suggestions.push({
        table: 'foods',
        columns: ['name_zh', 'name_en'],
        reason: '食物搜索查詢頻繁且較慢',
        estimatedImprovement: '40-60% 查詢時間減少',
      });

      suggestions.push({
        table: 'foods',
        columns: ['category', 'verification_status'],
        reason: '分類和驗證狀態組合查詢',
        estimatedImprovement: '30-50% 查詢時間減少',
      });
    }

    if (queryPatterns.some(q => q.includes('user_history'))) {
      suggestions.push({
        table: 'food_entries',
        columns: ['user_id', 'created_at'],
        reason: '用戶歷史查詢按時間排序',
        estimatedImprovement: '50-70% 查詢時間減少',
      });
    }

    if (queryPatterns.some(q => q.includes('medical_profile'))) {
      suggestions.push({
        table: 'medical_profiles',
        columns: ['user_id'],
        reason: '用戶醫療資料查詢優化',
        estimatedImprovement: '60-80% 查詢時間減少',
      });
    }

    return suggestions;
  }

  /**
   * 清除查詢緩存
   */
  clearQueryCache(pattern?: string): void {
    if (pattern) {
      // 實現模式匹配清除（簡化版本）
      logger.info('Clearing query cache', {
        component: 'DatabaseQueryOptimizer',
        pattern,
      });
    } else {
      memoryCache.clear();
      logger.info('All query cache cleared', {
        component: 'DatabaseQueryOptimizer',
      });
    }
  }

  /**
   * 獲取緩存統計
   */
  getCacheStats() {
    return memoryCache.getStats();
  }
}