/**
 * 保存 AI 評分測試食物到資料庫 API
 * 用於 AI 評分測試頁面的「存入資料庫」功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
          ibd_scored_at: foodData.ibd_scored_at || new Date().toISOString(),
          ibd_scorer_version: foodData.ibd_scorer_version || 'v2.0-enhanced-ai',
          // 擴展 AI 分析欄位（使用 JSON 欄位儲存詳細數據）
          ai_analysis: {
            nutritional_highlights: foodData.nutritional_highlights || [],
            risk_factors: foodData.risk_factors || [],
            scoring_method: foodData.scoring_method || 'enhanced_ai',
            confidence_level: foodData.ibd_confidence ? `${(foodData.ibd_confidence * 100).toFixed(0)}%` : '95%',
            analysis_timestamp: foodData.ibd_scored_at || new Date().toISOString(),
            detailed_reasoning: {
              score_breakdown: foodData.ibd_reasoning || [],
              professional_recommendations: foodData.ibd_recommendations || '',
              special_warnings: foodData.ibd_warning || null,
              nutritional_strengths: foodData.nutritional_highlights || [],
              potential_risks: foodData.risk_factors || []
            }
          },
          updated_at: new Date().toISOString()
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
          ibd_scored_at: foodData.ibd_scored_at || new Date().toISOString(),
          ibd_scorer_version: foodData.ibd_scorer_version || 'v2.0-enhanced-ai',
          // 擴展 AI 分析欄位（使用 JSON 欄位儲存詳細數據）
          ai_analysis: {
            nutritional_highlights: foodData.nutritional_highlights || [],
            risk_factors: foodData.risk_factors || [],
            scoring_method: foodData.scoring_method || 'enhanced_ai',
            confidence_level: foodData.ibd_confidence ? `${(foodData.ibd_confidence * 100).toFixed(0)}%` : '95%',
            analysis_timestamp: foodData.ibd_scored_at || new Date().toISOString(),
            detailed_reasoning: {
              score_breakdown: foodData.ibd_reasoning || [],
              professional_recommendations: foodData.ibd_recommendations || '',
              special_warnings: foodData.ibd_warning || null,
              nutritional_strengths: foodData.nutritional_highlights || [],
              potential_risks: foodData.risk_factors || []
            }
          },
          verification_status: 'pending', // 標記為測試數據
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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