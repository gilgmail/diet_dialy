import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface HealthMetricData {
  user_id: string
  source: string
  source_identifier: string
  metric_type: string
  start_time: string
  end_time: string
  numeric_value?: number
  unit?: string
  detail_payload?: Record<string, any>
  device_name?: string
  app_name?: string
}

/**
 * POST /api/healthkit/sync
 * 同步 HealthKit 數據到 Supabase
 *
 * Request body:
 * {
 *   userId: string
 *   metrics: HealthMetricData[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, metrics } = body

    console.log('🏥 HealthKit Sync API - POST Request')
    console.log('👤 User ID:', userId)
    console.log('📊 Metrics count:', metrics?.length)

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      }, { status: 400 })
    }

    if (!Array.isArray(metrics) || metrics.length === 0) {
      return NextResponse.json({
        success: false,
        message: '必須提供至少一筆健康數據',
        data: null
      }, { status: 400 })
    }

    // 使用 service role key 來繞過 RLS（因為這是 mobile app 的同步請求）
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 準備資料：加入 sync_status 和 synced_at
    const metricsToInsert = metrics.map(metric => ({
      ...metric,
      user_id: userId,
      sync_status: 'synced',
      synced_at: new Date().toISOString()
    }))

    // Upsert 到 health_metrics table（避免重複導入）
    console.log('🔍 DEBUG: onConflict columns:', 'user_id,source,source_identifier,start_time');
    console.log('🔍 DEBUG: Sample metric:', JSON.stringify(metricsToInsert[0], null, 2));

    const { data, error } = await supabase
      .from('health_metrics')
      .upsert(metricsToInsert, {
        onConflict: 'user_id,source,source_identifier,start_time',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('❌ Supabase upsert error:', error)
      console.error('🔍 DEBUG: Error code:', error.code);
      console.error('🔍 DEBUG: Error details:', error.details);
      console.error('🔍 DEBUG: Error hint:', error.hint);
      return NextResponse.json({
        success: false,
        message: `資料庫錯誤: ${error.message}`,
        data: {
          error_code: error.code,
          error_details: error.details,
          error_hint: error.hint
        }
      }, { status: 500 })
    }

    // 統計各類型同步數量
    const metricTypeCounts = metricsToInsert.reduce((acc, metric) => {
      acc[metric.metric_type] = (acc[metric.metric_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('✅ HealthKit sync successful')
    console.log('📊 Synced metrics by type:', metricTypeCounts)

    return NextResponse.json({
      success: true,
      message: `成功同步 ${metricsToInsert.length} 筆健康數據`,
      data: {
        synced_count: metricsToInsert.length,
        metrics_by_type: metricTypeCounts,
        synced_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ HealthKit sync error:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '同步失敗',
      data: null
    }, { status: 500 })
  }
}

/**
 * GET /api/healthkit/sync
 * 獲取最近的同步狀態
 *
 * Query params:
 * - userId: string (required)
 * - days: number (optional, default 7)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '7')

    console.log('🏥 HealthKit Sync Status API - GET Request')
    console.log('👤 User ID:', userId)
    console.log('📅 Days:', days)

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 獲取最近 N 天的同步統計
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data: metrics, error } = await supabase
      .from('health_metrics')
      .select('metric_type, sync_status, synced_at, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Supabase query error:', error)
      return NextResponse.json({
        success: false,
        message: `資料庫錯誤: ${error.message}`,
        data: null
      }, { status: 500 })
    }

    // 統計資料
    const stats = {
      total_records: metrics?.length || 0,
      synced_count: metrics?.filter(m => m.sync_status === 'synced').length || 0,
      pending_count: metrics?.filter(m => m.sync_status === 'pending').length || 0,
      error_count: metrics?.filter(m => m.sync_status === 'error').length || 0,
      last_sync: metrics?.[0]?.synced_at || null,
      metrics_by_type: metrics?.reduce((acc, m) => {
        acc[m.metric_type] = (acc[m.metric_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
    }

    console.log('✅ Sync status retrieved:', stats)

    return NextResponse.json({
      success: true,
      message: `成功獲取 ${days} 天內的同步狀態`,
      data: stats
    })

  } catch (error) {
    console.error('❌ Get sync status error:', error)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '獲取同步狀態失敗',
      data: null
    }, { status: 500 })
  }
}
