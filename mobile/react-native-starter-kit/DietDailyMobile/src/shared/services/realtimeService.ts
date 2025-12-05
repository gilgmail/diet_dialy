/**
 * Global Realtime Subscription Service
 * 
 * 在 App 啟動時訂閱所有必要的 realtime channels，
 * 無論用戶在哪個頁面都能收到即時更新
 */

import { supabase } from '@/shared/api/supabase/client'
import { queryClient } from '../../../App'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeServiceCallbacks {
  onFoodEntryChange?: () => void
  onSymptomEntryChange?: () => void
  onBowelEntryChange?: () => void
}

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map()
  private userId: string | null = null
  private callbacks: RealtimeServiceCallbacks = {}

  /**
   * 初始化全局實時訂閱
   */
  initialize(userId: string, callbacks?: RealtimeServiceCallbacks) {
    console.log('[RealtimeService] Initializing for user:', userId)
    
    // 如果已經為同一用戶初始化，則跳過
    if (this.userId === userId && this.channels.size > 0) {
      console.log('[RealtimeService] Already initialized for this user')
      return
    }

    // 清理舊的訂閱
    this.cleanup()

    this.userId = userId
    this.callbacks = callbacks || {}

    // 訂閱 food_entries
    this.subscribeFoodEntries(userId)
    
    // 訂閱 symptom_entries
    this.subscribeSymptomEntries(userId)
    
    // 訂閱 bowel_movement_entries
    this.subscribeBowelEntries(userId)

    console.log('[RealtimeService] Initialization complete')
  }

  /**
   * 訂閱 food_entries 變更
   */
  private subscribeFoodEntries(userId: string) {
    const channelName = `global_food_entries_${userId}`
    
    console.log('[RealtimeService] Subscribing to food_entries for user:', userId)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_entries',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[RealtimeService] food_entries event:', payload.eventType, payload.new?.food_name || payload.old?.food_name)
          
          // 觸發 React Query 重新抓取
          queryClient.invalidateQueries({ 
            queryKey: ['foodEntries', userId] 
          })

          // 也 invalidate 按日期查詢的 cache
          queryClient.invalidateQueries({ 
            queryKey: ['foodEntries', userId],
            exact: false // 匹配所有以 ['foodEntries', userId] 開頭的 query
          })

          // 執行回調
          this.callbacks.onFoodEntryChange?.()
        }
      )
      .subscribe((status, err) => {
        console.log('[RealtimeService] food_entries subscription status:', status)
        if (err) {
          console.error('[RealtimeService] food_entries subscription error:', err)
        }
      })

    this.channels.set(channelName, channel)
  }

  /**
   * 訂閱 symptom_entries 變更
   */
  private subscribeSymptomEntries(userId: string) {
    const channelName = `global_symptom_entries_${userId}`
    
    console.log('[RealtimeService] Subscribing to symptom_entries for user:', userId)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_symptom_entries',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[RealtimeService] symptom_entries event:', payload.eventType)
          
          queryClient.invalidateQueries({ 
            queryKey: ['symptomEntries', userId] 
          })

          queryClient.invalidateQueries({ 
            queryKey: ['symptomEntries', userId],
            exact: false
          })

          this.callbacks.onSymptomEntryChange?.()
        }
      )
      .subscribe((status, err) => {
        console.log('[RealtimeService] symptom_entries subscription status:', status)
        if (err) {
          console.error('[RealtimeService] symptom_entries subscription error:', err)
        }
      })

    this.channels.set(channelName, channel)
  }

  /**
   * 訂閱 bowel_movement_entries 變更
   */
  private subscribeBowelEntries(userId: string) {
    const channelName = `global_bowel_entries_${userId}`
    
    console.log('[RealtimeService] Subscribing to bowel_movement_entries for user:', userId)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bowel_movement_entries',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[RealtimeService] bowel_entries event:', payload.eventType)
          
          queryClient.invalidateQueries({ 
            queryKey: ['bowelMovements', userId] 
          })

          queryClient.invalidateQueries({ 
            queryKey: ['bowelEntries', userId] 
          })

          this.callbacks.onBowelEntryChange?.()
        }
      )
      .subscribe((status, err) => {
        console.log('[RealtimeService] bowel_entries subscription status:', status)
        if (err) {
          console.error('[RealtimeService] bowel_entries subscription error:', err)
        }
      })

    this.channels.set(channelName, channel)
  }

  /**
   * 清理所有訂閱
   */
  cleanup() {
    if (this.channels.size === 0) return

    console.log('[RealtimeService] Cleaning up', this.channels.size, 'subscriptions')
    
    this.channels.forEach((channel, name) => {
      console.log('[RealtimeService] Unsubscribing from', name)
      channel.unsubscribe()
    })
    
    this.channels.clear()
    this.userId = null
    this.callbacks = {}
  }

  /**
   * 獲取當前訂閱狀態
   */
  getStatus() {
    return {
      userId: this.userId,
      activeChannels: Array.from(this.channels.keys()),
      isActive: this.channels.size > 0,
    }
  }
}

// 導出單例
export const realtimeService = new RealtimeService()

