'use client'

import { useState, useEffect, useCallback } from 'react'
import { autoSyncService, type SyncStatus, type SyncResult } from '@/lib/services/auto-sync-service'

export function useAutoSync(userId?: string) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isManualSyncing, setIsManualSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)

  // 更新同步狀態
  const updateSyncStatus = useCallback(() => {
    const status = autoSyncService.getSyncStatus()
    setSyncStatus(status)
  }, [])

  // 定期更新同步狀態
  useEffect(() => {
    updateSyncStatus()
    const interval = setInterval(updateSyncStatus, 5000) // 每5秒更新
    return () => clearInterval(interval)
  }, [updateSyncStatus])

  // 手動同步
  const manualSync = useCallback(async (): Promise<SyncResult | null> => {
    if (!userId || isManualSyncing) return null

    setIsManualSyncing(true)
    try {
      const result = await autoSyncService.syncAllEntries(userId)
      setLastSyncResult(result)
      updateSyncStatus()

      // 3秒後清除結果
      setTimeout(() => setLastSyncResult(null), 3000)

      return result
    } catch (error) {
      console.error('手動同步失敗:', error)
      return null
    } finally {
      setIsManualSyncing(false)
    }
  }, [userId, isManualSyncing, updateSyncStatus])

  // 強制同步
  const forceSync = useCallback(async (): Promise<SyncResult | null> => {
    if (!userId || isManualSyncing) return null

    setIsManualSyncing(true)
    try {
      const result = await autoSyncService.forceSyncAll(userId)
      setLastSyncResult(result)
      updateSyncStatus()
      setTimeout(() => setLastSyncResult(null), 3000)
      return result
    } catch (error) {
      console.error('強制同步失敗:', error)
      return null
    } finally {
      setIsManualSyncing(false)
    }
  }, [userId, isManualSyncing, updateSyncStatus])

  // 清理失敗記錄
  const cleanupFailedSyncs = useCallback(() => {
    const cleaned = autoSyncService.cleanupFailedSyncs()
    updateSyncStatus()
    return cleaned
  }, [updateSyncStatus])

  // 獲取診斷信息
  const getDiagnostics = useCallback(async () => {
    return await autoSyncService.getDiagnostics()
  }, [])

  // 測試同步功能
  const testSync = useCallback(async () => {
    if (!userId) return null
    return await autoSyncService.testSync(userId)
  }, [userId])

  return {
    // 狀態
    syncStatus,
    isManualSyncing,
    lastSyncResult,

    // 方法
    manualSync,
    forceSync,
    cleanupFailedSyncs,
    getDiagnostics,
    testSync,
    updateSyncStatus
  }
}