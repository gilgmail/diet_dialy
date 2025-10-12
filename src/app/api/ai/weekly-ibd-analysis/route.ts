import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { IBDWeeklyAnalysisAgent, type PromptVariantKey } from '@/lib/ai/weekly-ibd-analysis'
import { createAdminClient } from '@/lib/supabase/server'

const HISTORY_BUCKET = 'ai-weekly-reports'

function encodeKey(key: string) {
  return Buffer.from(key).toString('base64url')
}

function decodeKey(key: string) {
  return Buffer.from(key, 'base64url').toString('utf8')
}

async function ensureBucket(admin = createAdminClient()) {
  const storage = admin.storage
  try {
    await storage.createBucket(HISTORY_BUCKET, { public: false })
  } catch (error: any) {
    if (!String(error?.message || '').includes('already exists')) {
      console.warn('[weekly-ibd-analysis] create bucket warning:', error)
    }
  }
}

async function upsertWeeklyReport(
  userId: string,
  analysis: Awaited<ReturnType<IBDWeeklyAnalysisAgent['analyze']>>
) {
  if (!analysis.success || analysis.method === 'insufficient_data') {
    return null
  }

  try {
    const admin = createAdminClient()
    const storage = admin.storage
    await ensureBucket(admin)

    const timeframe = analysis.timeframe
    const key = `${userId}/${timeframe.startDate}_${timeframe.endDate}_${Date.now()}.json`

    const payload = {
      userId,
      timeframe,
      generatedAt: new Date().toISOString(),
      method: analysis.method,
      totals: analysis.totals,
      prompt: analysis.prompt_used,
      analysis: analysis.analysis,
    }

    const { error } = await storage.from(HISTORY_BUCKET).upload(key, JSON.stringify(payload), {
      contentType: 'application/json',
      upsert: false,
    })

    if (error && !String(error.message).includes('already exists')) {
      throw error
    }

    return { key }
  } catch (error) {
    console.error('[weekly-ibd-analysis] Failed to persist report:', error)
    return null
  }
}

async function fetchWeeklyHistory(userId: string, limit: number = 5) {
  try {
    const admin = createAdminClient()
    const storage = admin.storage
    await ensureBucket(admin)

    const { data, error } = await storage
      .from(HISTORY_BUCKET)
      .list(userId, { limit, sortBy: { column: 'created_at', order: 'desc' } })

    if (error) {
      throw error
    }

    if (!data) return []

    const items = await Promise.all(
      data.map(async (item) => {
        const fileKey = `${userId}/${item.name}`
        const download = await storage.from(HISTORY_BUCKET).download(fileKey)
        if (download.error) {
          throw download.error
        }
        const json = JSON.parse(await download.data.text())

        const encoded = encodeKey(fileKey)
        const analysis = json.analysis || {}
        return {
          id: encoded,
          title: `AI 每週分析 ${json.timeframe.startDate} ~ ${json.timeframe.endDate}`,
          createdAt: json.generatedAt,
          startDate: json.timeframe.startDate,
          endDate: json.timeframe.endDate,
          summary: json.analysis.summary || '',
          followUpActions: json.analysis.follow_up_actions || [],
          pdfPath: `/api/ai/weekly-ibd-analysis/${encoded}/pdf`,
          foodsToMonitor: analysis.foods_to_monitor || [],
          supportiveFoods: analysis.supportive_foods || [],
        }
      })
    )

    const sorted = items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // 🔍 Diagnostic logging for deduplication
    console.log('[fetchWeeklyHistory] 🔍 Deduplication process:')
    console.log('  📊 Total reports before dedup:', sorted.length)

    // Improved deduplication: Keep only the most recent report per date range
    // This ensures new reports with updated data replace old ones
    const dedupMap = new Map<string, typeof sorted[0]>()
    sorted.forEach((item) => {
      const key = `${item.startDate}_${item.endDate}`
      const exists = dedupMap.has(key)

      if (!exists) {
        dedupMap.set(key, item)
      }

      // Log each dedup decision with more detail
      console.log(`  ${exists ? '⏭️ Skip' : '✅ Keep'} [${key}]`)
      console.log(`    🕒 Created: ${item.createdAt}`)
      console.log(`    📊 Data: ${item.title}`)
    })

    const dedupedItems = Array.from(dedupMap.values())
    console.log('  📊 Total reports after dedup:', dedupedItems.length)

    return dedupedItems
  } catch (error) {
    console.error('[weekly-ibd-analysis] Failed to load history:', error)
    return []
  }
}

