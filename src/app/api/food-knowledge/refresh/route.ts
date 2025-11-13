import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { DEFAULT_FOOD_ANALYSIS_VERSION } from '@/lib/supabase/food-analysis-cache'

interface RefreshRequestBody {
  userId?: string
  foodIds?: string[]
  reason?: 'manual_request' | 'missing' | 'stale'
  priority?: number
  targetVersion?: string
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as RefreshRequestBody | null
  if (!body || !Array.isArray(body.foodIds) || body.foodIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'foodIds is required' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const uniqueIds = Array.from(new Set(body.foodIds))
  const now = new Date().toISOString()
  const reason = body.reason ?? 'manual_request'
  const payload = uniqueIds.map((foodId) => ({
    food_id: foodId,
    requested_by: body.userId ?? null,
    reason,
    priority: body.priority ?? (reason === 'missing' ? 9 : 5),
    status: 'pending',
    target_version: body.targetVersion ?? DEFAULT_FOOD_ANALYSIS_VERSION,
    metadata: {
      reason,
      source: 'manual_api',
    },
    scheduled_for: now,
    last_requested_at: now,
  }))

  const { error } = await admin
    .from('food_analysis_refresh_queue')
    .upsert(payload, { onConflict: 'food_id' })

  if (error) {
    console.error('[food-knowledge/refresh] upsert error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to enqueue refresh requests' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, count: payload.length })
}
