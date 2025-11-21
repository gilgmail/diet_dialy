import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * 取得使用者的缺漏資料提醒
 * GET /api/mobile/data-coverage/alerts?userId=xxx&daysThreshold=2
 */
export async function GET(request: NextRequest) {
  console.log('[MobileDataCoverageAlerts] GET request received:', {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
  })

  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const daysThreshold = parseInt(searchParams.get('daysThreshold') || '2', 10)

    console.log('[MobileDataCoverageAlerts] Request params:', { userId, daysThreshold })

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少 userId 參數' },
        { status: 400 }
      )
    }

    // 支援從 Authorization header 讀取 token (React Native)
    const authHeader = request.headers.get('authorization')
    let supabase = await createClient()
    let user = null
    let authError = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // React Native 使用 Bearer token
      const token = authHeader.replace('Bearer ', '')
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const tempClient = createSupabaseClient(supabaseUrl, supabaseAnonKey)
      const { data: { user: tokenUser }, error: tokenError } = await tempClient.auth.getUser(token)
      user = tokenUser
      authError = tokenError
    } else {
      // Web 使用 cookies
      const result = await supabase.auth.getUser()
      user = result.data.user
      authError = result.error
    }

    if (authError || !user) {
      console.error('[MobileDataCoverageAlerts] Auth error:', authError)
      return NextResponse.json(
        { success: false, error: '需要登入' },
        { status: 401 }
      )
    }

    // 檢查是否為自己的資料或管理員
    const { data: userData, error: userError } = await supabase
      .from('diet_daily_users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const isAdmin = userData?.is_admin || false
    if (user.id !== userId && !isAdmin) {
      return NextResponse.json(
        { success: false, error: '無權限存取此資料' },
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
      console.error('[MobileDataCoverageAlerts] RPC error:', alertsError)
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
    console.error('[MobileDataCoverageAlerts] unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

