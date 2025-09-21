'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Clock,
  Database,
  RotateCcw,
  Settings
} from 'lucide-react';
import { smartSyncService } from '@/lib/google/smart-sync';
import type { SyncResult } from '@/lib/google/smart-sync';

interface SyncStatusMonitorProps {
  onSyncTrigger?: () => void;
  showControls?: boolean;
}

export default function SyncStatusMonitor({
  onSyncTrigger,
  showControls = true
}: SyncStatusMonitorProps) {
  const [syncStatus, setSyncStatus] = useState(smartSyncService.getSyncStatus());
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    // 監聽同步狀態變化
    const updateStatus = () => {
      setSyncStatus(smartSyncService.getSyncStatus());
    };

    // 監聽同步完成事件
    const handleSyncComplete = (result: SyncResult) => {
      setLastSyncResult(result);
      updateStatus();
    };

    // 監聽網路狀態變化
    const handleOnlineChange = () => {
      setIsOnline(navigator.onLine);
      updateStatus();
    };

    // 設置監聽器
    smartSyncService.onSyncComplete(handleSyncComplete);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnlineChange);
      window.addEventListener('offline', handleOnlineChange);
    }

    // 定期更新狀態
    const interval = setInterval(updateStatus, 5000);

    return () => {
      smartSyncService.removeSyncCallback(handleSyncComplete);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnlineChange);
        window.removeEventListener('offline', handleOnlineChange);
      }
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    try {
      await smartSyncService.triggerFullSync();
      onSyncTrigger?.();
    } catch (error) {
      console.error('手動同步失敗:', error);
    }
  };

  const toggleAutoSync = () => {
    smartSyncService.setAutoSync(!syncStatus.autoSyncEnabled);
    setSyncStatus(smartSyncService.getSyncStatus());
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-gray-500';
    if (syncStatus.syncInProgress) return 'text-blue-500';
    if (!syncStatus.isAuthenticated) return 'text-red-500';
    if (lastSyncResult?.success === false) return 'text-red-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return '離線';
    if (syncStatus.syncInProgress) return '同步中...';
    if (!syncStatus.isAuthenticated) return '未登入';
    if (lastSyncResult?.success === false) return '同步失敗';
    if (!syncStatus.lastSyncTime) return '尚未同步';
    return '已同步';
  };

  const formatLastSyncTime = () => {
    if (!syncStatus.lastSyncTime) return '從未同步';

    const now = new Date();
    const lastSync = syncStatus.lastSyncTime;
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return '剛剛';
    if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} 小時前`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} 天前`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">同步狀態</CardTitle>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-gray-500" />
          )}
          {syncStatus.syncInProgress && (
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 主要狀態 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${
              isOnline && syncStatus.isAuthenticated && lastSyncResult?.success !== false
                ? 'bg-green-500'
                : 'bg-red-500'
            }`} />
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>

          <Badge variant={syncStatus.autoSyncEnabled ? "default" : "secondary"}>
            {syncStatus.autoSyncEnabled ? '自動同步' : '手動同步'}
          </Badge>
        </div>

        {/* 上次同步時間 */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>上次同步: {formatLastSyncTime()}</span>
        </div>

        {/* 同步統計 */}
        {lastSyncResult && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {lastSyncResult.processed}
              </div>
              <div className="text-xs text-gray-500">處理資料</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">
                {lastSyncResult.duplicatesRemoved}
              </div>
              <div className="text-xs text-gray-500">去重資料</div>
            </div>
          </div>
        )}

        {/* 錯誤信息 */}
        {lastSyncResult?.errors && lastSyncResult.errors.length > 0 && (
          <div className="p-2 bg-red-50 rounded-md">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">同步錯誤</span>
            </div>
            <div className="text-xs text-red-600 mt-1">
              {lastSyncResult.errors[0]}
            </div>
          </div>
        )}

        {/* 成功提示 */}
        {lastSyncResult?.success && lastSyncResult.errors.length === 0 && (
          <div className="p-2 bg-green-50 rounded-md">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">
                同步成功，處理 {lastSyncResult.processed} 筆資料
                {lastSyncResult.duplicatesRemoved > 0 &&
                  `，去除 ${lastSyncResult.duplicatesRemoved} 筆重複`
                }
              </span>
            </div>
          </div>
        )}

        {/* 控制按鈕 */}
        {showControls && (
          <div className="flex space-x-2 pt-2">
            <Button
              onClick={handleManualSync}
              disabled={syncStatus.syncInProgress || !isOnline || !syncStatus.isAuthenticated}
              size="sm"
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              手動同步
            </Button>

            <Button
              onClick={toggleAutoSync}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-2" />
              {syncStatus.autoSyncEnabled ? '停用自動' : '啟用自動'}
            </Button>
          </div>
        )}

        {/* 連線提示 */}
        {!isOnline && (
          <div className="p-2 bg-yellow-50 rounded-md">
            <div className="flex items-center space-x-2 text-yellow-700">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">
                離線模式：資料將在連線後自動同步
              </span>
            </div>
          </div>
        )}

        {/* 未登入提示 */}
        {isOnline && !syncStatus.isAuthenticated && (
          <div className="p-2 bg-red-50 rounded-md">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                請先登入 Google 帳號以啟用同步功能
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}