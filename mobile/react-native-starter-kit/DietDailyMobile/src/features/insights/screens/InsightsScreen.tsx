import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { DashboardScreen } from '@/features/dashboard/screens/DashboardScreen'
import { colors, typography, spacing } from '@/theme'

/**
 * InsightsScreen - 洞察頁面
 *
 * 這是新導航結構中的「洞察」tab，展示 AI 分析和數據趨勢
 * 內部使用 DashboardScreen 組件來顯示所有分析功能
 */
export function InsightsScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>數據洞察</Text>
        <Text style={styles.headerSubtitle}>AI 分析和趨勢統計</Text>
      </View>

      {/* Dashboard Content */}
      <View style={styles.dashboardContainer}>
        <DashboardScreen hideHeader={true} />
      </View>
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
  dashboardContainer: {
    flex: 1,
  },
})
