// Sync status indicator component
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMedicalData } from '@/lib/google';
import { unifiedDataService } from '@/lib/unified-data-service';
import { offlineStorageManager } from '@/lib/offline-storage';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  CloudOff,
  Activity,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SyncStatusProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

interface DetailedSyncStatus {
  isOnline: boolean;
  isAuthenticated: boolean;
  hasValidConnection: boolean;
  pendingCount: number;
  errorCount: number;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  lastError?: string;
}

export function SyncStatus({
  className = '',
  showDetails = true,
  compact = false
}: SyncStatusProps) {
  const { syncStatus, syncNow, isAuthenticated, isReady, medicalService, signIn } = useMedicalData();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [detailedStatus, setDetailedStatus] = useState<DetailedSyncStatus>({
    isOnline: navigator.onLine,
    isAuthenticated: false,
    hasValidConnection: false,
    pendingCount: 0,
    errorCount: 0,
    lastSyncTime: null,
    isSyncing: false,
    connectionQuality: 'offline'
  });

  // 實時更新詳細狀態
  useEffect(() => {
    const updateDetailedStatus = () => {
      const stats = unifiedDataService.getStatistics();
      const syncMetadata = offlineStorageManager.getSyncMetadata();
      const hasValidConnection = navigator.onLine && isAuthenticated && isReady;

      // 計算連接質量
      let connectionQuality: DetailedSyncStatus['connectionQuality'] = 'offline';
      if (navigator.onLine) {
        if (isAuthenticated && isReady) {
          connectionQuality = stats.errorCount === 0 ? 'excellent' : 'good';
        } else {
          connectionQuality = 'poor';
        }
      }

      setDetailedStatus({
        isOnline: navigator.onLine,
        isAuthenticated,
        hasValidConnection,
        pendingCount: stats.pendingCount,
        errorCount: stats.errorCount,
        lastSyncTime: syncMetadata.lastSyncTime ? new Date(syncMetadata.lastSyncTime) : null,
        isSyncing: isManualSyncing || syncStatus?.syncInProgress || false,
        connectionQuality,
        lastError: stats.errorCount > 0 ? '部分記錄同步失敗' : undefined
      });
    };

    // 立即更新一次
    updateDetailedStatus();

    // 定期更新狀態
    const interval = setInterval(updateDetailedStatus, 5000);

    // 監聽網路狀態變化
    const handleOnline = () => updateDetailedStatus();
    const handleOffline = () => updateDetailedStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthenticated, isReady, isManualSyncing, syncStatus]);

  const handleManualSync = async () => {
    if (isManualSyncing || !detailedStatus.hasValidConnection) return;

    setIsManualSyncing(true);
    try {
      console.log('🔄 開始手動同步...');

      if (medicalService) {
        const result = await unifiedDataService.syncPendingEntries(medicalService);
        console.log('✅ 手動同步結果:', result);

        // 顯示同步結果
        if (result.failed === 0) {
          showToast(`✅ 同步完成: ${result.success} 筆記錄`);
        } else {
          showToast(`⚠️ 部分同步: ${result.success} 成功, ${result.failed} 失敗`);
        }
      } else {
        await syncNow();
      }
    } catch (error) {
      console.error('❌ 手動同步失敗:', error);
      showToast('❌ 同步失敗，請檢查網路連線');
    } finally {
      setIsManualSyncing(false);
    }
  };

  // 簡單的toast提示函數
  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px; background: #059669; color: white;
      padding: 12px 16px; border-radius: 8px; z-index: 1000; font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15); max-width: 300px;
    `;
    if (message.startsWith('❌') || message.startsWith('⚠️')) {
      toast.style.background = '#dc2626';
    }
    document.body.appendChild(toast);
    setTimeout(() => toast.parentNode?.removeChild(toast), 3000);
  };

  const getStatusIcon = () => {
    if (!detailedStatus.isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }

    if (detailedStatus.isSyncing) {
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }

    if (detailedStatus.errorCount > 0) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }

    if (detailedStatus.pendingCount > 0) {
      return <Clock className="w-4 h-4 text-orange-500" />;
    }

    if (detailedStatus.hasValidConnection) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }

    return <WifiOff className="w-4 h-4 text-gray-500" />;
  };

  // 自動重連功能
  const handleAutoReconnect = async () => {
    if (isReconnecting || !detailedStatus.isOnline) return;

    setIsReconnecting(true);
    try {
      console.log('🔄 嘗試自動重新連接到 Google...');
      const authUrl = await signIn();

      // 在新窗口中打開認證頁面
      const authWindow = window.open(
        authUrl,
        'google-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (authWindow) {
        // 監聽窗口關閉事件
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            setIsReconnecting(false);

            // 檢查認證是否成功
            setTimeout(() => {
              if (isAuthenticated) {
                showToast('✅ 重新連接成功');
              } else {
                showToast('ℹ️ 請完成 Google 認證以繼續同步');
              }
            }, 1000);
          }
        }, 1000);
      } else {
        showToast('❌ 無法打開認證窗口，請檢查彈窗攔截設定');
        setIsReconnecting(false);
      }
    } catch (error) {
      console.error('❌ 自動重連失敗:', error);
      showToast('❌ 自動重連失敗，請手動重新登入');
      setIsReconnecting(false);
    }
  };

  const getStatusText = () => {
    if (!detailedStatus.isOnline) {
      return '離線';
    }

    if (isReconnecting) {
      return '正在重新連接...';
    }

    if (!detailedStatus.isAuthenticated) {
      return '未連接 - 點擊重新連接';
    }

    if (detailedStatus.isSyncing) {
      return '同步中...';
    }

    if (!isReady) {
      return '服務初始化中';
    }

    if (detailedStatus.errorCount > 0) {
      return `${detailedStatus.errorCount} 項同步失敗`;
    }

    if (detailedStatus.pendingCount > 0) {
      return `${detailedStatus.pendingCount} 項待同步`;
    }

    if (detailedStatus.lastSyncTime) {
      try {
        return `已同步 ${formatDistanceToNow(detailedStatus.lastSyncTime, { addSuffix: true })}`;
      } catch {
        return '已同步';
      }
    }

    if (detailedStatus.hasValidConnection) {
      return '連接正常';
    }

    return '等待連接';
  };

  const getStatusColor = () => {
    if (!detailedStatus.isOnline) {
      return 'text-red-600';
    }

    if (!detailedStatus.isAuthenticated || !isReady) {
      return 'text-yellow-600';
    }

    if (detailedStatus.isSyncing) {
      return 'text-blue-600';
    }

    if (detailedStatus.errorCount > 0) {
      return 'text-yellow-600';
    }

    if (detailedStatus.pendingCount > 0) {
      return 'text-orange-600';
    }

    if (detailedStatus.hasValidConnection) {
      return 'text-green-600';
    }

    return 'text-gray-600';
  };

  // 緊湊模式渲染
  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStatusIcon()}
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {detailedStatus.pendingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {detailedStatus.pendingCount}
          </Badge>
        )}
      </div>
    );
  }

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStatusIcon()}
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {detailedStatus.pendingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {detailedStatus.pendingCount}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
          <Database className="w-4 h-4" />
          <span>數據同步狀態</span>
        </h3>
        
        <Button
          onClick={handleManualSync}
          variant="outline"
          size="sm"
          disabled={!detailedStatus.hasValidConnection || detailedStatus.isSyncing}
          className={`flex items-center space-x-1 ${
            detailedStatus.pendingCount > 0 ? 'border-blue-300 text-blue-700 hover:bg-blue-50' : ''
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${detailedStatus.isSyncing ? 'animate-spin' : ''}`} />
          <span>{detailedStatus.pendingCount > 0 ? `同步 (${detailedStatus.pendingCount})` : '同步'}</span>
        </Button>
      </div>
      
      {/* Main Status */}
      <div className="flex items-center space-x-3 mb-3">
        {getStatusIcon()}
        <div className="flex-1">
          <div
            className={`text-sm font-medium ${getStatusColor()} ${
              !detailedStatus.isAuthenticated && detailedStatus.isOnline
                ? 'cursor-pointer hover:underline'
                : ''
            }`}
            onClick={!detailedStatus.isAuthenticated && detailedStatus.isOnline ? handleAutoReconnect : undefined}
          >
            {getStatusText()}
          </div>
          {syncStatus.error && (
            <div className="text-xs text-red-500 mt-1">
              {syncStatus.error}
            </div>
          )}
        </div>
      </div>
      
      {/* Detailed Connection Status */}
      <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
        <div className="flex items-center space-x-2">
          {detailedStatus.connectionQuality === 'excellent' ? (
            <Zap className="w-3 h-3 text-green-500" title="連接品質優秀" />
          ) : detailedStatus.connectionQuality === 'good' ? (
            <Wifi className="w-3 h-3 text-green-500" title="連接品質良好" />
          ) : detailedStatus.connectionQuality === 'poor' ? (
            <AlertCircle className="w-3 h-3 text-yellow-500" title="連接品質較差" />
          ) : (
            <CloudOff className="w-3 h-3 text-red-500" title="離線" />
          )}
          <span>
            {detailedStatus.connectionQuality === 'excellent' ? '連接優秀' :
             detailedStatus.connectionQuality === 'good' ? '連接良好' :
             detailedStatus.connectionQuality === 'poor' ? '連接不穩' : '離線'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Clock className="w-3 h-3" />
          <span>
            {detailedStatus.lastSyncTime ? (
              `上次: ${detailedStatus.lastSyncTime.toLocaleTimeString()}`
            ) : (
              '從未同步'
            )}
          </span>
        </div>
      </div>
      
      {/* Pending Changes */}
      {detailedStatus.pendingCount > 0 && (
        <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
          <div className="flex items-center space-x-2 text-orange-700">
            <Clock className="w-3 h-3" />
            <span>
              {detailedStatus.pendingCount} 項目等待同步。
              {detailedStatus.hasValidConnection ?
                '將自動同步。' :
                detailedStatus.isOnline ?
                  '請先登入 Google 帳號。' :
                  '恢復網路連接後將同步。'
              }
            </span>
          </div>
        </div>
      )}

      {/* Sync Errors */}
      {detailedStatus.errorCount > 0 && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <div className="flex items-center justify-between text-red-700">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-3 h-3" />
              <span>
                {detailedStatus.errorCount} 項目同步失敗。
                {detailedStatus.lastError && ` 錯誤: ${detailedStatus.lastError}`}
              </span>
            </div>
            <Button
              onClick={handleManualSync}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-red-700 hover:bg-red-100"
              disabled={detailedStatus.isSyncing || !detailedStatus.hasValidConnection}
            >
              重試
            </Button>
          </div>
        </div>
      )}
      
      {/* Status Summary and Privacy Notice */}
      {detailedStatus.hasValidConnection && detailedStatus.pendingCount === 0 && detailedStatus.errorCount === 0 && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-3 h-3" />
            <span>所有記錄已同步完成。</span>
          </div>
        </div>
      )}

      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        <div className="flex items-start space-x-2">
          <Database className="w-3 h-3 mt-0.5" />
          <span>
            您的健康數據安全存儲在您的 Google 帳戶中。
            我們絕不會在我們的伺服器上存儲您的健康信息。
          </span>
        </div>
      </div>
    </div>
  );
}

export default SyncStatus;