// 用戶反饋服務層
// 收集 IBD 評分準確性反饋和改進建議

import { supabase } from './client'

export interface UserFoodFeedback {
  id?: string
  user_id: string
  food_id: string
  // 評分相關反饋
  ai_predicted_score: number
  user_actual_experience: number
  score_accuracy_rating: number
  // 症狀反饋
  symptoms_experienced: string[]
  symptom_severity?: number
  symptom_onset_time?: number
  symptom_duration?: number
  // 食用情況
  portion_consumed?: number
  preparation_method?: string
  consumed_with_other_foods?: boolean
  other_foods_consumed?: string
  // 個人狀況
  current_ibd_phase?: 'remission' | 'mild_active' | 'moderate_active' | 'severe_active'
  stress_level?: number
  sleep_quality?: number
  medication_changes?: boolean
  // 反饋詳情
  detailed_feedback?: string
  would_eat_again?: boolean
  alternative_suggestions?: string
  consumed_at: string
}

export interface ScoringImprovementSuggestion {
  id?: string
  user_id: string
  food_id: string
  current_score: number
  suggested_score: number
  improvement_reason: string
  suggestion_source: 'user_experience' | 'medical_professional' | 'research_update' | 'peer_feedback'
  supporting_evidence?: Record<string, any>
  confidence_level: number
}

export interface CrowdFeedbackStats {
  food_id: string
  total_feedback_count: number
  avg_user_score: number
  avg_accuracy_rating: number
  common_symptoms: string[]
  score_overestimate_count: number
  score_underestimate_count: number
  score_accurate_count: number
  suggested_score_adjustment?: number
  adjustment_confidence?: number
}

export interface UserFeedbackQuality {
  user_id: string
  total_feedback_submitted: number
  detailed_feedback_count: number
  consistent_feedback_rate: number
  credibility_score: number
  expert_verified: boolean
  helpful_feedback_count: number
  feedback_implementation_count: number
  feedback_points: number
  contribution_level: 'bronze' | 'silver' | 'gold' | 'platinum'
}

export class UserFeedbackService {

