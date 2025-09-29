/**
 * 性能監控服務
 * 追踪和分析 Diet Daily 應用性能指標
 */

import { logger } from '@/lib/logger';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface WebVitalsData {
  fcp?: number;  // First Contentful Paint
  lcp?: number;  // Largest Contentful Paint
  fid?: number;  // First Input Delay
  cls?: number;  // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

interface DatabaseQueryMetric {
  query: string;
  duration: number;
  timestamp: number;
  success: boolean;
  resultCount?: number;
}

interface ApiMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  cacheHit?: boolean;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private dbQueries: DatabaseQueryMetric[] = [];
  private apiCalls: ApiMetric[] = [];
  private webVitals: WebVitalsData = {};

  /**
   * 記錄性能指標
   */
  recordMetric(
    name: string,
    value: number,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // 記錄到日誌系統
    logger.info('Performance metric recorded', {
      component: 'PerformanceMonitor',
      metric: name,
      value,
      metadata,
    });

    // 清理舊指標 (保留最近1000個)
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * 記錄數據庫查詢性能
   */
  recordDatabaseQuery(
    query: string,
    duration: number,
    success: boolean,
    resultCount?: number
  ): void {
    const metric: DatabaseQueryMetric = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: Date.now(),
      success,
      resultCount,
    };

    this.dbQueries.push(metric);

    // 如果查詢時間過長，記錄警告
    if (duration > 1000) {
      logger.warn('Slow database query detected', {
        component: 'PerformanceMonitor',
        query: metric.query,
        duration,
        resultCount,
      });
    }

    // 清理舊查詢記錄
    if (this.dbQueries.length > 500) {
      this.dbQueries = this.dbQueries.slice(-500);
    }
  }

  /**
   * 記錄 API 調用性能
   */
  recordApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    cacheHit = false
  ): void {
    const metric: ApiMetric = {
      endpoint,
      method,
      statusCode,
      duration,
      timestamp: Date.now(),
      cacheHit,
    };

    this.apiCalls.push(metric);

    // 如果 API 響應時間過長，記錄警告
    if (duration > 2000) {
      logger.warn('Slow API response detected', {
        component: 'PerformanceMonitor',
        endpoint,
        method,
        statusCode,
        duration,
        cacheHit,
      });
    }

    // 清理舊 API 記錄
    if (this.apiCalls.length > 500) {
      this.apiCalls = this.apiCalls.slice(-500);
    }
  }

  /**
   * 記錄 Web Vitals 指標
   */
  recordWebVitals(vitals: Partial<WebVitalsData>): void {
    this.webVitals = { ...this.webVitals, ...vitals };

    logger.info('Web Vitals recorded', {
      component: 'PerformanceMonitor',
      vitals,
    });
  }

  /**
   * 獲取性能統計摘要
   */
  getPerformanceSummary(timeRangeMs = 300000): {
    general: any;
    database: any;
    api: any;
    webVitals: WebVitalsData;
  } {
    const cutoffTime = Date.now() - timeRangeMs;

    // 一般性能指標統計
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    const general = this.calculateStats(recentMetrics.map(m => m.value));

    // 數據庫查詢統計
    const recentDbQueries = this.dbQueries.filter(q => q.timestamp > cutoffTime);
    const database = {
      totalQueries: recentDbQueries.length,
      successRate: recentDbQueries.length > 0
        ? recentDbQueries.filter(q => q.success).length / recentDbQueries.length
        : 0,
      avgDuration: this.calculateAverage(recentDbQueries.map(q => q.duration)),
      slowQueries: recentDbQueries.filter(q => q.duration > 1000).length,
    };

    // API 調用統計
    const recentApiCalls = this.apiCalls.filter(a => a.timestamp > cutoffTime);
    const api = {
      totalCalls: recentApiCalls.length,
      successRate: recentApiCalls.length > 0
        ? recentApiCalls.filter(a => a.statusCode < 400).length / recentApiCalls.length
        : 0,
      avgDuration: this.calculateAverage(recentApiCalls.map(a => a.duration)),
      cacheHitRate: recentApiCalls.length > 0
        ? recentApiCalls.filter(a => a.cacheHit).length / recentApiCalls.length
        : 0,
      slowCalls: recentApiCalls.filter(a => a.duration > 2000).length,
    };

    return {
      general,
      database,
      api,
      webVitals: this.webVitals,
    };
  }

  /**
   * 獲取最慢的操作
   */
  getSlowestOperations(limit = 10): {
    dbQueries: DatabaseQueryMetric[];
    apiCalls: ApiMetric[];
  } {
    const sortedDbQueries = [...this.dbQueries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);

    const sortedApiCalls = [...this.apiCalls]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);

    return {
      dbQueries: sortedDbQueries,
      apiCalls: sortedApiCalls,
    };
  }

  /**
   * 檢查性能警報
   */
  checkPerformanceAlerts(): {
    level: 'info' | 'warning' | 'error';
    alerts: string[];
  } {
    const summary = this.getPerformanceSummary();
    const alerts: string[] = [];
    let level: 'info' | 'warning' | 'error' = 'info';

    // 檢查數據庫性能
    if (summary.database.avgDuration > 1000) {
      alerts.push(`數據庫平均查詢時間過長: ${summary.database.avgDuration}ms`);
      level = 'warning';
    }

    if (summary.database.successRate < 0.95) {
      alerts.push(`數據庫查詢成功率過低: ${(summary.database.successRate * 100).toFixed(1)}%`);
      level = 'error';
    }

    // 檢查 API 性能
    if (summary.api.avgDuration > 2000) {
      alerts.push(`API 平均響應時間過長: ${summary.api.avgDuration}ms`);
      level = 'warning';
    }

    if (summary.api.successRate < 0.95) {
      alerts.push(`API 調用成功率過低: ${(summary.api.successRate * 100).toFixed(1)}%`);
      level = 'error';
    }

    // 檢查緩存命中率
    if (summary.api.cacheHitRate < 0.5) {
      alerts.push(`緩存命中率過低: ${(summary.api.cacheHitRate * 100).toFixed(1)}%`);
      level = level === 'error' ? 'error' : 'warning';
    }

    // 檢查 Web Vitals
    if (this.webVitals.lcp && this.webVitals.lcp > 2500) {
      alerts.push(`LCP 過慢: ${this.webVitals.lcp}ms`);
      level = level === 'error' ? 'error' : 'warning';
    }

    if (this.webVitals.fid && this.webVitals.fid > 100) {
      alerts.push(`FID 過慢: ${this.webVitals.fid}ms`);
      level = level === 'error' ? 'error' : 'warning';
    }

    if (this.webVitals.cls && this.webVitals.cls > 0.1) {
      alerts.push(`CLS 過高: ${this.webVitals.cls}`);
      level = level === 'error' ? 'error' : 'warning';
    }

    return { level, alerts };
  }

  /**
   * 計算統計數據
   */
  private calculateStats(values: number[]): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p95: number;
  } {
    if (values.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p95: 0 };
    }

    const sorted = values.sort((a, b) => a - b);
    const count = values.length;
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = values.reduce((sum, v) => sum + v, 0) / count;
    const p95Index = Math.floor(count * 0.95);
    const p95 = sorted[p95Index];

    return { count, min, max, avg, p95 };
  }

  /**
   * 計算平均值
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * 清理敏感信息的查詢語句
   */
  private sanitizeQuery(query: string): string {
    // 移除潛在的敏感參數值，保留查詢結構
    return query
      .replace(/('[^']*')/g, "'***'")
      .replace(/(\$\d+)/g, '$***')
      .substring(0, 200); // 限制長度
  }

  /**
   * 重置所有指標
   */
  reset(): void {
    this.metrics = [];
    this.dbQueries = [];
    this.apiCalls = [];
    this.webVitals = {};
  }
}

// 性能計時工具
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  /**
   * 結束計時並記錄指標
   */
  end(metadata?: Record<string, any>): number {
    const duration = performance.now() - this.startTime;
    performanceMonitor.recordMetric(this.name, duration, metadata);
    return duration;
  }
}

// 裝飾器：自動計時函數執行
export function timed(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const timer = new PerformanceTimer(name || `${target.constructor.name}.${propertyKey}`);
      try {
        const result = await originalMethod.apply(this, args);
        timer.end({ success: true });
        return result;
      } catch (error) {
        timer.end({ success: false, error: error.message });
        throw error;
      }
    };

    return descriptor;
  };
}

// 全局性能監控實例
export const performanceMonitor = new PerformanceMonitor();