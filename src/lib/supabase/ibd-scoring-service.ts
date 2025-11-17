// IBD 評分 Supabase 服務層
import { createClient } from './client'
import { ibdNutritionistScorer, type IBDFoodScore } from '@/lib/ai/ibd-nutritionist-scorer'
import type { Food } from '@/types/supabase'

interface IBDScoredFood extends Food {
  ibd_score?: number
  ibd_reasoning?: string[]
  ibd_recommendations?: string
  ibd_confidence?: number
  ibd_warning?: string
  ibd_scored_at?: string
  ibd_scorer_version?: string
}

interface ScoringResult {
  success: number
  failed: number
  errors: Array<{ food_id: string; error: string }>
}

export class IBDScoringService {
  private getSupabaseClient() {
    return createClient()
  }


  // 獲取單一食物的 IBD 評分
  async getFoodIBDScore(foodId: string): Promise<IBDScoredFood | null> {
    const supabase = this.getSupabaseClient()
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('id', foodId)
      .single()

    if (error) {
      console.error('獲取食物 IBD 評分失敗:', error)
      return null
    }

    return data as IBDScoredFood
  }

  // 獲取指定評分的食物清單
  async getFoodsByIBDScore(score: 0 | 1 | 2 | 3, limit = 50): Promise<IBDScoredFood[]> {
    const supabase = this.getSupabaseClient()
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('ibd_score', score)
      .eq('verification_status', 'approved')
      .order('ibd_confidence', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('獲取評分食物清單失敗:', error)
      return []
    }

    return data as IBDScoredFood[]
  }

