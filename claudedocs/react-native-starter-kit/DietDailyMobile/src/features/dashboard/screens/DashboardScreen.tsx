import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import { StatCard } from '../components/StatCard'
import { InsightCard } from '../components/InsightCard'
import { WeeklyChart } from '../components/WeeklyChart'
import { DistributionChart } from '../components/DistributionChart'
import { colors, typography, spacing } from '@/theme'
import { MEAL_TYPES } from '@/features/food-diary/types'
import { SEVERITY_LEVELS } from '@/features/symptom-diary/types'

export function DashboardScreen() {
  const { user } = useAuth()
  const { stats, weeklyTrend, insights, isLoading, refetch } = useDashboard()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  if (isLoading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>載入數據中...</Text>
      </View>
    )
  }

  // Prepare meal distribution data
  const mealDistributionData = MEAL_TYPES.map((meal) => ({
    label: meal.label,
    value: weeklyTrend?.mealDistribution[meal.value] || 0,
    color:
      meal.value === 'breakfast'
        ? '#F59E0B'
        : meal.value === 'lunch'
        ? '#10B981'
        : meal.value === 'dinner'
        ? '#3B82F6'
        : '#8B5CF6',
    icon: meal.icon,
  }))

  // Prepare severity distribution data
  const severityDistributionData = SEVERITY_LEVELS.map((severity) => ({
    label: severity.label,
    value: weeklyTrend?.severityDistribution[severity.value] || 0,
    color: severity.color,
    icon: severity.icon,
  }))

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary[500]]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>健康儀表板</Text>
        <Text style={styles.headerSubtitle}>
          {user?.name || user?.email || '使用者'}
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>今日概況</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            <StatCard
              icon="food-apple"
              iconColor="#10B981"
              label="今日飲食"
              value={stats?.todayFoodEntries || 0}
              subtitle="筆記錄"
            />
          </View>
          <View style={styles.statRow}>
            <StatCard
              icon="fire"
              iconColor="#F59E0B"
              label="今日熱量"
              value={stats?.todayCalories || 0}
              subtitle="大卡"
            />
          </View>
          <View style={styles.statRow}>
            <StatCard
              icon="medical-bag"
              iconColor="#EF4444"
              label="今日症狀"
              value={stats?.todaySymptomEntries || 0}
              subtitle="筆記錄"
            />
          </View>
        </View>
      </View>

      {/* Weekly Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>本週數據</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statRow}>
            <StatCard
              icon="calendar-week"
              iconColor={colors.primary[500]}
              label="本週飲食"
              value={stats?.weekFoodEntries || 0}
              subtitle={`總計 ${stats?.weekCalories || 0} 大卡`}
            />
          </View>
          <View style={styles.statRow}>
            <StatCard
              icon="chart-line"
              iconColor="#8B5CF6"
              label="本週症狀"
              value={stats?.weekSymptomEntries || 0}
              subtitle={
                stats?.mostCommonSymptom
                  ? `常見：${stats.mostCommonSymptom}`
                  : '無記錄'
              }
            />
          </View>
        </View>
      </View>

      {/* Weekly Charts */}
      {weeklyTrend && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>每週趨勢</Text>
          <WeeklyChart
            data={weeklyTrend.week}
            title="每日飲食記錄"
            dataKey="foodCount"
            color="#10B981"
          />
          <WeeklyChart
            data={weeklyTrend.week}
            title="每日症狀記錄"
            dataKey="symptomCount"
            color="#EF4444"
          />
          <WeeklyChart
            data={weeklyTrend.week}
            title="每日熱量攝取"
            dataKey="totalCalories"
            color="#F59E0B"
          />
        </View>
      )}

      {/* Distribution Charts */}
      {weeklyTrend && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>數據分布</Text>
          <DistributionChart
            title="餐點類型分布"
            data={mealDistributionData}
          />
          <DistributionChart
            title="症狀嚴重程度分布"
            data={severityDistributionData}
          />
        </View>
      )}

      {/* Health Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>健康洞察</Text>
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </View>
      )}

      {/* Empty State */}
      {!stats?.totalFoodEntries && !stats?.totalSymptomEntries && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>開始記錄您的健康數據</Text>
          <Text style={styles.emptySubtitle}>
            記錄飲食和症狀後，這裡會顯示詳細的統計資料和趨勢分析
          </Text>
        </View>
      )}
    </ScrollView>
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
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
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  statsGrid: {
    gap: spacing.sm,
  },
  statRow: {
    width: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
})
