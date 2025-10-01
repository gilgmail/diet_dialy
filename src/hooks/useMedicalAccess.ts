/**
 * React Hook for Medical Access Control
 * Provides easy access to medical condition-based permissions
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { medicalAccessControl, type UserMedicalProfile, type FilteredAnalysisResult } from '@/lib/medical-access-control'
import type { MultiConditionResult } from '@/lib/ai/multi-condition-scorer'

export interface MedicalAccessState {
  loading: boolean
  hasPermission: boolean
  isAdmin: boolean
  userProfile: UserMedicalProfile | null
  conditionCount: number
  allergyCount: number
  error: string | null
}

export interface UseMedicalAccessReturn extends MedicalAccessState {
  filterAnalysis: (analysisResult: MultiConditionResult) => Promise<FilteredAnalysisResult>
  refreshPermissions: () => Promise<void>
  checkPermission: () => Promise<void>
}

/**
 * Hook for medical access control in React components
 */
export function useMedicalAccess(): UseMedicalAccessReturn {
  const [state, setState] = useState<MedicalAccessState>({
    loading: true,
    hasPermission: false,
    isAdmin: false,
    userProfile: null,
    conditionCount: 0,
    allergyCount: 0,
    error: null
  })

  const supabase = createClient()

  /**
   * Check user permissions (simplified - now all users have basic access)
   */
  const checkPermission = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        // Even users not logged in have basic access now
        setState(prev => ({
          ...prev,
          loading: false,
          hasPermission: true, // Changed: Basic access for everyone
          isAdmin: false,
          userProfile: null,
          conditionCount: 0,
          allergyCount: 0,
          error: null
        }))
        return
      }

      // Get permission details and user profile
      const permission = await medicalAccessControl.hasAIAnalysisPermission(user.id)
      const userProfile = await medicalAccessControl.getUserMedicalProfile(user.id)

      setState(prev => ({
        ...prev,
        loading: false,
        hasPermission: true, // Changed: All logged in users have access
        isAdmin: permission.isAdmin,
        userProfile,
        conditionCount: permission.conditionCount,
        allergyCount: permission.allergyCount,
        error: null
      }))
    } catch (error) {
      console.error('Failed to check medical access permissions:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        hasPermission: true, // Changed: Even on error, provide basic access
        error: '檢查權限時發生錯誤，提供基本分析功能'
      }))
    }
  }

  /**
   * Filter analysis results based on user permissions
   */
  const filterAnalysis = async (analysisResult: MultiConditionResult): Promise<FilteredAnalysisResult> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('使用者未登入')
      }

      return await medicalAccessControl.filterAnalysisForUser(analysisResult, user.id)
    } catch (error) {
      console.error('Failed to filter analysis:', error)
      return {
        success: false,
        food_name: analysisResult.food_name,
        visible_conditions: [],
        access_level: 'none',
        filtered_reason: '無法過濾分析結果：' + (error as Error).message
      }
    }
  }

  /**
   * Refresh permissions (useful after profile updates)
   */
  const refreshPermissions = async () => {
    await checkPermission()
  }

  // Check permissions on mount and auth state changes
  useEffect(() => {
    checkPermission()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkPermission()
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    ...state,
    filterAnalysis,
    refreshPermissions,
    checkPermission
  }
}

/**
 * Hook for checking specific condition access
 */
export function useConditionAccess(conditionType: 'IBD' | 'IBS' | 'CANCER_CHEMO' | 'ALLERGIES') {
  const { userProfile, isAdmin, loading } = useMedicalAccess()

  const hasAccess = () => {
    if (loading) return false
    if (isAdmin) return true
    if (!userProfile) return false

    const userConditionTypes = medicalAccessControl.mapUserConditionsToAnalysisTypes(
      userProfile.medical_conditions
    )

    // Special case for allergies
    if (conditionType === 'ALLERGIES') {
      return medicalAccessControl.shouldIncludeAllergenAnalysis(userProfile.allergies)
    }

    return userConditionTypes.includes(conditionType)
  }

  return {
    hasAccess: hasAccess(),
    loading,
    isAdmin
  }
}

/**
 * Hook for medical condition setup guidance (updated for progressive disclosure)
 */
export function useMedicalSetup() {
  const { hasPermission, isAdmin, conditionCount, allergyCount, loading } = useMedicalAccess()

  // New logic: Everyone has basic access, setup enhances personalization
  const hasPersonalization = !loading && (conditionCount > 0 || allergyCount > 0)
  const canEnhance = !loading && !isAdmin && !hasPersonalization

  const getSetupMessage = () => {
    if (loading) return ''
    if (isAdmin) return '管理員帳戶：可查看所有AI分析'
    if (hasPersonalization) return `已設定 ${conditionCount} 個醫療狀況和 ${allergyCount} 個過敏原 - 享受個人化分析`
    return '設定醫療狀況可獲得針對您需求的個人化營養建議'
  }

  const getPersonalizationLevel = () => {
    if (isAdmin) return 'admin'
    if (hasPersonalization) return 'personalized'
    return 'basic'
  }

  const availableConditions = medicalAccessControl.getAvailableMedicalConditions()

  return {
    needsSetup: false, // Changed: No one "needs" setup anymore
    hasPersonalization,
    canEnhance,
    setupMessage: getSetupMessage(),
    personalizationLevel: getPersonalizationLevel(),
    availableConditions,
    conditionCount,
    allergyCount
  }
}