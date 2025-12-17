import React, { useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@/app/navigation/types'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useStreak } from '@/features/dashboard/hooks/useStreak'
import { useDataCoverage } from '@/features/dashboard/hooks/useDataCoverage'
import { ReportGenerator } from '@/features/dashboard/components/ReportGenerator'
import { colors, typography, spacing } from '@/theme'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'
import { zhTW } from 'date-fns/locale'

/**
 * 簡化版 InsightsScreen - 專注於進度追蹤
 * 
 * 功能：
 * 1. 連續記錄天數
 * 2. 本週記錄完成度
 * 3. 週歷視圖
 */
export function InsightsScreen() {
  const { user } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const [refreshing, setRefreshing] = React.useState(false)
  
  // 獲取連續記錄數據
  const { streak, isLoading: isLoadingStreak, refetch: refetchStreak } = useStreak()
  
  // 獲取資料充足度
  const { coverage: dataCoverage, isLoading: isLoadingCoverage, refetch: refetchCoverage } = useDataCoverage()

  // 計算本週完成度
  const weekProgress = useMemo(() => {
    if (!dataCoverage) return null
    
    const thisWeek = dataCoverage.recentWeeks?.[0]
    if (!thisWeek) return null

    const totalExpected = 21 // 每天 3 筆記錄（飲食、症狀、排便）* 7 天
    const totalActual = thisWeek.foodEntries + thisWeek.symptomEntries + (thisWeek.bowelEntries || 0)
    const percentage = Math.min(Math.round((totalActual / totalExpected) * 100), 100)

    return {
      actual: totalActual,
      expected: totalExpected,
      percentage,
      startDate: thisWeek.startDate,
      endDate: thisWeek.endDate,
    }
  }, [dataCoverage])

  // 生成本週每日記錄狀態
  const weekDays = useMemo(() => {
    if (!dataCoverage?.recentWeeks?.[0]) return []

    const weekStart = startOfWeek(new Date(), { locale: zhTW })
    const days = []

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i)
      const dayName = format(date, 'EEEEEE', { locale: zhTW }) // 一、二、三...
      const isToday = isSameDay(date, new Date())
      
      // 檢查這天是否有記錄（簡化版：假設有 coverage 數據）
      const hasRecord = dataCoverage.totalDays > 0 // 簡化判斷
      
      days.push({
        date,
        dayName,
        isToday,
        hasRecord,
        count: hasRecord ? 3 : 0, // 簡化：假設有記錄就是 3 筆
      })
    }

    return days
  }, [dataCoverage])

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetchStreak(),
        refetchCoverage(),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [refetchStreak, refetchCoverage])

  // 獲取連續天數的鼓勵文字
  const getStreakMessage = (days: number) => {
    if (days === 0) return '開始你的記錄旅程！'
    if (days < 3) return '很好的開始！'
    if (days < 7) return '保持下去！'
    if (days < 14) return '做得太好了！'
    if (days < 30) return '你太棒了！'
    return '你是超級明星！🌟'
  }

  // 獲取完成度的鼓勵文字
  const getProgressMessage = (percentage: number) => {
    if (percentage >= 90) return '完美週達成！'
    if (percentage >= 70) return '表現優異！'
    if (percentage >= 50) return '繼續努力！'
    if (percentage >= 30) return '還有進步空間'
    return '別放棄，每一步都很重要'
  }

  if (isLoadingStreak || isLoadingCoverage) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>進度追蹤</Text>
          <Text style={styles.headerSubtitle}>掌握你的記錄習慣</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Icon name="loading" size={48} color={colors.primary[500]} />
          <Text style={styles.loadingText}>載入中...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>進度追蹤</Text>
            <Text style={styles.headerSubtitle}>掌握你的記錄習慣 🎯</Text>
          </View>
          <View style={styles.headerIcon}>
            <Icon name="trophy-outline" size={32} color={colors.primary[500]} />
          </View>
        </View>
      </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
        {/* 連續記錄卡片 */}
          <View style={styles.section}>
          <View style={styles.streakCard}>
            <View style={styles.streakIconContainer}>
              <Text style={styles.streakEmoji}>🔥</Text>
            </View>
            <View style={styles.streakContent}>
              <Text style={styles.streakLabel}>連續記錄</Text>
              <View style={styles.streakValueRow}>
                <Text style={styles.streakValue}>{streak?.currentStreak || 0}</Text>
                <Text style={styles.streakUnit}>天</Text>
              </View>
              <Text style={styles.streakMessage}>
                {getStreakMessage(streak?.currentStreak || 0)}
              </Text>
            </View>
          </View>

          {/* 最長記錄 */}
          {streak && streak.longestStreak > 0 && (
            <View style={styles.longestStreakBadge}>
              <Icon name="medal-outline" size={20} color={colors.warning} />
              <Text style={styles.longestStreakText}>
                最長紀錄：{streak.longestStreak} 天
              </Text>
            </View>
          )}
          </View>

        {/* 本週完成度卡片 */}
        {weekProgress && (
          <View style={styles.section}>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressEmoji}>📊</Text>
                <View style={styles.progressTitleContainer}>
                  <Text style={styles.progressTitle}>本週記錄</Text>
                  <Text style={styles.progressSubtitle}>
                    {format(new Date(weekProgress.startDate), 'MM/dd')} - {format(new Date(weekProgress.endDate), 'MM/dd')}
                  </Text>
          </View>
              </View>

              <View style={styles.progressValueContainer}>
                <Text style={styles.progressCount}>
                  {weekProgress.actual} / {weekProgress.expected} 筆
                </Text>
                <Text style={styles.progressPercentage}>{weekProgress.percentage}%</Text>
              </View>

              {/* 進度條 */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${weekProgress.percentage}%` }
                    ]} 
                  />
          </View>
              </View>

              <Text style={styles.progressMessage}>
                {getProgressMessage(weekProgress.percentage)}
                </Text>
              </View>
          </View>
        )}

        {/* 週歷視圖 */}
          <View style={styles.section}>
          <View style={styles.weekCalendarCard}>
            <View style={styles.weekCalendarHeader}>
              <Text style={styles.weekCalendarEmoji}>📅</Text>
              <Text style={styles.weekCalendarTitle}>本週概覽</Text>
            </View>

            <View style={styles.weekDaysContainer}>
              {weekDays.map((day, index) => (
                <View key={index} style={styles.dayColumn}>
                  <Text style={[
                    styles.dayName,
                    day.isToday && styles.dayNameToday
                  ]}>
                    {day.dayName}
                  </Text>
                  <View style={[
                    styles.dayCircle,
                    day.hasRecord && styles.dayCircleActive,
                    day.isToday && styles.dayCircleToday,
                  ]}>
                    {day.hasRecord ? (
                      <Icon name="check" size={20} color={colors.surface} />
                    ) : (
                      <Text style={styles.dayCircleEmpty}>-</Text>
                    )}
                  </View>
                  {day.hasRecord && (
                    <Text style={styles.dayCount}>{day.count}筆</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
              </View>

        {/* 鼓勵訊息 */}
        <View style={styles.section}>
          <View style={styles.motivationCard}>
            <Icon name="lightbulb-on-outline" size={24} color={colors.primary[500]} />
            <Text style={styles.motivationText}>
              持續記錄能幫助你更好地了解自己的健康狀況。每一筆記錄都是邁向健康的一小步！
                </Text>
              </View>
              </View>

        {/* 排便追蹤導航卡片 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.bowelTrackingCard}
            onPress={() => navigation.navigate('BowelMovementDashboard', { days: 30 })}
            activeOpacity={0.7}
          >
            <View style={styles.bowelTrackingIconContainer}>
              <Icon name="chart-box-outline" size={32} color={colors.primary[500]} />
            </View>
            <View style={styles.bowelTrackingContent}>
              <Text style={styles.bowelTrackingTitle}>排便追蹤儀表板</Text>
              <Text style={styles.bowelTrackingSubtitle}>查看 Bristol Scale 分析和排便模式</Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* 報表匯出卡片 */}
        <View style={styles.section}>
          <ReportGenerator includeDays={7} />
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
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
    marginBottom: spacing.xs / 2,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary[500]}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },

  // 連續記錄卡片
  streakCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  streakIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.primary[500]}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 48,
  },
  streakContent: {
    flex: 1,
  },
  streakLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  streakValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  streakValue: {
    fontSize: 48,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
    lineHeight: 52,
  },
  streakUnit: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  streakMessage: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  longestStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: `${colors.warning}20`,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  longestStreakText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },

  // 本週完成度卡片
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  progressEmoji: {
    fontSize: 32,
  },
  progressTitleContainer: {
    flex: 1,
  },
  progressTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  progressSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  progressValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  progressCount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  progressPercentage: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  progressBarContainer: {
    marginBottom: spacing.md,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: colors.gray[200],
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 6,
  },
  progressMessage: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },

  // 週歷視圖
  weekCalendarCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekCalendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  weekCalendarEmoji: {
    fontSize: 28,
  },
  weekCalendarTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  dayNameToday: {
    color: colors.primary[600],
    fontWeight: typography.fontWeight.bold,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dayCircleActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  dayCircleToday: {
    borderColor: colors.primary[500],
    borderWidth: 3,
  },
  dayCircleEmpty: {
    fontSize: typography.fontSize.lg,
    color: colors.text.tertiary,
  },
  dayCount: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },

  // 鼓勵訊息
  motivationCard: {
    backgroundColor: `${colors.primary[500]}10`,
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.primary[500]}30`,
  },
  motivationText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: 24,
  },

  // 排便追蹤導航卡片
  bowelTrackingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  bowelTrackingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.primary[500]}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bowelTrackingContent: {
    flex: 1,
  },
  bowelTrackingTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  bowelTrackingSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },

  bottomSpacer: {
    height: spacing.xl,
  },
})
