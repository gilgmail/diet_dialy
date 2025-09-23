// 增強食物服務 - 整合多疾病個人化評分系統
import { supabase } from './client'
import { FoodScoringService, type IBDScores, type TriggerAnalysis, type IBDPatientProfile } from '@/lib/ai/food-scoring-service'

export interface MultiConditionScores {
  ibd?: {
    acute_phase: number
    remission_phase: number
    general_safety: number
  }
  ibs?: {
    general_safety: number
    fodmap_level: string
    trigger_risk: string
  }
  cancer_chemo?: {
    general_safety: number
    immune_support: number
    nausea_friendly: number
    nutrition_density: number
  }
  allergies?: {
    cross_contamination_risk: number
    allergen_free_confidence: number
  }
}

export interface EnhancedFood {
  id: string
  name: string
  name_en?: string
  brand?: string
  category: string

  // 基本營養資訊
  calories?: number
  protein?: number
  carbohydrates?: number
  fat?: number
  fiber?: number
  sugar?: number
  sodium?: number

  // 營養詳細資料
  nutrition_data?: Record<string, any>

  // 多疾病評分系統 (0-5分)
  condition_scores: MultiConditionScores
  food_properties: Record<string, any>
  trigger_analysis: TriggerAnalysis

  // 其他屬性
  allergens: string[]
  tags: string[]
  taiwan_origin: boolean
  verification_status: string

  // AI分析
  ai_analysis?: Record<string, any>
  ai_confidence?: number

  // 元數據
  created_by?: string
  is_custom: boolean
  created_at: string
  updated_at: string
}

export interface MultiConditionPatientProfile {
  id?: string
  user_id: string
  medical_conditions: string[] // ['ibd', 'ibs', 'cancer_chemo', 'allergies']

  // 疾病特定資料
  condition_details: {
    ibd?: {
      type: 'crohns' | 'ulcerative_colitis' | 'ibd_unspecified'
      current_phase: 'acute' | 'remission' | 'mild_flare' | 'moderate_flare' | 'severe_flare'
      severity: string
    }
    ibs?: {
      subtype: 'ibs_d' | 'ibs_c' | 'ibs_m' | 'ibs_u'
      severity: 'mild' | 'moderate' | 'severe'
    }
    cancer_chemo?: {
      cancer_type: string
      treatment_phase: string
      side_effects: string[]
    }
    allergies?: {
      confirmed_allergens: string[]
      severity_levels: Record<string, string>
    }
  }

  personal_triggers: string[]
  safe_foods: string[]
  avoided_foods: string[]
  dietary_restrictions: string[]

  symptom_sensitivity: {
    digestive: number
    immune: number
    energy: number
    nausea: number
    pain: number
  }

  preferences: {
    fiber_tolerance: 'low' | 'moderate' | 'high'
    spice_tolerance: 'low' | 'moderate' | 'high'
    texture_preferences: string[]
    cultural_preferences: string[]
  }
  dietary_restrictions: string[]
  fiber_tolerance: 'low' | 'moderate' | 'high'
  updated_at?: string
}

export class EnhancedFoodsService {

  /**
   * 搜尋食物並根據IBD階段排序
   */
  static async searchFoodsForIBD(
    searchTerm: string,
    patientPhase: 'acute' | 'remission' = 'remission',
    userId?: string
  ): Promise<EnhancedFood[]> {
    let query = supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('verification_status', 'approved')
      .ilike('name', `%${searchTerm}%`)
      .limit(20)

    const { data, error } = await query

    if (error) {
      console.error('Search foods error:', error)
      throw error
    }

    if (!data) return []

    // 根據IBD階段排序食物
    const sortedFoods = data.sort((a, b) => {
      const scoreA = patientPhase === 'acute' ?
        (a.ibd_scores?.acute_phase || 0) :
        (a.ibd_scores?.remission_phase || 0)
      const scoreB = patientPhase === 'acute' ?
        (b.ibd_scores?.acute_phase || 0) :
        (b.ibd_scores?.remission_phase || 0)

      return scoreB - scoreA // 降序排列，高分在前
    })

    return sortedFoods as EnhancedFood[]
  }

