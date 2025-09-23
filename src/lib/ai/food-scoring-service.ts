// AI食物評分服務 - IBD個人化評分系統
export interface FoodNutritionData {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
  sugar?: number
  sodium?: number
}

export interface FoodProperties {
  fiber_type: 'minimal' | 'soluble' | 'insoluble' | 'mixed' | 'unknown'
  cooking_methods: string[]
  texture: 'liquid' | 'very_soft' | 'soft' | 'firm' | 'hard' | 'crispy' | 'chewy' | 'unknown'
  acidity: 'high' | 'moderate' | 'mild' | 'neutral' | 'low' | 'unknown'
  spice_level: 'none' | 'mild' | 'moderate' | 'hot' | 'very_hot'
  fat_type: 'minimal' | 'saturated' | 'unsaturated' | 'omega3' | 'trans' | 'mixed' | 'unknown'
  preservation_method: 'fresh' | 'frozen' | 'canned' | 'dried' | 'fermented' | 'pickled'
}

export interface TriggerAnalysis {
  high_fiber: boolean
  high_fat: boolean
  high_sugar: boolean
  spicy: boolean
  acidic: boolean
  raw: boolean
  fried: boolean
  processed: boolean
  artificial_additives: boolean
  lactose: boolean
  gluten: boolean
  nuts_seeds: boolean
  caffeine: boolean
  alcohol: boolean
}

export interface IBDScores {
  acute_phase: number      // 0-4分，急性期適宜性
  remission_phase: number  // 0-4分，緩解期適宜性
  general_safety: number   // 0-4分，總體安全性
  fiber_content: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high'
  processing_level: 'fresh' | 'cooked' | 'processed' | 'highly_processed'
  trigger_risk: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high'
}

export interface IBDPatientProfile {
  ibd_type: 'crohns' | 'ulcerative_colitis' | 'ibd_unspecified'
  current_phase: 'acute' | 'remission' | 'mild_flare' | 'moderate_flare' | 'severe_flare'
  personal_triggers: string[]
  safe_foods: string[]
  avoided_foods: string[]
  fiber_tolerance: 'low' | 'moderate' | 'high'
  symptom_sensitivity: {
    abdominal_pain: number
    diarrhea: number
    bloating: number
    fatigue: number
    nausea: number
  }
}

export class FoodScoringService {

