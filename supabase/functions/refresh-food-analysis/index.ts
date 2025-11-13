// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const defaultVersion = Deno.env.get('FOOD_ANALYSIS_VERSION') ?? 'queue-auto'
const MAX_BATCH = Number(Deno.env.get('FOOD_ANALYSIS_MAX_BATCH') ?? '5')

if (!supabaseUrl || !serviceKey) {
  throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined')
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

async function processQueueItem(item: any) {
  await supabase
    .from('food_analysis_refresh_queue')
    .update({
      status: 'in_progress',
      attempts: (item.attempts ?? 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', item.id)

  try {
    const { data: food, error: foodError } = await supabase
      .from('diet_daily_foods')
      .select(
        'id, name, category, calories, protein, carbohydrates, fat, fiber, sugar, sodium, tags'
      )
      .eq('id', item.food_id)
      .single()

    if (foodError) {
      throw foodError
    }

    const now = new Date().toISOString()
    const nutritionProfile = {
      calories: food?.calories ?? null,
      protein: food?.protein ?? null,
      carbohydrates: food?.carbohydrates ?? null,
      fat: food?.fat ?? null,
      fiber: food?.fiber ?? null,
      sugar: food?.sugar ?? null,
      sodium: food?.sodium ?? null
    }

    const riskProfile =
      (item.metadata && item.metadata.risk_profile) ||
      { triggers: [], severity: item.reason === 'missing' ? 'unknown' : 'moderate' }

    const summary = item.metadata?.summary ?? `自動刷新：${food?.name ?? '未知食物'}`

    await supabase
      .from('food_analysis_cache')
      .upsert({
        food_id: item.food_id,
        analysis_version: item.target_version ?? defaultVersion,
        analysis_source: 'hybrid',
        nutrition_profile: nutritionProfile,
        risk_profile: riskProfile,
        supportive_attributes: item.metadata?.supportive_attributes ?? [],
        serving_guidelines: item.metadata?.serving_guidelines ?? [],
        analysis_payload: { summary },
        analysis_notes: `Queue worker refreshed (${item.reason})`,
        analysis_tokens: item.metadata?.analysis_tokens ?? { input: 0, output: 0 },
        analysis_usage_count: 0,
        analysis_updated_at: now,
        created_at: item.created_at ?? now,
        updated_at: now
      })

    await supabase
      .from('food_analysis_refresh_queue')
      .update({
        status: 'completed',
        failure_reason: null,
        completed_at: now,
        updated_at: now
      })
      .eq('id', item.id)

    return { id: item.id, status: 'completed' }
  } catch (error) {
    console.error('[refresh-food-analysis] Failed to process queue item:', error)
    await supabase
      .from('food_analysis_refresh_queue')
      .update({
        status: 'failed',
        failure_reason: error instanceof Error ? error.message : String(error),
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)

    return {
      id: item.id,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

Deno.serve(async () => {
  const now = new Date().toISOString()
  const { data: queueItems, error } = await supabase
    .from('food_analysis_refresh_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .order('priority', { ascending: false })
    .limit(MAX_BATCH)

  if (error) {
    console.error('[refresh-food-analysis] Unable to fetch queue:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'failed to fetch queue' }),
      { status: 500 }
    )
  }

  if (!queueItems || queueItems.length === 0) {
    return new Response(JSON.stringify({ success: true, processed: 0 }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const results = []
  for (const item of queueItems) {
    const result = await processQueueItem(item)
    results.push(result)
  }

  return new Response(
    JSON.stringify({
      success: true,
      processed: results.length,
      results
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
