import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import type { DataCoverageInfo } from '../types'
import { colors, spacing, typography } from '@/theme'

interface DataCoverageCardProps {
  coverage: DataCoverageInfo
  onPress?: () => void
}

export function DataCoverageCard({ coverage, onPress }: DataCoverageCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sufficient':
        return colors.success
      case 'partial':
        return colors.warning
      case 'insufficient':
        return colors.error
      default:
        return colors.text.secondary
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sufficient':
        return '充足'
      case 'partial':
        return '部分'
      case 'insufficient':
        return '不足'
      default:
        return '未知'
    }
  }

  const getCoverageColor = (percent: number) => {
    if (percent >= 60) return colors.success
    if (percent >= 40) return colors.warning
    return colors.error
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      symptoms: '症狀',
      food: '飲食',
      medications: '藥物',
      sleep: '睡眠',
      exercise: '運動',
    }
    return labels[category] || category
  }

  const statusColor = getStatusColor(coverage.overall_data_status)
  const statusLabel = getStatusLabel(coverage.overall_data_status)

  return (
    <TouchableOpacity
      style={[styles.card, onPress && styles.cardPressable]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="chart-line" size={20} color={colors.primary} />
          <Text style={styles.title}>資料充足度</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* 覆蓋率統計 */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>症狀</Text>
            <Text style={[styles.statValue, { color: getCoverageColor(coverage.symptom_coverage_percent) }]}>
              {coverage.symptom_coverage_percent.toFixed(0)}%
            </Text>
            <Text style={styles.statDetail}>
              {coverage.symptom_entry_days}/{coverage.total_days} 天
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>飲食</Text>
            <Text style={[styles.statValue, { color: getCoverageColor(coverage.food_coverage_percent) }]}>
              {coverage.food_coverage_percent.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>藥物</Text>
            <Text style={[styles.statValue, { color: getCoverageColor(coverage.medication_coverage_percent) }]}>
              {coverage.medication_coverage_percent.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>睡眠</Text>
            <Text style={[styles.statValue, { color: getCoverageColor(coverage.sleep_coverage_percent) }]}>
              {coverage.sleep_coverage_percent.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>運動</Text>
            <Text style={[styles.statValue, { color: getCoverageColor(coverage.exercise_coverage_percent) }]}>
              {coverage.exercise_coverage_percent.toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* 缺漏項目 */}
        {coverage.missing_categories.length > 0 && (
          <View style={styles.missingSection}>
            <Text style={styles.missingTitle}>缺漏項目：</Text>
            <View style={styles.missingTags}>
              {coverage.missing_categories.map((cat) => (
                <View key={cat} style={styles.missingTag}>
                  <Text style={styles.missingTagText}>{getCategoryLabel(cat)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 提示文字 */}
        {coverage.overall_data_status !== 'sufficient' && (
          <View style={styles.hintSection}>
            <Icon name="information-outline" size={16} color={colors.warning} />
            <Text style={styles.hintText}>
              建議提高記錄頻率，達到 60% 以上可啟用完整 AI 分析
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressable: {
    // Add shadow or elevation for pressable cards
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  content: {
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h3,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statDetail: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  missingSection: {
    marginTop: spacing.xs,
  },
  missingTitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  missingTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  missingTag: {
    backgroundColor: `${colors.error}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  missingTagText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 11,
  },
  hintSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    padding: spacing.sm,
    backgroundColor: `${colors.warning}10`,
    borderRadius: 8,
  },
  hintText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
    fontSize: 11,
  },
})

