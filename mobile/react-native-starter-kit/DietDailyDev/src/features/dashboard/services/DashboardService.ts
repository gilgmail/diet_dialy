import { supabase } from '@/shared/api/supabase/client'
import { AuthService } from '@/features/auth/services/AuthService'
import type { FoodEntry } from '@/features/food-diary/types'
import type { SymptomEntry } from '@/features/symptom-diary/types'
import type { DailySymptomEntryRow } from '@/shared/types/supabase'
import type {
  DashboardStats,
  DailyStats,
  MealDistribution,
  SeverityDistribution,
  WeeklyTrend,
  HealthInsight,
  DashboardData,
  WeeklyAnalysisHistoryItem,
  WeeklyAnalysisStatus,
} from '../types'
import { recordPerformanceMetric } from '@/shared/metrics/performanceTracker'

interface WeeklyIBDAnalysisCard {
  summary?: string
  foods_to_monitor?: Array<{
    food?: string
    risk_level?: string
    reasoning?: string[]
    recommended_actions?: string[]
    supporting_days?: string[]
  }>
  supportive_foods?: Array<{
    food?: string
    benefits?: string[]
    suggestions?: string[]
  }>
  gut_health_recommendations?: string[]
  warning_signs?: string[]
  follow_up_actions?: string[]
  reasoning_trace?: string[]
  evidence_notes?: string[]
  daily_food_breakdown?: Array<{
    date?: string
    day_summary?: string
    meals?: Array<{
      meal?: string
      foods?: Array<{
        name?: string
        suitability?: string
        reasoning?: string[]
        symptom_links?: string[]
        notes?: string[]
      }>
    }>
  }>
  next_steps?: {
    maintain?: string[]
    monitor?: string[]
    experiments?: string[]
  }
}

interface WeeklyIBDAnalysisResult {
  success: boolean
  method: 'claude_api' | 'fallback' | 'insufficient_data'
  prompt_used: string
  analysis_version?: string
  timeframe: {
    startDate: string
    endDate: string
    daysCovered: number
  }
  totals?: {
    food_entries?: number
    symptom_entries?: number
    unique_foods?: number
    days_without_symptom_logs?: number
    [key: string]: unknown
  }
  analysis: WeeklyIBDAnalysisCard
}

interface WeeklyIBDAnalysisResponse {
  success: boolean
  analysis?: WeeklyIBDAnalysisResult
  history?: WeeklyAnalysisHistoryItem[]
  error?: string
  analysisStatus?: WeeklyAnalysisStatus | null
}

const AI_INSIGHTS_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes for Claude Sonnet 4.5 analysis

export class DashboardService {
  private static maskUserId(userId?: string) {
    if (!userId) return 'anonymous'
    return `${userId.slice(0, 4)}…`
  }
  /**
   * Get comprehensive dashboard data for the user
   */
  static async getDashboardData(userId: string): Promise<{
    data: DashboardData | null
    error: { message: string } | null
  }> {
    const startTime = Date.now()
    console.log('[DashboardService] 🚀 START - Fetching data for userId:', userId)

    try {
      // Fetch food and symptom entries in parallel
      const fetchStartTime = Date.now()
      const [foodResult, symptomResult] = await Promise.all([
        this.getFoodEntries(userId),
        this.getSymptomEntries(userId),
      ])
      const fetchEndTime = Date.now()
      console.log(`[DashboardService] ⏱️ FETCH - Food & Symptom entries: ${fetchEndTime - fetchStartTime}ms`)
      recordPerformanceMetric('dashboard_fetch', {
        durationMs: fetchEndTime - fetchStartTime,
        userId: this.maskUserId(userId),
        foodEntries: foodResult.data?.length || 0,
        symptomEntries: symptomResult.data?.length || 0,
      })

      console.log('[DashboardService] Food entries:', {
        count: foodResult.data?.length || 0,
        hasError: !!foodResult.error,
        error: foodResult.error
      })

      console.log('[DashboardService] Symptom entries:', {
        count: symptomResult.data?.length || 0,
        hasError: !!symptomResult.error,
        error: symptomResult.error
      })

      // Only throw if food entries fail (symptom entries are optional for now)
      if (foodResult.error) {
        throw new Error('Failed to fetch food entries')
      }

      const foodEntries = foodResult.data || []
      const symptomEntries = symptomResult.data || [] // Use empty array if symptom fetch fails

      // Calculate statistics
      const calcStartTime = Date.now()
      const stats = this.calculateStats(foodEntries, symptomEntries)
      const weeklyTrend = this.calculateWeeklyTrend(foodEntries, symptomEntries)
      const insights = this.generateInsights(stats, weeklyTrend)
      const calcEndTime = Date.now()
      console.log(`[DashboardService] ⏱️ CALC - Stats & Trends: ${calcEndTime - calcStartTime}ms`)
      recordPerformanceMetric('dashboard_calculation', {
        durationMs: calcEndTime - calcStartTime,
        userId: this.maskUserId(userId),
      })

      // Get AI insights (blocking) so latest report/history are always returned
      const aiStartTime = Date.now()
      let aiInsights: HealthInsight[] = []
      let history: WeeklyAnalysisHistoryItem[] = []
      let historyTotal = 0
      let analysisStatus: WeeklyAnalysisStatus | null = null

      try {
        const aiResult = await this.getAIInsights(userId, weeklyTrend)
        aiInsights = aiResult.insights
        history = aiResult.history
        historyTotal = aiResult.historyTotal
        analysisStatus = aiResult.analysisStatus

        const aiEndTime = Date.now()
        console.log(`[DashboardService] ⏱️ AI - Insights fetch: ${aiEndTime - aiStartTime}ms`)
        recordPerformanceMetric('dashboard_ai', {
          durationMs: aiEndTime - aiStartTime,
          userId: this.maskUserId(userId),
          hasHistory: history.length > 0,
          insightsCount: aiInsights.length,
        })
      } catch (error) {
        console.warn('[DashboardService] AI insights failed, continuing without them:', error)
        recordPerformanceMetric('dashboard_ai', {
          durationMs: Date.now() - aiStartTime,
          userId: this.maskUserId(userId),
          error: error instanceof Error ? error.message : String(error),
        })
      }

      const combinedInsights = [...aiInsights, ...insights]

      const totalTime = Date.now() - startTime
      console.log(`[DashboardService] ✅ COMPLETE - Total time: ${totalTime}ms`)
      recordPerformanceMetric('dashboard_total', {
        durationMs: totalTime,
        userId: this.maskUserId(userId),
        insights: combinedInsights.length,
        historyItems: history.length,
      })
      console.log(`[DashboardService] 📊 Stats summary:`, {
        foodEntries: foodEntries.length,
        symptomEntries: symptomEntries.length,
        insights: combinedInsights.length,
        historyItems: history.length,
      })

      return {
        data: {
          stats,
          weeklyTrend,
          insights: combinedInsights,
          analysisHistory: history,
          analysisHistoryTotal: historyTotal,
          analysisStatus,
          foodEntries,
          symptomEntries,
        },
        error: null,
      }
    } catch (error) {
      console.error('[DashboardService] Error:', error)
      return {
        data: null,
        error: {
          message:
            error instanceof Error ? error.message : 'Failed to fetch dashboard data',
        },
      }
    }
  }

