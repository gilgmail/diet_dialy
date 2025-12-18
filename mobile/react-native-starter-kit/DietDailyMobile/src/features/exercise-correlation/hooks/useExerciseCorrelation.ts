/**
 * Exercise-Symptom Correlation Hook
 *
 * 運動與症狀關聯分析 Hook
 *
 * 功能：
 * - 聚合運動數據（從 health_metrics）
 * - 計算運動強度與症狀的關聯性
 * - 分析不同運動類型的影響
 * - 識別最佳運動時機
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/clients/supabase';

interface ExerciseData {
  recorded_date: string;
  metric_type: string;
  numeric_value: number;
  unit: string;
  detail_payload?: {
    workout_type?: string;
    intensity?: 'low' | 'moderate' | 'high';
  };
}

interface SymptomData {
  recorded_date: string;
  abdominal_pain: number;
  diarrhea: number;
  bloating: number;
  bloody_stool: number;
  overall_health: number;
}

interface IntensityAnalysis {
  intensity: 'low' | 'moderate' | 'high';
  avgSymptomScore: number;
  sampleSize: number;
  exerciseMinutes: number;
}

interface ExerciseTypeImpact {
  name: string;
  frequency: number;
  avgSymptomChange: number;
  avgBowelMovementChange: number;
  recommendation: 'beneficial' | 'neutral' | 'caution';
}

interface OptimalTiming {
  period: 'morning' | 'afternoon' | 'evening';
  avgSymptomScore: number;
  sampleSize: number;
  impact: string;
}

interface ExerciseCorrelation {
  overallImpactScore: number; // 0-100
  intensityAnalysis: IntensityAnalysis[];
  exerciseTypes: ExerciseTypeImpact[];
  optimalTiming: OptimalTiming[];
  beneficialTypes: ExerciseTypeImpact[];
  cautionTypes: ExerciseTypeImpact[];
}

/**
 * 計算症狀分數（0-5）
 */
function calculateSymptomScore(symptom: SymptomData): number {
  return (
    (symptom.abdominal_pain +
      symptom.diarrhea +
      symptom.bloating +
      symptom.bloody_stool) /
    4
  );
}

/**
 * 判斷運動強度
 */
function getExerciseIntensity(
  exerciseMinutes: number,
  caloriesBurned: number
): 'low' | 'moderate' | 'high' {
  const caloriesPerMinute = caloriesBurned / exerciseMinutes;

  if (caloriesPerMinute < 5 || exerciseMinutes < 15) return 'low';
  if (caloriesPerMinute < 8 || exerciseMinutes < 30) return 'moderate';
  return 'high';
}

/**
 * 判斷運動時段
 */
function getExercisePeriod(date: string): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date(date).getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * 合併每日數據
 */
function mergeDailyData(
  exerciseData: ExerciseData[],
  symptomData: SymptomData[]
) {
  const dailyMap = new Map<
    string,
    {
      date: string;
      exerciseMinutes: number;
      caloriesBurned: number;
      steps: number;
      workoutType?: string;
      symptomScore: number;
      intensity?: 'low' | 'moderate' | 'high';
      period?: 'morning' | 'afternoon' | 'evening';
    }
  >();

  // 聚合運動數據
  exerciseData.forEach((entry) => {
    const existing = dailyMap.get(entry.recorded_date) || {
      date: entry.recorded_date,
      exerciseMinutes: 0,
      caloriesBurned: 0,
      steps: 0,
      symptomScore: 0,
    };

    if (entry.metric_type === 'workout') {
      existing.exerciseMinutes += entry.numeric_value;
      existing.workoutType = entry.detail_payload?.workout_type;
    } else if (entry.metric_type === 'active_energy') {
      existing.caloriesBurned += entry.numeric_value;
    } else if (entry.metric_type === 'steps') {
      existing.steps += entry.numeric_value;
    }

    dailyMap.set(entry.recorded_date, existing);
  });

  // 添加症狀數據
  symptomData.forEach((symptom) => {
    const existing = dailyMap.get(symptom.recorded_date);
    if (existing) {
      existing.symptomScore = calculateSymptomScore(symptom);

      // 計算運動強度
      if (existing.exerciseMinutes > 0) {
        existing.intensity = getExerciseIntensity(
          existing.exerciseMinutes,
          existing.caloriesBurned
        );
      }
    }
  });

  return Array.from(dailyMap.values()).filter(
    (day) => day.exerciseMinutes > 0
  );
}

/**
 * 計算強度分析
 */
function analyzeIntensity(dailyData: any[]): IntensityAnalysis[] {
  const intensityGroups = {
    low: [] as any[],
    moderate: [] as any[],
    high: [] as any[],
  };

  dailyData.forEach((day) => {
    if (day.intensity) {
      intensityGroups[day.intensity].push(day);
    }
  });

  return (['low', 'moderate', 'high'] as const).map((intensity) => {
    const group = intensityGroups[intensity];
    const avgSymptomScore =
      group.length > 0
        ? group.reduce((sum, day) => sum + day.symptomScore, 0) / group.length
        : 0;

    const exerciseMinutes =
      group.length > 0
        ? group.reduce((sum, day) => sum + day.exerciseMinutes, 0) /
          group.length
        : 0;

    return {
      intensity,
      avgSymptomScore,
      sampleSize: group.length,
      exerciseMinutes,
    };
  });
}

