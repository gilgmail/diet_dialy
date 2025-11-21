import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * 取得使用者的連續記錄天數
 * GET /api/mobile/gamification/streak?userId=xxx
 */
export async function GET(request: NextRequest) {
  console.log('[MobileGamificationStreak] GET request received:', {
    url: request.url,
    method: request.method,
  })

  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

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
      console.error('[MobileGamificationStreak] Auth error:', authError)
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

    // 取得或創建 streak 記錄
    const { data: streakData, error: streakError } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (streakError && streakError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('[MobileGamificationStreak] Error fetching streak:', streakError)
      return NextResponse.json(
        { success: false, error: '無法取得連續記錄天數' },
        { status: 500 }
      )
    }

    // 如果沒有記錄，返回預設值
    if (!streakData) {
      return NextResponse.json({
        success: true,
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          milestones: [],
        }
      })
    }

    return NextResponse.json({
      success: true,
      streak: {
        currentStreak: streakData.current_streak || 0,
        longestStreak: streakData.longest_streak || 0,
        milestones: streakData.milestones_achieved || [],
      }
    })
  } catch (error) {
    console.error('[MobileGamificationStreak] unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

