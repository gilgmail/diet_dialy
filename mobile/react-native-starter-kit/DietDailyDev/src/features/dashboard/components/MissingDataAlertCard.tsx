import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import type { MissingDataAlert } from '../types'
import { colors, spacing, typography } from '@/theme'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MainStackParamList } from '@/app/navigation/types'

interface MissingDataAlertCardProps {
  alerts: MissingDataAlert[]
  navigation?: NativeStackNavigationProp<MainStackParamList>
}

export function MissingDataAlertCard({ alerts, navigation }: MissingDataAlertCardProps) {
  if (alerts.length === 0) {
    return null
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      symptoms: '症狀',
      food: '飲食',
      medications: '藥物',
      sleep: '睡眠',
      exercise: '運動',
    }
    return labels[category] || category
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      symptoms: 'heart-pulse',
      food: 'food',
      medications: 'pill',
      sleep: 'sleep',
      exercise: 'dumbbell',
    }
    return icons[category] || 'alert-circle'
  }

  const getCategoryColor = (category: string) => {
    const colors_map: Record<string, string> = {
      symptoms: colors.error,
      food: colors.primary[500],
      medications: colors.warning,
      sleep: colors.info,
      exercise: colors.success,
    }
    return colors_map[category] || colors.text.secondary
  }

  const handleCategoryPress = (category: string) => {
    if (!navigation) return

    switch (category) {
      case 'symptoms':
        navigation.navigate('AddSymptomEntry', { date: undefined })
        break
      case 'food':
        navigation.navigate('AddFoodEntry', { date: undefined })
        break
      case 'medications':
        navigation.navigate('MedicationLog', undefined)
        break
      case 'sleep':
        navigation.navigate('SleepLog', undefined)
        break
      case 'exercise':
        navigation.navigate('ActivityLog', undefined)
        break
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Icon name="lightbulb-on" size={20} color={colors.primary[500]} />
          </View>
          <View>
            <Text style={styles.title}>本週小提醒</Text>
            <Text style={styles.subtitle}>補齊這些資料，讓分析更完整</Text>
          </View>
        </View>
      </View>

      <View style={styles.alertsList}>
        {alerts.map((alert, index) => {
          const categoryColor = getCategoryColor(alert.category)
          const categoryIcon = getCategoryIcon(alert.category)
          const categoryLabel = getCategoryLabel(alert.category)

          return (
            <TouchableOpacity
              key={index}
              style={[styles.alertItem, { borderLeftColor: categoryColor }]}
              onPress={() => handleCategoryPress(alert.category)}
              activeOpacity={0.7}
            >
              <View style={styles.alertContent}>
                <View style={styles.alertHeader}>
                  <View style={[styles.categoryIconContainer, { backgroundColor: `${categoryColor}20` }]}>
                    <Icon name={categoryIcon} size={20} color={categoryColor} />
                  </View>
                  <View style={styles.alertTextContainer}>
                    <View style={styles.alertHeaderRow}>
                      <Text style={styles.alertCategory}>{categoryLabel}</Text>
                      <View style={[styles.badge, { backgroundColor: `${categoryColor}15` }]}>
                        <Text style={[styles.badgeText, { color: categoryColor }]}>
                          {alert.missing_days} 天
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.alertRecommendation}>{alert.recommendation}</Text>
                  </View>
                </View>
                {alert.last_entry_date && (
                  <Text style={styles.alertDate}>
                    最後記錄：{new Date(alert.last_entry_date).toLocaleDateString('zh-TW')}
                  </Text>
                )}
              </View>
              <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.primary[500]}20`,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary[500]}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  alertsList: {
    gap: spacing.sm,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: spacing.sm,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTextContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertCategory: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  alertRecommendation: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 13,
    lineHeight: 18,
  },
  alertDate: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 11,
  },
})
