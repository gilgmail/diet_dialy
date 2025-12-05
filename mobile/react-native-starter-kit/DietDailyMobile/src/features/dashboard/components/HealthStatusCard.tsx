import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { colors, spacing, typography } from '@/theme'

interface HealthStatusCardProps {
  hasNoSymptoms: boolean
  bowelMovementCount: number
  stoolType?: number // 1-5, 3 是正常
}

/**
 * 健康狀態卡片
 * 當沒有症狀且大便次數為 0-2 次時，顯示正面鼓勵訊息
 */
export function HealthStatusCard({ 
  hasNoSymptoms, 
  bowelMovementCount,
  stoolType 
}: HealthStatusCardProps) {
  // 判斷是否為健康狀態：沒症狀 + 大便 0-2 次 + 大便類型正常（3）
  const isHealthy = hasNoSymptoms && bowelMovementCount >= 0 && bowelMovementCount <= 2 && (stoolType === 3 || stoolType === undefined)

  if (!isHealthy) {
    return null // 只在健康狀態時顯示
  }

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="heart-pulse" size={32} color={colors.success} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>健康狀態良好 ✨</Text>
          <Text style={styles.message}>
            沒有症狀，大便次數正常（{bowelMovementCount === 0 ? '0 次' : bowelMovementCount === 1 ? '1 次' : '2 次'}），繼續維持這個好狀態！
          </Text>
          <View style={styles.tipsContainer}>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color={colors.success} />
              <Text style={styles.tipText}>保持規律作息</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color={colors.success} />
              <Text style={styles.tipText}>繼續記錄追蹤</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: `${colors.success}10`,
    borderRadius: 16,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 2,
    borderColor: `${colors.success}30`,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${colors.success}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.success,
    fontWeight: '600',
  },
  message: {
    ...typography.body,
    color: colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  tipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tipText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 12,
  },
})