  /**
   * 基於AI規則評估食物的IBD適宜性
   */
  static calculateIBDScores(
    nutrition: FoodNutritionData,
    properties: Partial<FoodProperties>,
    category: string,
    name: string
  ): IBDScores {
    let acuteScore = 4  // 從最高分開始，根據風險因子扣分
    let remissionScore = 4
    let safetyScore = 4

    // 1. 纖維含量評估
    const fiberContent = this.categorizeFiberContent(nutrition.fiber || 0)
    switch (fiberContent) {
      case 'very_high':
        acuteScore = Math.max(acuteScore - 4, 0)
        remissionScore = Math.max(remissionScore - 2, 0)
        break
      case 'high':
        acuteScore = Math.max(acuteScore - 3, 0)
        remissionScore = Math.max(remissionScore - 1, 0)
        break
      case 'moderate':
        acuteScore = Math.max(acuteScore - 2, 0)
        break
      case 'low':
        acuteScore = Math.max(acuteScore - 1, 0)
        break
      case 'very_low':
        // 保持原分數
        break
    }

    // 2. 脂肪含量評估
    const fatContent = nutrition.fat || 0
    if (fatContent > 20) {
      acuteScore = Math.max(acuteScore - 3, 0)
      remissionScore = Math.max(remissionScore - 2, 0)
      safetyScore = Math.max(safetyScore - 2, 0)
    } else if (fatContent > 10) {
      acuteScore = Math.max(acuteScore - 2, 0)
      remissionScore = Math.max(remissionScore - 1, 0)
      safetyScore = Math.max(safetyScore - 1, 0)
    } else if (fatContent > 5) {
      acuteScore = Math.max(acuteScore - 1, 0)
    }

    // 3. 糖分含量評估
    const sugarContent = nutrition.sugar || 0
    if (sugarContent > 20) {
      acuteScore = Math.max(acuteScore - 2, 0)
      remissionScore = Math.max(remissionScore - 1, 0)
    } else if (sugarContent > 10) {
      acuteScore = Math.max(acuteScore - 1, 0)
    }

    // 4. 料理方式評估
    const cookingMethods = properties.cooking_methods || []
    if (cookingMethods.includes('deep_fried') || cookingMethods.includes('fried')) {
      acuteScore = Math.max(acuteScore - 3, 0)
      remissionScore = Math.max(remissionScore - 2, 0)
      safetyScore = Math.max(safetyScore - 2, 0)
    } else if (cookingMethods.includes('grilled') && properties.texture === 'crispy') {
      acuteScore = Math.max(acuteScore - 2, 0)
      remissionScore = Math.max(remissionScore - 1, 0)
    } else if (cookingMethods.includes('steamed') || cookingMethods.includes('boiled')) {
      // 蒸煮料理加分
      acuteScore = Math.min(acuteScore + 1, 4)
      remissionScore = Math.min(remissionScore + 1, 4)
    }

    // 5. 質地評估
    switch (properties.texture) {
      case 'very_soft':
      case 'liquid':
        // 軟質食物對急性期有利
        break
      case 'crispy':
      case 'hard':
        acuteScore = Math.max(acuteScore - 2, 0)
        remissionScore = Math.max(remissionScore - 1, 0)
        break
      case 'chewy':
        acuteScore = Math.max(acuteScore - 1, 0)
        break
    }

    // 6. 酸性評估
    if (properties.acidity === 'high' || properties.acidity === 'moderate') {
      acuteScore = Math.max(acuteScore - 2, 0)
      remissionScore = Math.max(remissionScore - 1, 0)
    }

    // 7. 辛辣程度評估
    if (properties.spice_level && properties.spice_level !== 'none') {
      const spiceReduction = properties.spice_level === 'mild' ? 1 :
                           properties.spice_level === 'moderate' ? 2 : 3
      acuteScore = Math.max(acuteScore - spiceReduction, 0)
      remissionScore = Math.max(remissionScore - Math.ceil(spiceReduction / 2), 0)
    }

    // 8. 特殊食物類別評估
    this.applyCategorySpecificRules(category, name, acuteScore, remissionScore, safetyScore)

    // 9. 確定加工程度和風險等級
    const processingLevel = this.determineProcessingLevel(properties, cookingMethods)
    const triggerRisk = this.calculateTriggerRisk(acuteScore, remissionScore, properties)

    return {
      acute_phase: Math.max(Math.min(acuteScore, 4), 0),
      remission_phase: Math.max(Math.min(remissionScore, 4), 0),
      general_safety: Math.max(Math.min(safetyScore, 4), 0),
      fiber_content: fiberContent,
      processing_level: processingLevel,
      trigger_risk: triggerRisk
    }
  }

  /**
   * 分析食物觸發因子
   */
  static analyzeTriggerFactors(
    nutrition: FoodNutritionData,
    properties: Partial<FoodProperties>,
    category: string,
    name: string,
    ingredients?: string[]
  ): TriggerAnalysis {
    const triggers: TriggerAnalysis = {
      high_fiber: (nutrition.fiber || 0) > 3,
      high_fat: (nutrition.fat || 0) > 10,
      high_sugar: (nutrition.sugar || 0) > 15,
      spicy: properties.spice_level ? properties.spice_level !== 'none' : false,
      acidic: properties.acidity === 'high' || properties.acidity === 'moderate',
      raw: properties.cooking_methods?.includes('raw') || false,
      fried: properties.cooking_methods?.some(method =>
        method.includes('fried') || method.includes('deep_fried')) || false,
      processed: properties.preservation_method !== 'fresh' &&
                properties.preservation_method !== 'frozen',
      artificial_additives: this.hasArtificialAdditives(name, ingredients),
      lactose: this.containsLactose(category, name, ingredients),
      gluten: this.containsGluten(category, name, ingredients),
      nuts_seeds: this.containsNutsSeeds(category, name, ingredients),
      caffeine: this.containsCaffeine(category, name),
      alcohol: this.containsAlcohol(category, name)
    }

    return triggers
  }

