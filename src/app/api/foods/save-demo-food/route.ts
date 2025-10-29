/**
 * 保存 AI 評分測試食物到資料庫 API
 * 用於 AI 評分測試頁面的「存入資料庫」功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { summarizeMultiConditionAnalysis } from '@/lib/ai/analysis-summary'
import type { MultiConditionResult } from '@/lib/ai/multi-condition-scorer'

export async function POST(request: NextRequest) {
  try {
    const foodData = await request.json()

    // 驗證必要欄位
    if (!foodData.name) {
      return NextResponse.json(
        { success: false, error: '食物名稱是必填項目' },
        { status: 400 }
      )
    }

    // 連接 Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      throw new Error('Supabase URL 配置未找到')
    }

    // 優先使用 service role key，否則使用 anon key（可能會有 RLS 限制）
    const supabaseKey = supabaseServiceKey || supabaseAnonKey
    if (!supabaseKey) {
      throw new Error('Supabase 密鑰配置未找到')
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const nowIso = new Date().toISOString()
    const multiConditionAnalysis =
      (foodData.multi_condition_analysis || foodData.multiConditionAnalysis) as MultiConditionResult | undefined
    const summaryFromMultiCondition = summarizeMultiConditionAnalysis(multiConditionAnalysis)
    const fallbackHighlights = Array.isArray(foodData.nutritional_highlights)
      ? foodData.nutritional_highlights
      : Array.isArray(foodData.nutritionalHighlights)
        ? foodData.nutritionalHighlights
        : []
    const fallbackRisks = Array.isArray(foodData.risk_factors)
      ? foodData.risk_factors
      : Array.isArray(foodData.riskFactors)
        ? foodData.riskFactors
        : []
    const combinedHighlights = Array.from(new Set([
      ...fallbackHighlights,
      ...summaryFromMultiCondition.highlights
    ]))
    const combinedRisks = Array.from(new Set([
      ...fallbackRisks,
      ...summaryFromMultiCondition.risks
    ]))
    const analysisTimestamp = foodData.ibd_scored_at || foodData.analysis_timestamp || nowIso
    const rawConfidence =
      typeof foodData.ibd_confidence === 'number'
        ? foodData.ibd_confidence
        : typeof foodData.confidence === 'number'
          ? foodData.confidence
          : null
    const confidenceLevel =
      rawConfidence !== null
        ? `${Math.round(rawConfidence * 100)}%`
        : (typeof foodData.confidence_level === 'string' ? foodData.confidence_level : '95%')
    const scoringMethod = foodData.scoring_method || 'enhanced_ai'
    const aiAnalysisPayload = {
      nutritional_highlights: combinedHighlights,
      risk_factors: combinedRisks,
      scoring_method: scoringMethod,
      confidence_level: confidenceLevel,
      analysis_timestamp: analysisTimestamp,
      multi_condition_analysis: multiConditionAnalysis || null,
      detailed_reasoning: {
        score_breakdown: foodData.ibd_reasoning || [],
        professional_recommendations: foodData.ibd_recommendations || '',
        special_warnings: foodData.ibd_warning || null,
        nutritional_strengths: combinedHighlights,
        potential_risks: combinedRisks,
        multi_condition_summary: summaryFromMultiCondition
      }
    }

    // 檢查食物是否已存在（檢查所有狀態，不只是 pending）
    const { data: existingFood } = await supabase
      .from('diet_daily_foods')
      .select('id, name, verification_status')
      .eq('name', foodData.name)
      .single()

    if (existingFood) {
      // 更新現有記錄，包含完整的 AI 推理資料
      const { data: updatedFood, error: updateError } = await supabase
        .from('diet_daily_foods')
        .update({
          category: foodData.category,
          calories: foodData.calories,
          protein: foodData.protein,
          carbohydrates: foodData.carbohydrates,
          fat: foodData.fat,
          fiber: foodData.fiber,
          sodium: foodData.sodium,
          sugar: foodData.sugar,
          // AI 推理詳細欄位
          ibd_score: foodData.ibd_score,
          ibd_reasoning: foodData.ibd_reasoning || [],
          ibd_recommendations: foodData.ibd_recommendations || '',
          ibd_confidence: foodData.ibd_confidence || 0,
          ibd_warning: foodData.ibd_warning,
          ibd_scored_at: analysisTimestamp,
          ibd_scorer_version: foodData.ibd_scorer_version || (multiConditionAnalysis ? 'v3.0-multi-condition-ai' : 'v2.0-enhanced-ai'),
          // 擴展 AI 分析欄位（使用 JSON 欄位儲存詳細數據）
          ai_analysis: aiAnalysisPayload,
          updated_at: nowIso
        })
        .eq('id', existingFood.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        id: existingFood.id,
        action: 'updated',
        message: `食物 "${foodData.name}" 已更新 AI 評分數據（原狀態：${existingFood.verification_status}）`,
        data: updatedFood
      })
    } else {
      // 創建新記錄，包含完整的 AI 推理資料
      const { data: newFood, error: insertError } = await supabase
        .from('diet_daily_foods')
        .insert({
          name: foodData.name,
          name_en: foodData.name_en || '',
          category: foodData.category,
          brand: foodData.brand || '',
          calories: foodData.calories,
          protein: foodData.protein,
          carbohydrates: foodData.carbohydrates,
          fat: foodData.fat,
          fiber: foodData.fiber,
          sodium: foodData.sodium,
          sugar: foodData.sugar,
          allergens: [],
          tags: ['ai-demo', 'enhanced-ai'],
          // AI 推理詳細欄位
          ibd_score: foodData.ibd_score,
          ibd_reasoning: foodData.ibd_reasoning || [],
          ibd_recommendations: foodData.ibd_recommendations || '',
          ibd_confidence: foodData.ibd_confidence || 0,
          ibd_warning: foodData.ibd_warning,
          ibd_scored_at: analysisTimestamp,
          ibd_scorer_version: foodData.ibd_scorer_version || (multiConditionAnalysis ? 'v3.0-multi-condition-ai' : 'v2.0-enhanced-ai'),
          // 擴展 AI 分析欄位（使用 JSON 欄位儲存詳細數據）
          ai_analysis: aiAnalysisPayload,
          verification_status: 'pending', // 標記為測試數據
          created_at: nowIso,
          updated_at: nowIso
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return NextResponse.json({
        success: true,
        id: newFood.id,
        action: 'created',
        message: `食物 "${foodData.name}" 已保存到資料庫`,
        data: newFood
      })
    }

  } catch (error: any) {
    console.error('保存食物到資料庫失敗:', error)
    console.error('詳細錯誤信息:', JSON.stringify(error, null, 2))

    // 檢查是否為 RLS 政策錯誤
    const isRLSError = error?.code === '42501' ||
                      error?.message?.includes('row-level security policy')

    if (isRLSError) {
      return NextResponse.json(
        {
          success: false,
          error: '資料庫權限配置不完整',
          message: '需要設定 SUPABASE_SERVICE_ROLE_KEY 環境變數才能保存到資料庫。目前 AI 評分功能正常運作，但無法保存評分結果。',
          needsServiceKey: true
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '保存失敗',
        details: error
      },
      { status: 500 }
    )
  }
}
