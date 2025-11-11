import React, { useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useQuery } from '@tanstack/react-query'
import { format, startOfDay } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useAuthStore } from '@/shared/stores/authStore'
import { FoodDiaryService } from '@/features/food-diary/services/FoodDiaryService'
import { SymptomDiaryService } from '@/features/symptom-diary/services/SymptomDiaryService'
import { MEAL_TYPES } from '@/features/food-diary/types'
import type { FoodEntry } from '@/features/food-diary/types'
import type { SymptomEntry } from '@/features/symptom-diary/types'
import { SEVERITY_LEVELS } from '@/features/symptom-diary/types'
import type { MainStackParamList } from '@/app/navigation/types'
import { colors, typography, spacing } from '@/theme'

export function TodayScreen() {
  const { user } = useAuthStore()
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const today = useMemo(() => startOfDay(new Date()), [])
  const todayKey = useMemo(() => format(today, 'yyyy-MM-dd'), [today])

  // Fetch today's food entries
  const {
    data: foodEntries = [],
    isLoading: isLoadingFood,
    refetch: refetchFood,
  } = useQuery({
    queryKey: ['foodEntries', user?.id, todayKey],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await FoodDiaryService.getFoodEntriesByDate(user.id, today)
      return result.data || []
    },
    enabled: !!user?.id,
  })

  // Fetch today's symptom entries
  const {
    data: symptomEntries = [],
    isLoading: isLoadingSymptoms,
    refetch: refetchSymptoms,
  } = useQuery({
    queryKey: ['symptomEntries', user?.id, todayKey],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await SymptomDiaryService.getSymptomEntriesByDateRange(
        user.id,
        today,
        today
      )
      return result.data || []
    },
    enabled: !!user?.id,
  })

  const isRefreshing = isLoadingFood || isLoadingSymptoms

  const handleRefresh = () => {
    refetchFood()
    refetchSymptoms()
  }

  // Calculate meal stats
  const mealStats = useMemo(() => {
    const stats = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
    foodEntries.forEach((entry: FoodEntry) => {
      if (entry.meal_type in stats) {
        stats[entry.meal_type as keyof typeof stats]++
      }
    })
    return stats
  }, [foodEntries])

  // Group food entries by meal type
  const foodByMeal = useMemo(() => {
    const grouped: Record<string, FoodEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }
    foodEntries.forEach((entry: FoodEntry) => {
      if (entry.meal_type in grouped) {
        grouped[entry.meal_type].push(entry)
      }
    })
    return grouped
  }, [foodEntries])

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>今日記錄</Text>
        <Text style={styles.headerSubtitle}>
          {format(today, 'yyyy年MM月dd日 (EEEE)', { locale: zhTW })}
        </Text>
      </View>

      {/* Meal Stats Overview */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>今日飲食統計</Text>
        <View style={styles.statsRow}>
          {MEAL_TYPES.map((meal) => {
            const count = mealStats[meal.value as keyof typeof mealStats] ?? 0
            return (
              <View key={meal.value} style={styles.statItem}>
                <Text style={styles.statIcon}>{meal.icon}</Text>
                <Text style={styles.statLabel}>{meal.label}</Text>
                <Text style={styles.statCount}>{count} 筆</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* Food Timeline */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="food-apple" size={24} color={colors.success} />
          <Text style={styles.sectionTitle}>飲食記錄</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{foodEntries.length}</Text>
          </View>
        </View>

        {foodEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="food-off" size={48} color={colors.text.tertiary} />
            <Text style={styles.emptyStateText}>今天還沒有飲食記錄</Text>
            <Text style={styles.emptyStateHint}>點擊底部中間 + 按鈕開始記錄</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {MEAL_TYPES.map((meal) => {
              const entries = foodByMeal[meal.value] || []
              if (entries.length === 0) return null

              return (
                <View key={meal.value} style={styles.timelineSection}>
                  <View style={styles.timelineMealHeader}>
                    <Text style={styles.timelineMealIcon}>{meal.icon}</Text>
                    <Text style={styles.timelineMealLabel}>{meal.label}</Text>
                    <Text style={styles.timelineMealCount}>{entries.length} 筆</Text>
                  </View>
                  {entries.map((entry: FoodEntry, index: number) => (
                    <View
                      key={entry.id}
                      style={[
                        styles.timelineItem,
                        index === entries.length - 1 && styles.timelineItemLast,
                      ]}
                    >
                      <View style={styles.timelineDot} />
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineFood}>{entry.food_name}</Text>
                        <Text style={styles.timelineTime}>
                          {format(new Date(entry.consumed_at), 'HH:mm')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* Symptom List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="medical-bag" size={24} color={colors.error} />
          <Text style={styles.sectionTitle}>症狀記錄</Text>
          <View style={[styles.badge, styles.symptomBadge]}>
            <Text style={styles.badgeText}>{symptomEntries.length}</Text>
          </View>
        </View>

        {symptomEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="emoticon-happy" size={48} color={colors.success} />
            <Text style={[styles.emptyStateText, { color: colors.success }]}>
              今天沒有症狀記錄，感覺很好！
            </Text>
          </View>
        ) : (
          <View style={styles.symptomList}>
            {symptomEntries.map((entry: SymptomEntry) => {
              const severityInfo = SEVERITY_LEVELS.find((s) => s.value === entry.severity)
              return (
                <View key={entry.id} style={styles.symptomItem}>
                  <Text style={styles.symptomIcon}>{severityInfo?.icon}</Text>
                  <View style={styles.symptomContent}>
                    <Text style={styles.symptomName}>{entry.symptom_name}</Text>
                    <View style={styles.symptomMeta}>
                      <Text style={styles.symptomSeverity}>{severityInfo?.label}</Text>
                      <Text style={styles.symptomTime}>
                        {format(new Date(entry.recorded_at), 'HH:mm')}
                      </Text>
                    </View>
                    {entry.notes && (
                      <Text style={styles.symptomNotes}>{entry.notes}</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* Bottom Spacer */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  statsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  statCount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    minWidth: 24,
    alignItems: 'center',
  },
  symptomBadge: {
    backgroundColor: colors.error + '20',
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  timeline: {
    paddingHorizontal: spacing.lg,
  },
  timelineSection: {
    marginBottom: spacing.lg,
  },
  timelineMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  timelineMealIcon: {
    fontSize: 20,
  },
  timelineMealLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  timelineMealCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    marginLeft: 10,
  },
  timelineItemLast: {
    borderLeftColor: 'transparent',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginLeft: -spacing.md - 5,
    marginTop: 6,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: spacing.md,
    paddingBottom: spacing.md,
  },
  timelineFood: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  timelineTime: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  symptomList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  symptomItem: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error + '20',
    gap: spacing.md,
  },
  symptomIcon: {
    fontSize: 24,
  },
  symptomContent: {
    flex: 1,
  },
  symptomName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  symptomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  symptomSeverity: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    fontWeight: typography.fontWeight.medium,
  },
  symptomTime: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  symptomNotes: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: spacing.xl,
  },
})
