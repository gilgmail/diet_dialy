/**
 * Exercise-Symptom Correlation Screen
 *
 * 運動-症狀關聯分析畫面
 *
 * 功能：
 * - 顯示運動強度與症狀的關係圖表
 * - 列出不同運動類型的影響
 * - 提供最佳運動時機建議
 * - 整體健康影響評分
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useExerciseCorrelation } from '../hooks/useExerciseCorrelation';
import { ExerciseIntensityChart } from '../components/ExerciseIntensityChart';
import { ExerciseTypeImpactCard } from '../components/ExerciseTypeImpactCard';
import { OptimalTimingRecommendation } from '../components/OptimalTimingRecommendation';
import { colors } from '@/theme';

interface Props {
  userId: string;
  days?: number;
}

/**
 * 獲取評分顏色
 */
function getScoreColor(score: number): string {
  if (score >= 70) return '#10B981'; // 綠色（有益）
  if (score >= 40) return '#F59E0B'; // 橘色（中性）
  return '#EF4444'; // 紅色（需注意）
}

/**
 * 獲取評分標籤
 */
function getScoreLabel(score: number): string {
  if (score >= 70) return '有益';
  if (score >= 40) return '中性';
  return '需注意';
}

/**
 * 圓形進度指示器
 */
const CircularProgress: React.FC<{ value: number; size: number; strokeWidth: number; color: string }> = ({
  value,
  size,
  strokeWidth,
  color,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
    <View style={[styles.circularProgress, { width: size, height: size }]}>
      {/* 背景圓圈 */}
      <View
        style={[
          styles.progressCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: '#E5E7EB',
          },
        ]}
      />

      {/* 進度圓圈 (簡化為直接顯示百分比，因為 React Native 不支援 SVG arc) */}
      <View style={styles.progressContent}>
        <Text style={[styles.progressValue, { color }]}>{value}</Text>
        <Text style={styles.progressLabel}>分</Text>
      </View>
    </View>
  );
};

/**
 * 運動-症狀關聯分析畫面組件
 */
export const ExerciseSymptomScreen: React.FC<Props> = ({ userId, days = 30 }) => {
  const { data: correlation, isLoading, error } = useExerciseCorrelation(userId, days);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>分析運動數據中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>載入失敗，請稍後再試</Text>
      </View>
    );
  }

  if (!correlation) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暫無運動數據</Text>
      </View>
    );
  }

  const scoreColor = getScoreColor(correlation.overallImpactScore);
  const scoreLabel = getScoreLabel(correlation.overallImpactScore);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 標題 */}
      <View style={styles.header}>
        <Text style={styles.title}>運動與腸道健康關聯</Text>
        <Text style={styles.subtitle}>分析最近 {days} 天的運動數據</Text>
      </View>

      {/* 整體關聯評分 */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>整體影響評分</Text>
        <View style={styles.scoreContainer}>
          <CircularProgress
            value={correlation.overallImpactScore}
            size={120}
            strokeWidth={12}
            color={scoreColor}
          />
          <View style={styles.scoreLabelContainer}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>{scoreLabel}</Text>
            <Text style={styles.scoreDescription}>
              {correlation.overallImpactScore >= 70
                ? '運動對您的腸道健康有顯著的正面影響'
                : correlation.overallImpactScore >= 40
                  ? '運動對您的腸道健康影響中性'
                  : '建議調整運動強度和類型'}
            </Text>
          </View>
        </View>
      </View>

      {/* 運動強度 vs 症狀圖表 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>運動強度與症狀關係</Text>
        <ExerciseIntensityChart data={correlation.intensityAnalysis} height={250} />
      </View>

      {/* 運動類型影響卡片 */}
      {correlation.exerciseTypes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>不同運動類型的影響</Text>
          {correlation.exerciseTypes.map((type) => (
            <ExerciseTypeImpactCard key={type.name} type={type} />
          ))}
        </View>
      )}

      {/* 最佳運動時機建議 */}
      {correlation.optimalTiming.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>個人化建議</Text>
          <OptimalTimingRecommendation
            optimalTime={correlation.optimalTiming}
            beneficialTypes={correlation.beneficialTypes}
            cautionTypes={correlation.cautionTypes}
          />
        </View>
      )}

      {/* 數據不足提示 */}
      {correlation.intensityAnalysis.every((a) => a.sampleSize === 0) && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            💡 數據樣本較少，建議持續記錄運動和症狀以獲得更準確的分析
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  circularProgress: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    position: 'absolute',
  },
  progressContent: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  scoreLabelContainer: {
    flex: 1,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  scoreDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    padding: 16,
    marginTop: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});

export default ExerciseSymptomScreen;
