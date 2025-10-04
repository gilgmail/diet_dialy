import React, { useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, ActivityIndicator } from 'react-native-paper'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { format, startOfDay, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { colors, typography, spacing } from '@/theme'
import { useFoodDiary } from '../hooks/useFoodDiary'
import { MEAL_TYPES, type FoodEntry } from '../types'

type FoodDiaryScreenProps = NativeStackScreenProps<any, 'FoodDiary'>

interface DayGroup {
  date: string
  dateDisplay: string
  entries: FoodEntry[]
  totalCalories: number
  mealBreakdown: {
    breakfast: number
    lunch: number
    dinner: number
    snack: number
  }
}

export function FoodDiaryScreen({ navigation }: FoodDiaryScreenProps) {
  const { entries, isLoading, refetch } = useFoodDiary()

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups = new Map<string, FoodEntry[]>()

    entries.forEach((entry) => {
      const dateKey = format(parseISO(entry.consumed_at), 'yyyy-MM-dd')
      if (!groups.has(dateKey)) {
        groups.set(dateKey, [])
      }
      groups.get(dateKey)!.push(entry)
    })

    // Convert to array and sort by date (newest first)
    const dayGroups: DayGroup[] = Array.from(groups.entries())
      .map(([date, dayEntries]) => {
        const totalCalories = dayEntries.reduce((sum, e) => sum + (e.calories || 0), 0)
        const mealBreakdown = {
          breakfast: dayEntries.filter(e => e.meal_type === 'breakfast').length,
          lunch: dayEntries.filter(e => e.meal_type === 'lunch').length,
          dinner: dayEntries.filter(e => e.meal_type === 'dinner').length,
          snack: dayEntries.filter(e => e.meal_type === 'snack').length,
        }

        // Format date display
        const dateObj = parseISO(`${date}T00:00:00`)
        const today = startOfDay(new Date())
        const entryDate = startOfDay(dateObj)
        const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))

        let dateDisplay = format(dateObj, 'MM月dd日 (E)', { locale: zhTW })
        if (diffDays === 0) dateDisplay = '今天'
        else if (diffDays === 1) dateDisplay = '昨天'
        else if (diffDays === 2) dateDisplay = '前天'

        return {
          date,
          dateDisplay,
          entries: dayEntries,
          totalCalories,
          mealBreakdown,
        }
      })
      .sort((a, b) => b.date.localeCompare(a.date))

    return dayGroups
  }, [entries])

  const handleDayPress = (dayGroup: DayGroup) => {
    // TODO: Navigate to day detail screen
    navigation.navigate('FoodDayDetail', { date: dayGroup.date })
  }

  const renderDayGroup = ({ item }: { item: DayGroup }) => {
    return (
      <TouchableOpacity
        onPress={() => handleDayPress(item)}
        activeOpacity={0.7}
      >
        <Card style={styles.dayCard}>
          <View style={styles.dayHeader}>
            <Text style={styles.dateText}>{item.dateDisplay}</Text>
            <Text style={styles.totalEntriesText}>{item.entries.length} 筆記錄</Text>
          </View>

          <View style={styles.mealBreakdownContainer}>
            {item.mealBreakdown.breakfast > 0 && (
              <View style={styles.mealItem}>
                <Text style={styles.mealIcon}>🌅</Text>
                <Text style={styles.mealCount}>{item.mealBreakdown.breakfast}</Text>
              </View>
            )}
            {item.mealBreakdown.lunch > 0 && (
              <View style={styles.mealItem}>
                <Text style={styles.mealIcon}>☀️</Text>
                <Text style={styles.mealCount}>{item.mealBreakdown.lunch}</Text>
              </View>
            )}
            {item.mealBreakdown.dinner > 0 && (
              <View style={styles.mealItem}>
                <Text style={styles.mealIcon}>🌙</Text>
                <Text style={styles.mealCount}>{item.mealBreakdown.dinner}</Text>
              </View>
            )}
            {item.mealBreakdown.snack > 0 && (
              <View style={styles.mealItem}>
                <Text style={styles.mealIcon}>🍪</Text>
                <Text style={styles.mealCount}>{item.mealBreakdown.snack}</Text>
              </View>
            )}
          </View>

          <View style={styles.foodPreviewContainer}>
            {item.entries.slice(0, 3).map((entry, index) => (
              <Text key={entry.id} style={styles.foodPreviewText}>
                {index > 0 && ' • '}
                {entry.food_name}
              </Text>
            ))}
            {item.entries.length > 3 && (
              <Text style={styles.foodPreviewText}> ...</Text>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🍽️</Text>
      <Text style={styles.emptyTitle}>還沒有飲食記錄</Text>
      <Text style={styles.emptyText}>開始記錄您的餐點吧</Text>
    </View>
  )

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>飲食日記</Text>
      <Text style={styles.subtitle}>查看歷史飲食記錄</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={groupedEntries}
        renderItem={renderDayGroup}
        keyExtractor={item => item.date}
        contentContainerStyle={[
          styles.listContent,
          groupedEntries.length === 0 && styles.listContentEmpty,
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={[colors.primary[500]]}
          />
        }
      />

      {isLoading && entries.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      )}
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
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  dayCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    elevation: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dateText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  totalEntriesText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  mealBreakdownContainer: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  mealItem: {
    alignItems: 'center',
  },
  mealIcon: {
    fontSize: 24,
    marginBottom: spacing.xs / 2,
  },
  mealCount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  caloriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  caloriesLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  caloriesValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[700],
  },
  foodPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  foodPreviewText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * 1.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
})
