// Supabase 認證服務
import { supabase } from './client'
import type { User, UserInsert, UserUpdate } from '@/types/supabase'

export class SupabaseAuthService {

  // Google OAuth 登入
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('Google sign-in error:', error)
      throw error
    }

    return data
  }

  // 登出
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  // 獲取當前用戶
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Get user error:', error)
      return null
    }
    return user
  }

  // 獲取用戶資料
  async getUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('diet_daily_users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Get user profile error:', error)
      return null
    }

    return data
  }

  // 建立或更新用戶資料
  async upsertUserProfile(userData: UserInsert): Promise<User | null> {
    try {
      // 先嘗試按 ID 查找用戶
      const { data: existingUser } = await supabase
        .from('diet_daily_users')
        .select('*')
        .eq('id', userData.id)
        .single()

      if (existingUser) {
        // 用戶已存在，更新資料
        const { data, error } = await supabase
          .from('diet_daily_users')
          .update({
            ...userData,
            updated_at: new Date().toISOString()
          })
          .eq('id', userData.id)
          .select()
          .single()

        if (error) {
          console.error('Update user profile error:', error)
          throw error
        }

        return data
      } else {
        // 用戶不存在，創建新用戶
        const { data, error } = await supabase
          .from('diet_daily_users')
          .insert({
            ...userData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Insert user profile error:', error)
          throw error
        }

        return data
      }
    } catch (error) {
      console.error('Upsert user profile error:', error)
      throw error
    }
  }

  // 更新用戶資料
  async updateUserProfile(userId: string, updates: UserUpdate): Promise<User | null> {
    const { data, error } = await supabase
      .from('diet_daily_users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Update user profile error:', error)
      throw error
    }

    return data
  }

  // 檢查用戶是否為管理員
  async isUserAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('diet_daily_users')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Check admin status error:', error)
      return false
    }

    return data?.is_admin || false
  }

  // 監聽認證狀態變化
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export const authService = new SupabaseAuthService()