import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import {
  IBDWeeklyAnalysisAgent,
  type PromptVariantKey,
  WEEKLY_ANALYSIS_VERSION,
} from '@/lib/ai/weekly-ibd-analysis'
import { createAdminClient } from '@/lib/supabase/server'

// Constants
const HISTORY_BUCKET = 'ai-weekly-reports'
const MAX_ANALYSIS_DAYS = 31
const DEFAULT_HISTORY_LIMIT = 5

// Types
interface WeeklyAnalysisRequestBody {
  userId: string
  startDate?: string
  endDate?: string
  promptStyle?: PromptVariantKey
  promptOverride?: string
  includePromptRecommendations?: boolean
}

interface WeeklyReportPayload {
  userId: string
  timeframe: { startDate: string; endDate: string }
  generatedAt: string
  method: string
  analysisVersion?: string
  totals: Record<string, any>
  prompt: string
  analysis: Record<string, any>
  datasetSummary: {
    foodEntries: number
    symptomEntries: number
    totalRecords: number
  }
}

type WeeklyAnalysisStatusState = 'pending' | 'in_progress' | 'completed' | 'failed'

type WeeklyAnalysisStatusStepKey =
  | 'dataset'
  | 'server_processing'
  | 'server_response'
  | 'report_generation'

interface WeeklyAnalysisStatusStep {
  key: WeeklyAnalysisStatusStepKey
  label: string
  state: WeeklyAnalysisStatusState
  detail?: string
  timestamp?: string
}

interface WeeklyAnalysisStatus {
  datasetSummary: {
    foodEntries: number
    symptomEntries: number
    totalRecords: number
  }
  steps: WeeklyAnalysisStatusStep[]
  reportGenerated: boolean
  lastUpdated: string
  analysisVersion: string
}

// Utility functions
function encodeKey(key: string): string {
  return Buffer.from(key).toString('base64url')
}

function decodeKey(key: string): string {
  return Buffer.from(key, 'base64url').toString('utf8')
}

// Storage management
async function ensureBucket(admin = createAdminClient()): Promise<void> {
  try {
    await admin.storage.createBucket(HISTORY_BUCKET, { public: false })
  } catch (error: any) {
    if (!error?.message?.includes('already exists')) {
      console.warn('[weekly-ibd-analysis] Bucket creation warning:', error)
    }
  }
}

async function upsertWeeklyReport(
  userId: string,
  analysis: Awaited<ReturnType<IBDWeeklyAnalysisAgent['analyze']>>
): Promise<{ key: string } | null> {
  if (!analysis.success || analysis.method === 'insufficient_data') {
    return null
  }

  try {
    const admin = createAdminClient()
    await ensureBucket(admin)

    const { timeframe } = analysis
    const key = `${userId}/${timeframe.startDate}_${timeframe.endDate}_${Date.now()}.json`
    const foodEntries = analysis.totals?.food_entries ?? 0
    const symptomEntries = analysis.totals?.symptom_entries ?? 0
    const datasetSummary = {
      foodEntries,
      symptomEntries,
      totalRecords: foodEntries + symptomEntries,
    }

    const payload: WeeklyReportPayload = {
      userId,
      timeframe,
      generatedAt: new Date().toISOString(),
      method: analysis.method,
      analysisVersion: WEEKLY_ANALYSIS_VERSION,
      totals: analysis.totals,
      prompt: analysis.prompt_used,
      analysis: analysis.analysis,
      datasetSummary,
    }

    const { error } = await admin.storage
      .from(HISTORY_BUCKET)
      .upload(key, JSON.stringify(payload), {
        contentType: 'application/json',
        upsert: false,
      })

    if (error && !error.message.includes('already exists')) {
      throw error
    }

    return { key }
  } catch (error) {
    console.error('[weekly-ibd-analysis] Failed to persist report:', error)
    return null
  }
}

