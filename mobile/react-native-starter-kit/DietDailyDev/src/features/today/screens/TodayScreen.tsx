import React, { useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { useNavigation, TabActions } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, startOfDay } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useAuthStore } from '@/shared/stores/authStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { DEFAULT_SETTINGS } from '@/features/settings/types'
import { FoodDiaryService } from '@/features/food-diary/services/FoodDiaryService'
import { SymptomDiaryService } from '@/features/symptom-diary/services/SymptomDiaryService'
import { BowelDiaryService } from '@/features/bowel-diary/services/BowelDiaryService'
import { MEAL_TYPES } from '@/features/food-diary/types'
import { SEVERITY_LEVELS } from '@/features/symptom-diary/types'
import type { MainStackParamList } from '@/app/navigation/types'
import { colors, typography, spacing } from '@/theme'
import { useStreak } from '@/features/dashboard/hooks/useStreak'
import { useDataCoverage, useMissingDataAlerts } from '@/features/dashboard/hooks/useDataCoverage'
import { GamificationHeroCard, buildGamificationSnapshot } from '@/features/insights/components/GamificationBoard'

;(globalThis as any).mLogs = (globalThis as any).mLogs ?? []
;(globalThis as any).sSessions = (globalThis as any).sSessions ?? []
;(globalThis as any).aSessions = (globalThis as any).aSessions ?? []
;(globalThis as any).regimenSummaries = (globalThis as any).regimenSummaries ?? []

// Removed TabType - only summary view now

type SummaryCardConfig = {
  key: string
  title: string
  count: number
  icon: string
  accent: string
  hint: string
  onPress: () => void
}

type TimelineItem = {
  id: string
  type: 'food' | 'symptom' | 'bowel' | 'medication' | 'sleep' | 'activity'
  title: string
  timestamp: string | null
  meta?: string
  icon: string
  color: string
}


type TodayNavigationProp = NativeStackNavigationProp<MainStackParamList>

const findTabNavigator = (nav: any) => {
  let current = nav
  while (current) {
    const state = current.getState?.()
    if (state?.type === 'tab') {
      return current
    }
    current = current.getParent?.()
  }
  return null
}

