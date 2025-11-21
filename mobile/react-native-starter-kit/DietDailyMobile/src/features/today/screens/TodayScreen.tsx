import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  Alert,
} from 'react-native'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useQuery } from '@tanstack/react-query'
import { format, startOfDay } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useAuthStore } from '@/shared/stores/authStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { DEFAULT_SETTINGS } from '@/features/settings/types'
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
  MedicationRegimenSummary,
  SleepSessionEntry,
} from '@/features/health-logs/types'

;(globalThis as any).mLogs = (globalThis as any).mLogs ?? []
;(globalThis as any).sSessions = (globalThis as any).sSessions ?? []
;(globalThis as any).aSessions = (globalThis as any).aSessions ?? []
;(globalThis as any).regimenSummaries = (globalThis as any).regimenSummaries ?? []

type TabType = 'summary' | 'detail'

type QuickActionConfig = {
  key: string
  label: string
  icon: string
  color: string
  onPress: () => void
}

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
  type: 'food' | 'symptom' | 'medication' | 'sleep' | 'activity'
  title: string
  timestamp: string | null
  meta?: string
  icon: string
  color: string
}

type SnapshotSection = {
  key: string
  title: string
  icon: string
  color: string
  badge: number
  items: {
    id: string
    primary: string
    secondary?: string
    meta?: string
  }[]
  emptyText: string
  onAdd: () => void
}

export function TodayScreen() {
  const { user } = useAuthStore()
  const { settings, initializeSettings } = useSettingsStore()
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const today = useMemo(() => startOfDay(new Date()), [])
  const todayKey = useMemo(() => format(today, 'yyyy-MM-dd'), [today])

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('summary')

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    visible: boolean
    type: 'food' | 'symptom' | 'medication' | 'sleep' | 'activity' | null
    id: string | null
    name: string
  }>({
    visible: false,
    type: null,
    id: null,
    name: '',
  })

  // Initialize settings when user is available
  React.useEffect(() => {
    if (user?.id) {
      initializeSettings(user.id)
    }
  }, [user?.id, initializeSettings])

  const moduleVisibility =
    settings?.modules ??
    DEFAULT_SETTINGS.modules ?? {
      medication: true,
      sleep: true,
      activity: true,
    }
  const showMedication = moduleVisibility.medication !== false
  const showSleep = moduleVisibility.sleep !== false
  const showActivity = moduleVisibility.activity !== false
  ;(globalThis as any).showMedication = showMedication
  ;(globalThis as any).showSleep = showSleep
  ;(globalThis as any).showActivity = showActivity

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

const regimenQuery = useQuery({
  queryKey: ['todayActiveRegimens', user?.id],
  queryFn: async () => {
    if (!user?.id) return []
    return HealthLogService.getActiveRegimens(user.id)
  },
  enabled: !!user?.id,
})
const regimenSummaries = (regimenQuery.data ?? []) as MedicationRegimenSummary[]
;(globalThis as any).regimenSummaries = regimenSummaries

const describeRegimenFrequency = (regimen: MedicationRegimenSummary) => {
  if (regimen.frequency_type === 'every_n_days') {
    return `每 ${regimen.interval_days ?? '?'} 天`
  }
  if (regimen.frequency_type === 'cron') {
    return '自訂排程'
  }
  return '症狀時使用'
}

