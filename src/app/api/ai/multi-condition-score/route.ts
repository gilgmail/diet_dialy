/**
 * Multi-Condition AI 營養評分 API - Phase 3 多醫療條件版
 * 支援 IBD、IBS、癌症化療、過敏原的綜合營養評分系統
 *
 * @version 3.0.0
 * @author Diet Daily AI Team
 * @description 多醫療條件專業營養評分系統，基於多專業營養師經驗
 */

import { NextRequest, NextResponse } from 'next/server'
import { MultiConditionScorer } from '@/lib/ai/multi-condition-scorer'
import type { MultiConditionResult, MedicalCondition } from '@/lib/ai/multi-condition-scorer'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'

export interface MultiConditionScoreRequest {
  foodName: string
  category?: string
  nutrition?: {
    calories?: number
    protein?: number
    carbohydrates?: number
    fat?: number
    fiber?: number
    sodium?: number
    sugar?: number
  }
  brand?: string
  ingredients?: string
  preparation?: string
  // 新增：用戶醫療條件配置
  medicalConditions?: Array<{
    type: 'IBD' | 'IBS' | 'CANCER_CHEMO' | 'ALLERGIES'
    severity?: 'mild' | 'moderate' | 'severe'
    subtype?: string
    triggers?: string[]
    medications?: string[]
  }>
  // 是否返回完整分析（管理員權限）
  fullAnalysis?: boolean
}

export interface MultiConditionScoreResponse {
  success: boolean
  food_name: string
  overall_score: 1 | 2 | 3 | 4 | 5
  conditions: Array<{
    condition: string
    score: 1 | 2 | 3 | 4 | 5
    level: string
    emoji: string
    reasoning: string[]
    recommendations: string[]
    risk_factors: string[]
    nutritional_highlights: string[]
    warnings?: string[]
    preparation_tips?: string[]
  }>
  allergen_analysis?: {
    detected_allergens: string[]
    risk_level: 'low' | 'medium' | 'high' | 'critical'
    warnings: string[]
  }
  general_analysis: {
    reasoning: string[]
    recommendations: string
    confidence: number
    method: 'claude_api' | 'fallback'
    filtered_note?: string
  }
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    const body: MultiConditionScoreRequest = await request.json()

    // 驗證請求數據
    if (!body.foodName) {
      return NextResponse.json(
        {
          success: false,
          error: '食物名稱是必填項目'
        },
        { status: 400 }
      )
    }

    const authUser = await getAuthenticatedUser(request)

    // 初始化多條件 AI 評分器
    const scorer = new MultiConditionScorer()

    // 構建食物數據
    const foodData = {
      name: body.foodName,
      category: body.category || '其他',
      calories: body.nutrition?.calories,
      protein: body.nutrition?.protein,
      carbohydrates: body.nutrition?.carbohydrates,
      fat: body.nutrition?.fat,
      fiber: body.nutrition?.fiber,
      sodium: body.nutrition?.sodium,
      sugar: body.nutrition?.sugar,
      brand: body.brand,
      ingredients: body.ingredients,
      preparation: body.preparation
    }

    // 設定要評估的醫療條件
    let medicalConditions: MedicalCondition[] = []

    if (body.medicalConditions && body.medicalConditions.length > 0) {
      // 使用用戶指定的醫療條件
      medicalConditions = body.medicalConditions.map(condition => ({
        type: condition.type,
        severity: condition.severity || 'moderate',
        subtype: condition.subtype,
        triggers: condition.triggers,
        medications: condition.medications
      }))
    } else if (body.fullAnalysis) {
      // 管理員模式：評估所有醫療條件
      medicalConditions = [
        { type: 'IBD', severity: 'moderate' },
        { type: 'IBS', severity: 'moderate' },
        { type: 'CANCER_CHEMO', severity: 'moderate' },
        { type: 'ALLERGIES' }
      ]
    } else {
      // 預設：評估常見條件
      medicalConditions = [
        { type: 'IBD', severity: 'moderate' },
        { type: 'IBS', severity: 'moderate' }
      ]
    }

    console.log(`🎯 多條件 AI 評分 - 食物: ${body.foodName}, 條件: ${medicalConditions.map(c => c.type).join(', ')}`)

