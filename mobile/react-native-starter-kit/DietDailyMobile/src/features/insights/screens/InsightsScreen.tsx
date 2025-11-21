import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { DashboardScreen } from '@/features/dashboard/screens/DashboardScreen'
import { DataCoverageCard } from '@/features/dashboard/components/DataCoverageCard'
import { MissingDataAlertCard } from '@/features/dashboard/components/MissingDataAlertCard'
import { StreakCard } from '@/features/dashboard/components/StreakCard'
import { HealthStatusCard } from '@/features/dashboard/components/HealthStatusCard'
import { useDataCoverage, useMissingDataAlerts } from '@/features/dashboard/hooks/useDataCoverage'
import { useStreak } from '@/features/dashboard/hooks/useStreak'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { GamificationBoard } from '@/features/insights/components/GamificationBoard'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@/app/navigation/types'
import { colors, typography, spacing } from '@/theme'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useQuery } from '@tanstack/react-query'
import { SymptomDiaryService } from '@/features/symptom-diary/services/SymptomDiaryService'
import { useBowelDiarySummary } from '@/features/bowel-diary/hooks/useBowelDiarySummary'
import { useMemo } from 'react'
import { startOfDay, format } from 'date-fns'

/**
 * InsightsScreen - 洞察頁面
 *
 * 這是新導航結構中的「洞察」tab，展示 AI 分析和數據趨勢
 * 包含分頁：進度（遊戲化 UI）、洞察、報告
 */
