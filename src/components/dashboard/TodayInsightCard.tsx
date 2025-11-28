'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, AlertCircle, CheckCircle, TrendingUp, Utensils, Heart, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { getBowelMovementAdvice, isBowelMovementAbnormal } from '@/lib/bowel-movement-stats';

interface TodayInsightCardProps {
  todayFoodCount: number;
  todaySymptomRecorded: boolean;
  todayBowelCount?: number | null;
  yesterdayBowelCount?: number | null;
  recentRiskFoods?: string[];
  className?: string;
}

export function TodayInsightCard({ 
  todayFoodCount, 
  todaySymptomRecorded,
  todayBowelCount,
  yesterdayBowelCount,
  recentRiskFoods = [],
  className = ''
}: TodayInsightCardProps) {
  
  // 生成今日洞察
  const getInsights = () => {
    const insights: Array<{ type: 'success' | 'warning' | 'info'; message: string; icon: React.ReactNode }> = [];

    // 大便次數洞察（優先顯示，因為對IBD患者最重要）
    if (todayBowelCount !== null && todayBowelCount !== undefined) {
      const advice = getBowelMovementAdvice(todayBowelCount, yesterdayBowelCount);
      const isAbnormal = isBowelMovementAbnormal(todayBowelCount);
      
      // 計算變化趨勢
      let trendIcon = <Minus className="h-5 w-5" />;
      if (yesterdayBowelCount !== null && yesterdayBowelCount !== undefined) {
        if (todayBowelCount > yesterdayBowelCount) {
          trendIcon = <ArrowUp className="h-5 w-5" />;
        } else if (todayBowelCount < yesterdayBowelCount) {
          trendIcon = <ArrowDown className="h-5 w-5" />;
        }
      }

      insights.push({
        type: isAbnormal ? 'warning' : 'success',
        message: advice,
        icon: trendIcon
      });
    } else if (todaySymptomRecorded) {
      // 已記錄症狀但沒記錄大便次數
      insights.push({
        type: 'info',
        message: '您今天已記錄症狀，但尚未記錄大便次數。建議補充記錄以便更好追蹤腸道健康。',
        icon: <AlertCircle className="h-5 w-5" />
      });
    }

    // 飲食記錄狀態
    if (todayFoodCount === 0) {
      insights.push({
        type: 'info',
        message: '今天還沒有記錄任何飲食，開始記錄您的第一餐吧！',
        icon: <Utensils className="h-5 w-5" />
      });
    } else if (todayFoodCount >= 3) {
      insights.push({
        type: 'success',
        message: `很好！您今天已記錄 ${todayFoodCount} 次飲食，保持良好的記錄習慣。`,
        icon: <CheckCircle className="h-5 w-5" />
      });
    } else {
      insights.push({
        type: 'info',
        message: `您今天已記錄 ${todayFoodCount} 次飲食，繼續保持記錄。`,
        icon: <TrendingUp className="h-5 w-5" />
      });
    }

    // 症狀記錄提醒
    if (!todaySymptomRecorded) {
      insights.push({
        type: 'warning',
        message: '別忘了記錄今天的症狀，這有助於追蹤健康狀況。',
        icon: <Heart className="h-5 w-5" />
      });
    } else {
      insights.push({
        type: 'success',
        message: '您已完成今日症狀記錄，做得很好！',
        icon: <CheckCircle className="h-5 w-5" />
      });
    }

    // 風險食物提醒
    if (recentRiskFoods.length > 0) {
      insights.push({
        type: 'warning',
        message: `近期有 ${recentRiskFoods.length} 種高風險食物，建議查看詳細記錄。`,
        icon: <AlertCircle className="h-5 w-5" />
      });
    }

    return insights;
  };

  const insights = getInsights();

  const getInsightColor = (type: 'success' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return 'text-green-700 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500';
      case 'warning':
        return 'text-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500';
      case 'info':
        return 'text-blue-700 bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500';
    }
  };

  const getInsightIconBg = (type: 'success' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'warning':
        return 'bg-amber-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <Card className={`${className} border-0 shadow-2xl bg-gradient-to-br from-yellow-50 to-orange-50 overflow-hidden`}>
      {/* 裝飾性背景 */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-200 rounded-full opacity-10 -translate-y-12 translate-x-12" />
      
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-3 text-2xl">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Lightbulb className="h-7 w-7 text-white" />
          </div>
          <span className="font-bold text-gray-900">今日洞察</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`flex items-start gap-4 p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 ${getInsightColor(insight.type)}`}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${getInsightIconBg(insight.type)}`}>
                {insight.icon}
              </div>
              <p className="text-base flex-1 leading-relaxed font-medium">{insight.message}</p>
            </div>
          ))}

          {/* 快速行動按鈕 - 美化版 */}
          <div className="flex gap-3 mt-6 pt-6 border-t-2 border-dashed border-gray-300">
            {todayFoodCount === 0 && (
              <Link href="/food-diary" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg" size="lg">
                  <Utensils className="mr-2 h-5 w-5" />
                  記錄飲食
                </Button>
              </Link>
            )}
            {!todaySymptomRecorded && (
              <Link href="/symptoms" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-lg" size="lg">
                  <Heart className="mr-2 h-5 w-5" />
                  記錄症狀
                </Button>
              </Link>
            )}
            {todayFoodCount > 0 && todaySymptomRecorded && (
              <Link href="/history" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg" size="lg">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  查看完整記錄
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