  /**
   * 個人化評分調整
   */
  static personalizeScore(
    baseScores: IBDScores,
    triggers: TriggerAnalysis,
    patientProfile: IBDPatientProfile
  ): IBDScores {
    let adjustedAcute = baseScores.acute_phase
    let adjustedRemission = baseScores.remission_phase
    let adjustedSafety = baseScores.general_safety

    // 根據患者個人觸發因子調整
    for (const trigger of patientProfile.personal_triggers) {
      if (this.triggerMatches(trigger, triggers)) {
        adjustedAcute = Math.max(adjustedAcute - 2, 0)
        adjustedRemission = Math.max(adjustedRemission - 1, 0)
      }
    }

    // 根據纖維耐受性調整
    if (baseScores.fiber_content === 'high' || baseScores.fiber_content === 'very_high') {
      if (patientProfile.fiber_tolerance === 'low') {
        adjustedAcute = Math.max(adjustedAcute - 2, 0)
        adjustedRemission = Math.max(adjustedRemission - 1, 0)
      } else if (patientProfile.fiber_tolerance === 'high') {
        adjustedRemission = Math.min(adjustedRemission + 1, 4)
      }
    }

    // 根據當前IBD階段調整
    if (patientProfile.current_phase === 'severe_flare') {
      adjustedAcute = Math.max(adjustedAcute - 1, 0)
    } else if (patientProfile.current_phase === 'remission') {
      adjustedRemission = Math.min(adjustedRemission + 1, 4)
    }

    return {
      ...baseScores,
      acute_phase: adjustedAcute,
      remission_phase: adjustedRemission,
      general_safety: adjustedSafety
    }
  }

  // 私有輔助方法
  private static categorizeFiberContent(fiber: number): IBDScores['fiber_content'] {
    if (fiber < 1) return 'very_low'
    if (fiber < 3) return 'low'
    if (fiber < 6) return 'moderate'
    if (fiber < 10) return 'high'
    return 'very_high'
  }

  private static determineProcessingLevel(
    properties: Partial<FoodProperties>,
    cookingMethods: string[]
  ): IBDScores['processing_level'] {
    if (properties.preservation_method === 'fresh' &&
        (cookingMethods.length === 0 || cookingMethods.includes('raw'))) {
      return 'fresh'
    }
    if (cookingMethods.some(method =>
        ['steamed', 'boiled', 'baked', 'grilled'].includes(method))) {
      return 'cooked'
    }
    if (properties.preservation_method !== 'fresh') {
      return 'highly_processed'
    }
    return 'processed'
  }

  private static calculateTriggerRisk(
    acuteScore: number,
    remissionScore: number,
    properties: Partial<FoodProperties>
  ): IBDScores['trigger_risk'] {
    const avgScore = (acuteScore + remissionScore) / 2
    if (avgScore >= 3.5) return 'very_low'
    if (avgScore >= 2.5) return 'low'
    if (avgScore >= 1.5) return 'moderate'
    if (avgScore >= 0.5) return 'high'
    return 'very_high'
  }

  private static applyCategorySpecificRules(
    category: string,
    name: string,
    acuteScore: number,
    remissionScore: number,
    safetyScore: number
  ): void {
    const lowerName = name.toLowerCase()

    // 特定食物規則
    if (category === '飲料') {
      if (lowerName.includes('咖啡') || lowerName.includes('茶')) {
        acuteScore = Math.max(acuteScore - 1, 0)
      }
      if (lowerName.includes('酒') || lowerName.includes('啤酒')) {
        acuteScore = Math.max(acuteScore - 3, 0)
        remissionScore = Math.max(remissionScore - 2, 0)
        safetyScore = Math.max(safetyScore - 2, 0)
      }
    }

    if (category === '奶類' || lowerName.includes('牛奶') || lowerName.includes('乳製品')) {
      // 乳糖不耐可能是問題
      acuteScore = Math.max(acuteScore - 1, 0)
    }
  }

