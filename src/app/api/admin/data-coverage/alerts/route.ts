import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const daysThreshold = parseInt(searchParams.get('daysThreshold') || '2', 10)

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少 userId 參數' },
        { status: 400 }
      )
    }

    // 檢查管理員權限
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '需要登入' },
        { status: 401 }
      )
    }

    // 檢查是否為管理員
    const { data: userData, error: userError } = await supabase
      .from('diet_daily_users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.is_admin) {
      return NextResponse.json(
        { success: false, error: '需要管理員權限' },
        { status: 403 }
      )
    }

    // 呼叫 SQL 函數取得缺漏提醒
    const { data: alertsData, error: alertsError } = await supabase
      .rpc('get_user_missing_data_alerts', {
        p_user_id: userId,
        p_days_threshold: daysThreshold
      })

    if (alertsError) {
      console.error('[DataCoverageAlerts] RPC error:', alertsError)
      return NextResponse.json(
        { success: false, error: '無法取得缺漏提醒' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      alerts: alertsData || []
    })
  } catch (error) {
    console.error('[DataCoverageAlerts] unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

