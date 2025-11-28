'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, Utensils, Heart, Activity } from 'lucide-react';
import { calculatePeriodSummary, type PeriodSummary as PeriodSummaryType } from '@/lib/bowel-movement-stats';
import type { DailySymptomEntry } from '@/types/medical';

interface PeriodSummaryProps {
  foodEntries: any[];
  symptomEntries: DailySymptomEntry[];
  className?: string;
}

export function PeriodSummary({ foodEntries, symptomEntries, className = '' }: PeriodSummaryProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

  // 計算週/月摘要
  const summary = useMemo(() => {
    return calculatePeriodSummary(foodEntries, symptomEntries, selectedPeriod);
  }, [foodEntries, symptomEntries, selectedPeriod]);

  const periodLabel = selectedPeriod === 'week' ? '本週' : '本月';
  const daysCount = selectedPeriod === 'week' ? 7 : 30;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">📊 統計摘要</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={selectedPeriod === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('week')}
            >
              本週
            </Button>
            <Button
              variant={selectedPeriod === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod('month')}
            >
              本月
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 飲食記錄總數 */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">飲食記錄</span>
            </div>
            <div className="text-3xl font-bold text-blue-700">{summary.foodEntries}</div>
            <div className="text-xs text-blue-600 mt-1">
              平均 {(summary.foodEntries / daysCount).toFixed(1)} 次/天
            </div>
          </div>

          {/* 症狀記錄天數 */}
          <div className="p-4 bg-rose-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-5 w-5 text-rose-600" />
              <span className="text-sm font-medium text-rose-900">症狀記錄</span>
            </div>
            <div className="text-3xl font-bold text-rose-700">{summary.symptomDays}</div>
            <div className="text-xs text-rose-600 mt-1">
              {summary.symptomDays} / {daysCount} 天
            </div>
          </div>

          {/* 大便次數總計 */}
          <div className="p-4 bg-amber-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-900">大便次數</span>
            </div>
            <div className="text-3xl font-bold text-amber-700">
              {summary.bowelStats.totalCount}
            </div>
            <div className="text-xs text-amber-600 mt-1">
              平均 {summary.bowelStats.averagePerDay} 次/天
            </div>
          </div>

          {/* 異常天數 */}
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">異常天數</span>
            </div>
            <div className="text-3xl font-bold text-red-700">
              {summary.bowelStats.abnormalDays}
            </div>
            <div className="text-xs text-red-600 mt-1">
              次數 ≥6 的天數
            </div>
          </div>
        </div>

        {/* 詳細統計 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">{periodLabel}詳細統計</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">記錄天數：</span>
              <span className="font-semibold text-gray-900 ml-1">
                {summary.bowelStats.recordedDays} 天
              </span>
            </div>
            <div>
              <span className="text-gray-600">最高次數：</span>
              <span className="font-semibold text-gray-900 ml-1">
                {summary.bowelStats.maxCount} 次
              </span>
            </div>
            <div>
              <span className="text-gray-600">最低次數：</span>
              <span className="font-semibold text-gray-900 ml-1">
                {summary.bowelStats.minCount > 0 ? `${summary.bowelStats.minCount} 次` : '無記錄'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">記錄完整度：</span>
              <span className="font-semibold text-gray-900 ml-1">
                {Math.round((summary.bowelStats.recordedDays / daysCount) * 100)}%
              </span>
            </div>
            <div>
              <span className="text-gray-600">常見形態：</span>
              <span className="font-semibold text-gray-900 ml-1">
                {summary.bowelStats.mostCommonType !== null
                  ? `類型 ${summary.bowelStats.mostCommonType}`
                  : '無記錄'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

