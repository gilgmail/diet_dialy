import Anthropic from '@anthropic-ai/sdk'
import { recordAIUsage } from '@/lib/ai/usage-tracker'
import { SupabaseFoodEntriesService } from '@/lib/supabase/food-entries'
import { DailySymptomService } from '@/lib/supabase/daily-symptom-service'
import {
  DEFAULT_FOOD_ANALYSIS_MAX_AGE_DAYS,
  DEFAULT_FOOD_ANALYSIS_VERSION,
  FoodAnalysisCacheService
} from '@/lib/supabase/food-analysis-cache'
import type { FoodAnalysisLookupResult } from '@/lib/supabase/food-analysis-cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { FoodAnalysisCache, FoodEntry } from '@/types/supabase'
import type { DailySymptomEntry, CoreSymptomScores } from '@/types/medical'
import { calculateHealthFactors } from './health-metrics-calculator'

// 更新版本時務必同步調整行動端顯示與報告標註
export const WEEKLY_ANALYSIS_VERSION = '2025.11.09.8'

interface ClaudeConfig {
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

interface Timeframe {
  startDate: string
  endDate: string
  daysCovered: number
}

interface SeverityRecord {
  date: string
  severity: number
  keySymptoms: string[]
  related: boolean
}

interface AggregatedFoodImpact {
  food: string
  occurrences: number
  mealTypes: Record<string, number>
  lastConsumedAt?: string
  severityRecords: SeverityRecord[]
  correlatedSymptoms: Record<string, number>
  notes: Set<string>
}

type FoodSuitabilityLevel = '有益' | '中性' | '觀察' | '避免'

interface DailyFoodLog {
  date: string
  meals: Array<{
    meal: string
    foods: Array<{
      id?: string | null
      name: string
      category?: string | null
    }>
  }>
  symptomSummary?: {
    severity: number | null
    keySymptoms: string[]
    notes?: string | null
  } | null
}

interface DailyFoodAssessment {
  date: string
  day_summary?: string
  meals: Array<{
    meal: string
    foods: Array<{
      name: string
      suitability: FoodSuitabilityLevel
      reasoning: string[]
      symptom_links: string[]
      notes: string[]
    }>
  }>
}

interface NextStepPlan {
  maintain: string[]
  monitor: string[]
  experiments: string[]
}

interface FoodKnowledgeSummary {
  food_id: string
  food_name: string
  food_category?: string | null
  analysis_version: string
  analysis_source: string
  analysis_updated_at: string
  nutrition_profile: Record<string, unknown>
  risk_profile: Record<string, unknown>
  supportive_attributes: unknown[]
  serving_guidelines: unknown[]
  analysis_notes?: string | null
}

interface FoodKnowledgeAlertEntry {
  food_id: string
  food_name: string
  category?: string | null
  last_updated_at?: string | null
  reason: 'missing' | 'stale'
}

// 排便記錄類型定義（對應 bowel_movement_entries）
interface BowelMovementEntry {
  id: string
  user_id: string
  recorded_date: string
  occurred_at: string
  stool_type: number  // Bristol Scale 1-5
  has_blood: boolean
  difficulty?: 'normal' | 'difficult' | 'urgent'
  duration_minutes?: number
  notes?: string
  created_at: string
}

// HealthKit 健康指標類型定義（對應 health_metrics）
interface HealthMetric {
  id: string
  user_id: string
  source: string
  source_identifier: string
  metric_type: string  // 'sleep_analysis' | 'workout' | 'heart_rate' | 'steps' | etc.
  start_time: string
  end_time: string
  recorded_date: string
  numeric_value?: number
  unit?: string
  detail_payload?: Record<string, any>
  sync_status: 'synced' | 'pending' | 'error'
  synced_at?: string
  created_at: string
}

interface FoodKnowledgeAlertSummary {
  missingFoods: FoodKnowledgeAlertEntry[]
  staleFoods: FoodKnowledgeAlertEntry[]
  warnings: string[]
}

interface WeeklyAnalysisPayload {
  timeframe: Timeframe
  trackingSummary: {
    totalFoodEntries: number
    uniqueFoods: number
    totalSymptomEntries: number
    totalBowelMovements: number
    totalHealthMetrics: number
    daysWithFoodOnly: string[]
  }
  foodImpacts: Array<{
    food: string
    occurrences: number
    mealTypes: Record<string, number>
    severity: {
      average: number | null
      highDays: SeverityRecord[]
      moderateCount: number
      lowCount: number
    }
    correlatedSymptoms: string[]
    lastConsumedAt?: string
    sampleNotes: string[]
  }>
  symptomOverview: {
    averageScores: Record<keyof CoreSymptomScores, number | null>
    flareDays: Array<{
      date: string
      severity: number
      keySymptoms: string[]
      foods: string[]
    }>
    stableDays: Array<{
      date: string
      severity: number
      foods: string[]
    }>
    trendNotes: string[]
  }
  lifestyleFactors: {
    commonTriggers: string[]
    improvementFactors: string[]
    medications: string[]
    activityLevels: Record<string, number>
    healthMetrics?: {
      overview: import('@/types/medical').HealthMetricsOverview
      correlations: import('@/types/medical').HealthSymptomCorrelation[]
      dataQuality: string
      qualityNotes: string[]
    }
  }
  dataQuality: {
    warnings: string[]
    missingSymptomDates: string[]
  }
  dailyBreakdown: DailyFoodLog[]
  foodKnowledgeBase: Record<string, FoodKnowledgeSummary>
}

export interface WeeklyAnalysisOptions {
  startDate?: string
  endDate?: string
  promptOverride?: string
  promptStyle?: PromptVariantKey
  includePromptRecommendations?: boolean
  useMockMode?: boolean // 🧪 強制使用測試模式（優先於環境變數）
}

interface ClaudeUsageContext {
  userId?: string
  feature: string
  metadata?: Record<string, unknown>
}

export interface WeeklyIBDAnalysisResult {
  success: boolean
  method: 'claude_api' | 'fallback' | 'insufficient_data'
  analysis_mode?: AnalysisStrategy
  prompt_used: string
  timeframe: Timeframe
  analysis_version: string
  token_strategy?: TokenStrategyMeta
  totals: {
    food_entries: number
    unique_foods: number
    symptom_entries: number
    days_without_symptom_logs: number
  }
  analysis: {
    summary: string
    all_foods_overview: {
      high_risk_foods: string[]
      moderate_risk_foods: string[]
      watch_foods: string[]
      supportive_foods: string[]
      neutral_foods: string[]
    }
    foods_to_monitor: Array<{
      food: string
      risk_level: 'high' | 'moderate' | 'watch'
      reasoning: string[]
      recommended_actions: string[]
      supporting_days: string[]
    }>
    supportive_foods: Array<{
      food: string
      benefits: string[]
      suggestions: string[]
    }>
    symptom_trends: Array<{
      pattern: string
      evidence: string[]
      recommendations: string[]
    }>
    gut_health_recommendations: string[]
    warning_signs: string[]
    data_quality_notes: string[]
    follow_up_actions: string[]
    reasoning_trace: string[]
    evidence_notes: string[]
    daily_food_breakdown: DailyFoodAssessment[]
    next_steps: NextStepPlan
  }
  raw_ai_response?: string
  prompt_recommendations?: Array<PromptRecommendation>
  food_knowledge?: FoodKnowledgeAlertSummary
}

interface PromptRecommendation {
  id: string
  label: string
  description: string
  prompt: string
}

type AnalysisStrategy = 'single_pass' | 'chunked'

interface TokenStrategyMeta {
  estimated_prompt_tokens: number
  max_tokens: number
  mode: AnalysisStrategy
  chunk_size?: number
  chunk_count?: number
  warnings?: string[]
}

interface StrategyDecision {
  mode: AnalysisStrategy
  estimatedTokens: number
  chunkSize?: number
  reason: string
}

type RiskLevel = 'high' | 'moderate' | 'watch'

interface ClaudeAnalysisResponse {
  summary?: string
  all_foods_overview?: {
    high_risk_foods?: unknown
    moderate_risk_foods?: unknown
    watch_foods?: unknown
    supportive_foods?: unknown
    neutral_foods?: unknown
  }
  foods_to_monitor?: Array<{
    food?: string
    risk_level?: string
    reasoning?: unknown
    recommended_actions?: unknown
    supporting_days?: unknown
  }>
  supportive_foods?: Array<{
    food?: string
    benefits?: unknown
    suggestions?: unknown
  }>
  symptom_trends?: Array<{
    pattern?: string
    evidence?: unknown
    recommendations?: unknown
  }>
  gut_health_recommendations?: unknown
  warning_signs?: unknown
  data_quality_notes?: unknown
  follow_up_actions?: unknown
  reasoning_trace?: unknown
  evidence_notes?: unknown
  daily_food_breakdown?: unknown
  next_steps?: unknown
}

type MonitorItem = NonNullable<ClaudeAnalysisResponse['foods_to_monitor']>[number]
type SupportiveFoodItem = NonNullable<ClaudeAnalysisResponse['supportive_foods']>[number]
type SymptomTrendItem = NonNullable<ClaudeAnalysisResponse['symptom_trends']>[number]

interface ChunkAnalysisResponseData {
  chunk_id?: string
  date_range?: {
    start?: string
    end?: string
  }
  daily_breakdown?: unknown
  risk_candidates?: Array<{
    food?: string
    risk_level?: string
    reasoning?: unknown
    recommendations?: unknown
    supporting_days?: unknown
  }>
  supportive_candidates?: Array<{
    food?: string
    benefits?: unknown
    suggestions?: unknown
    dates?: unknown
  }>
  symptom_highlights?: unknown
  data_warnings?: unknown
}

interface ChunkSummaryResult {
  chunkId: string
  startDate: string
  endDate: string
  index: number
  rawResponse?: string
  dailyBreakdown: DailyFoodAssessment[]
  riskCandidates: Array<{
    food: string
    risk_level: RiskLevel
    reasoning: string[]
    recommended_actions: string[]
    supporting_days: string[]
  }>
  supportiveCandidates: Array<{
    food: string
    benefits: string[]
    suggestions: string[]
  }>
  symptomHighlights: string[]
  dataWarnings: string[]
}

interface ChunkAnalysisInput {
  chunkId: string
  index: number
  totalChunks: number
  days: DailyFoodLog[]
  chunkStats: {
    dayCount: number
    mealCount: number
    foodsLogged: number
    symptomEntries: number
  }
  timeframe: Timeframe
  relevantFoodImpacts: WeeklyAnalysisPayload['foodImpacts']
  dataQuality: WeeklyAnalysisPayload['dataQuality']
  lifestyleFactors: WeeklyAnalysisPayload['lifestyleFactors']
  foodKnowledgeBase: Record<string, FoodKnowledgeSummary>
}

interface ChunkedSummaryDataset {
  timeframe: Timeframe
  trackingSummary: WeeklyAnalysisPayload['trackingSummary']
  symptomOverview: WeeklyAnalysisPayload['symptomOverview']
  lifestyleFactors: WeeklyAnalysisPayload['lifestyleFactors']
  dataQuality: WeeklyAnalysisPayload['dataQuality']
  aggregatedFoodImpacts: WeeklyAnalysisPayload['foodImpacts']
  foodKnowledgeBase: WeeklyAnalysisPayload['foodKnowledgeBase']
  chunk_meta: {
    chunk_size: number
    chunk_count: number
    chunk_ranges: Array<{
      chunk_id: string
      start: string
      end: string
      day_count: number
    }>
  }
  chunk_insights: Array<{
    chunk_id: string
    date_range: {
      start: string
      end: string
    }
    day_summaries: Array<{
      date: string
      summary?: string
    }>
    risk_candidates: ChunkSummaryResult['riskCandidates']
    supportive_candidates: ChunkSummaryResult['supportiveCandidates']
    symptom_highlights: string[]
    data_warnings: string[]
  }>
  aggregated_risk_candidates: ChunkSummaryResult['riskCandidates']
  aggregated_supportive_candidates: ChunkSummaryResult['supportiveCandidates']
  aggregated_symptom_highlights: string[]
}

interface MergedChunkInsights {
  foodsToMonitor: ChunkSummaryResult['riskCandidates']
  supportiveFoods: ChunkSummaryResult['supportiveCandidates']
  symptomHighlights: string[]
  dataWarnings: string[]
}

const PROMPT_VARIANTS = {
  balanced: {
    label: 'IBD 營養顧問',
    description: '專精於發炎性腸道疾病的個人化營養分析與飲食調整建議。',
    prompt: `你是一位專精於發炎性腸道疾病(IBD)的營養顧問。我會提供患者的每日飲食記錄和症狀日記，請幫我進行深度分析。

【最重要任務】你必須在 daily_food_breakdown 中完整分析「每一天」「每一餐」「每種食物」。這是報告的核心價值，絕對不可省略任何日期。dataset 中 dailyBreakdown 有多少天，你就必須分析多少天。

## 分析任務

### 1. 飲食模式分析
- 找出可能的觸發食物（trigger foods）
- 識別安全食物（safe foods）
- 分析飲食頻率與多樣性
- 評估三大營養素平衡（蛋白質、碳水化合物、脂肪）

### 2. 症狀關聯性分析
- 分析特定食物與症狀出現的時間關聯
- 考慮延遲反應（2-24小時）
- 識別累積效應（連續多日攝取）
- 區分直接觸發 vs 偶然相關

**時間關聯邏輯**：
- 早上症狀 → 可能受前一天晚餐或前一天整體飲食影響
- 中午症狀 → 可能受當天早餐或前一天晚餐影響
- 晚上症狀 → 可能受當天午餐或早餐累積影響
- 隔夜症狀 → 通常受前一天晚餐影響最大

### 3. 營養評估
檢視飲食是否均衡，重點關注：
- **微量元素**：鐵、鈣、鎂、維生素 B12、維生素 D
- **抗發炎營養素**：Omega-3（EPA/DHA）、多酚類、薑黃素
- **腸道修復營養素**：麩醯胺酸、鋅、維生素 A、短鏈脂肪酸前驅物
- **纖維攝取**：可溶性 vs 不溶性纖維比例
- **FODMAP 食物**：高 FODMAP 食物的攝取量

### 4. 排便模式分析（新增）
如果有排便記錄數據（bowelMovementSummary），分析以下內容：
- **Bristol Scale 分佈趨勢**：正常（3-4）vs 便秘（1-2）vs 腹瀉（5）的比例
- **排便頻率分析**：平均每日次數是否在正常範圍（1-3次/天）
- **便秘-腹瀉交替模式**：識別是否有便秘後腹瀉的循環模式
- **血便事件關聯**：血便事件與飲食、症狀的時間關聯
- **食物-排便關係**：
  - 哪些食物導致便秘（Bristol 1-2）？（例如：精緻澱粉、低纖維飲食）
  - 哪些食物導致腹瀉（Bristol 5）？（例如：高脂、辛辣、特定FODMAP食物）
  - 哪些食物有助於正常排便（Bristol 3-4）？

### 5. 生活方式-腸道健康關聯分析（新增）
如果有 HealthKit 健康指標數據（healthKitSummary），分析以下維度：

#### 睡眠-症狀關聯
- **睡眠品質對次日症狀的影響**：
  - 睡眠不足（<6小時）的天數 vs 症狀加劇的關聯
  - 充足睡眠（≥7小時）的天數 vs 症狀緩解的關聯
  - 睡眠建議：目標每晚7-8小時，睡前2小時避免進食刺激性食物

#### 運動-腸道反應關聯
- **運動對腸道的影響**：
  - 規律運動日 vs 症狀改善的關聯
  - 高強度運動是否加劇症狀（特別是腹痛、腹瀉）
  - 最佳運動時機：建議餐後1.5-2小時進行中強度運動
- **活動量建議**：根據步數、運動時長提供具體目標（例如：每日8000-10000步）

#### 心率變異性-壓力指標
- **靜息心率與症狀**：
  - 高心率天數是否與症狀惡化相關（可能反映壓力或發炎）
  - 提供壓力管理建議（冥想、深呼吸、瑜伽等）

#### 飲水量-排便規律性
- **飲水量對排便的影響**：
  - 飲水不足（<2000ml/天）與便秘的關聯
  - 建議：每日至少2000-2500ml，分散全天飲用
  - 避免一次大量飲水，以免加劇腹瀉

#### 綜合生活方式建議
基於睡眠、運動、飲水、壓力的多維度分析，提供整合性建議：
- **優先改善項目**：識別最影響腸道健康的生活方式因素
- **協同效應**：例如「充足睡眠 + 規律運動 + 充足飲水 = 最佳腸道功能」
- **警示信號**：識別需要醫師介入的模式（例如：持續高心率 + 睡眠障礙 + 症狀惡化）

### 6. 個人化建議
根據記錄週期提供下週飲食調整方案：

#### 觸發食物管理
- 明確指出需要注意的食物（含風險等級：high/moderate/watch）
- 說明觸發機制（FODMAP？纖維？刺激性？）
- 提供具體調整建議（減量、替代、改變烹調方式）

#### 安全食物強化
- 列出表現良好的食物
- 說明營養益處（抗發炎、修復、益生元等）
- 建議攝取頻率與份量

#### 營養補強計畫
提供 3-5 個具體可執行的建議：
- ✅ 具體：「增加富含 Omega-3 的魚類至每週 2-3 次（鮭魚 100-150g/次）」
- ❌ 模糊：「多吃魚」
- ✅ 具體：「將白米與糙米混合（2:1 比例），逐步增加纖維耐受度」
- ❌ 模糊：「增加纖維」

## 特別注意事項

### 參考台灣 IBD 營養指南
- 遵循台灣消化系醫學會 IBD 營養建議
- 考量在地飲食文化（白飯、麵食、豆製品等）
- 提供台灣常見食材的替代方案

### 疾病階段差異
- **活動期（發炎期）**：低纖維、低 FODMAP、易消化食物
- **緩解期**：逐步增加營養密度，補充不足營養素
- 根據症狀嚴重度調整建議強度

### 建議原則
- 所有建議需具體可執行（份量、頻率、烹調方式）
- 說明調整理由（營養學或臨床證據）
- 避免過度限制，保持飲食多樣性
- 誠實說明數據限制（樣本不足時標註）

### 證據要求
- 觸發食物需有明確時間關聯與症狀證據
- 避免將安全食物誤判為風險食物
- 不過度歸咎症狀（症狀 ≠ 當日所有食物都有問題）
- 數據不足時誠實說明，不過度推測

## 輸出品質標準
- 結論需引用具體日期與數據
- 每個建議都要說明營養學依據
- 提供可追蹤的監測指標（排便頻率、症狀評分等）
- 語氣專業但易懂，適合患者理解與執行`
  },
  flare_focus: {
    label: '症狀誘發偵測專家',
    description: '強調找到誘發 flare 的高風險食物與時間點。',
    prompt: `你是一位擁有 22 年臨床經驗、專攻 IBD flare 預防的臨床營養師。你的專長是精確識別誘發症狀的食物與飲食模式。

## 核心專業能力
- **症狀觸發因子識別**：FODMAP、乳糖、麩質、辛辣物、酒精、咖啡因
- **時間關聯分析**：即刻反應（0-2h）、延遲反應（6-24h）、累積效應（2-3天）
- **劑量效應評估**：少量安全但大量觸發的食物識別
- **組合效應分析**：單一食物安全但組合後觸發症狀的模式
- **烹調方式影響**：油炸、高溫、生食的風險差異

## 症狀嚴重度分級標準
- **輕度（1-2分）**：輕微不適，不影響日常活動
- **中度（3分）**：明顯不適，影響部分活動
- **重度（4-5分）**：嚴重不適，需休息或就醫

## 風險評估原則（嚴格執行！）

### high risk（高風險）- 必須同時滿足：
1. 該食物在「重度症狀日」（嚴重度 ≥3）出現 ≥2 次
2. 時間關聯明確（同日或次日出現症狀）
3. 該食物具有已知 IBD 觸發特性（高 FODMAP、刺激性、難消化）
4. 排除其他明顯混雜因素

### moderate risk（中度風險）：
1. 該食物在症狀日出現，但僅 1 次
2. 或：該食物出現多次，但症狀為輕-中度（2-3分）
3. 或：該食物屬已知刺激性，但本週樣本不足

### watch（觀察）：
1. 該食物與症狀日重疊，但缺乏明確證據
2. 或：該食物為高 FODMAP 但本週未見明顯症狀
3. 或：食物出現次數 < 2 次，樣本不足

### 不應列入監測（重要！）：
- 在低症狀日或無症狀日出現的食物
- 症狀日出現但該食物為低風險類型（如白飯、香蕉、煮熟蔬菜）
- 時間關聯不合理（例如症狀出現在攝取前）

## 分析架構

### foods_to_monitor（必須有充分證據）
對於每個列入的食物，必須提供：

1. **風險成分分析**：
   - FODMAP 類型（果聚糖？乳糖？山梨醇？）
   - 纖維類型（不溶性纖維含量高？）
   - 刺激性物質（辣椒素？咖啡因？酒精？）
   - 脂肪含量（高脂肪延緩胃排空？）

2. **症狀時間線**：
   - 列出具體日期與症狀嚴重度
   - 說明時間關聯（餐後多久出現症狀？）
   - 考慮延遲反應（隔夜或次日症狀）

3. **調整建議**（必須具體可執行）：
   - ✅ 正確：「將洋蔥份量減少至 30g 以下，或改用蔥白（低 FODMAP）替代」
   - ❌ 錯誤：「少吃洋蔥」
   - ✅ 正確：「將牛奶替換為無乳糖牛奶或杏仁奶，觀察 3-5 天」
   - ❌ 錯誤：「避免乳製品」

### supportive_foods（本週表現良好的食物）
列出在「低症狀日」或「無症狀日」出現的食物，且：
1. 該食物具有營養價值（不只是中性）
2. 該食物為低 FODMAP 或已知對 IBD 友善
3. 建議如何維持或增加攝取

### symptom_trends（模式識別）
分析以下模式：
1. **累積效應**：連續攝取某食物後症狀加重？
2. **時段效應**：早餐 vs 晚餐的差異？
3. **組合效應**：特定食物組合觸發症狀？
4. **劑量效應**：少量安全但大量觸發？

### 監測計畫（具體的實驗設計）
提供 2-3 個可執行的測試：
- ✅ 正確：「下週一、三、五暫停食用大蒜，對比週二、四、六的症狀，建立因果關係」
- ❌ 錯誤：「減少刺激性食物」

## 重要提醒
- 如果本週症狀少，不要勉強將所有食物標記為風險
- 必須區分「真正的誘發因子」vs「剛好在症狀日出現的無辜食物」
- 如果證據不足，誠實說明「需更多數據」，不要過度推測
- 避免將安全食物（白飯、香蕉、雞肉）標記為風險，除非有明確證據`
  },
  gut_healing: {
    label: '腸道修復教練',
    description: '偏重腸道修復、抗發炎與營養補強策略。',
    prompt: `你是一位擁有 25 年臨床經驗的腸道修復營養師，專精於 IBD 患者的黏膜修復與抗發炎營養策略。你的目標是協助患者維持緩解期並優化腸道健康。

## 核心專業能力
- **抗發炎營養素**：Omega-3（EPA/DHA 比例）、薑黃素、槲皮素、多酚類、維生素 D
- **黏膜修復關鍵**：麩醯胺酸、鋅、維生素 A、短鏈脂肪酸（丁酸）、骨膠原
- **益生元與益生菌**：低 FODMAP 益生元、耐受性發酵食品、菌株選擇
- **微量元素補充**：鐵、鈣、鎂、維生素 B12、葉酸的食物來源
- **纖維優化**：可溶性纖維 vs 不溶性纖維的比例、發酵性纖維的漸進增加

## 腸道修復營養階層

### 第一優先：抗發炎
評估本週是否攝取足夠的抗發炎食物：
- **Omega-3 魚類**：鮭魚、鯖魚、秋刀魚（目標：每週 2-3 次）
- **薑黃素來源**：薑黃（需搭配黑胡椒增加吸收）
- **多酚類**：綠茶、藍莓、石榴、特級初榨橄欖油
- **維生素 D**：蛋黃、香菇（日曬）、強化食品

### 第二優先：黏膜修復
評估本週是否攝取修復營養素：
- **麩醯胺酸**：骨湯、雞肉、魚類、蛋白
- **鋅**：牡蠣、南瓜籽、雞肉、鷹嘴豆
- **維生素 A**：南瓜、紅蘿蔔、地瓜、蛋黃
- **短鏈脂肪酸前驅物**：燕麥、香蕉、煮熟的馬鈴薯（抗性澱粉）

### 第三優先：腸道菌群
評估本週是否支持有益菌群：
- **低 FODMAP 益生元**：香蕉（成熟）、燕麥、地瓜、藍莓
- **耐受性發酵食品**：優格（如能耐受乳糖）、味噌、醃黃瓜
- **多樣性植物性食物**：目標每週 20-30 種不同蔬果

### 第四優先：微量元素
評估潛在缺乏風險：
- **鐵**：紅肉、肝臟、菠菜（搭配維生素 C）
- **鈣**：優格、硬豆腐、芝麻、小魚乾
- **B12**：肉類、蛋類、強化食品
- **鎂**：堅果、深綠色蔬菜、全穀類

## 分析架構

### summary（正向 + 改善方向）
1. **肯定本週亮點**：具體說明做得好的營養策略
2. **指出改善空間**：哪些營養素不足？哪些食物可能刺激腸道？
3. **整體評估**：目前處於哪個修復階段？緩解期穩定性如何？

### foods_to_monitor（降低刺激）
只列出可能影響腸道修復的食物：
1. **高 FODMAP 且症狀相關**
2. **不溶性纖維過多**（可能刺激發炎腸段）
3. **加工食品、精製糖**（促進發炎）
4. **高脂肪食物**（延緩消化、增加腸道負擔）

對於每個食物提供：
- 為何可能妨礙修復（具體機制）
- 建議的替代食物（營養等值但更友善）
- 如何調整烹調方式

### supportive_foods（積極促進修復）
列出本週表現優秀的食物，並說明：
1. **具體營養成分**（例：鮭魚提供 EPA 1.5g + DHA 1.0g / 100g）
2. **修復機制**（抗發炎？黏膜修復？菌群支持？）
3. **如何優化**：
   - 增加頻率（每週幾次？）
   - 搭配建議（薑黃 + 黑胡椒、維生素 C + 鐵）
   - 份量建議（具體克數或份數）

### gut_health_recommendations（階段性策略）
提供 3-5 個具體、可量化的營養強化計畫：

**抗發炎強化**：
- ✅ 正確：「增加 Omega-3 魚類至每週 3 次（每次 100-150g），選擇鮭魚、鯖魚或秋刀魚」
- ❌ 錯誤：「多吃魚」

**纖維優化**：
- ✅ 正確：「將白米與糙米混合（比例 2:1），每週增加糙米比例至 1:1，觀察耐受度」
- ❌ 錯誤：「增加纖維」

**益生元補充**：
- ✅ 正確：「每日攝取 1 根中等大小的成熟香蕉（低 FODMAP 益生元）+ 40g 燕麥片」
- ❌ 錯誤：「吃益生元食物」

**微量元素補充**：
- ✅ 正確：「每週攝取 2-3 次紅肉（每次 80-100g）或肝臟（50g），搭配富含維生素 C 的柳橙汁以增加鐵吸收」
- ❌ 錯誤：「補充鐵質」

### symptom_trends（修復進展評估）
分析本週是否處於：
1. **穩定緩解期**：症狀少且輕微，可積極補充營養
2. **輕微波動期**：偶有症狀，需維持低刺激飲食
3. **修復停滯期**：症狀未改善，需調整營養策略

### 下週修復計畫（具體行動）
設計 3-5 個可執行步驟：
1. **每日固定**：例如「每早餐攝取 40g 燕麥 + 10 顆藍莓」
2. **每週目標**：例如「每週 3 次魚類（2 次鮭魚、1 次鯖魚）」
3. **逐步增加**：例如「第 1-3 天維持現狀，第 4-7 天增加地瓜 50g」
4. **監測指標**：例如「記錄排便頻率、腹脹程度，評估纖維耐受度」

## 重要原則
- 修復需要時間，建議漸進式調整（每週 1-2 個改變）
- 優先維持穩定，避免激進改變觸發症狀
- 基於實際記錄的食物提建議，不推薦數據中未出現的食物類別
- 如果本週表現優秀，大力肯定，提供維持策略而非批評
- 所有建議都要有營養學證據支持（標註關鍵營養素及含量）

## 報告架構要求
- **Summary**：以結論口吻撰寫 2-3 句簡要總結（簡短即可）。
- **Reasoning Trace**：簡要說明推論邏輯（2-3 條即可）。
- **Daily Food Breakdown**：【最重要】務必完整分析「所有日期」「所有餐次」「所有食物」，標記「有益」/「中性」/「觀察」/「避免」並給出依據。這是報告的核心，必須完整覆蓋。
- **Evidence Notes**：簡要列出（1-2 條即可）。
- **Next Steps**：簡要列出（2-3 項即可）。

**特別強調**：daily_food_breakdown 是整份報告最重要的部分，必須完整覆蓋所有日期。請將大部分輸出空間用於詳細的每日食物分析，其他部分可以精簡。請確保每一天、每一餐、每種食物都有詳細評估。`
  },
  clinical_trace: {
    label: '臨床深度推論',
    description: '強調完整推論鏈與證據引用，適合專業醫療審閱的詳細報告。',
    prompt: `你是一位長期與腸胃科團隊合作的臨床營養師，專精 IBD 個案分析。請建立可供醫師、營養師共同審閱的詳細報告。

核心要求：
1. 任何結論都要引用 dataset 中的具體欄位（日期、症狀嚴重度、飲食份量、mealTypes、sampleNotes）。
2. 在 \`reasoning_trace\` 中，逐步呈現推論：觀察 → 假設 → 佐證 → 建議。每個步驟至少引用一個資料點。
3. 在 \`foods_to_monitor\` 與 \`supportive_foods\`，提供營養素含量、臨床研究依據或指南（可描述等級，如「實務經驗」或「系統性綜述」）。
4. \`daily_food_breakdown\` 需覆蓋每一天；若某餐未紀錄，仍要標註該餐缺資料並提醒補記。
5. \`next_steps\` 應列出監測指標（如排便頻率、腹痛 0-5 分、體重變化），方便後續隨訪。

語氣專業、具體，可直接納入病歷紀錄。`
  },
  daily_breakdown: {
    label: '逐日餐點解析',
    description: '聚焦每天每餐的食物亮點與風險，適合用於病患日常回顧與教育。',
    prompt: `你是一位擅長病患教育的 IBD 營養教練，需將資料轉化為每日具體指引。

請特別注意：
- summary 僅需 3-4 句，重點是整週趨勢與下一步行動。
- daily_food_breakdown 是核心：針對每一天至少列出早餐、午餐、晚餐（或資料中的 mealTypes）。若無資料，請註記「未紀錄」並給出提醒。
- foods_to_monitor 與 supportive_foods 要連結到 daily_food_breakdown，指出在哪些日期與餐次出現。
- evidence_notes 請加入「資料來源提醒」，例如「依據 foodImpacts[0].severity.highDays」。
- next_steps 的 maintain 與 monitor 要對應到每日餐點建議，experiments 則提出可在未來 3-7 天嘗試的微調（例如份量 +10g、烹調方式改變）。

請以緊湊但具體的語氣撰寫，便於病患快速理解每日重點。`
  }
} as const

export type PromptVariantKey = keyof typeof PROMPT_VARIANTS

const DEFAULT_PROMPT = PROMPT_VARIANTS.balanced.prompt

const CHUNK_ANALYSIS_PROMPT = `你是一位專精 IBD 的臨床營養師。系統會以 1-2 天為單位提供簡化後的飲食與症狀紀錄，請輸出精簡 JSON。

規則：
1. 僅分析 chunk dataset 中提供的日期。
2. 'daily_breakdown' 的結構需與主系統一致：date、day_summary、meals -> foods，且 suitability 只能是「有益 / 中性 / 觀察 / 避免」。
3. 每餐最多挑選 3 個最具代表性的食物（高風險或穩定者），reasoning 需引用份量/症狀/時間資訊。
4. 'risk_candidates' 與 'supportive_candidates' 為本 chunk 中值得關注的食物，提供 1-2 句證據與日期。
5. 'symptom_highlights' 用於描述這些日期最重要的症狀觀察。
6. 若缺少症狀或資料品質不佳，請在 'data_warnings' 清楚說明。
7. 'food_knowledge_base' 為可用的既有風險/營養資訊，請在合理時引用（若無對應條目可忽略）。

輸出固定 JSON：
{
  "chunk_id": "chunk-x",
  "date_range": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "daily_breakdown": [...],
  "risk_candidates": [
    {
      "food": "",
      "risk_level": "high | moderate | watch",
      "reasoning": [],
      "recommended_actions": [],
      "supporting_days": []
    }
  ],
  "supportive_candidates": [
    { "food": "", "benefits": [], "suggestions": [] }
  ],
  "symptom_highlights": [],
  "data_warnings": []
}

請勿輸出多餘文字或註解。`

const CHUNKED_SUMMARY_INSTRUCTIONS = `你正在使用「分段摘要模式」。
- chunk_insights 已提供每個日期的摘要與候選食物，請綜合評估後輸出與單次模式相同的 JSON 結構。
- daily_food_breakdown 由系統填充，你可以回傳空陣列 []。
- summary、foods_to_monitor、supportive_foods、symptom_trends、next_steps 等欄位務必引用 chunk_insights 或 aggregated_* 中的日期/食物/症狀。
- 若資料不足，請在 data_quality_notes 與 warning_signs 中附註。
- foodKnowledgeBase 提供既有風險/營養資訊，可作為加權參考（請在引用時標註 food_id 或食物名稱）。
- 請保持繁體中文並給出臨床等級建議。`

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDateOnly(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).split('T')[0] || String(value)
  }
  date.setHours(0, 0, 0, 0)
  return formatDateInput(date)
}