  private static hasArtificialAdditives(name: string, ingredients?: string[]): boolean {
    const lowerName = name.toLowerCase()
    const additiveKeywords = ['防腐劑', '色素', '香精', '調味料', '人工', '加工']
    return additiveKeywords.some(keyword => lowerName.includes(keyword)) ||
           (ingredients?.some(ing => additiveKeywords.some(keyword =>
             ing.toLowerCase().includes(keyword))) || false)
  }

  private static containsLactose(category: string, name: string, ingredients?: string[]): boolean {
    const lactoseKeywords = ['牛奶', '乳製品', '起司', '奶油', '優格', '乳酪', '鮮奶']
    return category === '奶類' ||
           lactoseKeywords.some(keyword => name.includes(keyword)) ||
           (ingredients?.some(ing => lactoseKeywords.some(keyword =>
             ing.includes(keyword))) || false)
  }

  private static containsGluten(category: string, name: string, ingredients?: string[]): boolean {
    const glutenKeywords = ['麵', '麥', '小麦', '大麥', '黑麥', '麵包', '餅乾', '麵條']
    return glutenKeywords.some(keyword => name.includes(keyword)) ||
           (ingredients?.some(ing => glutenKeywords.some(keyword =>
             ing.includes(keyword))) || false)
  }

  private static containsNutsSeeds(category: string, name: string, ingredients?: string[]): boolean {
    const nutsKeywords = ['堅果', '花生', '核桃', '杏仁', '腰果', '芝麻', '瓜子', '松子']
    return category === '堅果' ||
           nutsKeywords.some(keyword => name.includes(keyword)) ||
           (ingredients?.some(ing => nutsKeywords.some(keyword =>
             ing.includes(keyword))) || false)
  }

  private static containsCaffeine(category: string, name: string): boolean {
    const caffeineKeywords = ['咖啡', '茶', '可樂', '能量飲料', '巧克力']
    return caffeineKeywords.some(keyword => name.includes(keyword))
  }

  private static containsAlcohol(category: string, name: string): boolean {
    const alcoholKeywords = ['酒', '啤酒', '紅酒', '白酒', '威士忌', '伏特加', '白蘭地']
    return category === '酒類' ||
           alcoholKeywords.some(keyword => name.includes(keyword))
  }

  private static triggerMatches(trigger: string, analysis: TriggerAnalysis): boolean {
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
    return mappedTrigger ? analysis[mappedTrigger] : false
  }
}

/**
 * 生成IBD友善度說明文字
 */
export function getIBDFriendlinessText(scores: IBDScores, phase: 'acute' | 'remission' = 'remission'): string {
  const score = phase === 'acute' ? scores.acute_phase : scores.remission_phase
  const phaseText = phase === 'acute' ? '急性期' : '緩解期'

  if (score >= 4) return `✅ ${phaseText}非常適合`
  if (score >= 3) return `👍 ${phaseText}適合`
  if (score >= 2) return `⚠️ ${phaseText}謹慎食用`
  if (score >= 1) return `⚠️ ${phaseText}少量嘗試`
  return `❌ ${phaseText}建議避免`
}

/**
 * 生成IBD建議文字
 */
export function getIBDRecommendationText(
  scores: IBDScores,
  triggers: TriggerAnalysis,
  patientPhase: 'acute' | 'remission' = 'remission'
): string {
  const recommendations: string[] = []

  if (triggers.high_fiber && patientPhase === 'acute') {
    recommendations.push('建議急性期避免高纖維食物')
  }

  if (triggers.high_fat) {
    recommendations.push('脂肪含量較高，建議適量食用')
  }

  if (triggers.spicy) {
    recommendations.push('辛辣食物可能刺激腸道，建議避免')
  }

  if (triggers.raw) {
    recommendations.push('生食有感染風險，建議充分加熱')
  }

  if (triggers.fried) {
    recommendations.push('油炸食物較難消化，建議選擇蒸煮方式')
  }

  if (scores.acute_phase >= 3 && scores.remission_phase >= 3) {
    recommendations.unshift('IBD友善食物，適合長期食用')
  }

  return recommendations.length > 0 ? recommendations.join('；') : '一般食物，請根據個人耐受性調整'
}