  // 搜尋已評分的食物
  async searchScoredFoods(query: string, options?: {
    minScore?: number
    maxScore?: number
    category?: string
    limit?: number
  }): Promise<IBDScoredFood[]> {
    let supabase = this.getSupabaseClient()
    let supabaseQuery = supabase
      .from('diet_daily_foods')
      .select('*')
      .not('ibd_score', 'is', null) // 只取已評分的食物
      .eq('verification_status', 'approved')

    // 搜尋條件
    if (query) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,category.ilike.%${query}%`)
    }

    // 評分範圍篩選
    if (options?.minScore !== undefined) {
      supabaseQuery = supabaseQuery.gte('ibd_score', options.minScore)
    }
    if (options?.maxScore !== undefined) {
      supabaseQuery = supabaseQuery.lte('ibd_score', options.maxScore)
    }

    // 分類篩選
    if (options?.category) {
      supabaseQuery = supabaseQuery.eq('category', options.category)
    }

    const { data, error } = await supabaseQuery
      .order('ibd_score', { ascending: false })
      .order('ibd_confidence', { ascending: false })
      .limit(options?.limit || 50)

    if (error) {
      console.error('搜尋已評分食物失敗:', error)
      return []
    }

    return data as IBDScoredFood[]
  }

  // 為單一食物進行 IBD 評分 - 使用增強版 AI API
  async scoreFood(foodId: string): Promise<IBDFoodScore | null> {
    try {
      // 先獲取食物資訊
      const food = await this.getFoodIBDScore(foodId)
      if (!food) {
        throw new Error('找不到指定食物')
      }

      // 呼叫增強版 AI 評分 API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/ai/nutrition-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodName: food.name,
          category: food.category,
          nutrition: {
            calories: food.calories || undefined,
            protein: food.protein || undefined,
            carbohydrates: food.carbohydrates || undefined,
            fat: food.fat || undefined,
            fiber: food.fiber || undefined,
            sodium: food.sodium || undefined,
            sugar: food.sugar || undefined
          },
          brand: food.brand || undefined,
          ingredients: food.ingredients || undefined,
          preparation: food.preparation || undefined
        })
      })

      if (!response.ok) {
        throw new Error(`AI API 請求失敗: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'AI 評分失敗')
      }

      // 轉換為舊格式以保持相容性
      const score: IBDFoodScore = {
        score: result.score.value,
        reasoning: result.analysis.reasoning || [],
        recommendations: result.analysis.recommendations || '',
        confidence: result.analysis.confidence || 0.5,
        warning: result.analysis.warning
      }

      // 更新資料庫
      await this.updateFoodScore(foodId, score)

      return score
    } catch (error) {
      console.error('增強版 AI 評分失敗:', error)

      // 嘗試使用舊的備用評分系統
      try {
        const food = await this.getFoodIBDScore(foodId)
        if (!food) return null

        console.log('使用備用評分系統...')
        const fallbackScore = await ibdNutritionistScorer.scoreFood({
          name: food.name,
          category: food.category,
          calories: food.calories || undefined,
          protein: food.protein || undefined,
          carbohydrates: food.carbohydrates || undefined,
          fat: food.fat || undefined,
          fiber: food.fiber || undefined,
          sodium: food.sodium || undefined
        })

        if (fallbackScore) {
          await this.updateFoodScore(foodId, fallbackScore)
          return fallbackScore
        }
      } catch (fallbackError) {
        console.error('備用評分也失敗:', fallbackError)
      }

      return null
    }
  }

  // 批次為食物進行 IBD 評分
  async batchScoreFoods(foodIds: string[]): Promise<ScoringResult> {
    const result: ScoringResult = {
      success: 0,
      failed: 0,
      errors: []
    }

    // 分批處理避免 API 限制
    const batchSize = 5
    for (let i = 0; i < foodIds.length; i += batchSize) {
      const batch = foodIds.slice(i, i + batchSize)

      await Promise.all(batch.map(async (foodId) => {
        try {
          const score = await this.scoreFood(foodId)
          if (score) {
            result.success++
          } else {
            result.failed++
            result.errors.push({ food_id: foodId, error: '評分失敗' })
          }
        } catch (error) {
          result.failed++
          result.errors.push({
            food_id: foodId,
            error: error instanceof Error ? error.message : '未知錯誤'
          })
        }
      }))

      // 延遲避免 API 限制
      if (i + batchSize < foodIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return result
  }

  // 為整個分類的食物進行評分
  async scoreFoodsByCategory(category: string): Promise<ScoringResult> {
    const supabase = this.getSupabaseClient()
    // 獲取該分類的所有未評分食物
    const { data: foods, error } = await supabase
      .from('diet_daily_foods')
      .select('id')
      .eq('category', category)
      .eq('verification_status', 'approved')
      .is('ibd_score', null)

    if (error || !foods) {
      console.error('獲取分類食物失敗:', error)
      return { success: 0, failed: 0, errors: [{ food_id: 'category', error: '獲取分類失敗' }] }
    }

    const foodIds = foods.map(food => food.id)
    return await this.batchScoreFoods(foodIds)
  }

  // 更新食物的 IBD 評分
  private async updateFoodScore(foodId: string, score: IBDFoodScore): Promise<void> {
    const supabase = this.getSupabaseClient()
    const { error } = await supabase
      .from('diet_daily_foods')
      .update({
        ibd_score: score.score,
        ibd_reasoning: score.reasoning,
        ibd_recommendations: score.recommendations,
        ibd_confidence: score.confidence,
        ibd_warning: score.warning,
        ibd_scored_at: new Date().toISOString(),
        ibd_scorer_version: 'v2.0-enhanced-ai'
      })
      .eq('id', foodId)

    if (error) {
      console.error('更新食物評分失敗:', error)
      throw error
    }
  }

  // 獲取 IBD 評分統計
  async getIBDScoringStats() {
    const supabase = this.getSupabaseClient()
    const { data, error } = await supabase
      .from('ibd_scoring_stats')
      .select('*')
      .single()

    if (error) {
      console.error('獲取評分統計失敗:', error)
      return null
    }

    return data
  }

  // 獲取評分歷史
  async getScoringHistory(foodId: string) {
    const supabase = this.getSupabaseClient()
    const { data, error } = await supabase
      .from('ibd_scoring_history')
      .select('*')
      .eq('food_id', foodId)
      .order('scored_at', { ascending: false })

    if (error) {
      console.error('獲取評分歷史失敗:', error)
      return []
    }

    return data
  }

  // 重新評分已評分的食物
  async rescoreFood(foodId: string): Promise<IBDFoodScore | null> {
    const supabase = this.getSupabaseClient()
    // 先清除舊評分
    await supabase
      .from('diet_daily_foods')
      .update({
        ibd_score: null,
        ibd_reasoning: null,
        ibd_recommendations: null,
        ibd_confidence: null,
        ibd_warning: null,
        ibd_scored_at: null
      })
      .eq('id', foodId)

    // 重新評分
    return await this.scoreFood(foodId)
  }

  // 獲取推薦食物（評分 2-3 分）
  async getRecommendedFoods(limit = 20): Promise<IBDScoredFood[]> {
    const supabase = this.getSupabaseClient()
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .gte('ibd_score', 2)
      .eq('verification_status', 'approved')
      .order('ibd_score', { ascending: false })
      .order('ibd_confidence', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('獲取推薦食物失敗:', error)
      return []
    }

    return data as IBDScoredFood[]
  }

  // 獲取需要避免的食物（評分 0-1 分）
  async getFoodsToAvoid(limit = 20): Promise<IBDScoredFood[]> {
    const supabase = this.getSupabaseClient()
    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .lte('ibd_score', 1)
      .eq('verification_status', 'approved')
      .order('ibd_score', { ascending: true })
      .order('ibd_confidence', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('獲取避免食物失敗:', error)
      return []
    }

    return data as IBDScoredFood[]
  }

  // 根據用戶的食物歷史獲取個人化建議
  async getPersonalizedRecommendations(userId: string, limit = 10): Promise<IBDScoredFood[]> {
    // 這裡可以基於用戶的飲食記錄歷史來提供個人化建議
    // 暫時返回高評分食物
    return await this.getRecommendedFoods(limit)
  }

  // 驗證評分系統的準確性
  async validateScoringAccuracy(sampleSize = 10) {
    const supabase = this.getSupabaseClient()
    // 隨機取樣已評分食物進行重新評分比較
    const { data: foods, error } = await supabase
      .from('diet_daily_foods')
      .select('id, name, ibd_score, ibd_confidence')
      .not('ibd_score', 'is', null)
      .order('random()')
      .limit(sampleSize)

    if (error || !foods) {
      console.error('獲取驗證樣本失敗:', error)
      return null
    }

    const validationResults = []
    for (const food of foods) {
      const newScore = await this.scoreFood(food.id)
      if (newScore) {
        validationResults.push({
          food_id: food.id,
          food_name: food.name,
          original_score: food.ibd_score,
          new_score: newScore.score,
          score_difference: Math.abs(food.ibd_score - newScore.score),
          confidence_change: Math.abs((food.ibd_confidence || 0) - newScore.confidence)
        })
      }
    }

    return validationResults
  }
}

// 單例模式
export const ibdScoringService = new IBDScoringService()
