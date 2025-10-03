import React, { useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, IconButton } from 'react-native-paper'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { colors, typography, spacing } from '@/theme'
import { useFoodDiary } from '../hooks/useFoodDiary'
import { MEAL_TYPES, type FoodEntry } from '../types'

type FoodDayDetailScreenProps = NativeStackScreenProps<any, 'FoodDayDetail'>

export function FoodDayDetailScreen({ route, navigation }: FoodDayDetailScreenProps) {
  const { date } = route.params as { date: string }
  const { entries, deleteEntry, isDeleting } = useFoodDiary()

  // Filter entries for this specific date
  const dayEntries = useMemo(() => {
    return entries.filter((entry) => {
      const entryDate = format(parseISO(entry.consumed_at), 'yyyy-MM-dd')
      return entryDate === date
    })
  }, [entries, date])

  const handleDeleteEntry = (entry: FoodEntry) => {
    Alert.alert('刪除記錄', `確定要刪除「${entry.food_name}」嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(entry.id)
            if (dayEntries.length === 1) {
              navigation.goBack()
            }
          } catch (error) {
            Alert.alert('錯誤', '刪除失敗')
          }
        },
      },
    ])
  }

  const getMealTypeInfo = (mealType: string) => {
    return MEAL_TYPES.find(m => m.value === mealType) || MEAL_TYPES[0]
  }

  const renderEntry = ({ item }: { item: FoodEntry }) => {
    const mealInfo = getMealTypeInfo(item.meal_type)

    return (
      <Card style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.entryHeaderLeft}>
            <Text style={styles.mealIcon}>{mealInfo.icon}</Text>
            <View>
              <Text style={styles.foodName}>{item.food_name}</Text>
              <Text style={styles.mealType}>{mealInfo.label}</Text>
            </View>
          </View>
          <IconButton
            icon="delete-outline"
            size={20}
            iconColor={colors.error}
            onPress={() => handleDeleteEntry(item)}
            disabled={isDeleting}
          />
        </View>

        <View style={styles.entryDetails}>
          {item.portion_size && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>份量：</Text>
              <Text style={styles.detailValue}>{item.portion_size}</Text>
            </View>
          )}
          {item.calories && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>熱量：</Text>
              <Text style={styles.detailValue}>{item.calories} kcal</Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>時間：</Text>
            <Text style={styles.detailValue}>
              {format(new Date(item.consumed_at), 'HH:mm')}
            </Text>
          </View>
        </View>

        {item.notes && (
          <View style={styles.entryNotes}>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </Card>
    )
  }

  // Calculate day summary
  const daySummary = useMemo(() => {
    const totalCalories = dayEntries.reduce((sum, e) => sum + (e.calories || 0), 0)
    const mealBreakdown = {
      breakfast: dayEntries.filter(e => e.meal_type === 'breakfast').length,
      lunch: dayEntries.filter(e => e.meal_type === 'lunch').length,
      dinner: dayEntries.filter(e => e.meal_type === 'dinner').length,
      snack: dayEntries.filter(e => e.meal_type === 'snack').length,
    }
    return { totalCalories, mealBreakdown }
  }, [dayEntries])

  const renderHeader = () => {
    const dateObj = parseISO(`${date}T00:00:00`)
    const dateDisplay = format(dateObj, 'yyyy年MM月dd日 (E)', { locale: zhTW })

    return (
      <View style={styles.header}>
        <Text style={styles.title}>{dateDisplay}</Text>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>總記錄</Text>
            <Text style={styles.summaryValue}>{dayEntries.length} 筆</Text>
          </View>
          {daySummary.totalCalories > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>總熱量</Text>
              <Text style={styles.summaryValue}>{daySummary.totalCalories} kcal</Text>
            </View>
          )}
        </View>
        <View style={styles.mealSummaryContainer}>
          {daySummary.mealBreakdown.breakfast > 0 && (
            <View style={styles.mealSummaryItem}>
              <Text style={styles.mealSummaryIcon}>🌅</Text>
              <Text style={styles.mealSummaryText}>
                早餐 {daySummary.mealBreakdown.breakfast} 筆
              </Text>
            </View>
          )}
          {daySummary.mealBreakdown.lunch > 0 && (
            <View style={styles.mealSummaryItem}>
              <Text style={styles.mealSummaryIcon}>☀️</Text>
              <Text style={styles.mealSummaryText}>
                午餐 {daySummary.mealBreakdown.lunch} 筆
              </Text>
            </View>
          )}
          {daySummary.mealBreakdown.dinner > 0 && (
            <View style={styles.mealSummaryItem}>
              <Text style={styles.mealSummaryIcon}>🌙</Text>
              <Text style={styles.mealSummaryText}>
                晚餐 {daySummary.mealBreakdown.dinner} 筆
              </Text>
            </View>
          )}
          {daySummary.mealBreakdown.snack > 0 && (
            <View style={styles.mealSummaryItem}>
              <Text style={styles.mealSummaryIcon}>🍪</Text>
              <Text style={styles.mealSummaryText}>
                點心 {daySummary.mealBreakdown.snack} 筆
              </Text>
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={dayEntries}
        renderItem={renderEntry}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  mealSummaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mealSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  mealSummaryIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  mealSummaryText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  entryCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  entryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  foodName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  mealType: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  entryDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  entryNotes: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
})
