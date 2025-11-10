import { NextRequest, NextResponse } from 'next/server'
import {
  createUnauthorizedResponse,
  getAuthenticatedUser,
} from '@/lib/supabase/server-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { getAdminUsageOverview } from '@/lib/ai/usage-service'

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return createUnauthorizedResponse('請先登入')
  }

  const isAdmin = await userIsAdmin(user.id)
  if (!isAdmin) {
    return NextResponse.json(
      {
        success: false,
        message: '需要管理員權限',
      },
      { status: 403 },
    )
  }

  try {
    const overview = await getAdminUsageOverview()
    return NextResponse.json({
      success: true,
      overview,
    })
  } catch (error) {
    console.error('[GET /api/admin/ai-usage] failed:', error)
    return NextResponse.json(
      {
        success: false,
        message: '無法載入 AI 使用統計',
      },
      { status: 500 },
    )
  }
}

async function userIsAdmin(userId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('diet_daily_users')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[userIsAdmin] failed:', error)
    return false
  }

  return !!data?.is_admin
}
