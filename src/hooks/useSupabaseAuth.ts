// 簡化版的 Supabase 認證 Hook - 用於調試載入問題
'use client'

import { useState, useEffect, useCallback } from 'react'
import { User as AuthUser } from '@supabase/supabase-js'
import { authService } from '@/lib/supabase/auth'
import type { User } from '@/types/supabase'

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

  console.log('🔍 useSupabaseAuth 狀態:', {
    user: !!user,
    userProfile: !!userProfile,
    isLoading
  })

  // 簡化的初始化認證狀態
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      console.log('🚀 開始初始化認證...')

      try {
        const authUser = await authService.getCurrentUser()
        console.log('👤 獲取用戶:', !!authUser)

        if (mounted && authUser) {
          setUser(authUser)

          // 嘗試載入用戶資料
          try {
            const profile = await authService.getUserProfile(authUser.id)
            console.log('📋 載入用戶資料:', !!profile)
            setUserProfile(profile)
          } catch (profileError) {
            console.warn('⚠️ 載入用戶資料失敗:', profileError)
            // 不阻擋載入完成
          }
        }
      } catch (error) {
        console.error('❌ 初始化認證失敗:', error)
      } finally {
        if (mounted) {
          console.log('✅ 載入完成')
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [])

  // 簡化的登入方法
  const signInWithGoogle = useCallback(async () => {
    try {
      setIsLoading(true)
      await authService.signInWithGoogle()
    } catch (error) {
      console.error('Google sign-in error:', error)
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
      console.error('Sign out error:', error)
      throw error
    }
  }, [])

  // 簡化的資料更新方法
  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user?.id) {
      throw new Error('User not authenticated')
    }

    console.log('💾 開始更新用戶資料:', updates)

    try {
      // 簡化：直接嘗試更新，如果失敗則創建
      let updatedProfile
      try {
        updatedProfile = await authService.updateUserProfile(user.id, updates)
        console.log('✅ 更新成功:', !!updatedProfile)
      } catch (updateError) {
        console.log('📝 更新失敗，嘗試創建:', updateError)

        // 如果更新失敗，嘗試創建用戶資料
        updatedProfile = await authService.upsertUserProfile({
          id: user.id,
          email: user.email!,
          ...updates
        })
        console.log('✅ 創建成功:', !!updatedProfile)
      }

      if (updatedProfile) {
        setUserProfile(updatedProfile)
      }
    } catch (error) {
      console.error('❌ 資料更新失敗:', error)
      throw error
    }
  }, [user?.id])

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      try {
        const profile = await authService.getUserProfile(user.id)
        setUserProfile(profile)
      } catch (error) {
        console.error('Refresh profile error:', error)
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