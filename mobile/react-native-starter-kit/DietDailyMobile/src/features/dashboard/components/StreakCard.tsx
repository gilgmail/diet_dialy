import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { colors, spacing, typography } from '@/theme'

interface StreakCardProps {
  currentStreak: number
  longestStreak: number
  milestones?: number[]
}

export function StreakCard({ currentStreak, longestStreak, milestones = [] }: StreakCardProps) {
  const getStreakEmoji = (days: number) => {
    if (days >= 100) return '🔥🔥🔥'
    if (days >= 60) return '🔥🔥'
    if (days >= 30) return '🔥'
    if (days >= 14) return '✨'
    if (days >= 7) return '⭐'
    return '🌱'
  }

  const getStreakColor = (days: number) => {
    if (days >= 100) return colors.error // 紅色火焰
    if (days >= 60) return colors.warning // 橙色
    if (days >= 30) return colors.primary[500] // 藍色
    if (days >= 14) return colors.success // 綠色
    return colors.text.secondary
  }

  const getNextMilestone = () => {
    const milestones_list = [7, 14, 30, 60, 100]
    for (const milestone of milestones_list) {
      if (currentStreak < milestone) {
        return milestone
      }
    }
    return null
  }

  const nextMilestone = getNextMilestone()
  const streakColor = getStreakColor(currentStreak)
  const streakEmoji = getStreakEmoji(currentStreak)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${streakColor}15` }]}>
            <Text style={styles.emoji}>{streakEmoji}</Text>
          </View>
          <View>
            <Text style={styles.title}>連續記錄</Text>
            <Text style={styles.subtitle}>保持你的記錄習慣</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* 當前連續天數 */}
        <View style={styles.streakDisplay}>
          <Text style={[styles.streakNumber, { color: streakColor }]}>
            {currentStreak}
          </Text>
          <Text style={styles.streakLabel}>天</Text>
        </View>

        {/* 最長記錄 */}
        {longestStreak > currentStreak && (
          <View style={styles.longestStreak}>
            <Icon name="trophy" size={16} color={colors.warning} />
            <Text style={styles.longestStreakText}>
              最長記錄：{longestStreak} 天
            </Text>
          </View>
        )}

        {/* 下一個里程碑 */}
        {nextMilestone && (
          <View style={styles.milestoneSection}>
            <View style={styles.milestoneProgress}>
              <View
                style={[
                  styles.milestoneProgressBar,
                  {
                    width: `${(currentStreak / nextMilestone) * 100}%`,
                    backgroundColor: streakColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.milestoneText}>
              再記錄 {nextMilestone - currentStreak} 天即可達成 {nextMilestone} 天里程碑 🎯
            </Text>
          </View>
        )}

        {/* 已達成的里程碑 */}
        {milestones.length > 0 && (
          <View style={styles.milestonesList}>
            <Text style={styles.milestonesTitle}>已達成里程碑：</Text>
            <View style={styles.milestonesBadges}>
              {milestones.map((milestone) => (
                <View key={milestone} style={[styles.milestoneBadge, { backgroundColor: `${streakColor}20` }]}>
                  <Text style={[styles.milestoneBadgeText, { color: streakColor }]}>
                    {milestone} 天
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 鼓勵文字 */}
        {currentStreak === 0 && (
          <View style={styles.encouragement}>
            <Text style={styles.encouragementText}>
              開始記錄，建立你的健康習慣吧！💪
            </Text>
          </View>
        )}
        {currentStreak > 0 && currentStreak < 7 && (
          <View style={styles.encouragement}>
            <Text style={styles.encouragementText}>
              繼續保持，你做得很好！✨
            </Text>
          </View>
        )}
        {currentStreak >= 7 && (
          <View style={styles.encouragement}>
            <Text style={[styles.encouragementText, { color: streakColor }]}>
              太棒了！你已經建立了良好的記錄習慣！🎉
            </Text>
          </View>
        )}
      </View>
    </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
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
  content: {
    gap: spacing.md,
  },
  streakDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
  },
  streakLabel: {
    ...typography.h3,
    color: colors.text.secondary,
    fontSize: 20,
  },
  longestStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  longestStreakText: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 13,
  },
  milestoneSection: {
    gap: spacing.xs,
  },
  milestoneProgress: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  milestoneProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  milestoneText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: 12,
  },
  milestonesList: {
    gap: spacing.xs,
  },
  milestonesTitle: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
  },
  milestonesBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  milestoneBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  milestoneBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  encouragement: {
    padding: spacing.sm,
    backgroundColor: `${colors.primary[500]}10`,
    borderRadius: 8,
  },
  encouragementText: {
    ...typography.body,
    color: colors.text.primary,
    textAlign: 'center',
    fontSize: 13,
  },
})
