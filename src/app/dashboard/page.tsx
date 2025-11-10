'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Calendar, FileText, PlusCircle, TrendingUp, Clock, ChevronRight, Heart, Utensils } from 'lucide-react';
import MainNavigation from '@/components/navigation/MainNavigation';
import { AIUsageCard } from '@/components/dashboard/AIUsageCard';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { DailySymptomEntry } from '@/types/medical';
import type { FoodHistoryEntry } from '@/types/history';

interface DashboardStats {
  todayFoodEntries: number;
  todaySymptomEntry: boolean;
  weekTotalEntries: number;
  monthTotalEntries: number;
  weekFoodEntries: number;
  weekSymptomEntries: number;
}

type CombinedEntry = {
  id: string;
  type: 'food' | 'symptom';
  date: string;
  time: string;
  timestamp: Date;
  data: FoodHistoryEntry | DailySymptomEntry;
};

export default function DashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useSupabaseAuth();

  const [stats, setStats] = useState<DashboardStats>({
    todayFoodEntries: 0,
    todaySymptomEntry: false,
    weekTotalEntries: 0,
    monthTotalEntries: 0,
    weekFoodEntries: 0,
    weekSymptomEntries: 0
  });

  const [recentActivities, setRecentActivities] = useState<CombinedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 載入儀表板資料
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!isAuthenticated || !user) {
        return;
      }

      setIsLoading(true);
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        // 並行獲取食物和症狀記錄
        const [foodResponse, symptomsResponse] = await Promise.all([
          fetch(`/api/history?dateFrom=${monthAgo.toISOString().split('T')[0]}&dateTo=${todayStr}&limit=100`),
          fetch(`/api/medical/daily-symptoms?userId=${user.id}&startDate=${monthAgo.toISOString().split('T')[0]}&endDate=${todayStr}`)
        ]);

        let foodEntries: FoodHistoryEntry[] = [];
        let symptomEntries: DailySymptomEntry[] = [];

        if (foodResponse.ok) {
          const { entries } = await foodResponse.json();
          foodEntries = entries || [];
          console.log('📊 Dashboard - Food entries loaded:', foodEntries.length);
          if (foodEntries.length > 0) {
            console.log('📅 Sample consumedAt:', foodEntries[0].consumedAt);
            console.log('📅 Today string:', todayStr);
          }
        }

        if (symptomsResponse.ok) {
          const { data } = await symptomsResponse.json();
          // data 可能是單個 entry 或 entries 陣列
          symptomEntries = Array.isArray(data) ? data : (data ? [data] : []);
          console.log('📊 Dashboard - Symptom entries loaded:', symptomEntries.length);
        }

        // 計算統計 - 修正日期比較邏輯以處理時區
        const todayFoodCount = foodEntries.filter(e => {
          // 將 UTC 時間戳轉換為本地日期字串進行比較
          const consumedDate = new Date(e.consumedAt);
          const localDateStr = consumedDate.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/\//g, '-'); // 轉換格式為 YYYY-MM-DD

          // 或者更簡單的方式：提取日期部分（忽略時間和時區）
          const consumedDateOnly = e.consumedAt.split('T')[0];
          const matches = consumedDateOnly === todayStr;

          if (matches) console.log('✅ Today food found:', e.consumedAt, '→', consumedDateOnly);
          return matches;
        }).length;
        console.log('🍽️ Today food count:', todayFoodCount);

        const todayHasSymptom = symptomEntries.some(e =>
          e.recorded_date === todayStr
        );

        const weekFoodCount = foodEntries.filter(e =>
          new Date(e.consumedAt) >= weekAgo
        ).length;

        const weekSymptomCount = symptomEntries.filter(e =>
          new Date(e.recorded_date) >= weekAgo
        ).length;

        setStats({
          todayFoodEntries: todayFoodCount,
          todaySymptomEntry: todayHasSymptom,
          weekTotalEntries: weekFoodCount + weekSymptomCount,
          monthTotalEntries: foodEntries.length + symptomEntries.length,
          weekFoodEntries: weekFoodCount,
          weekSymptomEntries: weekSymptomCount
        });

        // 合併最近活動
        const combined: CombinedEntry[] = [
          ...foodEntries.slice(0, 20).map(entry => ({
            id: entry.id,
            type: 'food' as const,
            date: entry.consumedAt.split('T')[0],
            time: new Date(entry.consumedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(entry.consumedAt),
            data: entry
          })),
          ...symptomEntries.slice(0, 20).map(entry => ({
            id: entry.id,
            type: 'symptom' as const,
            date: entry.recorded_date,
            time: new Date(entry.recorded_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(entry.recorded_at),
            data: entry
          }))
        ];

        // 按時間排序
        combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setRecentActivities(combined.slice(0, 15));

      } catch (error) {
        console.error('❌ 載入儀表板資料失敗:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [isAuthenticated, user]);

  // 格式化時間
  const formatTime = (dateStr: string, timeStr?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const displayTime = timeStr || '';

    if (dateStr === today) {
      return timeStr ? `今天 ${timeStr}` : '今天';
    }

    const date = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return timeStr ? `昨天 ${timeStr}` : '昨天';
    if (diffDays < 7) return timeStr ? `${diffDays}天前 ${timeStr}` : `${diffDays}天前`;

    return timeStr ? `${date.getMonth() + 1}/${date.getDate()} ${timeStr}` : `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 健康狀態顏色
  const getHealthColor = (score: number) => {
    if (score >= 4) return 'bg-green-100 text-green-700 border-green-200';
    if (score === 3) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  // 醫療評分顏色
  const getMedicalScoreColor = (overall: number) => {
    if (overall >= 8) return 'bg-green-100 text-green-700';
    if (overall >= 6) return 'bg-yellow-100 text-yellow-700';
    if (overall >= 4) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
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
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日飲食</CardTitle>
              <Utensils className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.todayFoodEntries}</div>
              <p className="text-xs text-muted-foreground mt-1">食物記錄</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-rose-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日症狀</CardTitle>
              <Heart className="h-5 w-5 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.todaySymptomEntry ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-gray-400">－</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.todaySymptomEntry ? '已記錄' : '尚未記錄'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本週追蹤</CardTitle>
              <Calendar className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{stats.weekTotalEntries}</div>
              <p className="text-xs text-muted-foreground mt-1">
                飲食 {stats.weekFoodEntries} • 症狀 {stats.weekSymptomEntries}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本月總計</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats.monthTotalEntries}</div>
              <p className="text-xs text-muted-foreground mt-1">
                所有記錄
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI 成本監控 */}
        <div className="mb-8">
          <AIUsageCard enabled={isAuthenticated} />
        </div>

        {/* 快速操作 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用功能快速入口</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/food-diary">
                <Button className="w-full h-20 flex flex-col items-center justify-center gap-2" variant="outline">
                  <Utensils className="h-6 w-6 text-blue-500" />
                  <span className="text-sm font-medium">記錄飲食</span>
                </Button>
              </Link>

              <Link href="/symptoms">
                <Button className="w-full h-20 flex flex-col items-center justify-center gap-2" variant="outline">
                  <Heart className="h-6 w-6 text-rose-500" />
                  <span className="text-sm font-medium">記錄症狀</span>
                </Button>
              </Link>

              <Link href="/history">
                <Button className="w-full h-20 flex flex-col items-center justify-center gap-2" variant="outline">
                  <FileText className="h-6 w-6 text-emerald-500" />
                  <span className="text-sm font-medium">查看歷史</span>
                </Button>
              </Link>

              <Link href="/correlation-analysis">
                <Button className="w-full h-20 flex flex-col items-center justify-center gap-2" variant="outline">
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                  <span className="text-sm font-medium">關聯分析</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 最近活動 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>最近活動</span>
              <span className="text-sm font-normal text-gray-500">
                顯示最近 {recentActivities.length} 筆記錄
              </span>
            </CardTitle>
            <CardDescription>您最近的飲食和症狀記錄</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && recentActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300 animate-spin" />
                載入中...
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="mb-4">還沒有記錄</p>
                <div className="flex gap-2 justify-center">
                  <Link href="/food-diary">
                    <Button size="sm" variant="outline">
                      <Utensils className="mr-2 h-4 w-4" />
                      記錄飲食
                    </Button>
                  </Link>
                  <Link href="/symptoms">
                    <Button size="sm" variant="outline">
                      <Heart className="mr-2 h-4 w-4" />
                      記錄症狀
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {/* 類型圖標 */}
                    <div className="flex-shrink-0 mt-0.5">
                      {activity.type === 'food' ? (
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Utensils className="h-4 w-4 text-blue-600" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                          <Heart className="h-4 w-4 text-rose-600" />
                        </div>
                      )}
                    </div>

                    {/* 內容 */}
                    <div className="flex-1 min-w-0">
                      {activity.type === 'food' ? (
                        <>
                          <div className="font-medium text-gray-900">
                            {(activity.data as FoodHistoryEntry).foodData.name}
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {formatTime(activity.date, activity.time)}
                            {(activity.data as FoodHistoryEntry).notes && (
                              <> • {(activity.data as FoodHistoryEntry).notes}</>
                            )}
                          </div>
                          <div className="mt-1">
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${getMedicalScoreColor((activity.data as FoodHistoryEntry).medicalScore.overall)}`}>
                              醫療評分 {(activity.data as FoodHistoryEntry).medicalScore.overall}/10
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium text-gray-900">症狀記錄</div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {formatTime(activity.date, activity.time)}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${getHealthColor((activity.data as DailySymptomEntry).overall_health)}`}>
                              健康 {(activity.data as DailySymptomEntry).overall_health}/5
                            </span>
                            {(activity.data as DailySymptomEntry).abdominal_pain > 0 && (
                              <span className="text-xs text-gray-600">
                                腹痛 {(activity.data as DailySymptomEntry).abdominal_pain}
                              </span>
                            )}
                            {(activity.data as DailySymptomEntry).diarrhea > 0 && (
                              <span className="text-xs text-gray-600">
                                腹瀉 {(activity.data as DailySymptomEntry).diarrhea}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* 查看完整歷史 */}
                <div className="pt-4 border-t">
                  <Link href="/history">
                    <Button variant="ghost" className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      查看完整歷史記錄
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
