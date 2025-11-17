/**
 * Sync Missing Foods API
 * 同步所有缺少 AI 分析的食物到佇列
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  createUnauthorizedResponse,
  getAuthenticatedUser,
} from '@/lib/supabase/server-auth'

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return createUnauthorizedResponse('請先登入')
  }

  const admin = createAdminClient()

  try {
    // 找出所有沒有 AI 分析的食物
    const { data: missingFoods, error: queryError } = await admin.rpc(
      'find_foods_missing_analysis'
    )

    if (queryError) {
      console.error('[sync-missing] Query error:', queryError)
      throw queryError
    }

    if (!missingFoods || missingFoods.length === 0) {
      return NextResponse.json({
        success: true,
        message: '所有食物都已有分析',
        enqueued: 0,
      })
    }

    // 批次加入佇列
    const queueItems = missingFoods.map((food: any) => ({
      food_id: food.food_id,
      reason: 'missing_analysis',
      priority: 5, // medium priority
      status: 'pending',
      scheduled_for: new Date().toISOString(),
      requested_by: user.id,
      metadata: {
        food_name: food.food_name,
        sync_triggered_by: user.id,
        sync_triggered_at: new Date().toISOString(),
      },
    }))

    const { data: inserted, error: insertError } = await admin
      .from('food_analysis_refresh_queue')
      .insert(queueItems)
      .select('id, food_id')

    if (insertError) {
      console.error('[sync-missing] Insert error:', insertError)
      throw insertError
    }

    return NextResponse.json({
      success: true,
      message: `已將 ${inserted?.length || 0} 個食物加入分析佇列`,
      enqueued: inserted?.length || 0,
      foodIds: inserted?.map((item) => item.food_id) || [],
    })
  } catch (error) {
    console.error('[sync-missing] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '同步失敗',
        details: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    )
  }
}
