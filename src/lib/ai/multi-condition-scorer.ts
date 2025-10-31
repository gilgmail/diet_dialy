/**
 * Multi-Condition Medical AI Scorer
 * Enhanced analysis for IBD, IBS, Cancer Chemotherapy, and Allergens
 *
 * @version 3.0.0
 * @author Diet Daily AI Team
 */

import { logError, logMedical } from '@/lib/logger';
import { getExternalApiUrl, getApiKey } from '@/lib/env-validation';

export interface MedicalCondition {
  type: 'IBD' | 'IBS' | 'CANCER_CHEMO' | 'ALLERGIES'
  severity?: 'mild' | 'moderate' | 'severe'
  subtype?: string // e.g., 'IBS-D', 'Crohn's', 'UC'
  triggers?: string[]
  medications?: string[]
}

export interface FoodData {
  name: string
  category?: string
  calories?: number
  protein?: number
  carbohydrates?: number
  fat?: number
  fiber?: number
  sodium?: number
  sugar?: number
  brand?: string
  ingredients?: string
  preparation?: string
}

export interface ConditionAnalysis {
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
}

export interface MultiConditionResult {
  success: boolean
  food_name: string
  overall_score: 1 | 2 | 3 | 4 | 5
  conditions: ConditionAnalysis[]
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
  }
  timestamp: string
}

export class MultiConditionScorer {
  private anthropicApiKey: string | undefined

  constructor() {
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY
  }

  /**
   * Score food for multiple medical conditions
   */
  async scoreFoodForConditions(
    foodData: FoodData,
    conditions: MedicalCondition[]
  ): Promise<MultiConditionResult> {
    const components = this.extractFoodComponents(foodData)

    if (components.length > 1) {
      const componentResults = await Promise.all(
        components.map(componentName =>
          this.scoreSingleFoodForConditions(
            { ...foodData, name: componentName },
            conditions
          )
        )
      )
      return this.combineCompositeResults(foodData, components, componentResults)
    }

    return this.scoreSingleFoodForConditions(foodData, conditions)
  }

  /**
   * Internal helper to score a single food name against the provided conditions
   */
  private async scoreSingleFoodForConditions(
    foodData: FoodData,
    conditions: MedicalCondition[]
  ): Promise<MultiConditionResult> {
    const conditionAnalyses: ConditionAnalysis[] = []

    // Analyze each condition
    for (const condition of conditions) {
      const analysis = await this.analyzeForCondition(foodData, condition)
      conditionAnalyses.push(analysis)
    }

    // Allergen analysis if requested
    let allergenAnalysis = undefined
    if (conditions.some(c => c.type === 'ALLERGIES')) {
      allergenAnalysis = await this.analyzeAllergens(foodData)
    }

    // Calculate overall score (weighted average)
    const overallScore = this.calculateOverallScore(conditionAnalyses)

    // General analysis
    const generalAnalysis = await this.generateGeneralAnalysis(foodData, conditionAnalyses)

    return {
      success: true,
      food_name: foodData.name,
      overall_score: overallScore,
      conditions: conditionAnalyses,
      allergen_analysis: allergenAnalysis,
      general_analysis: generalAnalysis,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Analyze food for specific medical condition
   */
  private async analyzeForCondition(
    foodData: FoodData,
    condition: MedicalCondition
  ): Promise<ConditionAnalysis> {
    if (this.anthropicApiKey) {
      return this.analyzeWithClaude(foodData, condition)
    } else {
      return this.analyzeWithFallback(foodData, condition)
    }
  }

  /**
   * Claude API analysis for specific condition
   */
  private async analyzeWithClaude(
    foodData: FoodData,
    condition: MedicalCondition
  ): Promise<ConditionAnalysis> {
    const prompt = this.buildConditionPrompt(foodData, condition)

    try {
      const apiUrl = getExternalApiUrl('anthropic');
      const apiKey = getApiKey('anthropic');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1000,
          temperature: 0.3,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      })

      if (!response.ok) {
        console.error('Claude API error:', response.status)
        return this.analyzeWithFallback(foodData, condition)
      }

      const data = await response.json()
      return this.parseClaudeResponse(data.content[0].text, condition.type)

    } catch (error) {
      console.error('Claude API request failed:', error)
      return this.analyzeWithFallback(foodData, condition)
    }
  }

