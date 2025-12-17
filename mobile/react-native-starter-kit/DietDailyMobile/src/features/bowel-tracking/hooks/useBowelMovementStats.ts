/**
 * Bowel Movement Statistics Hook
 *
 * Fetches and calculates bowel movement statistics with React Query caching.
 *
 * Features:
 * - Automatic caching (5-minute stale time)
 * - Bristol Scale distribution calculation
 * - Pattern analysis (constipation, diarrhea, normal days)
 * - Insight generation (warnings for concerning patterns)
 *
 * Usage:
 * ```tsx
 * const { data: stats, isLoading } = useBowelMovementStats(userId, 30);
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/clients/supabase';
import { queryKeys } from '@/lib/query-client';
import { subDays, format } from 'date-fns';

/**
 * Bristol Scale Data Interface
 */
export interface BristolData {
  type: 1 | 2 | 3 | 4 | 5;
  count: number;
  percentage: number;
}

/**
 * Bowel Movement Insight Interface
 */
export interface BowelMovementInsight {
  id: string;
  type: 'warning' | 'alert' | 'critical' | 'info';
  title: string;
  description: string;
  suggestion: string;
}

/**
 * Daily Frequency Data Interface
 */
export interface DailyFrequency {
  date: string;
  dateLabel: string;
  count: number;
  hasBlood: boolean;
}

/**
 * Bowel Movement Stats Interface
 */
export interface BowelMovementStats {
  // Summary Statistics
  avgFrequency: number;
  totalMovements: number;
  bloodIncidents: number;
  constipationDays: number;
  diarrheaDays: number;
  normalDays: number;
  trend: 'improving' | 'stable' | 'declining';

  // Bristol Scale Distribution
  bristolDistribution: BristolData[];

  // Daily Frequency Data
  dailyFrequency: DailyFrequency[];

  // Blood Events
  bloodEvents: Array<{ date: string; count: number }>;

  // Daily Data for Calendar
  dailyData: Array<{
    date: string;
    bristolType: number | null;
    hasBlood: boolean;
    frequency: number;
  }>;

  // Insights
  insights: BowelMovementInsight[];
}

/**
 * Bowel Movement Entry Interface (from database)
 */
interface BowelMovementEntry {
  id: string;
  user_id: string;
  recorded_date: string;
  occurred_at: string;
  stool_type: number;
  has_blood: boolean;
  difficulty_level?: 'easy' | 'normal' | 'difficult';
  notes?: string;
  created_at: string;
}

/**
 * Calculate Bristol Scale distribution
 */
function calculateBristolDistribution(entries: BowelMovementEntry[]): BristolData[] {
  const totalCount = entries.length;

  // Count by Bristol type
  const counts: Record<number, number> = {};
  for (let i = 1; i <= 5; i++) {
    counts[i] = 0;
  }

  entries.forEach((entry) => {
    const type = entry.stool_type;
    if (type >= 1 && type <= 5) {
      counts[type]++;
    }
  });

  // Convert to BristolData array
  return [1, 2, 3, 4, 5].map((type) => ({
    type: type as 1 | 2 | 3 | 4 | 5,
    count: counts[type],
    percentage: totalCount > 0 ? (counts[type] / totalCount) * 100 : 0,
  }));
}

/**
 * Generate insights based on bowel movement patterns
 */
function generateInsights(
  entries: BowelMovementEntry[],
  days: number,
  constipationDays: number,
  diarrheaDays: number,
  bloodIncidents: number
): BowelMovementInsight[] {
  const insights: BowelMovementInsight[] = [];

  // Constipation warning
  if (constipationDays > days * 0.3) {
    insights.push({
      id: 'constipation-warning',
      type: 'warning',
      title: '便秘天數偏高',
      description: `最近 ${days} 天中有 ${constipationDays} 天出現便秘（Bristol 1-2）`,
      suggestion: '建議增加纖維攝取和飲水量',
    });
  }

  // Diarrhea warning
  if (diarrheaDays > days * 0.2) {
    insights.push({
      id: 'diarrhea-warning',
      type: 'alert',
      title: '腹瀉事件頻繁',
      description: `最近 ${days} 天中有 ${diarrheaDays} 天出現腹瀉（Bristol 5）`,
      suggestion: '建議記錄飲食並諮詢醫師',
    });
  }

  // Blood stool critical alert
  if (bloodIncidents > 0) {
    insights.push({
      id: 'blood-stool-alert',
      type: 'critical',
      title: '發現血便事件',
      description: `最近 ${days} 天中有 ${bloodIncidents} 天出現血便`,
      suggestion: '⚠️ 強烈建議立即就醫檢查',
    });
  }

  // Irregular pattern
  const hasIrregularPattern = entries.some((entry, index) => {
    if (index === 0) return false;
    const prevEntry = entries[index - 1];
    const typeChange = Math.abs(entry.stool_type - prevEntry.stool_type);
    return typeChange >= 3; // Jump from constipation to diarrhea or vice versa
  });

  if (hasIrregularPattern) {
    insights.push({
      id: 'irregular-pattern',
      type: 'warning',
      title: '排便模式不穩定',
      description: '發現便秘和腹瀉交替模式',
      suggestion: '建議諮詢醫師評估腸道健康',
    });
  }

  // Low data quality
  if (entries.length < days * 0.5) {
    insights.push({
      id: 'low-data-quality',
      type: 'info',
      title: '記錄數據不足',
      description: `最近 ${days} 天僅記錄了 ${entries.length} 筆排便記錄`,
      suggestion: '建議每日記錄排便情況以獲得更準確的分析',
    });
  }

  return insights;
}