  /**
   * 根據IBD階段和個人檔案獲取推薦食物
   */
  static async getRecommendedFoodsForIBD(
    userId: string,
    phase: 'acute' | 'remission' = 'remission',
    limit: number = 10
  ): Promise<EnhancedFood[]> {
    // 獲取用戶IBD檔案
    const patientProfile = await this.getIBDPatientProfile(userId)

    let query = supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('verification_status', 'approved')

    // 根據階段篩選適合的食物
    if (phase === 'acute') {
      query = query.gte('ibd_scores->>acute_phase', '3')
    } else {
      query = query.gte('ibd_scores->>remission_phase', '2')
    }

    query = query.order('created_at', { ascending: false }).limit(limit * 2)

    const { data, error } = await query

    if (error) {
      console.error('Get recommended foods error:', error)
      throw error
    }

    if (!data) return []

    let foods = data as EnhancedFood[]

    // 如果有患者檔案，進行個人化篩選
    if (patientProfile) {
      foods = foods.filter(food => {
        // 排除個人避免的食物
        if (patientProfile.avoided_foods.some(avoided =>
            food.name.includes(avoided) || food.tags.includes(avoided))) {
          return false
        }

        // 排除個人觸發因子
        for (const trigger of patientProfile.personal_triggers) {
          if (this.foodContainsTrigger(food, trigger)) {
            return false
          }
        }

        return true
      })

      // 優先顯示安全食物
      foods.sort((a, b) => {
        const aIsSafe = patientProfile.safe_foods.some(safe =>
          a.name.includes(safe) || a.tags.includes(safe))
        const bIsSafe = patientProfile.safe_foods.some(safe =>
          b.name.includes(safe) || b.tags.includes(safe))

        if (aIsSafe && !bIsSafe) return -1
        if (!aIsSafe && bIsSafe) return 1

        // 然後按IBD分數排序
        const scoreA = phase === 'acute' ?
          (a.ibd_scores?.acute_phase || 0) :
          (a.ibd_scores?.remission_phase || 0)
        const scoreB = phase === 'acute' ?
          (b.ibd_scores?.acute_phase || 0) :
          (b.ibd_scores?.remission_phase || 0)

        return scoreB - scoreA
      })
    }

    return foods.slice(0, limit)
  }

  /**
   * 獲取台灣常見食物
   */
  static async getTaiwanCommonFoods(category?: string): Promise<EnhancedFood[]> {
    let query = supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('verification_status', 'approved')
      .eq('taiwan_origin', true)

    if (category) {
      query = query.eq('category', category)
    }

    query = query.order('ibd_scores->>general_safety', { ascending: false }).limit(50)

    const { data, error } = await query

    if (error) {
      console.error('Get Taiwan foods error:', error)
      throw error
    }

    return (data as EnhancedFood[]) || []
  }

  /**
   * 創建自訂食物並自動計算IBD評分
   */
  static async createCustomFoodWithAIScoring(
    foodData: Partial<EnhancedFood> & { created_by: string }
  ): Promise<EnhancedFood | null> {
    // 使用AI服務計算IBD評分
    const nutrition = {
      calories: foodData.calories || 0,
      protein: foodData.protein || 0,
      carbohydrates: foodData.carbohydrates || 0,
      fat: foodData.fat || 0,
      fiber: foodData.fiber || 0,
      sugar: foodData.sugar || 0,
      sodium: foodData.sodium || 0
    }

    const properties = foodData.food_properties || {}

    const ibdScores = FoodScoringService.calculateIBDScores(
      nutrition,
      properties,
      foodData.category || '',
      foodData.name || ''
    )

    const triggerAnalysis = FoodScoringService.analyzeTriggerFactors(
      nutrition,
      properties,
      foodData.category || '',
      foodData.name || ''
    )

    // 準備完整的食物資料
    const completeData = {
      ...foodData,
      ibd_scores: ibdScores,
      trigger_analysis: triggerAnalysis,
      food_properties: {
        ...properties,
        ai_calculated: true,
        calculation_date: new Date().toISOString()
      },
      ai_analysis: {
        scoring_method: 'rule_based_ai',
        version: '1.0',
        calculated_at: new Date().toISOString()
      },
      ai_confidence: 0.85, // 規則基礎AI的置信度
      is_custom: true,
      verification_status: 'approved',
      tags: [...(foodData.tags || []), '自訂食物', 'AI評分']
    }

    const { data, error } = await supabase
      .from('diet_daily_foods')
      .insert(completeData)
      .select()
      .single()

    if (error) {
      console.error('Create custom food error:', error)
      throw error
    }

    return data as EnhancedFood
  }

  /**
   * 獲取或創建IBD患者檔案
   */
  static async getIBDPatientProfile(userId: string): Promise<IBDPatientProfileData | null> {
    const { data, error } = await supabase
      .from('ibd_patient_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Get IBD profile error:', error)
      throw error
    }

