import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { IBDWeeklyAnalysisAgent, type PromptVariantKey } from '@/lib/ai/weekly-ibd-analysis'
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
  totals: Record<string, any>
  prompt: string
  analysis: Record<string, any>
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

    const payload: WeeklyReportPayload = {
      userId,
      timeframe,
      generatedAt: new Date().toISOString(),
      method: analysis.method,
      totals: analysis.totals,
      prompt: analysis.prompt_used,
      analysis: analysis.analysis,
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
      .list(userId, { limit, sortBy: { column: 'created_at', order: 'desc' } })

    if (error) throw error
    if (!data) return []

    const items = await Promise.all(
      data.map(async (item) => {
        const fileKey = `${userId}/${item.name}`
        const download = await admin.storage.from(HISTORY_BUCKET).download(fileKey)

        if (download.error) throw download.error

        const json = JSON.parse(await download.data.text()) as WeeklyReportPayload
        const analysis = json.analysis || {}

        return {
          id: encodeKey(fileKey),
          title: `AI 每週分析 ${json.timeframe.startDate} ~ ${json.timeframe.endDate}`,
          createdAt: json.generatedAt,
          startDate: json.timeframe.startDate,
          endDate: json.timeframe.endDate,
          summary: analysis.summary || '',
          followUpActions: analysis.follow_up_actions || [],
          pdfPath: `/api/ai/weekly-ibd-analysis/${encodeKey(fileKey)}/pdf`,
          foodsToMonitor: analysis.foods_to_monitor || [],
          supportiveFoods: analysis.supportive_foods || [],
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

    return Array.from(dedupMap.values())
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
  try {
    const body: WeeklyAnalysisRequestBody = await request.json()

    // Validate userId
    if (!body.userId?.trim()) {
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

    // Run AI analysis
    const agent = new IBDWeeklyAnalysisAgent()
    const result = await agent.analyze(body.userId, {
      startDate: body.startDate,
      endDate: body.endDate,
      promptStyle: body.promptStyle,
      promptOverride: body.promptOverride,
      includePromptRecommendations: body.includePromptRecommendations,
    })

    // Save successful report
    if (result.success) {
      await upsertWeeklyReport(body.userId, result)
    }

    // Fetch history
    const history = await fetchWeeklyHistory(body.userId)

    return NextResponse.json(
      {
        success: result.success,
        analysis: result,
        history,
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
    return NextResponse.json({ success: true, history })
  }

  // Return API metadata
  const prompts = IBDWeeklyAnalysisAgent.getPromptTemplates()
  return NextResponse.json({
    name: 'IBD 每週飲食與症狀 AI 分析',
    description: '提供給 IBD 病患的每週飲食/症狀整合分析，找出高風險食物與腸道修復策略。',
    defaultPrompt: IBDWeeklyAnalysisAgent.getDefaultPrompt(),
    availablePromptStyles: prompts,
  })
}
