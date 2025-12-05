import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/healthkit/summary
 * 獲取使用者健康數據摘要（使用 DB function）
 *
 * Query params:
 * - userId: string (required)
 * - startDate: string (YYYY-MM-DD, optional, default: 30 days ago)
 * - endDate: string (YYYY-MM-DD, optional, default: today)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('📊 HealthKit Summary API - GET Request')
    console.log('👤 User ID:', userId)
    console.log('📅 Date range:', startDate, 'to', endDate)

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 使用資料庫函數獲取摘要
    const { data, error } = await supabase
      .rpc('get_user_health_summary', {
        p_user_id: userId,
        ...(startDate && { p_start_date: startDate }),
        ...(endDate && { p_end_date: endDate })
      })

    if (error) {
      console.error('❌ RPC error:', error)
      return NextResponse.json({
        success: false,
        message: `資料庫錯誤: ${error.message}`,
        data: null
      }, { status: 500 })
    }

    // 轉換為更友善的格式
    const summary = data?.reduce((acc: any, item: any) => {
      acc[item.metric_type] = {
        avg_value: parseFloat(item.avg_value),
        min_value: parseFloat(item.min_value),
        max_value: parseFloat(item.max_value),
        total_records: item.total_records,
        last_updated: item.last_updated
      }
      return acc
    }, {}) || {}

    console.log('✅ Health summary retrieved:', Object.keys(summary))

    return NextResponse.json({
      success: true,
      message: '成功獲取健康數據摘要',
      data: {
        summary,
        period: {
          start_date: startDate || '30 days ago',
          end_date: endDate || 'today'
        },
        total_metric_types: Object.keys(summary).length
      }
    })

  } catch (error) {
    console.error('❌ Get health summary error:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '獲取摘要失敗',
      data: null
    }, { status: 500 })
  }
}
