/**
 * API 緩存中間件
 * 為 API 端點提供智能緩存策略
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryCache, CacheKeyBuilder, CACHE_TTL } from './memory-cache';
import { performanceMonitor, PerformanceTimer } from '@/lib/performance/monitor';
import { logger } from '@/lib/logger';

interface CacheOptions {
  ttl?: number;
  keyBuilder?: (req: NextRequest) => string;
  shouldCache?: (req: NextRequest, res: any) => boolean;
  varyBy?: string[]; // 根據請求頭決定緩存鍵
}

interface CacheMetadata {
  timestamp: number;
  ttl: number;
  key: string;
  endpoint: string;
  method: string;
}

/**
 * API 緩存中間件
 */
export function withCache(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CacheOptions = {}
) {
  return async function cachedHandler(req: NextRequest): Promise<NextResponse> {
    const timer = new PerformanceTimer(`API.${req.nextUrl.pathname}`);
    const method = req.method;
    const endpoint = req.nextUrl.pathname;

    // 只緩存 GET 請求（除非特別指定）
    if (method !== 'GET' && !options.shouldCache) {
      const response = await handler(req);
      timer.end({ cacheHit: false, method, endpoint });
      return response;
    }

    // 生成緩存鍵
    const cacheKey = options.keyBuilder
      ? options.keyBuilder(req)
      : generateCacheKey(req, options.varyBy);

    // 嘗試從緩存獲取
    const cached = memoryCache.get<{
      data: any;
      metadata: CacheMetadata;
    }>(cacheKey);

    if (cached) {
      logger.info('API cache hit', {
        component: 'ApiCache',
        endpoint,
        method,
        cacheKey,
      });

      // 記錄緩存命中的性能指標
      performanceMonitor.recordApiCall(
        endpoint,
        method,
        200,
        timer.end({ cacheHit: true, method, endpoint }),
        true
      );

      // 返回緩存的響應
      return new NextResponse(JSON.stringify(cached.data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Cache-Timestamp': cached.metadata.timestamp.toString(),
        },
      });
    }

    // 緩存未命中，執行原始處理器
    const response = await handler(req);
    const duration = timer.end({ cacheHit: false, method, endpoint });

    // 記錄 API 調用性能
    performanceMonitor.recordApiCall(
      endpoint,
      method,
      response.status,
      duration,
      false
    );

    // 檢查是否應該緩存響應
    if (shouldCacheResponse(req, response, options)) {
      try {
        const responseData = await response.json();
        const ttl = options.ttl || CACHE_TTL.API_RESPONSE;

        const cacheData = {
          data: responseData,
          metadata: {
            timestamp: Date.now(),
            ttl,
            key: cacheKey,
            endpoint,
            method,
          } as CacheMetadata,
        };

        memoryCache.set(cacheKey, cacheData, ttl);

        logger.info('API response cached', {
          component: 'ApiCache',
          endpoint,
          method,
          cacheKey,
          ttl,
        });

        // 返回帶緩存頭的響應
        return new NextResponse(JSON.stringify(responseData), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
            'X-Cache-TTL': ttl.toString(),
          },
        });
      } catch (error) {
        logger.error('Failed to cache API response', {
          component: 'ApiCache',
          endpoint,
          method,
          error: error.message,
        });
      }
    }

    return response;
  };
}

/**
 * 生成緩存鍵
 */
