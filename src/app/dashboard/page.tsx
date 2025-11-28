'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Calendar, FileText, PlusCircle, TrendingUp, Clock, ChevronRight, Heart, Utensils } from 'lucide-react';
import MainNavigation from '@/components/navigation/MainNavigation';
import { TodayInsightCard } from '@/components/dashboard/TodayInsightCard';
import { BowelMovementTrendChart } from '@/components/dashboard/BowelMovementTrendChart';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { getBowelMovementColor, getBowelMovementDotColor } from '@/lib/bowel-movement-stats';
import type { DailySymptomEntry } from '@/types/medical';
import type { FoodHistoryEntry } from '@/types/history';

interface DashboardStats {
  todayFoodEntries: number;
  todaySymptomEntry: boolean;
  todayBowelCount: number | null;
  yesterdayBowelCount: number | null;
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
    todayBowelCount: null,
    yesterdayBowelCount: null,
    weekTotalEntries: 0,
    monthTotalEntries: 0,
    weekFoodEntries: 0,
    weekSymptomEntries: 0
  });

  const [recentActivities, setRecentActivities] = useState<CombinedEntry[]>([]);
  const [symptomEntries, setSymptomEntries] = useState<DailySymptomEntry[]>([]);
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
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
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
            console.log('📅 Sample consumedAt:', foodEntries[0]?.consumedAt);
            console.log('📅 Today string:', todayStr);
          }
        }

        if (symptomsResponse.ok) {
          const { data } = await symptomsResponse.json();
          // data 可能是單個 entry 或 entries 陣列
          symptomEntries = Array.isArray(data) ? data : (data ? [data] : []);
          console.log('📊 Dashboard - Symptom entries loaded:', symptomEntries.length);
          setSymptomEntries(symptomEntries);
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

        const todaySymptomEntry = symptomEntries.find(e =>
          e.recorded_date === todayStr
        );
        const todayHasSymptom = !!todaySymptomEntry;
        const todayBowelCount = todaySymptomEntry?.bowel_movement_count ?? null;

        const yesterdaySymptomEntry = symptomEntries.find(e =>
          e.recorded_date === yesterdayStr
        );
        const yesterdayBowelCount = yesterdaySymptomEntry?.bowel_movement_count ?? null;

        const weekFoodCount = foodEntries.filter(e =>
          new Date(e.consumedAt) >= weekAgo
        ).length;

        const weekSymptomCount = symptomEntries.filter(e =>
          new Date(e.recorded_date) >= weekAgo
        ).length;

        setStats({
          todayFoodEntries: todayFoodCount,
          todaySymptomEntry: todayHasSymptom,
          todayBowelCount,
          yesterdayBowelCount,
          weekTotalEntries: weekFoodCount + weekSymptomCount,
          monthTotalEntries: foodEntries.length + symptomEntries.length,
          weekFoodEntries: weekFoodCount,
          weekSymptomEntries: weekSymptomCount
        });

        // 合併最近活動 - 只取前5筆
        const combined: CombinedEntry[] = [
          ...foodEntries.slice(0, 10).map(entry => ({
            id: entry.id,
            type: 'food' as const,
            date: entry.consumedAt?.split('T')[0] || '',
            time: entry.consumedAt ? new Date(entry.consumedAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '',
            timestamp: entry.consumedAt ? new Date(entry.consumedAt) : new Date(),
            data: entry
          })),
          ...symptomEntries.slice(0, 10).map(entry => ({
            id: entry.id,
            type: 'symptom' as const,
            date: entry.recorded_date,
            time: new Date(entry.recorded_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(entry.recorded_at),
            data: entry
          }))
        ];

        // 按時間排序，只保留5筆
        combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setRecentActivities(combined.slice(0, 5));

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

  // 醫療評分顏色 - 簡化為圓點標記 (1-4分制)
  const getMedicalScoreColorDot = (score: number) => {
    if (score >= 4) return 'bg-green-500';
    if (score === 3) return 'bg-yellow-500';
    if (score === 2) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getHealthColorDot = (score: number) => {
    if (score >= 4) return 'bg-green-500';
    if (score === 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-rose-50">
      <MainNavigation />

      <div className="container mx-auto p-8" data-testid="dashboard">
        {/* 頂部標題區域 */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-rose-600 bg-clip-text text-transparent mb-4">
            儀表板
          </h1>
          <p className="text-xl text-gray-600">掌握今日健康狀態</p>
        </div>

        {/* 今日統計卡片 - 美化版 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Link href="/food-diary" className="group">
            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02] cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100">
              {/* 裝飾性背景圖案 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full opacity-20 -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-300 rounded-full opacity-20 translate-y-8 -translate-x-8" />
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-2xl font-bold text-blue-900">今日飲食</CardTitle>
                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                  <Utensils className="h-8 w-8 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-baseline gap-2 mb-4">
                  <div className="text-6xl font-extrabold text-blue-600">{stats.todayFoodEntries}</div>
                  <div className="text-2xl font-medium text-blue-400">次</div>
                </div>
                <p className="text-lg text-blue-700 mb-6 font-medium">
                  {stats.todayFoodEntries === 0 ? '開始記錄第一餐' : '飲食記錄'}
                </p>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg" size="lg">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  記錄飲食
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/symptoms" className="group">
            <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02] cursor-pointer bg-gradient-to-br from-rose-50 to-rose-100">
              {/* 裝飾性背景圖案 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200 rounded-full opacity-20 -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-rose-300 rounded-full opacity-20 translate-y-8 -translate-x-8" />
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-2xl font-bold text-rose-900">今日症狀</CardTitle>
                <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                  <Heart className="h-8 w-8 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="flex items-baseline gap-2 mb-4">
                  {stats.todaySymptomEntry ? (
                    <div className="text-6xl font-extrabold text-green-600">✓</div>
                  ) : (
                    <div className="text-6xl font-extrabold text-gray-400">－</div>
                  )}
                </div>
                <p className="text-lg text-rose-700 mb-3 font-medium">
                  {stats.todaySymptomEntry ? '已記錄症狀' : '尚未記錄'}
                </p>
                
                {/* 大便次數顯示 - 美化版 */}
                {stats.todayBowelCount !== null && stats.todayBowelCount !== undefined ? (
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-base font-semibold mb-4 shadow-sm ${getBowelMovementColor(stats.todayBowelCount)}`}>
                    <span className="text-xl">💩</span>
                    <span>{stats.todayBowelCount} 次</span>
                    <div className={`w-3 h-3 rounded-full ${getBowelMovementDotColor(stats.todayBowelCount)} animate-pulse`} />
                  </div>
                ) : stats.todaySymptomEntry ? (
                  <p className="text-sm text-rose-400 mb-4 italic">未記錄大便次數</p>
                ) : (
                  <div className="mb-4"></div>
                )}

                <Button 
                  className={`w-full shadow-lg ${stats.todaySymptomEntry ? 'border-2 border-rose-500' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}
                  size="lg" 
                  variant={stats.todaySymptomEntry ? "outline" : "default"}
                >
                  <Heart className="mr-2 h-5 w-5" />
                  {stats.todaySymptomEntry ? '查看症狀' : '記錄症狀'}
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 今日洞察卡片 */}
        <div className="mb-12">
          <TodayInsightCard
            todayFoodCount={stats.todayFoodEntries}
            todaySymptomRecorded={stats.todaySymptomEntry}
            todayBowelCount={stats.todayBowelCount}
            yesterdayBowelCount={stats.yesterdayBowelCount}
            recentRiskFoods={[]}
          />
        </div>

        {/* 大便次數趨勢圖 */}
        <div className="mb-12">
          <BowelMovementTrendChart symptomEntries={symptomEntries} daysToShow={7} />
        </div>

        {/* 最近記錄 - 美化版 */}
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-gray-50 to-slate-50 overflow-hidden">
          {/* 裝飾性背景 */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-purple-200 rounded-full opacity-5 -translate-y-12 -translate-x-12" />
          
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock className="h-7 w-7 text-white" />
              </div>
              <span className="font-bold text-gray-900">最近記錄</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            {isLoading && recentActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-purple-300 animate-spin" />
                <p className="text-lg font-medium">載入中...</p>
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-xl mb-6 font-semibold text-gray-700">還沒有記錄</p>
                <div className="flex gap-3 justify-center">
                  <Link href="/food-diary">
                    <Button size="lg" variant="outline">
                      <Utensils className="mr-2 h-5 w-5" />
                      記錄飲食
                    </Button>
                  </Link>
                  <Link href="/symptoms">
                    <Button size="lg" variant="outline">
                      <Heart className="mr-2 h-5 w-5" />
                      記錄症狀
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200 group"
                  >
                    {/* 類型圖標 - 美化版 */}
                    <div className="flex-shrink-0">
                      {activity.type === 'food' ? (
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Utensils className="h-7 w-7 text-white" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Heart className="h-7 w-7 text-white" />
                        </div>
                      )}
                    </div>

                    {/* 內容 */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-lg truncate">
                        {activity.type === 'food' 
                          ? (activity.data as FoodHistoryEntry).foodData.name_zh
                          : (() => {
                              const symptom = activity.data as DailySymptomEntry;
                              const symptoms: string[] = [];
                              
                              // 大便次數
                              if (symptom.bowel_movement_count !== undefined && symptom.bowel_movement_count !== null) {
                                symptoms.push(`💩 ${symptom.bowel_movement_count}次`);
                              }
                              
                              // 主要症狀
                              if (symptom.abdominal_pain && symptom.abdominal_pain > 2) {
                                symptoms.push('腹痛');
                              }
                              if (symptom.diarrhea && symptom.diarrhea > 2) {
                                symptoms.push('腹瀉');
                              }
                              if (symptom.bloody_stool && symptom.bloody_stool > 2) {
                                symptoms.push('血便');
                              }
                              if (symptom.bloating && symptom.bloating > 2) {
                                symptoms.push('脹氣');
                              }
                              
                              // 額外症狀
                              if (symptom.additional_symptoms && symptom.additional_symptoms.length > 0) {
                                const additionalCount = symptom.additional_symptoms.length;
                                if (additionalCount > 0 && symptoms.length < 3) {
                                  symptoms.push(`+${additionalCount}症狀`);
                                }
                              }
                              
                              // 如果沒有明顯症狀，顯示健康狀態
                              if (symptoms.length === 0) {
                                const healthEmojis = ['', '😞', '😐', '🙂', '😊', '😍'];
                                const healthLabels = ['', '很差', '差', '普通', '良好', '優秀'];
                                const health = symptom.overall_health || 3;
                                return `${healthEmojis[health]} 健康 ${healthLabels[health]}`;
                              }
                              
                              return symptoms.join(' · ');
                            })()
                        }
                      </div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {formatTime(activity.date, activity.time)}
                      </div>
                    </div>

                    {/* 健康評分標記 - 美化版 */}
                    <div className="flex-shrink-0">
                      <div 
                        className={`w-5 h-5 rounded-full shadow-sm animate-pulse ${
                          activity.type === 'food'
                            ? getMedicalScoreColorDot((activity.data as FoodHistoryEntry).medicalScore.score)
                            : getHealthColorDot((activity.data as DailySymptomEntry).overall_health || 3)
                        }`}
                        title={
                          activity.type === 'food'
                            ? `醫療評分: ${(activity.data as FoodHistoryEntry).medicalScore.level} (${(activity.data as FoodHistoryEntry).medicalScore.emoji})`
                            : `健康狀態: ${(activity.data as DailySymptomEntry).overall_health || 3}/5`
                        }
                      />
                    </div>
                  </div>
                ))}

                {/* 查看完整歷史 - 美化版 */}
                <div className="pt-6 border-t-2 border-dashed border-gray-300">
                  <Link href="/history">
                    <Button variant="ghost" className="w-full text-base hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:text-purple-700 font-semibold" size="lg">
                      <FileText className="mr-2 h-5 w-5" />
                      查看完整歷史記錄
                      <ChevronRight className="ml-2 h-5 w-5" />
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
