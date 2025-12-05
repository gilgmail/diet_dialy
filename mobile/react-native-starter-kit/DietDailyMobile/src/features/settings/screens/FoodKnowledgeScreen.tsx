import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { FoodKnowledgeService, type FoodKnowledgeStatusSummary } from '../services/FoodKnowledgeService'
import { colors, typography, spacing } from '@/theme'

export function FoodKnowledgeScreen() {
  const { user } = useAuth()
  const [knowledgeStatus, setKnowledgeStatus] = useState<FoodKnowledgeStatusSummary | null>(null)
  const [knowledgeLoading, setKnowledgeLoading] = useState(false)

  useEffect(() => {
    loadFoodKnowledgeStatus()
  }, [user?.id])

  const loadFoodKnowledgeStatus = async () => {
    if (!user?.id) return

    try {
      const status = await FoodKnowledgeService.getStatus(user.id)
      setKnowledgeStatus(status)
    } catch (error) {
      console.warn('[FoodKnowledgeScreen] Failed to load status:', error)
    }
  }

  const handleManualKnowledgeRefresh = async () => {
    if (!user?.id) return

    setKnowledgeLoading(true)
    try {
      await loadFoodKnowledgeStatus()
    } catch (error) {
      console.warn('[FoodKnowledgeScreen] refresh status error:', error)
      Alert.alert('錯誤', '無法重新載入狀態。')
    } finally {
      setKnowledgeLoading(false)
    }
  }

  const handleSyncMissingFoods = async () => {
    if (!user?.id) return

    Alert.alert(
      '同步缺失食物',
      '將找出所有沒有 AI 分析的食物並加入佇列。確定要繼續嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '同步',
          onPress: async () => {
            setKnowledgeLoading(true)
            try {
              const result = await FoodKnowledgeService.syncMissingFoods(user.id)
              if (result.success) {
                Alert.alert(
                  '同步完成',
                  result.message || `已將 ${result.enqueued || 0} 個食物加入分析佇列`
                )
                await loadFoodKnowledgeStatus()
              } else {
                Alert.alert('同步失敗', result.error || '無法同步食物')
              }
            } catch (error) {
              console.warn('[FoodKnowledgeScreen] sync missing error:', error)
              Alert.alert('錯誤', '無法同步食物。')
            } finally {
              setKnowledgeLoading(false)
            }
          }
        }
      ]
    )
  }

  const handleTriggerProcessor = async () => {
    if (!knowledgeStatus || knowledgeStatus.items.length === 0) {
      Alert.alert('提示', '目前沒有待處理的項目。')
      return
    }

    const pendingCount = knowledgeStatus.items.filter(
      (item) => item.status === 'pending'
    ).length

    if (pendingCount === 0) {
      Alert.alert('提示', '沒有等待處理的項目，可能已經在處理中或已完成。')
      return
    }

    setKnowledgeLoading(true)
    try {
      const result = await FoodKnowledgeService.triggerProcessor()
      if (result.success) {
        Alert.alert(
          '處理完成',
          `已處理 ${result.processed || 0} 個項目`,
          [
            {
              text: '確定',
              onPress: () => loadFoodKnowledgeStatus()
            }
          ]
        )
      } else {
        Alert.alert('處理失敗', result.error || '無法觸發處理器')
      }
    } catch (error) {
      console.warn('[FoodKnowledgeScreen] trigger processor error:', error)
      Alert.alert('錯誤', '無法觸發處理器。')
    } finally {
      setKnowledgeLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="brain" size={24} color={colors.primary[500]} />
            <Text style={styles.title}>AI 食物知識庫</Text>
          </View>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.syncButton,
                knowledgeLoading && styles.actionButtonDisabled
              ]}
              onPress={handleSyncMissingFoods}
              disabled={knowledgeLoading}
            >
              {knowledgeLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="sync" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>同步</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.processButton,
                (!knowledgeStatus || knowledgeLoading) && styles.actionButtonDisabled
              ]}
              onPress={handleTriggerProcessor}
              disabled={!knowledgeStatus || knowledgeLoading}
            >
              {knowledgeLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="play-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>處理</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.refreshButton,
                (!knowledgeStatus || knowledgeLoading) && styles.actionButtonDisabled
              ]}
              onPress={handleManualKnowledgeRefresh}
              disabled={!knowledgeStatus || knowledgeLoading}
            >
              <Icon name="refresh" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {knowledgeStatus ? (
          <>
            <View style={styles.statusCard}>
              <Text style={styles.summaryText}>
                {knowledgeStatus.missingCount === 0 && knowledgeStatus.staleCount === 0
                  ? '✅ 所有食物分析皆為最新'
                  : `📊 缺資料 ${knowledgeStatus.missingCount} 項，過期 ${knowledgeStatus.staleCount} 項`}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>待處理</Text>
                  <Text style={[styles.statValue, styles.statPending]}>
                    {knowledgeStatus.pendingCount}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>處理中</Text>
                  <Text style={[styles.statValue, styles.statInProgress]}>
                    {knowledgeStatus.inProgressCount}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>失敗</Text>
                  <Text style={[styles.statValue, styles.statFailed]}>
                    {knowledgeStatus.failedCount}
                  </Text>
                </View>
              </View>
            </View>

            {knowledgeStatus.items.slice(0, 10).map((item) => (
              <View key={item.queueId} style={styles.queueItem}>
                <View style={styles.queueItemLeft}>
                  <Text style={styles.queueItemTitle}>{item.foodName}</Text>
                  <Text style={styles.queueItemSubtitle}>
                    {item.reason === 'missing' ? '尚未建立分析' : '等待刷新'} •
                    優先順序: {item.priority}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === 'pending' && styles.statusPending,
                    item.status === 'in_progress' && styles.statusInProgress,
                    item.status === 'failed' && styles.statusFailed,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {item.status === 'pending' && '等待中'}
                    {item.status === 'in_progress' && '處理中'}
                    {item.status === 'failed' && '失敗'}
                  </Text>
                </View>
              </View>
            ))}
            {knowledgeStatus.items.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="check-circle" size={48} color={colors.success[500]} />
                <Text style={styles.emptyStateText}>目前沒有排隊中的食物</Text>
              </View>
            )}
            {knowledgeStatus.items.length > 10 && (
              <Text style={styles.moreItemsText}>
                還有 {knowledgeStatus.items.length - 10} 個項目未顯示
              </Text>
            )}
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>載入中...</Text>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>ℹ️ 說明</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>同步</Text>: 找出所有缺少 AI 分析的食物並加入佇列
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>處理</Text>: 立即執行 AI 分析處理佇列中的食物
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoBold}>刷新</Text>: 重新載入佇列狀態
        </Text>
        <Text style={[styles.infoText, { marginTop: spacing.sm }]}>
          新增的食物會自動加入分析佇列，通常會在數分鐘內完成處理。
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  section: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  syncButton: {
    backgroundColor: '#10B981',
    flex: 1,
  },
  processButton: {
    backgroundColor: colors.primary[500],
    flex: 1,
  },
  refreshButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.sm,
  },
  actionButtonDisabled: {
    backgroundColor: colors.text.disabled,
  },
  actionButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryText: {
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h3,
    fontWeight: '700',
  },
  statPending: {
    color: colors.warning[500],
  },
  statInProgress: {
    color: colors.primary[500],
  },
  statFailed: {
    color: colors.error[500],
  },
  queueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  queueItemLeft: {
    flex: 1,
  },
  queueItemTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  queueItemSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: colors.warning[100],
  },
  statusInProgress: {
    backgroundColor: colors.primary[100],
  },
  statusFailed: {
    backgroundColor: colors.error[100],
  },
  statusBadgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  moreItemsText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  infoSection: {
    backgroundColor: colors.background.secondary,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 12,
  },
  infoTitle: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  infoBold: {
    fontWeight: '600',
    color: colors.text.primary,
  },
})