    return data as IBDPatientProfileData || null
  }

  /**
   * 更新或創建IBD患者檔案
   */
  static async upsertIBDPatientProfile(profileData: IBDPatientProfileData): Promise<IBDPatientProfileData> {
    const { data, error } = await supabase
      .from('ibd_patient_profiles')
      .upsert({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Upsert IBD profile error:', error)
      throw error
    }

    return data as IBDPatientProfileData
  }

  /**
   * 獲取IBD階段特定的食物類別
   */
  static async getFoodCategoriesForPhase(phase: 'acute' | 'remission'): Promise<string[]> {
    const minScore = phase === 'acute' ? 3 : 2

    const { data, error } = await supabase
      .from('diet_daily_foods')
      .select('category')
      .eq('verification_status', 'approved')
      .gte(`ibd_scores->>${phase}_phase`, minScore)

    if (error) {
      console.error('Get categories for phase error:', error)
      return []
    }

    const categories = [...new Set(data?.map(item => item.category) || [])]
    return categories.sort()
  }

  /**
   * 分析食物對特定用戶的個人化評分
   */
  static async getPersonalizedFoodScore(
    foodId: string,
    userId: string
  ): Promise<{ personalizedScores: IBDScores; recommendations: string[] } | null> {
    // 獲取食物資料
    const { data: food, error: foodError } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('id', foodId)
      .single()

    if (foodError || !food) {
      console.error('Get food for personalization error:', foodError)
      return null
    }

    // 獲取患者檔案
    const patientProfile = await this.getIBDPatientProfile(userId)
    if (!patientProfile) {
      // 如果沒有患者檔案，返回基礎評分
      return {
        personalizedScores: food.ibd_scores,
        recommendations: ['建議建立IBD患者檔案以獲得個人化建議']
      }
    }

    // 計算個人化評分
    const personalizedScores = FoodScoringService.personalizeScore(
      food.ibd_scores,
      food.trigger_analysis,
      patientProfile
    )

    // 生成個人化建議
    const recommendations = this.generatePersonalizedRecommendations(
      food,
      patientProfile,
      personalizedScores
    )

    return { personalizedScores, recommendations }
  }

  // 私有輔助方法
  private static foodContainsTrigger(food: EnhancedFood, trigger: string): boolean {
    const triggerMap: Record<string, keyof TriggerAnalysis> = {
      '高纖維': 'high_fiber',
      '高脂': 'high_fat',
      '高糖': 'high_sugar',
      '辛辣': 'spicy',
      '酸性': 'acidic',
      '生食': 'raw',
      '油炸': 'fried',
      '加工食品': 'processed',
      '人工添加劑': 'artificial_additives',
      '乳糖': 'lactose',
      '麩質': 'gluten',
      '堅果': 'nuts_seeds',
      '咖啡因': 'caffeine',
      '酒精': 'alcohol'
    }

    const mappedTrigger = triggerMap[trigger]
    return mappedTrigger ? food.trigger_analysis[mappedTrigger] : false
  }

  private static generatePersonalizedRecommendations(
    food: EnhancedFood,
    profile: IBDPatientProfileData,
    scores: IBDScores
  ): string[] {
    const recommendations: string[] = []

    // 基於當前階段的建議
    if (profile.current_phase === 'acute' && scores.acute_phase < 2) {
      recommendations.push('目前處於急性期，建議暫時避免此食物')
    } else if (profile.current_phase === 'remission' && scores.remission_phase >= 3) {
      recommendations.push('緩解期適合食用，可安心享用')
    }

    // 基於個人觸發因子的建議
    const personalTriggers = profile.personal_triggers.filter(trigger =>
      this.foodContainsTrigger(food, trigger)
    )
    if (personalTriggers.length > 0) {
      recommendations.push(`含有您的個人觸發因子：${personalTriggers.join('、')}，建議謹慎食用`)
    }

    // 基於纖維耐受性的建議
    if (food.trigger_analysis.high_fiber) {
      if (profile.fiber_tolerance === 'low') {
        recommendations.push('此食物纖維含量較高，您的纖維耐受性較低，建議少量嘗試')
      } else if (profile.fiber_tolerance === 'high') {
        recommendations.push('此食物纖維豐富，符合您的高纖維耐受性')
      }
    }

    // 基於安全食物清單的建議
    const isSafeFood = profile.safe_foods.some(safe =>
      food.name.includes(safe) || food.tags.includes(safe)
    )
    if (isSafeFood) {
      recommendations.push('此食物在您的安全食物清單中，可安心食用')
    }

    // 預設建議
    if (recommendations.length === 0) {
      if (scores.general_safety >= 3) {
        recommendations.push('總體安全性良好，適合IBD患者食用')
      } else {
        recommendations.push('請根據個人耐受性適量食用，建議先少量嘗試')
      }
    }

    return recommendations
  }
}

// 輔助函數
export function getIBDPhaseColor(phase: string): string {
  switch (phase) {
    case 'acute':
    case 'severe_flare':
      return 'bg-red-100 text-red-800'
    case 'moderate_flare':
    case 'mild_flare':
      return 'bg-yellow-100 text-yellow-800'
    case 'remission':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getIBDPhaseText(phase: string): string {
  const phaseMap: Record<string, string> = {
    'acute': '急性期',
    'remission': '緩解期',
    'mild_flare': '輕度發作',
    'moderate_flare': '中度發作',
    'severe_flare': '重度發作'
  }
  return phaseMap[phase] || phase
}

export function getIBDScoreColor(score: number): string {
  if (score >= 4) return 'bg-green-100 text-green-800'
  if (score >= 3) return 'bg-blue-100 text-blue-800'
  if (score >= 2) return 'bg-yellow-100 text-yellow-800'
  if (score >= 1) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

export function getIBDScoreText(score: number): string {
  if (score >= 4) return '非常適合'
  if (score >= 3) return '適合'
  if (score >= 2) return '謹慎食用'
  if (score >= 1) return '少量嘗試'
  return '建議避免'
}