  /**
   * Build condition-specific prompt
   */
  private buildConditionPrompt(foodData: FoodData, condition: MedicalCondition): string {
    const conditionGuidelines = {
      IBD: `
        IBD (Inflammatory Bowel Disease) 專業評估標準：
        - 低發炎風險食物：煮軟蔬菜、白米、瘦肉蛋白
        - 避免：高纖維、辛辣、高脂、加工食品
        - 關注：纖維含量、脂肪類型、加工程度、調味料
      `,
      IBS: `
        IBS (Irritable Bowel Syndrome) FODMAP 評估標準：
        - 低FODMAP：米飯、香蕉、雞肉、菠菜
        - 高FODMAP：洋蔥、大蒜、豆類、蘋果
        - 關注：FODMAP含量、纖維類型、人工甜味劑
      `,
      CANCER_CHEMO: `
        化療期間營養評估標準：
        - 優先：高蛋白、易消化、抗氧化食物
        - 避免：生食、高細菌風險、過於刺激
        - 關注：蛋白質含量、消化負擔、食安風險、營養密度
      `,
      ALLERGIES: `
        過敏原風險評估標準：
        - 常見過敏原：牛奶、雞蛋、花生、堅果、小麥、大豆、海鮮
        - 隱藏過敏原：加工食品中的添加劑
        - 關注：成分標示、交叉污染風險
      `
    }

    return `
你是專業的${condition.type}營養師，擁有15年臨床經驗。請評估以下食物：

食物資訊：
- 名稱：${foodData.name}
- 分類：${foodData.category || '未分類'}
- 熱量：${foodData.calories || '未知'} kcal
- 蛋白質：${foodData.protein || '未知'} g
- 碳水化合物：${foodData.carbohydrates || '未知'} g
- 脂肪：${foodData.fat || '未知'} g
- 纖維：${foodData.fiber || '未知'} g
- 鈉：${foodData.sodium || '未知'} mg
- 成分：${foodData.ingredients || '未知'}
- 製備方式：${foodData.preparation || '未知'}

${conditionGuidelines[condition.type]}

請提供：
1. 評分 (1-5分，5分最適合)
2. 評分等級 (不建議/謹慎/適中/良好/極推薦)
3. 評分推理 (3-5個要點)
4. 專業建議 (2-3個具體建議)
5. 風險因素 (如有)
6. 營養亮點 (如有)
7. 特別警告 (如需要)

請以JSON格式回應：
{
  "score": 數字1-5,
  "level": "等級",
  "reasoning": ["推理1", "推理2", ...],
  "recommendations": ["建議1", "建議2", ...],
  "risk_factors": ["風險1", "風險2", ...],
  "nutritional_highlights": ["亮點1", "亮點2", ...],
  "warnings": ["警告1", ...] (可選)
}
`
  }

