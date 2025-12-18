/**
 * Exercise Type Impact Card Component
 *
 * 運動類型影響卡片
 *
 * 功能：
 * - 顯示特定運動類型的影響
 * - 展示頻率、症狀變化、建議等級
 * - 根據建議等級顯示不同顏色和圖標
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ExerciseTypeImpact {
  name: string;
  frequency: number;
  avgSymptomChange: number;
  avgBowelMovementChange: number;
  recommendation: 'beneficial' | 'neutral' | 'caution';
}

interface Props {
  type: ExerciseTypeImpact;
}

/**
 * 獲取建議配置
 */
function getRecommendationConfig(recommendation: string) {
  switch (recommendation) {
    case 'beneficial':
      return {
        backgroundColor: '#ECFDF5',
        borderColor: '#10B981',
        iconColor: '#10B981',
        iconName: 'check-circle',
        label: '有益',
        labelColor: '#059669',
      };
    case 'neutral':
      return {
        backgroundColor: '#F3F4F6',
        borderColor: '#6B7280',
        iconColor: '#6B7280',
        iconName: 'minus-circle',
        label: '中性',
        labelColor: '#4B5563',
      };
    case 'caution':
      return {
        backgroundColor: '#FEF2F2',
        borderColor: '#EF4444',
        iconColor: '#EF4444',
        iconName: 'alert-circle',
        label: '需注意',
        labelColor: '#DC2626',
      };
    default:
      return {
        backgroundColor: '#F3F4F6',
        borderColor: '#6B7280',
        iconColor: '#6B7280',
        iconName: 'information',
        label: '未知',
        labelColor: '#4B5563',
      };
  }
}

/**
 * 獲取運動類型圖標
 */
function getWorkoutIcon(name: string): string {
  const lowercaseName = name.toLowerCase();

  if (lowercaseName.includes('run') || lowercaseName.includes('跑步'))
    return 'run';
  if (lowercaseName.includes('walk') || lowercaseName.includes('步行'))
    return 'walk';
  if (lowercaseName.includes('swim') || lowercaseName.includes('游泳'))
    return 'swim';
  if (lowercaseName.includes('cycle') || lowercaseName.includes('騎車'))
    return 'bike';
  if (lowercaseName.includes('yoga') || lowercaseName.includes('瑜伽'))
    return 'meditation';
  if (lowercaseName.includes('weight') || lowercaseName.includes('重訓'))
    return 'weight-lifter';
  if (lowercaseName.includes('hike') || lowercaseName.includes('爬山'))
    return 'hiking';

  return 'dumbbell'; // 預設圖標
}

/**
 * 運動類型影響卡片組件
 */
export const ExerciseTypeImpactCard: React.FC<Props> = ({ type }) => {
  const config = getRecommendationConfig(type.recommendation);
  const workoutIcon = getWorkoutIcon(type.name);

  // 計算症狀變化百分比
  const symptomChangePercent =
    type.avgSymptomChange !== 0
      ? `${type.avgSymptomChange > 0 ? '+' : ''}${Math.round(type.avgSymptomChange * 100)}%`
      : '無變化';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      {/* 頂部：運動圖標 + 建議標籤 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: config.iconColor + '20' },
            ]}
          >
            <Icon name={workoutIcon as any} size={24} color={config.iconColor} />
          </View>
          <Text style={styles.typeName}>{type.name}</Text>
        </View>

        <View
          style={[
            styles.recommendationBadge,
            { backgroundColor: config.labelColor },
          ]}
        >
          <Icon name={config.iconName as any} size={14} color="#FFFFFF" />
          <Text style={styles.recommendationText}>{config.label}</Text>
        </View>
      </View>

      {/* 統計數據 */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>運動次數</Text>
          <Text style={styles.statValue}>{type.frequency} 次</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.stat}>
          <Text style={styles.statLabel}>症狀變化</Text>
          <Text
            style={[
              styles.statValue,
              {
                color:
                  type.avgSymptomChange < 0
                    ? '#10B981'
                    : type.avgSymptomChange > 0
                      ? '#EF4444'
                      : '#6B7280',
              },
            ]}
          >
            {symptomChangePercent}
          </Text>
        </View>
      </View>

      {/* 建議說明 */}
      {type.recommendation === 'beneficial' && (
        <View style={styles.descriptionContainer}>
          <Icon name="information" size={16} color={config.iconColor} />
          <Text style={styles.descriptionText}>
            此運動有助於改善腸道健康，建議繼續保持
          </Text>
        </View>
      )}

      {type.recommendation === 'caution' && (
        <View style={styles.descriptionContainer}>
          <Icon name="alert" size={16} color={config.iconColor} />
          <Text style={styles.descriptionText}>
            此運動可能加劇症狀，建議調整強度或時間
          </Text>
        </View>
      )}

      {type.recommendation === 'neutral' && (
        <View style={styles.descriptionContainer}>
          <Icon name="information" size={16} color={config.iconColor} />
          <Text style={styles.descriptionText}>
            此運動對症狀影響不明顯，可繼續觀察
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recommendationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginHorizontal: 16,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    gap: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    lineHeight: 18,
  },
});

export default ExerciseTypeImpactCard;
