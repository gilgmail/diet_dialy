import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createUnauthorizedResponse, getAuthenticatedUser } from '@/lib/supabase/server-auth'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

interface DietDailyUserRow {
  id: string
  email: string | null
  full_name?: string | null
  created_at?: string
  is_admin?: boolean
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return createUnauthorizedResponse('請先登入')
  }

  const adminClient = createAdminClient()

  // 確認發出請求的使用者為管理員
  const { data: requester, error: requesterError } = await adminClient
    .from('diet_daily_users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (requesterError) {
    console.error('[admin/users/search] unable to verify admin:', requesterError)
    return NextResponse.json({ success: false, error: '驗證權限失敗' }, { status: 500 })
  }

  if (!requester?.is_admin) {
    return NextResponse.json({ success: false, error: '需要管理員權限' }, { status: 403 })
  }

  const search = request.nextUrl.searchParams.get('q')?.trim()
  const limitParam = Number(request.nextUrl.searchParams.get('limit'))
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
    : DEFAULT_LIMIT

  try {
    let query = adminClient
      .from('diet_daily_users')
      .select('id,email,full_name,created_at')
      .order('email', { ascending: true })
      .limit(limit)

    if (search && search.length > 0) {
      const likeValue = `%${search}%`
      query = query.or(`email.ilike.${likeValue},full_name.ilike.${likeValue}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[admin/users/search] query error:', error)
      return NextResponse.json({ success: false, error: '無法取得使用者列表' }, { status: 500 })
    }

    const users = (data ?? [])
      .filter((row): row is DietDailyUserRow & { email: string } => typeof row.email === 'string' && row.email.length > 0)
      .map((row) => ({
        id: row.id,
        email: row.email!,
        name: row.full_name ?? null,
        createdAt: row.created_at ?? null
      }))

    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error('[admin/users/search] unexpected error:', error)
    return NextResponse.json({ success: false, error: '未知錯誤' }, { status: 500 })
  }
}
