'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useMedicalData } from '@/lib/google';
import { SyncStatus } from '@/components/google/SyncStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Calendar, FileText, PlusCircle, TrendingUp, Clock, Database, ChevronRight, MoreHorizontal } from 'lucide-react';
import MainNavigation from '@/components/navigation/MainNavigation';
import { unifiedDataService, UnifiedFoodEntry } from '@/lib/unified-data-service';

interface DashboardStats {
  todayFoodEntries: number;
  weekFoodEntries: number;
  monthFoodEntries: number;
  lastSyncTime: string | null;
  pendingVerifications: number;
  pendingCount: number;
  errorCount: number;
}

export default function DashboardPage() {
  const {
    isReady,
    user,
    medicalService,
    isAuthenticated
  } = useMedicalData();

  const [stats, setStats] = useState<DashboardStats>({
    todayFoodEntries: 0,
    weekFoodEntries: 0,
    monthFoodEntries: 0,
    lastSyncTime: null,
    pendingVerifications: 0,
    pendingCount: 0,
    errorCount: 0
  });

  const [recentEntries, setRecentEntries] = useState<UnifiedFoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const entriesPerPage = 10;

  // 載入儀表板資料
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!isAuthenticated || !medicalService) {
        return;
      }

      setIsLoading(true);
      try {
        // 載入今日資料
        await unifiedDataService.getUnifiedEntries(new Date().toISOString().split('T')[0], medicalService);

        // 獲取統計資料
        const statistics = unifiedDataService.getStatistics();

        setStats({
          todayFoodEntries: statistics.todayCount,
          weekFoodEntries: statistics.weekCount,
          monthFoodEntries: statistics.monthCount,
          pendingCount: statistics.pendingCount,
          errorCount: statistics.errorCount,
          lastSyncTime: new Date().toISOString(),
          pendingVerifications: 0
        });

        // 獲取最近記錄
        const recent = unifiedDataService.getRecentEntries(entriesPerPage * (currentPage + 1));
        setRecentEntries(recent);

      } catch (error) {
        console.error('❌ 載入儀表板資料失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();

    // 訂閱資料變更
    const unsubscribe = unifiedDataService.subscribe((entries) => {
      const statistics = unifiedDataService.getStatistics();
      setStats(prev => ({
        ...prev,
        todayFoodEntries: statistics.todayCount,
        weekFoodEntries: statistics.weekCount,
        monthFoodEntries: statistics.monthCount,
        pendingCount: statistics.pendingCount,
        errorCount: statistics.errorCount
      }));

      const recent = unifiedDataService.getRecentEntries(entriesPerPage * (currentPage + 1));
      setRecentEntries(recent);
    });

    // 定期更新資料
    const interval = setInterval(loadDashboardData, 60000); // 每分鐘更新

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isAuthenticated, medicalService, currentPage]);

  // 載入更多記錄
  const loadMoreEntries = () => {
    setCurrentPage(prev => prev + 1);
  };

  // 格式化時間
  const formatTime = (dateStr: string, timeStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) {
      return `今天 ${timeStr}`;
    }

    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return `昨天 ${timeStr}`;
    if (diffDays < 7) return `${diffDays}天前 ${timeStr}`;

    return `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`;
  };

  // 狀態徽章
  const StatusBadge = ({ status }: { status: string }) => {
    const configs = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '⏳', text: '待同步' },
      syncing: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '🔄', text: '同步中' },
      synced: { color: 'bg-green-100 text-green-800 border-green-200', icon: '✅', text: '已同步' },
      error: { color: 'bg-red-100 text-red-800 border-red-200', icon: '❌', text: '失敗' }
    };

    const config = configs[status as keyof typeof configs] || configs.pending;

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.text}
      </span>
    );
  };

  // 同步按鈕
  const handleSync = async () => {
    if (!medicalService) return;

    setIsLoading(true);
    try {
      await unifiedDataService.syncPendingEntries(medicalService);
    } catch (error) {
      console.error('同步失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNavigation />

      <div className="container mx-auto p-6" data-testid="dashboard">
        {/* 頂部標題區域 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">儀表板</h1>
          <p className="text-gray-600">查看您的飲食記錄和健康統計</p>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日記錄</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayFoodEntries}</div>
              <p className="text-xs text-muted-foreground">食物記錄</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本週記錄</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weekFoodEntries}</div>
              <p className="text-xs text-muted-foreground">食物記錄</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本月記錄</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthFoodEntries}</div>
              <p className="text-xs text-muted-foreground">食物記錄</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">同步狀態</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.pendingCount === 0 ? '✓' : stats.pendingCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingCount === 0 ? '已同步' : `${stats.pendingCount} 待同步`}
              </p>
              {stats.errorCount > 0 && (
                <p className="text-xs text-red-600 mt-1">{stats.errorCount} 失敗</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 快速操作 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
              <CardDescription>常用功能快速入口</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/food-diary">
                <Button className="w-full justify-start" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  記錄飲食
                </Button>
              </Link>

              <Button
                onClick={handleSync}
                className="w-full justify-start"
                variant="outline"
                disabled={isLoading || stats.pendingCount === 0}
              >
                <Database className="mr-2 h-4 w-4" />
                同步到 Google Sheets ({stats.pendingCount})
              </Button>

              <Link href="/history">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  查看完整歷史
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>同步狀態</CardTitle>
              <CardDescription>Google Sheets 連線狀態</CardDescription>
            </CardHeader>
            <CardContent>
              <SyncStatus />
            </CardContent>
          </Card>
        </div>

        {/* 最近活動 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>最近活動</span>
              <span className="text-sm font-normal text-gray-500">
                顯示最近 {Math.min(recentEntries.length, entriesPerPage * (currentPage + 1))} 筆記錄
              </span>
            </CardTitle>
            <CardDescription>您最近的飲食記錄</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && recentEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                載入中...
              </div>
            ) : recentEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>還沒有記錄</p>
                <Link href="/food-diary">
                  <Button className="mt-2" size="sm">
                    開始記錄
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEntries.slice(0, entriesPerPage * (currentPage + 1)).map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{entry.foodName}</div>
                        <div className="text-sm text-gray-500">
                          {formatTime(entry.date, entry.time)} • {entry.category}
                          {entry.notes && ` • ${entry.notes}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-gray-500">
                        評分: {entry.medicalScore}
                      </div>
                      <StatusBadge status={entry.status} />
                    </div>
                  </div>
                ))}

                {/* 載入更多按鈕 */}
                {recentEntries.length > entriesPerPage * (currentPage + 1) && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={loadMoreEntries}
                      variant="outline"
                      className="w-full"
                      disabled={isLoading}
                    >
                      <MoreHorizontal className="mr-2 h-4 w-4" />
                      載入更多記錄
                    </Button>
                  </div>
                )}

                {/* 查看完整歷史 */}
                {recentEntries.length >= 20 && (
                  <div className="pt-4 border-t">
                    <Link href="/history">
                      <Button variant="ghost" className="w-full">
                        <FileText className="mr-2 h-4 w-4" />
                        查看完整歷史記錄
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}