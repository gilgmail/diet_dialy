// 訂閱功能類型定義
// 管理用戶的訂閱狀態和 AI 功能權限

/**
 * 訂閱計畫類型
 */
export type SubscriptionPlan = 'free' | 'premium'

/**
 * 訂閱狀態
 */
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial'

/**
 * 用戶訂閱資訊
 */
export interface UserSubscription {
  userId: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  hasAIAccess: boolean          // 是否有 AI 分析權限
  expiresAt?: string            // 訂閱到期時間 (ISO 8601)
  createdAt: string
  updatedAt: string
}

/**
 * AI 功能權限檢查結果
 */
export interface AIAccessResult {
  hasAccess: boolean            // 是否有權限
  reason?: string               // 無權限原因
  subscription?: UserSubscription
}

/**
 * 訂閱查詢選項
 */
export interface SubscriptionQueryOptions {
  userId: string
  checkExpiry?: boolean         // 是否檢查過期（預設 true）
}

/**
 * 訂閱服務錯誤
 */
export class SubscriptionError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'EXPIRED' | 'INVALID' | 'NETWORK_ERROR'
  ) {
    super(message)
    this.name = 'SubscriptionError'
  }
}
