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
      food: colors.primary,
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
        navigation.navigate('SymptomDiary' as any)
        break
      case 'food':
        navigation.navigate('FoodDiary' as any)
        break
      case 'medications':
        navigation.navigate('MedicationLog' as any)
        break
      case 'sleep':
        navigation.navigate('SleepLog' as any)
        break
      case 'exercise':
        navigation.navigate('ActivityLog' as any)
        break
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name="alert-circle" size={20} color={colors.warning} />
        <Text style={styles.title}>缺漏資料提醒</Text>
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
                  <Icon name={categoryIcon} size={18} color={categoryColor} />
                  <Text style={styles.alertCategory}>{categoryLabel}</Text>
                  <Text style={styles.alertDays}>缺漏 {alert.missing_days} 天</Text>
                </View>
                <Text style={styles.alertRecommendation}>{alert.recommendation}</Text>
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
    borderRadius: 12,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  alertsList: {
    gap: spacing.sm,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  alertContent: {
    flex: 1,
    gap: spacing.xs,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  alertCategory: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  alertDays: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  alertRecommendation: {
    ...typography.body,
    color: colors.text.secondary,
    fontSize: 13,
  },
  alertDate: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 11,
  },
})

