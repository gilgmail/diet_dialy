/**
 * AI 友善資料匯出格式定義
 *
 * 三種格式設計用於不同場景：
 * - SmartSummary: 智能摘要版（已含初步分析，最省 token）
 * - Simplified: 簡化版（適合手動 AI 分析）
 * - Detailed: 完整版（詳細記錄，僅供保存）
 */

// ============================================
// 通用類型定義
// ============================================

export type ExportFormat = 'smart-summary' | 'simplified' | 'detailed'

export type UserCondition = 'IBD' | 'IBS' | 'allergy' | 'chemo' | 'other'

export interface ExportPeriod {
  start: string // ISO date string
  end: string
}

export interface ExportOptions {
  format: ExportFormat
  period: ExportPeriod
  includePromptTemplate?: boolean
  includeNutritionDetails?: boolean
  includeMedicationHistory?: boolean
}

// ============================================
// 格式 A: 智能摘要版（推薦給自動 AI）
// Token 使用: ~1,500-2,000 tokens
// ============================================

export interface SmartSummaryExport {
  exportDate: string
  period: ExportPeriod
  condition: UserCondition

  overview: {
    recordedDays: number
    mealsRecorded: number
    symptomsCount: number
    avgCalories: number
    dataCompleteness: number // 0-100%
  }

  nutrition: {
    daily: {
      calories: number
      protein: number
      carbs: number
      fat: number
      fiber: number
    }
    balance: 'excellent' | 'good' | 'fair' | 'poor'
    notes?: string
  }

  topFoods: Array<{
    food: string
    category: string
    times: number
    avgPortion: string
    totalCalories: number
  }>

  symptoms: Array<{
    date: string // MM-DD format
    time: string // HH:mm format
    type: string
    severity: number // 1-5
    possibleTrigger?: string // "食物名稱（攝取時間）"
    timeSinceMeal?: string // "餐後 N 小時"
    notes?: string
  }>

  suspectedTriggers: Array<{
    food: string
    category: string
    evidence: string
    confidence: 'high' | 'medium' | 'low'
    occurrences: number
    avgSymptomSeverity: number
  }>

  trends: {
    vsLastWeek?: {
      symptomsChange: string // "+20%" or "-40%"
      severityChange: string
      recordingRate: string
      caloriesChange: string
    }
  }

  aiPromptTemplate?: string
}

// ============================================
// 格式 B: 簡化版（推薦給手動 AI）
// Token 使用: ~2,000-3,000 tokens
// ============================================

export interface SimplifiedExport {
  exportDate: string
  period: ExportPeriod
  user: {
    condition: UserCondition
    anonymousId?: string
  }

  dailySummary: Array<{
    date: string // YYYY-MM-DD
    meals: {
      breakfast?: string[] // 食物名稱列表
      lunch?: string[]
      dinner?: string[]
      snack?: string[]
    }
    nutrition: {
      calories: number
      protein: number
      carbs: number
      fat: number
      fiber?: number
    }
    symptoms?: Array<{
      time: string
      type: string
      severity: number
      notes?: string
    }>
    bowelMovements?: number
    bristolTypes?: number[]
    medications?: string[]
    notes?: string
  }>

  weekSummary: {
    totalDays: number
    avgCalories: number
    symptomsCount: number
    commonFoods: string[] // ["白飯(7次)", "雞胸肉(5次)"]
    commonSymptoms: string[] // ["腹痛(2次)", "腹瀉(1次)"]
    avgBowelMovements: number
  }

  aiPromptTemplate?: string
}

// ============================================
// 格式 C: 完整版（詳細記錄）
// Token 使用: ~5,000-8,000 tokens
// 僅供下載保存、給醫生的報告
// ============================================

export interface DetailedExport {
  exportDate: string
  period: ExportPeriod

  user: {
    id: string
    condition: UserCondition
    medicalHistory?: {
      diagnosis: string
      diagnosisDate?: string
      currentMedications: string[]
      allergies: string[]
    }
  }

  timeline: Array<{
    date: string
    meals: Array<{
      time: string
      type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
      foods: Array<{
        id: string
        name: string
        category: string
        portion: string
        calories: number
        protein: number
        carbs: number
        fat: number
        fiber: number
        customNotes?: string
      }>
      totalNutrition: {
        calories: number
        protein: number
        carbs: number
        fat: number
        fiber: number
      }
      notes?: string
    }>

    symptoms: Array<{
      time: string
      type: string
      severity: number // 1-5
      location?: string
      duration?: string
      notes?: string
      tags?: string[]
    }>

    bowelMovements: {
      count: number
      bristolTypes: number[]
      notes?: string
    }

    medications?: Array<{
      name: string
      dose: string
      time: string
      notes?: string
    }>

    otherFactors?: {
      sleep?: {
        hours: number
        quality: number // 1-5
      }
      exercise?: {
        type: string
        duration: number
        intensity: string
      }
      stress?: {
        level: number // 1-5
        notes?: string
      }
    }

    dailyNotes?: string
  }>

  summary: {
    totalDays: number
    mealsRecorded: number
    symptomsRecorded: number
    avgCalories: number
    avgProtein: number
    avgCarbs: number
    avgFat: number
    avgFiber: number
    commonSymptoms: Array<{
      type: string
      count: number
      avgSeverity: number
    }>
    topFoods: Array<{
      food: string
      category: string
      count: number
      totalCalories: number
    }>
  }