export function InsightsScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const [refreshing, setRefreshing] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'quests' | 'progress' | 'reports'>('quests')
  
  // Phase A: Data Coverage and Missing Alerts (使用本週或註冊後的邏輯)
  const { coverage: dataCoverage, isLoading: isLoadingCoverage, error: coverageError, refetch: refetchCoverage } = useDataCoverage()
  const { alerts: missingAlerts, isLoading: isLoadingAlerts, error: alertsError, refetch: refetchAlerts } = useMissingDataAlerts(1) // 降低閾值為1天
  
  // Gamification: Streak tracking
  const { streak, isLoading: isLoadingStreak, error: streakError, refetch: refetchStreak } = useStreak()

  // Health Status: 取得今日的症狀和大便資料
  const today = useMemo(() => startOfDay(new Date()), [])
  const todayKey = useMemo(() => format(today, 'yyyy-MM-dd'), [today])
  
  // 查詢今日的 daily_symptom_entries（包含 bowel_movement_count 和 stool_type）
  const { data: todayDailyEntry } = useQuery({
    queryKey: ['dailySymptomEntry', user?.id, todayKey],
    queryFn: async () => {
      if (!user?.id) return null
      const { supabase } = await import('@/shared/api/supabase/client')
      const { data, error } = await supabase
        .from('daily_symptom_entries')
        .select('bowel_movement_count, stool_type, abdominal_pain, diarrhea, bloody_stool, bloating, overall_health')
        .eq('user_id', user.id)
        .eq('recorded_date', todayKey)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('[InsightsScreen] Error fetching daily entry:', error)
        return null
      }
      return data
    },
    enabled: !!user?.id,
  })

  const { summary: bowelSummary } = useBowelDiarySummary(today)

  // 判斷健康狀態：沒症狀 + 大便 1 次
  const hasNoSymptoms = useMemo(() => {
    if (!todayDailyEntry) {
      // 如果沒有記錄，檢查是否有大便記錄（有記錄但沒有症狀也算健康）
      return bowelSummary.totalCount > 0
    }
    // 檢查是否有嚴重症狀（abdominal_pain, diarrhea, bloody_stool, bloating 都為 0 或 null）
    const noPain = (todayDailyEntry.abdominal_pain === 0 || todayDailyEntry.abdominal_pain === null)
    const noDiarrhea = (todayDailyEntry.diarrhea === 0 || todayDailyEntry.diarrhea === null)
    const noBlood = (todayDailyEntry.bloody_stool === 0 || todayDailyEntry.bloody_stool === null)
    const noBloating = (todayDailyEntry.bloating === 0 || todayDailyEntry.bloating === null)
    const goodHealth = todayDailyEntry.overall_health >= 3 // 3 以上算健康
    
    return noPain && noDiarrhea && noBlood && noBloating && goodHealth
  }, [todayDailyEntry, bowelSummary])

  // 取得今日大便次數和類型
  const bowelMovementCount = useMemo(() => {
    // 優先使用 daily_symptom_entries 的資料
    if (todayDailyEntry?.bowel_movement_count !== null && todayDailyEntry?.bowel_movement_count !== undefined) {
      return todayDailyEntry.bowel_movement_count
    }
    // 否則使用 bowel_movement_entries 的計數
    return bowelSummary.totalCount
  }, [todayDailyEntry, bowelSummary])

  const stoolType = useMemo(() => {
    // 從 daily_symptom_entries 取得
    if (todayDailyEntry?.stool_type !== null && todayDailyEntry?.stool_type !== undefined) {
      return todayDailyEntry.stool_type
    }
    return undefined
  }, [todayDailyEntry])

  const handleNavigateToCategory = React.useCallback((category: string) => {
    switch (category) {
      case 'symptoms':
        navigation.navigate('AddSymptomEntry', { date: undefined })
        break
      case 'food':
        navigation.navigate('AddFoodEntry', { date: undefined })
        break
      case 'medications':
        navigation.navigate('MedicationLog', undefined)
        break
      case 'sleep':
        navigation.navigate('SleepLog', undefined)
        break
      case 'exercise':
        navigation.navigate('ActivityLog', undefined)
        break
      default:
        break
    }
  }, [navigation])

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetchCoverage(),
        refetchAlerts(),
        refetchStreak(),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [refetchCoverage, refetchAlerts, refetchStreak])

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>數據洞察</Text>
            <Text style={styles.headerSubtitle}>追蹤你的健康進度 🎯</Text>
          </View>
          <View style={styles.headerIcon}>
            <Icon name="chart-line-variant" size={32} color={colors.primary} />
          </View>
        </View>
      </View>

      {/* Tab Navigation - 簡化為兩個分頁（暫時隱藏 AI 洞察） */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'quests' && styles.tabActive]}
          onPress={() => setActiveTab('quests')}
        >
          <Text style={[styles.tabText, activeTab === 'quests' && styles.tabTextActive]}>
            🎯 今日任務
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'progress' && styles.tabActive]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[styles.tabText, activeTab === 'progress' && styles.tabTextActive]}>
            📈 進度
          </Text>
        </TouchableOpacity>
        {/* 暫時隱藏 AI 洞察功能 */}
        {/* <TouchableOpacity
          style={[styles.tab, activeTab === 'insights' && styles.tabActive]}
          onPress={() => setActiveTab('insights')}
        >
          <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>
            💡 洞察
          </Text>
        </TouchableOpacity> */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.tabActive]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>
            📝 報告
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'quests' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.section}>
            <GamificationBoard
              streak={streak}
              coverage={dataCoverage}
              alerts={missingAlerts}
              onNavigate={handleNavigateToCategory}
            />
          </View>
        </ScrollView>
      ) : activeTab === 'progress' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* 進度概覽與充足度 */}
          {/* Health Status Card - 健康狀態卡片 */}
          <View style={styles.section}>
            <HealthStatusCard
              hasNoSymptoms={hasNoSymptoms}
              bowelMovementCount={bowelMovementCount}
              stoolType={stoolType}
            />
          </View>
          {/* Streak Card - 連續記錄天數 */}
          <View style={styles.section}>
            {isLoadingStreak ? (
              <View style={[styles.card, styles.loadingCard]}>
                <Text style={styles.loadingText}>載入連續記錄中...</Text>
              </View>
            ) : streakError ? (
              <View style={[styles.card, styles.errorCard]}>
                <Icon name="alert-circle" size={20} color={colors.warning} />
                <Text style={styles.errorText}>
                  無法載入連續記錄：{streakError.message}
                </Text>
              </View>
            ) : streak ? (
              <StreakCard 
                currentStreak={streak.currentStreak}
                longestStreak={streak.longestStreak}
                milestones={streak.milestones}
              />
            ) : null}
          </View>

          {/* Data Coverage Card - 資料充足度 */}
          <View style={styles.section}>
            {isLoadingCoverage ? (
              <View style={[styles.card, styles.loadingCard]}>
                <Text style={styles.loadingText}>載入資料充足度中...</Text>
              </View>
            ) : coverageError ? (
              <View style={[styles.card, styles.errorCard]}>
                <Icon name="alert-circle" size={20} color={colors.error} />
                <Text style={styles.errorText}>
                  無法載入資料充足度：{coverageError.message}
                </Text>
              </View>
            ) : dataCoverage ? (
              <DataCoverageCard coverage={dataCoverage} />
            ) : null}
          </View>

          {/* Missing Data Alerts - 缺漏提醒 */}
          <View style={styles.section}>
            {isLoadingAlerts ? (
              <View style={[styles.card, styles.loadingCard]}>
                <Text style={styles.loadingText}>載入提醒中...</Text>
              </View>
            ) : alertsError ? (
              <View style={[styles.card, styles.errorCard]}>
                <Icon name="alert-circle" size={20} color={colors.warning} />
                <Text style={styles.errorText}>
                  無法載入提醒：{alertsError.message}
                </Text>
              </View>
            ) : missingAlerts && missingAlerts.length > 0 ? (
              <MissingDataAlertCard alerts={missingAlerts} navigation={navigation} />
            ) : (
              <View style={[styles.card, styles.successCard]}>
                <Icon name="check-circle" size={24} color={colors.success} />
                <Text style={styles.successText}>太棒了！本週的資料都很完整 ✨</Text>
                <Text style={styles.successSubtext}>繼續保持，你的健康數據會越來越豐富</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        /* Reports Tab - Dashboard Content (DashboardScreen has its own ScrollView) */
        <View style={styles.dashboardContainer}>
          <DashboardScreen 
            hideHeader={true} 
            hideTabNavigation={true}
            externalActiveTab="reports"
            onTabChange={(tab) => {
              // 只允許切換到 reports
              if (tab === 'reports') {
                setActiveTab(tab)
              }
            }}
          />
        </View>
      )}
    </View>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  loadingCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.error}10`,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  successCard: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: `${colors.success}10`,
    borderWidth: 1,
    borderColor: `${colors.success}30`,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    flex: 1,
  },
  successText: {
    ...typography.h3,
    color: colors.success,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  successSubtext: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: 13,
  },
  dashboardContainer: {
    flex: 1,
  },
  dashboardSection: {
    flex: 1,
  },
})