async function fetchWeeklyHistory(userId: string, limit = DEFAULT_HISTORY_LIMIT) {
  try {
    const admin = createAdminClient()
    await ensureBucket(admin)

    const { data, error } = await admin.storage
      .from(HISTORY_BUCKET)
      .list(userId, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })

    if (error) throw error
    if (!data) return []

    const items = await Promise.all(
      data.map(async (item) => {
        const fileKey = `${userId}/${item.name}`
        const download = await admin.storage.from(HISTORY_BUCKET).download(fileKey)

        if (download.error) throw download.error

        const json = JSON.parse(await download.data.text()) as WeeklyReportPayload
        const analysis = json.analysis || {}
        const datasetSummary = json.datasetSummary || {
          foodEntries: json.totals?.food_entries ?? 0,
          symptomEntries: json.totals?.symptom_entries ?? 0,
          totalRecords:
            (json.totals?.food_entries ?? 0) + (json.totals?.symptom_entries ?? 0),
        }
        const analysisVersion =
          typeof json.analysisVersion === 'string'
            ? json.analysisVersion
            : 'legacy'

        const reportId = encodeKey(fileKey)
        return {
          id: reportId,
          title: `AI 每週分析 ${json.timeframe.startDate} ~ ${json.timeframe.endDate}`,
          createdAt: json.generatedAt,
          startDate: json.timeframe.startDate,
          endDate: json.timeframe.endDate,
          summary: analysis.summary || '',
          followUpActions: analysis.follow_up_actions || [],
          pdfPath: `/api/ai/weekly-ibd-analysis/${reportId}/pdf`,
          jsonPath: `/api/ai/weekly-ibd-analysis/${reportId}/json`,
          allFoodsOverview: analysis.all_foods_overview || undefined,
          foodsToMonitor: analysis.foods_to_monitor || [],
          supportiveFoods: analysis.supportive_foods || [],
          reasoningTrace: analysis.reasoning_trace || [],
          evidenceNotes: analysis.evidence_notes || [],
          dailyFoodBreakdown: analysis.daily_food_breakdown || [],
          nextSteps: analysis.next_steps || {
            maintain: [],
            monitor: [],
            experiments: []
          },
          analysisVersion,
          datasetSummary,
        }
      })
    )

    // Sort by creation date (newest first)
    const sorted = items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Deduplicate: keep only the most recent report per date range
    const dedupMap = new Map<string, typeof sorted[0]>()
    sorted.forEach((item) => {
      const key = `${item.startDate}_${item.endDate}`
      if (!dedupMap.has(key)) {
        dedupMap.set(key, item)
      }
    })

    const deduped = Array.from(dedupMap.values())

    // Add report numbers (newest = #1)
    return deduped.slice(0, limit).map((item, index) => ({
      ...item,
      reportNumber: index + 1,
      totalReports: deduped.length,
    }))
  } catch (error) {
    console.error('[weekly-ibd-analysis] Failed to load history:', error)
    return []
  }
}

// Validation helpers
function validateDateFormat(date: string, fieldName: string): NextResponse | null {
  if (Number.isNaN(new Date(date).getTime())) {
    return NextResponse.json(
      { success: false, error: `${fieldName} 格式無效，請使用 YYYY-MM-DD` },
      { status: 400 }
    )
  }
  return null
}

function validateDateRange(startDate: string, endDate: string): NextResponse | null {
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (start > end) {
    return NextResponse.json(
      { success: false, error: 'startDate 需要早於 endDate' },
      { status: 400 }
    )
  }

  const diffDays = Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays > MAX_ANALYSIS_DAYS) {
    return NextResponse.json(
      { success: false, error: `分析區間最長 ${MAX_ANALYSIS_DAYS} 天，請縮短日期範圍` },
      { status: 400 }
    )
  }

  return null
}

