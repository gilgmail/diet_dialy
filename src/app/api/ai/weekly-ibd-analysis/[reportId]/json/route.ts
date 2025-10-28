import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { createAdminClient } from '@/lib/supabase/server'

const HISTORY_BUCKET = 'ai-weekly-reports'

function decodeKey(key: string) {
  return Buffer.from(key, 'base64url').toString('utf8')
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await context.params

  if (!reportId) {
    return NextResponse.json({ success: false, error: '缺少報告 ID' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const storage = admin.storage
    const fileKey = decodeKey(reportId)

    const download = await storage.from(HISTORY_BUCKET).download(fileKey)
    if (download.error) {
      throw download.error
    }

    const payload = JSON.parse(await download.data.text())
    const fileName = encodeURIComponent(
      `ai-weekly-report-${payload.timeframe.startDate}-${payload.timeframe.endDate}.json`
    )

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('[weekly-ibd-analysis] JSON export error:', error)
    return NextResponse.json({ success: false, error: 'JSON 匯出失敗' }, { status: 500 })
  }
}
