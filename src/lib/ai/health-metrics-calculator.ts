/**
 * Health Metrics Calculator
 * 計算健康指標統計和與症狀的關聯性分析
 */

import type {
  DailySymptomEntry,
  HealthMetricStatistics,
  HealthMetricsOverview,
  HealthSymptomCorrelation,
  HealthFactorAnalysis
} from '@/types/medical';

/**
 * 計算單一健康指標的統計資料
 */
function calculateMetricStats(
  entries: DailySymptomEntry[],
  metricKey: 'avg_heart_rate' | 'daily_steps' | 'active_calories' | 'water_intake_ml' | 'stress_score'
): HealthMetricStatistics | undefined {
  // 過濾出有該指標資料的 entries
  const validEntries = entries.filter(e => e[metricKey] !== null && e[metricKey] !== undefined);

  if (validEntries.length === 0) {
    return undefined;
  }

  const values = validEntries.map(e => e[metricKey] as number);
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const daysWithData = validEntries.length;
  const totalDays = entries.length;
  const coverage = (daysWithData / totalDays) * 100;

  // 判斷趨勢：比較前半與後半的平均值
  let trend: 'improving' | 'stable' | 'declining' | 'insufficient_data' = 'insufficient_data';

  if (daysWithData >= 4) {
    const midpoint = Math.floor(daysWithData / 2);
    const firstHalf = values.slice(0, midpoint);
    const secondHalf = values.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    // 不同指標的趨勢判斷邏輯不同
    if (metricKey === 'stress_score') {
      // 壓力分數：下降是改善
      if (changePercent < -10) trend = 'improving';
      else if (changePercent > 10) trend = 'declining';
      else trend = 'stable';
    } else if (metricKey === 'daily_steps' || metricKey === 'active_calories' || metricKey === 'water_intake_ml') {
      // 步數、活動消耗、飲水量：增加是改善
      if (changePercent > 10) trend = 'improving';
      else if (changePercent < -10) trend = 'declining';
      else trend = 'stable';
    } else if (metricKey === 'avg_heart_rate') {
      // 心率：穩定最好，大幅變化都是問題
      if (Math.abs(changePercent) < 5) trend = 'stable';
      else if (changePercent > 10) trend = 'declining'; // 心率上升可能是壓力或發炎
      else trend = 'improving';
    }
  }

  return {
    average: Math.round(average * 100) / 100,
    min,
    max,
    daysWithData,
    totalDays,
    coverage: Math.round(coverage * 100) / 100,
    trend
  };
}

/**
 * 計算健康指標與症狀的關聯性
 * 使用三分位數將指標分為低、中、高三個範圍，計算每個範圍內的平均症狀分數
 */
