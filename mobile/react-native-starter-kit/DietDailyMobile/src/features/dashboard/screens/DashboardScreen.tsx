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
import { Linking, Platform } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Buffer } from 'buffer'
import { EncodingType, File, Paths } from 'expo-file-system'
import { getContentUriAsync } from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import Constants from 'expo-constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import type { MainStackParamList } from '@/app/navigation/types'
import { StatCard } from '../components/StatCard'
import { InsightCard } from '../components/InsightCard'
import { WeeklyChart } from '../components/WeeklyChart'
import { DistributionChart } from '../components/DistributionChart'
import { colors, typography, spacing } from '@/theme'
import { MEAL_TYPES } from '@/features/food-diary/types'
import { SEVERITY_LEVELS } from '@/features/symptom-diary/types'
import type { WeeklyAnalysisStatus, WeeklyAnalysisStatusStep } from '../types'

interface DashboardScreenProps {
  hideHeader?: boolean
}

export function DashboardScreen({ hideHeader = false }: DashboardScreenProps = {}) {
  const { user } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const {
    stats,
    weeklyTrend,
    insights,
    analysisHistory,
    analysisStatus: latestAnalysisStatus,
    isLoading,
    refetch,
  } = useDashboard()
  const [refreshing, setRefreshing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisCountdown, setAnalysisCountdown] = useState(0)
  const [analysisStatus, setAnalysisStatus] = useState<WeeklyAnalysisStatus | null>(
    latestAnalysisStatus ?? null
  )
  const [latestReportId, setLatestReportId] = useState<string | null>(null)
  const [showAllReports, setShowAllReports] = useState(false)
  const scrollViewRef = React.useRef<ScrollView>(null)

  useEffect(() => {
    if (latestAnalysisStatus) {
      setAnalysisStatus(latestAnalysisStatus)
    } else if (!isAnalyzing) {
      setAnalysisStatus(null)
    }
  }, [latestAnalysisStatus, isAnalyzing])

  const formatTimestamp = (value?: string) => {
    if (!value) {
      return null
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return null
    }
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hours = `${date.getHours()}`.padStart(2, '0')
    const minutes = `${date.getMinutes()}`.padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  const renderStatusStep = (
    step: WeeklyAnalysisStatusStep,
    keyPrefix = ''
  ) => {
    const icon =
      step.state === 'completed'
        ? '✅'
        : step.state === 'in_progress'
          ? '⏳'
          : step.state === 'failed'
            ? '⚠️'
            : '•'
    const timestamp = formatTimestamp(step.timestamp)

    return (
      <View key={`${keyPrefix}${step.key}`} style={styles.analysisStatusRow}>
        <Text style={styles.analysisStatusIcon}>{icon}</Text>
        <View style={styles.analysisStatusContent}>
          <Text style={styles.analysisStatusLabel}>{step.label}</Text>
          {step.detail ? (
            <Text style={styles.analysisStatusDetail}>{step.detail}</Text>
          ) : null}
          {timestamp ? (
            <Text style={styles.analysisStatusTime}>{timestamp}</Text>
          ) : null}
        </View>
      </View>
    )
  }

  const buildInitialStatus = (
    foodEntries: number,
    symptomEntries: number
  ): WeeklyAnalysisStatus => {
    const totalRecords = foodEntries + symptomEntries
    const now = new Date().toISOString()

    return {
      datasetSummary: {
        foodEntries,
        symptomEntries,
        totalRecords,
      },
      steps: [
        {
          key: 'dataset',
          label: '整理分析資料',
          state: totalRecords > 0 ? 'in_progress' : 'failed',
          detail:
            totalRecords > 0
              ? `目前正在分析 ${totalRecords} 筆資料（飲食 ${foodEntries}、症狀 ${symptomEntries}）。`
              : '尚未取得足夠的資料。',
        },
        {
          key: 'server_processing',
          label: '伺服器分析中',
          state: 'in_progress',
          detail: 'AI 正在處理分析，請稍候...',
        },
        {
          key: 'server_response',
          label: '伺服器回應',
          state: 'in_progress',
          detail: '等待伺服器回應。',
        },
        {
          key: 'report_generation',
          label: '是否產生報告',
          state: 'in_progress',
          detail: '完成後會自動更新報告狀態。',
        },
      ],
      reportGenerated: false,
      lastUpdated: now,
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleAIAnalysis = async () => {
    try {
      setIsAnalyzing(true)
      setAnalysisCountdown(60)
      const estimatedFoodEntries =
        weeklyTrend?.week?.reduce((sum, day) => sum + (day.foodCount || 0), 0) || 0
      const estimatedSymptomEntries =
        weeklyTrend?.week?.reduce((sum, day) => sum + (day.symptomCount || 0), 0) || 0

      setAnalysisStatus(buildInitialStatus(estimatedFoodEntries, estimatedSymptomEntries))

      // 輪詢機制：每 3 秒檢查一次，最多輪詢 20 次 (60 秒)
      let attempts = 0
      const maxAttempts = 20
      const pollInterval = 3000 // 3 seconds

      const poll = async (): Promise<boolean> => {
        attempts++
        console.log(`[Dashboard] Polling attempt ${attempts}/${maxAttempts}`)

        const result = await refetch()

        if (result.error) {
          const timestamp = new Date().toISOString()
          setAnalysisStatus((prev) => {
            const base = prev ?? buildInitialStatus(estimatedFoodEntries, estimatedSymptomEntries)
            return {
              ...base,
              steps: base.steps.map((step) => {
                if (step.key === 'server_processing') {
                  return {
                    ...step,
                    state: 'failed',
                    detail: '伺服器分析失敗，請稍後再試。',
                    timestamp,
                  }
                }
                if (step.key === 'server_response') {
                  return {
                    ...step,
                    state: 'failed',
                    detail: result.error?.message || '無法取得伺服器回應。',
                    timestamp,
                  }
                }
                if (step.key === 'report_generation') {
                  return {
                    ...step,
                    state: 'failed',
                    detail: '分析未完成，未產生報告。',
                    timestamp,
                  }
                }
                return step
              }),
              reportGenerated: false,
              lastUpdated: timestamp,
            }
          })
          return false // 停止輪詢
        }

        if (result.data) {
          const status = result.data.analysisStatus
          setAnalysisStatus(status ?? null)

          // 檢查是否完成（所有步驟都是 completed 或 failed）
          if (status?.steps) {
            const allCompleted = status.steps.every(
              (step) => step.state === 'completed' || step.state === 'failed'
            )
            if (allCompleted && status.reportGenerated) {
              console.log('[Dashboard] Analysis completed with report!')
              return false // 分析完成，停止輪詢
            }
          }

          // 檢查是否有新的分析歷史
          if (result.data.analysisHistory && result.data.analysisHistory.length > 0) {
            console.log('[Dashboard] New analysis history detected!')
            // 標記最新報告
            const newReportId = result.data.analysisHistory[0].id
            setLatestReportId(newReportId)

            // 滾動到報告歷史區域（延遲確保 UI 已渲染）
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true })
            }, 500)

            // 5 秒後清除高亮標記
            setTimeout(() => setLatestReportId(null), 5000)
            return false // 有新報告，停止輪詢
          }
        }

        // 繼續輪詢
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval))
          setAnalysisCountdown(Math.max(0, 60 - attempts * 3))
          return await poll()
        }

        // 超時
        console.warn('[Dashboard] Analysis polling timeout')
        return false
      }

      await poll()
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
    const title = item.title
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

    // Fix corrupted characters in followUpActions (replace � with 症)
    const fixedFollowUpActions = item.followUpActions.map((action) => {
      return action.replace(/��/g, '症').replace(/\uFFFD/g, '症')
    })

    const followUps = fixedFollowUpActions
      .map((action) => `<li>${action}</li>`)
      .join('')

    const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI 分析報告</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang TC", "Heiti TC", sans-serif;
      padding: 20px;
      line-height: 1.8;
      color: #333;
      background: #fff;
      font-size: 16px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 12px;
      font-weight: 600;
      color: #1a1a1a;
    }
    h2 {
      font-size: 18px;
      margin-top: 24px;
      margin-bottom: 12px;
      font-weight: 600;
      color: #2563eb;
    }
    p {
      margin: 8px 0;
    }
    ul {
      padding-left: 24px;
      margin: 12px 0;
    }
    li {
      margin: 8px 0;
    }
    strong {
      font-weight: 600;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p><strong>期間：</strong>${item.startDate} ~ ${item.endDate}</p>
  ${summaryText}
  ${foodsToMonitor ? `<h2>需留意食物</h2><ul>${foodsToMonitor}</ul>` : ''}
  ${supportiveFoods ? `<h2>建議加強食物</h2><ul>${supportiveFoods}</ul>` : ''}
  ${followUps ? `<h2>下週行動重點</h2><ul>${followUps}</ul>` : ''}
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

      // iOS Safari 不支援 data: URL，改用檔案系統 + Sharing
      const sanitizedFileName = `analysis-summary-${item.startDate}-${item.endDate}`.replace(
        /[^\w.-]/g,
        '_'
      )
      const file = new File(Paths.cache, `${sanitizedFileName}.html`)
      await file.write(html, { encoding: EncodingType.UTF8 })

      let shareUri = file.uri
      if (Platform.OS === 'android') {
        try {
          shareUri = await getContentUriAsync(file.uri)
        } catch (androidError) {
          console.warn('[Dashboard] Unable to convert file URI for Android sharing', androidError)
        }
      }

      // 使用系統分享功能開啟
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(shareUri, {
          mimeType: 'text/html',
          dialogTitle: item.title,
          UTI: 'public.html',
        })
      } else {
        console.warn('[Dashboard] Sharing not available')
        // fallback: 嘗試直接用瀏覽器開啟（可能失敗）
        await Linking.openURL(file.uri)
      }
    } catch (error) {
      console.error('[Dashboard] Failed to open summary:', error)
    }
  }

  const handleViewReport = (item: (typeof analysisHistory)[number]) => {
    const { html } = composeShareContent(item)
    // 使用 base64 編碼來避免 URL 參數傳遞時的編碼問題
    const base64Html = Buffer.from(html, 'utf-8').toString('base64')
    navigation.navigate('ReportDetail', { htmlContent: base64Html })
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
      ref={scrollViewRef}
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

      {/* Quick Stats - Compact Combined Layout */}
      <View style={styles.section}>
        <View style={styles.statsSuperCompactGrid}>
          <View style={styles.statsSuperCompactItem}>
            <Text style={styles.statsSuperCompactLabel}>今日飲食</Text>
            <Text style={styles.statsSuperCompactValue}>{stats?.todayFoodEntries || 0}</Text>
          </View>
          <View style={styles.statsSuperCompactItem}>
            <Text style={styles.statsSuperCompactLabel}>今日症狀</Text>
            <Text style={styles.statsSuperCompactValue}>{stats?.todaySymptomEntries || 0}</Text>
          </View>
          <View style={styles.statsSuperCompactItem}>
            <Text style={styles.statsSuperCompactLabel}>本週飲食</Text>
            <Text style={styles.statsSuperCompactValue}>{stats?.weekFoodEntries || 0}</Text>
          </View>
          <View style={styles.statsSuperCompactItem}>
            <Text style={styles.statsSuperCompactLabel}>本週症狀</Text>
            <Text style={styles.statsSuperCompactValue}>{stats?.weekSymptomEntries || 0}</Text>
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
          <>
            {analysisHistory.slice(0, 2).map((item) => (
              <View
                key={item.id}
                style={[
                  styles.historyCard,
                  item.id === latestReportId && styles.historyCardNew
                ]}
              >
                <View style={styles.historyHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.historyTitleRow}>
                      <Text style={styles.historyTitle}>{item.title}</Text>
                      {item.id === latestReportId && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>最新</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.historySubtitle}>
                      {`${item.startDate} ~ ${item.endDate}`}
                    </Text>
                    {item.createdAt && (
                      <Text style={styles.historyTimestamp}>
                        產出時間：{new Date(item.createdAt).toLocaleString('zh-TW', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    )}
                    <Text style={styles.historySummary} numberOfLines={3}>
                      {item.summary || '這份報告包含腸道健康的重點洞察。'}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyActions}>
                  <TouchableOpacity
                    style={styles.historyButton}
                    onPress={() => handleViewReport(item)}
                  >
                    <Text style={styles.historyButtonText}>查看完整報告</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.historyButton, styles.historyButtonSecondary]}
                    onPress={() => handleShareAnalysis(item)}
                  >
                    <Text style={styles.historyButtonSecondaryText}>分享摘要</Text>
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
            ))}

            {/* Show collapsed older reports if more than 2 */}
            {analysisHistory.length > 2 && !showAllReports && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setShowAllReports(true)}
              >
                <Text style={styles.expandButtonText}>
                  還有 {analysisHistory.length - 2} 週的報告
                </Text>
                <Text style={styles.expandButtonIcon}>▼</Text>
              </TouchableOpacity>
            )}

            {/* Show remaining reports when expanded */}
            {showAllReports && analysisHistory.slice(2).map((item) => (
              <View
                key={item.id}
                style={styles.historyCard}
              >
                <View style={styles.historyHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>{item.title}</Text>
                    <Text style={styles.historySubtitle}>
                      {`${item.startDate} ~ ${item.endDate}`}
                    </Text>
                    {item.createdAt && (
                      <Text style={styles.historyTimestamp}>
                        產出時間：{new Date(item.createdAt).toLocaleString('zh-TW', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.historyActions}>
                  <TouchableOpacity
                    style={styles.historyButton}
                    onPress={() => handleViewReport(item)}
                  >
                    <Text style={styles.historyButtonText}>查看報告</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.historyButton, styles.historyButtonSecondary]}
                    onPress={() => handleShareAnalysis(item)}
                  >
                    <Text style={styles.historyButtonSecondaryText}>分享</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Collapse button */}
            {showAllReports && analysisHistory.length > 2 && (
              <TouchableOpacity
                style={styles.collapseButton}
                onPress={() => setShowAllReports(false)}
              >
                <Text style={styles.expandButtonText}>收起舊報告</Text>
                <Text style={styles.expandButtonIcon}>▲</Text>
              </TouchableOpacity>
            )}
          </>
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

      {/* Version Info */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>
          v{Constants.expoConfig?.version} ({Platform.OS === 'ios' ? `Build ${Constants.expoConfig?.ios?.buildNumber}` : `Build ${Constants.expoConfig?.android?.versionCode || 'N/A'}`})
        </Text>
      </View>
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
            {analysisStatus?.steps ? (
              <View style={styles.modalStatusContainer}>
                {analysisStatus.steps.map((step) => renderStatusStep(step, 'modal-'))}
              </View>
            ) : null}
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
  analysisStatusCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  analysisStatusTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  analysisStatusSummary: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  analysisStatusTimestamp: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.xs,
    color: colors.text.disabled,
  },
  analysisStatusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  analysisStatusIcon: {
    fontSize: typography.fontSize.base,
    marginTop: 2,
  },
  analysisStatusContent: {
    flex: 1,
  },
  analysisStatusLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  analysisStatusDetail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
    lineHeight: 20,
  },
  analysisStatusTime: {
    marginTop: spacing.xs / 2,
    fontSize: typography.fontSize.xs,
    color: colors.text.disabled,
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
  statsSuperCompactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  statsSuperCompactItem: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  statsSuperCompactLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  statsSuperCompactValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
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
  historyCardNew: {
    borderWidth: 2,
    borderColor: colors.primary[500],
    backgroundColor: '#EEF2FF',
  },
  historyHeader: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  historyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  newBadge: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  newBadgeText: {
    color: colors.surface,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  historySubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  historyTimestamp: {
    fontSize: typography.fontSize.xs,
    color: colors.text.disabled,
    marginTop: spacing.xs / 2,
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
  expandButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  collapseButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  expandButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  expandButtonIcon: {
    fontSize: typography.fontSize.sm,
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
  modalStatusContainer: {
    width: '100%',
    marginTop: spacing.sm,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
  },
  versionText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.disabled,
  },
})
