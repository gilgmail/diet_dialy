// 訂閱服務
// 管理用戶訂閱狀態和 AI 功能權限檢查

import { supabase } from '@/shared/api/supabase/client'
import type {
  UserSubscription,
  AIAccessResult,
  SubscriptionQueryOptions,
  SubscriptionError
} from '../types'

export class SubscriptionService {
  /**
   * 檢查用戶是否有 AI 分析權限
   */
  static async checkAIAccess(userId: string): Promise<AIAccessResult> {
    try {
      console.log('[SubscriptionService] Checking AI access for user:', userId)

      // 查詢用戶訂閱資訊
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('[SubscriptionService] Error fetching subscription:', error)

        // 如果找不到訂閱記錄，創建預設免費訂閱
        if (error.code === 'PGRST116') {
          console.log('[SubscriptionService] No subscription found, creating default...')
          await this.createDefaultSubscription(userId)

          return {
            hasAccess: false,
            reason: 'AI 分析為付費功能，請升級至 Premium 版本'
          }
        }

        return {
          hasAccess: false,
          reason: '無法取得訂閱資訊，請稍後再試'
        }
      }

      const subscription = data as UserSubscription

      // 檢查訂閱狀態
      if (subscription.status === 'expired') {
        return {
          hasAccess: false,
          reason: '您的訂閱已過期，請續訂以使用 AI 分析功能',
          subscription
        }
      }

      if (subscription.status === 'cancelled') {
        return {
          hasAccess: false,
          reason: '您的訂閱已取消，請重新訂閱以使用 AI 分析功能',
          subscription
        }
      }

      // 檢查 AI 權限
      if (!subscription.hasAIAccess) {
        return {
          hasAccess: false,
          reason: 'AI 分析為付費功能，請升級至 Premium 版本',
          subscription
        }
      }

      // 檢查到期時間
      if (subscription.expiresAt) {
        const expiresAt = new Date(subscription.expiresAt)
        const now = new Date()

        if (expiresAt < now) {
          // 標記為過期
          await this.updateSubscriptionStatus(userId, 'expired')

          return {
            hasAccess: false,
            reason: '您的訂閱已過期，請續訂以使用 AI 分析功能',
            subscription: { ...subscription, status: 'expired' }
          }
        }
      }

      console.log('[SubscriptionService] AI access granted')
      return {
        hasAccess: true,
        subscription
      }

    } catch (error) {
      console.error('[SubscriptionService] Unexpected error:', error)
      return {
        hasAccess: false,
        reason: '系統錯誤，請稍後再試'
      }
    }
  }

  /**
   * 取得用戶訂閱資訊
   */
  static async getUserSubscription(
    options: SubscriptionQueryOptions
  ): Promise<{ data: UserSubscription | null; error: Error | null }> {
    try {
      const { userId, checkExpiry = true } = options

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // 找不到訂閱，創建預設訂閱
          await this.createDefaultSubscription(userId)

          return {
            data: {
              userId,
              plan: 'free',
              status: 'active',
              hasAIAccess: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            error: null
          }
        }

        return { data: null, error: new Error(error.message) }
      }

      const subscription = data as UserSubscription

      // 檢查過期
      if (checkExpiry && subscription.expiresAt) {
        const expiresAt = new Date(subscription.expiresAt)
        const now = new Date()

        if (expiresAt < now && subscription.status === 'active') {
          await this.updateSubscriptionStatus(userId, 'expired')
          subscription.status = 'expired'
        }
      }

      return { data: subscription, error: null }

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error')
      }
    }
  }

  /**
   * 創建預設免費訂閱
   */
  private static async createDefaultSubscription(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan: 'free',
          status: 'active',
          has_ai_access: false
        })

      if (error) {
        console.error('[SubscriptionService] Error creating default subscription:', error)
      } else {
        console.log('[SubscriptionService] Default subscription created')
      }
    } catch (error) {
      console.error('[SubscriptionService] Unexpected error creating subscription:', error)
    }
  }

  /**
   * 更新訂閱狀態
   */
  private static async updateSubscriptionStatus(
    userId: string,
    status: 'active' | 'expired' | 'cancelled' | 'trial'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        console.error('[SubscriptionService] Error updating subscription status:', error)
      } else {
        console.log('[SubscriptionService] Subscription status updated to:', status)
      }
    } catch (error) {
      console.error('[SubscriptionService] Unexpected error updating status:', error)
    }
  }

  /**
   * 升級至 Premium（預留給未來的付費流程）
   */
  static async upgradeToPremium(
    userId: string,
    expiresAt?: Date
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          plan: 'premium',
          status: 'active',
          has_ai_access: true,
          expires_at: expiresAt?.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      console.log('[SubscriptionService] Upgraded to Premium')
      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 取消訂閱
   */
  static async cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          has_ai_access: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      console.log('[SubscriptionService] Subscription cancelled')
      return { success: true }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