export function TodayScreen() {
  const { user } = useAuthStore()
  const { settings, initializeSettings } = useSettingsStore()
  // 使用 root stack navigation，便於跳轉 MainTabs / Add* 畫面
  const navigation = useNavigation<TodayNavigationProp>()
  const queryClient = useQueryClient()
  const today = useMemo(() => startOfDay(new Date()), [])
  const todayKey = useMemo(() => format(today, 'yyyy-MM-dd'), [today])

  // Tab state removed - only summary view now


  const { streak } = useStreak()
  const { coverage: dataCoverage } = useDataCoverage()
  const { alerts: missingAlerts } = useMissingDataAlerts(1)
  // 優先使用模組系統的 hero 開關，向後兼容 gamificationHeroEnabled
  const gamificationHeroEnabled =
    settings.modules?.hero ?? settings.gamificationHeroEnabled ?? DEFAULT_SETTINGS.modules?.hero ?? true

  const gamificationSnapshot = useMemo(
    () => buildGamificationSnapshot(streak, dataCoverage),
    [streak, dataCoverage]
  )

  const handleOpenQuests = useCallback(() => {
    const tabNav = findTabNavigator(navigation)
    if (tabNav) {
      tabNav.dispatch(TabActions.jumpTo('Insights', { tab: 'quests' }))
      return
    }

    const parentStack = navigation.getParent<NativeStackNavigationProp<MainStackParamList>>()
    if (parentStack) {
      parentStack.navigate('MainTabs', {
        screen: 'Insights',
        params: { tab: 'quests' },
      })
      return
    }
  }, [navigation])

  // Initialize settings when user is available
  React.useEffect(() => {
    if (user?.id) {
      initializeSettings(user.id)
    }
  }, [user?.id, initializeSettings])


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

  // Fetch today's bowel entries
  const {
    data: bowelEntries = [],
    isLoading: isLoadingBowel,
    refetch: refetchBowel,
  } = useQuery({
    queryKey: ['bowelEntries', user?.id, todayKey],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await BowelDiaryService.getBowelMovementsByDateString(user.id, todayKey)
      return result.data || []
    },
    enabled: !!user?.id,
  })


  const isRefreshing =
    isLoadingFood ||
    isLoadingSymptoms ||
    isLoadingBowel

  const handleRefresh = () => {
    refetchFood()
    refetchSymptoms()
    refetchBowel()
  }

  const mealLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    MEAL_TYPES.forEach((meal) => {
      map[meal.value] = meal.label
    })
    return map
  }, [])

  // Severity level translation map
  const SEVERITY_LABELS: Record<string, string> = useMemo(
    () => ({
      mild: '輕微',
      moderate: '中度',
      severe: '嚴重',
    }),
    []
  )



  // Core summary cards - focusing on essential features only
  const summaryCards = useMemo<SummaryCardConfig[]>(() => {
    return [
      {
        key: 'food',
        title: '飲食',
        count: foodEntries.length,
        icon: 'food-apple',
        accent: '#ECFDF5',
        hint: foodEntries.length > 0 ? '查看今天的餐點' : '點擊快速新增',
        onPress: () => navigation.navigate('AddFoodEntry', { date: undefined }),
      },
      {
        key: 'symptom',
        title: '症狀',
        count: symptomEntries.length,
        icon: 'medical-bag',
        accent: '#FEF2F2',
        hint: symptomEntries.length > 0 ? '追蹤狀況變化' : '建立第一筆症狀',
        onPress: () => navigation.navigate('AddSymptomEntry', { date: undefined }),
      },
      {
        key: 'bowel',
        title: '排便',
        count: bowelEntries.length,
        icon: 'toilet',
        accent: '#FFF7ED',
        hint: bowelEntries.length > 0 ? '追蹤排便狀況' : '快速記錄 Bristol 指標',
        onPress: () => navigation.navigate('AddBowelMovement', { date: undefined }),
      },
    ]
  }, [
    foodEntries.length,
    symptomEntries.length,
    bowelEntries.length,
    navigation,
  ])

  // Timeline showing recent activities - core features only
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = []

    foodEntries.forEach((entry) => {
      items.push({
        id: entry.id,
        type: 'food',
        title: entry.food_name,
        timestamp: entry.consumed_at,
        meta: mealLabelMap[entry.meal_type] ?? '',
        icon: 'food-apple',
        color: colors.success,
      })
    })

    symptomEntries.forEach((entry) => {
      items.push({
        id: entry.id,
        type: 'symptom',
        title: entry.symptom_name,
        timestamp: entry.recorded_at,
        meta: entry.severity ? `程度 ${SEVERITY_LABELS[entry.severity] || entry.severity}` : undefined,
        icon: 'medical-bag',
        color: colors.error,
      })
    })

    bowelEntries.forEach((entry) => {
      items.push({
        id: entry.id,
        type: 'bowel',
        title: entry.stool_type ? `第${entry.stool_type}型大便` : '大便記錄',
        timestamp: entry.occurred_at,
        meta: undefined,
        icon: 'toilet',
        color: '#D2691E',
      })
    })

    return items
      .filter((item) => !!item.timestamp)
      .sort(
        (a, b) =>
          new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
      )
      .slice(0, 8) // Show more items in simplified view
  }, [foodEntries, symptomEntries, bowelEntries, mealLabelMap, SEVERITY_LABELS])


  // Removed tab switching and delete functionality - simplified view

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>今日記錄</Text>
          <Text style={styles.headerSubtitle}>追蹤你的飲食、症狀與排便狀況</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          {gamificationHeroEnabled && (
            <View style={styles.gamificationSection}>
              <GamificationHeroCard
                snapshot={gamificationSnapshot}
                alerts={missingAlerts}
                compact
                primaryLabel="前往今日任務"
                onPressPrimary={handleOpenQuests}
              />
            </View>
          )}

          {/* Summary View - Now the only view */}
          <View style={styles.summaryContainer}>
            {/* Compact Stats Grid */}
            <View style={styles.summaryGrid}>
              {summaryCards.map((card) => (
                <TouchableOpacity
                  key={card.key}
                  style={[styles.summaryCard, { backgroundColor: card.accent }]}
                  onPress={card.onPress}
                  activeOpacity={0.85}
                >
                  <View style={styles.summaryCardHeader}>
                    <Icon name={card.icon} size={24} color={card.key === 'food' ? colors.success : card.key === 'symptom' ? colors.error : '#D2691E'} />
                    <Text style={styles.summaryCardTitle}>{card.title}</Text>
                  </View>
                  <Text style={styles.summaryCardCount}>{card.count}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Timeline - With detailed content */}
            {timelineItems.length > 0 && (
              <View style={styles.timelineCard}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineTitle}>最近記錄</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const tabNav = findTabNavigator(navigation)
                      if (tabNav) {
                        tabNav.dispatch(TabActions.jumpTo('History'))
                      }
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={styles.viewAllButton}>
                      <Icon name="file-document-outline" size={16} color={colors.primary[600]} />
                      <Text style={styles.viewAllText}>查看完整歷史記錄</Text>
                      <Icon name="chevron-right" size={16} color={colors.primary[600]} />
                    </View>
                  </TouchableOpacity>
                </View>
                {timelineItems.map((item) => (
                  <View key={`${item.type}-${item.id}`} style={styles.timelineItemRow}>
                    <View style={styles.timelineIconContainer}>
                      <Icon name={item.icon} size={20} color={item.color} />
                    </View>
                    <View style={styles.timelineItemContent}>
                      <Text style={styles.timelineItemTitle}>{item.title}</Text>
                      <View style={styles.timelineMetaRow}>
                        <Text style={styles.timelineItemTime}>
                          {item.timestamp ? format(new Date(item.timestamp), 'HH:mm') : '--:--'}
                        </Text>
                        {item.meta && (
                          <>
                            <Text style={styles.timelineMetaDivider}>·</Text>
                            <Text style={styles.timelineItemMeta}>{item.meta}</Text>
                          </>
                        )}
                      </View>
                    </View>
                    <View style={[styles.timelineStatusDot, { backgroundColor: item.color }]} />
                  </View>
                ))}
              </View>
            )}

            {timelineItems.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="clipboard-text-outline" size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyStateText}>今天還沒有任何紀錄</Text>
                <Text style={styles.emptyStateHint}>點擊下方 + 按鈕開始記錄</Text>
              </View>
            )}
          </View>


          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  gamificationSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  errorText: {
    ...typography.body,
    fontSize: 13,
  },
  summaryContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    flexBasis: '48%',
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.sm,
    minHeight: 100,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryCardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  summaryCardCount: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  timelineHeader: {
    flexDirection: 'column',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  timelineTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  viewAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  viewAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
  },
  timelineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineItemContent: {
    flex: 1,
  },
  timelineItemTitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs / 2,
  },
  timelineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  timelineItemTime: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
  },
  timelineMetaDivider: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  timelineItemMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  snapshotList: {
    gap: spacing.sm,
  },
  snapshotCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  snapshotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  snapshotHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  snapshotTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  snapshotBadge: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
  },
  snapshotAction: {
    padding: spacing.xs,
  },
  snapshotItem: {
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: spacing.xs,
  },
  snapshotItemPrimary: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 2,
  },
  snapshotItemMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyStateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateHint: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
  },
  timelineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  timelineItemTime: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
  },
  timelineMetaDivider: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
})
