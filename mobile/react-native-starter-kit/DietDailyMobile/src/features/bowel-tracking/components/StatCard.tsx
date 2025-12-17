/**
 * StatCard 組件
 *
 * 顯示摘要統計數據的卡片組件
 *
 * 功能：
 * - 支援趨勢指示器（上升/穩定/下降）
 * - 支援警告狀態（正常/警告/嚴重）
 * - 百分比進度顯示
 * - 圖標支援
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  alert?: boolean;
  icon?: string;
  percentage?: number;
  subtitle?: string;
}

/**
 * 統計卡片組件
 */
export const StatCard: React.FC<Props> = ({
  label,
  value,
  trend,
  alert = false,
  icon,
  percentage,
  subtitle,
}) => {
  // 根據警告狀態決定顏色
  const cardColor = alert ? '#FEF2F2' : '#F9FAFB';
  const borderColor = alert ? '#FCA5A5' : '#E5E7EB';
  const valueColor = alert ? '#DC2626' : '#111827';
  const iconColor = alert ? '#EF4444' : '#6B7280';

  // 趨勢圖標
  const getTrendIcon = () => {
    if (!trend) return null;

    const iconName =
      trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'trending-neutral';
    const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : '#6B7280';

    return <MaterialCommunityIcons name={iconName} size={20} color={trendColor} />;
  };

  return (
    <View style={[styles.card, { backgroundColor: cardColor, borderColor }]}>
      {/* 頂部：圖標和趨勢 */}
      <View style={styles.header}>
        {icon && (
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
          </View>
        )}
        {getTrendIcon()}
      </View>

      {/* 主要數值 */}
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>

      {/* 標籤 */}
      <Text style={styles.label}>{label}</Text>

      {/* 副標題（可選） */}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {/* 百分比進度條（可選） */}
      {percentage !== undefined && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(percentage * 100, 100)}%`,
                  backgroundColor: alert ? '#EF4444' : '#10B981',
                },
              ]}
            />
          </View>
          <Text style={styles.percentageText}>{Math.round(percentage * 100)}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
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
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBackground: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  percentageText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
});

export default StatCard;
