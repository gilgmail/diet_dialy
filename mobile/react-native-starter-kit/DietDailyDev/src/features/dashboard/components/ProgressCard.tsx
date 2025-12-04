import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { colors, spacing, typography } from '@/theme'

export interface ProgressData {
  recordStreak?: {
    thisWeek: number
    lastWeek: number
    change: number
    changePercent: number
  }
  healthDays?: {
    thisWeek: number
    lastWeek: number
    change: number
    changePercent: number
  }
  coverage?: {
    thisWeek: number
    lastWeek: number
    change: number
    changePercent: number
  }
  symptomDays?: {
    thisWeek: number
    lastWeek: number
    change: number // 負數表示改善（症狀減少）
    changePercent: number
  }
}

interface ProgressCardProps {
  progress?: ProgressData | null
  isLoading?: boolean
  onPress?: () => void
}

/**
 * 進步卡片
 * 顯示本週 vs 上週的進步趨勢
 */
export function ProgressCard({ progress, isLoading, onPress }: ProgressCardProps) {
  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.loadingText}>載入進步資料中...</Text>
      </View>
    )
  }

  if (!progress) {
    return null
  }

  const hasProgress = 
    (progress.recordStreak && progress.recordStreak.change > 0) ||
    (progress.healthDays && progress.healthDays.change > 0) ||
    (progress.coverage && progress.coverage.change > 0) ||
    (progress.symptomDays && progress.symptomDays.change < 0) // 症狀減少是進步

  const renderProgressItem = (
    icon: string,
    label: string,
    thisWeek: number,
    lastWeek: number,
    change: number,
    changePercent: number,
    isPositive: boolean // true = 增加是好事，false = 減少是好事（如症狀）
  ) => {
    const isImproving = isPositive ? change > 0 : change < 0
    const changeColor = isImproving ? colors.success : change < 0 && !isPositive ? colors.success : colors.error
    const arrowIcon = isImproving ? 'arrow-up' : change < 0 ? 'arrow-down' : 'arrow-right'
    const arrowColor = isImproving ? colors.success : change < 0 && !isPositive ? colors.success : colors.text.secondary

    return (
      <View key={label} style={styles.progressItem}>
        <View style={styles.progressHeader}>
          <View style={styles.progressLabelRow}>
            <Icon name={icon} size={18} color={colors.primary[500]} />
            <Text style={styles.progressLabel}>{label}</Text>
          </View>
          {change !== 0 && (
            <View style={[styles.changeBadge, { backgroundColor: `${changeColor}15` }]}>
              <Icon name={arrowIcon} size={14} color={arrowColor} />
              <Text style={[styles.changeText, { color: changeColor }]}>
                {change > 0 ? '+' : ''}{change}
                {changePercent !== 0 && ` (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(0)}%)`}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.comparisonRow}>
          <View style={styles.weekItem}>
            <Text style={styles.weekLabel}>本週</Text>
            <Text style={[styles.weekValue, { color: colors.primary[500] }]}>{thisWeek}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.weekItem}>
            <Text style={styles.weekLabel}>上週</Text>
            <Text style={[styles.weekValue, { color: colors.text.secondary }]}>{lastWeek}</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <TouchableOpacity
      style={[styles.card, hasProgress && styles.cardWithProgress]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Icon name="trending-up" size={24} color={hasProgress ? colors.success : colors.primary[500]} />
          </View>
          <View>
            <Text style={styles.title}>本週進步總結</Text>
            <Text style={styles.subtitle}>
              {hasProgress ? '繼續保持這個好狀態！' : '保持穩定記錄也很棒！'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.progressList}>
        {progress.recordStreak && renderProgressItem(
          'fire',
          '連續記錄',
          progress.recordStreak.thisWeek,
          progress.recordStreak.lastWeek,
          progress.recordStreak.change,
          progress.recordStreak.changePercent,
          true
        )}

        {progress.healthDays && renderProgressItem(
          'heart-pulse',
          '健康狀態',
          progress.healthDays.thisWeek,
          progress.healthDays.lastWeek,
          progress.healthDays.change,
          progress.healthDays.changePercent,
          true
        )}

        {progress.coverage && renderProgressItem(
          'chart-line',
          '資料覆蓋率',
          progress.coverage.thisWeek,
          progress.coverage.lastWeek,
          progress.coverage.change,
          progress.coverage.changePercent,
          true
        )}

        {progress.symptomDays && renderProgressItem(
          'alert-circle',
          '症狀天數',
          progress.symptomDays.thisWeek,
          progress.symptomDays.lastWeek,
          progress.symptomDays.change,
          progress.symptomDays.changePercent,
          false // 症狀減少是好事
        )}
      </View>

      {onPress && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>查看詳細趨勢</Text>
          <Icon name="chevron-right" size={18} color={colors.text.secondary} />
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardWithProgress: {
    borderColor: `${colors.success}40`,
    backgroundColor: `${colors.success}05`,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary[500]}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
    fontSize: 12,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    padding: spacing.md,
  },
  progressList: {
    gap: spacing.md,
  },
  progressItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  changeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekItem: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  weekLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11,
  },
  weekValue: {
    ...typography.h3,
    fontWeight: '700',
    fontSize: 20,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  footerText: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 13,
  },
})
