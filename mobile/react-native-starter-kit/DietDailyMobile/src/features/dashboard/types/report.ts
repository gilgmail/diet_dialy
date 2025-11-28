// 健康報告資料模型
// 用於產生 7 天 IBD 健康追蹤報告

import type { FoodEntry } from '@/features/food-diary/types'
import type { SymptomEntry } from '@/features/symptom-diary/types'
import type { BowelMovementEntry } from '@/features/bowel-diary/types'

/**
 * 每週健康報告主要結構
 */
export interface WeeklyHealthReport {
  userId: string
  startDate: string  // yyyy-MM-dd
  endDate: string    // yyyy-MM-dd
  generatedAt: string // ISO 8601

  // 資料摘要
  summary: ReportSummary

  // 每日資料
  dailyData: DailyHealthData[]

  // 統計分析
  statistics: ReportStatistics

  // AI 分析（可選）
  aiAnalysis?: AIAnalysisResult

  // 元資料
  metadata: ReportMetadata
}

/**
 * 報告摘要統計
 */
export interface ReportSummary {
  totalFoods: number           // 總飲食記錄次數
  totalSymptomEntries: number  // 症狀記錄次數
  totalBowelMovements: number  // 排便次數
  dataCompleteness: number     // 資料完整度 (0.0-1.0)
}

/**
 * 每日健康資料
 */
export interface DailyHealthData {
  date: string                    // yyyy-MM-dd
  foods: FoodEntry[]              // 當日食物記錄
  symptoms: SymptomEntry | null   // 當日症狀記錄（可能無）
  bowelMovements: BowelMovementEntry[]    // 當日排便記錄
  completeness: number            // 當日資料完整度 (0.0-1.0)
}

/**
 * 報告統計分析
 */
export interface ReportStatistics {
  mostFrequentFoods: FoodFrequency[]    // 最常食用的食物
  symptomTrends: SymptomTrendData       // 症狀趨勢
  bowelMovementStats: BowelStats        // 排便統計
  foodSymptomPatterns?: FoodSymptomPattern[]  // 食物與症狀的潛在關聯（可選）
}

/**
 * 食物頻率統計
 */
export interface FoodFrequency {
  name: string   // 食物名稱
  count: number  // 食用次數
}

/**
 * 症狀趨勢資料
 */
export interface SymptomTrendData {
  trend: 'improving' | 'stable' | 'worsening' | 'no_data'
  avgScores?: {
    overallHealth?: number    // 平均整體健康 (0-5)
    abdominalPain?: number    // 平均腹痛程度 (0-5)
    diarrhea?: number         // 平均腹瀉程度 (0-5)
    bloating?: number         // 平均脹氣程度 (0-5)
    bloodyStools?: number     // 平均血便程度 (0-5)
  }
}

/**
 * 排便統計資料
 */
export interface BowelStats {
  totalCount: number                        // 總排便次數
  avgPerDay: number                         // 平均每日排便次數
  bristolDistribution: Record<string, number>  // Bristol Scale 分布
  hasBloodCount?: number                    // 發現血便的次數
}

/**
 * 食物與症狀關聯模式
 */
export interface FoodSymptomPattern {
  foodName: string              // 食物名稱
  occurrences: number          // 出現次數
  symptomDaysCount: number     // 食用後有症狀的天數
  correlationScore: number     // 關聯分數 (0-1, 越高越可能相關)
  avgSymptomSeverity?: number  // 平均症狀嚴重度
}

/**
 * AI 分析結果
 */
export interface AIAnalysisResult {
  status: 'pending' | 'completed' | 'failed' | 'unavailable'
  insights?: string[]           // AI 洞察
  recommendations?: string[]    // AI 建議
  riskyFoods?: string[]        // 需要觀察的食物
  safeFoods?: string[]         // 安全的食物
  generatedAt?: string         // AI 分析完成時間
  error?: string               // 錯誤訊息（如果失敗）
}

/**
 * 報告元資料
 */
export interface ReportMetadata {
  appVersion: string      // 應用程式版本
  reportVersion: string   // 報告版本
  timezone: string        // 時區
  language?: string       // 語言 (預設 zh-TW)
}

/**
 * 報告生成選項
 */
export interface ReportGenerationOptions {
  userId: string
  endDate?: Date           // 結束日期（預設今天）
  includeDays?: number     // 包含天數（預設 7 天）
  includeAI?: boolean      // 是否嘗試 AI 分析（預設 false）
  timezone?: string        // 時區（預設 Asia/Taipei）
}

/**
 * 報告生成結果
 */
export interface ReportGenerationResult {
  data: WeeklyHealthReport | null
  error: Error | null
}

/**
 * PDF 生成選項
 */
export interface PDFGenerationOptions {
  includeCharts?: boolean     // 是否包含圖表（預設 false）
  includeRawData?: boolean    // 是否包含原始資料（預設 true）
  template?: 'patient' | 'doctor'  // 報告模板（預設 patient）
}

/**
 * PDF 生成結果
 */
export interface PDFGenerationResult {
  success: boolean
  uri?: string      // PDF 檔案 URI（如果成功）
  error?: string    // 錯誤訊息（如果失敗）
}
