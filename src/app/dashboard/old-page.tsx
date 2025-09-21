'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useMedicalData } from '@/lib/google';
import { SyncStatus } from '@/components/google/SyncStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Calendar, FileText, PlusCircle, TrendingUp, Clock, Database } from 'lucide-react';
import MainNavigation from '@/components/navigation/MainNavigation';

interface DashboardStats {
  todayFoodEntries: number;
  weekFoodEntries: number;
  monthFoodEntries: number;
  lastSyncTime: string | null;
  pendingVerifications: number;
}

export default function DashboardPage() {
  const {
    isReady,
    user,
    getFoodStatistics,
    getRecentFoodEntries,
    medicalService,
    isAuthenticated
  } = useMedicalData();

  const [stats, setStats] = useState<DashboardStats>({
    todayFoodEntries: 0,
    weekFoodEntries: 0,
    monthFoodEntries: 0,
    lastSyncTime: null,
    pendingVerifications: 0
  });

  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load dashboard data on component mount
  useEffect(() => {
    const initializeAndLoadData = async () => {
      try {
        if (isAuthenticated && user) {
          // Initialize medical service if not ready
          if (!medicalService.isReady()) {
            console.log('📊 Dashboard: 初始化醫療服務...');
            const initResult = await medicalService.initialize(user.id);
            if (!initResult) {
              console.warn('⚠️ Dashboard: 醫療服務初始化失敗');
              // Still load local data as fallback
              await loadDashboardData();
              return;
            }
          }
        }

        // Always load dashboard data (will use local or Google Sheets based on auth)
        await loadDashboardData();
      } catch (error) {
        console.error('❌ Dashboard: 初始化或載入失敗:', error);
      }
    };

    initializeAndLoadData();
  }, [isAuthenticated, user]);

  // Listen for localStorage changes to update dashboard in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('📱 Dashboard: 檢測到localStorage變化，重新載入數據');
      loadDashboardData();
    };

    // Listen for storage events (cross-tab changes)
    window.addEventListener('storage', handleStorageChange);

    // Listen for custom food-diary-update event (same tab changes)
    window.addEventListener('food-diary-update', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('food-diary-update', handleStorageChange);
    };
  }, []);

  // 載入本地統計資料
  const loadLocalStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    let todayEntries = 0;
    let weekEntries = 0;
    let monthEntries = 0;

    // 檢查過去30天的localStorage資料
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const storageKey = `food_diary_${dateStr}`;

      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const entries = JSON.parse(stored);
          const entryCount = Array.isArray(entries) ? entries.length : 0;

          if (dateStr === today) {
            todayEntries = entryCount;
          }
          if (checkDate >= weekAgo) {
            weekEntries += entryCount;
          }
          if (checkDate >= monthAgo) {
            monthEntries += entryCount;
          }
        }
      } catch (error) {
        console.error(`讀取${dateStr}資料失敗:`, error);
      }
    }

    return { todayEntries, weekEntries, monthEntries };
  };

  // 載入本地最近記錄
  const loadLocalRecentEntries = () => {
    const recentEntries: any[] = [];

    // 檢查過去7天的資料
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const storageKey = `food_diary_${dateStr}`;

      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const entries = JSON.parse(stored);
          if (Array.isArray(entries)) {
            entries.forEach(entry => {
              recentEntries.push({
                id: entry.id,
                foodName: entry.foodName,
                date: dateStr,
                time: entry.time,
                category: entry.customFood ? '自定義' : '預設',
                medicalScore: entry.userScore,
                notes: entry.notes
              });
            });
          }
        }
      } catch (error) {
        console.error(`讀取${dateStr}最近記錄失敗:`, error);
      }
    }

    // 按時間排序，最新的在前
    return recentEntries
      .sort((a, b) => {
        const dateTimeA = new Date(`${a.date}T${a.time}`);
        const dateTimeB = new Date(`${b.date}T${b.time}`);
        return dateTimeB.getTime() - dateTimeA.getTime();
      })
      .slice(0, 5); // 只返回最近5筆
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      console.log('📊 Dashboard: 載入統一資料...');

      // 暫時只使用本地數據，避免Google Sheets測試數據干擾
      // if (isAuthenticated && user) {
      //   console.log('🚫 跳過Google Sheets載入，避免測試數據干擾');
      // }

      // 統一使用本地數據，確保數據一致性
      {
        // Fallback to localStorage data when not authenticated
        console.log('📱 Dashboard: 載入本地資料...');
        const localStats = loadLocalStats();
        const localRecent = loadLocalRecentEntries();

        setStats({
          todayFoodEntries: localStats.todayEntries,
          weekFoodEntries: localStats.weekEntries,
          monthFoodEntries: localStats.monthEntries,
          lastSyncTime: '使用本地資料',
          pendingVerifications: 0
        });

        setRecentEntries(localRecent);
        console.log(`✅ Dashboard: 本地載入完成 - 今日${localStats.todayEntries}筆，本週${localStats.weekEntries}筆`);
      }
    } catch (error) {
      console.error('❌ Dashboard: 載入資料失敗:', error);
      // Ultimate fallback to empty data
      setStats({
        todayFoodEntries: 0,
        weekFoodEntries: 0,
        monthFoodEntries: 0,
        lastSyncTime: '資料載入失敗',
        pendingVerifications: 0
      });
      setRecentEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 移除 isReady 檢查，改為檢查載入狀態

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNavigation />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            歡迎使用 Diet Daily{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-gray-600">
            {isAuthenticated
              ? '追蹤您的飲食狀況、醫療記錄與健康進度'
              : '智能飲食追蹤與健康管理系統'
            }
          </p>
          {!isAuthenticated && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800 text-sm">
                💡 登入 Google 帳號後即可同步飲食記錄到您的個人 Google Sheets
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-600">今日食物記錄</CardTitle>
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {isAuthenticated ? stats.todayFoodEntries : '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isAuthenticated ? '今天已記錄' : '需要登入'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-600">本週記錄</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {isAuthenticated ? stats.weekFoodEntries : '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isAuthenticated ? '過去7天' : '需要登入'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-600">本月記錄</CardTitle>
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                {isAuthenticated ? stats.monthFoodEntries : '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isAuthenticated ? '當月累計' : '需要登入'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-600">待驗證食物</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                {isAuthenticated ? stats.pendingVerifications : '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isAuthenticated ? '等待管理員審核' : '需要登入'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 暫時隱藏同步狀態組件，避免觸發背景同步 */}
        {/* {isAuthenticated && (
          <div className="mb-8">
            <SyncStatus showDetails={true} />
          </div>
        )} */}

        {!isAuthenticated && (
          <div className="mb-8">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Database className="h-5 w-5" />
                  Google Sheets 同步功能
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-700 mb-4">
                  登入 Google 帳號即可享受完整功能：
                </p>
                <ul className="list-disc list-inside text-sm text-blue-700 space-y-1 mb-4">
                  <li>飲食記錄自動同步到個人 Google Sheets</li>
                  <li>智能去重，避免重複資料</li>
                  <li>離線記錄，連線後自動同步</li>
                  <li>即時同步狀態監控</li>
                </ul>
                <Link href="/google-sync">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Database className="h-4 w-4 mr-2" />
                    連接 Google 帳號
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/food-diary">
            <Card className="hover:shadow-md transition-all cursor-pointer group hover:scale-105">
              <CardHeader className="text-center pb-3">
                <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <CardTitle className="text-lg">食物日記</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-center text-sm">
                  記錄每日飲食與健康狀況
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/database">
            <Card className="hover:shadow-md transition-all cursor-pointer group hover:scale-105">
              <CardHeader className="text-center pb-3">
                <Database className="h-8 w-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <CardTitle className="text-lg">食物資料庫</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-center text-sm">
                  瀏覽與管理食物評分資料
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/reports">
            <Card className="hover:shadow-md transition-all cursor-pointer group hover:scale-105">
              <CardHeader className="text-center pb-3">
                <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <CardTitle className="text-lg">醫療報告</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-center text-sm">
                  生成健康分析與醫療報告
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/food-verification">
            <Card className="hover:shadow-md transition-all cursor-pointer group hover:scale-105">
              <CardHeader className="text-center pb-3">
                <Activity className="h-8 w-8 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <CardTitle className="text-lg">管理員驗證</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-center text-sm">
                  審核用戶自訂食物資料
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              最近活動
            </CardTitle>
            <CardDescription>
              您的最新飲食記錄和健康資料
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">載入最近記錄...</span>
              </div>
            ) : recentEntries.length > 0 ? (
              <div className="space-y-4">
                {recentEntries.map((entry, index) => (
                  <div key={entry.id || index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{entry.foodName}</p>
                      <p className="text-xs text-gray-500">
                        {entry.date} {entry.time} • {entry.category}
                        {entry.medicalScore && ` • 評分: ${entry.medicalScore}`}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-gray-400 mt-1">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Database className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      資料來源: 統一Google工作表
                    </p>
                    <p className="text-xs text-gray-500">
                      最後同步: {stats.lastSyncTime}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">尚無飲食記錄</p>
                <p className="text-xs mt-1">開始記錄您的第一餐吧！</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t">
              <Link href="/food-diary">
                <Button className="w-full">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  新增食物記錄
                </Button>
              </Link>
            </div>

            <div className="hidden">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">健康趨勢良好</p>
                  <p className="text-xs text-gray-500">本週平均評分 7.2/10 - 昨天</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">2 項食物等待驗證</p>
                  <p className="text-xs text-gray-500">自訂食物已提交審核 - 3天前</p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Button asChild>
                <Link href="/food-diary">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  開始記錄今日飲食
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}