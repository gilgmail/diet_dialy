/**
 * Optimal Timing Recommendation Component
 *
 * 最佳運動時機建議組件
 *
 * 功能：
 * - 顯示不同時段（早晨/下午/晚上）的運動影響
 * - 提供個人化運動時機建議
 * - 列出有益和需注意的運動類型
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface OptimalTiming {
  period: 'morning' | 'afternoon' | 'evening';
  avgSymptomScore: number;
  sampleSize: number;
  impact: string;
}

interface ExerciseType {
  name: string;
  recommendation: 'beneficial' | 'neutral' | 'caution';
}

interface Props {
  optimalTime: OptimalTiming[];
  beneficialTypes: ExerciseType[];
  cautionTypes: ExerciseType[];
}

/**
 * 獲取時段圖標
 */
function getPeriodIcon(period: string): string {
  switch (period) {
    case 'morning':
      return 'weather-sunset-up';
    case 'afternoon':
      return 'weather-sunny';
    case 'evening':
      return 'weather-night';
    default:
      return 'clock-outline';
  }
}

/**
 * 獲取時段標籤
 */
function getPeriodLabel(period: string): string {
  switch (period) {
    case 'morning':
      return '早晨 (06:00-12:00)';
    case 'afternoon':
      return '下午 (12:00-18:00)';
    case 'evening':
      return '晚上 (18:00-24:00)';
    default:
      return period;
  }
}

/**
 * 獲取影響顏色
 */
function getImpactColor(impact: string): string {
  if (impact.includes('有益')) return '#10B981';
  if (impact.includes('加劇')) return '#EF4444';
  return '#6B7280';
}

/**
 * 最佳運動時機建議組件
 */
export const OptimalTimingRecommendation: React.FC<Props> = ({
  optimalTime,
  beneficialTypes,
  cautionTypes,
}) => {
  // 找出最佳時段（症狀分數最低）
  const bestPeriod = optimalTime.reduce((best, current) =>
    current.avgSymptomScore < best.avgSymptomScore ? current : best
  );

  return (
    <View style={styles.container}>
      {/* 最佳時段推薦 */}
      <View style={styles.bestPeriodCard}>
        <View style={styles.bestPeriodHeader}>
          <Icon
            name={getPeriodIcon(bestPeriod.period) as any}
            size={32}
            color="#10B981"
          />
          <View style={styles.bestPeriodTextContainer}>
            <Text style={styles.bestPeriodLabel}>建議運動時段</Text>
            <Text style={styles.bestPeriodText}>
              {getPeriodLabel(bestPeriod.period)}
            </Text>
          </View>
        </View>
        <Text style={styles.bestPeriodDescription}>
          根據您的數據，此時段運動對腸道健康影響最佳
        </Text>
      </View>

      {/* 時段詳細分析 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>各時段影響分析</Text>
        {optimalTime.map((timing) => (
          <View key={timing.period} style={styles.timingRow}>
            <View style={styles.timingLeft}>
              <Icon
                name={getPeriodIcon(timing.period) as any}
                size={24}
                color={getImpactColor(timing.impact)}
              />
              <View style={styles.timingTextContainer}>
                <Text style={styles.timingLabel}>
                  {getPeriodLabel(timing.period)}
                </Text>
                <Text style={styles.timingImpact}>
                  {timing.impact} ({timing.sampleSize}天)
                </Text>
              </View>
            </View>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreValue}>
                {timing.avgSymptomScore.toFixed(1)}
              </Text>
              <Text style={styles.scoreLabel}>症狀分數</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 有益運動類型 */}
      {beneficialTypes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="check-circle" size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>建議運動類型</Text>
          </View>
          <View style={styles.typeList}>
            {beneficialTypes.map((type, index) => (
              <View key={index} style={styles.typeTag}>
                <Icon name="dumbbell" size={14} color="#10B981" />
                <Text style={styles.typeText}>{type.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 需注意運動類型 */}
      {cautionTypes.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.sectionTitle}>需注意運動類型</Text>
          </View>
          <View style={styles.typeList}>
            {cautionTypes.map((type, index) => (
              <View key={index} style={[styles.typeTag, styles.cautionTypeTag]}>
                <Icon name="alert" size={14} color="#EF4444" />
                <Text style={[styles.typeText, styles.cautionTypeText]}>
                  {type.name}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.cautionNote}>
            💡 建議調整這些運動的強度或時間，以減少對腸道的影響
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  bestPeriodCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
    padding: 16,
  },
  bestPeriodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bestPeriodTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  bestPeriodLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 4,
  },
  bestPeriodText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
  },
  bestPeriodDescription: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 18,
  },
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  timingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  timingImpact: {
    fontSize: 12,
    color: '#6B7280',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  typeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  cautionTypeTag: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  cautionTypeText: {
    color: '#DC2626',
  },
  cautionNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 12,
  },
});

export default OptimalTimingRecommendation;