interface WeeklyAnalysisRequestBody {
  userId: string
  startDate?: string
  endDate?: string
  promptStyle?: PromptVariantKey
  promptOverride?: string
  includePromptRecommendations?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: WeeklyAnalysisRequestBody = await request.json()

    if (!body.userId?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少 userId，無法取得對應的飲食與症狀資料'
        },
        { status: 400 }
      )
    }

    if (body.startDate && Number.isNaN(new Date(body.startDate).getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'startDate 格式無效，請使用 YYYY-MM-DD'
        },
        { status: 400 }
      )
    }

    if (body.endDate && Number.isNaN(new Date(body.endDate).getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: 'endDate 格式無效，請使用 YYYY-MM-DD'
        },
        { status: 400 }
      )
    }

    if (body.startDate && body.endDate) {
      const start = new Date(body.startDate)
      const end = new Date(body.endDate)
      if (start > end) {
        return NextResponse.json(
          {
            success: false,
            error: 'startDate 需要早於 endDate'
          },
          { status: 400 }
        )
      }
      const diffDays = Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays > 31) {
        return NextResponse.json(
          {
            success: false,
            error: '分析區間最長 31 天，請縮短日期範圍'
          },
          { status: 400 }
        )
      }
    }

    // 🔍 Diagnostic logging for API request
    console.log('[weekly-ibd-analysis] 🔍 POST request received:')
    console.log('  👤 userId:', body.userId)
    console.log('  📅 startDate:', body.startDate)
    console.log('  📅 endDate:', body.endDate)

    const agent = new IBDWeeklyAnalysisAgent()
    const result = await agent.analyze(body.userId, {
      startDate: body.startDate,
      endDate: body.endDate,
      promptStyle: body.promptStyle,
      promptOverride: body.promptOverride,
      includePromptRecommendations: body.includePromptRecommendations
    })

    // 🔍 Diagnostic logging for analysis result
    console.log('[weekly-ibd-analysis] 📊 Analysis completed:')
    console.log('  ✅ success:', result.success)
    console.log('  📊 method:', result.method)
    console.log('  🍽️ food_entries:', result.totals.food_entries)
    console.log('  ❤️ symptom_entries:', result.totals.symptom_entries)
    console.log('  📅 timeframe:', result.timeframe)

    if (result.success) {
      console.log('[weekly-ibd-analysis] 💾 Saving report to storage...')
      await upsertWeeklyReport(body.userId, result)
      console.log('[weekly-ibd-analysis] ✅ Report saved successfully')
    }

    const history = await fetchWeeklyHistory(body.userId)
    console.log('[weekly-ibd-analysis] 📚 Fetched history:', history.length, 'reports')

    const status = result.success ? 200 : 202

    return NextResponse.json({
      success: result.success,
      analysis: result,
      history
    }, { status })
  } catch (error) {
    console.error('[weekly-ibd-analysis] POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '無法完成 AI 分析'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (userId) {
    const history = await fetchWeeklyHistory(userId, Number(searchParams.get('limit')) || 10)
    return NextResponse.json({ success: true, history })
  }

  const prompts = IBDWeeklyAnalysisAgent.getPromptTemplates()
  return NextResponse.json({
    name: 'IBD 每週飲食與症狀 AI 分析',
    description: '提供給 IBD 病患的每週飲食/症狀整合分析，找出高風險食物與腸道修復策略。',
    defaultPrompt: IBDWeeklyAnalysisAgent.getDefaultPrompt(),
    availablePromptStyles: prompts
  })
}