function computeSeverity(entry: DailySymptomEntry): number | null {
  const values = [entry.abdominal_pain, entry.diarrhea, entry.bloody_stool, entry.bloating].filter(
    (score) => typeof score === 'number' && score > 0
  ) as number[]

  if (values.length === 0) {
    return entry.overall_health && entry.overall_health > 0
      ? Number((6 - entry.overall_health).toFixed(2))
      : null
  }

  const average = values.reduce((sum, score) => sum + score, 0) / values.length
  return Number(average.toFixed(2))
}

function extractHighSymptoms(entry: DailySymptomEntry): string[] {
  const symptoms: Array<[string, number]> = [
    ['abdominal_pain', entry.abdominal_pain],
    ['diarrhea', entry.diarrhea],
    ['bloody_stool', entry.bloody_stool],
    ['bloating', entry.bloating]
  ]

  return symptoms
    .filter(([, value]) => typeof value === 'number' && value >= 3)
    .map(([name]) => name)
}

function averageScore(entries: DailySymptomEntry[], field: keyof CoreSymptomScores): number | null {
  const values = entries
    .map((entry) => entry[field])
    .filter((value) => typeof value === 'number' && value > 0) as number[]

  if (values.length === 0) {
    return null
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length
  return Number(average.toFixed(2))
}

function calculateTrendNotes(entries: DailySymptomEntry[]): string[] {
  const notes: string[] = []
  const history = entries
    .map((entry) => ({
      date: entry.recorded_date,
      severity: computeSeverity(entry)
    }))
    .filter((item) => item.severity !== null) as Array<{ date: string; severity: number }>

  if (history.length < 2) {
    return notes
  }

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
  const window = Math.min(3, sorted.length)
  const startAvg = sorted.slice(0, window).reduce((sum, item) => sum + item.severity, 0) / window
  const endAvg = sorted.slice(-window).reduce((sum, item) => sum + item.severity, 0) / window
  const delta = Number((endAvg - startAvg).toFixed(2))

  if (delta >= 0.5) {
    notes.push(`後期症狀平均較前期上升約 ${delta} 分，需留意近期誘因。`)
  } else if (delta <= -0.5) {
    notes.push(`後期症狀平均較前期下降約 ${Math.abs(delta)} 分，改善趨勢可延續。`)
  }

  const flareCount = sorted.filter((item) => item.severity >= 3).length
  if (flareCount >= 3) {
    notes.push('本週出現多次 (≥3) 症狀加劇日，需要加強誘因管理。')
  }

  return notes
}

function collectUniqueStrings(values: Array<string | undefined | null>): string[] {
  const set = new Set<string>()
  values.forEach((value) => {
    if (value && typeof value === 'string' && value.trim()) {
      set.add(value.trim())
    }
  })
  return Array.from(set)
}

function topSymptoms(symptomMap: Record<string, number>, limit: number): string[] {
  return Object.entries(symptomMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key)
}

function pickDates(records: SeverityRecord[], limit: number, minSeverity: number): string[] {
  return records
    .filter((record) => record.severity >= minSeverity)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, limit)
    .map((record) => record.date)
}

