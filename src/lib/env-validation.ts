/**
 * 環境變數驗證與安全配置
 * 確保所有敏感配置通過環境變數管理
 */

import { logError, logWarn, logInfo } from '@/lib/logger';

// 環境變數類型定義
interface EnvironmentConfig {
  // 基礎配置
  nodeEnv: 'development' | 'production' | 'test';
  nextPublicUrl: string;
  nextPublicBaseUrl: string;

  // 資料庫配置
  supabaseUrl: string;
  supabaseAnonKey: string;

  // AI 服務配置
  anthropicApiKey?: string;
  openaiApiKey?: string;

  // 安全配置
  encryptionKey?: string;
  jwtSecret?: string;

  // 外部服務
  googleClientId?: string;
  googleClientSecret?: string;
}

// 必需的環境變數
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_URL',
  'NEXT_PUBLIC_BASE_URL'
] as const;

// 生產環境必需的環境變數
const PRODUCTION_REQUIRED_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'ENCRYPTION_KEY',
  'JWT_SECRET'
] as const;

// 敏感環境變數（不應在客戶端暴露）
const SENSITIVE_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'ENCRYPTION_KEY',
  'JWT_SECRET',
  'GOOGLE_CLIENT_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY'
] as const;

class EnvironmentValidator {
  private config: Partial<EnvironmentConfig> = {};
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * 驗證環境變數
   */
  validate(): EnvironmentConfig {
    this.errors = [];
    this.warnings = [];

    // 基礎驗證
    this.validateRequired();
    this.validateProduction();
    this.validateSecurity();
    this.validateURLs();

    // 構建配置對象
    this.buildConfig();

    // 報告結果
    this.reportValidation();

    if (this.errors.length > 0) {
      throw new Error(`環境變數驗證失敗: ${this.errors.join(', ')}`);
    }

    return this.config as EnvironmentConfig;
  }

  /**
   * 驗證必需的環境變數
   */
  private validateRequired() {
    for (const envVar of REQUIRED_ENV_VARS) {
      if (!process.env[envVar]) {
        this.errors.push(`缺少必需的環境變數: ${envVar}`);
      }
    }
  }

  /**
   * 驗證生產環境特定要求
   */
  private validateProduction() {
    if (process.env.NODE_ENV === 'production') {
      for (const envVar of PRODUCTION_REQUIRED_ENV_VARS) {
        if (!process.env[envVar]) {
          this.errors.push(`生產環境缺少必需的環境變數: ${envVar}`);
        }
      }

      // 檢查開發環境 URL
      if (process.env.NEXT_PUBLIC_URL?.includes('localhost')) {
        this.errors.push('生產環境不應使用 localhost URL');
      }
    }
  }

  /**
   * 安全性驗證
   */
  private validateSecurity() {
    // 檢查敏感變數是否意外暴露在客戶端
    for (const sensitiveVar of SENSITIVE_ENV_VARS) {
      const publicKey = `NEXT_PUBLIC_${sensitiveVar}`;
      if (process.env[publicKey]) {
        this.errors.push(`敏感環境變數不應暴露在客戶端: ${publicKey}`);
      }
    }

    // 檢查加密密鑰強度
    if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) {
      this.warnings.push('加密密鑰應至少 32 字符長');
    }

    // 檢查 JWT 密鑰強度
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      this.warnings.push('JWT 密鑰應至少 32 字符長');
    }
  }

  /**
   * URL 驗證
   */
  private validateURLs() {
    const urlVars = [
      'NEXT_PUBLIC_URL',
      'NEXT_PUBLIC_BASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL'
    ];

    for (const urlVar of urlVars) {
      const url = process.env[urlVar];
      if (url) {
        try {
          new URL(url);
        } catch {
          this.errors.push(`無效的 URL 格式: ${urlVar} = ${url}`);
        }

        // 檢查 HTTPS 在生產環境
        if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
          this.errors.push(`生產環境必須使用 HTTPS: ${urlVar}`);
        }
      }
    }
  }

  /**
   * 構建安全配置對象
   */
  private buildConfig() {
    this.config = {
      nodeEnv: (process.env.NODE_ENV as any) || 'development',
      nextPublicUrl: process.env.NEXT_PUBLIC_URL || '',
      nextPublicBaseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      openaiApiKey: process.env.OPENAI_API_KEY,
      encryptionKey: process.env.ENCRYPTION_KEY,
      jwtSecret: process.env.JWT_SECRET,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET
    };
  }

  /**
   * 報告驗證結果
   */
  private reportValidation() {
    if (this.errors.length > 0) {
      logError('環境變數驗證失敗', {
        component: 'EnvironmentValidator',
        errors: this.errors.length,
        errorDetails: this.errors
      });
    }

    if (this.warnings.length > 0) {
      logWarn('環境變數警告', {
        component: 'EnvironmentValidator',
        warnings: this.warnings.length,
        warningDetails: this.warnings
      });
    }

    if (this.errors.length === 0) {
      logInfo('環境變數驗證通過', {
        component: 'EnvironmentValidator',
        environment: this.config.nodeEnv,
        warnings: this.warnings.length
      });
    }
  }
}

// 單例實例
let envConfig: EnvironmentConfig | null = null;

/**
 * 獲取驗證過的環境配置
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  if (!envConfig) {
    const validator = new EnvironmentValidator();
    envConfig = validator.validate();
  }
  return envConfig;
}

/**
 * 安全的 API URL 獲取
 */
export function getApiUrl(endpoint: string): string {
  const config = getEnvironmentConfig();
  const baseUrl = config.nextPublicBaseUrl || config.nextPublicUrl;

  if (!baseUrl) {
    throw new Error('API base URL 未配置');
  }

  return `${baseUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}

/**
 * 安全的外部 API URL 獲取
 */
export function getExternalApiUrl(service: 'anthropic' | 'openai'): string {
  const urls = {
    anthropic: 'https://api.anthropic.com/v1/messages',
    openai: 'https://api.openai.com/v1/chat/completions'
  };

  return urls[service];
}

/**
 * 檢查是否為開發環境
 */
export function isDevelopment(): boolean {
  return getEnvironmentConfig().nodeEnv === 'development';
}

/**
 * 檢查是否為生產環境
 */
export function isProduction(): boolean {
  return getEnvironmentConfig().nodeEnv === 'production';
}

/**
 * 獲取 API 密鑰（僅服務端）
 */
export function getApiKey(service: 'anthropic' | 'openai'): string {
  if (typeof window !== 'undefined') {
    throw new Error('API 密鑰不應在客戶端訪問');
  }

  const config = getEnvironmentConfig();
  const key = service === 'anthropic' ? config.anthropicApiKey : config.openaiApiKey;

  if (!key) {
    throw new Error(`${service} API 密鑰未配置`);
  }

  return key;
}