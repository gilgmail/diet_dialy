'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getBowelMovementDotColor, isBowelMovementAbnormal } from '@/lib/bowel-movement-stats';
import type { DailySymptomEntry } from '@/types/medical';

interface BowelMovementTrendChartProps {
  symptomEntries: DailySymptomEntry[];
  daysToShow?: number;
  className?: string;
}

interface DayData {
  date: string;
  dayLabel: string;
  count: number | null;
  isAbnormal: boolean;
  hasEntry: boolean;
}

export function BowelMovementTrendChart({
  symptomEntries,
  daysToShow = 7,
  className = ''
}: BowelMovementTrendChartProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // 準備最近 N 天的數據
  const chartData = useMemo(() => {
    const data: DayData[] = [];
    const today = new Date();

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      // 找到該日期的症狀記錄
      const entry = symptomEntries.find(e => e.recorded_date === dateStr);
      const count = entry?.bowel_movement_count ?? null;
      
      // 日期標籤
      let dayLabel: string;
      if (i === 0) {
        dayLabel = '今天';
      } else if (i === 1) {
        dayLabel = '昨天';
      } else {
        dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;
      }

      data.push({
        date: dateStr,
        dayLabel,
        count,
        isAbnormal: isBowelMovementAbnormal(count),
        hasEntry: !!entry
      });
    }

    return data;
  }, [symptomEntries, daysToShow]);

  // 計算週平均值
  const weeklyAverage = useMemo(() => {
    const countsWithData = chartData
      .filter(d => d.count !== null)
      .map(d => d.count as number);
    
    if (countsWithData.length === 0) return 0;
    const sum = countsWithData.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / countsWithData.length) * 10) / 10;
  }, [chartData]);

  // 找出最大值用於縮放
  const maxCount = useMemo(() => {
    const counts = chartData
      .filter(d => d.count !== null)
      .map(d => d.count as number);
    return counts.length > 0 ? Math.max(...counts, 10) : 10;
  }, [chartData]);

  // 計算長條高度百分比
  const getBarHeight = (count: number | null): number => {
    if (count === null || count === 0) return 0;
    return (count / maxCount) * 100;
  };

  return (
    <Card className={className}>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="flex items-center justify-between text-xl">
          <span className="flex items-center gap-2">
            📊 大便次數趨勢 ({daysToShow} 天)
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {/* 週平均顯示 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">週平均</span>
              <span className="text-2xl font-bold text-blue-700">{weeklyAverage} 次/天</span>
            </div>
          </div>

          {/* 長條圖 */}
          <div className="mb-6">
            <div className="flex items-end justify-between gap-2 h-48">
              {chartData.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  {/* 長條 */}
                  <div className="w-full flex flex-col justify-end items-center h-40">
                    {day.count !== null ? (
                      <Link 
                        href={`/symptoms?date=${day.date}`}
                        className="w-full flex flex-col items-center group"
                      >
                        <div
                          className={`w-full rounded-t-lg transition-all group-hover:opacity-80 ${
                            day.isAbnormal
                              ? 'bg-red-500'
                              : day.count >= 4
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ height: `${getBarHeight(day.count)}%` }}
                        />
                        <span className="text-xs font-bold mt-1">{day.count}</span>
                      </Link>
                    ) : (
                      <div className="w-full flex flex-col items-center">
                        <div className="w-full h-2 bg-gray-200 rounded" />
                        <span className="text-xs text-gray-400 mt-1">－</span>
                      </div>
                    )}
                  </div>

                  {/* 日期標籤 */}
                  <div className="text-xs text-center font-medium text-gray-600">
                    {day.dayLabel}
                  </div>

                  {/* 異常指示器 */}
                  {day.isAbnormal && (
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 圖例 */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span className="text-gray-600">正常 (0-3)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded" />
              <span className="text-gray-600">注意 (4-5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded" />
              <span className="text-gray-600">警示 (6+)</span>
            </div>
          </div>

          {/* 說明文字 */}
          <p className="text-sm text-gray-500 text-center mt-4">
            點擊長條可查看當日詳細症狀記錄
          </p>
        </CardContent>
      )}
    </Card>
  );
}

