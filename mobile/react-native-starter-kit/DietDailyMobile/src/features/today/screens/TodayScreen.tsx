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
import { HealthLogService } from '@/features/health-logs/services/HealthLogService'
import type {
  ActivitySessionEntry,
  MedicationLogEntry,
  SleepSessionEntry,
} from '@/features/health-logs/types'

;(globalThis as any).mLogs = (globalThis as any).mLogs ?? []
;(globalThis as any).sSessions = (globalThis as any).sSessions ?? []
;(globalThis as any).aSessions = (globalThis as any).aSessions ?? []

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

  const medicationQuery = useQuery({
    queryKey: ['todayMedicationLogs', user?.id, todayKey],
    queryFn: async () => {
      if (!user?.id) return []
      return HealthLogService.getMedicationLogsByDate(user.id, today)
    },
    enabled: !!user?.id,
  })
  const mLogs = (medicationQuery.data ?? []) as MedicationLogEntry[]
  ;(globalThis as any).mLogs = mLogs

  const sleepQuery = useQuery({
    queryKey: ['todaySleepSessions', user?.id, todayKey],
    queryFn: async () => {
      if (!user?.id) return []
      return HealthLogService.getSleepSessionsByDate(user.id, today)
    },
    enabled: !!user?.id,
  })
  const sSessions = (sleepQuery.data ?? []) as SleepSessionEntry[]
  ;(globalThis as any).sSessions = sSessions

  const activityQuery = useQuery({
    queryKey: ['todayActivitySessions', user?.id, todayKey],
    queryFn: async () => {
      if (!user?.id) return []
      return HealthLogService.getActivitySessionsByDate(user.id, today)
    },
    enabled: !!user?.id,
  })
  const aSessions = (activityQuery.data ?? []) as ActivitySessionEntry[]
  ;(globalThis as any).aSessions = aSessions

  const isRefreshing =
    isLoadingFood ||
    isLoadingSymptoms ||
    medicationQuery.isLoading ||
    sleepQuery.isLoading ||
    activityQuery.isLoading

  const handleRefresh = () => {
    refetchFood()
    refetchSymptoms()
    medicationQuery.refetch()
    sleepQuery.refetch()
    activityQuery.refetch()
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
  medicationBadge: {
    backgroundColor: colors.primary[100],
  },
  sleepBadge: {
    backgroundColor: colors.secondary[100],
  },
  activityBadge: {
    backgroundColor: colors.info + '30',
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
  listCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  listCardTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  listCardTime: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  listCardMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  listCardNote: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
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
      {/* Medication */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="pill" size={24} color={colors.primary[500]} />
          <Text style={styles.sectionTitle}>用藥紀錄</Text>
          <View style={[styles.badge, styles.medicationBadge]}>
            <Text style={styles.badgeText}>{mLogs.length}</Text>
          </View>
        </View>
        {mLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>今天尚未記錄用藥</Text>
            <Text style={styles.emptyStateHint}>從 + 選單紀錄針劑或口服情況</Text>
          </View>
        ) : (
          mLogs.map((log) => (
            <View key={log.id} style={styles.listCard}>
              <View style={styles.listCardHeader}>
                <Text style={styles.listCardTitle}>{log.regimen_name}</Text>
                <Text style={styles.listCardTime}>
                  {format(new Date(log.taken_at), 'HH:mm')}
                </Text>
              </View>
              <Text style={styles.listCardMeta}>
                {log.dose || '未填劑量'} ·{' '}
                {log.adherence_status === 'taken'
                  ? '準時'
                  : log.adherence_status === 'delayed'
                  ? '延遲'
                  : log.adherence_status === 'skipped'
                  ? '略過'
                  : '忘記'}
                {log.symptom_triggered ? ' · 症狀觸發' : ''}
              </Text>
              {log.notes ? <Text style={styles.listCardNote}>{log.notes}</Text> : null}
            </View>
          ))
        )}
      </View>

      {/* Sleep */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="sleep" size={24} color={colors.secondary[500]} />
          <Text style={styles.sectionTitle}>睡眠紀錄</Text>
          <View style={[styles.badge, styles.sleepBadge]}>
            <Text style={styles.badgeText}>{sSessions.length}</Text>
          </View>
        </View>
        {sSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>今天尚未記錄睡眠</Text>
            <Text style={styles.emptyStateHint}>可在早餐前快速填寫</Text>
          </View>
        ) : (
          sSessions.map((session) => (
            <View key={session.id} style={styles.listCard}>
              <View style={styles.listCardHeader}>
                <Text style={styles.listCardTitle}>
                  {session.is_main_sleep ? '主要睡眠' : '小睡'}
                </Text>
                <Text style={styles.listCardTime}>
                  {session.start_time && session.end_time
                    ? `${format(new Date(session.start_time), 'HH:mm')} - ${format(
                        new Date(session.end_time),
                        'HH:mm'
                      )}`
                    : session.planned_start_time
                    ? `預計 ${session.planned_start_time}`
                    : '未填時間'}
                </Text>
              </View>
              <Text style={styles.listCardMeta}>
                {session.duration_minutes
                  ? `${(session.duration_minutes / 60).toFixed(1)} 小時`
                  : session.planned_duration_minutes
                  ? `${(session.planned_duration_minutes / 60).toFixed(1)} 小時 (預計)`
                  : '未填時長'}
                {session.quality_score ? ` · 品質 ${session.quality_score}/5` : ''}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="run" size={24} color={colors.info} />
          <Text style={styles.sectionTitle}>運動紀錄</Text>
          <View style={[styles.badge, styles.activityBadge]}>
            <Text style={styles.badgeText}>{aSessions.length}</Text>
          </View>
        </View>
        {aSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>今天尚未記錄運動</Text>
            <Text style={styles.emptyStateHint}>快走 30 分鐘也能算喔！</Text>
          </View>
        ) : (
          aSessions.map((activity) => (
            <View key={activity.id} style={styles.listCard}>
              <View style={styles.listCardHeader}>
                <Text style={styles.listCardTitle}>
                  {activity.activity_title || activity.activity_type}
                </Text>
                <Text style={styles.listCardTime}>
                  {activity.duration_minutes
                    ? `${activity.duration_minutes} 分`
                    : activity.start_time && activity.end_time
                    ? `${format(new Date(activity.start_time), 'HH:mm')} - ${format(
                        new Date(activity.end_time),
                        'HH:mm'
                      )}`
                    : ''}
                </Text>
              </View>
              <Text style={styles.listCardMeta}>
                {activity.intensity ? `${activity.intensity} 強度` : '一般強度'}
              </Text>
              {activity.notes ? <Text style={styles.listCardNote}>{activity.notes}</Text> : null}
            </View>
          ))
        )}
      </View>
