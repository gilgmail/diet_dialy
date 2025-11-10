import { NextRequest, NextResponse } from 'next/server'
import {
  createUnauthorizedResponse,
  getAuthenticatedUser,
} from '@/lib/supabase/server-auth'
import {
  getAllowedAlertChannels,
  getUsageSummaryForUser,
  updateAlertSettings,
} from '@/lib/ai/usage-service'

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return createUnauthorizedResponse('請先登入以查看 AI 使用狀況')
  }

  try {
    const summary = await getUsageSummaryForUser(user.id)
    return NextResponse.json({
      success: true,
      summary,
      allowedChannels: getAllowedAlertChannels(),
    })
  } catch (error) {
    console.error('[GET /api/ai/usage] failed:', error)
    return NextResponse.json(
      {
        success: false,
        message: '無法載入 AI 使用資訊，請稍後重試',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return createUnauthorizedResponse('請先登入以更新成本提醒')
  }

  try {
    const body = await request.json().catch(() => ({}))
    const updated = await updateAlertSettings(user.id, {
      thresholdUsd: body?.thresholdUsd,
      channels: body?.channels,
    })

    // refresh summary with latest settings
    const refreshed = await getUsageSummaryForUser(user.id)
    return NextResponse.json({
      success: true,
      alertSettings: updated,
      summary: refreshed,
      allowedChannels: getAllowedAlertChannels(),
    })
  } catch (error) {
    console.error('[PATCH /api/ai/usage] failed:', error)
    return NextResponse.json(
      {
        success: false,
        message: '更新提醒設定時發生錯誤',
      },
      { status: 500 },
    )
  }
}
