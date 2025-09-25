'use client'

import { useState, useEffect } from 'react'
import { autoSyncService, type SyncStatus, type SyncResult } from '@/lib/services/auto-sync-service'
import { enhancedFoodEntriesService } from '@/lib/supabase/enhanced-food-entries'

interface SyncStatusDisplayProps {
  userId?: string
  className?: string
}

export function SyncStatusDisplay({ userId, className = '' }: SyncStatusDisplayProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [isManualSyncing, setIsManualSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [diagnostics, setDiagnostics] = useState<any>(null)

  // 定期更新同步狀態
  useEffect(() => {
    updateSyncStatus()
    const interval = setInterval(updateSyncStatus, 3000) // 每3秒更新
    return () => clearInterval(interval)
  }, [])

  const updateSyncStatus = () => {
    const status = autoSyncService.getSyncStatus()
    setSyncStatus(status)
  }

  // 手動同步
  const handleManualSync = async () => {
    if (!userId || isManualSyncing) return

    setIsManualSyncing(true)
    try {
      const result = await autoSyncService.syncAllEntries(userId)
      setLastSyncResult(result)
      updateSyncStatus()

      // 顯示結果3秒
      setTimeout(() => setLastSyncResult(null), 3000)
    } catch (error) {
      console.error('手動同步失敗:', error)
    } finally {
      setIsManualSyncing(false)
    }
  }

  // 強制同步所有數據
  const handleForceSync = async () => {
    if (!userId || isManualSyncing) return

    setIsManualSyncing(true)
    try {
      const result = await autoSyncService.forceSyncAll(userId)
      setLastSyncResult(result)
      updateSyncStatus()
      setTimeout(() => setLastSyncResult(null), 3000)
    } catch (error) {
      console.error('強制同步失敗:', error)
    } finally {
      setIsManualSyncing(false)
    }
  }

  // 清理失敗記錄
  const handleCleanupFailed = () => {
    const cleaned = autoSyncService.cleanupFailedSyncs()
    updateSyncStatus()
    alert(`已清理 ${cleaned} 條失敗記錄`)
  }

  // 載入診斷信息
  const loadDiagnostics = async () => {
    const diag = await autoSyncService.getDiagnostics()
    setDiagnostics(diag)
    setShowDiagnostics(true)
  }

  // 測試表創建功能
  const handleTestTableCreation = async () => {
    if (!userId) return

    try {
      const testResult = await autoSyncService.testSync(userId)
      console.log('測試結果:', testResult)

      if (testResult.testResult) {
        const result = testResult.testResult
        const message = result.success
          ? '✅ 表功能測試成功！'
          : `❌ 測試失敗: ${result.errors.join(', ')}`
        alert(message)
      } else {
        alert(testResult.error || '測試失敗')
      }
    } catch (error) {
      alert(`測試異常: ${error}`)
    }
  }

  if (!syncStatus) return null

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return '📱'
    if (syncStatus.isSyncing || isManualSyncing) return '🔄'
    if (syncStatus.pendingCount > 0) return '⏳'
    if (syncStatus.failedCount > 0) return '⚠️'
    return '✅'
  }

  const getStatusText = () => {
    if (!syncStatus.isOnline) return '離線模式'
    if (syncStatus.isSyncing || isManualSyncing) return '同步中...'
    if (syncStatus.pendingCount > 0) return `${syncStatus.pendingCount} 條記錄待同步`
    if (syncStatus.failedCount > 0) return `${syncStatus.failedCount} 條記錄同步失敗`
    return '所有記錄已同步'
  }

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'bg-gray-50 border-gray-200'
    if (syncStatus.isSyncing || isManualSyncing) return 'bg-blue-50 border-blue-200'
    if (syncStatus.pendingCount > 0) return 'bg-yellow-50 border-yellow-200'
    if (syncStatus.failedCount > 0) return 'bg-red-50 border-red-200'
    return 'bg-green-50 border-green-200'
  }

  const getTextColor = () => {
    if (!syncStatus.isOnline) return 'text-gray-600'
    if (syncStatus.isSyncing || isManualSyncing) return 'text-blue-600'
    if (syncStatus.pendingCount > 0) return 'text-yellow-600'
    if (syncStatus.failedCount > 0) return 'text-red-600'
    return 'text-green-600'
  }

  return (
    <div className={`bg-white rounded-lg border ${getStatusColor()} p-4 ${className}`}>
      {/* 主要狀態顯示 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-xl">
            {getStatusIcon()}
          </span>
          <div>
            <h3 className={`font-medium ${getTextColor()}`}>
              {getStatusText()}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {syncStatus.lastSyncTime && (
                <span>
                  上次同步: {syncStatus.lastSyncTime.toLocaleTimeString('zh-TW')}
                </span>
              )}
              {!syncStatus.tableExists && (
                <span className="text-red-500">
                  • 需要創建數據表
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex items-center space-x-2">
          {/* 手動同步按鈕 */}
          {userId && syncStatus.isOnline && syncStatus.pendingCount > 0 && !syncStatus.isSyncing && (
            <button
              onClick={handleManualSync}
              disabled={isManualSyncing}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
            >
              {isManualSyncing ? '同步中...' : '立即同步'}
            </button>
          )}

          {/* 更多選項 */}
          <div className="relative">
            <button
              onClick={loadDiagnostics}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="查看詳細信息"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* 同步結果顯示 */}
      {lastSyncResult && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm">
            {lastSyncResult.tableExists ? (
              <>
                <span className="text-green-600">✅ 同步完成: </span>
                <span>{lastSyncResult.success} 成功, {lastSyncResult.failed} 失敗</span>
                {lastSyncResult.errors.length > 0 && (
                  <div className="mt-1 text-red-600">
                    錯誤: {lastSyncResult.errors.slice(0, 2).join(', ')}
                    {lastSyncResult.errors.length > 2 && '...'}
                  </div>
                )}
              </>
            ) : (
              <span className="text-red-600">❌ food_entries 表不存在，請先創建數據表</span>
            )}
          </div>
        </div>
      )}

      {/* 詳細診斷信息 */}
      {showDiagnostics && diagnostics && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">系統診斷</h4>
            <button
              onClick={() => setShowDiagnostics(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-sm">
            {/* 系統狀態 */}
            <div>
              <h5 className="font-medium text-gray-700 mb-1">數據庫狀態</h5>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>表是否存在:</span>
                  <span className={diagnostics.systemStatus.tableExists ? 'text-green-600' : 'text-red-600'}>
                    {diagnostics.systemStatus.tableExists ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>連接狀態:</span>
                  <span className={diagnostics.systemStatus.canConnect ? 'text-green-600' : 'text-red-600'}>
                    {diagnostics.systemStatus.canConnect ? '✅' : '❌'}
                  </span>
                </div>
              </div>
            </div>

            {/* 本地數據統計 */}
            <div>
              <h5 className="font-medium text-gray-700 mb-1">本地數據</h5>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>總記錄:</span>
                  <span>{diagnostics.localStats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>待同步:</span>
                  <span className={diagnostics.localStats.unsynced > 0 ? 'text-yellow-600' : 'text-green-600'}>
                    {diagnostics.localStats.unsynced}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>失敗:</span>
                  <span className={diagnostics.localStats.failed > 0 ? 'text-red-600' : 'text-green-600'}>
                    {diagnostics.localStats.failed}
                  </span>
                </div>
              </div>
            </div>

            {/* 建議操作 */}
            {diagnostics.recommendations.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-700 mb-1">建議操作</h5>
                <ul className="space-y-1">
                  {diagnostics.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-gray-600">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {diagnostics.tableMissing && (
                <button
                  onClick={() => {
                    alert('請前往 Supabase 控制台執行 sql-scripts/create_food_entries_table.sql')
                  }}
                  className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
                >
                  查看建表指南
                </button>
              )}

              {userId && diagnostics.systemStatus.tableExists && (
                <button
                  onClick={handleTestTableCreation}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs"
                >
                  測試表功能
                </button>
              )}

              {userId && syncStatus.pendingCount > 0 && (
                <button
                  onClick={handleForceSync}
                  disabled={isManualSyncing}
                  className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs disabled:bg-gray-100"
                >
                  強制同步
                </button>
              )}

              {syncStatus.failedCount > 0 && (
                <button
                  onClick={handleCleanupFailed}
                  className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded text-xs"
                >
                  清理失敗記錄
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}