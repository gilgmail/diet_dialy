import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Modal,
} from 'react-native'
import { Linking } from 'react-native'
import { Buffer } from 'buffer'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import { StatCard } from '../components/StatCard'
import { InsightCard } from '../components/InsightCard'
import { WeeklyChart } from '../components/WeeklyChart'
import { DistributionChart } from '../components/DistributionChart'
import { colors, typography, spacing } from '@/theme'
import { MEAL_TYPES } from '@/features/food-diary/types'
import { SEVERITY_LEVELS } from '@/features/symptom-diary/types'

interface DashboardScreenProps {
  hideHeader?: boolean
}

export function DashboardScreen({ hideHeader = false }: DashboardScreenProps = {}) {
  const { user } = useAuth()
  const { stats, weeklyTrend, insights, analysisHistory, isLoading, refetch } = useDashboard()
  const [refreshing, setRefreshing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisCountdown, setAnalysisCountdown] = useState(0)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleAIAnalysis = async () => {
    try {
      setIsAnalyzing(true)
      setAnalysisCountdown(20)
      await refetch()
    } finally {
      setIsAnalyzing(false)
      setAnalysisCountdown(0)
    }
  }

  useEffect(() => {
    if (!isAnalyzing) {
      return
    }

    const timer = setInterval(() => {
      setAnalysisCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [isAnalyzing])

  const handleOpenPdf = async (url: string) => {
    try {
      await Linking.openURL(url)
    } catch (error) {
      console.error('[Dashboard] Failed to open PDF:', error)
    }
  }

  const composeShareContent = (item: (typeof analysisHistory)[number]) => {
    const title = `${item.title}`
    const summaryText = item.summary ? `<p>${item.summary}</p>` : ''

    const foodsToMonitor = (item.foodsToMonitor || [])
      .slice(0, 3)
      .map((food) => {
        const parts: string[] = []
        if (food.risk_level) parts.push(`風險：${food.risk_level}`)
        if (food.reasoning?.length) parts.push(`原因：${food.reasoning.join('、')}`)
        if (food.recommended_actions?.length) parts.push(`建議：${food.recommended_actions.join('、')}`)
        return `<li>${food.food}${parts.length ? `（${parts.join('；')}）` : ''}</li>`
      })
      .join('')

    const supportiveFoods = (item.supportiveFoods || [])
      .slice(0, 3)
      .map((food) => {
        const parts: string[] = []
        if (food.benefits?.length) parts.push(`優點：${food.benefits.join('、')}`)
        if (food.suggestions?.length) parts.push(`建議：${food.suggestions.join('、')}`)
        return `<li>${food.food}${parts.length ? `（${parts.join('；')}）` : ''}</li>`
      })
      .join('')

    const followUps = item.followUpActions
      .map((action) => `<li>${action}</li>`)
      .join('')

    const pdfLink = item.pdfPath
      ? `<p><a href="${item.pdfPath}">下載完整 PDF 報告</a></p>`
      : ''

    const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", sans-serif; padding: 24px; line-height: 1.6; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    h2 { font-size: 16px; margin-top: 20px; }
    ul { padding-left: 20px; }
    a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p><strong>期間：</strong>${item.startDate} ~ ${item.endDate}</p>
  ${summaryText}
  ${foodsToMonitor ? `<h2>需留意食物</h2><ul>${foodsToMonitor}</ul>` : ''}
  ${supportiveFoods ? `<h2>建議加強食物</h2><ul>${supportiveFoods}</ul>` : ''}
  ${followUps ? `<h2>下週行動重點</h2><ul>${followUps}</ul>` : ''}
  ${pdfLink}
</body>
</html>`

    const textParts: string[] = []
    textParts.push(`【${title}】`)
    textParts.push(`期間：${item.startDate} ~ ${item.endDate}`)
    if (item.summary) {
      textParts.push('摘要：')
      textParts.push(item.summary)
    }
    if (item.foodsToMonitor?.length) {
      textParts.push('需留意食物：')
      item.foodsToMonitor.slice(0, 3).forEach((food) => {
        const parts: string[] = []
        if (food.risk_level) parts.push(`風險：${food.risk_level}`)
        if (food.reasoning?.length) parts.push(`原因：${food.reasoning.join('、')}`)
        if (food.recommended_actions?.length) parts.push(`建議：${food.recommended_actions.join('、')}`)
        textParts.push(`• ${food.food}${parts.length ? `（${parts.join('；')}）` : ''}`)
      })
    }
    if (item.supportiveFoods?.length) {
      textParts.push('建議加強食物：')
      item.supportiveFoods.slice(0, 3).forEach((food) => {
        const parts: string[] = []
        if (food.benefits?.length) parts.push(`優點：${food.benefits.join('、')}`)
        if (food.suggestions?.length) parts.push(`建議：${food.suggestions.join('、')}`)
        textParts.push(`• ${food.food}${parts.length ? `（${parts.join('；')}）` : ''}`)
      })
    }
    if (item.followUpActions.length) {
      textParts.push('下週行動重點：')
      item.followUpActions.forEach((action) => textParts.push(`• ${action}`))
    }
    if (item.pdfPath) {
      textParts.push(`完整 PDF：${item.pdfPath}`)
    }

    return {
      html,
      text: textParts.join('\n'),
    }
  }

  const handleShareAnalysis = async (item: (typeof analysisHistory)[number]) => {
    try {
      const { text } = composeShareContent(item)
      await Share.share({ message: text })
    } catch (error) {
      console.error('[Dashboard] Failed to share summary:', error)
    }
  }

  const handleOpenSummaryInSafari = async (item: (typeof analysisHistory)[number]) => {
    try {
      const { html } = composeShareContent(item)
      const base64 = Buffer.from(html, 'utf8').toString('base64')
      const dataUrl = `data:text/html;base64,${base64}`
      await Linking.openURL(dataUrl)
    } catch (error) {
      console.error('[Dashboard] Failed to open summary:', error)
    }
  }

  const handleSharePdf = async (item: (typeof analysisHistory)[number]) => {
    if (!item.pdfPath) {
      return
    }
    try {
      await Share.share({ message: `${item.title}\n${item.pdfPath}` })
    } catch (error) {
      console.error('[Dashboard] Failed to share PDF:', error)
    }
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
    <>
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
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>健康儀表板</Text>
          <Text style={styles.headerSubtitle}>
            {user?.name || user?.email || '使用者'}
          </Text>
        </View>
      )}

      {/* Quick Stats - Optimized Layout */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>今日概況</Text>
        <View style={styles.statsCompactRow}>
          <View style={styles.statCompactItem}>
            <StatCard
              icon="food-apple"
              iconColor="#10B981"
              label="今日飲食"
              value={stats?.todayFoodEntries || 0}
              subtitle="筆記錄"
            />
          </View>
          <View style={styles.statCompactItem}>
            <StatCard
              icon="medical-bag"
              iconColor="#EF4444"
              label="症狀"
              value={stats?.todaySymptomEntries || 0}
              subtitle="筆記錄"
            />
          </View>
        </View>
      </View>

      {/* Weekly Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>本週數據</Text>
        <View style={styles.statsCompactRow}>
          <View style={styles.statCompactItem}>
            <StatCard
              icon="calendar-week"
              iconColor={colors.primary[500]}
              label="本週飲食"
              value={stats?.weekFoodEntries || 0}
              subtitle="筆記錄"
            />
          </View>
          <View style={styles.statCompactItem}>
            <StatCard
              icon="chart-line"
              iconColor="#8B5CF6"
              label="本週症狀"
              value={stats?.weekSymptomEntries || 0}
              subtitle="筆記錄"
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
        </View>
      )}


      {/* Health Insights */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>健康洞察</Text>
          <TouchableOpacity
            style={[styles.aiButton, isAnalyzing && styles.aiButtonDisabled]}
            onPress={handleAIAnalysis}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.aiButtonText}>一週 AI 分析</Text>
            )}
          </TouchableOpacity>
        </View>
        {insights.length > 0 ? (
          insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))
        ) : (
          <Text style={styles.emptyInsightText}>
            目前尚無洞察，點擊上方按鈕立即生成 AI 分析。
          </Text>
        )}
      </View>

      {/* AI Analysis History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI 分析報告歷史</Text>
        {analysisHistory.length > 0 ? (
          analysisHistory.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historySubtitle}>
                    {`${item.startDate} ~ ${item.endDate}`}
                  </Text>
                  <Text style={styles.historySummary} numberOfLines={3}>
                    {item.summary || '這份報告包含腸道健康的重點洞察。'}
                  </Text>
                </View>
              </View>
              <View style={styles.historyActions}>
                <TouchableOpacity
                  style={styles.historyButton}
                  onPress={() => handleOpenPdf(item.pdfPath)}
                >
                  <Text style={styles.historyButtonText}>下載 PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.historyButton, styles.historyButtonSecondary]}
                  onPress={() => handleShareAnalysis(item)}
                >
                  <Text style={styles.historyButtonSecondaryText}>分享摘要</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.historyActions}
              >
                <TouchableOpacity
                  style={[styles.historyButton, styles.historyButtonSecondary]}
                  onPress={() => handleOpenSummaryInSafari(item)}
                >
                  <Text style={styles.historyButtonSecondaryText}>Safari 檢視摘要</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.historyButton, styles.historyButtonTertiary]}
                  onPress={() => handleSharePdf(item)}
                >
                  <Text style={styles.historyButtonTertiaryText}>分享 PDF 連結</Text>
                </TouchableOpacity>
              </View>
              {item.followUpActions.length > 0 && (
                <View style={styles.historyFollowUps}>
                  {item.followUpActions.slice(0, 2).map((action, index) => (
                    <Text key={`${item.id}-follow-${index}`} style={styles.historyFollowUpText}>
                      • {action}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyInsightText}>
            尚未建立 AI 報告歷史。執行「一週 AI 分析」後，報告會自動儲存於此。
          </Text>
        )}
      </View>

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

      <Modal visible={isAnalyzing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.modalTitle}>AI 分析進行中</Text>
            <Text style={styles.modalText}>
              {analysisCountdown > 0
                ? `預計還需 ${analysisCountdown} 秒...`
                : '即將完成，請保持應用程式開啟。'}
            </Text>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sectionTitleInline: {
    marginBottom: 0,
  },
  aiButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiButtonDisabled: {
    opacity: 0.6,
  },
  aiButtonText: {
    color: colors.surface,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  statsGrid: {
    gap: spacing.sm,
  },
  statRow: {
    width: '100%',
  },
  statsCompactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCompactItem: {
    flex: 1,
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
  emptyInsightText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  historyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  historySubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  historySummary: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  historyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  historyButton: {
    flex: 1,
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  historyButtonSecondary: {
    backgroundColor: '#E0E7FF',
  },
  historyButtonTertiary: {
    backgroundColor: '#F3F4F6',
  },
  historyButtonText: {
    color: colors.surface,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  historyButtonSecondaryText: {
    color: colors.primary[600],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  historyButtonTertiaryText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  historyFollowUps: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  historyFollowUpText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: 16,
    alignItems: 'center',
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  modalText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
})
