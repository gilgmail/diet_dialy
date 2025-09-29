/**
 * Medical Condition-Based Access Control
 * Controls which AI analysis results users can see based on their medical conditions
 */

import { createClient } from '@/lib/supabase/client'
import type { MultiConditionResult, MedicalCondition } from '@/lib/ai/multi-condition-scorer'

export interface UserMedicalProfile {
  medical_conditions: string[]
  allergies: string[]
  dietary_restrictions: string[]
  is_admin: boolean
}

export interface FilteredAnalysisResult {
  success: boolean
  food_name: string
  overall_score?: 1 | 2 | 3 | 4 | 5
  visible_conditions: any[]
  allergen_analysis?: any
  general_analysis?: any
  access_level: 'none' | 'basic' | 'personalized' | 'partial' | 'admin'
  filtered_reason?: string
}

/**
 * Medical Access Control Service
 */
export class MedicalAccessControl {
  private supabase = createClient()

  /**
   * Get user's medical profile from database
   */
  async getUserMedicalProfile(userId: string): Promise<UserMedicalProfile | null> {
    try {
      const { data: user, error } = await this.supabase
        .from('diet_daily_users')
        .select('medical_conditions, allergies, dietary_restrictions, is_admin')
        .eq('id', userId)
        .single()

      if (error || !user) {
        console.error('Failed to fetch user medical profile:', error)
        return null
      }

      return {
        medical_conditions: user.medical_conditions || [],
        allergies: user.allergies || [],
        dietary_restrictions: user.dietary_restrictions || [],
        is_admin: user.is_admin || false
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  /**
   * Map user medical conditions to AI analysis condition types
   */
  mapUserConditionsToAnalysisTypes(medicalConditions: string[]): string[] {
    const conditionMapping: Record<string, string> = {
      // IBD related
      'IBD': 'IBD',
      'inflammatory_bowel_disease': 'IBD',
      'crohns_disease': 'IBD',
      'ulcerative_colitis': 'IBD',
      'Crohn\'s': 'IBD',
      'UC': 'IBD',

      // IBS related
      'IBS': 'IBS',
      'irritable_bowel_syndrome': 'IBS',
      'IBS-D': 'IBS',
      'IBS-C': 'IBS',
      'IBS-M': 'IBS',

      // Cancer/Chemotherapy related
      'cancer': 'CANCER_CHEMO',
      'chemotherapy': 'CANCER_CHEMO',
      'chemo': 'CANCER_CHEMO',
      'oncology': 'CANCER_CHEMO',
      'cancer_treatment': 'CANCER_CHEMO',

      // Allergies (always include if user has any allergies)
      'food_allergies': 'ALLERGIES',
      'allergies': 'ALLERGIES'
    }

    const analysisTypes = new Set<string>()

    // Map medical conditions
    medicalConditions.forEach(condition => {
      const normalizedCondition = condition.toLowerCase().trim()
      if (conditionMapping[normalizedCondition]) {
        analysisTypes.add(conditionMapping[normalizedCondition])
      }
    })

    return Array.from(analysisTypes)
  }

  /**
   * Check if user has specific allergies that need analysis
   */
  shouldIncludeAllergenAnalysis(allergies: string[]): boolean {
    return allergies.length > 0
  }

  /**
   * Filter AI analysis results based on user's medical conditions and permissions
   * NEW: Progressive disclosure - all users see basic analysis, detailed is enhanced for medical conditions
   */
  async filterAnalysisForUser(
    analysisResult: MultiConditionResult,
    userId: string
  ): Promise<FilteredAnalysisResult> {
    // Get user medical profile
    const userProfile = await this.getUserMedicalProfile(userId)

    // Basic analysis available to all users (even without medical profile)
    const basicResult = {
      success: analysisResult.success,
      food_name: analysisResult.food_name,
      overall_score: analysisResult.overall_score,
      visible_conditions: analysisResult.conditions, // All conditions visible
      allergen_analysis: analysisResult.allergen_analysis, // All allergen info visible
      general_analysis: analysisResult.general_analysis,
      access_level: 'basic' as const
    }

    // If no user profile, return basic analysis for everyone
    if (!userProfile) {
      return {
        ...basicResult,
        general_analysis: {
          ...analysisResult.general_analysis,
          filtered_note: '基本分析模式 - 註冊並設定醫療狀況可獲得個人化建議'
        }
      }
    }

    // Admin users see everything with admin privileges
    if (userProfile.is_admin) {
      return {
        ...basicResult,
        access_level: 'admin',
        general_analysis: {
          ...analysisResult.general_analysis,
          filtered_note: '管理員完整檢視模式'
        }
      }
    }

    // Get user's medical conditions for personalization
    const userConditionTypes = this.mapUserConditionsToAnalysisTypes(userProfile.medical_conditions)
    const hasAllergies = this.shouldIncludeAllergenAnalysis(userProfile.allergies)

    // Include allergen relevance if user has allergies
    if (hasAllergies && !userConditionTypes.includes('ALLERGIES')) {
      userConditionTypes.push('ALLERGIES')
    }

    // Enhanced analysis with personalization for users with medical conditions
    if (userConditionTypes.length > 0 || hasAllergies) {
      return {
        ...basicResult,
        access_level: 'personalized' as const,
        visible_conditions: this.enhanceConditionsForUser(analysisResult.conditions, userConditionTypes),
        general_analysis: {
          ...this.enhanceGeneralAnalysisForUser(analysisResult.general_analysis, userConditionTypes),
          filtered_note: `根據您的醫療狀況 (${userConditionTypes.join(', ')}) 提供個人化分析`
        }
      }
    }

    // Users without medical conditions still see full basic analysis
    return {
      ...basicResult,
      access_level: 'basic' as const,
      general_analysis: {
        ...analysisResult.general_analysis,
        filtered_note: '基本分析模式 - 在個人資料中設定醫療狀況可獲得個人化建議'
      }
    }
  }

  /**
   * Enhance conditions analysis for users with specific medical conditions
   */
  private enhanceConditionsForUser(conditions: any[], userConditionTypes: string[]) {
    return conditions.map(condition => {
      // Check if this condition is relevant to the user
      const isRelevant = userConditionTypes.includes(condition.condition)

      return {
        ...condition,
        is_personalized: isRelevant,
        relevance_note: isRelevant ?
          `🎯 此分析針對您的 ${condition.condition} 狀況` :
          `ℹ️ 一般性 ${condition.condition} 分析供參考`
      }
    })
  }

  /**
   * Enhance general analysis for users with specific medical conditions
   */
  private enhanceGeneralAnalysisForUser(generalAnalysis: any, userConditionTypes: string[]) {
    if (!generalAnalysis) return undefined

    // Prioritize reasoning relevant to user's conditions
    const personalizedReasoning = []
    const generalReasoning = []

    generalAnalysis.reasoning?.forEach((reason: string) => {
      const isRelevant = userConditionTypes.some(conditionType =>
        reason.toLowerCase().includes(conditionType.toLowerCase()) ||
        this.reasoningRelevantToCondition(reason, conditionType)
      )

      if (isRelevant) {
        personalizedReasoning.push(`🎯 ${reason}`)
      } else {
        generalReasoning.push(reason)
      }
    })

    return {
      reasoning: [...personalizedReasoning, ...generalReasoning],
      recommendations: generalAnalysis.recommendations,
      confidence: generalAnalysis.confidence,
      method: generalAnalysis.method,
      personalization_level: userConditionTypes.length > 0 ? 'high' : 'basic'
    }
  }

  /**
   * Filter general analysis to only include relevant insights (legacy method for backward compatibility)
   */
  private filterGeneralAnalysis(generalAnalysis: any, userConditionTypes: string[]) {
    if (!generalAnalysis) return undefined

    // Filter reasoning to only include relevant condition insights
    const filteredReasoning = generalAnalysis.reasoning?.filter((reason: string) =>
      userConditionTypes.some(conditionType =>
        reason.toLowerCase().includes(conditionType.toLowerCase()) ||
        this.reasoningRelevantToCondition(reason, conditionType)
      )
    ) || []

    return {
      reasoning: filteredReasoning,
      recommendations: generalAnalysis.recommendations,
      confidence: generalAnalysis.confidence,
      method: generalAnalysis.method,
      filtered_note: `分析結果已根據您的醫療狀況進行篩選 (${userConditionTypes.join(', ')})`
    }
  }

  /**
   * Check if reasoning text is relevant to a specific medical condition
   */
  private reasoningRelevantToCondition(reasoning: string, conditionType: string): boolean {
    const conditionKeywords: Record<string, string[]> = {
      'IBD': ['發炎', '腸道', '纖維', '刺激', 'IBD', '克隆氏', '潰瘍性'],
      'IBS': ['FODMAP', '腸胃', '脹氣', '腹瀉', '便秘', 'IBS'],
      'CANCER_CHEMO': ['蛋白質', '營養', '免疫', '恢復', '化療', '癌症'],
      'ALLERGIES': ['過敏', '過敏原', '反應', '敏感', '致敏']
    }

    const keywords = conditionKeywords[conditionType] || []
    return keywords.some(keyword => reasoning.includes(keyword))
  }

  /**
   * Get available medical conditions for user setup
   */
  getAvailableMedicalConditions(): { value: string; label: string; description: string }[] {
    return [
      {
        value: 'IBD',
        label: '炎症性腸病 (IBD)',
        description: '包括克隆氏病和潰瘍性結腸炎'
      },
      {
        value: 'IBS',
        label: '腸躁症 (IBS)',
        description: '功能性腸胃道疾病'
      },
      {
        value: 'cancer',
        label: '癌症治療',
        description: '正在接受癌症化療治療'
      },
      {
        value: 'food_allergies',
        label: '食物過敏',
        description: '對特定食物有過敏反應'
      }
    ]
  }

  /**
   * Validate if user has permission to view AI analysis
   */
  async hasAIAnalysisPermission(userId: string): Promise<{
    hasPermission: boolean
    isAdmin: boolean
    conditionCount: number
    allergyCount: number
  }> {
    const userProfile = await this.getUserMedicalProfile(userId)

    if (!userProfile) {
      return {
        hasPermission: false,
        isAdmin: false,
        conditionCount: 0,
        allergyCount: 0
      }
    }

    const conditionCount = userProfile.medical_conditions?.length || 0
    const allergyCount = userProfile.allergies?.length || 0
    const hasPermission = userProfile.is_admin || conditionCount > 0 || allergyCount > 0

    return {
      hasPermission,
      isAdmin: userProfile.is_admin,
      conditionCount,
      allergyCount
    }
  }
}

// Export singleton instance
export const medicalAccessControl = new MedicalAccessControl()