import type { DailySymptomEntry } from '@/types/medical';

/**
 * 大便次數統計工具函數
 * 用於計算和分析大便次數數據
 */

// 顏色等級定義
export type BowelMovementLevel = 'normal' | 'attention' | 'warning';

/**
 * 判斷大便次數是否異常
 */
export function isBowelMovementAbnormal(count: number | null | undefined): boolean {
  if (count === null || count === undefined) return false;
  return count >= 6;
}

/**
 * 取得大便次數的等級
 */
export function getBowelMovementLevel(count: number | null | undefined): BowelMovementLevel {
  if (count === null || count === undefined) return 'normal';
  if (count >= 6) return 'warning';
  if (count >= 4) return 'attention';
  return 'normal';
}

/**
 * 取得大便次數的顏色類別 (Tailwind CSS)
 */
export function getBowelMovementColor(count: number | null | undefined): string {
  const level = getBowelMovementLevel(count);
  switch (level) {
    case 'warning':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'attention':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'normal':
    default:
      return 'bg-green-100 text-green-700 border-green-200';
  }
}

/**
 * 取得大便次數的圓點顏色
 */
export function getBowelMovementDotColor(count: number | null | undefined): string {
  const level = getBowelMovementLevel(count);
  switch (level) {
    case 'warning':
      return 'bg-red-500';
    case 'attention':
      return 'bg-yellow-500';
    case 'normal':
    default:
      return 'bg-green-500';
  }
}

/**
 * 取得大便次數的建議文字
 */
export function getBowelMovementAdvice(
  count: number | null | undefined,
  previousCount?: number | null
): string {
  if (count === null || count === undefined) {
    return '建議記錄今日大便次數，以便追蹤腸道健康。';
  }

  const level = getBowelMovementLevel(count);
  
  // 如果有昨日數據，提供對比建議
  if (previousCount !== null && previousCount !== undefined) {
    const diff = count - previousCount;
    if (diff > 0) {
      if (level === 'warning') {
        return `今日大便次數比昨日增加 ${diff} 次，達到 ${count} 次。請注意是否有腹瀉症狀，必要時諮詢醫師。`;
      } else if (diff >= 2) {
        return `今日大便次數比昨日增加 ${diff} 次。請注意飲食和水分攝取。`;
      } else {
        return `今日大便次數比昨日增加 ${diff} 次，持續觀察。`;
      }
    } else if (diff < 0) {
      return `今日大便次數比昨日減少 ${Math.abs(diff)} 次，情況有所改善。`;
    } else {
      return `今日大便次數與昨日相同，維持在 ${count} 次。`;
    }
  }

  // 沒有昨日數據時的建議
  switch (level) {
    case 'warning':
      return `今日大便次數達到 ${count} 次，屬於異常頻繁。建議多補充水分，必要時諮詢醫師。`;
    case 'attention':
      return `今日大便次數為 ${count} 次，略高於正常範圍。請注意飲食調整。`;
    case 'normal':
    default:
      return `今日大便次數為 ${count} 次，屬於正常範圍。`;
  }
}

/**
 * 取得大便形態說明 (Bristol Stool Scale 1-5)
 */
export function getStoolTypeDescription(type: number | null | undefined): string {
  if (type === null || type === undefined) return '未記錄';
  
  switch (type) {
    case 1:
      return '非常硬 (便秘)';
    case 2:
      return '偏硬';
    case 3:
      return '正常';
    case 4:
      return '偏軟';
    case 5:
      return '水狀 (腹瀉)';
    default:
      return '未知';
  }
}

/**
 * 取得大便形態圖示
 */
export function getStoolTypeIcon(type: number | null | undefined): string {
  if (type === null || type === undefined) return '❓';
  
  switch (type) {
    case 1:
      return '🔴'; // 硬塊
    case 2:
      return '🟠'; // 偏硬
    case 3:
      return '🟢'; // 正常
    case 4:
      return '🟡'; // 偏軟
    case 5:
      return '💧'; // 水狀
    default:
      return '❓';
  }
}

/**
 * 計算期間統計
 */
export interface BowelMovementStats {
  totalCount: number;          // 總次數
  totalDays: number;            // 總天數
  recordedDays: number;         // 有記錄的天數
  averagePerDay: number;        // 平均每日次數
  abnormalDays: number;         // 異常天數 (≥6次)
  maxCount: number;             // 最高次數
  minCount: number;             // 最低次數 (排除0)
  mostCommonType: number | null; // 最常見的大便形態
}