/**
 * Hook: useBowelMovementStats
 *
 * Fetches and calculates bowel movement statistics for a given time period.
 *
 * @param userId - User ID
 * @param days - Number of days to analyze (default: 30)
 * @returns Query result with bowel movement statistics
 */
export function useBowelMovementStats(userId: string, days: number = 30) {
  return useQuery({
    queryKey: queryKeys.bowelMovements.stats(userId, days),
    queryFn: async (): Promise<BowelMovementStats> => {
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      console.log(`[useBowelMovementStats] Fetching data for ${days} days...`);

      // Fetch bowel movement entries
      const { data: entries, error } = await supabase
        .from('bowel_movement_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_date', format(startDate, 'yyyy-MM-dd'))
        .lte('recorded_date', format(endDate, 'yyyy-MM-dd'))
        .order('occurred_at', { ascending: true });

      if (error) {
        console.error('[useBowelMovementStats] Error:', error);
        throw error;
      }

      const bowelEntries = entries || [];
      console.log(`[useBowelMovementStats] Loaded ${bowelEntries.length} entries`);

      // Calculate statistics
      const totalMovements = bowelEntries.length;
      const avgFrequency = days > 0 ? totalMovements / days : 0;

      // Group by date
      const entriesByDate: Record<string, BowelMovementEntry[]> = {};
      bowelEntries.forEach((entry) => {
        const date = entry.recorded_date;
        if (!entriesByDate[date]) {
          entriesByDate[date] = [];
        }
        entriesByDate[date].push(entry);
      });

      // Count pattern days
      let constipationDays = 0;
      let diarrheaDays = 0;
      let normalDays = 0;
      let bloodIncidents = 0;

      Object.entries(entriesByDate).forEach(([date, dateEntries]) => {
        const avgType = dateEntries.reduce((sum, e) => sum + e.stool_type, 0) / dateEntries.length;
        const hasBlood = dateEntries.some((e) => e.has_blood);

        if (avgType <= 2) {
          constipationDays++;
        } else if (avgType >= 5) {
          diarrheaDays++;
        } else {
          normalDays++;
        }

        if (hasBlood) {
          bloodIncidents++;
        }
      });

      // Calculate Bristol distribution
      const bristolDistribution = calculateBristolDistribution(bowelEntries);

      // Build daily frequency data
      const dailyFrequency: DailyFrequency[] = [];
      for (let i = 0; i < days; i++) {
        const date = format(subDays(endDate, days - 1 - i), 'yyyy-MM-dd');
        const dateLabel = format(subDays(endDate, days - 1 - i), 'MM/dd');
        const dateEntries = entriesByDate[date] || [];

        dailyFrequency.push({
          date,
          dateLabel,
          count: dateEntries.length,
          hasBlood: dateEntries.some((e) => e.has_blood),
        });
      }

      // Build blood events
      const bloodEvents = dailyFrequency
        .filter((day) => day.hasBlood)
        .map((day) => ({
          date: day.date,
          count: day.count,
        }));

      // Build daily data for calendar
      const dailyData = dailyFrequency.map((day) => {
        const dateEntries = entriesByDate[day.date] || [];
        const avgType =
          dateEntries.length > 0
            ? dateEntries.reduce((sum, e) => sum + e.stool_type, 0) / dateEntries.length
            : null;

        return {
          date: day.date,
          bristolType: avgType,
          hasBlood: day.hasBlood,
          frequency: day.count,
        };
      });

      // Calculate trend
      const firstHalfDays = Math.floor(days / 2);
      const firstHalfEntries = dailyFrequency.slice(0, firstHalfDays);
      const secondHalfEntries = dailyFrequency.slice(firstHalfDays);

      const firstHalfAvg =
        firstHalfEntries.reduce((sum, d) => sum + d.count, 0) / firstHalfDays;
      const secondHalfAvg =
        secondHalfEntries.reduce((sum, d) => sum + d.count, 0) / (days - firstHalfDays);

      const trend: 'improving' | 'stable' | 'declining' =
        Math.abs(secondHalfAvg - firstHalfAvg) < 0.3
          ? 'stable'
          : secondHalfAvg > firstHalfAvg
            ? 'improving'
            : 'declining';

      // Generate insights
      const insights = generateInsights(
        bowelEntries,
        days,
        constipationDays,
        diarrheaDays,
        bloodIncidents
      );

      return {
        avgFrequency,
        totalMovements,
        bloodIncidents,
        constipationDays,
        diarrheaDays,
        normalDays,
        trend,
        bristolDistribution,
        dailyFrequency,
        bloodEvents,
        dailyData,
        insights,
      };
    },
    staleTime: 5 * 60 * 1000, // 5分鐘快取
  });
}
