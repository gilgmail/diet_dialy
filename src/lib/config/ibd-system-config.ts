// IBD 評分系統配置管理
// 統一管理所有 IBD 相關配置和安全檢查

export interface IBDSystemConfig {
  // Claude API 配置
  claude: {
    apiKey: string
    model: string
    maxTokens: number
    temperature: number
    timeout: number
  }

  // IBD 評分配置
  scoring: {
    enabled: boolean
    fallbackMode: boolean
    cacheTTL: number
    batchSize: number
    confidenceThreshold: number
  }

  // FODMAP 配置
  fodmap: {
    dataSource: string
    autoUpdate: boolean
    confidenceThreshold: number
  }

  // 用戶反饋配置
  feedback: {
    collectionEnabled: boolean
    moderationEnabled: boolean
    analyticsEnabled: boolean
    minScoreConfidence: number
  }

  // 安全配置
  security: {
    rateLimitRequests: number
    rateLimitWindow: number
    adminVerificationRequired: boolean
    encryptSensitiveData: boolean
  }
}

class IBDConfigManager {
  private config: IBDSystemConfig
  private initialized = false

  constructor() {
    this.config = this.loadConfiguration()
  }

  private loadConfiguration(): IBDSystemConfig {
    return {
      claude: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
        maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '1000'),
        temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.3'),
        timeout: parseInt(process.env.API_REQUEST_TIMEOUT || '30000')
      },

      scoring: {
        enabled: process.env.IBD_SCORING_ENABLED === 'true',
        fallbackMode: process.env.IBD_SCORING_FALLBACK_MODE === 'true',
        cacheTTL: parseInt(process.env.IBD_SCORING_CACHE_TTL || '3600'),
        batchSize: parseInt(process.env.IBD_SCORING_BATCH_SIZE || '5'),
        confidenceThreshold: parseFloat(process.env.SCORING_CONFIDENCE_THRESHOLD || '0.7')
      },

      fodmap: {
        dataSource: process.env.FODMAP_DATA_SOURCE || 'monash_university',
        autoUpdate: process.env.FODMAP_AUTO_UPDATE === 'true',
        confidenceThreshold: parseFloat(process.env.FODMAP_CONFIDENCE_THRESHOLD || '0.8')
      },

      feedback: {
        collectionEnabled: process.env.FEEDBACK_COLLECTION_ENABLED === 'true',
        moderationEnabled: process.env.FEEDBACK_MODERATION_ENABLED === 'true',
        analyticsEnabled: process.env.FEEDBACK_ANALYTICS_ENABLED === 'true',
        minScoreConfidence: parseFloat(process.env.FEEDBACK_MIN_SCORE_CONFIDENCE || '0.5')
      },

