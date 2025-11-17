// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const defaultVersion = Deno.env.get('FOOD_ANALYSIS_VERSION') ?? 'queue-auto'
const MAX_BATCH = Number(Deno.env.get('FOOD_ANALYSIS_MAX_BATCH') ?? '5')
const apiBaseUrl = Deno.env.get('API_BASE_URL') || 'http://localhost:3000'

if (!supabaseUrl || !serviceKey) {
  throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined')
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

// 呼叫 AI 分析 API
async function callAIAnalysisAPI(food: any) {
  const endpoint = `${apiBaseUrl}/api/ai/analyze-food`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        food_id: food.id,
        name: food.name,
        category: food.category,
        nutrition: {
          calories: food.calories,
          protein: food.protein,
          carbohydrates: food.carbohydrates,
          fat: food.fat,
          fiber: food.fiber,
          sugar: food.sugar,
          sodium: food.sodium
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[AI API] Failed to analyze food ${food.name}:`, response.status, errorText)
      throw new Error(`AI API failed: ${response.status}`)
    }

    const result = await response.json()
    if (!result.success || !result.analysis) {
      throw new Error('AI API returned invalid response')
    }

    return result.analysis
  } catch (error) {
    console.error('[AI API] Error calling analysis endpoint:', error)
    throw error
  }
}

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

    // 呼叫 AI API 進行分析
    console.log(`[refresh-food-analysis] Analyzing food: ${food.name}`)
    const aiAnalysis = await callAIAnalysisAPI(food)

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

    // 使用 AI 生成的分析結果
    await supabase
      .from('food_analysis_cache')
      .upsert({
        food_id: item.food_id,
        analysis_version: item.target_version ?? defaultVersion,
        analysis_source: 'ai_generated',
        nutrition_profile: nutritionProfile,
        risk_profile: aiAnalysis.risk_profile,
        supportive_attributes: aiAnalysis.supportive_attributes,
        serving_guidelines: aiAnalysis.serving_guidelines,
        analysis_payload: {
          summary: aiAnalysis.summary,
          generated_at: now,
          reason: item.reason
        },
        analysis_notes: `AI generated via queue worker (${item.reason})`,
        analysis_tokens: aiAnalysis.analysis_tokens,
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

    console.log(
      `[refresh-food-analysis] Successfully processed: ${food.name} (${aiAnalysis.analysis_tokens.input + aiAnalysis.analysis_tokens.output} tokens)`
    )

    return {
      id: item.id,
      status: 'completed',
      food_name: food.name,
      tokens: aiAnalysis.analysis_tokens.input + aiAnalysis.analysis_tokens.output
    }
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
