import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import type { StreakData } from '@/features/dashboard/hooks/useStreak'
import type { DataCoverageInfo, MissingDataAlert } from '@/features/dashboard/types'
import { colors, spacing, typography } from '@/theme'

interface GamificationBoardProps {
  streak?: StreakData | null
  coverage?: DataCoverageInfo | null
  alerts?: MissingDataAlert[]
  onNavigate?: (category: string) => void
}

const streakMilestones = [7, 14, 30, 60, 100]

const primary = colors.primary[600] || '#2563EB'
const secondary = colors.secondary?.[500] || '#8B5CF6'

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

const getCategoryColor = (category: string) => {
  const map: Record<string, string> = {
    symptoms: colors.error,
    food: primary,
    medications: colors.warning,
    sleep: colors.info,
    exercise: colors.success,
  }
  return map[category] || colors.text.secondary
}

const getLevelInfo = (percent: number) => {
  if (percent >= 80) return { label: '💎 完美', color: colors.success }
  if (percent >= 60) return { label: '⭐ 優秀', color: primary }
  if (percent >= 40) return { label: '🌳 穩定', color: colors.warning }
  if (percent >= 20) return { label: '🌿 成長', color: colors.info }
  return { label: '🌱 新手', color: colors.text.secondary }
}

const getNextStreakMilestone = (days: number) =>
  streakMilestones.find((milestone) => days < milestone)

const buildQuests = (alerts: MissingDataAlert[] | undefined, onNavigate?: (category: string) => void) => {
  if (alerts && alerts.length > 0) {
    return alerts.slice(0, 3).map((alert) => ({
      key: `${alert.category}-${alert.missing_days}`,
      title: `${getCategoryLabel(alert.category)}補齊`,
      detail: `缺少 ${alert.missing_days} 天，補齊就能提高覆蓋率`,
      category: alert.category,
      color: getCategoryColor(alert.category),
      onPress: () => onNavigate?.(alert.category),
    }))
  }

  const defaults = [
    {
      key: 'symptoms',
      title: '填寫今日症狀',
      detail: '累積習慣分 +10，火焰不熄滅',
      category: 'symptoms',
      color: colors.error,
    },
    {
      key: 'food',
      title: '上傳一餐飲食',
      detail: '補齊飲食覆蓋率，AI 更懂你的飲食節奏',
      category: 'food',
      color: primary,
    },
    {
      key: 'sleep',
      title: '記錄睡眠時數',
      detail: '幫助 AI 理解恢復狀態',
      category: 'sleep',
      color: colors.info,
    },
  ]

  return defaults.map((quest) => ({
    ...quest,
    onPress: () => onNavigate?.(quest.category),
  }))
}

const buildAchievements = (streakDays: number, coveragePercent: number) => {
  return [
    {
      key: 'streak7',
      icon: 'fire',
      title: '新手記錄員',
      detail: '連續 7 天記錄',
      achieved: streakDays >= 7,
      color: colors.error,
    },
    {
      key: 'coverage60',
      icon: 'shield-star',
      title: '資料收集者',
      detail: '覆蓋率達 60%',
      achieved: coveragePercent >= 60,
      color: primary,
    },
    {
      key: 'streak30',
      icon: 'run-fast',
      title: '持續追蹤者',
      detail: '連續 30 天不間斷',
      achieved: streakDays >= 30,
      color: colors.warning,
    },
    {
      key: 'coverage80',
      icon: 'trophy',
      title: '資料大師',
      detail: '覆蓋率達 80%',
      achieved: coveragePercent >= 80,
      color: colors.success,
    },
  ]
}

