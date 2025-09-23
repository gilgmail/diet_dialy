// 多疾病食物服務 - 整合0-5分評分系統
import { supabase } from './client'

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
  trigger_analysis: Record<string, any>

  // 其他屬性
  allergens: string[]
  tags: string[]
  taiwan_origin: boolean
  verification_status: string

  // AI分析
  ai_analysis?: Record<string, any>
  ai_confidence_scores?: Record<string, any>

  // 元數據
  created_by?: string
  is_custom: boolean
  created_at: string
  updated_at: string
  version?: number
  verified_by?: string
  verified_at?: string
  verification_notes?: string
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

  updated_at?: string
}

export interface ConditionConfig {
  condition_code: string
  condition_name: string
  condition_name_zh: string
  scoring_criteria: Record<string, any>
  ai_scoring_weights: Record<string, any>
  is_active: boolean
}

export class MultiConditionFoodsService {

  /**
   * 搜尋食物並根據多疾病條件排序
   */
  static async searchFoodsForConditions(
    searchTerm: string,
    conditions: string[] = ['ibd'],
    currentPhase?: string,
    userId?: string
  ): Promise<EnhancedFood[]> {
    let query = supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('verification_status', 'admin_approved')
      .ilike('name', `%${searchTerm}%`)
      .limit(20)

    const { data, error } = await query

    if (error) {
      console.error('Search foods error:', error)
      throw error
    }

    if (!data) return []

    // 根據多疾病條件排序食物
    const sortedFoods = data.sort((a, b) => {
      let scoreA = 0
      let scoreB = 0

      // 計算多疾病綜合評分
      conditions.forEach(condition => {
        const conditionScoresA = a.condition_scores?.[condition]
        const conditionScoresB = b.condition_scores?.[condition]

        if (conditionScoresA && conditionScoresB) {
          // 根據疾病和階段選擇合適的評分
          let condA = this.getConditionScore(conditionScoresA, condition, currentPhase)
          let condB = this.getConditionScore(conditionScoresB, condition, currentPhase)

          scoreA += condA
          scoreB += condB
        }
      })

      return scoreB - scoreA // 降序排列，高分在前
    })

    return sortedFoods as EnhancedFood[]
  }

  /**
   * 根據疾病條件和階段獲取推薦食物
   */
  static async getRecommendedFoodsForConditions(
    userId: string,
    conditions: string[] = ['ibd'],
    currentPhase: string = 'remission',
    limit: number = 10
  ): Promise<EnhancedFood[]> {
    // 獲取用戶多疾病檔案
    const patientProfile = await this.getPatientProfile(userId)

    let query = supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('verification_status', 'admin_approved')

    query = query.order('created_at', { ascending: false }).limit(limit * 2)

    const { data, error } = await query

    if (error) {
      console.error('Get recommended foods error:', error)
      throw error
    }

    if (!data) return []

    let foods = data as EnhancedFood[]

    // 過濾出適合的食物
    foods = foods.filter(food => {
      return conditions.every(condition => {
        const conditionScore = food.condition_scores?.[condition]
        if (!conditionScore) return false

        const score = this.getConditionScore(conditionScore, condition, currentPhase)
        return score >= 3 // 至少3分才推薦
      })
    })

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

        // 然後按多疾病綜合分數排序
        let scoreA = 0
        let scoreB = 0

        conditions.forEach(condition => {
          const condA = this.getConditionScore(a.condition_scores?.[condition], condition, currentPhase)
          const condB = this.getConditionScore(b.condition_scores?.[condition], condition, currentPhase)
          scoreA += condA
          scoreB += condB
        })

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
      .eq('verification_status', 'admin_approved')
      .eq('taiwan_origin', true)

    if (category) {
      query = query.eq('category', category)
    }

    query = query.order('created_at', { ascending: false }).limit(50)

    const { data, error } = await query

    if (error) {
      console.error('Get Taiwan foods error:', error)
      throw error
    }

    return (data as EnhancedFood[]) || []
  }

