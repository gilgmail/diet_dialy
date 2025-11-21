import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * 取得使用者的資料覆蓋率資訊
 * GET /api/mobile/data-coverage?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少 userId 參數' },
        { status: 400 }
      )
    }

    // 檢查使用者權限
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

    // 查詢資料覆蓋率
    const { data: coverageData, error: coverageError } = await supabase
      .from('data_coverage_dashboard')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (coverageError) {
      console.error('[MobileDataCoverage] query error:', coverageError)
      return NextResponse.json(
        { success: false, error: '無法查詢資料覆蓋率' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      coverage: coverageData || null
    })
  } catch (error) {
    console.error('[MobileDataCoverage] unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

