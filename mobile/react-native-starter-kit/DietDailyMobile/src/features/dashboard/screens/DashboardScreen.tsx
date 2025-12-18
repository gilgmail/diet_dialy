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
  Alert,
} from 'react-native'
import { Linking, Platform } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Buffer } from 'buffer'
import * as FileSystem from 'expo-file-system'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import Constants from 'expo-constants'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import { DashboardService } from '../services/DashboardService'
import type { MainStackParamList } from '@/app/navigation/types'
import { StatCard } from '../components/StatCard'
import { InsightCard } from '../components/InsightCard'
import { WeeklyChart } from '../components/WeeklyChart'
import { DistributionChart } from '../components/DistributionChart'
import { DashboardSkeleton } from '../components/DashboardSkeleton'
import { colors, typography, spacing } from '@/theme'
import { MEAL_TYPES } from '@/features/food-diary/types'
import type { FoodEntry, MealType } from '@/features/food-diary/types'
import { SEVERITY_LEVELS } from '@/features/symptom-diary/types'
import type { SymptomEntry, SeverityLevel } from '@/features/symptom-diary/types'
import { appConfig } from '@/shared/config/appConfig'
import type {
  WeeklyAnalysisStatus,
  WeeklyAnalysisStatusStep,
  WeeklyAnalysisHistoryItem,
} from '../types'

interface DashboardScreenProps {
  hideHeader?: boolean
  hideTabNavigation?: boolean
  externalActiveTab?: 'stats' | 'trends' | 'insights' | 'reports'
  onTabChange?: (tab: 'stats' | 'trends' | 'insights' | 'reports') => void
}

type FileSystemDirectoryContext = {
  cacheDirectory?: string | null
  documentDirectory?: string | null
}

type CombinedRecord = {
  sortValue: number
  dateLabel: string
  timeLabel: string
  category: string
  description: string
}

type WeeklyReportData = {
  startLabel: string
  endLabel: string
  startKey: string
  endKey: string
  generatedLabel: string
  summaryRows: { label: string; value: string }[]
  mealDistribution: Record<MealType, number>
  severityDistribution: Record<SeverityLevel, number>
  combinedRecords: CombinedRecord[]
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const MEAL_TYPE_ORDER: Record<MealType, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
}

const MEAL_TYPE_META = MEAL_TYPES.reduce(
  (acc, item) => {
    acc[item.value] = item
    return acc
  },
  {} as Record<MealType, (typeof MEAL_TYPES)[number]>
)

const SEVERITY_META = SEVERITY_LEVELS.reduce(
  (acc, item) => {
    acc[item.value] = item
    return acc
  },
  {} as Record<SeverityLevel, (typeof SEVERITY_LEVELS)[number]>
)


