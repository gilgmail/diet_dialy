/**
 * AI 營養師評分 API - Phase 2 增強版
 * 整合 Claude API 和備用評分邏輯
 *
 * @version 2.0.0
 * @author Diet Daily AI Team
 * @description 專業 IBD 營養評分系統，18年營養師經驗整合
 */

import { NextRequest, NextResponse } from 'next/server'
import { RealClaudeIBDScorer } from '@/lib/ai/real-claude-ibd-scorer'

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

    // 初始化 AI 營養師評分器
    const scorer = new RealClaudeIBDScorer()

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

    // 獲取 AI 評分
    const result = await scorer.scoreFood(foodData)

    // 轉換評分等級和表情符號 (1-5 分系統)
    const getLevelAndEmoji = (score: number) => {
      switch (score) {
        case 1: return { level: '不建議', emoji: '🚫' }
        case 2: return { level: '謹慎', emoji: '⚠️' }
        case 3: return { level: '適中', emoji: '😐' }
        case 4: return { level: '良好', emoji: '👍' }
        case 5: return { level: '極推薦', emoji: '✅' }
        default: return { level: '未知', emoji: '❓' }
      }
    }

    const { level, emoji } = getLevelAndEmoji(result.score)

    const response: NutritionScoreResponse = {
      success: true,
      score: {
        value: result.score,
        level,
        emoji
      },
      analysis: {
        reasoning: result.reasoning,
        recommendations: result.recommendations,
        confidence: result.confidence,
        warning: result.warning,
        nutritional_highlights: result.nutritional_highlights,
        risk_factors: result.risk_factors,
        preparation_tips: result.preparation_tips
      },
      timestamp: new Date().toISOString(),
      method: process.env.ANTHROPIC_API_KEY ? 'claude_api' : 'fallback'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('營養評分 API 錯誤:', error)

    return NextResponse.json(
      {
        success: false,
        error: '評分服務暫時不可用，請稍後再試'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  // 提供 API 說明
  return NextResponse.json({
    name: 'AI 營養師評分 API',
    version: '2.0.0',
    description: 'Phase 2 增強版 - 專業 IBD 營養評分系統',
    features: [
      'Claude API 整合',
      '18年營養師專業經驗',
      'IBD/IBS 特化評分',
      '1-5分專業評估',
      '智能備用評分',
      '詳細營養分析'
    ],
    usage: {
      method: 'POST',
      endpoint: '/api/ai/nutrition-score',
      required_fields: ['foodName'],
      optional_fields: ['category', 'nutrition', 'brand', 'ingredients', 'preparation']
    },
    example: {
      foodName: '白米飯',
      category: '主食',
      nutrition: {
        calories: 130,
        carbohydrates: 28,
        protein: 2.7,
        fat: 0.3
      }
    }
  })
}