// API handlers
export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  console.log(`\n========== [${requestId}] 週間 AI 分析請求開始 ==========`)

  try {
    const body: WeeklyAnalysisRequestBody = await request.json()
    console.log(`[${requestId}] 收到請求參數:`, {
      userId: body.userId?.substring(0, 8) + '...',
      startDate: body.startDate,
      endDate: body.endDate,
      promptStyle: body.promptStyle,
      hasPromptOverride: !!body.promptOverride,
    })

    // Validate userId
    if (!body.userId?.trim()) {
      console.error(`[${requestId}] ❌ 驗證失敗: 缺少 userId`)
      return NextResponse.json(
        { success: false, error: '缺少 userId，無法取得對應的飲食與症狀資料' },
        { status: 400 }
      )
    }

    // Validate date formats
    if (body.startDate) {
      const error = validateDateFormat(body.startDate, 'startDate')
      if (error) return error
    }

    if (body.endDate) {
      const error = validateDateFormat(body.endDate, 'endDate')
      if (error) return error
    }

    // Validate date range
    if (body.startDate && body.endDate) {
      const error = validateDateRange(body.startDate, body.endDate)
      if (error) return error
    }

    // 🎯 獲取用戶的 AI 模型偏好設定（從 diet_daily_users.preferences.mobileSettings）
    const admin = createAdminClient()
    const { data: user } = await admin
      .from('diet_daily_users')
      .select('preferences')
      .eq('id', body.userId)
      .maybeSingle()

    let aiModelPreference = 'haiku-3.5-latest' // 預設值
    if (user?.preferences && typeof user.preferences === 'object') {
      const prefs = user.preferences as Record<string, any>
      if (prefs.mobileSettings && typeof prefs.mobileSettings === 'object') {
        const mobileSettings = prefs.mobileSettings as Record<string, any>
        if (mobileSettings.aiModelPreference && typeof mobileSettings.aiModelPreference === 'string') {
          aiModelPreference = mobileSettings.aiModelPreference
        }
      }
    }

    // 🗺️ 將用戶偏好轉換為實際的模型 ID 和配置
    let modelConfig: { model?: string; mockMode?: boolean } = {}
    switch (aiModelPreference) {
      case 'sonnet-4.5-latest':
        modelConfig = { model: 'claude-sonnet-4-5-20250929' }
        break
      case 'haiku-3.5-latest':
        modelConfig = { model: 'claude-3-5-haiku-latest' }
        break
      case 'haiku-3-legacy':
        modelConfig = { model: 'claude-3-haiku-20240307' }
        break
      case 'mock':
        modelConfig = { mockMode: true }
        break
      default:
        modelConfig = { model: 'claude-3-5-haiku-latest' }
    }

    console.log(`[${requestId}] 🎛️ 用戶 AI 模型偏好: ${aiModelPreference}`, modelConfig)

    // Run AI analysis
    console.log(`[${requestId}] 🤖 開始執行 AI 分析...`)
    const analysisStartTime = Date.now()
    const agent = new IBDWeeklyAnalysisAgent(modelConfig.model ? { model: modelConfig.model } : undefined)
    const result = await agent.analyze(body.userId, {
      startDate: body.startDate,
      endDate: body.endDate,
      promptStyle: body.promptStyle,
      promptOverride: body.promptOverride,
      includePromptRecommendations: body.includePromptRecommendations,
      useMockMode: modelConfig.mockMode,
    })
    const analysisDuration = ((Date.now() - analysisStartTime) / 1000).toFixed(2)
    console.log(`[${requestId}] ✅ AI 分析完成 (耗時 ${analysisDuration}s):`, {
      success: result.success,
      method: result.method,
      aiModel: modelConfig.mockMode ? 'mock' : modelConfig.model,
      foodEntries: result.totals.food_entries,
      uniqueFoods: result.totals.unique_foods,
      symptomEntries: result.totals.symptom_entries,
      timeframe: `${result.timeframe.startDate} ~ ${result.timeframe.endDate}`,
    })

    // 🏷️ 將模型資訊加入到結果中
    result.aiModel = modelConfig.mockMode ? 'mock' : modelConfig.model
    result.aiModelPreference = aiModelPreference

    // Fetch history (before saving new report to get current count)
    console.log(`[${requestId}] 📚 取得歷史報告...`)
    const history = await fetchWeeklyHistory(body.userId)
    console.log(`[${requestId}] 找到 ${history.length} 份歷史報告`)

    // Save successful report and prepare response message
    let reportInfo = null
    if (result.success) {
      console.log(`[${requestId}] 💾 儲存新報告到 Storage...`)
      const saveResult = await upsertWeeklyReport(body.userId, result)
      if (saveResult) {
        console.log(`[${requestId}] ✅ 報告已儲存: ${saveResult.key}`)
      } else {
        console.warn(`[${requestId}] ⚠️ 報告儲存失敗或被跳過`)
      }

      const newReportNumber = 1 // 新報告永遠是 #1 (最新)
      const totalReports = history.length + 1
      reportInfo = {
        reportNumber: newReportNumber,
        totalReports: totalReports,
        message: `✅ 報告 #${newReportNumber} 生成成功（共 ${totalReports} 份報告）`,
        dateRange: `${result.timeframe.startDate} ~ ${result.timeframe.endDate}`,
      }
    }

    // Refresh history to include new report
    console.log(`[${requestId}] 🔄 重新載入歷史報告（包含新報告）...`)
    const updatedHistory = result.success ? await fetchWeeklyHistory(body.userId) : history
    console.log(`[${requestId}] 最終歷史報告數量: ${updatedHistory.length}`)

    // Prepare error message if analysis failed
    let errorMessage = null
    if (!result.success) {
      if (result.method === 'insufficient_data') {
        errorMessage = `❌ 資料不足：需要至少 3 筆飲食記錄才能進行分析。目前只有 ${result.totals.food_entries || 0} 筆。`
        console.warn(`[${requestId}] ⚠️ ${errorMessage}`)
      } else {
        errorMessage = `⚠️ 分析失敗：無法完成 AI 分析，請稍後再試。`
        console.error(`[${requestId}] ❌ ${errorMessage}`)
      }
    }

    const foodEntriesCount = result.totals.food_entries || 0
    const symptomEntriesCount = result.totals.symptom_entries || 0
    const totalRecords = foodEntriesCount + symptomEntriesCount
    const analysisStartedAt = new Date(analysisStartTime).toISOString()
    const analysisCompletedAt = new Date().toISOString()
    const reportGenerated = Boolean(result.success && reportInfo)

    const methodDetail =
      result.method === 'claude_api'
        ? 'Claude API 完成分析。'
        : result.method === 'fallback'
          ? '已使用系統內建規則生成分析。'
          : '資料不足，提供基礎建議。'

    const reportDetail = reportGenerated
      ? reportInfo?.message || '報告已建立。'
      : errorMessage ??
        (result.method === 'insufficient_data'
          ? '資料不足，本次未建立報告。'
          : '此次未成功產生報告。')

    const analysisStatus: WeeklyAnalysisStatus = {
      datasetSummary: {
        foodEntries: foodEntriesCount,
        symptomEntries: symptomEntriesCount,
        totalRecords,
      },
      steps: [
        {
          key: 'dataset',
          label: '整理分析資料',
          state: totalRecords > 0 ? 'completed' : 'failed',
          detail:
            totalRecords > 0
              ? `目前正在分析 ${totalRecords} 筆資料（飲食 ${foodEntriesCount}、症狀 ${symptomEntriesCount}）。`
              : '找不到可供分析的飲食與症狀資料。',
          timestamp: analysisStartedAt,
        },
        {
          key: 'server_processing',
          label: '伺服器分析中',
          state: 'completed',
          detail: `伺服器分析耗時約 ${analysisDuration}s。`,
          timestamp: analysisCompletedAt,
        },
        {
          key: 'server_response',
          label: '伺服器回應',
          state: 'completed',
          detail: methodDetail,
          timestamp: analysisCompletedAt,
        },
        {
          key: 'report_generation',
          label: '是否產生報告',
          state: reportGenerated ? 'completed' : 'failed',
          detail: reportDetail,
          timestamp: analysisCompletedAt,
        },
      ],
      reportGenerated,
      lastUpdated: analysisCompletedAt,
      analysisVersion: WEEKLY_ANALYSIS_VERSION,
    }

    console.log(`[${requestId}] 🧮 分析狀態:`, analysisStatus)

    console.log(`[${requestId}] 📤 回傳分析結果`, {
      success: result.success,
      historyCount: updatedHistory.length,
      hasReportInfo: !!reportInfo,
    })
    console.log(`========== [${requestId}] 週間 AI 分析請求完成 ==========\n`)

    return NextResponse.json(
      {
        success: result.success,
        analysis: result,
        history: updatedHistory,
        reportInfo,
        error: errorMessage,
        analysisStatus,
        analysisVersion: WEEKLY_ANALYSIS_VERSION,
      },
      { status: result.success ? 200 : 202 }
    )
  } catch (error) {
    console.error('[weekly-ibd-analysis] POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '無法完成 AI 分析',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  // Fetch user history if userId provided
  if (userId) {
    const limit = Number(searchParams.get('limit')) || 10
    const history = await fetchWeeklyHistory(userId, limit)
    return NextResponse.json({
      success: true,
      history,
      analysisVersion: WEEKLY_ANALYSIS_VERSION,
    })
  }

  // Return API metadata
  const prompts = IBDWeeklyAnalysisAgent.getPromptTemplates()
  return NextResponse.json({
    name: 'IBD 每週飲食與症狀 AI 分析',
    description: '提供給 IBD 病患的每週飲食/症狀整合分析，找出高風險食物與腸道修復策略。',
    defaultPrompt: IBDWeeklyAnalysisAgent.getDefaultPrompt(),
    availablePromptStyles: prompts,
    analysisVersion: WEEKLY_ANALYSIS_VERSION,
  })
}