  // 提交用戶食物反饋
  async submitFoodFeedback(feedback: UserFoodFeedback): Promise<UserFoodFeedback | null> {
    try {
      const { data, error } = await supabase
        .from('user_food_feedback')
        .insert({
          ...feedback,
          feedback_submitted_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('提交用戶反饋失敗:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('UserFeedbackService.submitFoodFeedback 錯誤:', error)
      return null
    }
  }

  // 獲取用戶的反饋記錄
  async getUserFeedbackHistory(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<UserFoodFeedback[]> {
    try {
      const { data, error } = await supabase
        .from('user_food_feedback')
        .select(`
          *,
          diet_daily_foods (
            name,
            category
          )
        `)
        .eq('user_id', userId)
        .order('feedback_submitted_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('獲取用戶反饋歷史失敗:', error)
        return []
      }

      return data
    } catch (error) {
      console.error('UserFeedbackService.getUserFeedbackHistory 錯誤:', error)
      return []
    }
  }

  // 提交評分改進建議
  async submitImprovementSuggestion(
    suggestion: ScoringImprovementSuggestion
  ): Promise<ScoringImprovementSuggestion | null> {
    try {
      const { data, error } = await supabase
        .from('scoring_improvement_suggestions')
        .insert({
          ...suggestion,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('提交改進建議失敗:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('UserFeedbackService.submitImprovementSuggestion 錯誤:', error)
      return null
    }
  }

  // 獲取食物的群體反饋統計
  async getFoodCrowdStats(foodId: string): Promise<CrowdFeedbackStats | null> {
    try {
      const { data, error } = await supabase
        .from('crowd_feedback_stats')
        .select('*')
        .eq('food_id', foodId)
        .single()

      if (error) {
        console.error('獲取群體反饋統計失敗:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('UserFeedbackService.getFoodCrowdStats 錯誤:', error)
      return null
    }
  }

  // 獲取用戶反饋品質評估
  async getUserFeedbackQuality(userId: string): Promise<UserFeedbackQuality | null> {
    try {
      const { data, error } = await supabase
        .from('user_feedback_quality')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('獲取用戶反饋品質失敗:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('UserFeedbackService.getUserFeedbackQuality 錯誤:', error)
      return null
    }
  }

  // 獲取需要改進的食物評分列表
  async getFoodsNeedingImprovement(limit = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('feedback_analysis_view')
        .select('*')
        .not('total_feedback_count', 'is', null)
        .gt('total_feedback_count', 4) // 至少5個反饋
        .lt('accuracy_rate', 0.7) // 準確率低於70%
        .order('total_feedback_count', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('獲取需要改進的食物失敗:', error)
        return []
      }

      return data
    } catch (error) {
      console.error('UserFeedbackService.getFoodsNeedingImprovement 錯誤:', error)
      return []
    }
  }

  // 分析用戶個人評分偏差
  async analyzeUserScoringBias(userId: string): Promise<{
    totalFeedback: number
    avgAccuracyRating: number
    scoringTendency: 'optimistic' | 'pessimistic' | 'balanced'
    reliabilityScore: number
    commonSymptoms: string[]
    recommendations: string[]
  }> {
    try {
      const { data: feedbackData, error } = await supabase
        .from('user_food_feedback')
        .select('*')
        .eq('user_id', userId)

      if (error || !feedbackData) {
        throw error || new Error('無反饋數據')
      }

      const totalFeedback = feedbackData.length
      const avgAccuracyRating = feedbackData.reduce((sum, f) => sum + (f.score_accuracy_rating || 0), 0) / totalFeedback

      // 分析評分傾向
      const overestimates = feedbackData.filter(f => f.ai_predicted_score > f.user_actual_experience).length
      const underestimates = feedbackData.filter(f => f.ai_predicted_score < f.user_actual_experience).length
      const accurate = feedbackData.filter(f => f.ai_predicted_score === f.user_actual_experience).length

      let scoringTendency: 'optimistic' | 'pessimistic' | 'balanced'
      if (overestimates > underestimates * 1.5) {
        scoringTendency = 'pessimistic' // AI 評分太樂觀，用戶實際體驗較差
      } else if (underestimates > overestimates * 1.5) {
        scoringTendency = 'optimistic' // AI 評分太保守，用戶實際體驗較好
      } else {
        scoringTendency = 'balanced'
      }

      // 可靠性評分
      const reliabilityScore = Math.min(1, (accurate / totalFeedback) * 2 + (avgAccuracyRating / 5))

      // 常見症狀分析
      const allSymptoms = feedbackData.flatMap(f => f.symptoms_experienced || [])
      const symptomCounts = allSymptoms.reduce((counts, symptom) => {
        counts[symptom] = (counts[symptom] || 0) + 1
        return counts
      }, {} as Record<string, number>)

      const commonSymptoms = Object.entries(symptomCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([symptom]) => symptom)

      // 生成建議
      const recommendations = this.generateUserRecommendations(
        scoringTendency,
        reliabilityScore,
        avgAccuracyRating,
        commonSymptoms
      )

      return {
        totalFeedback,
        avgAccuracyRating,
        scoringTendency,
        reliabilityScore,
        commonSymptoms,
        recommendations
      }
    } catch (error) {
      console.error('UserFeedbackService.analyzeUserScoringBias 錯誤:', error)
      return {
        totalFeedback: 0,
        avgAccuracyRating: 0,
        scoringTendency: 'balanced',
        reliabilityScore: 0,
        commonSymptoms: [],
        recommendations: ['請繼續提供更多反饋以建立個人化分析']
      }
    }
  }

  // 生成用戶個人化建議
  private generateUserRecommendations(
    tendency: 'optimistic' | 'pessimistic' | 'balanced',
    reliability: number,
    accuracy: number,
    symptoms: string[]
  ): string[] {
    const recommendations = []

    if (tendency === 'pessimistic') {
      recommendations.push('AI 評分可能過於樂觀，建議您對推薦食物更加謹慎')
      recommendations.push('考慮從更低的份量開始嘗試推薦食物')
    } else if (tendency === 'optimistic') {
      recommendations.push('AI 評分可能過於保守，您可能可以嘗試更多樣化的食物')
      recommendations.push('在緩解期可以適度擴展飲食選擇')
    } else {
      recommendations.push('您的反饋與 AI 評分相當一致，繼續保持現有飲食模式')
    }

    if (reliability < 0.5) {
      recommendations.push('建議記錄更詳細的症狀和食用情況以提高分析準確性')
    }

    if (accuracy < 3.0) {
      recommendations.push('考慮諮詢專業營養師以獲得更個人化的飲食建議')
    }

    if (symptoms.includes('bloating')) {
      recommendations.push('腹脹是您的主要症狀，特別注意高 FODMAP 食物')
    }

    if (symptoms.includes('diarrhea')) {
      recommendations.push('腹瀉症狀明顯，建議避免高纖維和辛辣食物')
    }

    return recommendations
  }

  // 獲取反饋品質報告
  async getFeedbackQualityReport(): Promise<{
    totalUsersWithFeedback: number
    avgFeedbackPerUser: number
    highQualityFeedbackRate: number
    totalImprovementSuggestions: number
    implementedSuggestions: number
  }> {
    try {
      const { data, error } = await supabase
        .rpc('get_feedback_quality_report')

      if (error) {
        console.error('獲取反饋品質報告失敗:', error)
        throw error
      }

      return data[0] || {
        totalUsersWithFeedback: 0,
        avgFeedbackPerUser: 0,
        highQualityFeedbackRate: 0,
        totalImprovementSuggestions: 0,
        implementedSuggestions: 0
      }
    } catch (error) {
      console.error('UserFeedbackService.getFeedbackQualityReport 錯誤:', error)
      return {
        totalUsersWithFeedback: 0,
        avgFeedbackPerUser: 0,
        highQualityFeedbackRate: 0,
        totalImprovementSuggestions: 0,
        implementedSuggestions: 0
      }
    }
  }

  // 批次分析食物評分準確性
  async analyzeFoodScoringAccuracy(foodIds?: string[]): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('analyze_food_scoring_accuracy', {
          p_food_id: foodIds ? foodIds[0] : null
        })

      if (error) {
        console.error('分析食物評分準確性失敗:', error)
        return []
      }

      return data
    } catch (error) {
      console.error('UserFeedbackService.analyzeFoodScoringAccuracy 錯誤:', error)
      return []
    }
  }

  // 建立用戶反饋表單驗證
  validateFeedbackData(feedback: Partial<UserFoodFeedback>): {
    isValid: boolean
    errors: string[]
  } {
    const errors = []

    if (!feedback.user_id) errors.push('用戶ID必填')
    if (!feedback.food_id) errors.push('食物ID必填')
    if (!feedback.consumed_at) errors.push('食用時間必填')

    if (feedback.ai_predicted_score !== undefined) {
      if (feedback.ai_predicted_score < 0 || feedback.ai_predicted_score > 3) {
        errors.push('AI評分必須在0-3之間')
      }
    }

    if (feedback.user_actual_experience !== undefined) {
      if (feedback.user_actual_experience < 0 || feedback.user_actual_experience > 3) {
        errors.push('用戶實際體驗評分必須在0-3之間')
      }
    }

    if (feedback.score_accuracy_rating !== undefined) {
      if (feedback.score_accuracy_rating < 1 || feedback.score_accuracy_rating > 5) {
        errors.push('評分準確度必須在1-5之間')
      }
    }

    if (feedback.symptom_severity !== undefined) {
      if (feedback.symptom_severity < 0 || feedback.symptom_severity > 10) {
        errors.push('症狀嚴重度必須在0-10之間')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// 單例模式
export const userFeedbackService = new UserFeedbackService()