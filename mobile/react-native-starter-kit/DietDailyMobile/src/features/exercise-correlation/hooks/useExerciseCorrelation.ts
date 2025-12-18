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
import { supabase } from '@/shared/api/supabase/client';

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

interface BowelMovementData {
  recorded_date: string;
  stool_type: number; // 1-5 (Bristol Scale)
  has_blood: boolean;
  count?: number; // 當日排便次數
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
 * 如果所有症狀都是 0，返回 0（表示健康）
 * 如果有 null 值，視為無數據，返回 null
 */
function calculateSymptomScore(symptom: SymptomData): number | null {
  // 檢查是否有 null 值（表示無數據）
  if (
    symptom.abdominal_pain === null ||
    symptom.diarrhea === null ||
    symptom.bloating === null ||
    symptom.bloody_stool === null
  ) {
    return null; // 無數據
  }

  const score = (
    (symptom.abdominal_pain +
      symptom.diarrhea +
      symptom.bloating +
      symptom.bloody_stool) /
    4
  );
  console.log('[calculateSymptomScore] Input:', {
    abdominal_pain: symptom.abdominal_pain,
    diarrhea: symptom.diarrhea,
    bloating: symptom.bloating,
    bloody_stool: symptom.bloody_stool,
    calculatedScore: score
  });
  return score;
}

/**
 * 計算排便健康分數（基於 Bristol Scale 和血便）
 * 返回 0-5 分數，0 表示最健康
 */
function calculateBowelHealthScore(bowelData: BowelMovementData[]): number | null {
  if (!bowelData || bowelData.length === 0) {
    return null; // 無排便數據
  }

  let totalScore = 0;
  let hasBlood = false;

  bowelData.forEach((entry) => {
    // Bristol Scale: 1-2 (便秘) = 2分, 3 (正常) = 0分, 4-5 (腹瀉) = 3分
    if (entry.stool_type <= 2) {
      totalScore += 2; // 便秘
    } else if (entry.stool_type === 3) {
      totalScore += 0; // 正常
    } else {
      totalScore += 3; // 腹瀉
    }

    if (entry.has_blood) {
      hasBlood = true;
    }
  });

  // 血便加 2 分
  if (hasBlood) {
    totalScore += 2;
  }

  // 平均分數，最高 5 分
  const avgScore = Math.min(totalScore / bowelData.length, 5);
  return avgScore;
}

/**
 * 判斷運動強度
 */
function getExerciseIntensity(
  exerciseMinutes: number,
  caloriesBurned: number,
  steps?: number
): 'low' | 'moderate' | 'high' {
  // 如果有運動時間，使用原本的邏輯
  if (exerciseMinutes > 0) {
    const caloriesPerMinute = caloriesBurned / exerciseMinutes;
    if (caloriesPerMinute < 5 || exerciseMinutes < 15) return 'low';
    if (caloriesPerMinute < 8 || exerciseMinutes < 30) return 'moderate';
    return 'high';
  }
  
  // 如果只有步數，基於步數判斷強度
  if (steps && steps > 0) {
    // 1000 steps ≈ 10 分鐘的散步
    const estimatedMinutes = steps / 100;
    if (steps < 3000 || estimatedMinutes < 15) return 'low';
    if (steps < 8000 || estimatedMinutes < 30) return 'moderate';
    return 'high';
  }
  
  // 如果只有活動消耗，基於卡路里判斷
  if (caloriesBurned > 0) {
    // 假設平均每分鐘消耗 5 卡路里
    const estimatedMinutes = caloriesBurned / 5;
    if (caloriesBurned < 75 || estimatedMinutes < 15) return 'low';
    if (caloriesBurned < 150 || estimatedMinutes < 30) return 'moderate';
    return 'high';
  }
  
  return 'low';
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
 * 合併每日數據（包含運動、症狀和排便數據）
 */
function mergeDailyData(
  exerciseData: ExerciseData[],
  symptomData: SymptomData[],
  bowelData: BowelMovementData[]
) {
  const dailyMap = new Map<
    string,
    {
      date: string;
      exerciseMinutes: number;
      caloriesBurned: number;
      steps: number;
      workoutType?: string;
      symptomScore: number | null; // null 表示無症狀數據
      bowelHealthScore: number | null; // null 表示無排便數據
      healthScore: number; // 綜合健康分數（症狀或排便，優先症狀）
      intensity?: 'low' | 'moderate' | 'high';
      period?: 'morning' | 'afternoon' | 'evening';
    }
  >();

  // 聚合運動數據
  exerciseData.forEach((entry) => {
    // 確保日期格式正確（可能是 Date 對象或字符串）
    const dateKey = typeof entry.recorded_date === 'string' 
      ? entry.recorded_date 
      : entry.recorded_date instanceof Date 
        ? entry.recorded_date.toISOString().split('T')[0]
        : String(entry.recorded_date);
    
    const existing = dailyMap.get(dateKey) || {
      date: dateKey,
      exerciseMinutes: 0,
      caloriesBurned: 0,
      steps: 0,
      symptomScore: null,
      bowelHealthScore: null,
      healthScore: 0,
    };

    // 確保數值是數字類型
    const numericValue = typeof entry.numeric_value === 'number' 
      ? entry.numeric_value 
      : parseFloat(String(entry.numeric_value)) || 0;

    if (entry.metric_type === 'workout') {
      existing.exerciseMinutes += numericValue;
      existing.workoutType = entry.detail_payload?.workout_type;
    } else if (entry.metric_type === 'active_energy') {
      existing.caloriesBurned += numericValue;
    } else if (entry.metric_type === 'steps') {
      existing.steps += numericValue;
    }

    dailyMap.set(dateKey, existing);
  });

  // 添加症狀數據
  console.log('[mergeDailyData] Adding symptom data, symptomData length:', symptomData.length);
  symptomData.forEach((symptom) => {
    // 確保日期格式正確
    const dateKey = typeof symptom.recorded_date === 'string' 
      ? symptom.recorded_date 
      : symptom.recorded_date instanceof Date 
        ? symptom.recorded_date.toISOString().split('T')[0]
        : String(symptom.recorded_date);
    
    const existing = dailyMap.get(dateKey);
    if (existing) {
      const score = calculateSymptomScore(symptom);
      existing.symptomScore = score;
      console.log(`[mergeDailyData] Matched symptom data for ${dateKey}:`, {
        date: dateKey,
        symptomScore: score,
        abdominal_pain: symptom.abdominal_pain,
        diarrhea: symptom.diarrhea,
        bloating: symptom.bloating,
        bloody_stool: symptom.bloody_stool
      });
    } else {
      console.warn(`[mergeDailyData] No exercise data found for symptom date: ${dateKey}`);
    }
  });

  // 聚合排便數據
  const bowelDataByDate = new Map<string, BowelMovementData[]>();
  bowelData.forEach((entry) => {
    const dateKey = typeof entry.recorded_date === 'string' 
      ? entry.recorded_date 
      : entry.recorded_date instanceof Date 
        ? entry.recorded_date.toISOString().split('T')[0]
        : String(entry.recorded_date);
    
    const existing = bowelDataByDate.get(dateKey) || [];
    existing.push(entry);
    bowelDataByDate.set(dateKey, existing);
  });

  // 添加排便健康分數
  bowelDataByDate.forEach((entries, dateKey) => {
    const existing = dailyMap.get(dateKey);
    if (existing) {
      const bowelScore = calculateBowelHealthScore(entries);
      existing.bowelHealthScore = bowelScore;
      console.log(`[mergeDailyData] Matched bowel data for ${dateKey}:`, {
        date: dateKey,
        bowelHealthScore: bowelScore,
        bowelCount: entries.length
      });
    }
  });
  
  // 檢查合併後的數據
  console.log('[mergeDailyData] Daily map after merging symptoms:');
  dailyMap.forEach((day, date) => {
    console.log(`[mergeDailyData] ${date}:`, {
      exerciseMinutes: day.exerciseMinutes,
      steps: day.steps,
      caloriesBurned: day.caloriesBurned,
      symptomScore: day.symptomScore,
      bowelHealthScore: day.bowelHealthScore,
      healthScore: day.healthScore
    });
  });

  // 為所有有運動數據的日子計算運動強度和時段
  dailyMap.forEach((day, date) => {
    if (day.exerciseMinutes > 0 || day.steps > 0 || day.caloriesBurned > 0) {
      // 如果沒有運動時間但有步數，估算運動時間（1000 steps ≈ 10 分鐘）
      if (day.exerciseMinutes === 0 && day.steps > 0) {
        day.exerciseMinutes = day.steps / 100;
      }
      // 如果沒有運動時間但有活動消耗，估算運動時間（假設平均每分鐘 5 卡路里）
      if (day.exerciseMinutes === 0 && day.caloriesBurned > 0) {
        day.exerciseMinutes = day.caloriesBurned / 5;
      }
      
      // 計算運動強度
      day.intensity = getExerciseIntensity(
        day.exerciseMinutes,
        day.caloriesBurned,
        day.steps
      );
      
      // 計算運動時段
      day.period = getExercisePeriod(day.date);
      
      // 如果沒有 workoutType 但有步數，標記為散步
      if (!day.workoutType && day.steps > 0) {
        day.workoutType = 'walking';
      }

      // 計算綜合健康分數（優先使用症狀分數，如果沒有則使用排便分數）
      if (day.symptomScore !== null) {
        day.healthScore = day.symptomScore;
      } else if (day.bowelHealthScore !== null) {
        day.healthScore = day.bowelHealthScore;
      } else {
        // 如果都沒有數據，設為 0（表示健康，但無數據）
        day.healthScore = 0;
      }
    }
  });

  // 過濾：保留有運動活動的數據（包括步數、活動消耗或運動時間）
  return Array.from(dailyMap.values()).filter(
    (day) => day.exerciseMinutes > 0 || day.steps > 0 || day.caloriesBurned > 0
  );
}

/**
 * 計算強度分析
 */
function analyzeIntensity(dailyData: any[]): IntensityAnalysis[] {
  console.log('[analyzeIntensity] Input dailyData length:', dailyData.length);
  console.log('[analyzeIntensity] Sample dailyData:', dailyData.slice(0, 3).map(day => ({
    date: day.date,
    intensity: day.intensity,
    symptomScore: day.symptomScore,
    bowelHealthScore: day.bowelHealthScore,
    healthScore: day.healthScore,
    exerciseMinutes: day.exerciseMinutes,
    steps: day.steps
  })));

  const intensityGroups = {
    low: [] as any[],
    moderate: [] as any[],
    high: [] as any[],
  };

  dailyData.forEach((day) => {
    if (day.intensity) {
      intensityGroups[day.intensity].push(day);
    } else {
      console.warn('[analyzeIntensity] Day without intensity:', day.date, day);
    }
  });

  console.log('[analyzeIntensity] Intensity groups:', {
    low: intensityGroups.low.length,
    moderate: intensityGroups.moderate.length,
    high: intensityGroups.high.length
  });

  const result = (['low', 'moderate', 'high'] as const).map((intensity) => {
    const group = intensityGroups[intensity];
    // 使用綜合健康分數（healthScore）而不是 symptomScore
    const avgSymptomScore =
      group.length > 0
        ? group.reduce((sum, day) => sum + (day.healthScore || 0), 0) / group.length
        : 0;

    const exerciseMinutes =
      group.length > 0
        ? group.reduce((sum, day) => sum + day.exerciseMinutes, 0) /
          group.length
        : 0;

    const resultItem = {
      intensity,
      avgSymptomScore,
      sampleSize: group.length,
      exerciseMinutes,
    };
    
    console.log(`[analyzeIntensity] ${intensity}:`, resultItem);
    return resultItem;
  });

  console.log('[analyzeIntensity] Final result:', result);
  return result;
}

/**
 * 分析運動類型影響
 */
function analyzeExerciseTypes(dailyData: any[]): ExerciseTypeImpact[] {
  const typeGroups = new Map<string, any[]>();

  dailyData.forEach((day) => {
    // 如果有 workoutType，使用它；否則根據數據推斷
    let exerciseType = day.workoutType;
    if (!exerciseType) {
      if (day.steps > 0) {
        exerciseType = 'walking'; // 散步
      } else if (day.caloriesBurned > 0) {
        exerciseType = 'general_activity'; // 一般活動
      }
    }
    
    if (exerciseType) {
      const existing = typeGroups.get(exerciseType) || [];
      existing.push(day);
      typeGroups.set(exerciseType, existing);
    }
  });

  const types: ExerciseTypeImpact[] = [];

  typeGroups.forEach((group, name) => {
    const avgSymptomScore =
      group.reduce((sum, day) => sum + (day.healthScore || 0), 0) / group.length;

    // 計算症狀變化（與無運動天數比較）
    const noExerciseDays = dailyData.filter((d) => !d.workoutType);
    const avgNoExerciseSymptoms =
      noExerciseDays.length > 0
        ? noExerciseDays.reduce((sum, day) => sum + (day.healthScore || 0), 0) /
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
    // 如果沒有 period，根據日期計算
    if (!day.period) {
      day.period = getExercisePeriod(day.date);
    }
    if (day.period) {
      timingGroups[day.period].push(day);
    }
  });

  return (['morning', 'afternoon', 'evening'] as const).map((period) => {
    const group = timingGroups[period];
    const avgSymptomScore =
      group.length > 0
        ? group.reduce((sum, day) => sum + (day.healthScore || 0), 0) / group.length
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
  const highIntensity = intensityAnalysis.find((a) => a.intensity === 'high');

  // 如果有任何強度的數據，計算評分
  const intensitiesWithData = [lowIntensity, moderateIntensity, highIntensity].filter(
    (i) => i && i.sampleSize > 0
  );

  if (intensitiesWithData.length === 0) {
    // 如果完全沒有數據，返回 50（中性評分）
    return 50;
  }

  // 計算所有有數據的強度的平均評分
  // 如果沒有症狀數據，症狀分數為 0，表示良好狀態
  const scores = intensitiesWithData.map((intensity) => {
    // 如果症狀分數為 0（沒有症狀數據或症狀很輕），給予高分
    // 症狀分數越低 = 評分越高
    return Math.max(0, 100 - (intensity!.avgSymptomScore || 0) * 20);
  });

  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
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

      if (exerciseError) {
        console.error('[useExerciseCorrelation] Error fetching exercise data:', exerciseError);
        throw exerciseError;
      }

      console.log(`[useExerciseCorrelation] Fetched ${exerciseData?.length || 0} exercise records from ${startDate}`);
      if (exerciseData && exerciseData.length > 0) {
        // 統計各類型數據
        const typeCounts = exerciseData.reduce((acc, item) => {
          acc[item.metric_type] = (acc[item.metric_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('[useExerciseCorrelation] Exercise data by type:', typeCounts);
        console.log('[useExerciseCorrelation] Exercise data sample:', exerciseData.slice(0, 3).map(item => ({
          date: item.recorded_date,
          type: item.metric_type,
          value: item.numeric_value,
          unit: item.unit
        })));
      } else {
        console.warn('[useExerciseCorrelation] No exercise data found! Check if data exists in health_metrics table.');
      }

      // 2. 獲取症狀數據
      const { data: symptomData, error: symptomError } = await supabase
        .from('daily_symptom_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_date', startDate)
        .order('recorded_date');

      if (symptomError) {
        console.error('[useExerciseCorrelation] Error fetching symptom data:', symptomError);
        throw symptomError;
      }

      console.log(`[useExerciseCorrelation] Fetched ${symptomData?.length || 0} symptom records`);
      if (symptomData && symptomData.length > 0) {
        console.log('[useExerciseCorrelation] Symptom data sample:', symptomData.slice(0, 3).map(item => ({
          date: item.recorded_date,
          abdominal_pain: item.abdominal_pain,
          diarrhea: item.diarrhea,
          bloating: item.bloating,
          bloody_stool: item.bloody_stool
        })));
      }

      // 3. 獲取排便數據（作為健康指標的補充）
      const { data: bowelData, error: bowelError } = await supabase
        .from('bowel_movement_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_date', startDate)
        .order('recorded_date');

      if (bowelError) {
        console.warn('[useExerciseCorrelation] Error fetching bowel data:', bowelError);
        // 不拋出錯誤，排便數據是可選的
      }

      console.log(`[useExerciseCorrelation] Fetched ${bowelData?.length || 0} bowel movement records`);

      // 4. 合併每日數據（包含運動、症狀和排便數據）
      const dailyData = mergeDailyData(
        exerciseData || [],
        symptomData || [],
        bowelData || []
      );
      console.log(`[useExerciseCorrelation] Merged ${dailyData.length} days with exercise data`);
      if (dailyData.length > 0) {
        console.log('[useExerciseCorrelation] Daily data sample:', dailyData.slice(0, 3).map(day => ({
          date: day.date,
          steps: day.steps,
          exerciseMinutes: day.exerciseMinutes,
          caloriesBurned: day.caloriesBurned,
          intensity: day.intensity,
          workoutType: day.workoutType
        })));
      }

      // 4. 計算各項分析
      const intensityAnalysis = analyzeIntensity(dailyData);
      const exerciseTypes = analyzeExerciseTypes(dailyData);
      const optimalTiming = analyzeOptimalTiming(dailyData);

      console.log('[useExerciseCorrelation] Intensity analysis result:', intensityAnalysis);
      console.log('[useExerciseCorrelation] Exercise types:', exerciseTypes.length);
      console.log('[useExerciseCorrelation] Optimal timing:', optimalTiming);

      // 5. 計算整體影響評分
      const overallImpactScore = calculateOverallImpact(intensityAnalysis);
      console.log('[useExerciseCorrelation] Overall impact score:', overallImpactScore);

      const result = {
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

      console.log('[useExerciseCorrelation] Final correlation result:', {
        overallImpactScore: result.overallImpactScore,
        intensityAnalysisCount: result.intensityAnalysis.length,
        intensityAnalysis: result.intensityAnalysis,
        exerciseTypesCount: result.exerciseTypes.length,
        optimalTimingCount: result.optimalTiming.length
      });

      return result;
    },
    staleTime: 5 * 60 * 1000, // 5分鐘快取
  });
}