export function GamificationBoard({ streak, coverage, alerts, onNavigate }: GamificationBoardProps) {
  const streakDays = streak?.currentStreak ?? 0
  const longestStreak = streak?.longestStreak ?? 0
  const coveragePercent = coverage?.symptom_coverage_percent ?? 0
  const habitScore = Math.min(streakDays, 30) / 30 * 100
  const readinessScore = Math.round(habitScore * 0.4 + coveragePercent * 0.6)
  const nextStreakMilestone = getNextStreakMilestone(streakDays)
  const level = getLevelInfo(coveragePercent)
  const coverageGoal = coveragePercent < 60 ? 60 : coveragePercent < 80 ? 80 : 100
  const coverageGap = Math.max(0, Math.round(coverageGoal - coveragePercent))
  const quests = buildQuests(alerts, onNavigate)
  const achievements = buildAchievements(streakDays, coveragePercent)

  const nextUnlockLabel =
    coveragePercent >= 60
      ? coveragePercent >= 80
        ? '保持 80% 以上，解鎖更準確的週報'
        : 'AI 分析已開啟，挑戰 80% 提升精確度'
      : `再提升 ${coverageGap}% 覆蓋率即可解鎖 AI 分析`

  return (
    <View style={styles.card}>
      <View style={styles.hero}>
        <View style={styles.heroDecorationOne} />
        <View style={styles.heroDecorationTwo} />

        <View style={styles.heroHeader}>
          <View style={styles.levelBadge}>
            <Text style={[styles.levelText, { color: level.color }]}>{level.label}</Text>
          </View>
          <View style={styles.scorePill}>
            <Icon name="lightning-bolt" size={14} color={colors.white} />
            <Text style={styles.scoreValue}>{readinessScore}%</Text>
            <Text style={styles.scoreLabel}>準備度</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>健康冒險進行中</Text>
        <Text style={styles.heroSubtitle}>{nextUnlockLabel}</Text>

        <View style={styles.heroStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>連續</Text>
            <Text style={styles.statValue}>
              {streakDays} <Text style={styles.statUnit}>天</Text>
            </Text>
            <Text style={styles.statHint}>
              {nextStreakMilestone
                ? `距離 ${nextStreakMilestone} 天還差 ${nextStreakMilestone - streakDays}`
                : '保持火焰，進入專家模式'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>覆蓋率</Text>
            <Text style={[styles.statValue, { color: level.color }]}>
              {coveragePercent.toFixed(0)}%
            </Text>
            <Text style={styles.statHint}>
              {coverageGap > 0 ? `距離目標 ${coverageGoal}%` : '已達成目標'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>最長</Text>
            <Text style={styles.statValue}>
              {longestStreak} <Text style={styles.statUnit}>天</Text>
            </Text>
            <Text style={styles.statHint}>刷新個人紀錄吧</Text>
          </View>
        </View>

        <View style={styles.progressGroup}>
          <View style={styles.progressHeader}>
            <View style={styles.progressLabelRow}>
              <Icon name="fire" size={16} color={colors.error} />
              <Text style={styles.progressLabel}>習慣火焰</Text>
            </View>
            <Text style={styles.progressValue}>{habitScore.toFixed(0)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(habitScore, 100)}%`, backgroundColor: colors.error }]} />
          </View>
          <Text style={styles.progressHint}>
            {nextStreakMilestone
              ? `再記錄 ${nextStreakMilestone - streakDays} 天即可解鎖 ${nextStreakMilestone} 天徽章`
              : '保持當前節奏，火焰不熄'}
          </Text>
        </View>

        <View style={styles.progressGroup}>
          <View style={styles.progressHeader}>
            <View style={styles.progressLabelRow}>
              <Icon name="checkbox-marked-circle-outline" size={16} color={level.color} />
              <Text style={styles.progressLabel}>資料充足度</Text>
            </View>
            <Text style={[styles.progressValue, { color: level.color }]}>{coveragePercent.toFixed(0)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(coveragePercent, 100)}%`, backgroundColor: level.color }]} />
          </View>
          <Text style={styles.progressHint}>{nextUnlockLabel}</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>今日任務</Text>
        <Text style={styles.sectionSubtitle}>完成任務推進進度條</Text>
      </View>
      <View style={styles.questList}>
        {quests.map((quest) => (
          <TouchableOpacity
            key={quest.key}
            style={[styles.questCard, { borderColor: `${quest.color}40`, backgroundColor: `${quest.color}12` }]}
            activeOpacity={0.8}
            onPress={quest.onPress}
          >
            <View style={[styles.questIcon, { backgroundColor: `${quest.color}25` }]}>
              <Icon name="target" size={18} color={quest.color} />
            </View>
            <View style={styles.questBody}>
              <Text style={[styles.questTitle, { color: quest.color }]}>{quest.title}</Text>
              <Text style={styles.questDetail}>{quest.detail}</Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>成就預覽</Text>
        <Text style={styles.sectionSubtitle}>收集徽章，解鎖更多鼓勵</Text>
      </View>
      <View style={styles.achievementGrid}>
        {achievements.map((item) => (
          <View
            key={item.key}
            style={[
              styles.achievementCard,
              item.achieved && { borderColor: `${item.color}50`, backgroundColor: `${item.color}12` },
            ]}
          >
            <View style={[styles.achievementIcon, { backgroundColor: `${item.color}18` }]}>
              <Icon
                name={item.icon}
                size={18}
                color={item.achieved ? item.color : colors.text.secondary}
              />
            </View>
            <View style={styles.achievementBody}>
              <View style={styles.achievementTitleRow}>
                <Text style={styles.achievementTitle}>{item.title}</Text>
                {item.achieved && (
                  <View style={[styles.achievementBadge, { backgroundColor: `${item.color}30` }]}>
                    <Icon name="check-circle" size={14} color={item.color} />
                    <Text style={[styles.achievementBadgeText, { color: item.color }]}>已解鎖</Text>
                  </View>
                )}
              </View>
              <Text style={styles.achievementDetail}>{item.detail}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: `${primary}22`,
    gap: spacing.md,
  },
  hero: {
    backgroundColor: colors.primary[900] || '#0F172A',
    borderRadius: 16,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  heroDecorationOne: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${secondary}25`,
    top: -60,
    right: -40,
    transform: [{ rotate: '12deg' }],
  },
  heroDecorationTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${colors.success}25`,
    bottom: -40,
    left: -20,
    transform: [{ rotate: '-8deg' }],
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.white}10`,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  levelText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: `${colors.white}10`,
  },
  scoreValue: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
  },
  scoreLabel: {
    ...typography.caption,
    color: `${colors.white}80`,
    fontSize: 11,
  },
  heroTitle: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    color: `${colors.white}85`,
    marginTop: spacing.xs,
    lineHeight: 18,
    fontSize: 13,
  },
  heroStats: {
    flexDirection: 'row',
    marginTop: spacing.md,
    backgroundColor: `${colors.white}06`,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
  },
  statLabel: {
    ...typography.caption,
    color: `${colors.white}80`,
    fontSize: 12,
  },
  statValue: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
    fontSize: 22,
  },
  statUnit: {
    ...typography.caption,
    color: `${colors.white}70`,
  },
  statHint: {
    ...typography.caption,
    color: `${colors.white}70`,
    fontSize: 11,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: `${colors.white}10`,
  },
  progressGroup: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressLabel: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  progressValue: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: `${colors.white}15`,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressHint: {
    ...typography.caption,
    color: `${colors.white}75`,
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
    fontSize: 18,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
  },
  questList: {
    gap: spacing.sm,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  questIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  questBody: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  questTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 15,
  },
  questDetail: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  achievementCard: {
    width: '48%',
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  achievementIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementBody: {
    flex: 1,
    gap: spacing.xs / 2,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  achievementTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
    fontSize: 14,
    flexShrink: 1,
  },
  achievementDetail: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 16,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  achievementBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
})
