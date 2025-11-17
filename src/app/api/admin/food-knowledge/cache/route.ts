import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const DEFAULT_LIMIT = 40
const MAX_LIMIT = 200

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('q')?.trim()
  const severity = request.nextUrl.searchParams.get('severity')?.trim()
  const cursor = request.nextUrl.searchParams.get('cursor') || undefined
  const limitParam = Number(request.nextUrl.searchParams.get('limit'))
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
    : DEFAULT_LIMIT

  try {
    const admin = createAdminClient()
    let query = admin
      .from('food_analysis_cache')
      .select(
        `
          food_id,
          analysis_version,
          analysis_source,
          analysis_updated_at,
          analysis_usage_count,
          risk_profile,
          nutrition_profile,
          supportive_attributes,
          serving_guidelines,
          diet_daily_foods (name, category)
        `
      )
      .order('analysis_updated_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('analysis_updated_at', cursor)
    }

    if (search && search.length > 0) {
      const likeValue = `%${search}%`
      query = query.or(
        `diet_daily_foods.name.ilike.${likeValue},food_id.ilike.${likeValue}`
      )
    }

    if (severity && severity !== 'all') {
      query = query.filter('risk_profile->>severity', 'eq', severity)
    }

    const { data, error } = await query

    if (error) {
      console.error('[food-knowledge/cache] query error:', error)
      return NextResponse.json({ success: false, error: 'Failed to load cache' }, { status: 500 })
    }

    const items = (data ?? []).map((entry) => {
      const riskProfile = entry.risk_profile as Record<string, unknown> | null
      const nutritionProfile = entry.nutrition_profile as Record<string, unknown> | null

      return {
        foodId: entry.food_id,
        foodName: entry.diet_daily_foods?.name ?? '未知食物',
        category: entry.diet_daily_foods?.category ?? null,
        analysisVersion: entry.analysis_version,
        analysisSource: entry.analysis_source,
        analysisUpdatedAt: entry.analysis_updated_at,
        usageCount: entry.analysis_usage_count ?? 0,
        severity:
          typeof riskProfile?.severity === 'string'
            ? (riskProfile?.severity as string)
            : (riskProfile?.['risk_level'] as string | undefined),
        riskProfile,
        nutritionProfile,
        supportiveAttributes: entry.supportive_attributes,
        servingGuidelines: entry.serving_guidelines
      }
    })

    const nextCursor = items.length === limit ? items[items.length - 1].analysisUpdatedAt : null

    return NextResponse.json({ success: true, items, nextCursor })
  } catch (error) {
    console.error('[food-knowledge/cache] unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 })
  }
}