  /**
   * 創建自訂食物並自動計算多疾病評分
   */
  static async createCustomFoodWithAIScoring(
    foodData: Partial<EnhancedFood> & { created_by: string },
    targetConditions: string[] = ['ibd', 'ibs']
  ): Promise<EnhancedFood | null> {
    // 準備營養資料
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

    // 使用Supabase函數計算多疾病評分
    const { data: aiScores, error: scoreError } = await supabase.rpc('calculate_multi_condition_score', {
      p_nutrition: nutrition,
      p_properties: properties,
      p_conditions: targetConditions
    })

    if (scoreError) {
      console.error('AI scoring error:', scoreError)
    }

    // 準備完整的食物資料
    const completeData = {
      ...foodData,
      condition_scores: aiScores || this.getDefaultScores(targetConditions),
      food_properties: {
        ...properties,
        ai_calculated: true,
        calculation_date: new Date().toISOString()
      },
      ai_analysis: {
        scoring_method: 'multi_condition_ai',
        version: '2.0',
        calculated_at: new Date().toISOString(),
        target_conditions: targetConditions
      },
      ai_confidence_scores: this.calculateConfidenceScores(nutrition, properties),
      is_custom: true,
      verification_status: 'pending',
      tags: [...(foodData.tags || []), '自訂食物', 'AI評分', '多疾病'],
      version: 1
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
   * 獲取或創建多疾病患者檔案
   */
  static async getPatientProfile(userId: string): Promise<MultiConditionPatientProfile | null> {
    const { data, error } = await supabase
      .from('patient_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Get patient profile error:', error)
      throw error
    }

    return data as MultiConditionPatientProfile || null
  }

  /**
   * 更新或創建多疾病患者檔案
   */
  static async upsertPatientProfile(profileData: MultiConditionPatientProfile): Promise<MultiConditionPatientProfile> {
    const { data, error } = await supabase
      .from('patient_profiles')
      .upsert({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Upsert patient profile error:', error)
      throw error
    }

    return data as MultiConditionPatientProfile
  }

  /**
   * 獲取疾病配置
   */
  static async getConditionConfigs(): Promise<ConditionConfig[]> {
    const { data, error } = await supabase
      .from('medical_condition_configs')
      .select('*')
      .eq('is_active', true)
      .order('condition_code')

    if (error) {
      console.error('Get condition configs error:', error)
      throw error
    }

    return (data as ConditionConfig[]) || []
  }

  /**
   * 獲取疾病階段特定的食物類別
   */
  static async getFoodCategoriesForConditions(
    conditions: string[],
    phase?: string
  ): Promise<string[]> {
    let query = supabase
      .from('diet_daily_foods')
      .select('category')
      .eq('verification_status', 'admin_approved')

    const { data, error } = await query

    if (error) {
      console.error('Get categories for conditions error:', error)
      return []
    }

    const categories = [...new Set(data?.map(item => item.category) || [])]
    return categories.sort()
  }

  /**
   * 分析食物對特定用戶的個人化多疾病評分
   */
  static async getPersonalizedFoodScores(
    foodId: string,
    userId: string,
    conditions: string[]
  ): Promise<{ personalizedScores: MultiConditionScores; recommendations: string[] } | null> {
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
    const patientProfile = await this.getPatientProfile(userId)
    if (!patientProfile) {
      // 如果沒有患者檔案，返回基礎評分
      return {
        personalizedScores: food.condition_scores,
        recommendations: ['建議建立多疾病患者檔案以獲得個人化建議']
      }
    }

    // 計算個人化評分
    const personalizedScores = this.personalizeScores(
      food.condition_scores,
      food.trigger_analysis,
      patientProfile,
      conditions
    )

    // 生成個人化建議
    const recommendations = this.generatePersonalizedRecommendations(
      food,
      patientProfile,
      personalizedScores,
      conditions
    )

    return { personalizedScores, recommendations }
  }

  // 私有輔助方法
  private static getConditionScore(
    conditionScores: any,
    condition: string,
    currentPhase?: string
  ): number {
    if (!conditionScores) return 0

    switch (condition) {
      case 'ibd':
        if (currentPhase === 'acute') {
          return conditionScores.acute_phase || 0
        } else {
          return conditionScores.remission_phase || conditionScores.general_safety || 0
        }
      case 'ibs':
      case 'cancer_chemo':
      case 'allergies':
        return conditionScores.general_safety || 0
      default:
        return conditionScores.general_safety || 0
    }
  }

  private static foodContainsTrigger(food: EnhancedFood, trigger: string): boolean {
    const triggerMap: Record<string, string> = {
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

  private static getDefaultScores(conditions: string[]): MultiConditionScores {
    const scores: MultiConditionScores = {}

    conditions.forEach(condition => {
      switch (condition) {
        case 'ibd':
          scores.ibd = { acute_phase: 2, remission_phase: 3, general_safety: 2 }
          break
        case 'ibs':
          scores.ibs = { general_safety: 2, fodmap_level: 'unknown', trigger_risk: 'unknown' }
          break
        case 'cancer_chemo':
          scores.cancer_chemo = { general_safety: 2, immune_support: 2, nausea_friendly: 2, nutrition_density: 2 }
          break
        case 'allergies':
          scores.allergies = { cross_contamination_risk: 2, allergen_free_confidence: 2 }
          break
      }
    })

    return scores
  }

  private static calculateConfidenceScores(
    nutrition: Record<string, number>,
    properties: Record<string, any>
  ): Record<string, number> {
    // 基於資料完整性計算信心度
    const nutritionCompleteness = Object.values(nutrition).filter(v => v > 0).length / Object.keys(nutrition).length
    const propertiesCompleteness = Object.values(properties).filter(v => v && v !== 'unknown').length / Object.keys(properties).length

    return {
      ibd: Math.min(0.9, 0.6 + nutritionCompleteness * 0.2 + propertiesCompleteness * 0.1),
      ibs: Math.min(0.9, 0.5 + nutritionCompleteness * 0.3 + propertiesCompleteness * 0.1),
      cancer_chemo: Math.min(0.9, 0.7 + nutritionCompleteness * 0.1 + propertiesCompleteness * 0.1),
      allergies: Math.min(0.9, 0.8 + propertiesCompleteness * 0.1)
    }
  }

  private static personalizeScores(
    baseScores: MultiConditionScores,
    triggerAnalysis: Record<string, any>,
    profile: MultiConditionPatientProfile,
    conditions: string[]
  ): MultiConditionScores {
    const personalizedScores = JSON.parse(JSON.stringify(baseScores)) // Deep copy

    conditions.forEach(condition => {
      if (personalizedScores[condition] && profile.condition_details[condition]) {
        // 根據個人觸發因子調整
        for (const trigger of profile.personal_triggers) {
          if (this.foodContainsTrigger({ trigger_analysis: triggerAnalysis } as EnhancedFood, trigger)) {
            if (personalizedScores[condition].general_safety !== undefined) {
              personalizedScores[condition].general_safety = Math.max(0, personalizedScores[condition].general_safety - 2)
            }
          }
        }

        // 根據纖維耐受性調整
        if (condition === 'ibd' || condition === 'ibs') {
          if (triggerAnalysis.high_fiber && profile.preferences.fiber_tolerance === 'low') {
            if (personalizedScores[condition].general_safety !== undefined) {
              personalizedScores[condition].general_safety = Math.max(0, personalizedScores[condition].general_safety - 1)
            }
          }
        }
      }
    })

    return personalizedScores
  }

  private static generatePersonalizedRecommendations(
    food: EnhancedFood,
    profile: MultiConditionPatientProfile,
    scores: MultiConditionScores,
    conditions: string[]
  ): string[] {
    const recommendations: string[] = []

    // 基於每個疾病條件生成建議
    conditions.forEach(condition => {
      const conditionScore = scores[condition]?.general_safety || 0
      const conditionDetails = profile.condition_details[condition]

      if (conditionScore < 2) {
        recommendations.push(`${this.getConditionName(condition)}: 此食物評分較低，建議謹慎食用`)
      } else if (conditionScore >= 4) {
        recommendations.push(`${this.getConditionName(condition)}: 此食物評分良好，適合您的狀況`)
      }

      // 疾病特定建議
      if (condition === 'ibd' && conditionDetails) {
        const ibdDetails = conditionDetails as any
        if (ibdDetails.current_phase === 'acute' && conditionScore < 3) {
          recommendations.push('IBD急性期建議避免此食物')
        }
      }

      if (condition === 'cancer_chemo' && conditionDetails) {
        if (food.trigger_analysis.raw) {
          recommendations.push('化療期間建議避免生食以降低感染風險')
        }
      }
    })

    // 基於安全食物清單的建議
    const isSafeFood = profile.safe_foods.some(safe =>
      food.name.includes(safe) || food.tags.includes(safe)
    )
    if (isSafeFood) {
      recommendations.push('此食物在您的安全食物清單中，可安心食用')
    }

    // 預設建議
    if (recommendations.length === 0) {
      const avgScore = Object.values(scores).reduce((sum, score) => {
        return sum + (score.general_safety || 0)
      }, 0) / Object.values(scores).length

      if (avgScore >= 3) {
        recommendations.push('綜合評分良好，適合多疾病患者食用')
      } else {
        recommendations.push('請根據個人耐受性適量食用，建議先少量嘗試')
      }
    }

    return recommendations
  }

  private static getConditionName(condition: string): string {
    const names: Record<string, string> = {
      'ibd': 'IBD',
      'ibs': 'IBS',
      'cancer_chemo': '化療期',
      'allergies': '過敏'
    }
    return names[condition] || condition
  }
}

// 輔助函數
export function getMultiConditionScoreColor(scores: MultiConditionScores, condition: string): string {
  const score = scores[condition]?.general_safety || 0
  if (score >= 4) return 'bg-green-100 text-green-800'
  if (score >= 3) return 'bg-blue-100 text-blue-800'
  if (score >= 2) return 'bg-yellow-100 text-yellow-800'
  if (score >= 1) return 'bg-orange-100 text-orange-800'
  return 'bg-red-100 text-red-800'
}

export function getMultiConditionScoreText(scores: MultiConditionScores, condition: string): string {
  const score = scores[condition]?.general_safety || 0
  if (score >= 4) return '推薦'
  if (score >= 3) return '適合'
  if (score >= 2) return '謹慎食用'
  if (score >= 1) return '少量嘗試'
  return '建議避免'
}

export function getConditionDisplayName(condition: string): string {
  const displayNames: Record<string, string> = {
    'ibd': 'IBD (炎症性腸病)',
    'ibs': 'IBS (腸躁症)',
    'cancer_chemo': '癌症化療',
    'allergies': '食物過敏'
  }
  return displayNames[condition] || condition
}