export function calculateBowelMovementStats(
  entries: DailySymptomEntry[],
  startDate: string,
  endDate: string
): BowelMovementStats {
  // 篩選日期範圍內的記錄
  const filteredEntries = entries.filter(entry => {
    const date = entry.recorded_date;
    return date >= startDate && date <= endDate;
  });

  // 只統計有記錄大便次數的日期
  const entriesWithBowel = filteredEntries.filter(
    entry => entry.bowel_movement_count !== null && entry.bowel_movement_count !== undefined
  );

  const totalDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const recordedDays = entriesWithBowel.length;

  // 計算總次數
  const totalCount = entriesWithBowel.reduce(
    (sum, entry) => sum + (entry.bowel_movement_count || 0),
    0
  );

  // 計算平均
  const averagePerDay = recordedDays > 0 ? totalCount / recordedDays : 0;

  // 計算異常天數
  const abnormalDays = entriesWithBowel.filter(
    entry => isBowelMovementAbnormal(entry.bowel_movement_count)
  ).length;

  // 計算最高和最低次數
  const counts = entriesWithBowel
    .map(entry => entry.bowel_movement_count || 0)
    .filter(count => count > 0);
  
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  const minCount = counts.length > 0 ? Math.min(...counts) : 0;

  // 統計最常見的大便形態
  const typeFrequency: Record<number, number> = {};
  entriesWithBowel.forEach(entry => {
    if (entry.stool_type !== null && entry.stool_type !== undefined) {
      typeFrequency[entry.stool_type] = (typeFrequency[entry.stool_type] || 0) + 1;
    }
  });

  let mostCommonType: number | null = null;
  let maxFrequency = 0;
  Object.entries(typeFrequency).forEach(([type, freq]) => {
    if (freq > maxFrequency) {
      maxFrequency = freq;
      mostCommonType = parseInt(type);
    }
  });

  return {
    totalCount,
    totalDays,
    recordedDays,
    averagePerDay: Math.round(averagePerDay * 10) / 10,
    abnormalDays,
    maxCount,
    minCount,
    mostCommonType
  };
}

/**
 * 計算週/月摘要
 */
export interface PeriodSummary {
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
  foodEntries: number;
  symptomDays: number;
  bowelStats: BowelMovementStats;
}

export function calculatePeriodSummary(
  foodEntries: any[],
  symptomEntries: DailySymptomEntry[],
  period: 'week' | 'month'
): PeriodSummary {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  
  const daysBack = period === 'week' ? 7 : 30;
  const startDateObj = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const startDate = startDateObj.toISOString().split('T')[0];

  // 計算飲食記錄數
  const foodCount = foodEntries.filter(entry => {
    const date = entry.consumedAt ? entry.consumedAt.split('T')[0] : entry.consumed_at?.split('T')[0];
    return date && date >= startDate && date <= endDate;
  }).length;

  // 計算症狀記錄天數
  const symptomDays = new Set(
    symptomEntries
      .filter(entry => entry.recorded_date >= startDate && entry.recorded_date <= endDate)
      .map(entry => entry.recorded_date)
  ).size;

  // 計算大便統計
  const bowelStats = calculateBowelMovementStats(symptomEntries, startDate, endDate);

  return {
    period,
    startDate,
    endDate,
    foodEntries: foodCount,
    symptomDays,
    bowelStats
  };
}

/**
 * 比較今日與昨日
 */
export interface TodayVsYesterdayComparison {
  today: {
    count: number | null;
    type: number | null;
    date: string;
  };
  yesterday: {
    count: number | null;
    type: number | null;
    date: string;
  };
  difference: number | null;
  trend: 'up' | 'down' | 'same' | 'unknown';
  advice: string;
}

export function compareTodayWithYesterday(
  todayEntry: DailySymptomEntry | null,
  yesterdayEntry: DailySymptomEntry | null
): TodayVsYesterdayComparison {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const todayCount = todayEntry?.bowel_movement_count ?? null;
  const yesterdayCount = yesterdayEntry?.bowel_movement_count ?? null;

  let difference: number | null = null;
  let trend: 'up' | 'down' | 'same' | 'unknown' = 'unknown';

  if (todayCount !== null && yesterdayCount !== null) {
    difference = todayCount - yesterdayCount;
    if (difference > 0) trend = 'up';
    else if (difference < 0) trend = 'down';
    else trend = 'same';
  }

  const advice = getBowelMovementAdvice(todayCount, yesterdayCount);

  return {
    today: {
      count: todayCount,
      type: todayEntry?.stool_type ?? null,
      date: today.toISOString().split('T')[0]
    },
    yesterday: {
      count: yesterdayCount,
      type: yesterdayEntry?.stool_type ?? null,
      date: yesterday.toISOString().split('T')[0]
    },
    difference,
    trend,
    advice
  };
}

