/**
 * Insight Card Component
 *
 * 顯示健康洞察和警告的卡片組件
 *
 * 功能：
 * - 支援不同嚴重度等級（info, warning, alert, critical）
 * - 顏色編碼（info=藍, warning=橘, alert=紅, critical=深紅）
 * - 圖標顯示
 * - 建議行動項目
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { BowelMovementInsight } from '../hooks/useBowelMovementStats';

interface Props {
  insight: BowelMovementInsight;
  onPress?: () => void;
  showSuggestion?: boolean;
}

/**
 * 根據類型獲取圖標
 */
function getIcon(type: string): string {
  switch (type) {
    case 'info':
      return 'information';
    case 'warning':
      return 'alert';
    case 'alert':
      return 'alert-circle';
    case 'critical':
      return 'alert-octagon';
    default:
      return 'information';
  }
}

/**
 * 根據類型獲取顏色配置
 */
function getColorConfig(type: string) {
  switch (type) {
    case 'info':
      return {
        backgroundColor: '#EFF6FF',
        borderColor: '#3B82F6',
        iconColor: '#3B82F6',
        titleColor: '#1E40AF',
        textColor: '#1E3A8A',
      };
    case 'warning':
      return {
        backgroundColor: '#FFF7ED',
        borderColor: '#F59E0B',
        iconColor: '#F59E0B',
        titleColor: '#D97706',
        textColor: '#92400E',
      };
    case 'alert':
      return {
        backgroundColor: '#FEF2F2',
        borderColor: '#EF4444',
        iconColor: '#EF4444',
        titleColor: '#DC2626',
        textColor: '#991B1B',
      };
    case 'critical':
      return {
        backgroundColor: '#FEE2E2',
        borderColor: '#DC2626',
        iconColor: '#DC2626',
        titleColor: '#B91C1C',
        textColor: '#7F1D1D',
      };
    default:
      return {
        backgroundColor: '#F3F4F6',
        borderColor: '#6B7280',
        iconColor: '#6B7280',
        titleColor: '#374151',
        textColor: '#1F2937',
      };
  }
}

/**
 * 根據類型獲取優先級標籤
 */
function getPriorityLabel(type: string): string {
  switch (type) {
    case 'critical':
      return '🚨 緊急';
    case 'alert':
      return '⚠️ 警告';
    case 'warning':
      return '⚡ 注意';
    case 'info':
      return 'ℹ️ 提示';
    default:
      return '';
  }
}

/**
 * 洞察卡片組件
 */
export const InsightCard: React.FC<Props> = ({ insight, onPress, showSuggestion = true }) => {
  const colors = getColorConfig(insight.type);
  const icon = getIcon(insight.type);
  const priorityLabel = getPriorityLabel(insight.type);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Header: Icon + Priority + Title */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name={icon as any} size={24} color={colors.iconColor} />
          {priorityLabel && <Text style={styles.priorityLabel}>{priorityLabel}</Text>}
        </View>

        {onPress && (
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.iconColor} />
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.titleColor }]}>{insight.title}</Text>

      {/* Description */}
      <Text style={[styles.description, { color: colors.textColor }]}>{insight.description}</Text>

      {/* Suggestion (if enabled) */}
      {showSuggestion && insight.suggestion && (
        <View style={styles.suggestionContainer}>
          <MaterialCommunityIcons name="lightbulb-on" size={16} color={colors.iconColor} />
          <Text style={[styles.suggestionText, { color: colors.textColor }]}>
            {insight.suggestion}
          </Text>
        </View>
      )}
    </TouchableOpacity>
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
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    gap: 8,
  },
  suggestionText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontStyle: 'italic',
  },
});

export default InsightCard;