  /**
   * Get food entries for the user
   */
  private static async getFoodEntries(userId: string) {
    const { data, error } = await supabase
      .from('food_entries')
      .select('*')
      .eq('user_id', userId)
      .order('consumed_at', { ascending: false })

    return { data: data as FoodEntry[], error }
  }

  /**
   * Get symptom entries for the user
   */
  private static parseStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return []
    }
    return value
      .map((item) => (typeof item === 'string' ? item : item != null ? String(item) : null))
      .filter((item): item is string => !!item)
  }

  private static mapSymptomEntry(entry: DailySymptomEntryRow): SymptomEntry {
    const additionalSymptoms = DashboardService.parseStringArray(entry.additional_symptoms)
    const medications = DashboardService.parseStringArray(entry.medications_taken)
    const triggers = DashboardService.parseStringArray(entry.triggers_identified)
    const symptomName = additionalSymptoms[0] || '症狀記錄'
    const severity = entry.overall_health >= 4 ? 'mild' : entry.overall_health >= 2 ? 'moderate' : 'severe'

    return {
      id: entry.id,
      user_id: entry.user_id,
      recorded_date: entry.recorded_date,
      recorded_at: entry.recorded_at,
      symptom_name: symptomName,
      severity,
      duration_minutes: undefined,
      notes: entry.notes ?? undefined,
      overall_health: entry.overall_health,
      abdominal_pain: entry.abdominal_pain ?? 0,
      diarrhea: entry.diarrhea ?? 0,
      bloody_stool: entry.bloody_stool ?? 0,
      bloating: entry.bloating ?? 0,
      additional_symptoms: additionalSymptoms,
      medications_taken: medications,
      triggers_identified: triggers,
      created_at: entry.created_at ?? entry.recorded_at,
      updated_at: entry.updated_at ?? entry.recorded_at,
    }
  }

  private static async getSymptomEntries(userId: string) {
    const { data, error } = await supabase
      .from('daily_symptom_entries')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_date', { ascending: false })

    return {
      data: (data as DailySymptomEntryRow[] | null)?.map((entry) => this.mapSymptomEntry(entry)) ?? [],
      error,
    }
  }

  /**
   * Calculate dashboard statistics
   */
  private static calculateStats(
    foodEntries: FoodEntry[],
    symptomEntries: SymptomEntry[]
  ): DashboardStats {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    // 修正：與 calculateWeeklyTrend 和 AI 分析保持一致，使用過去 7 天（包含今天）
    // 從今天往回推 6 天，總共 7 天
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - 6)
    startOfWeek.setHours(0, 0, 0, 0)

    // Food stats
    const todayFoodEntries = foodEntries.filter(
      (entry) => new Date(entry.consumed_at) >= startOfToday
    )
    const weekFoodEntries = foodEntries.filter(
      (entry) => new Date(entry.consumed_at) >= startOfWeek
    )

    const totalCalories = foodEntries.reduce(
      (sum, entry) => sum + (entry.calories || 0),
      0
    )
    const todayCalories = todayFoodEntries.reduce(
      (sum, entry) => sum + (entry.calories || 0),
      0
    )
    const weekCalories = weekFoodEntries.reduce(
      (sum, entry) => sum + (entry.calories || 0),
      0
    )

    // Symptom stats - use recorded_at for timestamp filtering
    const todaySymptomEntries = symptomEntries.filter(
      (entry) => new Date(entry.recorded_at) >= startOfToday
    )
    const weekSymptomEntries = symptomEntries.filter(
      (entry) => new Date(entry.recorded_at) >= startOfWeek
    )

    // Most common symptom
    const symptomCounts = symptomEntries.reduce((acc, entry) => {
      acc[entry.symptom_name] = (acc[entry.symptom_name] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostCommonSymptom = Object.keys(symptomCounts).sort(
      (a, b) => symptomCounts[b] - symptomCounts[a]
    )[0]

    // Average severity
    const severityMap = { mild: 1, moderate: 2, severe: 3 }
    const averageSeverity =
      symptomEntries.length > 0
        ? symptomEntries.reduce(
            (sum, entry) => sum + severityMap[entry.severity],
            0
          ) / symptomEntries.length
        : undefined

    return {
      totalFoodEntries: foodEntries.length,
      todayFoodEntries: todayFoodEntries.length,
      weekFoodEntries: weekFoodEntries.length,
      totalCalories,
      todayCalories,
      weekCalories,
      totalSymptomEntries: symptomEntries.length,
      todaySymptomEntries: todaySymptomEntries.length,
      weekSymptomEntries: weekSymptomEntries.length,
      mostCommonSymptom,
      averageSeverity,
      lastEntryDate:
        foodEntries[0]?.consumed_at || symptomEntries[0]?.recorded_at,
      firstEntryDate:
        foodEntries[foodEntries.length - 1]?.consumed_at ||
        symptomEntries[symptomEntries.length - 1]?.recorded_at,
    }
  }

  /**
   * Calculate weekly trend data
   */
  private static calculateWeeklyTrend(
    foodEntries: FoodEntry[],
    symptomEntries: SymptomEntry[]
  ): WeeklyTrend {
    const now = new Date()
    const week: DailyStats[] = []

    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(now.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDay = new Date(date)
      nextDay.setDate(date.getDate() + 1)

      const dayFoodEntries = foodEntries.filter((entry) => {
        const entryDate = new Date(entry.consumed_at)
        return entryDate >= date && entryDate < nextDay
      })

      const daySymptomEntries = symptomEntries.filter((entry) => {
        const entryDate = new Date(entry.recorded_at)
        return entryDate >= date && entryDate < nextDay
      })

      const dayCalories = dayFoodEntries.reduce(
        (sum, entry) => sum + (entry.calories || 0),
        0
      )

      week.push({
        date: date.toISOString(),
        foodCount: dayFoodEntries.length,
        symptomCount: daySymptomEntries.length,
        totalCalories: dayCalories,
      })
    }

    // Meal distribution
    const mealDistribution: MealDistribution = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
    }

    foodEntries.forEach((entry) => {
      if (entry.meal_type in mealDistribution) {
        mealDistribution[entry.meal_type]++
      }
    })

    // Severity distribution
    const severityDistribution: SeverityDistribution = {
      mild: 0,
      moderate: 0,
      severe: 0,
    }

    symptomEntries.forEach((entry) => {
      if (entry.severity in severityDistribution) {
        severityDistribution[entry.severity]++
      }
    })

    return {
      week,
      mealDistribution,
      severityDistribution,
    }
  }

  private static sanitizeList(values?: string[] | null): string[] {
    if (!values || !Array.isArray(values)) {
      return []
    }
    return values
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0)
  }

  private static formatDate(date?: string | Date | null): string | undefined {
    if (!date) return undefined

    if (date instanceof Date) {
      if (Number.isNaN(date.getTime())) {
        return undefined
      }
      return date.toISOString().split('T')[0]
    }

    if (typeof date === 'string') {
      const trimmed = date.trim()
      if (!trimmed) return undefined
      if (trimmed.includes('T')) {
        return trimmed.split('T')[0]
      }
      return trimmed
    }

    return undefined
  }

  private static async getAIInsights(
    userId: string,
    weeklyTrend: WeeklyTrend
  ): Promise<{
    insights: HealthInsight[]
    history: WeeklyAnalysisHistoryItem[]
    historyTotal: number
    analysisStatus: WeeklyAnalysisStatus | null
  }> {
    const historyPreview: WeeklyAnalysisHistoryItem[] = []

    try {
      const apiBase = process.env.EXPO_PUBLIC_API_URL
      if (!apiBase) {
        console.log('[DashboardService] EXPO_PUBLIC_API_URL not configured, skip AI insights')
        return { insights: [], history: [], historyTotal: 0, analysisStatus: null }
      }

      // 延遲載入分析歷史：先返回空歷史，讓 Dashboard 快速顯示
      // 分析歷史會在背景中另外載入

      if (!weeklyTrend.week.length) {
        return {
          insights: [],
          history: historyPreview,
          historyTotal: historyPreview.length,
          analysisStatus: null,
        }
      }

      const logInChunks = (label: string, content: string) => {
        if (!content) {
          console.log(label, '(empty)')
          return
        }
        const text = String(content)
        const chunkSize = 900
        console.log(label)
        for (let i = 0; i < text.length; i += chunkSize) {
          console.log(text.slice(i, i + chunkSize))
        }
      }

      // Use first day of week as startDate, but use TODAY as endDate to ensure we include all recent data
      const startDate = this.formatDate(weeklyTrend.week[0]?.date)
      const today = new Date()
      const endDate = this.formatDate(today)

      // Simplified diagnostic logging
      console.log(`[DashboardService] 🔍 Fetching analysis history: ${startDate} to ${endDate} (${weeklyTrend.week.length} days)`)

      const normalizedBase = apiBase.replace(/\/+$/, '')
      const baseApiUrl = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`

      // Use GET to fetch history only (not trigger new analysis)
      const endpoint = `${baseApiUrl}/ai/weekly-ibd-analysis?userId=${userId}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout for history fetch

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn('[DashboardService] ❌ AI insight request failed', response.status)
        return {
          insights: [],
          history: historyPreview,
          historyTotal: historyPreview.length,
          analysisStatus: null,
        }
      }

      const payload = (await response.json()) as WeeklyIBDAnalysisResponse
      const payloadHistory = Array.isArray(payload.history) ? payload.history : undefined
      const normalizedHistoryPreview = this.normalizeHistory(
        apiBase,
        payloadHistory // Load all history items instead of just first one
      )
      const historyTotal = payloadHistory
        ? payloadHistory.length
        : Math.max(normalizedHistoryPreview.length, historyPreview.length)

      // Simplified response logging
      console.log(`[DashboardService] 📥 Response: ${payload.analysis?.method || 'N/A'} | ${payload.analysis?.totals?.food_entries || 0}F ${payload.analysis?.totals?.symptom_entries || 0}S | ${payload.history?.length || 0}H`)

      if (!payload.success || !payload.analysis) {
        // AI 功能暫時停用時，這是預期的情況，使用 info 而非 warn
        const errorMsg = payload.error || 'AI 分析功能暫時停用'
        console.log(`[DashboardService] ℹ️ AI insight response: ${errorMsg}`)
        return {
          insights: [],
          history: normalizedHistoryPreview.length ? normalizedHistoryPreview : historyPreview,
          historyTotal,
          analysisStatus: payload.analysisStatus ?? null,
        }
      }

      const aiAnalysis = payload.analysis.analysis
      if (!aiAnalysis) {
        return {
          insights: [],
          history: normalizedHistoryPreview.length ? normalizedHistoryPreview : historyPreview,
          historyTotal,
          analysisStatus: payload.analysisStatus ?? null,
        }
      }

      // Disabled verbose logging - too much output
      // if (payload.analysis.prompt_used) {
      //   logInChunks('[DashboardService] 🧠 AI prompt used (full):', payload.analysis.prompt_used)
      //   const datasetMatch = payload.analysis.prompt_used.match(/```json\s*([\s\S]+?)\s*```/)
      //   if (datasetMatch) {
      //     logInChunks('[DashboardService] 🍱 Dataset provided to AI:', datasetMatch[1])
      //   }
      // }

      const timestamp = new Date().toISOString()
      const insights: HealthInsight[] = []

      if (aiAnalysis.summary) {
        insights.push({
          id: `ai-weekly-summary-${timestamp}`,
          type: 'info',
          icon: '🤖',
          title: 'AI 每週腸道分析',
          description: aiAnalysis.summary.trim(),
          timestamp,
        })
      }

      const topRisk = aiAnalysis.foods_to_monitor?.find((item) => item?.food)
      if (topRisk?.food) {
        const reasons = this.sanitizeList(topRisk.reasoning)
        const actions = this.sanitizeList(topRisk.recommended_actions)
        const supporting = this.sanitizeList(topRisk.supporting_days)

        const descriptionParts: string[] = []
        if (reasons.length > 0) {
          descriptionParts.push(reasons[0])
        }
        if (actions.length > 0) {
          descriptionParts.push(`建議：${actions[0]}`)
        }
        if (supporting.length > 0) {
          descriptionParts.push(`相關日期：${supporting.slice(0, 3).join('、')}`)
        }

        insights.push({
          id: `ai-weekly-risk-${topRisk.food}-${timestamp}`,
          type: topRisk.risk_level === 'high' ? 'warning' : 'info',
          icon: topRisk.risk_level === 'high' ? '⚠️' : '🧐',
          title: `優先留意：${topRisk.food}`,
          description: descriptionParts.join('\n') || '請持續監測該食物對症狀的影響。',
          timestamp,
        })
      }

      const gutTips = this.sanitizeList(aiAnalysis.gut_health_recommendations)
      if (gutTips.length > 0) {
        insights.push({
          id: `ai-weekly-gut-${timestamp}`,
          type: 'positive',
          icon: '🌿',
          title: '腸道修復建議',
          description: gutTips.slice(0, 2).join('\n'),
          timestamp,
        })
      }

      const followUps = this.sanitizeList(aiAnalysis.follow_up_actions)
      if (followUps.length > 0) {
        insights.push({
          id: `ai-weekly-actions-${timestamp}`,
          type: 'info',
          icon: '📝',
          title: '下週行動重點',
          description: followUps.slice(0, 2).join('\n'),
          timestamp,
        })
      }

      const warningNotes = this.sanitizeList(aiAnalysis.warning_signs)
      if (warningNotes.length > 0) {
        insights.push({
          id: `ai-weekly-warning-${timestamp}`,
          type: 'warning',
          icon: '🚨',
          title: '警示訊號',
          description: warningNotes.slice(0, 2).join('\n'),
          timestamp,
        })
      }

      return {
        insights,
        history: normalizedHistoryPreview.length ? normalizedHistoryPreview : historyPreview,
        historyTotal,
        analysisStatus: payload.analysisStatus ?? null,
      }
    } catch (error) {
      // 超時或網路錯誤時不影響 Dashboard 載入
      const timestamp = new Date().toISOString()
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(
          `[DashboardService] AI insights request timeout (${AI_INSIGHTS_TIMEOUT_MS / 1000}s) - will retry in background`
        )

        // Timeout 後嘗試輪詢結果（每 30 秒檢查一次，最多 3 次）
        setTimeout(async () => {
          for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`[DashboardService] Polling attempt ${attempt}/3 for completed analysis...`)

            try {
              // 只拉取歷史報告，不觸發新的分析
              const pollResponse = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  startDate,
                  endDate,
                  skipAnalysis: true, // 標記為只拉取歷史
                }),
              })

              if (pollResponse.ok) {
                const data = await pollResponse.json()
                if (data.success && data.reportInfo) {
                  console.log('[DashboardService] ✅ Analysis completed in background, report ready!')
                  // 觸發 UI 更新（可以透過事件或狀態管理）
                  return
                }
              }
            } catch (err) {
              console.log(`[DashboardService] Polling attempt ${attempt} failed:`, err)
            }

            // 等待 30 秒再嘗試
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 30000))
            }
          }
          console.log('[DashboardService] Polling completed, no new report found')
        }, 5000) // 5 秒後開始輪詢

        return {
          insights: [
            {
              id: `ai-timeout-${timestamp}`,
              type: 'info',
              icon: '⌛️',
              title: 'AI 分析需要較長時間',
              description: '分析正在背景處理中（約需 5-8 分鐘）。系統會自動檢查並更新結果，請稍候再重新整理頁面。',
              timestamp,
            },
          ],
          history: historyPreview,
          historyTotal: historyPreview.length,
          analysisStatus: {
            analysisId: `pending-${timestamp}`,
            status: 'processing',
            progress: 50,
            message: '分析進行中，請稍候...',
            estimatedCompletion: new Date(Date.now() + 8 * 60 * 1000).toISOString(), // 預估 8 分鐘後完成
          },
        }
      }

      console.error('[DashboardService] Failed to load AI insights:', error)
      return {
        insights: [
          {
            id: `ai-error-${timestamp}`,
            type: 'warning',
            icon: '⚠️',
            title: 'AI 分析暫時無法載入',
            description: '取得 AI 報告時遇到問題，請檢查網路後再試一次。',
            timestamp,
          },
        ],
        history: historyPreview,
        historyTotal: historyPreview.length,
        analysisStatus: null,
      }
    }
  }

  static async loadAnalysisHistory(userId: string): Promise<WeeklyAnalysisHistoryItem[]> {
    const apiBase = process.env.EXPO_PUBLIC_API_URL
    if (!apiBase) {
      console.warn('[DashboardService] EXPO_PUBLIC_API_URL not configured, skip history fetch')
      return []
    }
    return this.fetchAnalysisHistory(apiBase, userId)
  }

  /**
   * Trigger a new AI weekly analysis (POST request)
   * This generates a new analysis report and returns it along with updated history
   */
  static async triggerWeeklyAnalysis(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    success: boolean
    analysis?: any
    history?: WeeklyAnalysisHistoryItem[]
    error?: string
  }> {
    const apiBase = process.env.EXPO_PUBLIC_API_URL
    if (!apiBase) {
      console.warn('[DashboardService] EXPO_PUBLIC_API_URL not configured')
      return { success: false, error: 'API URL not configured' }
    }

    try {
      console.log(`[DashboardService] 🤖 Triggering AI analysis for ${startDate || 'auto'} to ${endDate || 'auto'}`)

      const normalizedBase = apiBase.replace(/\/+$/, '')
      const baseApiUrl = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`
      const endpoint = `${baseApiUrl}/ai/weekly-ibd-analysis`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 600000) // 10 minutes for AI analysis

      const requestBody: any = { userId }
      if (startDate) requestBody.startDate = startDate
      if (endDate) requestBody.endDate = endDate

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn('[DashboardService] ❌ AI analysis request failed', response.status)
        return { success: false, error: `HTTP ${response.status}` }
      }

      const data = await response.json()
      console.log('[DashboardService] ✅ AI analysis completed:', {
        success: data.success,
        hasAnalysis: !!data.analysis,
        historyCount: data.history?.length || 0,
      })

      return {
        success: data.success,
        analysis: data.analysis,
        history: data.history,
        error: data.error,
      }
    } catch (error) {
      console.error('[DashboardService] AI analysis error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private static async fetchAnalysisHistory(
    apiBase: string,
    userId: string,
    limit?: number
  ): Promise<WeeklyAnalysisHistoryItem[]> {
    try {
      const baseUrl = apiBase.endsWith('/api') ? apiBase : `${apiBase.replace(/\/+$/, '')}/api`
      const limitQuery = typeof limit === 'number' ? `&limit=${limit}` : ''
      const response = await fetch(`${baseUrl}/ai/weekly-ibd-analysis?userId=${userId}${limitQuery}`)

      if (!response.ok) {
        return []
      }

      const data = (await response.json()) as { success: boolean; history?: WeeklyAnalysisHistoryItem[] }
      if (!data.success || !Array.isArray(data.history)) {
        return []
      }
      return this.normalizeHistory(apiBase, data.history)
    } catch (error) {
      console.error('[DashboardService] Failed to fetch analysis history:', error)
      return []
    }
  }

  private static normalizeHistory(
    apiBase: string,
    items?: WeeklyAnalysisHistoryItem[]
  ): WeeklyAnalysisHistoryItem[] {
    if (!items || items.length === 0) {
      return []
    }

    const baseUrl = apiBase.endsWith('/api') ? apiBase : `${apiBase.replace(/\/+$/, '')}/api`
    const apiRoot = baseUrl.replace(/\/api$/, '')

    return items.map((item: any) => ({
      ...item,
      pdfPath:
        item.pdfPath && typeof item.pdfPath === 'string' && !item.pdfPath.startsWith('http')
          ? `${apiRoot}${item.pdfPath}`
          : item.pdfPath,
      allFoodsOverview: item.allFoodsOverview || item.all_foods_overview || undefined,
      foodsToMonitor: item.foodsToMonitor || item.foods_to_monitor || [],
      supportiveFoods: item.supportiveFoods || item.supportive_foods || [],
    }))
      .reduce<WeeklyAnalysisHistoryItem[]>((acc, item) => {
        const key = `${item.startDate}_${item.endDate}`
        if (!acc.find((existing) => `${existing.startDate}_${existing.endDate}` === key)) {
          acc.push(item)
        }
        return acc
      }, [])
  }

  /**
   * Generate health insights based on data
   */
  private static generateInsights(
    stats: DashboardStats,
    trend: WeeklyTrend
  ): HealthInsight[] {
    const insights: HealthInsight[] = []

    // Consistent tracking insight
    if (stats.weekFoodEntries >= 14) {
      insights.push({
        id: '1',
        type: 'positive',
        icon: '🎉',
        title: '持續記錄',
        description: '本週已記錄多筆飲食，保持良好習慣！',
        timestamp: new Date().toISOString(),
      })
    }

    // Low symptom frequency
    if (stats.weekSymptomEntries === 0) {
      insights.push({
        id: '2',
        type: 'positive',
        icon: '😊',
        title: '健康狀況良好',
        description: '本週未記錄任何症狀，繼續保持！',
        timestamp: new Date().toISOString(),
      })
    }

    // High symptom frequency warning
    if (stats.weekSymptomEntries > 10) {
      insights.push({
        id: '3',
        type: 'warning',
        icon: '⚠️',
        title: '注意症狀頻率',
        description: '本週症狀記錄較多，建議諮詢醫療專業人員',
        timestamp: new Date().toISOString(),
      })
    }

    return insights
  }

  /**
   * Get data coverage information for the user
   * Phase A: Data Coverage Dashboard
   */
  static async getDataCoverage(userId: string): Promise<{
    data: DataCoverageInfo | null
    error: { message: string } | null
  }> {
    try {
      const apiResult = await this.fetchCoverageFromApi(userId).catch((err) => {
        console.warn('[DashboardService] Coverage API call failed, will fallback:', err)
        return { data: null, error: { message: err instanceof Error ? err.message : 'API error' } }
      })
      if (apiResult.data || !apiResult.error) {
        return apiResult
      }

      // 若 API base 未設定或請求失敗，直接從 Supabase 計算最近 7 天覆蓋率
      const fallback = await this.computeCoverageFallback(userId)
      return { data: fallback, error: null }
    } catch (error) {
      console.error('[DashboardService] Error fetching data coverage:', error)
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : '未知錯誤' },
      }
    }
  }

  /**
   * Get missing data alerts for the user
   * Phase A: Missing Data Alerts
   */
  static async getMissingDataAlerts(
    userId: string,
    daysThreshold: number = 2
  ): Promise<{
    data: MissingDataAlert[] | null
    error: { message: string } | null
  }> {
    const apiBase = process.env.EXPO_PUBLIC_API_URL
    if (!apiBase) {
      console.warn('[DashboardService] EXPO_PUBLIC_API_URL not configured')
      return { data: null, error: { message: 'API URL not configured' } }
    }

    try {
      // 取得認證 token
      const { session } = await AuthService.getSession()
      if (!session?.access_token) {
        console.warn('[DashboardService] No session token available')
        return { data: null, error: { message: '需要登入' } }
      }

      const normalizedBase = apiBase.replace(/\/+$/, '')
      // 確保路徑正確：如果 base 已經包含 /api，就不再加
      const baseApiUrl = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`
      const endpoint = `${baseApiUrl}/mobile/data-coverage/alerts?userId=${userId}&daysThreshold=${daysThreshold}`

      console.log('[DashboardService] Fetching missing data alerts from:', endpoint)

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      console.log('[DashboardService] Missing alerts response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('[DashboardService] Failed to fetch missing data alerts', {
          status: response.status,
          statusText: response.statusText,
          endpoint,
          error: errorText,
        })
        return { data: null, error: { message: `HTTP ${response.status}: ${errorText || response.statusText}` } }
      }

      const result = await response.json()
      if (!result.success) {
        return { data: null, error: { message: result.error || '無法取得缺漏提醒' } }
      }

      return { data: result.alerts || [], error: null }
    } catch (error) {
      console.error('[DashboardService] Error fetching missing data alerts:', error)
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : '未知錯誤' },
      }
    }
  }

  /**
   * Get user streak data
   * Phase A: Gamification - Streak tracking
   */
  static async getStreak(userId: string): Promise<{
    data: {
      currentStreak: number
      longestStreak: number
      milestones: number[]
    } | null
    error: { message: string } | null
  }> {
    try {
      const apiResult = await this.fetchStreakFromApi(userId).catch((err) => {
        console.warn('[DashboardService] Streak API call failed, will fallback:', err)
        return { data: null, error: { message: err instanceof Error ? err.message : 'API error' } }
      })
      if (apiResult.data || !apiResult.error) {
        return apiResult
      }

      // Fallback: compute streak locally from symptom entries when API/URL is unavailable
      const fallback = await this.computeStreakFallback(userId)
      return { data: fallback, error: null }
    } catch (error) {
      console.error('[DashboardService] getStreak error:', error)
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : '網路錯誤' },
      }
    }
  }

  /**
   * Primary streak fetch through API (supports Bearer token for mobile)
   */
  private static async fetchStreakFromApi(userId: string) {
    // 取得認證 token（與其他方法保持一致）
    const { session } = await AuthService.getSession()
    if (!session?.access_token) {
      console.warn('[DashboardService] No session token available for streak')
      return {
        data: null,
        error: { message: '需要登入' },
      }
    }

    // 使用與其他方法相同的 API URL 邏輯
    const apiBase = process.env.EXPO_PUBLIC_API_URL
    if (!apiBase) {
      console.warn('[DashboardService] EXPO_PUBLIC_API_URL not configured')
      return { data: null, error: { message: 'API URL not configured' } }
    }

    const normalizedBase = apiBase.replace(/\/+$/, '')
    // 確保路徑正確：如果 base 已經包含 /api，就不再加
    const baseApiUrl = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`
    const endpoint = `${baseApiUrl}/mobile/gamification/streak?userId=${userId}`

    console.log('[DashboardService] Fetching streak from:', endpoint)

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    })

    console.log('[DashboardService] Streak response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn('[DashboardService] Failed to fetch streak', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        error: errorText,
      })
      return { data: null, error: { message: `HTTP ${response.status}: ${errorText || response.statusText}` } }
    }

    const result = await response.json()
    console.log('[DashboardService] Streak result:', result)

    if (!result.success) {
      return {
        data: null,
        error: { message: result.error || '無法取得連續記錄天數' },
      }
    }

    return {
      data: result.streak,
      error: null,
    }
  }

  /**
   * Fallback streak calculation using local Supabase data (最近 90 天症狀記錄)
   */
  private static async computeStreakFallback(userId: string) {
    const start = new Date()
    start.setDate(start.getDate() - 90)
    start.setHours(0, 0, 0, 0)
    const startDate = start.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('daily_symptom_entries')
      .select('recorded_date')
      .eq('user_id', userId)
      .gte('recorded_date', startDate)
      .order('recorded_date', { ascending: false })

    if (error) {
      console.warn('[DashboardService] Fallback streak query error:', error)
      return { currentStreak: 0, longestStreak: 0, milestones: [] }
    }

    const uniqueDates = new Set((data || []).map((d) => d.recorded_date).filter(Boolean))

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Calculate current streak (count backward from today)
    let currentStreak = 0
    let cursor = new Date(todayStr + 'T00:00:00Z')
    while (uniqueDates.has(cursor.toISOString().split('T')[0])) {
      currentStreak += 1
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }

    // Calculate longest streak across the dataset
    const sortedAsc = Array.from(uniqueDates).sort()
    let longestStreak = 0
    let streak = 0
    let lastDate: Date | null = null
    sortedAsc.forEach((dateStr) => {
      const date = new Date(dateStr + 'T00:00:00Z')
      if (!lastDate) {
        streak = 1
      } else {
        const diffDays = Math.round((date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        streak = diffDays === 1 ? streak + 1 : 1
      }
      longestStreak = Math.max(longestStreak, streak)
      lastDate = date
    })

    return { currentStreak, longestStreak, milestones: [] }
  }

  /**
   * Primary coverage fetch through API
   */
  private static async fetchCoverageFromApi(userId: string) {
    const apiBase = process.env.EXPO_PUBLIC_API_URL
    if (!apiBase) {
      console.warn('[DashboardService] EXPO_PUBLIC_API_URL not configured')
      return { data: null, error: { message: 'API URL not configured' } }
    }

    // 取得認證 token
    const { session } = await AuthService.getSession()
    if (!session?.access_token) {
      console.warn('[DashboardService] No session token available')
      return { data: null, error: { message: '需要登入' } }
    }

    const normalizedBase = apiBase.replace(/\/+$/, '')
    // 確保路徑正確：如果 base 已經包含 /api，就不再加
    const baseApiUrl = normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`
    const endpoint = `${baseApiUrl}/mobile/data-coverage?userId=${userId}`

    console.log('[DashboardService] Fetching data coverage from:', endpoint)

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    })

    console.log('[DashboardService] Data coverage response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn('[DashboardService] Failed to fetch data coverage', {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        error: errorText,
      })
      return { data: null, error: { message: `HTTP ${response.status}: ${errorText || response.statusText}` } }
    }

    const result = await response.json()
    if (!result.success || !result.coverage) {
      return { data: null, error: { message: result.error || '無法取得資料覆蓋率' } }
    }

    return { data: result.coverage, error: null }
  }

  /**
   * Fallback coverage calculation from Supabase (最近 7 天)
   */
  private static async computeCoverageFallback(userId: string): Promise<DataCoverageInfo> {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const start = new Date()
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)

    const startStr = start.toISOString().split('T')[0]
    const endStr = today.toISOString().split('T')[0]

    const [foodRes, symptomRes] = await Promise.all([
      supabase
        .from('food_entries')
        .select('id, consumed_at')
        .eq('user_id', userId)
        .gte('consumed_at', start.toISOString())
        .lte('consumed_at', today.toISOString()),
      supabase
        .from('daily_symptom_entries')
        .select('id, recorded_date')
        .eq('user_id', userId)
        .gte('recorded_date', startStr)
        .lte('recorded_date', endStr),
    ])

    const foodEntries = foodRes.data || []
    const symptomEntries = symptomRes.data || []

    const foodDays = new Set(
      foodEntries
        .map((f) => f.consumed_at)
        .filter(Boolean)
        .map((c) => c.split('T')[0])
    )
    const symptomDays = new Set(symptomEntries.map((s) => s.recorded_date).filter(Boolean))

    const symptomCoveragePercent = Math.round((symptomDays.size / 7) * 100)
    const foodCoveragePercent = Math.round((foodDays.size / 7) * 100)
    const overallStatus =
      symptomCoveragePercent >= 80 && foodCoveragePercent >= 80
        ? 'sufficient'
        : symptomCoveragePercent >= 40 || foodCoveragePercent >= 40
        ? 'partial'
        : 'insufficient'

    return {
      user_id: userId,
      email: '',
      name: null,
      period_start: startStr,
      period_end: endStr,
      symptom_entry_days: symptomDays.size,
      total_days: 7,
      symptom_coverage_percent: symptomCoveragePercent,
      food_coverage_percent: foodCoveragePercent,
      medication_coverage_percent: 0,
      sleep_coverage_percent: 0,
      exercise_coverage_percent: 0,
      overall_data_status: overallStatus,
      missing_categories: [],
      last_data_update: today.toISOString(),
      // Extra fields used by UI (not persisted)
      totalDays: 7,
      recentWeeks: [
        {
          startDate: startStr,
          endDate: endStr,
          foodEntries: foodEntries.length,
          symptomEntries: symptomEntries.length,
        },
      ],
    } as DataCoverageInfo
  }
}

// Phase A: Data Coverage Types
export interface DataCoverageInfo {
  user_id: string
  email: string
  name: string | null
  period_start: string
  period_end: string
  symptom_entry_days: number
  total_days: number
  symptom_coverage_percent: number
  food_coverage_percent: number
  medication_coverage_percent: number
  sleep_coverage_percent: number
  exercise_coverage_percent: number
  overall_data_status: 'sufficient' | 'partial' | 'insufficient'
  missing_categories: string[]
  last_data_update: string | null
}

export interface MissingDataAlert {
  category: string
  missing_days: number
  last_entry_date: string | null
  recommendation: string
}