function calculateCorrelation(
  entries: DailySymptomEntry[],
  metricKey: 'avg_heart_rate' | 'daily_steps' | 'active_calories' | 'water_intake_ml' | 'stress_score',
  metricLabel: string
): HealthSymptomCorrelation | null {
  // 過濾出有該指標和症狀資料的 entries
  const validEntries = entries.filter(
    e => e[metricKey] !== null &&
         e[metricKey] !== undefined &&
         e.overall_health !== null &&
         e.overall_health !== undefined
  );

  if (validEntries.length < 3) {
    return null; // 資料不足，無法分析
  }

  // 將資料按指標值排序
  const sortedEntries = [...validEntries].sort((a, b) => (a[metricKey] as number) - (b[metricKey] as number));

  // 計算三分位數
  const tertileSize = Math.floor(sortedEntries.length / 3);
  const lowRange = sortedEntries.slice(0, tertileSize);
  const midRange = sortedEntries.slice(tertileSize, tertileSize * 2);
  const highRange = sortedEntries.slice(tertileSize * 2);

  // 計算每個範圍的平均症狀分數
  const calculateAvgSymptom = (range: DailySymptomEntry[]) => {
    const symptomSum = range.reduce((sum, e) => sum + (e.overall_health || 0), 0);
    return Math.round((symptomSum / range.length) * 100) / 100;
  };

  const lowAvgSymptom = calculateAvgSymptom(lowRange);
  const midAvgSymptom = calculateAvgSymptom(midRange);
  const highAvgSymptom = calculateAvgSymptom(highRange);

  // 生成範圍標籤
  const lowMin = (lowRange[0]?.[metricKey] ?? 0) as number;
  const lowMax = (lowRange[lowRange.length - 1]?.[metricKey] ?? 0) as number;
  const midMin = (midRange[0]?.[metricKey] ?? 0) as number;
  const midMax = (midRange[midRange.length - 1]?.[metricKey] ?? 0) as number;
  const highMin = (highRange[0]?.[metricKey] ?? 0) as number;
  const highMax = (highRange[highRange.length - 1]?.[metricKey] ?? 0) as number;

  const getLabel = (min: number, max: number) => {
    if (metricKey === 'daily_steps') return `${min}-${max} 步`;
    if (metricKey === 'avg_heart_rate') return `${min}-${max} bpm`;
    if (metricKey === 'active_calories') return `${min}-${max} kcal`;
    if (metricKey === 'water_intake_ml') return `${min}-${max} ml`;
    if (metricKey === 'stress_score') return `${min}-${max} 分`;
    return `${min}-${max}`;
  };

  // 判斷關聯強度
  let significance: 'strong' | 'moderate' | 'weak' | 'insufficient_data' = 'insufficient_data';
  const maxDiff = Math.max(
    Math.abs(highAvgSymptom - lowAvgSymptom),
    Math.abs(highAvgSymptom - midAvgSymptom),
    Math.abs(midAvgSymptom - lowAvgSymptom)
  );

  if (validEntries.length >= 7) {
    if (maxDiff >= 1.0) significance = 'strong';
    else if (maxDiff >= 0.5) significance = 'moderate';
    else significance = 'weak';
  }

  // 生成洞察
  let insight = '';
  if (metricKey === 'stress_score') {
    if (highAvgSymptom > lowAvgSymptom) {
      insight = `高壓力時症狀較嚴重（平均 ${highAvgSymptom} 分），建議加強壓力管理`;
    } else {
      insight = `壓力與症狀無明顯關聯，可能還有其他因子影響`;
    }
  } else if (metricKey === 'daily_steps' || metricKey === 'active_calories') {
    if (lowAvgSymptom > highAvgSymptom) {
      insight = `適度運動時症狀較輕（平均 ${highAvgSymptom} 分 vs ${lowAvgSymptom} 分），建議維持活動量`;
    } else if (highAvgSymptom > lowAvgSymptom) {
      insight = `過度活動可能加重症狀，建議調整運動強度`;
    } else {
      insight = `運動量與症狀無明顯關聯`;
    }
  } else if (metricKey === 'water_intake_ml') {
    if (lowAvgSymptom > highAvgSymptom) {
      insight = `充足飲水時症狀較輕，建議每日至少 ${Math.round(highMin)} ml`;
    } else {
      insight = `飲水量與症狀無明顯關聯`;
    }
  } else if (metricKey === 'avg_heart_rate') {
    if (highAvgSymptom > midAvgSymptom) {
      insight = `心率升高可能反映壓力或發炎，建議諮詢醫生`;
    } else {
      insight = `心率與症狀無明顯關聯`;
    }
  }

  return {
    metric: metricKey,
    metricLabel,
    ranges: {
      low: {
        label: getLabel(lowMin, lowMax),
        avgSymptomScore: lowAvgSymptom,
        dayCount: lowRange.length
      },
      medium: {
        label: getLabel(midMin, midMax),
        avgSymptomScore: midAvgSymptom,
        dayCount: midRange.length
      },
      high: {
        label: getLabel(highMin, highMax),
        avgSymptomScore: highAvgSymptom,
        dayCount: highRange.length
      }
    },
    insight,
    significance
  };
}

/**
 * 主要入口函數：計算完整的健康因子分析
 */