/**
 * 分析運動類型影響
 */
function analyzeExerciseTypes(dailyData: any[]): ExerciseTypeImpact[] {
  const typeGroups = new Map<string, any[]>();

  dailyData.forEach((day) => {
    if (day.workoutType) {
      const existing = typeGroups.get(day.workoutType) || [];
      existing.push(day);
      typeGroups.set(day.workoutType, existing);
    }
  });

  const types: ExerciseTypeImpact[] = [];

  typeGroups.forEach((group, name) => {
    const avgSymptomScore =
      group.reduce((sum, day) => sum + day.symptomScore, 0) / group.length;

    // 計算症狀變化（與無運動天數比較）
    const noExerciseDays = dailyData.filter((d) => !d.workoutType);
    const avgNoExerciseSymptoms =
      noExerciseDays.length > 0
        ? noExerciseDays.reduce((sum, day) => sum + day.symptomScore, 0) /
          noExerciseDays.length
        : 0;

    const avgSymptomChange = avgSymptomScore - avgNoExerciseSymptoms;

    types.push({
      name,
      frequency: group.length,
      avgSymptomChange,
      avgBowelMovementChange: 0, // TODO: 整合排便數據
      recommendation:
        avgSymptomChange < -0.5
          ? 'beneficial'
          : avgSymptomChange > 0.5
            ? 'caution'
            : 'neutral',
    });
  });

  return types.sort((a, b) => a.avgSymptomChange - b.avgSymptomChange);
}

/**
 * 分析最佳運動時機
 */
function analyzeOptimalTiming(dailyData: any[]): OptimalTiming[] {
  const timingGroups = {
    morning: [] as any[],
    afternoon: [] as any[],
    evening: [] as any[],
  };

  dailyData.forEach((day) => {
    if (day.period) {
      timingGroups[day.period].push(day);
    }
  });

  return (['morning', 'afternoon', 'evening'] as const).map((period) => {
    const group = timingGroups[period];
    const avgSymptomScore =
      group.length > 0
        ? group.reduce((sum, day) => sum + day.symptomScore, 0) / group.length
        : 0;

    let impact = '中性影響';
    if (avgSymptomScore < 1.5) impact = '有益影響';
    else if (avgSymptomScore > 2.5) impact = '可能加劇症狀';

    return {
      period,
      avgSymptomScore,
      sampleSize: group.length,
      impact,
    };
  });
}

/**
 * 計算整體影響評分
 */
function calculateOverallImpact(intensityAnalysis: IntensityAnalysis[]): number {
  // 基於低強度運動的症狀改善程度計算評分
  const lowIntensity = intensityAnalysis.find((a) => a.intensity === 'low');
  const moderateIntensity = intensityAnalysis.find(
    (a) => a.intensity === 'moderate'
  );

  if (!lowIntensity || !moderateIntensity) return 50; // 數據不足，返回中性評分

  // 低症狀分數 = 高評分
  const lowScore = Math.max(0, 100 - lowIntensity.avgSymptomScore * 20);
  const moderateScore = Math.max(
    0,
    100 - moderateIntensity.avgSymptomScore * 20
  );

  return Math.round((lowScore + moderateScore) / 2);
}

/**
 * 獲取日期 N 天前
 */
function getDateNDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * 運動-症狀關聯分析 Hook
 */
export function useExerciseCorrelation(
  userId: string,
  days: number = 30
): { data: ExerciseCorrelation | undefined; isLoading: boolean; error: any } {
  return useQuery({
    queryKey: ['exercise-correlation', userId, days],
    queryFn: async () => {
      const startDate = getDateNDaysAgo(days);

      // 1. 獲取運動數據
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', userId)
        .in('metric_type', ['workout', 'active_energy', 'steps'])
        .gte('recorded_date', startDate)
        .order('recorded_date');

      if (exerciseError) throw exerciseError;

      // 2. 獲取症狀數據
      const { data: symptomData, error: symptomError } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_date', startDate)
        .order('recorded_date');

      if (symptomError) throw symptomError;

      // 3. 合併每日數據
      const dailyData = mergeDailyData(exerciseData || [], symptomData || []);

      // 4. 計算各項分析
      const intensityAnalysis = analyzeIntensity(dailyData);
      const exerciseTypes = analyzeExerciseTypes(dailyData);
      const optimalTiming = analyzeOptimalTiming(dailyData);

      // 5. 計算整體影響評分
      const overallImpactScore = calculateOverallImpact(intensityAnalysis);

      return {
        overallImpactScore,
        intensityAnalysis,
        exerciseTypes,
        optimalTiming,
        beneficialTypes: exerciseTypes.filter(
          (t) => t.recommendation === 'beneficial'
        ),
        cautionTypes: exerciseTypes.filter(
          (t) => t.recommendation === 'caution'
        ),
      };
    },
    staleTime: 5 * 60 * 1000, // 5分鐘快取
  });
}