const describeRegimenStatus = (regimen: MedicationRegimenSummary) => {
  switch (regimen.status) {
    case 'paused':
      return '暫停'
    case 'ended':
      return '已結束'
    default:
      return '進行中'
  }
}

  const isRefreshing =
    isLoadingFood ||
    isLoadingSymptoms ||
    medicationQuery.isLoading ||
    sleepQuery.isLoading ||
    activityQuery.isLoading ||
    regimenQuery.isLoading

  const handleRefresh = () => {
    refetchFood()
    refetchSymptoms()
    medicationQuery.refetch()
    sleepQuery.refetch()
    activityQuery.refetch()
    regimenQuery.refetch()
  }

  const handleLogMedication = useCallback(
    (regimen?: MedicationRegimenSummary) => {
      if (regimen) {
        navigation.navigate('MedicationLog', { regimenId: regimen.id })
      } else {
        navigation.navigate('MedicationLog')
      }
    },
    [navigation]
  )

  const mealLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    MEAL_TYPES.forEach((meal) => {
      map[meal.value] = meal.label
    })
    return map
  }, [])

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

  const totalLogs = useMemo(() => {
    return (
      foodEntries.length +
      symptomEntries.length +
      mLogs.length +
      sSessions.length +
      aSessions.length
    )
  }, [foodEntries.length, symptomEntries.length, mLogs.length, sSessions.length, aSessions.length])

  const quickActions = useMemo<QuickActionConfig[]>(() => {
    return [
      {
        key: 'food',
        label: '飲食',
        icon: 'silverware-fork-knife',
        color: colors.success,
        onPress: () => navigation.navigate('AddFoodEntry', { date: undefined }),
      },
      {
        key: 'symptom',
        label: '症狀',
        icon: 'medical-bag',
        color: colors.error,
        onPress: () => navigation.navigate('AddSymptomEntry', { date: undefined }),
      },
      {
        key: 'bowel',
        label: '排便',
        icon: 'toilet',
        color: '#D2691E',
        onPress: () => navigation.navigate('AddBowelMovement', { date: undefined }),
      },
      {
        key: 'medication',
        label: '用藥',
        icon: 'pill',
        color: colors.primary[500],
        onPress: () => navigation.navigate('MedicationLog'),
      },
      {
        key: 'sleep',
        label: '睡眠',
        icon: 'sleep',
        color: colors.secondary[500],
        onPress: () => navigation.navigate('SleepLog'),
      },
      {
        key: 'activity',
        label: '運動',
        icon: 'run',
        color: colors.info,
        onPress: () => navigation.navigate('ActivityLog'),
      },
    ]
  }, [navigation])

  const summaryCards = useMemo<SummaryCardConfig[]>(() => {
    const cards: SummaryCardConfig[] = [
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
        count: 0,
        icon: 'toilet',
        accent: '#FFF7ED',
        hint: '快速記錄 Bristol 指標',
        onPress: () => navigation.navigate('AddBowelMovement', { date: undefined }),
      },
    ]

    if (showMedication) {
      cards.push({
        key: 'medication',
        title: '用藥',
        count: mLogs.length,
        icon: 'pill',
        accent: '#EEF2FF',
        hint: mLogs.length > 0 ? '查看今日劑量' : '補上今日用藥',
        onPress: () => navigation.navigate('MedicationLog'),
      })
    }

    if (showSleep) {
      cards.push({
        key: 'sleep',
        title: '睡眠',
        count: sSessions.length,
        icon: 'sleep',
        accent: '#F5F3FF',
        hint: sSessions.length > 0 ? '睡眠品質概覽' : '先設定預計時間',
        onPress: () => navigation.navigate('SleepLog'),
      })
    }

    if (showActivity) {
      cards.push({
        key: 'activity',
        title: '運動',
        count: aSessions.length,
        icon: 'run',
        accent: '#ECFEFF',
        hint: aSessions.length > 0 ? '保持活動紀錄' : '記錄散步/瑜珈',
        onPress: () => navigation.navigate('ActivityLog'),
      })
    }

    return cards
  }, [
    foodEntries.length,
    symptomEntries.length,
    mLogs.length,
    sSessions.length,
    aSessions.length,
    navigation,
    showMedication,
    showSleep,
    showActivity,
  ])

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
        meta: entry.severity ? `程度 ${entry.severity}` : undefined,
        icon: 'medical-bag',
        color: colors.error,
      })
    })

    mLogs.forEach((log) => {
      items.push({
        id: log.id,
        type: 'medication',
        title: log.regimen_name,
        timestamp: log.taken_at,
        meta: log.dose || undefined,
        icon: 'pill',
        color: colors.primary[500],
      })
    })

    sSessions.forEach((session) => {
      items.push({
        id: session.id,
        type: 'sleep',
        title: session.is_main_sleep ? '主要睡眠' : '小睡',
        timestamp: session.start_time,
        meta: session.duration_minutes
          ? `${(session.duration_minutes / 60).toFixed(1)} 小時`
          : undefined,
        icon: 'sleep',
        color: colors.secondary[500],
      })
    })

    aSessions.forEach((activity) => {
      items.push({
        id: activity.id,
        type: 'activity',
        title: activity.activity_title || activity.activity_type,
        timestamp: activity.start_time,
        meta: activity.duration_minutes ? `${activity.duration_minutes} 分鐘` : undefined,
        icon: 'run',
        color: colors.info,
      })
    })

    return items
      .filter((item) => !!item.timestamp)
      .sort(
        (a, b) =>
          new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
      )
      .slice(0, 5)
  }, [foodEntries, symptomEntries, mLogs, sSessions, aSessions, mealLabelMap])

  const snapshotSections = useMemo<SnapshotSection[]>(() => {
    const sections: SnapshotSection[] = []

    if (foodEntries.length > 0) {
      sections.push({
        key: 'food',
        title: '最新飲食',
        icon: 'food-apple',
        color: colors.success,
        badge: foodEntries.length,
        emptyText: '尚無飲食紀錄',
        onAdd: () => navigation.navigate('AddFoodEntry', { date: undefined }),
        items: foodEntries.slice(0, 2).map((entry) => ({
          id: entry.id,
          primary: entry.food_name,
          secondary: format(new Date(entry.consumed_at), 'HH:mm'),
          meta: mealLabelMap[entry.meal_type] ?? '',
        })),
      })
    }

    if (symptomEntries.length > 0) {
      sections.push({
        key: 'symptom',
        title: '症狀速覽',
        icon: 'medical-bag',
        color: colors.error,
        badge: symptomEntries.length,
        emptyText: '尚無症狀紀錄',
        onAdd: () => navigation.navigate('AddSymptomEntry', { date: undefined }),
        items: symptomEntries.slice(0, 2).map((entry) => ({
          id: entry.id,
          primary: entry.symptom_name,
          secondary: format(new Date(entry.recorded_at), 'HH:mm'),
          meta: entry.severity ? `程度 ${entry.severity}` : undefined,
        })),
      })
    }

    if (showMedication && mLogs.length > 0) {
      sections.push({
        key: 'medication',
        title: '用藥快照',
        icon: 'pill',
        color: colors.primary[500],
        badge: mLogs.length,
        emptyText: '尚無用藥紀錄',
        onAdd: () => navigation.navigate('MedicationLog'),
        items: mLogs.slice(0, 2).map((log) => ({
          id: log.id,
          primary: log.regimen_name,
          secondary: format(new Date(log.taken_at), 'HH:mm'),
          meta: log.dose || '未填劑量',
        })),
      })
    }

    if (showSleep && sSessions.length > 0) {
      sections.push({
        key: 'sleep',
        title: '睡眠速覽',
        icon: 'sleep',
        color: colors.secondary[500],
        badge: sSessions.length,
        emptyText: '尚無睡眠紀錄',
        onAdd: () => navigation.navigate('SleepLog'),
        items: sSessions.slice(0, 2).map((session) => ({
          id: session.id,
          primary: session.is_main_sleep ? '主要睡眠' : '小睡',
          secondary:
            session.start_time && session.end_time
              ? `${format(new Date(session.start_time), 'HH:mm')} - ${format(
                  new Date(session.end_time),
                  'HH:mm'
                )}`
              : session.planned_start_time
              ? `預計 ${session.planned_start_time}`
              : '時間未填',
          meta: session.duration_minutes
            ? `${(session.duration_minutes / 60).toFixed(1)} 小時`
            : undefined,
        })),
      })
    }

    if (showActivity && aSessions.length > 0) {
      sections.push({
        key: 'activity',
        title: '運動速覽',
        icon: 'run',
        color: colors.info,
        badge: aSessions.length,
        emptyText: '尚無運動紀錄',
        onAdd: () => navigation.navigate('ActivityLog'),
        items: aSessions.slice(0, 2).map((activity) => ({
          id: activity.id,
          primary: activity.activity_title || activity.activity_type,
          secondary: activity.start_time
            ? format(new Date(activity.start_time), 'HH:mm')
            : undefined,
          meta: activity.duration_minutes ? `${activity.duration_minutes} 分鐘` : undefined,
        })),
      })
    }

    return sections
  }, [
    foodEntries,
    symptomEntries,
    mLogs,
    sSessions,
    aSessions,
    showMedication,
    showSleep,
    showActivity,
    navigation,
    mealLabelMap,
  ])

  // Tab switching handler
  const handleTabChange = (tab: TabType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setActiveTab(tab)
  }

  // Show delete confirmation dialog
  const showDeleteDialog = (
    type: 'food' | 'symptom' | 'medication' | 'sleep' | 'activity',
    id: string,
    name: string
  ) => {
    setDeleteDialog({
      visible: true,
      type,
      id,
      name,
    })
  }

  // Cancel delete
  const cancelDelete = () => {
    setDeleteDialog({
      visible: false,
      type: null,
      id: null,
      name: '',
    })
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteDialog.id || !deleteDialog.type || !user?.id) {
      cancelDelete()
      return
    }

    try {
      switch (deleteDialog.type) {
        case 'food':
          await FoodDiaryService.deleteFoodEntry(deleteDialog.id, user.id)
          refetchFood()
          break
        case 'symptom':
          await SymptomDiaryService.deleteSymptomEntry(deleteDialog.id, user.id)
          refetchSymptoms()
          break
        case 'medication':
          await HealthLogService.deleteMedicationLog(deleteDialog.id)
          medicationQuery.refetch()
          break
        case 'sleep':
          await HealthLogService.deleteSleepSession(deleteDialog.id)
          sleepQuery.refetch()
          break
        case 'activity':
          await HealthLogService.deleteActivitySession(deleteDialog.id)
          activityQuery.refetch()
          break
      }
      cancelDelete()
    } catch (error) {
      console.error('Delete error:', error)
      Alert.alert('錯誤', '刪除失敗，請稍後再試')
      cancelDelete()
    }
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>今日記錄</Text>
          <Text style={styles.headerSubtitle}>快速檢視今天的摘要與詳細記錄</Text>
        </View>

        {/* Tab Bar - Moved to top, outside ScrollView */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'summary' && styles.activeTab]}
            onPress={() => handleTabChange('summary')}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}
            >
              摘要
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'detail' && styles.activeTab]}
            onPress={() => handleTabChange('detail')}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabText, activeTab === 'detail' && styles.activeTabText]}
            >
              詳細
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >

      {/* Quick Actions */}
      {activeTab === 'summary' && (
        <View style={styles.quickActionsCard}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.key}
              style={styles.quickActionButton}
              onPress={action.onPress}
              activeOpacity={0.85}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                <Icon name={action.icon} size={18} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Summary Tab */}
      {activeTab === 'summary' && (
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
                  <Icon name={card.icon} size={20} color={card.key === 'food' ? colors.success : card.key === 'symptom' ? colors.error : colors.primary[500]} />
                  <Text style={styles.summaryCardTitle}>{card.title}</Text>
                </View>
                <Text style={styles.summaryCardCount}>{card.count}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Timeline - Simplified */}
          {timelineItems.length > 0 && (
            <View style={styles.timelineCard}>
              <Text style={styles.timelineTitle}>最新活動</Text>
              {timelineItems.map((item) => (
                <View key={`${item.type}-${item.id}`} style={styles.timelineItemRow}>
                  <View style={[styles.timelineDot, { backgroundColor: item.color }]} />
                  <View style={styles.timelineItemContent}>
                    <Text style={styles.timelineItemTitle}>{item.title}</Text>
                    <Text style={styles.timelineItemMeta}>
                      {item.timestamp ? format(new Date(item.timestamp), 'HH:mm') : '--:--'}
                      {item.meta ? ` · ${item.meta}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Snapshot Sections - Simplified */}
          {snapshotSections.length > 0 && (
            <View style={styles.snapshotList}>
              {snapshotSections.map((section) => (
                <View key={section.key} style={styles.snapshotCard}>
                  <View style={styles.snapshotHeader}>
                    <View style={styles.snapshotHeaderLeft}>
                      <Icon name={section.icon} size={18} color={section.color} />
                      <Text style={styles.snapshotTitle}>{section.title}</Text>
                      <Text style={styles.snapshotBadge}>{section.badge}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={section.onAdd}
                      style={styles.snapshotAction}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="plus-circle" size={18} color={section.color} />
                    </TouchableOpacity>
                  </View>
                  {section.items.length === 0 ? (
                    <Text style={styles.emptyText}>{section.emptyText}</Text>
                  ) : (
                    section.items.map((item) => (
                      <View key={item.id} style={styles.snapshotItem}>
                        <Text style={styles.snapshotItemPrimary}>{item.primary}</Text>
                        <Text style={styles.snapshotItemMeta}>
                          {item.secondary || ''}
                          {item.meta ? ` · ${item.meta}` : ''}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              ))}
            </View>
          )}

          {timelineItems.length === 0 && snapshotSections.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="clipboard-text-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyStateText}>今天還沒有任何紀錄</Text>
              <Text style={styles.emptyStateHint}>使用上方快速動作開始記錄</Text>
            </View>
          )}
        </View>
      )}

      {/* Detail Tab - Existing Content */}
      {activeTab === 'detail' && (
        <>
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
                        styles.detailCard,
                        index === entries.length - 1 && styles.detailCardLast,
                      ]}
                    >
                      <View style={styles.detailCardHeader}>
                        <Text style={styles.detailCardTime}>
                          {format(new Date(entry.consumed_at), 'HH:mm')}
                        </Text>
                        <View style={styles.detailCardActions}>
                          <TouchableOpacity
                            onPress={() =>
                              navigation.navigate('AddFoodEntry', {
                                date: entry.consumed_at,
                                entryId: entry.id,
                              })
                            }
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Icon name="pencil" size={20} color={colors.text.secondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => showDeleteDialog('food', entry.id, entry.food_name)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={styles.deleteButton}
                          >
                            <Icon name="delete" size={20} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.detailCardContent}>
                        <Text style={styles.detailCardTitle}>{entry.food_name}</Text>
                        {entry.notes && (
                          <Text style={styles.detailCardNotes}>{entry.notes}</Text>
                        )}
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
                <View key={entry.id} style={styles.detailCard}>
                  <View style={styles.detailCardHeader}>
                    <Text style={styles.detailCardTime}>
                      {format(new Date(entry.recorded_at), 'HH:mm')}
                    </Text>
                    <View style={styles.detailCardActions}>
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('AddSymptomEntry', {
                            date: entry.recorded_at,
                            entryId: entry.id,
                          })
                        }
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon name="pencil" size={20} color={colors.text.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          showDeleteDialog('symptom', entry.id, entry.symptom_name)
                        }
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.deleteButton}
                      >
                        <Icon name="delete" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.detailCardContent}>
                    <View style={styles.symptomHeader}>
                      <Text style={styles.symptomIcon}>{severityInfo?.icon}</Text>
                      <Text style={styles.detailCardTitle}>{entry.symptom_name}</Text>
                    </View>
                    <Text style={styles.symptomSeverity}>{severityInfo?.label}</Text>
                    {entry.notes && (
                      <Text style={styles.detailCardNotes}>{entry.notes}</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* Medication */}
      {showMedication && (
        <>
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
              mLogs.map((log: MedicationLogEntry) => (
                <View key={log.id} style={styles.detailCard}>
                  <View style={styles.detailCardHeader}>
                    <Text style={styles.detailCardTime}>
                      {format(new Date(log.taken_at), 'HH:mm')}
                    </Text>
                    <View style={styles.detailCardActions}>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('MedicationLog')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon name="pencil" size={20} color={colors.text.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          showDeleteDialog('medication', log.id, log.regimen_name)
                        }
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.deleteButton}
                      >
                        <Icon name="delete" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.detailCardContent}>
                    <Text style={styles.detailCardTitle}>{log.regimen_name}</Text>
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
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="clipboard-pulse" size={24} color={colors.primary[400]} />
              <Text style={styles.sectionTitle}>用藥療程</Text>
              <View style={[styles.badge, styles.medicationBadge]}>
                <Text style={styles.badgeText}>{regimenSummaries.length}</Text>
              </View>
            </View>

            {regimenSummaries.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>尚未設定療程</Text>
                <Text style={styles.emptyStateHint}>可由醫囑或提醒設定頁建立</Text>
                <TouchableOpacity
                  style={styles.regimenActionButton}
                  onPress={() => handleLogMedication()}
                >
                  <Text style={styles.regimenActionButtonText}>建立用藥紀錄</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.regimenList}>
                {regimenSummaries.map((regimen: MedicationRegimenSummary) => (
                  <TouchableOpacity
                    key={regimen.id}
                    style={styles.regimenCard}
                    onPress={() => handleLogMedication(regimen)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.regimenHeader}>
                      <Text style={styles.regimenTitle}>
                        {regimen.custom_name || regimen.medication_name || '未命名療程'}
                      </Text>
                      <View
                        style={[
                          styles.regimenStatusChip,
                          regimen.status !== 'active' && styles.regimenStatusChipMuted,
                        ]}
                      >
                        <Text style={styles.regimenStatusText}>
                          {describeRegimenStatus(regimen)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.regimenMeta}>
                      {describeRegimenFrequency(regimen)} ·{' '}
                      {regimen.route === 'injection' ? '針劑' : '口服'}
                    </Text>
                    <View style={styles.regimenFooter}>
                      <Text style={styles.regimenDoseLabel}>
                        {regimen.default_dose ? `建議：${regimen.default_dose}` : '未設定劑量'}
                      </Text>
                      <TouchableOpacity
                        style={styles.regimenQuickLogButton}
                        onPress={() => handleLogMedication(regimen)}
                      >
                        <Icon name="plus-circle-outline" size={18} color={colors.primary[500]} />
                        <Text style={styles.regimenQuickLogText}>紀錄</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </>
      )}

      {showSleep && (
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
            sSessions.map((session: SleepSessionEntry) => (
              <View key={session.id} style={styles.detailCard}>
                <View style={styles.detailCardHeader}>
                  <View style={styles.healthRecordTitleRow}>
                    <Icon
                      name={session.is_main_sleep ? 'moon-waning-crescent' : 'power-sleep'}
                      size={20}
                      color={colors.secondary[500]}
                    />
                    <Text style={styles.detailCardTitle}>
                      {session.is_main_sleep ? '主要睡眠' : '小睡'}
                    </Text>
                  </View>
                  <View style={styles.detailCardActions}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('SleepLog')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="pencil" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        showDeleteDialog(
                          'sleep',
                          session.id,
                          session.is_main_sleep ? '主要睡眠' : '小睡'
                        )
                      }
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.deleteButton}
                    >
                      <Icon name="delete" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.detailCardContent}>
                  {/* 時間資訊 */}
                  <View style={styles.healthRecordInfoRow}>
                    <Icon name="clock-outline" size={16} color={colors.text.secondary} />
                    <Text style={styles.healthRecordInfo}>
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
                  {/* 時長資訊 */}
                  <View style={styles.healthRecordInfoRow}>
                    <Icon name="timer-outline" size={16} color={colors.text.secondary} />
                    <Text style={styles.healthRecordInfo}>
                      {session.duration_minutes
                        ? `${(session.duration_minutes / 60).toFixed(1)} 小時`
                        : session.planned_duration_minutes
                        ? `${(session.planned_duration_minutes / 60).toFixed(1)} 小時 (預計)`
                        : '未填時長'}
                    </Text>
                  </View>
                  {/* 品質評分 */}
                  {session.quality_score && (
                    <View style={styles.healthRecordInfoRow}>
                      <Icon name="star" size={16} color={colors.warning} />
                      <Text style={styles.healthRecordInfo}>
                        品質評分：{session.quality_score}/5
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {showActivity && (
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
            aSessions.map((activity: ActivitySessionEntry) => {
              // 根據運動類型選擇圖標
              const getActivityIcon = (type: string) => {
                const lowerType = type.toLowerCase()
                if (lowerType.includes('run') || lowerType.includes('跑')) return 'run'
                if (lowerType.includes('walk') || lowerType.includes('走')) return 'walk'
                if (lowerType.includes('bike') || lowerType.includes('騎')) return 'bike'
                if (lowerType.includes('swim') || lowerType.includes('游')) return 'swim'
                if (lowerType.includes('yoga') || lowerType.includes('瑜')) return 'yoga'
                if (lowerType.includes('weight') || lowerType.includes('重訓')) return 'dumbbell'
                return 'run-fast'
              }

              return (
                <View key={activity.id} style={styles.detailCard}>
                  <View style={styles.detailCardHeader}>
                    <View style={styles.healthRecordTitleRow}>
                      <Icon
                        name={getActivityIcon(activity.activity_type)}
                        size={20}
                        color={colors.info}
                      />
                      <Text style={styles.detailCardTitle}>
                        {activity.activity_title || activity.activity_type}
                      </Text>
                    </View>
                    <View style={styles.detailCardActions}>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('ActivityLog')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon name="pencil" size={20} color={colors.text.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          showDeleteDialog(
                            'activity',
                            activity.id,
                            activity.activity_title || activity.activity_type
                          )
                        }
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.deleteButton}
                      >
                        <Icon name="delete" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.detailCardContent}>
                    {/* 時長資訊 */}
                    {activity.duration_minutes && (
                      <View style={styles.healthRecordInfoRow}>
                        <Icon name="timer-outline" size={16} color={colors.text.secondary} />
                        <Text style={styles.healthRecordInfo}>
                          {activity.duration_minutes} 分鐘
                        </Text>
                      </View>
                    )}
                    {/* 時間範圍 */}
                    {activity.start_time && activity.end_time && (
                      <View style={styles.healthRecordInfoRow}>
                        <Icon name="clock-outline" size={16} color={colors.text.secondary} />
                        <Text style={styles.healthRecordInfo}>
                          {format(new Date(activity.start_time), 'HH:mm')} - {format(new Date(activity.end_time), 'HH:mm')}
                        </Text>
                      </View>
                    )}
                    {/* 強度 */}
                    <View style={styles.healthRecordInfoRow}>
                      <Icon name="speedometer" size={16} color={colors.text.secondary} />
                      <Text style={styles.healthRecordInfo}>
                        {activity.intensity ? `${activity.intensity} 強度` : '一般強度'}
                      </Text>
                    </View>
                    {/* 備註 */}
                    {activity.notes && (
                      <View style={styles.healthRecordInfoRow}>
                        <Icon name="note-text-outline" size={16} color={colors.text.secondary} />
                        <Text style={styles.healthRecordInfo}>{activity.notes}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )
            })
          )}
        </View>
      )}

        </>
      )}

          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteDialog.visible}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="alert-circle" size={48} color={colors.error} />
            </View>
            <Text style={styles.modalTitle}>確認刪除</Text>
            <Text style={styles.modalMessage}>
              確定要刪除「{deleteDialog.name}」嗎？{'\n'}
              此操作無法復原。
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={cancelDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextCancel}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonTextConfirm}>刪除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  quickActionsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  quickActionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
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
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
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
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.xs / 2,
  },
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  timelineTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  timelineItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  timelineItemContent: {
    flex: 1,
  },
  timelineItemTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 2,
  },
  timelineItemMeta: {
    fontSize: typography.fontSize.xs,
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
  regimenList: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  regimenCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  regimenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  regimenTitle: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  regimenStatusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 999,
    backgroundColor: colors.primary[100],
  },
  regimenStatusChipMuted: {
    backgroundColor: colors.border,
  },
  regimenStatusText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.primary,
  },
  regimenMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  regimenFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  regimenDoseLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  regimenQuickLogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary[200],
    backgroundColor: colors.primary[50],
  },
  regimenQuickLogText: {
    color: colors.primary[600],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  regimenActionButton: {
    marginTop: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary[200],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  regimenActionButtonText: {
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginTop: 4,
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
  symptomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  // Detail Card Styles
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailCardLast: {
    marginBottom: 0,
  },
  detailCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailCardTime: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  detailCardActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deleteButton: {
    marginLeft: spacing.xs,
  },
  detailCardContent: {
    gap: spacing.xs,
  },
  detailCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  detailCardNotes: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  // Health Record Specific Styles
  healthRecordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  healthRecordInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  healthRecordInfo: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  // Delete Confirmation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonConfirm: {
    backgroundColor: colors.error,
  },
  modalButtonTextCancel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  modalButtonTextConfirm: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
})
