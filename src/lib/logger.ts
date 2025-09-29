/**
 * 安全結構化日誌系統
 * 用於替代所有 console.log 語句，防止敏感資料洩露
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

interface LogContext {
  component?: string;
  userId?: string;
  action?: string;
  timestamp?: string;
  [key: string]: any;
}

interface SanitizedData {
  [key: string]: any;
}

class SecureLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private sensitiveFields = [
    'password', 'token', 'secret', 'key', 'auth', 'medical_data',
    'email', 'phone', 'address', 'ssn', 'id_number', 'credit_card',
    'api_key', 'access_token', 'refresh_token', 'session_id'
  ];

  /**
   * 清理敏感資料
   */
  private sanitizeData(data: any): SanitizedData {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: SanitizedData = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.sensitiveFields.some(field =>
        lowerKey.includes(field)
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * 創建日誌條目
   */
  private createLogEntry(level: LogLevel, message: string, context?: LogContext, data?: any) {
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: context ? this.sanitizeData(context) : undefined,
      data: data ? this.sanitizeData(data) : undefined,
      environment: process.env.NODE_ENV || 'unknown'
    };

    return entry;
  }

  /**
   * 錯誤日誌
   */
  error(message: string, context?: LogContext, data?: any) {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, data);

    if (this.isDevelopment) {
      console.error('[ERROR]', entry.message, entry.context, entry.data);
    }

    // 在生產環境中，這裡會發送到外部日誌服務
    // 例如：Datadog, Sentry, CloudWatch 等
  }

  /**
   * 警告日誌
   */
  warn(message: string, context?: LogContext, data?: any) {
    const entry = this.createLogEntry(LogLevel.WARN, message, context, data);

    if (this.isDevelopment) {
      console.warn('[WARN]', entry.message, entry.context, entry.data);
    }
  }

  /**
   * 資訊日誌
   */
  info(message: string, context?: LogContext, data?: any) {
    const entry = this.createLogEntry(LogLevel.INFO, message, context, data);

    if (this.isDevelopment) {
      console.info('[INFO]', entry.message, entry.context, entry.data);
    }
  }

  /**
   * 調試日誌 (僅開發環境)
   */
  debug(message: string, context?: LogContext, data?: any) {
    if (!this.isDevelopment) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, data);
    console.debug('[DEBUG]', entry.message, entry.context, entry.data);
  }

  /**
   * 醫療專用日誌 (特殊處理)
   */
  medical(message: string, context?: LogContext, action?: string) {
    const medicalContext = {
      ...context,
      action,
      category: 'medical',
      hipaa_compliant: true
    };

    // 醫療日誌永遠不包含實際醫療數據，只記錄元數據
    const entry = this.createLogEntry(LogLevel.INFO, message, medicalContext);

    if (this.isDevelopment) {
      console.info('[MEDICAL]', entry.message, entry.context);
    }

    // 在生產環境中，醫療日誌需要特殊的合規處理
  }

  /**
   * 認證日誌
   */
  auth(message: string, userId?: string, action?: string) {
    const authContext = {
      userId: userId ? `user_${userId.slice(0, 8)}***` : 'anonymous', // 部分模糊化
      action,
      category: 'authentication'
    };

    const entry = this.createLogEntry(LogLevel.INFO, message, authContext);

    if (this.isDevelopment) {
      console.info('[AUTH]', entry.message, entry.context);
    }
  }

  /**
   * 性能日誌
   */
  performance(message: string, metrics: { duration?: number; [key: string]: any }) {
    const perfContext = {
      category: 'performance',
      metrics: this.sanitizeData(metrics)
    };

    const entry = this.createLogEntry(LogLevel.INFO, message, perfContext);

    if (this.isDevelopment) {
      console.info('[PERF]', entry.message, entry.context);
    }
  }
}

// 單例實例
export const logger = new SecureLogger();

// 便利函數
export const logError = (message: string, context?: LogContext, data?: any) =>
  logger.error(message, context, data);

export const logWarn = (message: string, context?: LogContext, data?: any) =>
  logger.warn(message, context, data);

export const logInfo = (message: string, context?: LogContext, data?: any) =>
  logger.info(message, context, data);

export const logDebug = (message: string, context?: LogContext, data?: any) =>
  logger.debug(message, context, data);

export const logMedical = (message: string, context?: LogContext, action?: string) =>
  logger.medical(message, context, action);

export const logAuth = (message: string, userId?: string, action?: string) =>
  logger.auth(message, userId, action);

export const logPerformance = (message: string, metrics: { duration?: number; [key: string]: any }) =>
  logger.performance(message, metrics);