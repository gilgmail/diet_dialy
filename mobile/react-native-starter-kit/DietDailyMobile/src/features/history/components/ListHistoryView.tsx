import React, { useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useQuery } from '@tanstack/react-query'
import { format, subDays, startOfDay } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useAuthStore } from '@/shared/stores/authStore'
import { FoodDiaryService } from '@/features/food-diary/services/FoodDiaryService'
import { SymptomDiaryService } from '@/features/symptom-diary/services/SymptomDiaryService'
import { MEAL_TYPES } from '@/features/food-diary/types'
import type { FoodEntry } from '@/features/food-diary/types'
import type { SymptomEntry } from '@/features/symptom-diary/types'
import { colors, typography, spacing } from '@/theme'

interface ListHistoryViewProps {
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}

interface DayData {
  date: Date
  dateKey: string
  foodCount: number
  symptomCount: number
  foodEntries: FoodEntry[]
  symptomEntries: SymptomEntry[]
}

export function ListHistoryView({ selectedDate, onSelectDate }: ListHistoryViewProps) {
  const { user } = useAuthStore()

  // Get last 30 days
  const dates = useMemo(() => {
    const result: Date[] = []
    for (let i = 0; i < 30; i++) {
      result.push(startOfDay(subDays(new Date(), i)))
    }
    return result
  }, [])

  // Fetch food entries for last 30 days
  const { data: foodEntries = [] } = useQuery({
    queryKey: ['foodEntries', user?.id, 'last30days'],
    queryFn: async () => {
      if (!user?.id) return []
      const startDate = subDays(new Date(), 30)
      const endDate = new Date()
      const result = await FoodDiaryService.getFoodEntriesByDateRange(
        user.id,
        startDate,
        endDate
      )
      return result.data || []
    },
    enabled: !!user?.id,
  })

  // Fetch symptom entries for last 30 days
  const { data: symptomEntries = [] } = useQuery({
    queryKey: ['symptomEntries', user?.id, 'last30days'],
    queryFn: async () => {
      if (!user?.id) return []
      const startDate = subDays(new Date(), 30)
      const endDate = new Date()
      const result = await SymptomDiaryService.getSymptomEntriesByDateRange(
        user.id,
        startDate,
        endDate
      )
      return result.data || []
    },
    enabled: !!user?.id,
  })

  // Group entries by date
  const dayDataList = useMemo<DayData[]>(() => {
    const foodByDate = new Map<string, FoodEntry[]>()
    const symptomByDate = new Map<string, SymptomEntry[]>()

    foodEntries.forEach((entry: FoodEntry) => {
      const key = format(new Date(entry.consumed_at), 'yyyy-MM-dd')
      if (!foodByDate.has(key)) foodByDate.set(key, [])
      foodByDate.get(key)!.push(entry)
    })

    symptomEntries.forEach((entry: SymptomEntry) => {
      const key = format(new Date(entry.recorded_at), 'yyyy-MM-dd')
      if (!symptomByDate.has(key)) symptomByDate.set(key, [])
      symptomByDate.get(key)!.push(entry)
    })

    return dates.map((date) => {
      const key = format(date, 'yyyy-MM-dd')
      const foodList = foodByDate.get(key) || []
      const symptomList = symptomByDate.get(key) || []

      return {
        date,
        dateKey: key,
        foodCount: foodList.length,
        symptomCount: symptomList.length,
        foodEntries: foodList,
        symptomEntries: symptomList,
      }
    })
  }, [dates, foodEntries, symptomEntries])

  const renderDayItem = ({ item }: { item: DayData }) => {
    const isToday = format(item.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === item.dateKey

    // Calculate meal completion
    const mealStats = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 }
    item.foodEntries.forEach((entry) => {
      if (entry.meal_type in mealStats) {
        mealStats[entry.meal_type as keyof typeof mealStats]++
      }
    })
    const mealsRecorded = [
      mealStats.breakfast > 0,
      mealStats.lunch > 0,
      mealStats.dinner > 0,
    ].filter(Boolean).length

    return (
      <TouchableOpacity
        style={[
          styles.dayItem,
          isSelected && styles.dayItemSelected,
        ]}
        onPress={() => onSelectDate(item.date)}
        activeOpacity={0.7}
      >
        <View style={styles.dayHeader}>
          <View style={styles.dayDateSection}>
            <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
              {format(item.date, 'dd')}
            </Text>
            <Text style={styles.dayLabel}>
              {format(item.date, 'EEE', { locale: zhTW })}
            </Text>
            {isToday && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>今天</Text>
              </View>
            )}
          </View>

          <View style={styles.dayStats}>
            {item.foodCount > 0 && (
              <View style={styles.statBadge}>
                <Icon name="food-apple" size={14} color={colors.success} />
                <Text style={styles.statBadgeText}>{mealsRecorded}/3</Text>
              </View>
            )}
            {item.symptomCount > 0 && (
              <View style={[styles.statBadge, styles.symptomStatBadge]}>
                <Icon name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.statBadgeText}>{item.symptomCount}</Text>
              </View>
            )}
            {item.foodCount === 0 && item.symptomCount === 0 && (
              <Text style={styles.noDataText}>無記錄</Text>
            )}
          </View>

          <Icon
            name={isSelected ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.text.secondary}
          />
        </View>

        {isSelected && (item.foodCount > 0 || item.symptomCount > 0) && (
          <View style={styles.dayDetails}>
            {item.foodCount > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>飲食</Text>
                {Object.entries(mealStats).map(([meal, count]) => {
                  if (count === 0) return null
                  const mealInfo = MEAL_TYPES.find((m) => m.value === meal)
                  return (
                    <View key={meal} style={styles.detailItem}>
                      <Text style={styles.detailIcon}>{mealInfo?.icon}</Text>
                      <Text style={styles.detailText}>
                        {mealInfo?.label} {count} 筆
                      </Text>
                    </View>
                  )
                })}
              </View>
            )}

            {item.symptomCount > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailTitle}>症狀</Text>
                {item.symptomEntries.slice(0, 3).map((entry) => (
                  <View key={entry.id} style={styles.detailItem}>
                    <Text style={styles.detailIcon}>⚠️</Text>
                    <Text style={styles.detailText}>{entry.symptom_name}</Text>
                  </View>
                ))}
                {item.symptomCount > 3 && (
                  <Text style={styles.moreText}>還有 {item.symptomCount - 3} 筆...</Text>
                )}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <FlatList
      data={dayDataList}
      renderItem={renderDayItem}
      keyExtractor={(item) => item.dateKey}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  )
}

const styles = StyleSheet.create({
  listContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  dayItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dayItemSelected: {
    borderColor: colors.primary[500],
    borderWidth: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  dayDateSection: {
    alignItems: 'center',
    minWidth: 60,
  },
  dayDate: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  dayDateToday: {
    color: colors.primary[500],
  },
  dayLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  todayBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    backgroundColor: colors.primary[500],
    borderRadius: 999,
  },
  todayBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
  dayStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.success + '15',
    borderRadius: 999,
    gap: spacing.xs / 2,
  },
  symptomStatBadge: {
    backgroundColor: colors.error + '15',
  },
  statBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  noDataText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  dayDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  detailSection: {
    gap: spacing.xs,
  },
  detailTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailIcon: {
    fontSize: 16,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  moreText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs / 2,
  },
})
