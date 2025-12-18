// 健康報告產生器 UI 元件
// 讓使用者產生並分享 7 天健康報告 PDF

import React, { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { format, subDays } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ReportService } from '../services/ReportService'
import { PDFGeneratorService } from '../services/PDFGeneratorService'
import { colors, typography, spacing } from '@/theme'
import { FEATURE_FLAGS } from '@/shared/config/featureFlags'

type ReportPeriod = 7 | 14 | 30

interface ReportGeneratorProps {
  /** 自訂日期範圍（可選） */
  endDate?: Date
  /** 包含天數（預設 7 天） */
  includeDays?: ReportPeriod
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  endDate: customEndDate,
  includeDays: propIncludeDays = 7
}) => {
  const { user } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(propIncludeDays)
  const isMountedRef = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 清理函數
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  /**
   * 處理報告產生
   */
  const handleGenerateReport = async () => {
    if (!user?.id) {
      Alert.alert('錯誤', '請先登入')
      return
    }

    setIsGenerating(true)
    setProgress(0)

    try {
      // 步驟 1: 產生報告資料 (40%)
      console.log('[ReportGenerator] Step 1: Generating report data...')
      setProgress(40)

      const { data: report, error } = await ReportService.generateWeeklyReport(
        user.id,
        {
          endDate: customEndDate,
          includeDays: selectedPeriod
        }
      )

      if (error || !report) {
        throw new Error(error?.message || '報告產生失敗')
      }

      console.log('[ReportGenerator] Report data generated successfully')

      // 步驟 2: 生成 PDF (80%)
      console.log('[ReportGenerator] Step 2: Generating PDF...')
      setProgress(80)

      const { success, error: pdfError } = await PDFGeneratorService.generateAndShare(report)

      if (!success) {
        throw new Error(pdfError || 'PDF 生成失敗')
      }

      console.log('[ReportGenerator] PDF generated and shared successfully')

      // 完成 (100%)
      if (isMountedRef.current) {
        setProgress(100)
      }

      // 成功後重置
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setIsGenerating(false)
          setProgress(0)
        }
      }, 500)

    } catch (error) {
      console.error('[ReportGenerator] Error:', error)

      if (!isMountedRef.current) {
        return // 組件已卸載，不執行後續操作
      }

      Alert.alert(
        '產生失敗',
        error instanceof Error ? error.message : '未知錯誤',
        [
          {
            text: '確定',
            onPress: () => {
              if (isMountedRef.current) {
                setIsGenerating(false)
                setProgress(0)
              }
            }
          }
        ]
      )
    }
  }

  // 計算日期範圍
  const endDate = customEndDate || new Date()
  const startDate = subDays(endDate, selectedPeriod - 1)

  // 期間選項
  const periodOptions: { value: ReportPeriod; label: string }[] = [
    { value: 7, label: '7 天' },
    { value: 14, label: '14 天' },
    { value: 30, label: '30 天' },
  ]

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📄 產生健康報告</Text>

      <Text style={styles.description}>
        產生 {format(startDate, 'MM/dd', { locale: zhTW })} - {format(endDate, 'MM/dd', { locale: zhTW })} 的完整健康報告
      </Text>

      {/* 期間選擇器 */}
      <View style={styles.periodSelector}>
        {periodOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.periodButton,
              selectedPeriod === option.value && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(option.value)}
            disabled={isGenerating}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === option.value && styles.periodButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isGenerating && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color={colors.primary[500]} />
          <Text style={styles.progressText}>
            產生中... {progress}%
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleGenerateReport}
        disabled={isGenerating}
        style={[
          styles.button,
          isGenerating && styles.buttonDisabled
        ]}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>
          {isGenerating ? '產生中...' : '📥 產生並分享 PDF'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        報告將包含：飲食記錄、症狀追蹤、排便記錄
      </Text>

      {/* AI 分析說明 - 僅在功能啟用時顯示 */}
      {FEATURE_FLAGS.UPGRADE_PROMPTS_ENABLED && (
        <View style={styles.aiNotice}>
          <Icon name="information" size={16} color={colors.primary[500]} />
          <Text style={styles.aiNoticeText}>
            AI 飲食分析為 Premium 功能，請升級以獲得個人化建議
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  periodButtonActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  periodButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  periodButtonTextActive: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  progressContainer: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  progressText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  button: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.gray[300],
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  hint: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  aiNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  aiNoticeText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.primary[700],
    lineHeight: 16,
  },
})