function splitFoodName(foodName: string): string[] {
  // Split by common punctuation separators used in food entries
  // Supports: comma (both half-width and full-width), semicolon, slash, plus, ampersand, Chinese comma, space
  const separatorPattern = /[,，;；/+&、\s]+/

  return foodName
    .split(separatorPattern)
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

function deduplicateFoodsByName(
  foods: Array<{ id?: string | null; name: string; category?: string | null }>
) {
  const seen = new Set<string>()
  return foods.filter((food) => {
    const key = `${food.id ?? 'unknown'}::${food.name.trim()}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function summarizeMealTypes(mealTypes: Record<string, number>): Record<string, number> {
  const summary: Record<string, number> = {}
  Object.entries(mealTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, value]) => {
      summary[key] = value
    })
  return summary
}

function defaultAnalysisSection(dataQualityWarnings: string[]): WeeklyIBDAnalysisResult['analysis'] {
  return {
    summary: '',
    foods_to_monitor: [],
    supportive_foods: [],
    symptom_trends: [],
    gut_health_recommendations: [],
    warning_signs: [],
    data_quality_notes: [...dataQualityWarnings],
    follow_up_actions: [],
    reasoning_trace: [],
    evidence_notes: [],
    daily_food_breakdown: [],
    next_steps: {
      maintain: [],
      monitor: [],
      experiments: []
    }
  }
}

function buildPromptRecommendations(): Array<PromptRecommendation> {
  return Object.entries(PROMPT_VARIANTS).map(([key, value]) => ({
    id: key,
    label: value.label,
    description: value.description,
    prompt: value.prompt
  }))
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((entry) => (typeof entry === 'string' ? entry : String(entry)))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function normalizeRiskLevel(value: unknown): RiskLevel {
  if (value === 'high' || value === 'moderate' || value === 'watch') {
    return value
  }
  return 'watch'
}

function normalizeSuitability(value: unknown): FoodSuitabilityLevel {
  if (typeof value !== 'string') {
    return '中性'
  }
  const normalized = value.trim()
  // Support both Chinese and English values for backwards compatibility
  if (normalized === '有益' || normalized === 'supportive') return '有益'
  if (normalized === '中性' || normalized === 'neutral') return '中性'
  if (normalized === '觀察' || normalized === 'watch') return '觀察'
  if (normalized === '避免' || normalized === 'avoid') return '避免'
  return '中性'
}

function normalizeDailyFoodBreakdown(value: unknown): DailyFoodAssessment[] {
  if (!Array.isArray(value)) {
    return []
  }

  const result: DailyFoodAssessment[] = []

  value.forEach((item) => {
    if (!isPlainRecord(item)) {
      return
    }

    const rawDate = typeof item.date === 'string' ? item.date.trim() : ''
    if (!rawDate) {
      return
    }

    const daySummary =
      typeof item.day_summary === 'string' && item.day_summary.trim().length > 0
        ? item.day_summary
        : undefined

    const meals = Array.isArray(item.meals) ? item.meals : []
    const normalizedMeals = meals
      .filter((meal): meal is Record<string, unknown> => isPlainRecord(meal))
      .map((meal) => {
        const mealName =
          typeof meal.meal === 'string' && meal.meal.trim().length > 0
            ? meal.meal
            : 'unspecified'
        const foods = Array.isArray(meal.foods) ? meal.foods : []
        const normalizedFoods = foods
          .filter((food): food is Record<string, unknown> => isPlainRecord(food))
          .map((food) => ({
            name: typeof food.name === 'string' ? food.name : '',
            suitability: normalizeSuitability(food.suitability),
            reasoning: normalizeStringArray(food.reasoning),
            symptom_links: normalizeStringArray(food.symptom_links),
            notes: normalizeStringArray(food.notes)
          }))
          .filter((food) => food.name.trim().length > 0)

        return {
          meal: mealName,
          foods: normalizedFoods
        }
      })
      .filter((meal) => meal.foods.length > 0)

    result.push({
      date: rawDate,
      day_summary: daySummary,
      meals: normalizedMeals
    })
  })

  return result
}

function normalizeNextSteps(value: unknown): NextStepPlan {
  const base: NextStepPlan = {
    maintain: [],
    monitor: [],
    experiments: []
  }

  if (!isPlainRecord(value)) {
    return base
  }

  return {
    maintain: normalizeStringArray(value.maintain),
    monitor: normalizeStringArray(value.monitor),
    experiments: normalizeStringArray(value.experiments)
  }
}

function normalizeAllFoodsOverview(value: unknown) {
  const base = {
    high_risk_foods: [] as string[],
    moderate_risk_foods: [] as string[],
    watch_foods: [] as string[],
    supportive_foods: [] as string[],
    neutral_foods: [] as string[]
  }

  if (!isPlainRecord(value)) {
    return base
  }

  return {
    high_risk_foods: normalizeStringArray(value.high_risk_foods),
    moderate_risk_foods: normalizeStringArray(value.moderate_risk_foods),
    watch_foods: normalizeStringArray(value.watch_foods),
    supportive_foods: normalizeStringArray(value.supportive_foods),
    neutral_foods: normalizeStringArray(value.neutral_foods)
  }
}

export class IBDWeeklyAnalysisAgent {
  private anthropic: Anthropic | null
  private readonly config: ClaudeConfig
  private readonly foodEntryService: SupabaseFoodEntriesService
  private readonly foodAnalysisService: FoodAnalysisCacheService
  private readonly adminClient: ReturnType<typeof createAdminClient>

  constructor(config?: Partial<ClaudeConfig>) {
    const apiKey = config?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? ''
    const model = config?.model ?? process.env.CLAUDE_MODEL ?? 'claude-3-5-haiku-latest'
    const maxTokens = config?.maxTokens ?? Number(process.env.CLAUDE_MAX_TOKENS ?? '4096')
    const temperature = config?.temperature ?? Number(process.env.CLAUDE_TEMPERATURE ?? '0.3')

    this.config = {
      apiKey,
      model,
      maxTokens,
      temperature
    }

    this.anthropic = apiKey ? new Anthropic({ apiKey }) : null
    this.adminClient = createAdminClient()
    this.foodEntryService = new SupabaseFoodEntriesService(this.adminClient)
    this.foodAnalysisService = new FoodAnalysisCacheService(this.adminClient)
  }

  static getPromptTemplates(): Array<PromptRecommendation> {
    return buildPromptRecommendations()
  }

  static getDefaultPrompt(): string {
    return DEFAULT_PROMPT
  }

  async analyze(userId: string, options: WeeklyAnalysisOptions = {}): Promise<WeeklyIBDAnalysisResult> {
    console.log('\n========== IBD Weekly Analysis Agent: analyze() ==========')
    console.log('📋 Input parameters:', {
      userId: userId.substring(0, 8) + '...',
      startDate: options.startDate,
      endDate: options.endDate,
      promptStyle: options.promptStyle,
      hasPromptOverride: !!options.promptOverride,
    })

    console.log('⏰ Resolving timeframe...')
    const timeframe = this.resolveTimeframe(options)
    console.log('✅ Timeframe resolved:', timeframe)

    console.log('📥 Fetching dataset from database...')
    const dataset = await this.fetchDataset(userId, timeframe)
    const uniqueFoodIds = this.extractFoodIds(dataset.foodEntries)
    const foodNameMap = this.buildFoodNameMap(dataset.foodEntries)

    console.log('📚 Resolving food knowledge base (cache lookup)...')
    const foodKnowledgeLookup = await this.foodAnalysisService.fetchAnalyses(uniqueFoodIds, {
      targetVersion: DEFAULT_FOOD_ANALYSIS_VERSION,
      maxAgeDays: DEFAULT_FOOD_ANALYSIS_MAX_AGE_DAYS
    })

    if (foodKnowledgeLookup.missing.length > 0) {
      console.warn('[FoodKnowledge] Missing analyses for foods:', foodKnowledgeLookup.missing.length)
    }

    if (foodKnowledgeLookup.stale.length > 0) {
      console.warn('[FoodKnowledge] Stale analyses detected:', foodKnowledgeLookup.stale.length)
    }

    if (foodKnowledgeLookup.fresh.length > 0) {
      try {
        await this.foodAnalysisService.incrementUsage(
          foodKnowledgeLookup.fresh.map((record) => record.food_id)
        )
      } catch (error) {
        console.warn('[FoodKnowledge] Unable to increment usage count:', error)
      }
    }

    const foodKnowledgeBase = this.buildFoodKnowledgeMap(foodKnowledgeLookup.fresh, foodNameMap)
    const foodKnowledgeAlerts = this.buildFoodKnowledgeAlerts({
      lookup: foodKnowledgeLookup,
      foodNameMap
    })

    console.log('🔨 Building analysis payload...')
    const payload = this.buildAnalysisPayload(dataset, timeframe, foodKnowledgeBase)
    const promptTemplate = this.resolvePrompt(options)
    const strategyDecision = this.selectAnalysisStrategy({
      payload: payload.payload,
      promptTemplate,
      maxTokens: this.config.maxTokens
    })
    console.log('🧮 Token strategy decision:', {
      mode: strategyDecision.mode,
      estimatedTokens: strategyDecision.estimatedTokens,
      maxTokens: this.config.maxTokens,
      chunkSize: strategyDecision.chunkSize ?? null,
      reason: strategyDecision.reason
    })
    console.log('📊 Payload summary:', {
      hasMinimalData: payload.hasMinimalData,
      foodEntries: payload.payload.trackingSummary.totalFoodEntries,
      uniqueFoods: payload.payload.trackingSummary.uniqueFoods,
      symptomEntries: payload.payload.trackingSummary.totalSymptomEntries,
      daysWithFoodOnly: payload.payload.trackingSummary.daysWithFoodOnly.length,
    })

    const baseResult: WeeklyIBDAnalysisResult = {
      success: true,
      method: 'fallback',
      prompt_used: '',
      timeframe,
      analysis_version: WEEKLY_ANALYSIS_VERSION,
      analysis_mode: strategyDecision.mode,
      token_strategy: {
        estimated_prompt_tokens: strategyDecision.estimatedTokens,
        max_tokens: this.config.maxTokens,
        mode: strategyDecision.mode,
        chunk_size: strategyDecision.chunkSize
      },
      food_knowledge: foodKnowledgeAlerts,
      totals: {
        food_entries: payload.payload.trackingSummary.totalFoodEntries,
        unique_foods: payload.payload.trackingSummary.uniqueFoods,
        symptom_entries: payload.payload.trackingSummary.totalSymptomEntries,
        days_without_symptom_logs: payload.payload.trackingSummary.daysWithFoodOnly.length
      },
      analysis: defaultAnalysisSection(payload.payload.dataQuality.warnings)
    }

    if (options.includePromptRecommendations) {
      baseResult.prompt_recommendations = buildPromptRecommendations()
    }

    if (foodKnowledgeAlerts.warnings.length > 0) {
      baseResult.token_strategy = {
        ...(baseResult.token_strategy || {
          estimated_prompt_tokens: strategyDecision.estimatedTokens,
          max_tokens: this.config.maxTokens,
          mode: strategyDecision.mode
        }),
        warnings: [
          ...(baseResult.token_strategy?.warnings || []),
          ...foodKnowledgeAlerts.warnings
        ]
      }
    }

    await this.enqueueFoodKnowledgeRefreshRequests(userId, foodKnowledgeAlerts).catch((error) => {
      console.warn('[FoodKnowledge] Failed to enqueue refresh requests:', error)
    })

    if (!payload.hasMinimalData) {
      console.warn('⚠️ Insufficient data for analysis!')
      console.warn('  - Minimum requirement: 3 food entries')
      console.warn('  - Current food entries:', payload.payload.trackingSummary.totalFoodEntries)
      const insufficient = this.buildFallbackAnalysis(payload, baseResult, true)
      insufficient.method = 'insufficient_data'
      insufficient.success = false
      console.log('❌ Returning insufficient_data result')
      console.log('========== IBD Weekly Analysis Agent: analyze() END ==========\n')
      return insufficient
    }

    if (strategyDecision.mode === 'chunked') {
      console.log('🚧 Entering chunked analysis workflow...')
      const chunked = await this.runChunkedAnalysis({
        payload,
        baseResult,
        promptTemplate,
        options,
        userId,
        strategyDecision
      })
      console.log('========== IBD Weekly Analysis Agent: analyze() END ==========\n')
      return chunked
    }

    const fullPrompt = this.composePrompt(promptTemplate, payload.payload)
    baseResult.prompt_used = fullPrompt

    if (!this.anthropic || !this.config.apiKey) {
      console.warn('⚠️ Claude API not configured, using fallback analysis')
      console.warn('  - Has Anthropic client:', !!this.anthropic)
      console.warn('  - Has API key:', !!this.config.apiKey)
      const fallback = this.buildFallbackAnalysis(payload, baseResult)
      console.log('✅ Returning fallback result')
      console.log('========== IBD Weekly Analysis Agent: analyze() END ==========\n')
      return fallback
    }

    try {
      console.log('🤖 Composing prompt for Claude API...')
      const prompt = baseResult.prompt_used
      console.log('  - Prompt length:', prompt.length, 'characters')

      console.log('📞 Calling Claude API...')
      const apiStartTime = Date.now()
      const raw = await this.callClaude(prompt, {
        userId,
        feature: 'weekly_ibd_analysis',
        metadata: {
          timeframe,
          promptLength: prompt.length
        }
      }, options.useMockMode)
      const apiDuration = ((Date.now() - apiStartTime) / 1000).toFixed(2)
      console.log(`✅ Claude API responded (${apiDuration}s)`)
      console.log('  - Response length:', raw.length, 'characters')

      console.log('🔍 Parsing Claude response...')
      const parsed = this.parseClaudeResponse(
        raw,
        baseResult,
        payload.payload.dataQuality.warnings,
        undefined
      )
      parsed.raw_ai_response = raw
      parsed.method = 'claude_api'
      console.log('✅ Analysis complete via Claude API')
      console.log('  - Foods to monitor:', parsed.analysis.foods_to_monitor?.length || 0)
      console.log('  - Supportive foods:', parsed.analysis.supportive_foods?.length || 0)
      console.log('  - Symptom trends:', parsed.analysis.symptom_trends?.length || 0)
      console.log('========== IBD Weekly Analysis Agent: analyze() END ==========\n')
      return parsed
    } catch (error) {
      console.error('❌ Claude API failed, using fallback:', error)
      if (error instanceof Error) {
        console.error('  - Error name:', error.name)
        console.error('  - Error message:', error.message)
      }
      const fallback = this.buildFallbackAnalysis(payload, baseResult)
      console.log('✅ Returning fallback result after API failure')
      console.log('========== IBD Weekly Analysis Agent: analyze() END ==========\n')
      return fallback
    }
  }

  private resolveTimeframe(options: WeeklyAnalysisOptions): Timeframe {
    // 如果有明確指定日期，使用指定的日期
    if (options.endDate && options.startDate) {
      const end = new Date(options.endDate)
      const start = new Date(options.startDate)

      if (Number.isNaN(end.getTime())) {
        throw new Error('Invalid endDate provided to IBDWeeklyAnalysisAgent')
      }
      if (Number.isNaN(start.getTime())) {
        throw new Error('Invalid startDate provided to IBDWeeklyAnalysisAgent')
      }

      end.setHours(0, 0, 0, 0)
      start.setHours(0, 0, 0, 0)

      const daysCovered = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

      return {
        startDate: formatDateInput(start),
        endDate: formatDateInput(end),
        daysCovered
      }
    }

    // 默認行為：計算過去 7 天（與 Dashboard 的 calculateWeeklyTrend 完全一致）
    // Dashboard 使用: for (let i = 6; i >= 0; i--) { date.setDate(now.getDate() - i) }
    const now = new Date()
    const end = new Date(now)
    end.setHours(0, 0, 0, 0)

    // 計算開始日期：從今天往回推 6 天（總共 7 天，包含今天）
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    start.setHours(0, 0, 0, 0)

    const daysCovered = 7 // 固定為 7 天

    console.log('[resolveTimeframe] 📅 Calculating past 7 days (matching Dashboard logic):')
    console.log(`  📅 Start: ${formatDateInput(start)} (${now.getDate() - 6} days ago from today)`)
    console.log(`  📅 End: ${formatDateInput(end)} (today)`)
    console.log(`  📊 Days covered: ${daysCovered}`)

    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
      daysCovered
    }
  }

  /**
   * 獲取排便記錄
   */
  private async fetchBowelMovements(
    userId: string,
    timeframe: Timeframe
  ): Promise<BowelMovementEntry[]> {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('bowel_movement_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_date', timeframe.startDate)
      .lte('recorded_date', timeframe.endDate)
      .order('occurred_at', { ascending: true })

    if (error) {
      console.error('[fetchBowelMovements] ❌ Error:', error)
      return []
    }

    console.log(`[fetchBowelMovements] 📥 Retrieved ${data?.length || 0} bowel movement entries`)
    return (data as BowelMovementEntry[]) || []
  }

  /**
   * 獲取 HealthKit 健康指標
   */
  private async fetchHealthMetrics(
    userId: string,
    timeframe: Timeframe
  ): Promise<HealthMetric[]> {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_status', 'synced')  // 只查詢已同步的數據
      .gte('recorded_date', timeframe.startDate)
      .lte('recorded_date', timeframe.endDate)
      .order('recorded_date', { ascending: true })

    if (error) {
      console.error('[fetchHealthMetrics] ❌ Error:', error)
      return []
    }

    console.log(`[fetchHealthMetrics] 📥 Retrieved ${data?.length || 0} health metrics`)

    // 統計各類型指標數量
    if (data && data.length > 0) {
      const metricCounts = data.reduce((acc, m) => {
        const metric = m as HealthMetric
        acc[metric.metric_type] = (acc[metric.metric_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log('[fetchHealthMetrics] 📊 Breakdown by type:', metricCounts)
    }

    return (data as HealthMetric[]) || []
  }

  private async fetchDataset(userId: string, timeframe: Timeframe): Promise<{
    foodEntries: FoodEntry[]
    symptomEntries: DailySymptomEntry[]
    bowelMovements: BowelMovementEntry[]
    healthMetrics: HealthMetric[]
  }> {
    // 🔍 Diagnostic logging for data fetching
    console.log('[fetchDataset] 🔍 Fetching data for analysis:')
    console.log('  👤 userId:', userId)
    console.log('  📅 startDate:', timeframe.startDate)
    console.log('  📅 endDate:', timeframe.endDate)
    console.log('  📊 daysCovered:', timeframe.daysCovered)

    // 並行查詢所有 4 個數據源
    const [foodEntries, symptomEntries, bowelMovements, healthMetrics] = await Promise.all([
      this.foodEntryService.getUserFoodEntriesByDateRange(
        userId,
        timeframe.startDate,
        timeframe.endDate
      ),
      DailySymptomService.getEntriesByRange(
        userId,
        timeframe.startDate,
        timeframe.endDate
      ),
      this.fetchBowelMovements(userId, timeframe),
      this.fetchHealthMetrics(userId, timeframe)
    ])

    // 🔍 Diagnostic logging for retrieved data
    console.log('[fetchDataset] 📥 Data retrieved:')
    console.log('  🍽️ Food entries:', foodEntries.length)
    console.log('  ❤️ Symptom entries:', symptomEntries.length)
    console.log('  💩 Bowel movements:', bowelMovements.length)
    console.log('  📊 Health metrics:', healthMetrics.length)

    if (foodEntries.length > 0) {
      const dates = foodEntries.map(e => e.consumed_at.split('T')[0])
      const uniqueDates = [...new Set(dates)]
      console.log('  📅 Unique food dates:', uniqueDates.sort())

      // 詳細列出每一天的飲食記錄數量
      const dateCountMap = new Map<string, number>()
      dates.forEach(date => {
        dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1)
      })
      console.log('  📊 Food entries by date:')
      Array.from(dateCountMap.entries()).sort().forEach(([date, count]) => {
        console.log(`    ${date}: ${count} entries`)
      })
    }

    if (symptomEntries.length > 0) {
      const dates = symptomEntries.map(e => e.recorded_date)
      const uniqueDates = [...new Set(dates)]
      console.log('  📅 Unique symptom dates:', uniqueDates.sort())

      // 詳細列出每一天的症狀記錄數量
      const dateCountMap = new Map<string, number>()
      dates.forEach(date => {
        dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1)
      })
      console.log('  📊 Symptom entries by date:')
      Array.from(dateCountMap.entries()).sort().forEach(([date, count]) => {
        console.log(`    ${date}: ${count} entries`)
      })
    }

    return {
      foodEntries,
      symptomEntries,
      bowelMovements,
      healthMetrics
    }
  }

  private buildAnalysisPayload(
    dataset: {
      foodEntries: FoodEntry[]
      symptomEntries: DailySymptomEntry[]
      bowelMovements: BowelMovementEntry[]
      healthMetrics: HealthMetric[]
    },
    timeframe: Timeframe,
    foodKnowledgeBase: Record<string, FoodKnowledgeSummary>
  ): {
    payload: WeeklyAnalysisPayload
    hasMinimalData: boolean
    highRiskFoods: Array<{ food: string; severity: number; dates: string[] }>
    protectiveFoods: Array<{ food: string; severity: number; occurrences: number }>
  } {
    const { foodEntries, symptomEntries, bowelMovements, healthMetrics } = dataset
    const symptomByDate = new Map<string, DailySymptomEntry>()
    symptomEntries.forEach((entry) => {
      symptomByDate.set(entry.recorded_date, entry)
    })

    const foodsByDate = new Map<
      string,
      Array<{ name: string; mealType: string | null; foodId?: string | null; category?: string | null }>
    >()
    const foodImpactsMap = new Map<string, AggregatedFoodImpact>()
    const uniqueFoodNames = new Set<string>()

    foodEntries.forEach((entry) => {
      const date = toDateOnly(entry.consumed_at)
      const originalFoodName = entry.food_name?.trim() || '未命名食物'

      // Split food name by punctuation to analyze each food item separately
      const individualFoods = splitFoodName(originalFoodName)

      // If splitting resulted in empty array, use original name
      const foodsToProcess = individualFoods.length > 0 ? individualFoods : [originalFoodName]

      // Debug log for food splitting
      if (individualFoods.length > 1) {
        console.log(`[buildAnalysisPayload] 🍽️ Split food: "${originalFoodName}" → [${individualFoods.map(f => `"${f}"`).join(', ')}]`)
      }

      foodsToProcess.forEach((foodName) => {
        const dayFoods = foodsByDate.get(date) ?? []
        dayFoods.push({
          name: foodName,
          mealType: entry.meal_type,
          foodId: entry.food_id,
          category: entry.food_category
        })
        foodsByDate.set(date, dayFoods)

        uniqueFoodNames.add(foodName)

        if (!foodImpactsMap.has(foodName)) {
          foodImpactsMap.set(foodName, {
            food: foodName,
            occurrences: 0,
            mealTypes: {},
            lastConsumedAt: entry.consumed_at,
            severityRecords: [],
            correlatedSymptoms: {},
            notes: new Set<string>()
          })
        }

        const record = foodImpactsMap.get(foodName)!
        record.occurrences += 1
        record.lastConsumedAt = !record.lastConsumedAt || record.lastConsumedAt < entry.consumed_at
          ? entry.consumed_at
          : record.lastConsumedAt

        const mealType = entry.meal_type || 'unspecified'
        record.mealTypes[mealType] = (record.mealTypes[mealType] || 0) + 1

        const symptomEntry = symptomByDate.get(date)
        if (symptomEntry) {
          const severity = computeSeverity(symptomEntry)
          if (severity !== null) {
            const related = Array.isArray(symptomEntry.related_food_entries)
              ? symptomEntry.related_food_entries.includes(entry.id)
              : false
            const keySymptoms = extractHighSymptoms(symptomEntry)
            record.severityRecords.push({
              date,
              severity,
              keySymptoms,
              related
            })
            keySymptoms.forEach((symptom) => {
              record.correlatedSymptoms[symptom] = (record.correlatedSymptoms[symptom] || 0) + 1
            })
          }
        }

        if (entry.notes) {
          record.notes.add(entry.notes)
        }
      })
    })

    const daysWithFoodOnly = Array.from(new Set(foodEntries.map((entry) => toDateOnly(entry.consumed_at)))).filter(
      (date) => !symptomByDate.has(date)
    )

    const foodImpacts = Array.from(foodImpactsMap.values()).map((record) => {
      const averageSeverity = record.severityRecords.length
        ? Number(
            (
              record.severityRecords.reduce((sum, item) => sum + item.severity, 0) /
              record.severityRecords.length
            ).toFixed(2)
          )
        : null

      const highDays = record.severityRecords.filter((item) => item.severity >= 3)
      const moderateCount = record.severityRecords.filter(
        (item) => item.severity >= 2 && item.severity < 3
      ).length
      const lowCount = record.severityRecords.filter((item) => item.severity < 2).length

      return {
        food: record.food,
        occurrences: record.occurrences,
        mealTypes: summarizeMealTypes(record.mealTypes),
        severity: {
          average: averageSeverity,
          highDays,
          moderateCount,
          lowCount
        },
        correlatedSymptoms: topSymptoms(record.correlatedSymptoms, 4),
        lastConsumedAt: record.lastConsumedAt,
        sampleNotes: Array.from(record.notes).slice(0, 3)
      }
    })

    const sortedFoodImpacts = foodImpacts
      .sort((a, b) => {
        const highDiff = b.severity.highDays.length - a.severity.highDays.length
        if (highDiff !== 0) return highDiff
        const avgA = a.severity.average ?? 0
        const avgB = b.severity.average ?? 0
        if (avgB !== avgA) return avgB - avgA
        return b.occurrences - a.occurrences
      })
      .slice(0, 12)

    const flareCandidates = symptomEntries
      .map((entry) => ({
        entry,
        severity: computeSeverity(entry),
        keySymptoms: extractHighSymptoms(entry)
      }))
      .filter((item) => item.severity !== null) as Array<{
        entry: DailySymptomEntry
        severity: number
        keySymptoms: string[]
      }>

    const flareDays = flareCandidates
      .filter((item) => item.severity >= 3)
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 5)
      .map((item) => ({
        date: item.entry.recorded_date,
        severity: Number(item.severity.toFixed(2)),
        keySymptoms: item.keySymptoms,
        foods: (foodsByDate.get(item.entry.recorded_date) || []).map((food) => food.name)
      }))

    const stableDays = flareCandidates
      .filter((item) => item.severity <= 2)
      .sort((a, b) => a.severity - b.severity)
      .slice(0, 5)
      .map((item) => ({
        date: item.entry.recorded_date,
        severity: Number(item.severity.toFixed(2)),
        foods: (foodsByDate.get(item.entry.recorded_date) || []).map((food) => food.name)
      }))

    // ========== 排便記錄分析（新增）==========
    const bowelMovementSummary = {
      totalMovements: bowelMovements.length,
      averageDailyFrequency: bowelMovements.length > 0
        ? Number((bowelMovements.length / timeframe.daysCovered).toFixed(2))
        : 0,
      bristolDistribution: bowelMovements.reduce((acc, bm) => {
        acc[bm.stool_type] = (acc[bm.stool_type] || 0) + 1
        return acc
      }, {} as Record<number, number>),
      bloodStoolIncidents: bowelMovements.filter(bm => bm.has_blood).length,
      concerningPatterns: [] as string[]
    }

    // 識別異常排便模式
    if (bowelMovements.length > 0) {
      const constipationCount = bowelMovements.filter(bm => bm.stool_type <= 2).length
      const diarrheaCount = bowelMovements.filter(bm => bm.stool_type === 5).length

      if (constipationCount > bowelMovements.length * 0.3) {
        bowelMovementSummary.concerningPatterns.push('便秘傾向（Bristol Scale 1-2 比例偏高）')
      }
      if (diarrheaCount > bowelMovements.length * 0.3) {
        bowelMovementSummary.concerningPatterns.push('腹瀉傾向（Bristol Scale 5 比例偏高）')
      }
      if (bowelMovementSummary.bloodStoolIncidents > 0) {
        bowelMovementSummary.concerningPatterns.push(`血便事件 ${bowelMovementSummary.bloodStoolIncidents} 次`)
      }
      if (bowelMovementSummary.averageDailyFrequency > 3) {
        bowelMovementSummary.concerningPatterns.push('排便頻率偏高（>3次/天）')
      } else if (bowelMovementSummary.averageDailyFrequency < 0.5) {
        bowelMovementSummary.concerningPatterns.push('排便頻率偏低（<0.5次/天）')
      }
    }

    console.log('[buildAnalysisPayload] 💩 Bowel Movement Summary:', bowelMovementSummary)

    // ========== HealthKit 健康指標分析（新增）==========
    const sleepMetrics = healthMetrics.filter(m => m.metric_type === 'sleep_analysis')
    const workoutMetrics = healthMetrics.filter(m => m.metric_type === 'workout')
    const heartRateMetrics = healthMetrics.filter(m => m.metric_type === 'heart_rate')
    const stepsMetrics = healthMetrics.filter(m => m.metric_type === 'steps')
    const activeCaloriesMetrics = healthMetrics.filter(m => m.metric_type === 'active_energy')
    const waterIntakeMetrics = healthMetrics.filter(m => m.metric_type === 'water_intake')

    // 睡眠分析
    const sleepAnalysis = sleepMetrics.length > 0 ? {
      averageHours: Number((sleepMetrics.reduce((sum, m) => sum + (m.numeric_value || 0), 0) / sleepMetrics.length / 60).toFixed(1)),
      qualityDays: sleepMetrics.filter(m => (m.numeric_value || 0) >= 420).length, // >= 7 hours
      poorDays: sleepMetrics.filter(m => (m.numeric_value || 0) < 360).length // < 6 hours
    } : null

    // 運動分析
    const activityAnalysis = {
      averageDailySteps: stepsMetrics.length > 0
        ? Math.round(stepsMetrics.reduce((sum, m) => sum + (m.numeric_value || 0), 0) / stepsMetrics.length)
        : 0,
      totalExerciseMinutes: workoutMetrics.reduce((sum, m) => sum + (m.numeric_value || 0), 0),
      activeDays: workoutMetrics.length
    }

    // 心率分析
    const restingHeartRateMetrics = heartRateMetrics.filter(m =>
      m.detail_payload && m.detail_payload.context === 'resting'
    )
    const heartRateAnalysis = restingHeartRateMetrics.length > 0 ? {
      averageResting: Math.round(
        restingHeartRateMetrics.reduce((sum, m) => sum + (m.numeric_value || 0), 0) / restingHeartRateMetrics.length
      ),
      variabilityIndicator: 'normal' as 'low' | 'normal' | 'high'
    } : null

    // 飲水分析
    const hydrationAnalysis = waterIntakeMetrics.length > 0 ? {
      averageDailyMl: Math.round(
        waterIntakeMetrics.reduce((sum, m) => sum + (m.numeric_value || 0), 0) / timeframe.daysCovered
      ),
      adequacyRate: Number(
        (waterIntakeMetrics.filter(m => (m.numeric_value || 0) >= 2000).length / timeframe.daysCovered * 100).toFixed(1)
      )
    } : null

    const healthKitSummary = {
      sleep: sleepAnalysis,
      activity: activityAnalysis,
      heartRate: heartRateAnalysis,
      hydration: hydrationAnalysis
    }

    console.log('[buildAnalysisPayload] 📊 HealthKit Summary:', {
      sleep: sleepAnalysis ? `${sleepAnalysis.averageHours}hrs avg` : 'no data',
      activity: `${activityAnalysis.averageDailySteps} steps avg`,
      heartRate: heartRateAnalysis ? `${heartRateAnalysis.averageResting}bpm avg` : 'no data',
      hydration: hydrationAnalysis ? `${hydrationAnalysis.averageDailyMl}ml avg` : 'no data'
    })

    // ========== 健康因子分析（現有）==========
    const healthFactors = calculateHealthFactors(symptomEntries)

    const lifestyleFactors = {
      commonTriggers: collectUniqueStrings(
        symptomEntries.flatMap((entry) => entry.triggers_identified || [])
      ),
      improvementFactors: collectUniqueStrings(
        symptomEntries.flatMap((entry) => entry.improvement_factors || [])
      ),
      medications: collectUniqueStrings(
        symptomEntries.flatMap((entry) => entry.medications_taken || [])
      ),
      activityLevels: symptomEntries.reduce<Record<string, number>>((acc, entry) => {
        if (entry.activity_level) {
          acc[entry.activity_level] = (acc[entry.activity_level] || 0) + 1
        }
        return acc
      }, {}),
      // ← 新增排便記錄摘要
      ...(bowelMovements.length > 0 ? {
        bowelMovementSummary
      } : {}),
      // ← 新增 HealthKit 摘要
      ...(healthMetrics.length > 0 ? {
        healthKitSummary
      } : {}),
      // ← 新增健康指標（現有）
      ...(healthFactors.hasHealthData && healthFactors.dataQuality !== 'poor' ? {
        healthMetrics: {
          overview: healthFactors.overview,
          correlations: healthFactors.correlations,
          dataQuality: healthFactors.dataQuality,
          qualityNotes: healthFactors.qualityNotes,
        }
      } : {})
    }

    const dataQualityWarnings: string[] = []
    if (symptomEntries.length === 0) {
      dataQualityWarnings.push('本週缺少症狀紀錄，無法進行完整趨勢分析。')
    }
    if (daysWithFoodOnly.length > 0) {
      dataQualityWarnings.push(`以下日期為健康日（無症狀記錄）：${daysWithFoodOnly.slice(0, 5).join(', ')}。這些日期可能代表身體狀況良好，無明顯不適。`)
    }
    if (symptomEntries.length > 0 && symptomEntries.length < 3) {
      dataQualityWarnings.push('症狀紀錄少於 3 筆，趨勢判斷可信度偏低。')
    }

    const allDates = new Set<string>([
      ...foodsByDate.keys(),
      ...Array.from(symptomByDate.keys())
    ])

    const dailyBreakdown: DailyFoodLog[] = Array.from(allDates)
      .sort()
      .map((date) => {
        const mealsMap = new Map<string, Array<{ id?: string | null; name: string; category?: string | null }>>()
        const foods = foodsByDate.get(date) ?? []
        foods.forEach((item) => {
          const key = item.mealType && item.mealType.trim().length > 0 ? item.mealType : 'unspecified'
          const mealFoods = mealsMap.get(key) ?? []
          mealFoods.push({
            id: item.foodId,
            name: item.name,
            category: item.category
          })
          mealsMap.set(key, mealFoods)
        })

        const symptomEntry = symptomByDate.get(date)
        let notes: string | null = null
        if (symptomEntry && 'notes' in symptomEntry && typeof symptomEntry.notes === 'string') {
          notes = symptomEntry.notes
        }

        return {
          date,
          meals: Array.from(mealsMap.entries()).map(([meal, mealFoods]) => ({
            meal,
            foods: deduplicateFoodsByName(mealFoods)
          })),
          symptomSummary: symptomEntry
            ? {
                severity: computeSeverity(symptomEntry),
                keySymptoms: extractHighSymptoms(symptomEntry),
                notes
              }
            : null
        }
      })

    const payload: WeeklyAnalysisPayload = {
      timeframe,
      trackingSummary: {
        totalFoodEntries: foodEntries.length,
        uniqueFoods: uniqueFoodNames.size,
        totalSymptomEntries: symptomEntries.length,
        totalBowelMovements: bowelMovements.length,
        totalHealthMetrics: healthMetrics.length,
        daysWithFoodOnly
      },
      foodImpacts: sortedFoodImpacts,
      symptomOverview: {
        averageScores: {
          overall_health: averageScore(symptomEntries, 'overall_health'),
          abdominal_pain: averageScore(symptomEntries, 'abdominal_pain'),
          diarrhea: averageScore(symptomEntries, 'diarrhea'),
          bloody_stool: averageScore(symptomEntries, 'bloody_stool'),
          bloating: averageScore(symptomEntries, 'bloating')
        },
        flareDays,
        stableDays,
        trendNotes: calculateTrendNotes(symptomEntries)
      },
      lifestyleFactors,
      dataQuality: {
        warnings: dataQualityWarnings,
        missingSymptomDates: daysWithFoodOnly.slice(0, 10)
      },
      dailyBreakdown,
      foodKnowledgeBase
    }

    const highRiskFoods = sortedFoodImpacts
      .filter((item) => item.severity.highDays.length > 0)
      .slice(0, 5)
      .map((item) => ({
        food: item.food,
        severity:
          item.severity.average ??
          (item.severity.highDays.length ? item.severity.highDays[0].severity : 0),
        dates: pickDates(item.severity.highDays, 3, 3)
      }))

    const protectiveFoods = sortedFoodImpacts
      .filter((item) =>
        item.occurrences >= 2 && (item.severity.average === null || item.severity.average <= 2)
      )
      .slice(0, 5)
      .map((item) => ({
        food: item.food,
        severity: item.severity.average ?? 0,
        occurrences: item.occurrences
      }))

    // 修改邏輯：只要有足夠的飲食記錄就可以分析，症狀記錄是可選的
    // 沒有症狀資料表示健康狀況良好，仍然可以提供飲食建議
    const hasMinimalData = foodEntries.length >= 3

    // Debug log for analysis payload summary
    console.log('[buildAnalysisPayload] 📊 Analysis payload summary:')
    console.log(`  📅 Date range: ${timeframe.startDate} ~ ${timeframe.endDate} (${timeframe.daysCovered} days)`)
    console.log(`  🍽️ Total food entries: ${foodEntries.length}`)
    console.log(`  🆔 Unique foods: ${uniqueFoodNames.size}`)
    console.log(`  💊 Symptom entries: ${symptomEntries.length}`)
    console.log(`  📆 Daily breakdown days: ${dailyBreakdown.length}`)
    console.log(`  ⚠️ High-risk foods: ${highRiskFoods.length}`)
    console.log(`  ✅ Protective foods: ${protectiveFoods.length}`)

    return {
      payload,
      hasMinimalData,
      highRiskFoods,
      protectiveFoods
    }
  }

  private extractFoodIds(entries: FoodEntry[]): string[] {
    const ids = new Set<string>()
    entries.forEach((entry) => {
      if (entry.food_id) {
        ids.add(entry.food_id)
      }
    })
    return Array.from(ids)
  }

  private buildFoodNameMap(
    entries: FoodEntry[]
  ): Record<string, { name: string; category?: string | null }> {
    const map: Record<string, { name: string; category?: string | null }> = {}
    entries.forEach((entry) => {
      if (entry.food_id && entry.food_name) {
        if (!map[entry.food_id]) {
          map[entry.food_id] = {
            name: entry.food_name,
            category: entry.food_category
          }
        }
      }
    })
    return map
  }

  private buildFoodKnowledgeMap(
    records: FoodAnalysisCache[],
    foodNameMap: Record<string, { name: string; category?: string | null }>
  ): Record<string, FoodKnowledgeSummary> {
    const result: Record<string, FoodKnowledgeSummary> = {}
    records.forEach((record) => {
      const meta = foodNameMap[record.food_id]
      const nutritionProfile = isPlainRecord(record.nutrition_profile)
        ? (record.nutrition_profile as Record<string, unknown>)
        : {}
      const riskProfile = isPlainRecord(record.risk_profile)
        ? (record.risk_profile as Record<string, unknown>)
        : {}
      result[record.food_id] = {
        food_id: record.food_id,
        food_name: meta?.name ?? '未知食物',
        food_category: meta?.category ?? null,
        analysis_version: record.analysis_version,
        analysis_source: record.analysis_source,
        analysis_updated_at: record.analysis_updated_at,
        nutrition_profile: nutritionProfile,
        risk_profile: riskProfile,
        supportive_attributes: Array.isArray(record.supportive_attributes)
          ? record.supportive_attributes
          : [],
        serving_guidelines: Array.isArray(record.serving_guidelines)
          ? record.serving_guidelines
          : [],
        analysis_notes: record.analysis_notes ?? null
      }
    })
    return result
  }

  private buildFoodKnowledgeAlerts(params: {
    lookup: FoodAnalysisLookupResult
    foodNameMap: Record<string, { name: string; category?: string | null }>
  }): FoodKnowledgeAlertSummary {
    const missingFoods: FoodKnowledgeAlertEntry[] = params.lookup.missing.map((foodId) => ({
      food_id: foodId,
      food_name: params.foodNameMap[foodId]?.name ?? '未知食物',
      category: params.foodNameMap[foodId]?.category ?? null,
      reason: 'missing'
    }))

    const staleFoods: FoodKnowledgeAlertEntry[] = params.lookup.stale.map((record) => ({
      food_id: record.food_id,
      food_name: params.foodNameMap[record.food_id]?.name ?? '未知食物',
      category: params.foodNameMap[record.food_id]?.category ?? null,
      last_updated_at: record.analysis_updated_at,
      reason: 'stale'
    }))

    const warnings: string[] = []
    if (missingFoods.length > 0) {
      warnings.push(`有 ${missingFoods.length} 項食物尚未建立 AI 分析`)
    }
    if (staleFoods.length > 0) {
      warnings.push(`有 ${staleFoods.length} 項食物的分析已超過建議的刷新時間`)
    }

    return {
      missingFoods,
      staleFoods,
      warnings
    }
  }

  private async enqueueFoodKnowledgeRefreshRequests(
    userId: string,
    alerts: FoodKnowledgeAlertSummary
  ): Promise<void> {
    const missingIds = alerts.missingFoods.map((item) => item.food_id)
    if (missingIds.length > 0) {
      await this.foodAnalysisService.enqueueRefreshRequests({
        foodIds: missingIds,
        requestedBy: userId,
        reason: 'missing'
      })
    }

    const staleIds = alerts.staleFoods.map((item) => item.food_id)
    if (staleIds.length > 0) {
      await this.foodAnalysisService.enqueueRefreshRequests({
        foodIds: staleIds,
        requestedBy: userId,
        reason: 'stale'
      })
    }
  }

  private selectAnalysisStrategy(params: {
    payload: WeeklyAnalysisPayload
    promptTemplate: string
    maxTokens: number
  }): StrategyDecision {
    const payloadLength = JSON.stringify(params.payload).length
    const estimatedTokens = Math.ceil(
      (payloadLength + params.promptTemplate.length) / 4
    )
    const safeMaxTokens = Math.max(params.maxTokens, 1)
    const ratio = estimatedTokens / safeMaxTokens
    const dayCount = params.payload.dailyBreakdown.length

    if (ratio >= 0.9) {
      return {
        mode: 'chunked',
        estimatedTokens,
        chunkSize: 1,
        reason: 'estimated_tokens_exceed_90_percent'
      }
    }

    if (ratio >= 0.7 || dayCount > 6) {
      return {
        mode: 'chunked',
        estimatedTokens,
        chunkSize: dayCount >= 6 ? 2 : 1,
        reason: 'estimated_tokens_exceed_70_percent_or_long_week'
      }
    }

    return {
      mode: 'single_pass',
      estimatedTokens,
      reason: 'within_safe_token_budget'
    }
  }

  private async runChunkedAnalysis(params: {
    payload: {
      payload: WeeklyAnalysisPayload
      hasMinimalData: boolean
      highRiskFoods: Array<{ food: string; severity: number; dates: string[] }>
      protectiveFoods: Array<{ food: string; severity: number; occurrences: number }>
    }
    baseResult: WeeklyIBDAnalysisResult
    promptTemplate: string
    options: WeeklyAnalysisOptions
    userId: string
    strategyDecision: StrategyDecision
  }): Promise<WeeklyIBDAnalysisResult> {
    if (!this.anthropic || !this.config.apiKey) {
      console.warn('[chunked] Claude API 未設定，回退至 fallback 分析')
      return this.buildFallbackAnalysis(params.payload, params.baseResult)
    }

    const chunkSize = Math.max(params.strategyDecision.chunkSize ?? 2, 1)
    const dailyBreakdown = params.payload.payload.dailyBreakdown
    const chunkGroups = this.partitionDailyBreakdown(dailyBreakdown, chunkSize)

    if (chunkGroups.length === 0) {
      console.warn('[chunked] 無 dailyBreakdown 資料，改用 fallback')
      return this.buildFallbackAnalysis(params.payload, params.baseResult)
    }

    console.log(`[chunked] Total chunks: ${chunkGroups.length} (chunkSize=${chunkSize})`)

    const chunkResults: ChunkSummaryResult[] = []

    for (let i = 0; i < chunkGroups.length; i++) {
      const chunkInput = this.buildChunkInput({
        days: chunkGroups[i],
        index: i,
        totalChunks: chunkGroups.length,
        payload: params.payload.payload
      })
      const chunkPrompt = this.composeChunkPrompt(chunkInput)

      try {
        const raw = await this.callClaude(
          chunkPrompt,
          {
            userId: params.userId,
            feature: 'weekly_ibd_analysis_chunk',
            metadata: {
              chunkId: chunkInput.chunkId,
              chunkIndex: i + 1,
              chunkCount: chunkGroups.length,
              chunkStats: chunkInput.chunkStats
            }
          },
          params.options.useMockMode
        )
        const parsedChunk = this.parseChunkResponse(raw, chunkInput)
        parsedChunk.rawResponse = raw
        chunkResults.push(parsedChunk)
      } catch (error) {
        console.error(`[chunked] Chunk ${chunkInput.chunkId} failed, using fallback summary`, error)
        chunkResults.push(this.buildDefaultChunkSummary(chunkInput, error))
      }
    }

    const combinedDaily = chunkResults.flatMap((chunk) => chunk.dailyBreakdown)
    if (combinedDaily.length === 0) {
      console.warn('[chunked] 無法取得任何 chunk daily breakdown，回退 fallback')
      return this.buildFallbackAnalysis(params.payload, params.baseResult)
    }

    const aggregated = this.mergeChunkInsights(chunkResults)
    const summaryDataset = this.composeChunkedSummaryDataset({
      payload: params.payload.payload,
      chunkResults,
      aggregated,
      chunkSize
    })
    const summaryPrompt = this.composeChunkedSummaryPrompt(params.promptTemplate, summaryDataset)

    params.baseResult.prompt_used = summaryPrompt
    params.baseResult.analysis_mode = 'chunked'
    params.baseResult.token_strategy = {
      estimated_prompt_tokens:
        params.baseResult.token_strategy?.estimated_prompt_tokens ??
        params.strategyDecision.estimatedTokens,
      max_tokens: this.config.maxTokens,
      mode: 'chunked',
      chunk_size: chunkSize,
      chunk_count: chunkResults.length,
      warnings: aggregated.dataWarnings
    }

    const combinedWarnings = Array.from(
      new Set([
        ...params.payload.payload.dataQuality.warnings,
        ...aggregated.dataWarnings
      ])
    )

    try {
      const rawSummary = await this.callClaude(
        summaryPrompt,
        {
          userId: params.userId,
          feature: 'weekly_ibd_analysis_summary',
          metadata: {
            chunkCount: chunkResults.length,
            chunkSize,
            aggregatedRiskFoods: aggregated.foodsToMonitor.length
          }
        },
        params.options.useMockMode
      )
      const parsed = this.parseClaudeResponse(
        rawSummary,
        params.baseResult,
        combinedWarnings,
        combinedDaily
      )
      parsed.raw_ai_response = rawSummary
      parsed.analysis_mode = 'chunked'
      parsed.token_strategy = params.baseResult.token_strategy
      parsed.analysis.daily_food_breakdown = combinedDaily
      parsed.analysis.data_quality_notes = combinedWarnings
      return parsed
    } catch (error) {
      console.error('[chunked] Summary prompt failed, fallback analysis', error)
      return this.buildFallbackAnalysis(params.payload, params.baseResult)
    }
  }

  private composePrompt(promptTemplate: string, payload: WeeklyAnalysisPayload): string {
    const dataset = JSON.stringify(payload, null, 2)

    // Extract all dates from dailyBreakdown to explicitly list them
    const allDates = payload.dailyBreakdown.map(day => day.date).join(', ')
    const dateCount = payload.dailyBreakdown.length

    return `${promptTemplate}

資料格式說明：以下提供的 JSON 已整理出一週的飲食與症狀摘要。請閱讀所有欄位，整合臨床判斷。

【最重要！必須完成】dataset 包含 ${dateCount} 天的資料，日期為：${allDates}

daily_food_breakdown 分析策略：
1. 你的輸出「必須」包含這 ${dateCount} 天的「每一天」
2. 每一天都必須有 date、day_summary 和 meals 欄位
3. 對於每一餐的食物，只需分析「代表性食物」：
   - 重點分析：可能有問題的食物（高風險、症狀相關）
   - 重點分析：有益的食物（營養價值高、抗發炎）
   - 如果當天飲食整體無問題，在 day_summary 中說明「當日飲食穩定，無明顯風險食物」
   - 不需要對每一種普通食物都詳細分析
4. 這樣可以節省 token，同時確保每一天都有完整評估

foodKnowledgeBase 說明：
- 以 food_id 為 key，提供既有的營養/風險/建議摘要。
- 若資料存在，請在 foods_to_monitor、supportive_foods 或 summary 中引用其風險標籤（例如：「根據快取：FODMAP 高 + 本週症狀」）。
- 若沒有對應的 food_id，保持原本推論即可。

回覆規範：
1. 請以繁體中文回覆。
2. 回覆必須是有效的 JSON，且不得包含多餘文字。
3. JSON 結構固定如下：
{
  "summary": "結論 (3-5 句，明確指出整體狀態、成功亮點與急迫風險，務必引用日期或數據佐證)",
  "all_foods_overview": {
    "high_risk_foods": ["食物名稱列表（高風險食物，需避免或減少）"],
    "moderate_risk_foods": ["食物名稱列表（中度風險，需觀察調整）"],
    "watch_foods": ["食物名稱列表（需持續觀察）"],
    "supportive_foods": ["食物名稱列表（有益食物，可繼續攝取）"],
    "neutral_foods": ["食物名稱列表（無明顯影響的中性食物）"]
  },
  "foods_to_monitor": [
    {
      "food": "食物名稱",
      "risk_level": "high | moderate | watch",
      "reasoning": ["列出 2-3 個具體證據 (日期/症狀/份量)"],
      "recommended_actions": ["列出最優先的控制措施 (份量/搭配/頻率)"],
      "supporting_days": ["YYYY-MM-DD", "... (依據日期至少 1 筆)"]
    }
  ],
  "supportive_foods": [
    {
      "food": "可強化的食物",
      "benefits": ["臨床益處 (含營養素或機制)"],
      "suggestions": ["如何保留或搭配 (份量/時段)"]
    }
  ],
  "symptom_trends": [
    {
      "pattern": "症狀趨勢描述",
      "evidence": ["資料佐證"],
      "recommendations": ["追蹤或調整建議"]
    }
  ],
  "gut_health_recommendations": ["腸道修復/抗發炎建議"],
  "warning_signs": ["需提醒的風險訊號"],
  "data_quality_notes": ["如有資料限制請說明"],
  "follow_up_actions": ["患者下週可執行的 2-3 個步驟"],
  "reasoning_trace": ["逐條說明判斷過程，務必引用資料中的日期、症狀或份量"],
  "evidence_notes": ["列出使用到的關鍵資料欄位或指標，協助日後稽核"],
  "daily_food_breakdown": [
    {
      "date": "YYYY-MM-DD",
      "day_summary": "當日整體評估與提醒",
      "meals": [
        {
          "meal": "breakfast | lunch | dinner | snack | unspecified",
          "foods": [
            {
              "name": "食物名稱",
              "suitability": "有益 | 中性 | 觀察 | 避免",
              "reasoning": ["指出評估依據或營養亮點/風險"],
              "symptom_links": ["與症狀的時間或嚴重度關聯；若無請回傳空陣列"],
              "notes": ["其他行動建議，可為空陣列"]
            }
          ]
        }
      ]
    }
  ],
  "next_steps": {
    "maintain": ["已證實穩定的策略，務必列出份量或頻率"],
    "monitor": ["需密切追蹤的食物或習慣，註明依據"],
    "experiments": ["建議循序漸進測試的調整，包含觀察指標"]
  }
}

請務必嚴格遵守以上 JSON 格式。
所有欄位都不可省略；若資料不足，請使用空字串或空陣列表示，切勿刪除欄位。
輸出必須具體引用 dataset 中的日期、症狀嚴重度、mealTypes、sampleNotes、foodImpacts、dailyBreakdown 等資訊。

【重要】all_foods_overview 必須列出本週所有攝取的食物：
- 此欄位提供整體飲食總覽，方便快速了解哪些食物需要調整
- high_risk_foods：列出所有高風險食物（risk_level = high）
- moderate_risk_foods：列出所有中度風險食物（risk_level = moderate）
- watch_foods：列出所有需觀察的食物（risk_level = watch）
- supportive_foods：列出所有有益的食物
- neutral_foods：列出無明顯影響的中性食物
- 所有在 dataset 中出現的食物都應該被歸類到這五個分類之一

【重要】daily_food_breakdown 必須包含「所有日期」的完整分析：
- 必須覆蓋 dataset 中 dailyBreakdown 裡的每一天
- 每一天必須包含所有用餐紀錄（breakfast, lunch, dinner, snack, unspecified）
- 每一餐必須分析該餐的所有食物
- 每種食物都要有明確的 suitability（有益/中性/觀察/避免）和 reasoning
- 這是報告的核心價值，請務必完整提供，不可省略任何日期

其他欄位（summary, reasoning_trace, foods_to_monitor 等）可以精簡，但 daily_food_breakdown 必須詳盡完整。

${payload.lifestyleFactors.healthMetrics ? `
## 健康因子與腸道症狀的綜合分析

### 可用的健康數據
本週提供以下 HealthKit 健康指標，請整合到飲食與症狀分析中：

${payload.lifestyleFactors.healthMetrics.overview.steps ? `- **運動數據**：平均每日 ${Math.round(payload.lifestyleFactors.healthMetrics.overview.steps.average)} 步（範圍：${payload.lifestyleFactors.healthMetrics.overview.steps.min}-${payload.lifestyleFactors.healthMetrics.overview.steps.max}）
  趨勢：${payload.lifestyleFactors.healthMetrics.overview.steps.trend === 'improving' ? '改善中 ↑' : payload.lifestyleFactors.healthMetrics.overview.steps.trend === 'declining' ? '下降中 ↓' : '穩定 →'}
  資料完整度：${Math.round(payload.lifestyleFactors.healthMetrics.overview.steps.coverage)}%` : ''}

${payload.lifestyleFactors.healthMetrics.overview.heartRate ? `- **心率數據**：平均 ${Math.round(payload.lifestyleFactors.healthMetrics.overview.heartRate.average)} bpm（範圍：${payload.lifestyleFactors.healthMetrics.overview.heartRate.min}-${payload.lifestyleFactors.healthMetrics.overview.heartRate.max}）
  趨勢：${payload.lifestyleFactors.healthMetrics.overview.heartRate.trend === 'improving' ? '改善中 ↑' : payload.lifestyleFactors.healthMetrics.overview.heartRate.trend === 'declining' ? '升高中 ↑' : '穩定 →'}
  資料完整度：${Math.round(payload.lifestyleFactors.healthMetrics.overview.heartRate.coverage)}%` : ''}

${payload.lifestyleFactors.healthMetrics.overview.stressScore ? `- **壓力數據**：平均分數 ${payload.lifestyleFactors.healthMetrics.overview.stressScore.average.toFixed(1)}/10（範圍：${payload.lifestyleFactors.healthMetrics.overview.stressScore.min}-${payload.lifestyleFactors.healthMetrics.overview.stressScore.max}）
  趨勢：${payload.lifestyleFactors.healthMetrics.overview.stressScore.trend === 'improving' ? '改善中 ↓' : payload.lifestyleFactors.healthMetrics.overview.stressScore.trend === 'declining' ? '惡化中 ↑' : '穩定 →'}
  資料完整度：${Math.round(payload.lifestyleFactors.healthMetrics.overview.stressScore.coverage)}%` : ''}

${payload.lifestyleFactors.healthMetrics.overview.waterIntake ? `- **水分數據**：平均每日 ${Math.round(payload.lifestyleFactors.healthMetrics.overview.waterIntake.average)}ml（範圍：${payload.lifestyleFactors.healthMetrics.overview.waterIntake.min}-${payload.lifestyleFactors.healthMetrics.overview.waterIntake.max}）
  趨勢：${payload.lifestyleFactors.healthMetrics.overview.waterIntake.trend === 'improving' ? '增加中 ↑' : payload.lifestyleFactors.healthMetrics.overview.waterIntake.trend === 'declining' ? '減少中 ↓' : '穩定 →'}
  資料完整度：${Math.round(payload.lifestyleFactors.healthMetrics.overview.waterIntake.coverage)}%` : ''}

${payload.lifestyleFactors.healthMetrics.overview.activeCalories ? `- **活動消耗**：平均每日 ${Math.round(payload.lifestyleFactors.healthMetrics.overview.activeCalories.average)} kcal（範圍：${payload.lifestyleFactors.healthMetrics.overview.activeCalories.min}-${payload.lifestyleFactors.healthMetrics.overview.activeCalories.max}）
  趨勢：${payload.lifestyleFactors.healthMetrics.overview.activeCalories.trend === 'improving' ? '增加中 ↑' : payload.lifestyleFactors.healthMetrics.overview.activeCalories.trend === 'declining' ? '減少中 ↓' : '穩定 →'}
  資料完整度：${Math.round(payload.lifestyleFactors.healthMetrics.overview.activeCalories.coverage)}%` : ''}

**資料品質**：${payload.lifestyleFactors.healthMetrics.dataQuality === 'excellent' ? '優秀' : payload.lifestyleFactors.healthMetrics.dataQuality === 'good' ? '良好' : payload.lifestyleFactors.healthMetrics.dataQuality === 'fair' ? '尚可' : '不足'}
${payload.lifestyleFactors.healthMetrics.qualityNotes.length > 0 ? `**注意事項**：${payload.lifestyleFactors.healthMetrics.qualityNotes.join('；')}` : ''}

${payload.lifestyleFactors.healthMetrics.correlations.length > 0 ? `### 健康-症狀關聯發現

以下是透過統計分析發現的健康指標與症狀關聯：

${payload.lifestyleFactors.healthMetrics.correlations.map(corr => `**${corr.metricLabel}**：
- 低範圍（${corr.ranges.low.label}）：平均症狀 ${corr.ranges.low.avgSymptomScore} 分（${corr.ranges.low.dayCount} 天）
- 中範圍（${corr.ranges.medium.label}）：平均症狀 ${corr.ranges.medium.avgSymptomScore} 分（${corr.ranges.medium.dayCount} 天）
- 高範圍（${corr.ranges.high.label}）：平均症狀 ${corr.ranges.high.avgSymptomScore} 分（${corr.ranges.high.dayCount} 天）
- 關聯強度：${corr.significance === 'strong' ? '強' : corr.significance === 'moderate' ? '中等' : corr.significance === 'weak' ? '弱' : '資料不足'}
- 初步洞察：${corr.insight}`).join('\n\n')}` : ''}

### 分析要求

請將以上健康指標整合到你的分析中，重點關注：

1. **運動與腸道健康**（若有步數/活動消耗數據）
   - 分析活動量與症狀嚴重度的關聯
   - 是否存在「最佳運動量」區間？
   - 過度或不足的運動如何影響症狀
   - 推薦：低衝擊運動、散步、瑜伽等適合 IBD 患者的活動

2. **水分與消化系統**（若有飲水量數據）
   - 評估飲水量充足性（IBD 建議 2000-3000ml/日）
   - 脫水與症狀的關聯性
   - 補水時機建議（餐前/餐後/運動後）

3. **壓力與發炎反應**（若有壓力分數數據）
   - 高壓力日與症狀發作的時間關聯
   - 壓力管理策略（冥想、深呼吸、正念）
   - 壓力下的飲食建議（避免刺激性食物）

4. **心率與身體狀態**（若有心率數據）
   - 靜息心率升高是否反映發炎？
   - 心率變異與症狀的關係

5. **綜合生活型態建議**
   - 整合飲食、運動、壓力管理的最佳模式
   - 預測性建議：維持某些指標可能改善症狀
   - 具體可執行的生活調整方案

**重要提醒**：
- 在 summary 中納入健康因子的重要發現
- 在 gut_health_recommendations 中加入運動、水分、壓力管理建議
- 在 follow_up_actions 中包含健康指標追蹤建議
- 如果資料品質為「尚可」或「不足」，請在分析中明確說明樣本量限制，避免過度解讀
` : ''}
週期資料：
\u0060\u0060\u0060json
${dataset}
\u0060\u0060\u0060`
  }

  private partitionDailyBreakdown(days: DailyFoodLog[], chunkSize: number): DailyFoodLog[][] {
    const size = Math.max(Math.floor(chunkSize), 1)
    const chunks: DailyFoodLog[][] = []
    for (let i = 0; i < days.length; i += size) {
      chunks.push(days.slice(i, i + size))
    }
    return chunks
  }

  private buildChunkInput(params: {
    days: DailyFoodLog[]
    index: number
    totalChunks: number
    payload: WeeklyAnalysisPayload
  }): ChunkAnalysisInput {
    const chunkId = `chunk-${String(params.index + 1).padStart(2, '0')}`
    let mealCount = 0
    let foodsLogged = 0
    let symptomEntries = 0
    const foodNameSet = new Set<string>()
    const foodIdSet = new Set<string>()

    params.days.forEach((day) => {
      mealCount += day.meals.length
      day.meals.forEach((meal) => {
        const foods = meal.foods || []
        foodsLogged += foods.length
        foods.forEach((food) => {
          if (food?.name && food.name.trim().length > 0) {
            foodNameSet.add(food.name.trim())
          }
          if (food?.id) {
            foodIdSet.add(food.id)
          }
        })
      })
      if (day.symptomSummary && day.symptomSummary.severity !== null && day.symptomSummary.severity !== undefined) {
        symptomEntries += 1
      }
    })

    const relevantFoodImpacts = params.payload.foodImpacts
      .filter((impact) => foodNameSet.has(impact.food))
      .slice(0, 12)

    const chunkKnowledgeBase = this.pickFoodKnowledgeBase(
      params.payload.foodKnowledgeBase,
      foodIdSet
    )

    return {
      chunkId,
      index: params.index,
      totalChunks: params.totalChunks,
      days: params.days,
      chunkStats: {
        dayCount: params.days.length,
        mealCount,
        foodsLogged,
        symptomEntries
      },
      timeframe: params.payload.timeframe,
      relevantFoodImpacts,
      dataQuality: params.payload.dataQuality,
      lifestyleFactors: params.payload.lifestyleFactors,
      foodKnowledgeBase: chunkKnowledgeBase
    }
  }

  private pickFoodKnowledgeBase(
    base: Record<string, FoodKnowledgeSummary>,
    ids: Set<string>
  ): Record<string, FoodKnowledgeSummary> {
    if (!ids.size) {
      return {}
    }
    const subset: Record<string, FoodKnowledgeSummary> = {}
    ids.forEach((id) => {
      if (base[id]) {
        subset[id] = base[id]
      }
    })
    return subset
  }

  private composeChunkPrompt(input: ChunkAnalysisInput): string {
    const startDate = input.days[0]?.date ?? input.timeframe.startDate
    const endDate = input.days[input.days.length - 1]?.date ?? input.timeframe.endDate
    const dataset = {
      chunk_id: input.chunkId,
      chunk_index: input.index + 1,
      total_chunks: input.totalChunks,
      chunk_stats: input.chunkStats,
      days: input.days,
      relevant_food_impacts: input.relevantFoodImpacts,
      data_quality: input.dataQuality,
      lifestyle_factors: input.lifestyleFactors,
      food_knowledge_base: input.foodKnowledgeBase
    }

    return `${CHUNK_ANALYSIS_PROMPT}

Chunk ${input.index + 1}/${input.totalChunks}：${startDate} ~ ${endDate}

\`\`\`json
${JSON.stringify(dataset, null, 2)}
\`\`\``
  }

  private parseChunkResponse(raw: string, chunkInput: ChunkAnalysisInput): ChunkSummaryResult {
    try {
      let cleanedRaw = raw.trim()
      if (cleanedRaw.startsWith('```json')) {
        cleanedRaw = cleanedRaw.replace(/^```json\s*/, '').replace(/```\s*$/, '')
      } else if (cleanedRaw.startsWith('```')) {
        cleanedRaw = cleanedRaw.replace(/^```\s*/, '').replace(/```\s*$/, '')
      }

      const parsed = JSON.parse(cleanedRaw) as ChunkAnalysisResponseData
      const riskCandidates = Array.isArray(parsed.risk_candidates)
        ? parsed.risk_candidates
            .filter((item): item is NonNullable<ChunkAnalysisResponseData['risk_candidates']>[number] => isPlainRecord(item))
            .map((item) => ({
              food: typeof item.food === 'string' ? item.food : '',
              risk_level: normalizeRiskLevel(item.risk_level),
              reasoning: normalizeStringArray(item.reasoning),
              recommended_actions: normalizeStringArray(item.recommendations),
              supporting_days: normalizeStringArray(item.supporting_days)
            }))
            .filter((item) => item.food.trim().length > 0)
        : []

      const supportiveCandidates = Array.isArray(parsed.supportive_candidates)
        ? parsed.supportive_candidates
            .filter((item): item is NonNullable<ChunkAnalysisResponseData['supportive_candidates']>[number] => isPlainRecord(item))
            .map((item) => ({
              food: typeof item.food === 'string' ? item.food : '',
              benefits: normalizeStringArray(item.benefits),
              suggestions: normalizeStringArray(item.suggestions)
            }))
            .filter((item) => item.food.trim().length > 0)
        : []

      const symptomHighlights = normalizeStringArray(parsed.symptom_highlights)
      const dataWarnings = normalizeStringArray(parsed.data_warnings)
      let dailyBreakdown = normalizeDailyFoodBreakdown(parsed.daily_breakdown)

      if (dailyBreakdown.length === 0) {
        const fallbackDaily = this.buildDefaultChunkSummary(chunkInput).dailyBreakdown
        dailyBreakdown = fallbackDaily
        dataWarnings.push('chunk_response_missing_daily_breakdown')
      }

      return {
        chunkId: typeof parsed.chunk_id === 'string' && parsed.chunk_id.trim().length > 0
          ? parsed.chunk_id
          : chunkInput.chunkId,
        startDate: parsed.date_range?.start || chunkInput.days[0]?.date || chunkInput.timeframe.startDate,
        endDate:
          parsed.date_range?.end ||
          chunkInput.days[chunkInput.days.length - 1]?.date ||
          chunkInput.timeframe.endDate,
        index: chunkInput.index,
        dailyBreakdown,
        riskCandidates,
        supportiveCandidates,
        symptomHighlights,
        dataWarnings
      }
    } catch (error) {
      console.error('[chunked] Failed to parse chunk JSON, using default summary', error)
      return this.buildDefaultChunkSummary(chunkInput, error)
    }
  }

  private buildDefaultChunkSummary(chunkInput: ChunkAnalysisInput, error?: unknown): ChunkSummaryResult {
    const startDate = chunkInput.days[0]?.date || chunkInput.timeframe.startDate
    const endDate = chunkInput.days[chunkInput.days.length - 1]?.date || chunkInput.timeframe.endDate
    const warningMessages = ['AI chunk 摘要失敗，已使用預設文案。']
    if (error instanceof Error) {
      warningMessages.push(`reason: ${error.message.substring(0, 120)}`)
    }

    const fallbackDaily: DailyFoodAssessment[] = chunkInput.days.map((day) => ({
      date: day.date,
      day_summary:
        day.symptomSummary?.notes ||
        (day.symptomSummary
          ? `症狀嚴重度 ${day.symptomSummary.severity ?? '無紀錄'}`
          : '僅有飲食紀錄，缺少症狀資料。'),
      meals: day.meals.map((meal) => {
        const sampleFoods = Array.isArray(meal.foods) ? meal.foods.slice(0, 3) : []
        return {
          meal: meal.meal,
          foods: sampleFoods.map((food) => {
            const foodName =
              typeof food === 'string' ? food : food?.name ?? '未提供食物名稱'
            return {
              name: foodName,
              suitability: '觀察' as FoodSuitabilityLevel,
              reasoning: ['AI 摘要失敗，自動填寫占位訊息。'],
              symptom_links: [],
              notes: []
            }
          })
        }
      })
    }))

    return {
      chunkId: chunkInput.chunkId,
      startDate,
      endDate,
      index: chunkInput.index,
      dailyBreakdown: fallbackDaily,
      riskCandidates: [],
      supportiveCandidates: [],
      symptomHighlights: ['AI chunk 摘要失敗，請留意資料品質。'],
      dataWarnings: warningMessages
    }
  }

  private mergeChunkInsights(chunks: ChunkSummaryResult[]): MergedChunkInsights {
    const riskPriority: Record<RiskLevel, number> = {
      high: 3,
      moderate: 2,
      watch: 1
    }
    const monitorMap = new Map<string, ChunkSummaryResult['riskCandidates'][number]>()
    const supportiveMap = new Map<string, ChunkSummaryResult['supportiveCandidates'][number]>()
    const symptomSet = new Set<string>()
    const warningSet = new Set<string>()

    chunks.forEach((chunk) => {
      chunk.riskCandidates.forEach((candidate) => {
        const key = candidate.food.toLowerCase()
        const existing = monitorMap.get(key)
        if (!existing || riskPriority[candidate.risk_level] > riskPriority[existing.risk_level]) {
          monitorMap.set(key, {
            ...candidate,
            reasoning: Array.from(new Set(candidate.reasoning)),
            recommended_actions: Array.from(new Set(candidate.recommended_actions)),
            supporting_days: Array.from(new Set(candidate.supporting_days))
          })
        } else {
          existing.reasoning = Array.from(new Set([...existing.reasoning, ...candidate.reasoning]))
          existing.recommended_actions = Array.from(
            new Set([...existing.recommended_actions, ...candidate.recommended_actions])
          )
          existing.supporting_days = Array.from(
            new Set([...existing.supporting_days, ...candidate.supporting_days])
          )
        }
      })

      chunk.supportiveCandidates.forEach((candidate) => {
        const key = candidate.food.toLowerCase()
        const existing = supportiveMap.get(key)
        if (!existing) {
          supportiveMap.set(key, {
            ...candidate,
            benefits: Array.from(new Set(candidate.benefits)),
            suggestions: Array.from(new Set(candidate.suggestions))
          })
        } else {
          existing.benefits = Array.from(new Set([...existing.benefits, ...candidate.benefits]))
          existing.suggestions = Array.from(
            new Set([...existing.suggestions, ...candidate.suggestions])
          )
        }
      })

      chunk.symptomHighlights.forEach((note) => symptomSet.add(note))
      chunk.dataWarnings.forEach((note) => warningSet.add(note))
    })

    return {
      foodsToMonitor: Array.from(monitorMap.values()),
      supportiveFoods: Array.from(supportiveMap.values()),
      symptomHighlights: Array.from(symptomSet),
      dataWarnings: Array.from(warningSet)
    }
  }

  private composeChunkedSummaryDataset(params: {
    payload: WeeklyAnalysisPayload
    chunkResults: ChunkSummaryResult[]
    aggregated: MergedChunkInsights
    chunkSize: number
  }): ChunkedSummaryDataset {
    const chunkRanges = params.chunkResults.map((chunk) => ({
      chunk_id: chunk.chunkId,
      start: chunk.startDate,
      end: chunk.endDate,
      day_count: chunk.dailyBreakdown.length
    }))

    const chunkInsights = params.chunkResults.map((chunk) => ({
      chunk_id: chunk.chunkId,
      date_range: {
        start: chunk.startDate,
        end: chunk.endDate
      },
      day_summaries: chunk.dailyBreakdown.map((day) => ({
        date: day.date,
        summary: day.day_summary
      })),
      risk_candidates: chunk.riskCandidates,
      supportive_candidates: chunk.supportiveCandidates,
      symptom_highlights: chunk.symptomHighlights,
      data_warnings: chunk.dataWarnings
    }))

    return {
      timeframe: params.payload.timeframe,
      trackingSummary: params.payload.trackingSummary,
      symptomOverview: params.payload.symptomOverview,
      lifestyleFactors: params.payload.lifestyleFactors,
      dataQuality: params.payload.dataQuality,
      aggregatedFoodImpacts: params.payload.foodImpacts.slice(0, 20),
      foodKnowledgeBase: params.payload.foodKnowledgeBase,
      chunk_meta: {
        chunk_size: params.chunkSize,
        chunk_count: params.chunkResults.length,
        chunk_ranges: chunkRanges
      },
      chunk_insights: chunkInsights,
      aggregated_risk_candidates: params.aggregated.foodsToMonitor,
      aggregated_supportive_candidates: params.aggregated.supportiveFoods,
      aggregated_symptom_highlights: params.aggregated.symptomHighlights
    }
  }

  private composeChunkedSummaryPrompt(promptTemplate: string, dataset: ChunkedSummaryDataset): string {
    const serialized = JSON.stringify(dataset, null, 2)
    return `${promptTemplate}

${CHUNKED_SUMMARY_INSTRUCTIONS}

chunk_mode_dataset:
\`\`\`json
${serialized}
\`\`\``
  }

  private resolvePrompt(options: WeeklyAnalysisOptions): string {
    if (options.promptOverride && options.promptOverride.trim().length > 0) {
      return options.promptOverride.trim()
    }

    if (options.promptStyle && PROMPT_VARIANTS[options.promptStyle]) {
      return PROMPT_VARIANTS[options.promptStyle].prompt
    }

    return DEFAULT_PROMPT
  }

  private async callClaude(prompt: string, usageContext?: ClaudeUsageContext, forceMockMode = false): Promise<string> {
    // 🧪 測試模式：使用模擬資料，完全免費（參數優先於環境變數）
    if (forceMockMode || process.env.AI_MOCK_MODE === 'true') {
      console.log('[callClaude] 🧪 Mock mode enabled - returning mock data (FREE)')
      console.log('[callClaude] 🎭 Source:', forceMockMode ? 'User preference' : 'Environment variable')
      return this.generateMockAnalysis()
    }

    if (!this.anthropic) {
      throw new Error('Anthropic client is not initialized')
    }

    const validModels = [
      'claude-3-5-haiku-20241022',
      'claude-3-5-haiku-latest',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-latest',
      'claude-3-haiku-20240307',
      'claude-sonnet-4-20250514',
      'claude-sonnet-4-5-20250929'
    ]

    let modelToUse = this.config.model
    if (!validModels.includes(modelToUse)) {
      console.warn(`[IBDWeeklyAnalysisAgent] Model ${modelToUse} not in allowlist, fallback to claude-3-5-haiku-latest`)
      modelToUse = 'claude-3-5-haiku-latest'
    }

    console.log('[callClaude] 🤖 API Request Configuration:')
    console.log(`  📦 Model: ${modelToUse}`)
    console.log(`  🎯 Max tokens: ${this.config.maxTokens}`)
    console.log(`  🌡️ Temperature: ${this.config.temperature}`)
    console.log(`  📝 Prompt length: ${prompt.length} characters`)

    const metadata = {
      ...(usageContext?.metadata || {}),
      promptLength: prompt.length
    }

    try {
      const stream = await this.anthropic.messages.stream({
        model: modelToUse,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      let fullText = ''
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullText += chunk.delta.text
        }
      }

      const finalMessage = await stream.finalMessage()

      console.log('[callClaude] ✅ API Response (streaming):')
      console.log(`  📊 Model used: ${finalMessage.model}`)
      console.log(`  🔢 Input tokens: ${finalMessage.usage.input_tokens}`)
      console.log(`  📤 Output tokens: ${finalMessage.usage.output_tokens}`)
      console.log(`  ⚠️ Stop reason: ${finalMessage.stop_reason}`)
      console.log(`  📏 Response length: ${fullText.length} characters`)

      await recordAIUsage({
        userId: usageContext?.userId,
        feature: usageContext?.feature ?? 'weekly_ibd_analysis',
        model: finalMessage.model,
        operation: 'messages.stream',
        requestId: finalMessage.id,
        inputTokens: finalMessage.usage?.input_tokens,
        outputTokens: finalMessage.usage?.output_tokens,
        metadata
      })

      if (!fullText || fullText.trim().length === 0) {
        throw new Error('Empty response from Claude')
      }

      return fullText.trim()
    } catch (error) {
      await recordAIUsage({
        userId: usageContext?.userId,
        feature: usageContext?.feature ?? 'weekly_ibd_analysis',
        model: modelToUse,
        operation: 'messages.stream',
        status: 'failed',
        metadata: {
          ...metadata,
          error: error instanceof Error ? error.message : 'Unknown Claude error'
        }
      })
      throw error
    }
  }

  /**
   * 🧪 生成模擬的 AI 分析資料（測試模式用，完全免費）
   */
  private generateMockAnalysis(): string {
    const mockResponse = {
      summary: "測試模式：本週飲食整體穩定，症狀控制良好。建議持續觀察特定食物的影響。",
      overall_symptom_trend: "穩定",
      correlation_insights: [
        "辣椒與腹瀉症狀呈現中度相關性（相關係數 0.65）",
        "白飯在症狀輕微時食用，未見明顯惡化趨勢"
      ],
      foods_to_monitor: [
        {
          food: "辣椒",
          reasoning: ["多次攝取後 6-12 小時出現腹瀉", "症狀嚴重度平均 6.5/10"],
          severity_pattern: "高風險",
          recommendation: "建議暫停食用 2-4 週，觀察症狀改善情況"
        },
        {
          food: "牛奶",
          reasoning: ["偶爾出現腹脹", "症狀輕微但具一致性"],
          severity_pattern: "中度風險",
          recommendation: "可嘗試改用無乳糖牛奶或植物奶"
        }
      ],
      supportive_foods: [
        {
          food: "白飯",
          benefits: ["症狀穩定時的主食", "未觀察到惡化趨勢"],
          recommendation: "可安心繼續食用"
        },
        {
          food: "雞肉",
          benefits: ["優質蛋白質來源", "消化良好"],
          recommendation: "建議維持適量攝取"
        }
      ],
      daily_assessments: [
        {
          date: new Date().toISOString().split('T')[0],
          day_summary: "飲食均衡，症狀輕微",
          meals: [
            {
              meal: "早餐",
              foods: [
                {
                  name: "白飯",
                  suitability: "有益" as const,
                  reasoning: ["易消化", "能量來源"],
                  symptom_links: [],
                  notes: []
                }
              ]
            }
          ]
        }
      ],
      next_steps: {
        maintain: ["持續記錄飲食與症狀", "保持規律作息"],
        monitor: ["辣椒的完全避免效果", "牛奶替代品的適應性"],
        experiments: ["嘗試發酵食品（如優格）", "增加膳食纖維（如燕麥）"]
      },
      all_foods_overview: {
        high_risk_foods: ["辣椒"],
        moderate_risk_foods: ["牛奶"],
        watch_foods: ["油炸食物"],
        safe_foods: ["白飯", "雞肉", "地瓜"],
        beneficial_foods: ["香蕉", "木瓜"],
        neutral_foods: ["青菜", "豆腐"]
      }
    }

    return JSON.stringify(mockResponse, null, 2)
  }

  private parseClaudeResponse(
    raw: string,
    baseResult: WeeklyIBDAnalysisResult,
    dataQualityWarnings: string[],
    dailyOverride?: DailyFoodAssessment[]
  ): WeeklyIBDAnalysisResult {
    // Debug log for raw Claude response
    console.log('[parseClaudeResponse] 🤖 Claude API raw response:')
    console.log('  📏 Response length:', raw.length, 'characters')
    console.log('  📄 First 500 chars:', raw.substring(0, 500))

    try {
      // Remove markdown code block markers if present (```json ... ```)
      let cleanedRaw = raw.trim()
      if (cleanedRaw.startsWith('```json')) {
        cleanedRaw = cleanedRaw.replace(/^```json\s*/, '').replace(/```\s*$/, '')
      } else if (cleanedRaw.startsWith('```')) {
        cleanedRaw = cleanedRaw.replace(/^```\s*/, '').replace(/```\s*$/, '')
      }

      const parsed = JSON.parse(cleanedRaw) as ClaudeAnalysisResponse

      // Debug log for parsed structure
      console.log('[parseClaudeResponse] ✅ Successfully parsed JSON')
      console.log('  📋 Summary length:', parsed.summary?.length || 0)
      console.log('  ⚠️ Foods to monitor:', parsed.foods_to_monitor?.length || 0)
      console.log('  ✅ Supportive foods:', parsed.supportive_foods?.length || 0)
      console.log('  📈 Symptom trends:', parsed.symptom_trends?.length || 0)

      const foodsToMonitor = Array.isArray(parsed.foods_to_monitor)
        ? parsed.foods_to_monitor
            .filter((item): item is MonitorItem => isPlainRecord(item))
            .map((item) => ({
              food: typeof item.food === 'string' ? item.food : '',
              risk_level: normalizeRiskLevel(item.risk_level),
              reasoning: normalizeStringArray(item.reasoning),
              recommended_actions: normalizeStringArray(item.recommended_actions),
              supporting_days: normalizeStringArray(item.supporting_days)
            }))
        : []

      const supportiveFoods = Array.isArray(parsed.supportive_foods)
        ? parsed.supportive_foods
            .filter((item): item is SupportiveFoodItem => isPlainRecord(item))
            .map((item) => ({
              food: typeof item.food === 'string' ? item.food : '',
              benefits: normalizeStringArray(item.benefits),
              suggestions: normalizeStringArray(item.suggestions)
            }))
        : []

      const symptomTrends = Array.isArray(parsed.symptom_trends)
        ? parsed.symptom_trends
            .filter((item): item is SymptomTrendItem => isPlainRecord(item))
            .map((item) => ({
              pattern: typeof item.pattern === 'string' ? item.pattern : '',
              evidence: normalizeStringArray(item.evidence),
              recommendations: normalizeStringArray(item.recommendations)
            }))
        : []

      const allFoodsOverview = normalizeAllFoodsOverview(parsed.all_foods_overview)
      const gutRecommendations = normalizeStringArray(parsed.gut_health_recommendations)
      const warningSigns = normalizeStringArray(parsed.warning_signs)
      const dataQualityNotes = [
        ...dataQualityWarnings,
        ...normalizeStringArray(parsed.data_quality_notes)
      ]
      const followUpActions = normalizeStringArray(parsed.follow_up_actions)
      const reasoningTrace = normalizeStringArray(parsed.reasoning_trace)
      const evidenceNotes = normalizeStringArray(parsed.evidence_notes)
      const dailyFoodBreakdown =
        dailyOverride && dailyOverride.length > 0
          ? dailyOverride
          : normalizeDailyFoodBreakdown(parsed.daily_food_breakdown)
      const nextSteps = normalizeNextSteps(parsed.next_steps)

      const result: WeeklyIBDAnalysisResult = {
        ...baseResult,
        method: 'claude_api',
        analysis: {
          summary: typeof parsed.summary === 'string' ? parsed.summary : '',
          all_foods_overview: allFoodsOverview,
          foods_to_monitor: foodsToMonitor,
          supportive_foods: supportiveFoods,
          symptom_trends: symptomTrends,
          gut_health_recommendations: gutRecommendations,
          warning_signs: warningSigns,
          data_quality_notes: dataQualityNotes,
          follow_up_actions: followUpActions,
          reasoning_trace: reasoningTrace,
          evidence_notes: evidenceNotes,
          daily_food_breakdown: dailyFoodBreakdown,
          next_steps: nextSteps
        }
      }

      // Debug log for final analysis result
      console.log('[parseClaudeResponse] 📊 Final analysis result:')
      console.log('  📝 Summary:', result.analysis.summary?.substring(0, 100) + '...')
      console.log('  ⚠️ Foods to monitor:', foodsToMonitor.length)
      console.log('  ✅ Supportive foods:', supportiveFoods.length)
      console.log('  💡 Gut health recommendations:', gutRecommendations.length)
      console.log('  ⚠️ Warning signs:', warningSigns.length)
      console.log('  📋 Follow-up actions:', followUpActions.length)
      console.log('  🧠 Reasoning trace steps:', reasoningTrace.length)
      console.log('  📚 Evidence notes:', evidenceNotes.length)
      console.log('  🍽️ Daily food breakdown entries:', dailyFoodBreakdown.length)

      return result
    } catch (error) {
      console.error('[IBDWeeklyAnalysisAgent] Failed to parse Claude JSON:', error)
      return this.buildFallbackAnalysis(
        {
          payload: {
            timeframe: baseResult.timeframe,
            trackingSummary: {
              totalFoodEntries: baseResult.totals.food_entries,
              uniqueFoods: baseResult.totals.unique_foods,
              totalSymptomEntries: baseResult.totals.symptom_entries,
              daysWithFoodOnly: []
            },
            foodImpacts: [],
            symptomOverview: {
              averageScores: {
                overall_health: null,
                abdominal_pain: null,
                diarrhea: null,
                bloody_stool: null,
                bloating: null
              },
              flareDays: [],
              stableDays: [],
              trendNotes: []
            },
            lifestyleFactors: {
              commonTriggers: [],
              improvementFactors: [],
              medications: [],
              activityLevels: {}
            },
            dataQuality: {
              warnings: dataQualityWarnings,
              missingSymptomDates: []
            },
            dailyBreakdown: []
          },
          hasMinimalData: true,
          highRiskFoods: [],
          protectiveFoods: []
        },
        baseResult
      )
    }
  }

  private buildFallbackAnalysis(
    payload: {
      payload: WeeklyAnalysisPayload
      hasMinimalData: boolean
      highRiskFoods: Array<{ food: string; severity: number; dates: string[] }>
      protectiveFoods: Array<{ food: string; severity: number; occurrences: number }>
    },
    baseResult: WeeklyIBDAnalysisResult,
    insufficient: boolean = false
  ): WeeklyIBDAnalysisResult {
    const { payload: data, highRiskFoods, protectiveFoods } = payload
    const highRiskMap = new Map(highRiskFoods.map((item) => [item.food, item]))
    const protectiveMap = new Map(protectiveFoods.map((item) => [item.food, item]))

    const summaryParts: string[] = []
    if (insufficient) {
      summaryParts.push('目前資料量不足以生成 AI 詳細分析，以下為基於既有紀錄的初步建議。')
    }
    summaryParts.push(
      `共分析 ${data.trackingSummary.totalFoodEntries} 筆飲食與 ${data.trackingSummary.totalSymptomEntries} 筆症狀紀錄。`
    )
    if (data.symptomOverview.averageScores.overall_health) {
      summaryParts.push(
        `整體健康平均 ${data.symptomOverview.averageScores.overall_health} 分 (5 分最佳)。`
      )
    }
    if (highRiskFoods.length > 0) {
      summaryParts.push(
        `最需留意的食物包括：${highRiskFoods
          .map((item) => `${item.food}(${item.severity.toFixed(1)}分)`)
          .join('、')}。`
      )
    }

    const foodsToMonitor = highRiskFoods.map((item) => ({
      food: item.food,
      risk_level: item.severity >= 3.5 ? 'high' : item.severity >= 2.5 ? 'moderate' : 'watch',
      reasoning: [
        item.dates.length > 0
          ? `在 ${item.dates.join('、')} 等日期症狀較為明顯。`
          : '與症狀加劇日同時出現，建議留意份量與頻率。'
      ],
      recommended_actions: [
        '下週可先減少份量或調整烹調方式，搭配症狀追蹤。'
      ],
      supporting_days: item.dates
    }))

    const supportiveFoods = protectiveFoods.map((item) => ({
      food: item.food,
      benefits: [
        item.severity === 0
          ? '資料顯示與症狀加劇無明顯關聯。'
          : '目前未觀察到顯著惡化趨勢。'
      ],
      suggestions: ['可維持適量，並持續觀察身體反應。']
    }))

    // Generate all foods overview
    const allFoodsOverview = {
      high_risk_foods: foodsToMonitor.filter(f => f.risk_level === 'high').map(f => f.food),
      moderate_risk_foods: foodsToMonitor.filter(f => f.risk_level === 'moderate').map(f => f.food),
      watch_foods: foodsToMonitor.filter(f => f.risk_level === 'watch').map(f => f.food),
      supportive_foods: supportiveFoods.map(f => f.food),
      neutral_foods: [] as string[] // Fallback doesn't classify neutral foods separately
    }

    const symptomTrends: WeeklyIBDAnalysisResult['analysis']['symptom_trends'] = []
    data.symptomOverview.trendNotes.forEach((note) => {
      symptomTrends.push({
        pattern: note,
        evidence: [],
        recommendations: ['持續追蹤相關日子的飲食與生活因素。']
      })
    })

    if (data.symptomOverview.flareDays.length > 0) {
      symptomTrends.push({
        pattern: `本週出現 ${data.symptomOverview.flareDays.length} 天症狀較明顯。`,
        evidence: data.symptomOverview.flareDays.map(
          (day) => `${day.date}: ${day.keySymptoms.join('、') || '症狀'} (嚴重度 ${day.severity})`
        ),
        recommendations: ['針對上述日期的餐食進行情境回顧，找出可能的誘發因素。']
      })
    }

    if (data.symptomOverview.stableDays.length > 0) {
      symptomTrends.push({
        pattern: `也有 ${data.symptomOverview.stableDays.length} 天呈現穩定狀態。`,
        evidence: data.symptomOverview.stableDays.map(
          (day) => `${day.date}: 症狀指數 ${day.severity}`
        ),
        recommendations: ['保留穩定日常的飲食搭配，作為後續參考模板。']
      })
    }

    const gutRecommendations: string[] = []
    if (highRiskFoods.length > 0) {
      gutRecommendations.push('針對高風險食物採取「減量 + 單獨測試」策略，並在 48 小時內記錄反應。')
    }
    if (protectiveFoods.length > 0) {
      gutRecommendations.push('維持低刺激、易消化的安全食物，並搭配足量水分與電解質補充。')
    }
    gutRecommendations.push('若症狀持續惡化，請與主治醫師或營養師討論專屬飲食方案。')

    const warningSigns = [...data.dataQuality.warnings]
    if (data.symptomOverview.flareDays.some((day) => day.keySymptoms.includes('bloody_stool'))) {
      warningSigns.push('曾出現血便紀錄，若持續發生需立即就醫評估。')
    }

    const followUpActions: string[] = []

    // Generate follow-up actions based on actual data
    if (data.trackingSummary.totalFoodEntries > 0 || data.trackingSummary.totalSymptomEntries > 0) {
      followUpActions.push('下週持續完成飲食與症狀紀錄，以提升分析準確度。')
    }

    if (highRiskFoods.length > 0) {
      followUpActions.push('針對高風險食物採取分量控制或暫停，再觀察症狀變化。')
    }

    if (data.dataQuality.missingSymptomDates.length > 0) {
      // These are likely healthy days with no symptoms
      followUpActions.push(`有 ${data.dataQuality.missingSymptomDates.length} 個健康日（無症狀記錄），顯示身體狀況穩定。`)
    }

    if (protectiveFoods.length > 0) {
      followUpActions.push('保持並增加有益食物的攝取，有助於維持腸道穩定。')
    }

    const dailyFoodBreakdown: DailyFoodAssessment[] = (data.dailyBreakdown || []).map((day) => {
      const daySummaryParts: string[] = []
      const symptom = day.symptomSummary ?? undefined

      if (symptom && symptom.severity !== null && symptom.severity !== undefined) {
        const severityText = symptom.severity.toFixed(2)
        const symptomText =
          symptom.keySymptoms && symptom.keySymptoms.length > 0
            ? `症狀焦點：${symptom.keySymptoms.join('、')}`
            : '症狀以整體感受為主'
        daySummaryParts.push(`同日症狀嚴重度 ${severityText}，${symptomText}。`)
      } else {
        daySummaryParts.push('當日未紀錄症狀，建議補登以利追蹤。')
      }

      if (!day.meals || day.meals.length === 0) {
        daySummaryParts.push('未紀錄任何餐點內容。')
      }

      const meals = (day.meals || [])
        .map((meal) => {
          const mealName = meal.meal || 'unspecified'
          const uniqueFoods = Array.from(
            new Set(
              (meal.foods || [])
                .map((food) => (typeof food === 'string' ? food : food?.name || ''))
                .map((name) => name.trim())
                .filter((name) => name.length > 0)
            )
          )

          const foods = uniqueFoods.map((foodName) => {
            const reasoning = new Set<string>()
            const symptomLinks = new Set<string>()
            const notes = new Set<string>()
            let suitability: FoodSuitabilityLevel = 'neutral'

            const highRisk = highRiskMap.get(foodName)
            if (highRisk) {
              suitability = highRisk.severity >= 3.5 ? 'avoid' : 'watch'
              if (highRisk.dates.length > 0) {
                reasoning.add(`在 ${highRisk.dates.join('、')} 等症狀加劇日出現，嚴重度約 ${highRisk.severity.toFixed(1)}。`)
                highRisk.dates.forEach((date) => symptomLinks.add(`${date} 症狀加劇`))
              } else {
                reasoning.add('與症狀加劇日同時出現，建議暫時減量或停用觀察。')
              }
            }

            const supportive = protectiveMap.get(foodName)
            if (supportive && !highRisk) {
              suitability = 'supportive'
              reasoning.add(`過去 ${supportive.occurrences} 次紀錄均未見症狀惡化（平均嚴重度 ${supportive.severity.toFixed(1)}）。`)
              notes.add('建議維持既有份量與搭配方式。')
            }

            if (!highRisk && !supportive) {
              reasoning.add('目前資料量有限，未觀察到明顯風險或益處，建議持續觀察。')
            }

            if (symptom && symptom.severity !== null && symptom.severity !== undefined) {
              const severityText = symptom.severity.toFixed(2)
              if (symptom.keySymptoms && symptom.keySymptoms.length > 0) {
                symptomLinks.add(`同日症狀：${symptom.keySymptoms.join('、')} (嚴重度 ${severityText})`)
              } else {
                symptomLinks.add(`同日整體症狀嚴重度 ${severityText}`)
              }
            } else {
              notes.add('缺少當日症狀紀錄，建議紀錄感受以建立關聯。')
            }

            return {
              name: foodName,
              suitability,
              reasoning: Array.from(reasoning),
              symptom_links: Array.from(symptomLinks),
              notes: Array.from(notes)
            }
          })

          return {
            meal: mealName,
            foods
          }
        })
        .filter((meal) => meal.foods.length > 0)

      const daySummary = daySummaryParts.join(' ')

      return {
        date: day.date,
        day_summary: daySummary.trim().length > 0 ? daySummary : undefined,
        meals
      }
    }).filter((entry) => entry.meals.length > 0 || (entry.day_summary && entry.day_summary.trim().length > 0))

    const reasoningTrace: string[] = [
      `資料來源：${data.trackingSummary.totalFoodEntries} 筆飲食、${data.trackingSummary.totalSymptomEntries} 筆症狀紀錄。`,
      highRiskFoods.length > 0
        ? `辨識 ${highRiskFoods.length} 項疑似誘發食物，依據 foodImpacts 與症狀重疊日推估嚴重度。`
        : '本週未偵測到明顯高風險食物。'
    ]

    if (protectiveFoods.length > 0) {
      reasoningTrace.push(`發現 ${protectiveFoods.length} 項可支援腸道穩定的食物，依據低平均嚴重度與高出現次數推論。`)
    }
    if (data.dataQuality.warnings.length > 0) {
      reasoningTrace.push(`資料限制：${data.dataQuality.warnings.join('、')}。`)
    }
    if (data.symptomOverview.trendNotes.length > 0) {
      reasoningTrace.push(`症狀趨勢：${data.symptomOverview.trendNotes.join('；')}`)
    }

    const evidenceNotes: string[] = [
      `trackingSummary.uniqueFoods=${data.trackingSummary.uniqueFoods}`,
      `trackingSummary.daysWithFoodOnly=${data.trackingSummary.daysWithFoodOnly.length}`
    ]
    data.foodImpacts.slice(0, 3).forEach((impact) => {
      evidenceNotes.push(
        `foodImpacts.${impact.food}: 次數 ${impact.occurrences}, 平均嚴重度 ${impact.severity.average ?? '無'}, 關聯症狀 ${impact.correlatedSymptoms.join('、') || '無'}`
      )
    })
    evidenceNotes.push(...data.dataQuality.warnings)

    const nextSteps: NextStepPlan = {
      maintain: supportiveFoods.map(
        (item) => `${item.food}：維持目前攝取頻率，保持其對腸道穩定的貢獻。`
      ),
      monitor: foodsToMonitor.map(
        (item) => `${item.food}：下週持續紀錄份量與症狀，在 ${item.supporting_days.join('、') || '症狀日'} **特別留意**。`
      ),
      experiments: []
    }

    if (foodsToMonitor.length > 0) {
      nextSteps.experiments.push(`將 ${foodsToMonitor[0].food} 份量減半，再觀察 3-5 天後的腹痛與排便變化。`)
    }
    if (data.dataQuality.missingSymptomDates.length > 0 && data.trackingSummary.totalSymptomEntries < 3) {
      // Only suggest adding symptom logs if there are very few overall
      nextSteps.experiments.push('若有任何輕微不適，可記錄症狀以建立更完整的健康追蹤。')
    }
    if (nextSteps.experiments.length === 0) {
      nextSteps.experiments.push('選擇一項新食物或烹調方式，少量測試並搭配症狀紀錄。')
    }

    return {
      ...baseResult,
      method: insufficient ? 'insufficient_data' : 'fallback',
      analysis: {
        summary: summaryParts.join(' '),
        all_foods_overview: allFoodsOverview,
        foods_to_monitor: foodsToMonitor,
        supportive_foods: supportiveFoods,
        symptom_trends: symptomTrends,
        gut_health_recommendations: gutRecommendations,
        warning_signs: warningSigns,
        data_quality_notes: data.dataQuality.warnings,
        follow_up_actions: followUpActions,
        reasoning_trace: reasoningTrace,
        evidence_notes: evidenceNotes,
        daily_food_breakdown: dailyFoodBreakdown,
        next_steps: nextSteps
      }
    }
  }
}

export const WeeklyAnalysisPrompts = {
  DEFAULT_PROMPT,
  PROMPT_VARIANTS
}
