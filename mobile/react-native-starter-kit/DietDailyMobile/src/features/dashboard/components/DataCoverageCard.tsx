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

  const getLevelInfo = (percent: number) => {
    if (percent >= 80) return { name: '💎 完美', color: colors.success }
    if (percent >= 60) return { name: '⭐ 優秀', color: colors.primary[500] }
    if (percent >= 40) return { name: '🌳 穩定', color: colors.warning }
    if (percent >= 20) return { name: '🌿 成長中', color: colors.info }
    return { name: '🌱 新手', color: colors.text.secondary }
  }

  const overallLevel = getLevelInfo(coverage.overall_data_status === 'sufficient' ? 60 : coverage.symptom_coverage_percent)

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
          <View style={styles.iconContainer}>
            <Icon name="chart-line" size={24} color={colors.primary[500]} />
          </View>
          <View>
            <Text style={styles.title}>資料充足度</Text>
            <Text style={styles.subtitle}>本週資料完整度</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${overallLevel.color}20` }]}>
          <Text style={[styles.statusText, { color: overallLevel.color }]}>
            {overallLevel.name}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* 總體進度條 */}
        <View style={styles.overallProgressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>總體進度</Text>
            <Text style={[styles.progressPercent, { color: overallLevel.color }]}>
              {coverage.symptom_coverage_percent.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${coverage.symptom_coverage_percent}%`,
                  backgroundColor: overallLevel.color,
                },
              ]}
            />
          </View>
        </View>

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

        {/* 提示文字 - 遊戲化設計 */}
        {coverage.overall_data_status !== 'sufficient' && (
          <View style={styles.hintSection}>
            <Icon name="star-outline" size={18} color={colors.warning} />
            <Text style={styles.hintText}>
              達到 60% 以上可解鎖完整 AI 分析功能 🎯
            </Text>
          </View>
        )}
        {coverage.overall_data_status === 'sufficient' && (
          <View style={[styles.hintSection, { backgroundColor: `${colors.success}10` }]}>
            <Icon name="check-circle" size={18} color={colors.success} />
            <Text style={[styles.hintText, { color: colors.success }]}>
              太棒了！資料充足，AI 分析已啟用 ✨
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
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
    fontSize: 12,
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
  overallProgressSection: {
    gap: spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 13,
  },
  progressPercent: {
    ...typography.h3,
    fontWeight: '700',
    fontSize: 18,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: colors.background,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
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