function generateCacheKey(req: NextRequest, varyBy?: string[]): string {
  const url = req.nextUrl;
  const baseKey = `api:${url.pathname}`;

  // 包含查詢參數
  const searchParams = Array.from(url.searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  // 包含指定的請求頭
  const varyHeaders = varyBy
    ? varyBy
        .map(header => {
          const value = req.headers.get(header);
          return value ? `${header}:${value}` : null;
        })
        .filter(Boolean)
        .join('|')
    : '';

  const parts = [baseKey, searchParams, varyHeaders].filter(Boolean);
  return parts.join('?');
}

/**
 * 判斷是否應該緩存響應
 */
function shouldCacheResponse(
  req: NextRequest,
  res: NextResponse,
  options: CacheOptions
): boolean {
  // 如果有自定義判斷邏輯
  if (options.shouldCache) {
    return options.shouldCache(req, res);
  }

  // 只緩存成功的響應
  if (res.status < 200 || res.status >= 300) {
    return false;
  }

  // 不緩存包含用戶特定數據的端點
  const userSpecificPatterns = [
    '/api/medical/profile',
    '/api/history',
    '/api/user',
  ];

  const pathname = req.nextUrl.pathname;
  if (userSpecificPatterns.some(pattern => pathname.includes(pattern))) {
    return false;
  }

  return true;
}

/**
 * 清除特定模式的緩存
 */
export function clearCachePattern(pattern: string): number {
  const stats = memoryCache.getStats();
  let cleared = 0;

  // 這裡需要實現模式匹配清除
  // 由於當前的 MemoryCache 不支持模式清除，我們需要擴展它
  // 暫時使用全清除作為替代方案
  if (pattern === '*') {
    memoryCache.clear();
    cleared = stats.size;
  }

  logger.info('Cache cleared', {
    component: 'ApiCache',
    pattern,
    clearedCount: cleared,
  });

  return cleared;
}

/**
 * 醫療數據特定的緩存配置
 */
export const MEDICAL_CACHE_CONFIG: Record<string, CacheOptions> = {
  '/api/foods': {
    ttl: CACHE_TTL.FOOD_SEARCH,
    varyBy: ['accept-language'],
  },
  '/api/foods/search': {
    ttl: CACHE_TTL.FOOD_SEARCH,
    keyBuilder: (req) => {
      const { searchParams } = req.nextUrl;
      return CacheKeyBuilder.foodSearch(
        searchParams.get('q') || '',
        Object.fromEntries(searchParams.entries())
      );
    },
  },
  '/api/ai/nutrition-score': {
    ttl: CACHE_TTL.MEDICAL_SCORING,
    keyBuilder: (req) => {
      // 需要解析請求體來生成鍵，這裡簡化處理
      return CacheKeyBuilder.apiResponse(req.nextUrl.pathname, {
        timestamp: Math.floor(Date.now() / 60000), // 每分鐘一個緩存週期
      });
    },
  },
  '/api/medical/symptoms': {
    ttl: CACHE_TTL.USER_PROFILE,
    shouldCache: (req, res) => {
      // 只緩存匿名統計數據，不緩存個人數據
      return !req.headers.get('authorization');
    },
  },
};

/**
 * 預熱緩存
 */
export async function warmupCache(endpoints: string[]): Promise<void> {
  logger.info('Starting cache warmup', {
    component: 'ApiCache',
    endpoints,
  });

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}${endpoint}`);
      if (response.ok) {
        logger.info('Cache warmed up', {
          component: 'ApiCache',
          endpoint,
          status: response.status,
        });
      }
    } catch (error) {
      logger.error('Cache warmup failed', {
        component: 'ApiCache',
        endpoint,
        error: error.message,
      });
    }
  }
}

/**
 * 緩存統計報告
 */
export function getCacheReport(): {
  stats: any;
  topEndpoints: Array<{ endpoint: string; hitRate: number; calls: number }>;
  recommendations: string[];
} {
  const stats = memoryCache.getStats();
  const performanceData = performanceMonitor.getPerformanceSummary();

  // 模擬端點統計（實際實現需要更詳細的追踪）
  const topEndpoints = [
    { endpoint: '/api/foods', hitRate: 0.85, calls: 150 },
    { endpoint: '/api/foods/search', hitRate: 0.72, calls: 89 },
    { endpoint: '/api/ai/nutrition-score', hitRate: 0.45, calls: 67 },
  ];

  const recommendations: string[] = [];

  if (stats.hitRate < 50) {
    recommendations.push('緩存命中率偏低，考慮增加 TTL 或檢查緩存策略');
  }

  if (performanceData.api.avgDuration > 1000) {
    recommendations.push('API 響應時間較慢，建議優化查詢或增加緩存');
  }

  if (stats.evictions > stats.hits * 0.1) {
    recommendations.push('緩存淘汰率較高，考慮增加緩存大小');
  }

  return {
    stats,
    topEndpoints,
    recommendations,
  };
}