function escapeHtml(value: string | undefined | null) {
  if (!value) return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatTime(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${hours}:${minutes}`
}

function getWeekdayLabel(date: Date) {
  return WEEKDAY_LABELS[date.getDay()]
}

const NO_WRITABLE_DIR_ERROR = 'NO_WRITABLE_DIRECTORY'

function resolveWritableDirectory(): string {
  const directories = FileSystem as FileSystemDirectoryContext
  const possibleDirectories = [
    directories.cacheDirectory,
    directories.documentDirectory,
  ].filter((dir): dir is string => typeof dir === 'string' && dir.length > 0)

  if (possibleDirectories.length === 0) {
    throw new Error(NO_WRITABLE_DIR_ERROR)
  }

  const directory = possibleDirectories[0]
  return directory.endsWith('/') ? directory : `${directory}/`
}

async function writeTextFile(fileName: string, contents: string) {
  const targetPath = `${resolveWritableDirectory()}${fileName}`
  await FileSystem.writeAsStringAsync(targetPath, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  })
  return targetPath
}

async function fallbackShareText(message: string) {
  await Share.share({ message })
}

function showWritableError(message: string) {
  Alert.alert('無法建立檔案', message)
}


/**
 * 將 AI 模型 ID 轉換成易讀的顯示名稱
 */
function getModelDisplayName(modelId: string): string {
  const modelMap: Record<string, string> = {
    'claude-sonnet-4-5-20250929': 'Claude 4.5 Sonnet（最新）',
    'claude-3-5-haiku-latest': 'Claude 3.5 Haiku（推薦）',
    'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
    'claude-3-haiku-20240307': 'Claude 3 Haiku（經濟）',
    'mock': '測試模式（免費）',
  }
  return modelMap[modelId] || modelId
}

function normalizeDateOnly(input: Date): Date {
  const date = new Date(input)
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDateLabel(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateKey(date: Date): string {
  return formatDateLabel(date)
}

function getDefaultReportRange() {
  const end = normalizeDateOnly(new Date())
  const start = normalizeDateOnly(new Date(end))
  start.setDate(end.getDate() - 6)
  return { start, end }
}

export function DashboardScreen({ 
  hideHeader = false, 
  hideTabNavigation = false,
  externalActiveTab,
  onTabChange
}: DashboardScreenProps = {}) {
  const screenMountTime = React.useRef(Date.now())
  const { user, signOut } = useAuth()
  const { enableAIUI } = appConfig
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const {
    stats,
    weeklyTrend,
    insights,
    analysisHistory,
    analysisHistoryTotal,
    analysisStatus: latestAnalysisStatus,
    foodEntries,
    symptomEntries,
    isLoading,
    refetch,
  } = useDashboard()

  // 追蹤首次渲染時間
  React.useEffect(() => {
    if (!isLoading && stats) {
      const renderTime = Date.now() - screenMountTime.current
      console.log(`[DashboardScreen] 🎨 RENDER - Screen fully loaded in: ${renderTime}ms`)
      if (renderTime > 5000) {
        console.warn(`[DashboardScreen] ⚠️ SLOW - Exceeded 5s target (${renderTime}ms)`)
      } else {
        console.log(`[DashboardScreen] ✅ FAST - Within 5s target`)
      }
    }
  }, [isLoading, stats])
  const [refreshing, setRefreshing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisCountdown, setAnalysisCountdown] = useState(0)
  const [analysisStatus, setAnalysisStatus] = useState<WeeklyAnalysisStatus | null>(
    latestAnalysisStatus ?? null
  )
  const [latestReportId, setLatestReportId] = useState<string | null>(null)
  const [showAllReports, setShowAllReports] = useState(false)
  const [history, setHistory] = useState(analysisHistory)
  const [hasAllHistory, setHasAllHistory] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [internalActiveTab, setInternalActiveTab] = useState<'stats' | 'trends' | 'insights' | 'reports'>('stats')
  
  const handleTabChange = (tab: 'stats' | 'trends' | 'insights' | 'reports') => {
    // 如果外部限制了可用的 tab，只允許切換到允許的 tab
    if (onTabChange) {
      onTabChange(tab)
    } else {
      setInternalActiveTab(tab)
    }
  }
  
  // 如果外部傳入的 tab，優先使用外部 tab；否則使用內部 tab
  // 如果外部 tab 是 'insights' 或 'reports'，直接使用；否則回退到內部 tab
  const activeTab = externalActiveTab 
    ? (['insights', 'reports'].includes(externalActiveTab) ? externalActiveTab : internalActiveTab)
    : internalActiveTab
  const defaultReportRange = React.useMemo(() => getDefaultReportRange(), [])
  const [reportRangeStart, setReportRangeStart] = useState<Date>(defaultReportRange.start)
  const [reportRangeEnd, setReportRangeEnd] = useState<Date>(defaultReportRange.end)
  const [reportPickerVisible, setReportPickerVisible] = useState(false)
  const [reportPickerTarget, setReportPickerTarget] = useState<'start' | 'end'>('start')
  const [tempReportDate, setTempReportDate] = useState(defaultReportRange.start)
  const [isGeneratingWeeklyReport, setIsGeneratingWeeklyReport] = useState(false)
  const scrollViewRef = React.useRef<ScrollView>(null)
  const totalHistoryCount = Math.max(analysisHistoryTotal ?? 0, history.length)
  const hasPendingServerHistory = !hasAllHistory && totalHistoryCount > history.length
  const hasHiddenLocalHistory = history.length > 2
  const showExpandButton = !showAllReports && (hasPendingServerHistory || hasHiddenLocalHistory)
  const remainingServerCount = Math.max(totalHistoryCount - history.length, 0)

  useEffect(() => {
    if (isAnalyzing) {
      return
    }

    if (latestAnalysisStatus) {
      setAnalysisStatus(latestAnalysisStatus)
    } else {
      setAnalysisStatus(null)
    }
  }, [latestAnalysisStatus, isAnalyzing])

  useEffect(() => {
    setHistory((prev) => {
      if (hasAllHistory) {
        if (analysisHistoryTotal > prev.length) {
          setHasAllHistory(false)
          return analysisHistory
        }
        return prev
      }
      return analysisHistory
    })
  }, [analysisHistory, analysisHistoryTotal, hasAllHistory])

  useEffect(() => {
    if (!enableAIUI && activeTab === 'insights') {
      // 如果 AI UI 被禁用且當前在 insights tab，切換到 stats
      // 但只有在沒有外部控制時才切換
      if (!externalActiveTab) {
        setInternalActiveTab('stats')
      }
    }
  }, [enableAIUI, activeTab, externalActiveTab])

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

  const renderFoodKnowledgeBanner = () => {
    if (!enableAIUI) {
      return null
    }

    const summary = analysisStatus?.foodKnowledge
    if (!summary) {
      return null
    }
    if (summary.missingCount === 0 && summary.staleCount === 0) {
      return null
    }

    const warningText =
      summary.warnings && summary.warnings.length > 0
        ? summary.warnings[0]
        : `缺資料 ${summary.missingCount} 項、過期 ${summary.staleCount} 項`

    return (
      <View style={styles.foodKnowledgeBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.foodKnowledgeTitle}>AI 食物知識庫待更新</Text>
          <Text style={styles.foodKnowledgeMessage}>{warningText}</Text>
        </View>
        <TouchableOpacity
          style={styles.foodKnowledgeAction}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Settings' } as any)}
        >
          <Text style={styles.foodKnowledgeActionText}>前往設定</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const applyReportDate = (target: 'start' | 'end', date: Date) => {
    const normalized = normalizeDateOnly(date)
    if (target === 'start') {
      setReportRangeStart(normalized)
      if (normalized > reportRangeEnd) {
        setReportRangeEnd(normalized)
      }
    } else {
      setReportRangeEnd(normalized)
      if (normalized < reportRangeStart) {
        setReportRangeStart(normalized)
      }
    }
  }

  const handleOpenReportPicker = (target: 'start' | 'end') => {
    setReportPickerTarget(target)
    setTempReportDate(target === 'start' ? reportRangeStart : reportRangeEnd)
    setReportPickerVisible(true)
  }

  const handleReportPickerChange = (_event: unknown, selectedDate?: Date) => {
    if (!selectedDate) {
      if (Platform.OS === 'android') {
        setReportPickerVisible(false)
      }
      return
    }

    if (Platform.OS === 'android') {
      setReportPickerVisible(false)
      applyReportDate(reportPickerTarget, selectedDate)
    } else {
      setTempReportDate(selectedDate)
    }
  }

  const handleConfirmReportPickerIOS = () => {
    applyReportDate(reportPickerTarget, tempReportDate)
    setReportPickerVisible(false)
  }

  const handleCancelReportPickerIOS = () => {
    setReportPickerVisible(false)
  }

  const buildWeeklyReportData = (): WeeklyReportData => {
    const startLabel = formatDateLabel(reportRangeStart)
    const endLabel = formatDateLabel(reportRangeEnd)
    const startKey = formatDateKey(reportRangeStart)
    const endKey = formatDateKey(reportRangeEnd)
    const generatedLabel = new Date().toLocaleString('zh-TW')

    const filteredFoodEntries = (foodEntries || [])
      .filter((entry) => {
        const entryDate = new Date(entry.consumed_at)
        if (Number.isNaN(entryDate.getTime())) return false
        const normalized = normalizeDateOnly(entryDate)
        return normalized >= reportRangeStart && normalized <= reportRangeEnd
      })
      .sort((a, b) => new Date(a.consumed_at).getTime() - new Date(b.consumed_at).getTime())

    const filteredSymptomEntries = (symptomEntries || [])
      .filter((entry) => {
        const entryDate = new Date(entry.recorded_at)
        if (Number.isNaN(entryDate.getTime())) return false
        const normalized = normalizeDateOnly(entryDate)
        return normalized >= reportRangeStart && normalized <= reportRangeEnd
      })
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

    const combinedRecords: CombinedRecord[] = [
      ...filteredFoodEntries.map((entry) => {
        const consumedAt = new Date(entry.consumed_at)
        const normalized = normalizeDateOnly(consumedAt)
        const meta = MEAL_TYPE_META[entry.meal_type]
        const descriptionParts = [entry.food_name]
        if (entry.notes) {
          descriptionParts.push(`備註：${entry.notes}`)
        }
        return {
          sortValue: consumedAt.getTime(),
          dateLabel: formatDateLabel(normalized),
          timeLabel: formatTime(consumedAt),
          category: meta ? `${meta.icon ?? ''} ${meta.label}` : entry.meal_type,
          description: descriptionParts.filter(Boolean).join('｜'),
        }
      }),
      ...filteredSymptomEntries.map((entry) => {
        const recordedAt = new Date(entry.recorded_at)
        const normalized = normalizeDateOnly(recordedAt)
        const meta = SEVERITY_META[entry.severity]
        const symptomNames = entry.additional_symptoms?.length
          ? entry.additional_symptoms.join('、')
          : entry.symptom_name || '症狀紀錄'
        const descriptionParts = [`症狀：${symptomNames}`]
        descriptionParts.push(`嚴重度：${meta?.label ?? entry.severity}`)
        if (entry.notes) {
          descriptionParts.push(`備註：${entry.notes}`)
        }
        return {
          sortValue: recordedAt.getTime(),
          dateLabel: formatDateLabel(normalized),
          timeLabel: formatTime(recordedAt),
          category: '🩺 症狀紀錄',
          description: descriptionParts.join('｜'),
        }
      }),
    ].sort((a, b) => a.sortValue - b.sortValue)

    const summaryRows: WeeklyReportData['summaryRows'] = [
      { label: '產出時間', value: generatedLabel },
      { label: '統計區間', value: `${startLabel} ~ ${endLabel}` },
      { label: '飲食紀錄（原始筆數）', value: `${filteredFoodEntries.length} 筆` },
      { label: '症狀紀錄', value: `${filteredSymptomEntries.length} 筆` },
    ]

    if (stats) {
      summaryRows.push(
        { label: '累積飲食紀錄', value: `${stats.totalFoodEntries} 筆` },
        { label: '累積症狀紀錄', value: `${stats.totalSymptomEntries} 筆` },
        { label: '本週飲食筆數', value: `${stats.weekFoodEntries} 筆` },
        { label: '本週症狀筆數', value: `${stats.weekSymptomEntries} 筆` },
      )
    }

    const mealDistribution = filteredFoodEntries.reduce(
      (acc, entry) => {
        acc[entry.meal_type] = (acc[entry.meal_type] || 0) + 1
        return acc
      },
      { breakfast: 0, lunch: 0, dinner: 0, snack: 0 } as Record<MealType, number>
    )

    const severityDistribution = filteredSymptomEntries.reduce(
      (acc, entry) => {
        acc[entry.severity] = (acc[entry.severity] || 0) + 1
        return acc
      },
      { mild: 0, moderate: 0, severe: 0 } as Record<SeverityLevel, number>
    )

    return {
      startLabel,
      endLabel,
      startKey,
      endKey,
      generatedLabel,
      summaryRows,
      mealDistribution,
      severityDistribution,
      combinedRecords,
    }
  }


  const buildWeeklyReportHtml = (reportData: WeeklyReportData = buildWeeklyReportData()) => {
    const summaryHtml = reportData.summaryRows
      .map(
        (row) => `
        <div class="summary-row">
          <span>${escapeHtml(row.label)}</span>
          <span>${escapeHtml(row.value)}</span>
        </div>
      `
      )
      .join('')

    const distributionHtml = `
      <section class="card-grid">
        <div class="grid">
          <div class="card">
            <h3>餐次概況（區間內）</h3>
            <ul class="metric-list">
              <li>早餐：${reportData.mealDistribution.breakfast}</li>
              <li>午餐：${reportData.mealDistribution.lunch}</li>
              <li>晚餐：${reportData.mealDistribution.dinner}</li>
              <li>點心：${reportData.mealDistribution.snack}</li>
            </ul>
          </div>
          <div class="card">
            <h3>症狀嚴重度（區間內）</h3>
            <ul class="metric-list">
              <li>輕度：${reportData.severityDistribution.mild}</li>
              <li>中度：${reportData.severityDistribution.moderate}</li>
              <li>重度：${reportData.severityDistribution.severe}</li>
            </ul>
          </div>
        </div>
      </section>
    `

    const combinedRecordsHtml = reportData.combinedRecords.length
      ? `
        <div class="table-wrapper">
          <table class="record-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>記錄時間</th>
                <th>餐別 / 類別</th>
                <th>內容</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.combinedRecords
                .map(
                  (record) => `
                    <tr>
                      <td>${escapeHtml(record.dateLabel)}</td>
                      <td>${escapeHtml(record.timeLabel)}</td>
                      <td>${escapeHtml(record.category)}</td>
                      <td>${escapeHtml(record.description)}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
      : '<p class="empty">此區間沒有飲食或症狀紀錄。</p>'

    return `
      <!DOCTYPE html>
      <html lang="zh-Hant">
        <head>
          <meta charset="utf-8" />
          <title>DietDaily 每週報表</title>
          <style>
            @page {
              margin: 24px;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif;
              color: #0f172a;
              background: #f8fafc;
              margin: 0;
              font-size: 14px;
            }
            main.report-container {
              max-width: 760px;
              margin: 0 auto;
              padding: 24px 0 32px;
            }
            h1 {
              font-size: 30px;
              margin: 0 0 8px;
            }
            h2 {
              font-size: 20px;
              margin: 0 0 14px;
            }
            h3 {
              font-size: 16px;
              margin-bottom: 8px;
              color: #475569;
            }
            section {
              break-inside: avoid;
              margin-bottom: 28px;
            }
            .card-grid {
              margin: 24px 0;
            }
            header.report-header p {
              margin: 0;
              color: #64748b;
            }
            .summary {
              background: #fff;
              border-radius: 18px;
              padding: 20px 24px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              border-bottom: 1px solid #f1f5f9;
            }
            .summary-row span:first-child {
              color: #64748b;
            }
            .summary-row:last-child {
              border-bottom: none;
            }
            .card-grid .grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
              gap: 18px;
            }
            .card {
              background: #fff;
              border-radius: 16px;
              padding: 18px;
              border: 1px solid #e2e8f0;
            }
            .table-wrapper {
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              overflow: hidden;
              box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
            }
            .record-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }
            .record-table thead {
              background: #f8fafc;
            }
            .record-table th,
            .record-table td {
              padding: 10px 14px;
              text-align: left;
              border-bottom: 1px solid #f1f5f9;
              vertical-align: top;
            }
            .record-table th {
              font-weight: 600;
              color: #475569;
              font-size: 12px;
              letter-spacing: 0.02em;
            }
            .record-table td {
              color: #334155;
            }
            .record-table tr:last-child td {
              border-bottom: none;
            }
            .metric-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .metric-list li + li {
              margin-top: 6px;
            }
            .footer-note {
              font-size: 12px;
              color: #94a3b8;
              text-align: center;
              margin-top: 12px;
            }
          </style>
        </head>
        <body>
          <main class="report-container">
            <header class="report-header">
              <h1>DietDaily 每週健康報表</h1>
              <p>自 ${escapeHtml(reportData.startLabel)} 至 ${escapeHtml(reportData.endLabel)} ｜ 報表產出：${escapeHtml(
                reportData.generatedLabel
              )}</p>
            </header>

            <section class="summary">
              ${summaryHtml}
            </section>

            ${distributionHtml}

            <section>
              <h2>飲食與症狀紀錄（依時間順序）</h2>
              ${combinedRecordsHtml}
            </section>

            <p class="footer-note">此報表由 DietDaily 生成，整合飲食與症狀記錄，提供溝通與追蹤參考。</p>
          </main>
        </body>
      </html>
    `
  }

  function escapeMarkdownCell(value: string) {
    if (!value) return ''
    return value.replace(/\|/g, '｜').replace(/\r?\n/g, ' ')
  }

  const buildWeeklyReportMarkdown = (reportData: WeeklyReportData = buildWeeklyReportData()) => {
    const lines: string[] = []
    lines.push('# DietDaily 每週健康報表', '')
    lines.push(`- 統計區間：${reportData.startLabel} ~ ${reportData.endLabel}`)
    lines.push(`- 產出時間：${reportData.generatedLabel}`)
    lines.push('')
    lines.push('## 數據概覽')
    reportData.summaryRows.forEach(row => {
      lines.push(`- ${row.label}：${row.value}`)
    })
    lines.push('')
    lines.push('## 餐次概況（區間內）')
    lines.push('| 餐次 | 次數 |')
    lines.push('| --- | --- |')
    lines.push(`| 早餐 | ${reportData.mealDistribution.breakfast} |`)
    lines.push(`| 午餐 | ${reportData.mealDistribution.lunch} |`)
    lines.push(`| 晚餐 | ${reportData.mealDistribution.dinner} |`)
    lines.push(`| 點心 | ${reportData.mealDistribution.snack} |`)
    lines.push('')
    lines.push('## 症狀嚴重度（區間內）')
    lines.push('| 等級 | 次數 |')
    lines.push('| --- | --- |')
    lines.push(`| 輕度 | ${reportData.severityDistribution.mild} |`)
    lines.push(`| 中度 | ${reportData.severityDistribution.moderate} |`)
    lines.push(`| 重度 | ${reportData.severityDistribution.severe} |`)
    lines.push('')
    lines.push('## 飲食與症狀紀錄（依時間順序）')
    if (reportData.combinedRecords.length) {
      lines.push('| 日期 | 記錄時間 | 餐別 / 類別 | 內容 |')
      lines.push('| --- | --- | --- | --- |')
      for (const record of reportData.combinedRecords) {
        lines.push(`| ${escapeMarkdownCell(record.dateLabel)} | ${escapeMarkdownCell(record.timeLabel)} | ${escapeMarkdownCell(record.category)} | ${escapeMarkdownCell(record.description)} |`)
      }
    } else {
      lines.push('此區間沒有飲食或症狀紀錄。')
    }
    lines.push('')
    lines.push('---')
    lines.push('此報表由 DietDaily 生成，整合飲食與症狀記錄，提供溝通與追蹤參考。')
    return lines.join('\n')
  }

  const shareReportAsPDF = async (reportData: WeeklyReportData) => {
    let pdfResult: Print.PrintFileResult | null = null
    try {
      const html = buildWeeklyReportHtml(reportData)
      pdfResult = await Print.printToFileAsync({
        html,
        base64: false,
      })

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: '分享每週報表',
          UTI: 'com.adobe.pdf',
        })
      } else {
        await Share.share({
          url: pdfResult.uri,
          message: `DietDaily 每週健康報表（${reportData.startLabel} ~ ${reportData.endLabel}）`,
        })
      }
    } catch (error) {
      // 清理臨時文件
      if (pdfResult?.uri) {
        try {
          await FileSystem.deleteAsync(pdfResult.uri, { idempotent: true })
        } catch (cleanupError) {
          console.warn('[DashboardScreen] Failed to cleanup PDF file:', cleanupError)
        }
      }
      
      if (error instanceof Error && error.message === NO_WRITABLE_DIR_ERROR) {
        Alert.alert('無法建立 PDF', '目前環境無法建立 PDF 檔案，已改為分享文字內容。')
        await fallbackShareText(buildWeeklyReportMarkdown(reportData))
        return
      }
      throw error
    }
  }

  const shareReportAsMarkdown = async (reportData: WeeklyReportData) => {
    const markdown = buildWeeklyReportMarkdown(reportData)
    // 直接分享文字內容（Markdown 格式）
    await Share.share({
      message: markdown,
      title: `DietDaily 每週健康報表（${reportData.startLabel} ~ ${reportData.endLabel}）`,
    })
  }

  const handleGenerateWeeklyReport = () => {
    const hasFood = (foodEntries?.length ?? 0) > 0
    const hasSymptoms = (symptomEntries?.length ?? 0) > 0

    if (!hasFood && !hasSymptoms) {
      Alert.alert('尚無資料', '請至少記錄一筆飲食或症狀後再產生報表。')
      return
    }

    const handleSelection = async (format: 'pdf' | 'markdown') => {
      setIsGeneratingWeeklyReport(true)
      try {
        const reportData = buildWeeklyReportData()
        if (format === 'pdf') {
          await shareReportAsPDF(reportData)
        } else {
          await shareReportAsMarkdown(reportData)
        }
      } catch (error) {
        console.error('[Dashboard] Failed to generate weekly report:', error)
        Alert.alert('產生失敗', '建立報表時發生錯誤，請稍後再試。')
      } finally {
        setIsGeneratingWeeklyReport(false)
      }
    }

    Alert.alert(
      '選擇報表格式',
      '請選擇要輸出的報表格式。',
      [
        {
          text: 'PDF (含排版)',
          onPress: () => {
            void handleSelection('pdf')
          },
        },
        {
          text: 'Markdown (文字)',
          onPress: () => {
            void handleSelection('markdown')
          },
        },
        { text: '取消', style: 'cancel' },
      ]
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
          timestamp: totalRecords > 0 ? undefined : now,
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
      analysisVersion: '等待伺服器更新',
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleToggleAllReports = async () => {
    if (!showAllReports) {
      if (user?.id && hasPendingServerHistory && !isHistoryLoading) {
        try {
          setIsHistoryLoading(true)
          const fullHistory = await DashboardService.loadAnalysisHistory(user.id)
          if (fullHistory.length) {
            setHistory(fullHistory)
          }
          setHasAllHistory(true)
        } catch (error) {
          console.error('[DashboardScreen] Failed to load full analysis history:', error)
        } finally {
          setIsHistoryLoading(false)
        }
      }
      setShowAllReports(true)
    } else {
      setShowAllReports(false)
    }
  }

  const handleAIAnalysis = async () => {
    if (!user?.id) {
      console.warn('[Dashboard] No user ID available for analysis')
      return
    }

    try {
      setIsAnalyzing(true)
      setAnalysisCountdown(60)
      const estimatedFoodEntries =
        weeklyTrend?.week?.reduce((sum, day) => sum + (day.foodCount || 0), 0) || 0
      const estimatedSymptomEntries =
        weeklyTrend?.week?.reduce((sum, day) => sum + (day.symptomCount || 0), 0) || 0

      setAnalysisStatus(buildInitialStatus(estimatedFoodEntries, estimatedSymptomEntries))

      // 先觸發 AI 分析 (POST request)
      console.log('[Dashboard] Triggering AI analysis...')
      const analysisResult = await DashboardService.triggerWeeklyAnalysis(user.id)

      if (!analysisResult.success) {
        console.error('[Dashboard] Failed to trigger analysis:', analysisResult.error)
        const timestamp = new Date().toISOString()
        setAnalysisStatus((prev) => {
          const base = prev ?? buildInitialStatus(estimatedFoodEntries, estimatedSymptomEntries)
          return {
            ...base,
            steps: base.steps.map((step) => ({
              ...step,
              state: 'failed',
              detail: analysisResult.error || '分析請求失敗',
              timestamp,
            })),
            reportGenerated: false,
            lastUpdated: timestamp,
          }
        })
        return
      }

      console.log('[Dashboard] Analysis triggered successfully, updating data...')

      // 更新歷史記錄
      if (analysisResult.history && analysisResult.history.length > 0) {
        setHistory(analysisResult.history)
        const newReportId = analysisResult.history[0].id
        setLatestReportId(newReportId)

        // 滾動到報告歷史區域
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }, 500)

        // 5 秒後清除高亮標記
        setTimeout(() => setLatestReportId(null), 5000)
      }

      // 刷新 Dashboard 數據以更新 UI
      await refetch()

      console.log('[Dashboard] AI analysis完成！')
    } finally {
      setIsAnalyzing(false)
      setAnalysisCountdown(0)
    }
  }

  // 移除舊的輪詢程式碼，保留註解版本作為參考
  /*
  const oldPollingCode = async (): Promise<boolean> => {
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
  */

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

  const composeShareContent = (item: WeeklyAnalysisHistoryItem) => {
    const title = item.title
    const summaryText = item.summary ? `<p>${item.summary}</p>` : ''

    // 飲食總覽 (all_foods_overview) - 從 foodsToMonitor 生成完整列表並包含理由
    const allFoodsOverview = item.allFoodsOverview

    // 為高風險食物添加理由（從 foodsToMonitor 中提取）
    const foodsToMonitorMap = new Map(
      (item.foodsToMonitor || []).map(food => [food.food, food])
    )

    const highRiskFoods = (allFoodsOverview?.high_risk_foods || [])
      .map((food) => {
        const details = foodsToMonitorMap.get(food)
        if (details?.reasoning?.length) {
          return `<li>🔴 <strong>${food}</strong><br/><small style="color: #6b7280;">理由：${details.reasoning.join('、')}</small></li>`
        }
        return `<li>🔴 ${food}</li>`
      })
      .join('')

    const moderateRiskFoods = (allFoodsOverview?.moderate_risk_foods || [])
      .map((food) => {
        const details = foodsToMonitorMap.get(food)
        if (details?.reasoning?.length) {
          return `<li>🟡 <strong>${food}</strong><br/><small style="color: #6b7280;">理由：${details.reasoning.join('、')}</small></li>`
        }
        return `<li>🟡 ${food}</li>`
      })
      .join('')

    const watchFoods = (allFoodsOverview?.watch_foods || [])
      .map((food) => {
        const details = foodsToMonitorMap.get(food)
        if (details?.reasoning?.length) {
          return `<li>👀 <strong>${food}</strong><br/><small style="color: #6b7280;">理由：${details.reasoning.join('、')}</small></li>`
        }
        return `<li>👀 ${food}</li>`
      })
      .join('')

    const supportiveFoodsOverview = (allFoodsOverview?.supportive_foods || [])
      .map((food) => `<li>✅ ${food}</li>`)
      .join('')

    const neutralFoods = (allFoodsOverview?.neutral_foods || [])
      .map((food) => `<li>⚪ ${food}</li>`)
      .join('')

    const allFoodsOverviewHtml =
      highRiskFoods || moderateRiskFoods || watchFoods || supportiveFoodsOverview || neutralFoods
        ? `<h2>📊 本週飲食總覽</h2>
           ${highRiskFoods ? `<h3 style="color: #dc2626;">🔴 高風險食物（需避免或減少）</h3><ul>${highRiskFoods}</ul>` : ''}
           ${moderateRiskFoods ? `<h3 style="color: #ea580c;">🟡 中度風險食物（需觀察調整）</h3><ul>${moderateRiskFoods}</ul>` : ''}
           ${watchFoods ? `<h3 style="color: #d97706;">👀 需持續觀察</h3><ul>${watchFoods}</ul>` : ''}
           ${supportiveFoodsOverview ? `<h3 style="color: #16a34a;">✅ 有益食物（可繼續攝取）</h3><ul>${supportiveFoodsOverview}</ul>` : ''}
           ${neutralFoods ? `<h3 style="color: #6b7280;">⚪ 中性食物（無明顯影響）</h3><ul>${neutralFoods}</ul>` : ''}`
        : ''

    // 移除「需留意食物」和「建議加強食物」的詳細分析區塊
    const foodsToMonitor = ''
    const supportiveFoods = ''

    const reasoningTrace = (item.reasoningTrace || []).map((note) => `<li>${note}</li>`).join('')
    const evidenceNotes = (item.evidenceNotes || []).map((note) => `<li>${note}</li>`).join('')

    // 移除「每日餐點解析」區塊
    const dailySections = ''
    const hasMoreDaily = ''

    const nextStepsMaintain = (item.nextSteps?.maintain || [])
      .map((step) => `<li>${step}</li>`)
      .join('')
    const nextStepsMonitor = (item.nextSteps?.monitor || [])
      .map((step) => `<li>${step}</li>`)
      .join('')
    const nextStepsExperiments = (item.nextSteps?.experiments || [])
      .map((step) => `<li>${step}</li>`)
      .join('')

    // Fix corrupted characters in followUpActions (replace � with 症)
    const fixedFollowUpActions = item.followUpActions.map((action) => {
      return action.replace(/��/g, '症').replace(/\uFFFD/g, '症')
    })

    const followUps = fixedFollowUpActions
      .map((action) => `<li>${action}</li>`)
      .join('')

    const reasoningHtml = reasoningTrace ? `<h2>推論重點</h2><ol>${reasoningTrace}</ol>` : ''
    const evidenceHtml = evidenceNotes ? `<h2>資料證據</h2><ul>${evidenceNotes}</ul>` : ''
    const dailyHtml = dailySections
      ? `<h2>每日餐點解析</h2>${dailySections}${hasMoreDaily}`
      : ''
    const nextStepsHtml =
      nextStepsMaintain || nextStepsMonitor || nextStepsExperiments
        ? `<h2>下週調整計畫</h2>
            ${
              nextStepsMaintain
                ? `<h3>維持策略</h3><ul>${nextStepsMaintain}</ul>`
                : ''
            }
            ${
              nextStepsMonitor
                ? `<h3>監測提醒</h3><ul>${nextStepsMonitor}</ul>`
                : ''
            }
            ${
              nextStepsExperiments
                ? `<h3>實驗/調整</h3><ul>${nextStepsExperiments}</ul>`
                : ''
            }`
        : ''

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
  ${item.aiModel ? `<p style="color: #6b7280; font-size: 14px;"><strong>AI 模型：</strong>${getModelDisplayName(item.aiModel)}</p>` : ''}
  ${summaryText}
  ${allFoodsOverviewHtml}
  ${foodsToMonitor ? `<h2>需留意食物（詳細分析）</h2><ul>${foodsToMonitor}</ul>` : ''}
  ${supportiveFoods ? `<h2>建議加強食物（詳細分析）</h2><ul>${supportiveFoods}</ul>` : ''}
  ${reasoningHtml}
  ${dailyHtml}
  ${nextStepsHtml}
  ${followUps ? `<h2>下週行動重點</h2><ul>${followUps}</ul>` : ''}
  ${evidenceHtml}
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
    if (item.reasoningTrace?.length) {
      textParts.push('推論重點：')
      item.reasoningTrace.slice(0, 3).forEach((note) => textParts.push(`• ${note}`))
      if (item.reasoningTrace.length > 3) {
        textParts.push(`（其餘 ${item.reasoningTrace.length - 3} 項請於完整報告查看）`)
      }
    }
    if (item.dailyFoodBreakdown?.length) {
      const firstDay = item.dailyFoodBreakdown[0]
      textParts.push(`每日餐點：${firstDay.date}${firstDay.day_summary ? `－${firstDay.day_summary}` : ''}`)
      if (firstDay.meals?.length) {
        const meal = firstDay.meals[0]
        const foods = (meal.foods || [])
          .slice(0, 3)
          .map((food) => `${food.name}${food.suitability ? `（${food.suitability}）` : ''}`)
        if (foods.length) {
          textParts.push(`• ${meal.meal || '未標註餐別'}：${foods.join('、')}`)
        }
      }
      if (item.dailyFoodBreakdown.length > 1) {
        textParts.push('（更多日子請於完整報告查看）')
      }
    }
    if (item.nextSteps) {
      const { maintain = [], monitor = [], experiments = [] } = item.nextSteps
      if (maintain.length) {
        textParts.push('維持策略：')
        maintain.slice(0, 2).forEach((step) => textParts.push(`• ${step}`))
      }
      if (monitor.length) {
        textParts.push('監測提醒：')
        monitor.slice(0, 2).forEach((step) => textParts.push(`• ${step}`))
      }
      if (experiments.length) {
        textParts.push('實驗/調整：')
        experiments.slice(0, 2).forEach((step) => textParts.push(`• ${step}`))
      }
    }
    if (item.followUpActions.length) {
      textParts.push('下週行動重點：')
      item.followUpActions.forEach((action) => textParts.push(`• ${action}`))
    }
    if (item.evidenceNotes?.length) {
      textParts.push('資料證據：')
      item.evidenceNotes.slice(0, 3).forEach((note) => textParts.push(`• ${note}`))
    }

    return {
      html,
      text: textParts.join('\n'),
    }
  }

  const handleShareAnalysis = async (item: WeeklyAnalysisHistoryItem) => {
    try {
      const { text } = composeShareContent(item)
      await Share.share({ message: text })
    } catch (error) {
      console.error('[Dashboard] Failed to share summary:', error)
    }
  }

  const handleOpenSummaryInSafari = async (item: WeeklyAnalysisHistoryItem) => {
    const { html } = composeShareContent(item)
    try {

      // iOS Safari 不支援 data: URL，改用檔案系統 + Sharing
      const sanitizedFileName = `analysis-summary-${item.startDate}-${item.endDate}`.replace(
        /[^\w.-]/g,
        '_'
      )
      const htmlFileName = `${sanitizedFileName}.html`
      const filePath = await writeTextFile(htmlFileName, html)

      // 使用系統分享功能開啟
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/html',
          dialogTitle: item.title,
          UTI: 'public.html',
        })
      } else {
        console.warn('[Dashboard] Sharing not available')
        // fallback: 嘗試直接用瀏覽器開啟（可能失敗）
        await Linking.openURL(filePath)
      }
    } catch (error) {
      console.error('[Dashboard] Failed to open summary:', error)
      if (error instanceof Error && error.message === NO_WRITABLE_DIR_ERROR) {
        Alert.alert(
          '僅能分享文字內容',
          '目前環境無法建立報告檔案，已改為分享文字摘要。'
        )
        await Share.share({ message: html })
        return
      }
      Alert.alert('無法開啟', '請稍後再試或改用其他分享方式。')
    }
  }

  const handleViewReport = async (item: WeeklyAnalysisHistoryItem) => {
    const startTime = Date.now()
    console.log('[DashboardScreen] 📖 Loading report...', { id: item.id, startDate: item.startDate })

    // 使用 setTimeout 讓 UI 有機會顯示加載狀態
    setTimeout(() => {
      const { html } = composeShareContent(item)
      const base64Html = Buffer.from(html, 'utf-8').toString('base64')

      const loadTime = Date.now() - startTime
      console.log(`[DashboardScreen] ✅ Report loaded in ${loadTime}ms`)

      navigation.navigate('ReportDetail', { htmlContent: base64Html })
    }, 50) // 50ms delay to show loading state
  }

  const renderReportHighlights = (item: WeeklyAnalysisHistoryItem) => {
    const reasoning = item.reasoningTrace || []
    const evidence = item.evidenceNotes || []
    const daily = item.dailyFoodBreakdown || []
    const nextSteps = item.nextSteps || { maintain: [], monitor: [], experiments: [] }

    const firstDay = daily[0]
    const firstMeal = firstDay?.meals?.[0]
    const firstFoods = firstMeal?.foods?.slice(0, 2) || []
    const hasNextSteps =
      (nextSteps.maintain?.length || 0) > 0 ||
      (nextSteps.monitor?.length || 0) > 0 ||
      (nextSteps.experiments?.length || 0) > 0

    if (
      reasoning.length === 0 &&
      !firstDay &&
      !hasNextSteps &&
      evidence.length === 0
    ) {
      return null
    }

    return (
      <View style={styles.historyHighlights}>
        {reasoning.length > 0 ? (
          <View style={styles.historyDetailSection}>
            <Text style={styles.historyDetailTitle}>推論重點</Text>
            {reasoning.slice(0, 2).map((note, index) => (
              <Text key={`${item.id}-reason-${index}`} style={styles.historyDetailText}>
                • {note}
              </Text>
            ))}
            {reasoning.length > 2 && (
              <Text style={styles.historyDetailMore}>
                其餘 {reasoning.length - 2} 項請於完整報告查看
              </Text>
            )}
          </View>
        ) : null}

        {firstDay ? (
          <View style={styles.historyDetailSection}>
            <Text style={styles.historyDetailTitle}>每日餐點亮點</Text>
            <Text style={styles.historyDetailText}>
              📅 {firstDay.date}：{firstDay.day_summary || '當日未提供摘要。'}
            </Text>
            {firstFoods.length > 0 ? (
              <Text style={styles.historyDetailText}>
                🍽 {firstMeal?.meal || '未標註餐別'}：{' '}
                {firstFoods
                  .map((food) =>
                    `${food.name}${food.suitability ? `（${food.suitability}）` : ''}`
                  )
                  .join('、')}
              </Text>
            ) : null}
            {daily.length > 1 && (
              <Text style={styles.historyDetailMore}>
                另外 {daily.length - 1} 天的細節請於完整報告查看
              </Text>
            )}
          </View>
        ) : null}

        {hasNextSteps ? (
          <View style={styles.historyDetailSection}>
            <Text style={styles.historyDetailTitle}>下週調整計畫</Text>
            {nextSteps.maintain?.slice(0, 2).map((step, index) => (
              <Text key={`${item.id}-maintain-${index}`} style={styles.historyDetailText}>
                ✅ {step}
              </Text>
            ))}
            {nextSteps.monitor?.slice(0, 2).map((step, index) => (
              <Text key={`${item.id}-monitor-${index}`} style={styles.historyDetailText}>
                👀 {step}
              </Text>
            ))}
            {nextSteps.experiments?.slice(0, 2).map((step, index) => (
              <Text key={`${item.id}-experiment-${index}`} style={styles.historyDetailText}>
                🧪 {step}
              </Text>
            ))}
          </View>
        ) : null}

        {evidence.length > 0 ? (
          <View style={styles.historyDetailSection}>
            <Text style={styles.historyDetailTitle}>資料證據</Text>
            {evidence.slice(0, 2).map((note, index) => (
              <Text key={`${item.id}-evidence-${index}`} style={styles.historyDetailText}>
                • {note}
              </Text>
            ))}
            {evidence.length > 2 && (
              <Text style={styles.historyDetailMore}>
                更多證據詳見完整報告
              </Text>
            )}
          </View>
        ) : null}
      </View>
    )
  }

  // 首次載入時顯示骨架 UI
  if (isLoading && !stats) {
    return <DashboardSkeleton />
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
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>健康儀表板</Text>
            <Text style={styles.headerSubtitle}>
              {user?.name || user?.email || '使用者'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Settings' } as any)}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
              <Text style={styles.logoutIcon}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {renderFoodKnowledgeBanner()}

      {/* Tab Navigation */}
      {!hideTabNavigation && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
            onPress={() => handleTabChange('stats')}
          >
            <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
              📊 記錄
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'trends' && styles.tabActive]}
            onPress={() => handleTabChange('trends')}
          >
            <Text style={[styles.tabText, activeTab === 'trends' && styles.tabTextActive]}>
              📈 趨勢
            </Text>
          </TouchableOpacity>
          {enableAIUI && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'insights' && styles.tabActive]}
              onPress={() => handleTabChange('insights')}
            >
              <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>
                💡 洞察
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.tab, activeTab === 'reports' && styles.tabActive]}
            onPress={() => handleTabChange('reports')}
          >
            <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>
              📝 報告
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Stats - Compact Combined Layout */}
      {activeTab === 'stats' && (
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
      )}

      {activeTab === 'reports' && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>每週報表</Text>
            <Text style={styles.reportGeneratorDescription}>
              輕鬆匯出 Markdown 報表，分享給團隊或醫師。可指定 7 天區間，內容包含飲食、症狀與趨勢摘要。
            </Text>
            <View style={styles.reportRangeContainer}>
              <TouchableOpacity
                style={styles.reportRangePicker}
                onPress={() => handleOpenReportPicker('start')}
              >
                <Text style={styles.reportRangeLabel}>起始日期</Text>
                <Text style={styles.reportRangeValue}>{formatDateLabel(reportRangeStart)}</Text>
              </TouchableOpacity>
              <View style={styles.reportRangeDivider}>
                <Text style={styles.reportRangeDividerText}>至</Text>
              </View>
              <TouchableOpacity
                style={styles.reportRangePicker}
                onPress={() => handleOpenReportPicker('end')}
              >
                <Text style={styles.reportRangeLabel}>結束日期</Text>
                <Text style={styles.reportRangeValue}>{formatDateLabel(reportRangeEnd)}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.generateReportButton,
                isGeneratingWeeklyReport && styles.generateReportButtonDisabled,
              ]}
              onPress={handleGenerateWeeklyReport}
              disabled={isGeneratingWeeklyReport}
            >
              {isGeneratingWeeklyReport ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.generateReportButtonText}>產生一週報表</Text>
              )}
            </TouchableOpacity>
            {!enableAIUI && (
              <Text style={styles.reportPausedNote}>
                AI 洞察暫停開發中，目前僅提供手動報表工具。
              </Text>
            )}
          </View>

          {enableAIUI && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI 分析報告歷史</Text>
              {insights.some((insight) => insight.id.startsWith('ai-timeout')) && (
                <View style={styles.analysisPendingBanner}>
                  <Text style={styles.analysisPendingText}>
                    AI 分析仍在生成中，完成後將自動更新最新報告。
                  </Text>
                </View>
              )}
              {analysisStatus && !analysisStatus.reportGenerated ? (
                <View style={styles.analysisStatusCard}>
                  <Text style={styles.analysisStatusTitle}>AI 分析仍在進行</Text>
                  <Text style={styles.analysisStatusSummary}>
                    {`資料筆數：${analysisStatus.datasetSummary.totalRecords}（飲食 ${analysisStatus.datasetSummary.foodEntries}、症狀 ${analysisStatus.datasetSummary.symptomEntries}）`}
                  </Text>
                  {analysisStatus.lastUpdated ? (
                    <Text style={styles.analysisStatusTimestamp}>
                      最後更新：{new Date(analysisStatus.lastUpdated).toLocaleString('zh-TW')}
                    </Text>
                  ) : null}
                  {analysisStatus.steps?.map((step) => renderStatusStep(step, 'report-'))}
                </View>
              ) : null}
              {history.length > 0 ? (
                <>
                  {history.slice(0, 2).map((item) => (
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
                          {item.analysisVersion ? (
                            <Text style={styles.historyVersion}>
                              分析版本：{item.analysisVersion}
                            </Text>
                          ) : null}
                          {item.analysisMode ? (
                            <Text style={styles.historyVersion}>
                              分析方式：{item.analysisMode === 'chunked' ? 'Chunked（分段）' : 'Single Pass'}
                            </Text>
                          ) : null}
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
                      {renderReportHighlights(item)}
                    </View>
                  ))}

                  {showExpandButton && (
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={handleToggleAllReports}
                    >
                      <Text style={styles.expandButtonText}>
                        {hasPendingServerHistory
                          ? `載入更多報告${remainingServerCount > 0 ? `（尚有 ${remainingServerCount} 週）` : ''}`
                          : `還有 ${Math.max(history.length - 2, 0)} 週的報告`}
                      </Text>
                      <Text style={styles.expandButtonIcon}>▼</Text>
                    </TouchableOpacity>
                  )}

                  {isHistoryLoading && !showAllReports ? (
                    <View style={styles.historyLoading}>
                      <ActivityIndicator size="small" color={colors.primary[500]} />
                      <Text style={styles.historyLoadingText}>載入更多報告中...</Text>
                    </View>
                  ) : null}

                  {showAllReports && history.slice(2).map((item) => (
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
                          {item.analysisVersion ? (
                            <Text style={styles.historyVersion}>
                              分析版本：{item.analysisVersion}
                            </Text>
                          ) : null}
                          {item.analysisMode ? (
                            <Text style={styles.historyVersion}>
                              分析方式：{item.analysisMode === 'chunked' ? 'Chunked（分段）' : 'Single Pass'}
                            </Text>
                          ) : null}
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
                      {renderReportHighlights(item)}
                    </View>
                  ))}

                  {showAllReports && history.length > 2 && (
                    <TouchableOpacity
                      style={styles.collapseButton}
                      onPress={handleToggleAllReports}
                    >
                      <Text style={styles.expandButtonText}>收起舊報告</Text>
                      <Text style={styles.expandButtonIcon}>▲</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={styles.historyEmptyText}>尚未產生任何 AI 報告。</Text>
              )}
            </View>
          )}
        </>
      )}

      {/* Weekly Charts */}
      {activeTab === 'trends' && weeklyTrend && (
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
      {enableAIUI && activeTab === 'insights' && (
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

      {/* Version Info */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>
          v{Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'N/A'} (
          {Platform.OS === 'ios'
            ? `Build ${Constants.expoConfig?.ios?.buildNumber ?? Constants.nativeBuildVersion ?? 'N/A'}`
            : `Build ${
                Constants.expoConfig?.android?.versionCode ??
                Constants.nativeBuildVersion ??
                'N/A'
              }`}
          )
        </Text>
      </View>
      </ScrollView>

      {Platform.OS === 'ios' && reportPickerVisible && (
        <Modal
          visible={reportPickerVisible}
          transparent
          animationType="slide"
        >
          <View style={styles.reportPickerModalOverlay}>
            <View style={styles.reportPickerModal}>
              <Text style={styles.reportPickerTitle}>
                選擇{reportPickerTarget === 'start' ? '起始' : '結束'}日期
              </Text>
              <DateTimePicker
                value={tempReportDate}
                mode="date"
                display="inline"
                onChange={(_, date) => {
                  if (date) {
                    setTempReportDate(date)
                  }
                }}
              />
              <View style={styles.reportPickerActions}>
                <TouchableOpacity
                  style={styles.reportPickerButton}
                  onPress={handleCancelReportPickerIOS}
                >
                  <Text style={styles.reportPickerButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.reportPickerButton, styles.reportPickerButtonPrimary]}
                  onPress={handleConfirmReportPickerIOS}
                >
                  <Text
                    style={[
                      styles.reportPickerButtonText,
                      styles.reportPickerButtonPrimaryText
                    ]}
                  >
                    確認
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && reportPickerVisible && (
        <DateTimePicker
          value={tempReportDate}
          mode="date"
          display="default"
          onChange={handleReportPickerChange}
        />
      )}

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
            {analysisStatus?.analysisVersion ? (
              <Text style={styles.modalTextSmall}>
                分析版本：{analysisStatus.analysisVersion}
              </Text>
            ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  foodKnowledgeBanner: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: '#FEF9C3',
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  foodKnowledgeTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  foodKnowledgeMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
  foodKnowledgeAction: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  foodKnowledgeActionText: {
    color: colors.surface,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  settingsButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  settingsIcon: {
    fontSize: 24,
  },
  logoutButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  logoutIcon: {
    fontSize: 24,
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
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  tabTextActive: {
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
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
  reportGeneratorDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  reportRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reportRangePicker: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  reportRangeLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportRangeValue: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  reportRangeDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  reportRangeDividerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  generateReportButton: {
    backgroundColor: colors.primary[600],
    paddingVertical: spacing.md,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  generateReportButtonDisabled: {
    opacity: 0.7,
  },
  generateReportButtonText: {
    color: colors.surface,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  reportPausedNote: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  analysisPendingBanner: {
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
  },
  analysisPendingText: {
    color: colors.primary[700],
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
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
  historyEmptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
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
  historyVersion: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
    marginTop: spacing.xs / 2,
  },
  historySummary: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  historyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  historyLoadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
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
  historyHighlights: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  historyDetailSection: {
    gap: spacing.xs,
  },
  historyDetailTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  historyDetailText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  historyDetailMore: {
    fontSize: typography.fontSize.xs,
    color: colors.text.disabled,
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
  expandButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  expandButtonIcon: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
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
  modalTextSmall: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
    textAlign: 'center',
  },
  modalStatusContainer: {
    width: '100%',
    marginTop: spacing.sm,
  },
  reportPickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000080',
  },
  reportPickerModal: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  reportPickerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  reportPickerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reportPickerButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reportPickerButtonPrimary: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  reportPickerButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  reportPickerButtonPrimaryText: {
    color: colors.surface,
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
