/**
 * 內存緩存服務
 * 為 Diet Daily 提供高性能本地緩存
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  size: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
    size: 0,
  };
  private maxSize: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;

    // 定期清理過期項目
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分鐘清理一次
  }

  /**
   * 獲取緩存項目
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 檢查是否過期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * 設置緩存項目
   */
  set<T>(key: string, data: T, ttlSeconds = 300): void {
    // 如果達到最大大小，移除最舊的項目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    };

    this.cache.set(key, entry);
    this.stats.sets++;
    this.stats.size = this.cache.size;
  }

  /**
   * 刪除緩存項目
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * 清空所有緩存
   */
  clear(): void {
    this.cache.clear();
    this.stats.evictions += this.stats.size;
    this.stats.size = 0;
  }

  /**
   * 獲取緩存統計
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 10000) / 100, // 百分比，保留兩位小數
    };
  }

  /**
   * 檢查緩存是否存在且未過期
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * 批量獲取
   */
  mget<T>(keys: string[]): Array<{ key: string; data: T | null }> {
    return keys.map(key => ({
      key,
      data: this.get<T>(key),
    }));
  }

  /**
   * 批量設置
   */
  mset<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(key, data, ttl);
    });
  }

  /**
   * 清理過期項目
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.evictions += cleaned;
      this.stats.size = this.cache.size;
    }
  }

  /**
   * 獲取或設置模式 (常用模式)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * 銷毀緩存實例
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// 緩存鍵生成器
export class CacheKeyBuilder {
  static userProfile(userId: string): string {
    return `profile:${userId}`;
  }

  static foodSearch(query: string, filters?: Record<string, any>): string {
    const filterStr = filters ? `:${JSON.stringify(filters)}` : '';
    return `search:${query}${filterStr}`;
  }

  static medicalScore(foodId: string, conditions: string[]): string {
    const conditionsStr = conditions.sort().join(',');
    return `score:${foodId}:${conditionsStr}`;
  }

  static foodDetails(foodId: string): string {
    return `food:${foodId}`;
  }

  static userHistory(userId: string, page = 1, limit = 20): string {
    return `history:${userId}:${page}:${limit}`;
  }

  static apiResponse(endpoint: string, params?: Record<string, any>): string {
    const paramStr = params ? `:${JSON.stringify(params)}` : '';
    return `api:${endpoint}${paramStr}`;
  }
}

// 預配置的緩存 TTL 常數
export const CACHE_TTL = {
  USER_PROFILE: 3600,        // 1 小時
  FOOD_SEARCH: 300,          // 5 分鐘
  MEDICAL_SCORING: 1800,     // 30 分鐘
  FOOD_DETAILS: 7200,        // 2 小時
  USER_HISTORY: 600,         // 10 分鐘
  API_RESPONSE: 300,         // 5 分鐘
  STATIC_DATA: 86400,        // 24 小時
} as const;

// 全局緩存實例
export const memoryCache = new MemoryCache(1000);