  /**
   * Parse Claude response
   */
  private parseClaudeResponse(response: string, conditionType: string): ConditionAnalysis {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        condition: conditionType,
        score: parsed.score,
        level: parsed.level,
        emoji: this.getEmojiForScore(parsed.score),
        reasoning: parsed.reasoning || [],
        recommendations: parsed.recommendations || [],
        risk_factors: parsed.risk_factors || [],
        nutritional_highlights: parsed.nutritional_highlights || [],
        warnings: parsed.warnings
      }
    } catch (error) {
      console.error('Failed to parse Claude response:', error)
      return this.getFallbackAnalysis(conditionType)
    }
  }

  /**
   * Fallback analysis for specific condition
   */
  private analyzeWithFallback(foodData: FoodData, condition: MedicalCondition): ConditionAnalysis {
    // Simplified rule-based analysis
    let score = 3
    const reasoning = []
    const recommendations = []
    const riskFactors = []
    const highlights = []

    switch (condition.type) {
      case 'IBD':
        if (foodData.fiber && foodData.fiber > 5) {
          score -= 1
          riskFactors.push('高纖維可能刺激腸道')
        }
        if (foodData.category?.includes('辛辣')) {
          score -= 2
          riskFactors.push('辛辣食物可能引起發炎')
        }
        break

      case 'IBS':
        if (foodData.category?.includes('豆類') || foodData.name.includes('洋蔥')) {
          score -= 1
          riskFactors.push('可能含高FODMAP成分')
        }
        break

      case 'CANCER_CHEMO':
        if (foodData.protein && foodData.protein > 10) {
          score += 1
          highlights.push('高蛋白質有助恢復')
        }
        break

      case 'ALLERGIES':
        const commonAllergens = ['牛奶', '雞蛋', '花生', '海鮮']
        if (commonAllergens.some(allergen => foodData.name.includes(allergen))) {
          score = 1
          riskFactors.push('含常見過敏原')
        }
        break
    }

    score = Math.max(1, Math.min(5, score))

    return {
      condition: condition.type,
      score: score as 1 | 2 | 3 | 4 | 5,
      level: this.getLevelForScore(score),
      emoji: this.getEmojiForScore(score),
      reasoning: reasoning.length > 0 ? reasoning : [`${condition.type}基礎評估完成`],
      recommendations: recommendations.length > 0 ? recommendations : ['建議諮詢專業營養師'],
      risk_factors: riskFactors,
      nutritional_highlights: highlights
    }
  }

  /**
   * Analyze allergens in food
   */
  private async analyzeAllergens(foodData: FoodData) {
    const commonAllergens = [
      '牛奶', '雞蛋', '花生', '堅果', '小麥', '大豆', '海鮮', '貝類'
    ]

    const detectedAllergens = commonAllergens.filter(allergen =>
      foodData.name.includes(allergen) ||
      (foodData.ingredients && foodData.ingredients.includes(allergen))
    )

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    const warnings = []

    if (detectedAllergens.length > 0) {
      riskLevel = detectedAllergens.length > 2 ? 'critical' :
                  detectedAllergens.length > 1 ? 'high' : 'medium'
      warnings.push(`檢測到過敏原：${detectedAllergens.join(', ')}`)
    }

    return {
      detected_allergens: detectedAllergens,
      risk_level: riskLevel,
      warnings
    }
  }

  /**
   * Calculate overall score from condition analyses
   */
  private calculateOverallScore(analyses: ConditionAnalysis[]): 1 | 2 | 3 | 4 | 5 {
    if (analyses.length === 0) return 3

    const totalScore = analyses.reduce((sum, analysis) => sum + analysis.score, 0)
    const averageScore = Math.round(totalScore / analyses.length)

    return Math.max(1, Math.min(5, averageScore)) as 1 | 2 | 3 | 4 | 5
  }

  /**
   * Generate general analysis
   */
  private async generateGeneralAnalysis(
    foodData: FoodData,
    conditionAnalyses: ConditionAnalysis[]
  ) {
    const allReasons = conditionAnalyses.flatMap(a => a.reasoning)
    const allRecommendations = conditionAnalyses.flatMap(a => a.recommendations)

    return {
      reasoning: allReasons.slice(0, 5), // Limit to 5 key reasons
      recommendations: allRecommendations.join('; '), // Combine recommendations
      confidence: this.anthropicApiKey ? 0.85 : 0.65,
      method: this.anthropicApiKey ? 'claude_api' as const : 'fallback' as const
    }
  }

  /**
   * Helper methods
   */
  private extractFoodComponents(foodData: FoodData): string[] {
    const rawName = foodData.name || ''
    const delimitersPattern = /[,，、;；\|\/\+]+/g
    const conjunctionPattern = /\s*(?:和|與|及|and|&)\s*/gi
    const componentsFromName = new Set<string>()

    const cleanedName = rawName
      .replace(conjunctionPattern, ',')
      .replace(delimitersPattern, ',')

    cleanedName
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .filter(item => item.length > 1)
      .forEach(item => componentsFromName.add(item))

    if (componentsFromName.size > 1) {
      return Array.from(componentsFromName)
    }

    if (rawName.trim().length > 0) {
      return [rawName.trim()]
    }

    if (foodData.ingredients) {
      const componentsFromIngredients = new Set<string>()
      const cleanedIngredients = foodData.ingredients
        .replace(conjunctionPattern, ',')
        .replace(delimitersPattern, ',')

      cleanedIngredients
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .filter(item => item.length > 1)
        .forEach(item => componentsFromIngredients.add(item))

      if (componentsFromIngredients.size > 0) {
        return Array.from(componentsFromIngredients)
      }
    }

    return rawName ? [rawName.trim()] : []
  }

  private combineCompositeResults(
    originalFood: FoodData,
    components: string[],
    results: MultiConditionResult[]
  ): MultiConditionResult {
    const successfulResults = results.filter(result => result.success)
    if (successfulResults.length === 0) {
      return results[0] || {
        success: false,
        food_name: originalFood.name,
        overall_score: 3,
        conditions: [],
        general_analysis: {
          reasoning: ['無法完成分析'],
          recommendations: '',
          confidence: 0,
          method: 'fallback'
        },
        timestamp: new Date().toISOString()
      }
    }

    const average = (values: number[]) =>
      values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length

    const overallScore = Math.round(
      average(successfulResults.map(result => result.overall_score))
    )

    const conditionMap = new Map<
      string,
      {
        scores: number[]
        reasonings: Set<string>
        recommendations: Set<string>
        riskFactors: Set<string>
        highlights: Set<string>
        warnings: Set<string>
      }
    >()

    successfulResults.forEach(result => {
      result.conditions.forEach(condition => {
        const entry =
          conditionMap.get(condition.condition) ||
          {
            scores: [],
            reasonings: new Set<string>(),
            recommendations: new Set<string>(),
            riskFactors: new Set<string>(),
            highlights: new Set<string>(),
            warnings: new Set<string>()
          }

        entry.scores.push(condition.score)
        condition.reasoning?.forEach(item => entry.reasonings.add(item))
        condition.recommendations?.forEach(item => entry.recommendations.add(item))
        condition.risk_factors?.forEach(item => entry.riskFactors.add(item))
        condition.nutritional_highlights?.forEach(item => entry.highlights.add(item))
        condition.warnings?.forEach(item => entry.warnings.add(item))

        conditionMap.set(condition.condition, entry)
      })
    })

    const aggregatedConditions: ConditionAnalysis[] = Array.from(conditionMap.entries()).map(
      ([conditionType, value]) => {
        const score = Math.max(
          1,
          Math.min(5, Math.round(average(value.scores)))
        ) as 1 | 2 | 3 | 4 | 5

        const reasoningList = Array.from(value.reasonings).slice(0, 6)
        reasoningList.unshift(`組合食材分析：包含 ${components.join('、')}`)

        return {
          condition: conditionType,
          score,
          level: this.getLevelForScore(score),
          emoji: this.getEmojiForScore(score),
          reasoning: reasoningList,
          recommendations: Array.from(value.recommendations),
          risk_factors: Array.from(value.riskFactors),
          nutritional_highlights: Array.from(value.highlights),
          warnings: value.warnings.size > 0 ? Array.from(value.warnings) : undefined
        }
      }
    )

    const allergenAnalysis = this.combineAllergenAnalysis(
      successfulResults.map(result => result.allergen_analysis)
    )

    const aggregatedReasoning = new Set<string>()
    const aggregatedRecommendations = new Set<string>()
    const confidences: number[] = []
    let method: 'claude_api' | 'fallback' = 'fallback'

    successfulResults.forEach(result => {
      result.general_analysis.reasoning?.forEach(item => aggregatedReasoning.add(item))

      if (result.general_analysis.recommendations) {
        result.general_analysis.recommendations
          .split(/[;\n]+/)
          .map(item => item.trim())
          .filter(Boolean)
          .forEach(item => aggregatedRecommendations.add(item))
      }

      confidences.push(result.general_analysis.confidence)
      if (result.general_analysis.method === 'claude_api') {
        method = 'claude_api'
      }
    })

    const reasoningList = [
      `此為組合食材，系統已針對 ${components.join('、')} 個別分析後彙整結果。`,
      ...Array.from(aggregatedReasoning).slice(0, 8)
    ]

    const combinedRecommendations = Array.from(aggregatedRecommendations).join('; ')

    return {
      success: true,
      food_name: originalFood.name || components.join(' + '),
      overall_score: Math.max(1, Math.min(5, overallScore)) as 1 | 2 | 3 | 4 | 5,
      conditions: aggregatedConditions,
      allergen_analysis: allergenAnalysis,
      general_analysis: {
        reasoning: reasoningList,
        recommendations: combinedRecommendations,
        confidence: Number(average(confidences).toFixed(2)),
        method
      },
      timestamp: new Date().toISOString()
    }
  }

  private combineAllergenAnalysis(analyses: Array<MultiConditionResult['allergen_analysis']>) {
    const allergens = new Set<string>()
    const warnings = new Set<string>()
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'

    const riskOrder: Array<'low' | 'medium' | 'high' | 'critical'> = [
      'low',
      'medium',
      'high',
      'critical'
    ]

    analyses
      .filter(Boolean)
      .forEach(analysis => {
        analysis?.detected_allergens?.forEach(item => allergens.add(item))
        analysis?.warnings?.forEach(item => warnings.add(item))

        if (analysis?.risk_level) {
          if (
            riskOrder.indexOf(analysis.risk_level) >
            riskOrder.indexOf(riskLevel)
          ) {
            riskLevel = analysis.risk_level
          }
        }
      })

    if (allergens.size === 0 && warnings.size === 0) {
      return analyses.find(Boolean) ?? undefined
    }

    return {
      detected_allergens: Array.from(allergens),
      risk_level: riskLevel,
      warnings: Array.from(warnings)
    }
  }

  private getLevelForScore(score: number): string {
    switch (score) {
      case 1: return '不建議'
      case 2: return '謹慎'
      case 3: return '適中'
      case 4: return '良好'
      case 5: return '極推薦'
      default: return '未知'
    }
  }

  private getEmojiForScore(score: number): string {
    switch (score) {
      case 1: return '🚫'
      case 2: return '⚠️'
      case 3: return '😐'
      case 4: return '👍'
      case 5: return '✅'
      default: return '❓'
    }
  }

  private getFallbackAnalysis(conditionType: string): ConditionAnalysis {
    return {
      condition: conditionType,
      score: 3,
      level: '適中',
      emoji: '😐',
      reasoning: [`${conditionType}基礎評估`],
      recommendations: ['建議諮詢專業營養師'],
      risk_factors: [],
      nutritional_highlights: []
    }
  }
}
