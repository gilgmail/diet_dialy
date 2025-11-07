import Anthropic from '@anthropic-ai/sdk'
import { SupabaseFoodEntriesService } from '@/lib/supabase/food-entries'
import { DailySymptomService } from '@/lib/supabase/daily-symptom-service'
import { createAdminClient } from '@/lib/supabase/server'
import type { FoodEntry } from '@/types/supabase'
import type { DailySymptomEntry, CoreSymptomScores } from '@/types/medical'

// 更新版本時務必同步調整行動端顯示與報告標註
export const WEEKLY_ANALYSIS_VERSION = '2025.02.09.0'

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
    foods: string[]
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

interface WeeklyAnalysisPayload {
  timeframe: Timeframe
  trackingSummary: {
    totalFoodEntries: number
    uniqueFoods: number
    totalSymptomEntries: number
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
  }
  dataQuality: {
    warnings: string[]
    missingSymptomDates: string[]
  }
  dailyBreakdown: DailyFoodLog[]
}

export interface WeeklyAnalysisOptions {
  startDate?: string
  endDate?: string
  promptOverride?: string
  promptStyle?: PromptVariantKey
  includePromptRecommendations?: boolean
}

export interface WeeklyIBDAnalysisResult {
  success: boolean
  method: 'claude_api' | 'fallback' | 'insufficient_data'
  prompt_used: string
  timeframe: Timeframe
  analysis_version: string
  totals: {
    food_entries: number
    unique_foods: number
    symptom_entries: number
    days_without_symptom_logs: number
  }
  analysis: {
    summary: string
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
}

interface PromptRecommendation {
  id: string
  label: string
  description: string
  prompt: string
}

type RiskLevel = 'high' | 'moderate' | 'watch'

interface ClaudeAnalysisResponse {
  summary?: string
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

const PROMPT_VARIANTS = {
  balanced: {
    label: 'IBD 營養顧問',
    description: '專精於發炎性腸道疾病的個人化營養分析與飲食調整建議。',
    prompt: `你是一位專精於發炎性腸道疾病(IBD)的營養顧問。我會提供患者的每日飲食記錄和症狀日記，請幫我進行深度分析。

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

### 4. 個人化建議
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
- **Summary**：以結論口吻撰寫 3-5 句，引用 dataset 內的日期與指標。
- **Reasoning Trace**：逐條說明推論邏輯，包含症狀和飲食的關聯時間窗。
- **Daily Food Breakdown**：每日逐餐列出食物的適合度，標記「有益」/「中性」/「觀察」/「避免」並給出依據。
- **Evidence Notes**：列出任何被引用的資料欄位（如 trackingSummary、foodImpacts、symptomOverview）。
- **Next Steps**：區分維持、監測、實驗三大類，指示份量與觀察指標。

請強調所有建議均可追溯資料來源，必要時引用 flareDays、stableDays、mealTypes、sampleNotes 等欄位。`
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

export class IBDWeeklyAnalysisAgent {
  private anthropic: Anthropic | null
  private readonly config: ClaudeConfig
  private readonly foodEntryService: SupabaseFoodEntriesService
  private readonly adminClient: ReturnType<typeof createAdminClient>

  constructor(config?: Partial<ClaudeConfig>) {
    const apiKey = config?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? ''
    const model = config?.model ?? process.env.CLAUDE_MODEL ?? 'claude-3-5-sonnet-latest'
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

    console.log('🔨 Building analysis payload...')
    const payload = this.buildAnalysisPayload(dataset, timeframe)
    const promptTemplate = this.resolvePrompt(options)
    const fullPrompt = this.composePrompt(promptTemplate, payload.payload)
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
      prompt_used: fullPrompt,
      timeframe,
      analysis_version: WEEKLY_ANALYSIS_VERSION,
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
      const raw = await this.callClaude(prompt)
      const apiDuration = ((Date.now() - apiStartTime) / 1000).toFixed(2)
      console.log(`✅ Claude API responded (${apiDuration}s)`)
      console.log('  - Response length:', raw.length, 'characters')

      console.log('🔍 Parsing Claude response...')
      const parsed = this.parseClaudeResponse(raw, baseResult, payload.payload.dataQuality.warnings)
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
    const end = options.endDate ? new Date(options.endDate) : new Date()
    if (Number.isNaN(end.getTime())) {
      throw new Error('Invalid endDate provided to IBDWeeklyAnalysisAgent')
    }
    end.setHours(0, 0, 0, 0)

    const start = options.startDate ? new Date(options.startDate) : new Date(end)
    if (Number.isNaN(start.getTime())) {
      throw new Error('Invalid startDate provided to IBDWeeklyAnalysisAgent')
    }

    if (!options.startDate) {
      start.setDate(end.getDate() - 6)
    }

    if (start > end) {
      const temp = new Date(start)
      start.setTime(end.getTime())
      end.setTime(temp.getTime())
    }

    start.setHours(0, 0, 0, 0)

    const daysCovered = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
      daysCovered
    }
  }

  private async fetchDataset(userId: string, timeframe: Timeframe): Promise<{
    foodEntries: FoodEntry[]
    symptomEntries: DailySymptomEntry[]
  }> {
    // 🔍 Diagnostic logging for data fetching
    console.log('[fetchDataset] 🔍 Fetching data for analysis:')
    console.log('  👤 userId:', userId)
    console.log('  📅 startDate:', timeframe.startDate)
    console.log('  📅 endDate:', timeframe.endDate)
    console.log('  📊 daysCovered:', timeframe.daysCovered)

    const foodEntries = await this.foodEntryService.getUserFoodEntriesByDateRange(
      userId,
      timeframe.startDate,
      timeframe.endDate
    )

    const symptomEntries = await DailySymptomService.getEntriesByRange(
      userId,
      timeframe.startDate,
      timeframe.endDate
    )

    // 🔍 Diagnostic logging for retrieved data
    console.log('[fetchDataset] 📥 Data retrieved:')
    console.log('  🍽️ Food entries:', foodEntries.length)
    console.log('  ❤️ Symptom entries:', symptomEntries.length)

    if (foodEntries.length > 0) {
      const dates = foodEntries.map(e => e.consumed_at.split('T')[0])
      const uniqueDates = [...new Set(dates)]
      console.log('  📅 Unique food dates:', uniqueDates.sort())
    }

    if (symptomEntries.length > 0) {
      const dates = symptomEntries.map(e => e.recorded_date)
      const uniqueDates = [...new Set(dates)]
      console.log('  📅 Unique symptom dates:', uniqueDates.sort())
    }

    return {
      foodEntries,
      symptomEntries
    }
  }

  private buildAnalysisPayload(
    dataset: { foodEntries: FoodEntry[]; symptomEntries: DailySymptomEntry[] },
    timeframe: Timeframe
  ): {
    payload: WeeklyAnalysisPayload
    hasMinimalData: boolean
    highRiskFoods: Array<{ food: string; severity: number; dates: string[] }>
    protectiveFoods: Array<{ food: string; severity: number; occurrences: number }>
  } {
    const { foodEntries, symptomEntries } = dataset
    const symptomByDate = new Map<string, DailySymptomEntry>()
    symptomEntries.forEach((entry) => {
      symptomByDate.set(entry.recorded_date, entry)
    })

    const foodsByDate = new Map<string, Array<{ name: string; mealType: string | null }>>()
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
        dayFoods.push({ name: foodName, mealType: entry.meal_type })
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
      }, {})
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
        const mealsMap = new Map<string, string[]>()
        const foods = foodsByDate.get(date) ?? []
        foods.forEach((item) => {
          const key = item.mealType && item.mealType.trim().length > 0 ? item.mealType : 'unspecified'
          const mealFoods = mealsMap.get(key) ?? []
          mealFoods.push(item.name)
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
            foods: Array.from(new Set(mealFoods))
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
      dailyBreakdown
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
    console.log(`  ⚠️ High-risk foods: ${highRiskFoods.length}`)
    console.log(`  ✅ Protective foods: ${protectiveFoods.length}`)

    if (highRiskFoods.length > 0) {
      console.log('  📋 High-risk food list:')
      highRiskFoods.forEach(f => {
        console.log(`    - ${f.food} (severity: ${f.severity.toFixed(2)}, dates: ${f.dates.join(', ')})`)
      })
    }

    return {
      payload,
      hasMinimalData,
      highRiskFoods,
      protectiveFoods
    }
  }

  private composePrompt(promptTemplate: string, payload: WeeklyAnalysisPayload): string {
    const dataset = JSON.stringify(payload, null, 2)

    return `${promptTemplate}

資料格式說明：以下提供的 JSON 已整理出一週的飲食與症狀摘要。請閱讀所有欄位，整合臨床判斷。

回覆規範：
1. 請以繁體中文回覆。
2. 回覆必須是有效的 JSON，且不得包含多餘文字。
3. JSON 結構固定如下：
{
  "summary": "結論 (3-5 句，明確指出整體狀態、成功亮點與急迫風險，務必引用日期或數據佐證)",
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
務必提供詳盡內容（尤其是 reasoning_trace 與 daily_food_breakdown），讓醫療團隊可直接引用。

週期資料：
\u0060\u0060\u0060json
${dataset}
\u0060\u0060\u0060`
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

  private async callClaude(prompt: string): Promise<string> {
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
      console.warn(`[IBDWeeklyAnalysisAgent] Model ${modelToUse} not in allowlist, fallback to claude-3-5-sonnet-latest`)
      modelToUse = 'claude-3-5-sonnet-latest'
    }

    const response = await this.anthropic.messages.create({
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

    const first = response.content[0]
    if (!first) {
      throw new Error('Empty response from Claude')
    }

    if (first.type === 'text' && first.text) {
      return first.text.trim()
    }

    throw new Error(`Unexpected Claude response type: ${first.type}`)
  }

  private parseClaudeResponse(
    raw: string,
    baseResult: WeeklyIBDAnalysisResult,
    dataQualityWarnings: string[]
  ): WeeklyIBDAnalysisResult {
    // Debug log for raw Claude response
    console.log('[parseClaudeResponse] 🤖 Claude API raw response:')
    console.log('  📏 Response length:', raw.length, 'characters')
    console.log('  📄 First 500 chars:', raw.substring(0, 500))

    try {
      const parsed = JSON.parse(raw) as ClaudeAnalysisResponse

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

      const gutRecommendations = normalizeStringArray(parsed.gut_health_recommendations)
      const warningSigns = normalizeStringArray(parsed.warning_signs)
      const dataQualityNotes = [
        ...dataQualityWarnings,
        ...normalizeStringArray(parsed.data_quality_notes)
      ]
      const followUpActions = normalizeStringArray(parsed.follow_up_actions)
      const reasoningTrace = normalizeStringArray(parsed.reasoning_trace)
      const evidenceNotes = normalizeStringArray(parsed.evidence_notes)
      const dailyFoodBreakdown = normalizeDailyFoodBreakdown(parsed.daily_food_breakdown)
      const nextSteps = normalizeNextSteps(parsed.next_steps)

      const result: WeeklyIBDAnalysisResult = {
        ...baseResult,
        method: 'claude_api',
        analysis: {
          summary: typeof parsed.summary === 'string' ? parsed.summary : '',
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
      console.log('  ⚠️ Foods to monitor:')
      foodsToMonitor.forEach(f => {
        console.log(`    - ${f.food} (${f.risk_level}): ${f.reasoning[0] || 'no reason'}`)
      })
      console.log('  ✅ Supportive foods:')
      supportiveFoods.forEach(f => {
        console.log(`    - ${f.food}: ${f.benefits[0] || 'no benefit'}`)
      })
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
            new Set((meal.foods || []).map((foodName) => foodName.trim()).filter((name) => name.length > 0))
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