    // 執行多條件評分
    const result = await scorer.scoreFoodForConditions(foodData, medicalConditions, {
      usageContext: {
        userId: authUser?.id,
        feature: 'multi_condition_score',
        metadata: {
          requestedConditions: medicalConditions.map((condition) => condition.type),
          fullAnalysis: body.fullAnalysis ?? false
        }
      }
    })

    if (!result.success) {
      throw new Error('多條件評分失敗')
    }

    // 轉換為 API 響應格式
    const response: MultiConditionScoreResponse = {
      success: true,
      food_name: result.food_name,
      overall_score: result.overall_score,
      conditions: result.conditions.map(condition => ({
        condition: condition.condition,
        score: condition.score,
        level: condition.level,
        emoji: condition.emoji,
        reasoning: condition.reasoning,
        recommendations: condition.recommendations,
        risk_factors: condition.risk_factors,
        nutritional_highlights: condition.nutritional_highlights,
        warnings: condition.warnings,
        preparation_tips: condition.preparation_tips
      })),
      allergen_analysis: result.allergen_analysis,
      general_analysis: {
        reasoning: result.general_analysis.reasoning,
        recommendations: result.general_analysis.recommendations,
        confidence: result.general_analysis.confidence,
        method: result.general_analysis.method,
        filtered_note: body.fullAnalysis ? undefined : '分析結果可能已根據權限進行篩選'
      },
      timestamp: result.timestamp
    }

    console.log(`✅ 多條件 AI 評分完成 - 整體評分: ${result.overall_score}/5, 條件數: ${result.conditions.length}`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('多條件營養評分 API 錯誤:', error)

    return NextResponse.json(
      {
        success: false,
        error: '多條件評分服務暫時不可用，請稍後再試'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  // 提供 API 說明
  return NextResponse.json({
    name: '多條件 AI 營養評分 API',
    version: '3.0.0',
    description: 'Phase 3 多醫療條件版 - 支援 IBD、IBS、癌症化療、過敏原綜合評分',
    features: [
      '多醫療條件綜合評分',
      'Claude API 整合',
      'IBD/IBS/癌症化療/過敏原專業評估',
      '條件特化營養分析',
      '1-5分專業評估系統',
      '智能備用評分',
      '權限控制訪問',
      '管理員完整分析'
    ],
    supported_conditions: [
      {
        type: 'IBD',
        name: '炎症性腸病',
        description: '包括克隆氏病和潰瘍性結腸炎',
        focus: '低炎症風險、易消化、營養密度'
      },
      {
        type: 'IBS',
        name: '腸躁症',
        description: '功能性腸胃道疾病',
        focus: 'FODMAP 評估、症狀觸發因子'
      },
      {
        type: 'CANCER_CHEMO',
        name: '癌症化療',
        description: '化療期間營養支持',
        focus: '高蛋白、易消化、抗氧化、免疫支持'
      },
      {
        type: 'ALLERGIES',
        name: '過敏原',
        description: '食物過敏風險評估',
        focus: '常見過敏原檢測、交叉反應風險'
      }
    ],
    usage: {
      method: 'POST',
      endpoint: '/api/ai/multi-condition-score',
      required_fields: ['foodName'],
      optional_fields: [
        'category',
        'nutrition',
        'brand',
        'ingredients',
        'preparation',
        'medicalConditions',
        'fullAnalysis'
      ]
    },
    examples: {
      basic: {
        foodName: '白米飯',
        category: '主食',
        nutrition: {
          calories: 130,
          carbohydrates: 28,
          protein: 2.7,
          fat: 0.3
        }
      },
      with_conditions: {
        foodName: '全麥麵包',
        category: '主食',
        nutrition: {
          calories: 247,
          carbohydrates: 41,
          protein: 13,
          fat: 4,
          fiber: 7
        },
        medicalConditions: [
          { type: 'IBD', severity: 'moderate' },
          { type: 'IBS', severity: 'mild' }
        ]
      },
      admin_full: {
        foodName: '牛奶',
        category: '乳製品',
        nutrition: {
          calories: 42,
          protein: 3.4,
          fat: 1,
          carbohydrates: 5
        },
        fullAnalysis: true
      }
    }
  })
}
