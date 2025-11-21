import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
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

    // 查詢資料充足度儀表
    const { data: coverageData, error: coverageError } = await supabase
      .from('data_coverage_dashboard')
      .select('*')
      .order('overall_data_status', { ascending: false })
      .order('symptom_coverage_percent', { ascending: false })

    if (coverageError) {
      console.error('[DataCoverage] query error:', coverageError)
      return NextResponse.json(
        { success: false, error: '無法查詢資料充足度' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      users: coverageData || []
    })
  } catch (error) {
    console.error('[DataCoverage] unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