  metadata: {
    exportVersion: string
    dataSource: 'web' | 'mobile'
    exportedBy: string
    exportReason?: string
  }
}

// ============================================
// AI 提示詞模板
// ============================================

export interface AIPromptTemplates {
  smartSummary: {
    chatgpt: string
    claude: string
    gemini: string
  }
  simplified: {
    chatgpt: string
    claude: string
    gemini: string
  }
}

export const defaultPromptTemplates: AIPromptTemplates = {
  smartSummary: {
    chatgpt: `我是一位 {condition} 患者，以下是我的智能健康摘要（{period}）：

{data}

請幫我分析：
1. 根據「可疑觸發食物」分析，哪些食物最需要避免？
2. 症狀模式有什麼值得注意的規律？
3. 本週表現如何？有哪些改善或惡化？
4. 下週飲食建議（具體可執行的 3-5 項）

請用繁體中文，專業但易懂的方式回答。`,

    claude: `作為一位 {condition} 患者的健康顧問，請分析以下資料（{period}）：

{data}

請提供：
1. **觸發食物分析**：基於證據的可疑食物評估
2. **症狀模式洞察**：時間、嚴重度、關聯性分析
3. **趨勢評估**：本週 vs 上週的變化分析
4. **實用建議**：3-5 項具體、可執行的飲食調整建議

請用繁體中文、專業但親切的語氣回答。`,

    gemini: `你是一位專業的消化系統健康顧問。患者是 {condition} 病患，以下是 {period} 的健康摘要資料：

{data}

請分析並提供：
1. 哪些食物可能觸發症狀？（基於時間關聯和頻率）
2. 症狀出現的規律或模式是什麼？
3. 這週的整體健康狀況如何？
4. 具體的飲食調整建議

請用繁體中文回答，語氣專業且易懂。`
  },

  simplified: {
    chatgpt: `我是一位 {condition} 患者，以下是我過去 7 天的飲食和症狀記錄：

{data}

請幫我分析：
1. 哪些食物可能觸發我的症狀？（請基於時間關聯分析）
2. 症狀模式有什麼規律？
3. 本週飲食和健康狀況如何？
4. 下週飲食建議

請用繁體中文，專業但易懂的方式回答。`,

    claude: `請幫我分析這份 {condition} 患者的健康記錄（{period}）：

{data}

分析重點：
1. **食物-症狀關聯**：識別可能的觸發食物
2. **症狀模式**：頻率、嚴重度、時間規律
3. **營養評估**：飲食均衡度和營養攝取
4. **行動建議**：具體的飲食調整方案

請用繁體中文、清晰易懂的方式回答。`,

    gemini: `以下是一位 {condition} 患者的 {period} 健康記錄：

{data}

請提供：
1. 可能的觸發食物分析（基於進食與症狀時間關聯）
2. 症狀趨勢觀察
3. 飲食營養評估
4. 實用的飲食建議

請用繁體中文回答。`
  }
}

// ============================================
// 匯出功能輔助函數類型
// ============================================

export interface ExportMetrics {
  estimatedTokens: number
  estimatedCost: {
    chatgpt: number // USD
    claude: number
    gemini: number
  }
  compressionRate: number // vs detailed format
}

export interface ExportResult {
  success: boolean
  format: ExportFormat
  data: SmartSummaryExport | SimplifiedExport | DetailedExport
  metrics: ExportMetrics
  downloadUrl?: string
  error?: string
}

// ============================================
// UI 相關類型
// ============================================

export interface ExportFormatOption {
  id: ExportFormat
  name: string
  description: string
  icon: string
  estimatedTokens: string
  bestFor: string[]
  pros: string[]
  recommended?: boolean
}

export const exportFormatOptions: ExportFormatOption[] = [
  {
    id: 'smart-summary',
    name: '智能摘要版',
    description: '已包含初步分析，最省 token 和成本',
    icon: '🤖',
    estimatedTokens: '~2K tokens',
    bestFor: [
      '自動 AI 週報（第五階段）',
      '成本敏感的用戶',
      '快速獲得洞察'
    ],
    pros: [
      'Token 使用量最少（節省 75-80%）',
      '已包含觸發食物初步分析',
      'AI 可直接給建議，無需額外計算'
    ],
    recommended: true
  },
  {
    id: 'simplified',
    name: '簡化版',
    description: '適合手動複製給 ChatGPT/Claude 分析',
    icon: '📋',
    estimatedTokens: '~3K tokens',
    bestFor: [
      '手動 AI 分析（當前階段）',
      '保留完整每日資料',
      '需要看到每日細節'
    ],
    pros: [
      'Token 使用適中（節省 60-70%）',
      '包含每日記錄摘要',
      '方便閱讀和理解'
    ]
  },
  {
    id: 'detailed',
    name: '完整版',
    description: '詳細記錄，適合保存或給醫生',
    icon: '📄',
    estimatedTokens: '~8K tokens',
    bestFor: [
      '下載保存完整記錄',
      '提供給醫生的報告',
      '資料備份'
    ],
    pros: [
      '完整的每餐食物營養資訊',
      '詳細的症狀記錄',
      '包含藥物、睡眠、運動等所有因子'
    ]
  }
]