      security: {
        rateLimitRequests: parseInt(process.env.API_RATE_LIMIT_REQUESTS || '100'),
        rateLimitWindow: parseInt(process.env.API_RATE_LIMIT_WINDOW || '3600'),
        adminVerificationRequired: process.env.ADMIN_VERIFICATION_REQUIRED === 'true',
        encryptSensitiveData: process.env.DATA_ANONYMIZATION === 'true'
      }
    }
  }

  // 獲取配置
  getConfig(): IBDSystemConfig {
    return this.config
  }

  // 獲取特定模塊配置
  getClaudeConfig() {
    return this.config.claude
  }

  getScoringConfig() {
    return this.config.scoring
  }

  getFODMAPConfig() {
    return this.config.fodmap
  }

  getFeedbackConfig() {
    return this.config.feedback
  }

  getSecurityConfig() {
    return this.config.security
  }

  // 驗證配置完整性
  validateConfiguration(): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Claude API 配置檢查
    if (!this.config.claude.apiKey) {
      if (this.config.scoring.fallbackMode) {
        warnings.push('Claude API key 未設定，將使用備用評分模式')
      } else {
        errors.push('Claude API key 必須設定')
      }
    }

    if (this.config.claude.maxTokens < 100 || this.config.claude.maxTokens > 4000) {
      warnings.push('Claude maxTokens 建議設定在 100-4000 之間')
    }

    if (this.config.claude.temperature < 0 || this.config.claude.temperature > 1) {
      errors.push('Claude temperature 必須在 0-1 之間')
    }

    // 評分系統檢查
    if (this.config.scoring.enabled && !this.config.claude.apiKey && !this.config.scoring.fallbackMode) {
      errors.push('評分系統啟用但沒有 API key 且未啟用備用模式')
    }

    if (this.config.scoring.batchSize < 1 || this.config.scoring.batchSize > 20) {
      warnings.push('IBD 評分批次大小建議設定在 1-20 之間')
    }

    // 安全配置檢查
    if (this.config.security.rateLimitRequests < 10) {
      warnings.push('API 速率限制過低，可能影響用戶體驗')
    }

    if (!this.config.security.adminVerificationRequired && process.env.NODE_ENV === 'production') {
      errors.push('生產環境必須啟用管理員驗證')
    }

    // 反饋系統檢查
    if (this.config.feedback.collectionEnabled && !this.config.feedback.moderationEnabled) {
      warnings.push('啟用反饋收集但未啟用審核，可能影響數據品質')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  // 檢查系統就緒狀態
  async checkSystemReadiness(): Promise<{
    ready: boolean
    claudeAPI: boolean
    database: boolean
    configuration: boolean
    details: string[]
  }> {
    const details: string[] = []
    let claudeAPI = false
    let database = false

    // 檢查配置
    const configValidation = this.validateConfiguration()
    const configuration = configValidation.isValid

    if (!configuration) {
      details.push(`配置錯誤: ${configValidation.errors.join(', ')}`)
    }

    // 檢查 Claude API 連通性
    try {
      if (this.config.claude.apiKey) {
        // 這裡可以添加 Claude API 連通性測試
        claudeAPI = true
        details.push('Claude API 配置正常')
      } else {
        details.push('Claude API 未配置，使用備用模式')
      }
    } catch (error) {
      details.push(`Claude API 連接失敗: ${error}`)
    }

    // 檢查數據庫連通性
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        database = true
        details.push('Supabase 配置正常')
      } else {
        details.push('Supabase 配置不完整')
      }
    } catch (error) {
      details.push(`數據庫連接失敗: ${error}`)
    }

    const ready = configuration && database && (claudeAPI || this.config.scoring.fallbackMode)

    return {
      ready,
      claudeAPI,
      database,
      configuration,
      details
    }
  }

  // 安全檢查
  performSecurityChecks(): {
    passed: boolean
    checks: Array<{
      name: string
      status: 'pass' | 'fail' | 'warning'
      message: string
    }>
  } {
    const checks = []

    // API Key 安全檢查
    if (this.config.claude.apiKey) {
      if (this.config.claude.apiKey.length < 20) {
        checks.push({
          name: 'API Key 長度',
          status: 'fail',
          message: 'API Key 過短，可能無效'
        })
      } else {
        checks.push({
          name: 'API Key 長度',
          status: 'pass',
          message: 'API Key 長度正常'
        })
      }

      // 檢查是否在生產環境暴露 API Key
      if (process.env.NODE_ENV === 'production' && this.config.claude.apiKey.startsWith('sk-ant-test')) {
        checks.push({
          name: 'API Key 類型',
          status: 'warning',
          message: '使用測試 API Key，生產環境建議使用正式 Key'
        })
      }
    }

    // 率限檢查
    if (this.config.security.rateLimitRequests > 1000) {
      checks.push({
        name: '速率限制',
        status: 'warning',
        message: '速率限制過高，可能導致過度使用'
      })
    } else {
      checks.push({
        name: '速率限制',
        status: 'pass',
        message: '速率限制配置合理'
      })
    }

    // 數據加密檢查
    if (this.config.security.encryptSensitiveData) {
      checks.push({
        name: '數據加密',
        status: 'pass',
        message: '已啟用敏感數據加密'
      })
    } else {
      checks.push({
        name: '數據加密',
        status: 'warning',
        message: '未啟用數據加密，建議在生產環境啟用'
      })
    }

    // 管理員驗證檢查
    if (this.config.security.adminVerificationRequired) {
      checks.push({
        name: '管理員驗證',
        status: 'pass',
        message: '已啟用管理員驗證'
      })
    } else {
      checks.push({
        name: '管理員驗證',
        status: 'fail',
        message: '未啟用管理員驗證，存在安全風險'
      })
    }

    const passed = !checks.some(check => check.status === 'fail')

    return { passed, checks }
  }

  // 更新配置
  updateConfig(updates: Partial<IBDSystemConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    }
  }

  // 重置為預設配置
  resetToDefaults(): void {
    this.config = this.loadConfiguration()
  }

  // 獲取配置摘要（用於日誌和調試）
  getConfigSummary(): string {
    return JSON.stringify({
      claudeConfigured: !!this.config.claude.apiKey,
      scoringEnabled: this.config.scoring.enabled,
      fallbackMode: this.config.scoring.fallbackMode,
      feedbackEnabled: this.config.feedback.collectionEnabled,
      securityLevel: this.config.security.adminVerificationRequired ? 'high' : 'medium'
    }, null, 2)
  }
}

// 單例模式
export const ibdConfigManager = new IBDConfigManager()

// 導出便捷函數
export const getIBDConfig = () => ibdConfigManager.getConfig()
export const validateIBDConfig = () => ibdConfigManager.validateConfiguration()
export const checkIBDSystemReadiness = () => ibdConfigManager.checkSystemReadiness()
export const performIBDSecurityChecks = () => ibdConfigManager.performSecurityChecks()