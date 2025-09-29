// 簡化版的 Supabase 認證 Hook - 用於調試載入問題
'use client'

import { useState, useEffect, useCallback } from 'react'
import { User as AuthUser } from '@supabase/supabase-js'
import { authService } from '@/lib/supabase/auth'
import type { User } from '@/types/supabase'
import { logAuth, logError, logDebug, logWarn } from '@/lib/logger'

interface UseSupabaseAuthReturn {
  // 認證狀態
  user: AuthUser | null
  userProfile: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean

  // 認證方法
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>

  // 個人資料管理
  updateProfile: (updates: Partial<User>) => Promise<void>
}

function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  logDebug('Auth state check', {
    component: 'useSupabaseAuth',
    hasUser: !!user,
    hasProfile: !!userProfile,
    isLoading,
    hasAuthService: !!authService
  })

  // 簡化的初始化認證狀態
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      logAuth('Authentication initialization started')

      try {
        logDebug('Calling authService.getCurrentUser', { component: 'useSupabaseAuth' })
        const authUser = await authService.getCurrentUser()
        logAuth('User retrieval completed', authUser?.id, 'getCurrentUser')

        if (mounted && authUser) {
          logDebug('Setting user state', { component: 'useSupabaseAuth' })
          setUser(authUser)

          // 嘗試載入用戶資料
          try {
            logDebug('Loading user profile', { component: 'useSupabaseAuth', userId: authUser.id })
            const profile = await authService.getUserProfile(authUser.id)
            logDebug('User profile loaded', { component: 'useSupabaseAuth', hasProfile: !!profile })
            if (mounted) {
              setUserProfile(profile)
            }
          } catch (profileError) {
            logWarn('Failed to load user profile', { component: 'useSupabaseAuth', error: 'profile_load_failed' })
            // 不阻擋載入完成
          }
        } else {
          logAuth('No authenticated user found', undefined, 'getCurrentUser')
        }
      } catch (error) {
        logError('Authentication initialization failed', { component: 'useSupabaseAuth' })
      } finally {
        if (mounted) {
          logDebug('Authentication loading completed', { component: 'useSupabaseAuth' })
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      logDebug('Auth hook cleanup', { component: 'useSupabaseAuth' })
      mounted = false
    }
  }, [])

  // 簡化的登入方法
  const signInWithGoogle = useCallback(async () => {
    try {
      setIsLoading(true)
      await authService.signInWithGoogle()
    } catch (error) {
      logError('Google sign-in failed', { component: 'useSupabaseAuth', action: 'signIn' })
      throw error
    }
  }, [])

  // 簡化的登出方法
  const signOut = useCallback(async () => {
    try {
      await authService.signOut()
      setUser(null)
      setUserProfile(null)
    } catch (error) {
      logError('Sign out failed', { component: 'useSupabaseAuth', action: 'signOut' })
      throw error
    }
  }, [])

  // 簡化的資料更新方法
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    logDebug('Starting user profile update', { component: 'useSupabaseAuth' })

    try {
      // 簡化：直接嘗試更新，如果失敗則創建
      let updatedProfile
      try {
        updatedProfile = await authService.updateUserProfile(user.id, updates)
        logDebug('Profile update successful', { component: 'useSupabaseAuth', hasProfile: !!updatedProfile })
      } catch (updateError) {
        logDebug('Profile update failed, attempting create', { component: 'useSupabaseAuth' })

        // 如果更新失敗，嘗試創建用戶資料
        updatedProfile = await authService.upsertUserProfile({
          id: user.id,
          email: user.email!,
          ...updates
        })
        logDebug('Profile create successful', { component: 'useSupabaseAuth', hasProfile: !!updatedProfile })
      }

      if (updatedProfile) {
        setUserProfile(updatedProfile)
      }
    } catch (error) {
      logError('Profile update/create failed', { component: 'useSupabaseAuth' })
      throw error
    }
  }, [user?.id])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      try {
        const profile = await authService.getUserProfile(user.id)
        setUserProfile(profile)
      } catch (error) {
        logError('Profile refresh failed', { component: 'useSupabaseAuth', action: 'refreshProfile' })
      }
    }
  }, [user?.id])

  return {
    // 狀態
    user,
    userProfile,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: userProfile?.is_admin || false,

    // 方法
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateProfile
  }
}

export { useSupabaseAuth }