import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { colors, typography, spacing } from '@/theme'
import { useAuth } from '@/features/auth/hooks/useAuth'

export type AIModelPreference = 'sonnet-4.5-latest' | 'haiku-3.5-latest' | 'haiku-3-legacy' | 'mock'

interface AIModelOption {
  value: AIModelPreference
  label: string
  description: string
  costLevel: 'free' | 'low' | 'medium' | 'high'
  estimatedCostPerAnalysis: string
  icon: string
}

const AI_MODEL_OPTIONS: AIModelOption[] = [
  {
    value: 'sonnet-4.5-latest',
    label: 'Claude 4.5 Sonnet（最新）',
    description: '最強大的模型，分析最準確深入',
    costLevel: 'high',
    estimatedCostPerAnalysis: '~$0.06-0.10',
    icon: 'star',
  },
  {
    value: 'haiku-3.5-latest',
    label: 'Claude 3.5 Haiku（推薦）',
    description: '平衡性能與成本，適合日常使用',
    costLevel: 'medium',
    estimatedCostPerAnalysis: '~$0.01-0.02',
    icon: 'check-circle',
  },
  {
    value: 'haiku-3-legacy',
    label: 'Claude 3 Haiku（經濟）',
    description: '最便宜，但 token 限制較小',
    costLevel: 'low',
    estimatedCostPerAnalysis: '~$0.003-0.006',
    icon: 'cash',
  },
  {
    value: 'mock',
    label: '測試模式（免費）',
    description: '使用模擬資料，完全免費，適合測試',
    costLevel: 'free',
    estimatedCostPerAnalysis: '$0.00',
    icon: 'test-tube',
  },
]

const COST_LEVEL_COLORS = {
  free: '#10b981', // green
  low: '#3b82f6', // blue
  medium: '#f59e0b', // orange
  high: '#ef4444', // red
}

interface AIModelSelectorProps {
  onChange?: (preference: AIModelPreference) => void
}

export function AIModelSelector({ onChange }: AIModelSelectorProps) {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [currentPreference, setCurrentPreference] = useState<AIModelPreference>('haiku-3.5-latest')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const currentOption = AI_MODEL_OPTIONS.find((opt) => opt.value === currentPreference)

  useEffect(() => {
    loadPreference()
  }, [user?.id])

  const loadPreference = async () => {
    if (!user?.id) return

    const apiBase = process.env.EXPO_PUBLIC_API_URL
    if (!apiBase) {
      console.warn('[AIModelSelector] EXPO_PUBLIC_API_URL not configured')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${apiBase}/api/user/ai-model-preference?userId=${user.id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentPreference(data.preference)
      } else {
        console.error('Failed to load preference:', response.status, await response.text())
      }
    } catch (error) {
      console.error('Failed to load AI model preference:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectModel = async (preference: AIModelPreference) => {
    if (!user?.id) return

    const apiBase = process.env.EXPO_PUBLIC_API_URL
    if (!apiBase) {
      console.warn('[AIModelSelector] EXPO_PUBLIC_API_URL not configured')
      Alert.alert('錯誤', 'API 設定錯誤，請稍後再試')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`${apiBase}/api/user/ai-model-preference`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id, preference }),
      })

      if (response.ok) {
        setCurrentPreference(preference)
        setShowModal(false)
        onChange?.(preference)
        Alert.alert('設定已更新', '下次執行 AI 分析時將使用新的模型')
      } else {
        const errorText = await response.text()
        console.error('[AIModelSelector] Failed to save:', response.status, errorText)
        throw new Error(`Server returned ${response.status}`)
      }
    } catch (error) {
      console.error('[AIModelSelector] Error:', error)
      Alert.alert('更新失敗', '無法儲存 AI 模型設定，請稍後再試')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>AI 分析模型</Text>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    )
  }

  return (
    <>
      <TouchableOpacity style={styles.settingRow} onPress={() => setShowModal(true)}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>AI 分析模型</Text>
          <Text style={styles.settingValue}>{currentOption?.label || '未設定'}</Text>
        </View>
        <Icon name="chevron-right" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>選擇 AI 分析模型</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Options List */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {AI_MODEL_OPTIONS.map((option) => {
              const isSelected = option.value === currentPreference
              const costColor = COST_LEVEL_COLORS[option.costLevel]

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => handleSelectModel(option.value)}
                  disabled={isSaving}
                >
                  <View style={styles.optionHeader}>
                    <View style={styles.optionTitleRow}>
                      <Icon
                        name={option.icon}
                        size={24}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                        {option.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Icon name="check-circle" size={24} color={colors.primary} />
                    )}
                  </View>

                  <Text style={styles.optionDescription}>{option.description}</Text>

                  <View style={styles.optionFooter}>
                    <View style={[styles.costBadge, { backgroundColor: costColor }]}>
                      <Text style={styles.costBadgeText}>
                        {option.costLevel === 'free'
                          ? '免費'
                          : option.costLevel === 'low'
                          ? '經濟'
                          : option.costLevel === 'medium'
                          ? '中等'
                          : '較貴'}
                      </Text>
                    </View>
                    <Text style={styles.costEstimate}>{option.estimatedCostPerAnalysis}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}

            <View style={styles.infoBox}>
              <Icon name="information" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                成本估算為每次週報分析的大約費用。實際費用可能因分析內容長度而異。
              </Text>
            </View>
          </ScrollView>

          {isSaving && (
            <View style={styles.savingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.savingText}>儲存中...</Text>
            </View>
          )}
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  settingValue: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  optionLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  optionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  optionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  costBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  costBadgeText: {
    ...typography.caption,
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 11,
  },
  costEstimate: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingText: {
    ...typography.body,
    color: '#ffffff',
    marginTop: spacing.sm,
  },
})
