import Anthropic from '@anthropic-ai/sdk'
import { SupabaseFoodEntriesService } from '@/lib/supabase/food-entries'
import { DailySymptomService } from '@/lib/supabase/daily-symptom-service'
import { createAdminClient } from '@/lib/supabase/server'
import type { FoodEntry } from '@/types/supabase'
import type { DailySymptomEntry, CoreSymptomScores } from '@/types/medical'

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
}

type MonitorItem = NonNullable<ClaudeAnalysisResponse['foods_to_monitor']>[number]
type SupportiveFoodItem = NonNullable<ClaudeAnalysisResponse['supportive_foods']>[number]
type SymptomTrendItem = NonNullable<ClaudeAnalysisResponse['symptom_trends']>[number]

const PROMPT_VARIANTS = {
  balanced: {
    label: '綜合分析營養師',
    description: '平衡評估風險、症狀與腸道修復策略的全面分析。',
    prompt: `你是一位擁有 20 年臨床經驗的資深營養師與胃腸科合作夥伴，專精於 IBD（發炎性腸道疾病）患者的營養療法。你熟悉克隆氏症與潰瘍性結腸炎的臨床變化、FODMAP 理論、抗發炎飲食、腸道黏膜修復策略與藥物-營養交互作用。請以臨床實務角度，分析這位病患最近一週的飲食與症狀紀錄，找出：
1. 可能誘發症狀或造成腸道負擔的食物與組合，提出減量或調整建議。
2. 有助症狀緩解或腸道修復的食物與良好模式。
3. 症狀趨勢、時間點與生活因子的綜合觀察，以及下週可執行的調整。`
  },
  flare_focus: {
    label: '症狀誘發偵測專家',
    description: '強調找到誘發 flare 的高風險食物與時間點。',
    prompt: `你是一位擁有 22 年臨床經驗、專攻 IBD  flare 預防的臨床營養師。你的重點是偵測觸發腹痛、腹瀉、血便與腹脹的飲食模式，並提出立即可執行的降風險策略。請聚焦於：
1. 症狀惡化日與當日飲食之間的因果線索。
2. 高風險烹調方式、份量、進食時段或餐次組合。
3. 可快速調整的替代方案與監測計畫。`
  },
  gut_healing: {
    label: '腸道修復教練',
    description: '偏重腸道修復、抗發炎與營養補強策略。',
    prompt: `你是一位擁有 25 年臨床經驗的腸道修復營養師，擅長設計抗發炎、低刺激且營養密度高的飲食策略，協助 IBD 患者維持緩解期並修復腸黏膜。請針對提供的資料：
1. 找出最需限制或調整的食品與烹調方式，以降低腸道刺激。
2. 梳理有助修復（Omega-3、可溶性纖維、發酵食品等）的正面飲食，建議如何保留或強化。
3. 給出下一週可執行的腸道保護與營養補強步驟。`
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
    follow_up_actions: []
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

export class IBDWeeklyAnalysisAgent {
  private anthropic: Anthropic | null
  private readonly config: ClaudeConfig
  private readonly foodEntryService: SupabaseFoodEntriesService

  constructor(config?: Partial<ClaudeConfig>) {
    const apiKey = config?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? ''
    const model = config?.model ?? process.env.CLAUDE_MODEL ?? 'claude-3-5-haiku-20241022'
    const maxTokens = config?.maxTokens ?? Number(process.env.CLAUDE_MAX_TOKENS ?? '1400')
    const temperature = config?.temperature ?? Number(process.env.CLAUDE_TEMPERATURE ?? '0.3')

    this.config = {
      apiKey,
      model,
      maxTokens,
      temperature
    }

    this.anthropic = apiKey ? new Anthropic({ apiKey }) : null
    this.foodEntryService = new SupabaseFoodEntriesService(createAdminClient())
  }

  static getPromptTemplates(): Array<PromptRecommendation> {
    return buildPromptRecommendations()
  }

  static getDefaultPrompt(): string {
    return DEFAULT_PROMPT
  }

  async analyze(userId: string, options: WeeklyAnalysisOptions = {}): Promise<WeeklyIBDAnalysisResult> {
    const timeframe = this.resolveTimeframe(options)
    const dataset = await this.fetchDataset(userId, timeframe)
    const payload = this.buildAnalysisPayload(dataset, timeframe)

    const baseResult: WeeklyIBDAnalysisResult = {
      success: true,
      method: 'fallback',
      prompt_used: this.resolvePrompt(options),
      timeframe,
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
      const insufficient = this.buildFallbackAnalysis(payload, baseResult, true)
      insufficient.method = 'insufficient_data'
      insufficient.success = false
      return insufficient
    }

    if (!this.anthropic || !this.config.apiKey) {
      return this.buildFallbackAnalysis(payload, baseResult)
    }

    try {
      const prompt = this.composePrompt(baseResult.prompt_used, payload.payload)
      const raw = await this.callClaude(prompt)
      const parsed = this.parseClaudeResponse(raw, baseResult, payload.payload.dataQuality.warnings)
      parsed.raw_ai_response = raw
      return parsed
    } catch (error) {
      console.error('[IBDWeeklyAnalysisAgent] Claude API failed, using fallback:', error)
      return this.buildFallbackAnalysis(payload, baseResult)
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
      const dayFoods = foodsByDate.get(date) ?? []
      dayFoods.push({ name: entry.food_name, mealType: entry.meal_type })
      foodsByDate.set(date, dayFoods)

      const key = entry.food_name?.trim() || '未命名食物'
      uniqueFoodNames.add(key)

      if (!foodImpactsMap.has(key)) {
        foodImpactsMap.set(key, {
          food: key,
          occurrences: 0,
          mealTypes: {},
          lastConsumedAt: entry.consumed_at,
          severityRecords: [],
          correlatedSymptoms: {},
          notes: new Set<string>()
        })
      }

      const record = foodImpactsMap.get(key)!
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
      dataQualityWarnings.push(`以下日期僅有飲食紀錄，缺少症狀追蹤：${daysWithFoodOnly.slice(0, 5).join(', ')}`)
    }
    if (symptomEntries.length > 0 && symptomEntries.length < 3) {
      dataQualityWarnings.push('症狀紀錄少於 3 筆，趨勢判斷可信度偏低。')
    }

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
      }
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

    const hasMinimalData = foodEntries.length >= 3 && symptomEntries.length >= 1

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
  "summary": "總結 (2-4 句，指出整體情況與關鍵風險)",
  "foods_to_monitor": [
    {
      "food": "食物名稱",
      "risk_level": "high | moderate | watch",
      "reasoning": ["1-2 個臨床判斷依據"],
      "recommended_actions": ["1-2 個具體調整建議"],
      "supporting_days": ["YYYY-MM-DD", "..."]
    }
  ],
  "supportive_foods": [
    {
      "food": "可強化的食物",
      "benefits": ["臨床益處"],
      "suggestions": ["如何保留或搭配"]
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
  "follow_up_actions": ["患者下週可執行的 2-3 個步驟"]
}

請務必嚴格遵守以上 JSON 格式。

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
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-latest',
      'claude-3-haiku-20240307'
    ]

    let modelToUse = this.config.model
    if (!validModels.includes(modelToUse)) {
      console.warn(`[IBDWeeklyAnalysisAgent] Model ${modelToUse} not in allowlist, fallback to claude-3-5-haiku-20241022`)
      modelToUse = 'claude-3-5-haiku-20241022'
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
    try {
      const parsed = JSON.parse(raw) as ClaudeAnalysisResponse

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
          follow_up_actions: followUpActions
        }
      }

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
            }
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

    const followUpActions = [
      '下週持續完成飲食與症狀紀錄，以提升分析準確度。',
      '針對高風險食物採取分量控制或暫停，再觀察症狀變化。'
    ]
    if (data.dataQuality.missingSymptomDates.length > 0) {
      followUpActions.push('補足僅有飲食紀錄的日期之症狀資料，有助於找出觸發因素。')
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
        follow_up_actions: followUpActions
      }
    }
  }
}

export const WeeklyAnalysisPrompts = {
  DEFAULT_PROMPT,
  PROMPT_VARIANTS
}
