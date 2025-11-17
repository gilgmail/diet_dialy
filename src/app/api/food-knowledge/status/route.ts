import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'userId is required' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // 不限制 requested_by，顯示所有待處理項目
  // 因為 Edge Function 處理的項目 requested_by 可能是 NULL
  const { data, error } = await admin
    .from('food_analysis_refresh_queue')
    .select(
      `
        id,
        food_id,
        reason,
        priority,
        status,
        attempts,
        scheduled_for,
        completed_at,
        updated_at,
        metadata,
        diet_daily_foods (
          name,
          category
        )
      `
    )
    .in('status', ['pending', 'in_progress', 'failed'])
    .order('priority', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[food-knowledge/status] query error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load queue status' },
      { status: 500 }
    )
  }

  const rows = data || []
  const summary = {
    pendingCount: rows.filter((row) => row.status === 'pending').length,
    inProgressCount: rows.filter((row) => row.status === 'in_progress').length,
    failedCount: rows.filter((row) => row.status === 'failed').length,
    completedCount: rows.filter((row) => row.status === 'completed').length,
    missingCount: rows.filter((row) => row.reason === 'missing').length,
    staleCount: rows.filter((row) => row.reason === 'stale').length,
    items: rows.map((row) => ({
      queueId: row.id,
      foodId: row.food_id,
      foodName: row.diet_daily_foods?.name ?? '未知食物',
      category: row.diet_daily_foods?.category ?? null,
      reason: row.reason,
      status: row.status,
      priority: row.priority,
      attempts: row.attempts,
      scheduledFor: row.scheduled_for,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    })),
  }

  return NextResponse.json({
    success: true,
    summary,
  })
}
