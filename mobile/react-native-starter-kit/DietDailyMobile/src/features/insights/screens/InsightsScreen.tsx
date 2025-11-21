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
import { useDataCoverage, useMissingDataAlerts } from '@/features/dashboard/hooks/useDataCoverage'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@/app/navigation/types'
import { colors, typography, spacing } from '@/theme'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

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
  const [activeTab, setActiveTab] = React.useState<'progress' | 'reports'>('progress')
  
  // Phase A: Data Coverage and Missing Alerts (使用本週或註冊後的邏輯)
  const { coverage: dataCoverage, isLoading: isLoadingCoverage, error: coverageError, refetch: refetchCoverage } = useDataCoverage()
  const { alerts: missingAlerts, isLoading: isLoadingAlerts, error: alertsError, refetch: refetchAlerts } = useMissingDataAlerts(1) // 降低閾值為1天

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refetchCoverage(),
        refetchAlerts(),
      ])
    } finally {
      setRefreshing(false)
    }
  }, [refetchCoverage, refetchAlerts])

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
          style={[styles.tab, activeTab === 'progress' && styles.tabActive]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[styles.tabText, activeTab === 'progress' && styles.tabTextActive]}>
            🎯 進度
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
      {activeTab === 'progress' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Progress Tab - 遊戲化 UI */}
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
        /* Insights and Reports Tabs - Dashboard Content (DashboardScreen has its own ScrollView) */
        <View style={styles.dashboardContainer}>
          <DashboardScreen 
            hideHeader={true} 
            hideTabNavigation={true}
            externalActiveTab={activeTab === 'insights' ? 'insights' : 'reports'}
            onTabChange={(tab) => {
              // 只允許在 insights 和 reports 之間切換
              if (tab === 'insights' || tab === 'reports') {
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
