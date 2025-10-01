/**
 * AI 營養師評分 API - 重新導向到多條件評分系統
 * 已整合到 multi-condition-score API
 *
 * @version 3.0.0
 * @author Diet Daily AI Team
 * @description 重新導向到統一的多條件評分系統
 * @deprecated 請使用 /api/ai/multi-condition-score
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiUrl } from '@/lib/env-validation'

export interface NutritionScoreRequest {
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
}

export interface NutritionScoreResponse {
  success: boolean
  score: {
    value: 1 | 2 | 3 | 4 | 5
    level: string
    emoji: string
  }
  analysis: {
    reasoning: string[]
    recommendations: string
    confidence: number
    warning?: string
    nutritional_highlights?: string[]
    risk_factors?: string[]
    preparation_tips?: string
  }
  timestamp: string
  method: 'claude_api' | 'fallback'
}

export async function POST(request: NextRequest) {
  try {
    const body: NutritionScoreRequest = await request.json()

    // 重新導向到多條件評分 API
    const multiConditionBody = {
      foodName: body.foodName,
      category: body.category || '其他',
      nutrition: body.nutrition,
      brand: body.brand,
      ingredients: body.ingredients,
      preparation: body.preparation,
      medicalConditions: [
        { type: 'IBD' as const, severity: 'moderate' as const }
      ]
    }

    // 調用新的多條件評分 API
    const apiUrl = getApiUrl('/api/ai/multi-condition-score');
    const multiConditionResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(multiConditionBody),
    })

    if (!multiConditionResponse.ok) {
      const errorText = await multiConditionResponse.text()
      console.error('Multi-condition API failed:', {
        status: multiConditionResponse.status,
        statusText: multiConditionResponse.statusText,
        error: errorText
      })
      throw new Error(`Multi-condition API call failed: ${multiConditionResponse.status} - ${errorText}`)
    }

    const multiResult = await multiConditionResponse.json()

    // 轉換為舊 API 格式以保持向下相容
    if (multiResult.success && multiResult.conditions.length > 0) {
      const ibdCondition = multiResult.conditions.find((c: any) => c.condition === 'IBD') || multiResult.conditions[0]

      const response: NutritionScoreResponse = {
        success: true,
        score: {
          value: ibdCondition.score,
          level: ibdCondition.level,
          emoji: ibdCondition.emoji
        },
        analysis: {
          reasoning: ibdCondition.reasoning,
          recommendations: ibdCondition.recommendations.join('；'),
          confidence: multiResult.general_analysis.confidence,
          warning: ibdCondition.warnings?.[0],
          nutritional_highlights: ibdCondition.nutritional_highlights,
          risk_factors: ibdCondition.risk_factors,
        },
        timestamp: multiResult.timestamp,
        method: multiResult.general_analysis.method
      }

      return NextResponse.json(response)
    } else {
      throw new Error('Multi-condition API returned invalid result')
    }

  } catch (error) {
    console.error('營養評分 API 錯誤 (redirected):', error)

    return NextResponse.json(
      {
        success: false,
        error: '評分服務暫時不可用，請稍後再試 (請考慮使用 /api/ai/multi-condition-score)',
        deprecated: true,
        migration_notice: '此 API 已重新導向到 /api/ai/multi-condition-score，建議直接使用新 API'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  // 提供 API 說明和遷移指引
  return NextResponse.json({
    name: 'AI 營養師評分 API (已整合)',
    version: '3.0.0',
    status: 'REDIRECTED',
    description: '已整合到多條件評分系統，提供向下相容性',
    deprecated: true,
    migration: {
      new_endpoint: '/api/ai/multi-condition-score',
      reason: '統一多條件醫療評分系統，支援 IBD、IBS、癌症化療、過敏原分析',
      benefits: [
        '支援多種醫療條件同時分析',
        '更精確的個人化評分',
        '統一的 API 介面',
        '更好的性能和維護性'
      ]
    },
    current_behavior: '自動重新導向到 /api/ai/multi-condition-score 並轉換回舊格式',
    recommended_action: '請更新您的程式碼以直接使用新的多條件 API',
    example_migration: {
      old_request: {
        foodName: '白米飯',
        category: '主食',
        nutrition: { calories: 130, carbohydrates: 28 }
      },
      new_request: {
        foodData: { name: '白米飯', category: '主食', calories: 130, carbohydrates: 28 },
        conditions: [{ type: 'IBD' }]
      }
    }
  })
}