export function calculateHealthFactors(entries: DailySymptomEntry[]): HealthFactorAnalysis {
  const overview: HealthMetricsOverview = {
    heartRate: calculateMetricStats(entries, 'avg_heart_rate'),
    steps: calculateMetricStats(entries, 'daily_steps'),
    activeCalories: calculateMetricStats(entries, 'active_calories'),
    waterIntake: calculateMetricStats(entries, 'water_intake_ml'),
    stressScore: calculateMetricStats(entries, 'stress_score')
  };

  // 檢查是否有任何健康資料
  const hasHealthData = !!(
    overview.heartRate ||
    overview.steps ||
    overview.activeCalories ||
    overview.waterIntake ||
    overview.stressScore
  );

  if (!hasHealthData) {
    return {
      overview,
      correlations: [],
      hasHealthData: false,
      dataQuality: 'poor',
      qualityNotes: ['無健康資料可供分析']
    };
  }

  // 計算關聯性
  const correlations: HealthSymptomCorrelation[] = [];

  if (overview.steps) {
    const correlation = calculateCorrelation(entries, 'daily_steps', '每日步數');
    if (correlation) correlations.push(correlation);
  }

  if (overview.heartRate) {
    const correlation = calculateCorrelation(entries, 'avg_heart_rate', '平均心率');
    if (correlation) correlations.push(correlation);
  }

  if (overview.activeCalories) {
    const correlation = calculateCorrelation(entries, 'active_calories', '活動消耗');
    if (correlation) correlations.push(correlation);
  }

  if (overview.waterIntake) {
    const correlation = calculateCorrelation(entries, 'water_intake_ml', '飲水量');
    if (correlation) correlations.push(correlation);
  }

  if (overview.stressScore) {
    const correlation = calculateCorrelation(entries, 'stress_score', '壓力分數');
    if (correlation) correlations.push(correlation);
  }

  // 評估資料品質
  let dataQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  const metricsWithData = [
    overview.heartRate,
    overview.steps,
    overview.activeCalories,
    overview.waterIntake,
    overview.stressScore
  ].filter(m => m !== undefined).length;

  const avgCoverage = [
    overview.heartRate?.coverage,
    overview.steps?.coverage,
    overview.activeCalories?.coverage,
    overview.waterIntake?.coverage,
    overview.stressScore?.coverage
  ].filter(c => c !== undefined).reduce((sum, c) => sum + (c || 0), 0) / metricsWithData;

  if (metricsWithData >= 4 && avgCoverage >= 70) {
    dataQuality = 'excellent';
  } else if (metricsWithData >= 3 && avgCoverage >= 50) {
    dataQuality = 'good';
  } else if (metricsWithData >= 2 && avgCoverage >= 30) {
    dataQuality = 'fair';
  } else {
    dataQuality = 'poor';
  }

  // 生成品質說明
  const qualityNotes: string[] = [];

  if (entries.length < 7) {
    qualityNotes.push(`資料天數不足（${entries.length} 天），建議至少 7 天以上進行可靠分析`);
  }

  if (avgCoverage < 50) {
    qualityNotes.push(`資料覆蓋率偏低（${Math.round(avgCoverage)}%），部分天數缺少健康資料`);
  }

  if (metricsWithData < 3) {
    qualityNotes.push(`追蹤指標較少（${metricsWithData} 項），建議啟用更多健康同步功能`);
  }

  // 特定健康警告
  if (overview.stressScore && overview.stressScore.average > 7) {
    qualityNotes.push('⚠️ 持續高壓力狀態可能加重症狀，建議壓力管理介入');
  }

  if (overview.steps && overview.steps.average < 3000) {
    qualityNotes.push('ℹ️ 平均步數偏低，逐步增加活動量可能有益症狀管理');
  }

  if (overview.waterIntake && overview.waterIntake.average < 1500) {
    qualityNotes.push('💧 飲水量低於建議值，建議每日 2000-2500ml');
  }

  if (overview.heartRate && overview.heartRate.average > 85) {
    qualityNotes.push('❤️ 靜息心率偏高，可能反映身體壓力或發炎，建議諮詢醫生');
  }

  return {
    overview,
    correlations,
    hasHealthData: true,
    dataQuality,
    qualityNotes
  };
}
