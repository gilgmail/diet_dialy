import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useQuery } from '@tanstack/react-query'
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useAuthStore } from '@/shared/stores/authStore'
import { FoodDiaryService } from '@/features/food-diary/services/FoodDiaryService'
import { SymptomDiaryService } from '@/features/symptom-diary/services/SymptomDiaryService'
import { MEAL_TYPES } from '@/features/food-diary/types'
import type { FoodEntry } from '@/features/food-diary/types'
import type { SymptomEntry } from '@/features/symptom-diary/types'
import { SEVERITY_LEVELS } from '@/features/symptom-diary/types'
import { colors, typography, spacing } from '@/theme'

interface WeekCalendarViewProps {
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}

interface DayData {
  date: Date
  dateKey: string
  isToday: boolean
  mealCounts: {
    breakfast: number
    lunch: number
    dinner: number
    snack: number
  }
  symptomCount: number
  foodEntries: FoodEntry[]
  symptomEntries: SymptomEntry[]
}

export function WeekCalendarView({ selectedDate, onSelectDate }: WeekCalendarViewProps) {
  const { user } = useAuthStore()
  const [currentWeek, setCurrentWeek] = useState(new Date())

  const weekStart = useMemo(
    () => startOfWeek(currentWeek, { weekStartsOn: 0 }),
    [currentWeek]
  )
  const weekEnd = useMemo(
    () => endOfWeek(currentWeek, { weekStartsOn: 0 }),
    [currentWeek]
  )

  // Get all days in the week
  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i))
    }
    return days
  }, [weekStart])

  // Fetch food entries for current week
  const { data: foodEntries = [] } = useQuery({
    queryKey: ['foodEntries', user?.id, format(weekStart, 'yyyy-ww')],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await FoodDiaryService.getFoodEntriesByDateRange(
        user.id,
        weekStart,
        weekEnd
      )
      return result.data || []
    },
    enabled: !!user?.id,
  })

  // Fetch symptom entries for current week
  const { data: symptomEntries = [] } = useQuery({
    queryKey: ['symptomEntries', user?.id, format(weekStart, 'yyyy-ww')],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await SymptomDiaryService.getSymptomEntriesByDateRange(
        user.id,
        weekStart,
        weekEnd
      )
      return result.data || []
    },
    enabled: !!user?.id,
  })

  // Process data for each day
  const dayDataList = useMemo<DayData[]>(() => {
    const today = new Date()

    return weekDays.map((date) => {
      const key = format(date, 'yyyy-MM-dd')

      // Filter entries for this day
      const dayFoodEntries = foodEntries.filter((entry: FoodEntry) => {
        return format(new Date(entry.consumed_at), 'yyyy-MM-dd') === key
      })

      const daySymptomEntries = symptomEntries.filter((entry: SymptomEntry) => {
        return format(new Date(entry.recorded_at), 'yyyy-MM-dd') === key
      })

      // Count meals
      const mealCounts = {
        breakfast: dayFoodEntries.filter((e: FoodEntry) => e.meal_type === 'breakfast').length,
        lunch: dayFoodEntries.filter((e: FoodEntry) => e.meal_type === 'lunch').length,
        dinner: dayFoodEntries.filter((e: FoodEntry) => e.meal_type === 'dinner').length,
        snack: dayFoodEntries.filter((e: FoodEntry) => e.meal_type === 'snack').length,
      }

      return {
        date,
        dateKey: key,
        isToday: isSameDay(date, today),
        mealCounts,
        symptomCount: daySymptomEntries.length,
        foodEntries: dayFoodEntries,
        symptomEntries: daySymptomEntries,
      }
    })
  }, [weekDays, foodEntries, symptomEntries])

  const handlePrevWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1))
  }

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1))
  }

  const handleToday = () => {
    setCurrentWeek(new Date())
  }

  const renderDayCard = (dayData: DayData) => {
    const isSelected = selectedDate && isSameDay(selectedDate, dayData.date)
    const hasNoData =
      dayData.foodEntries.length === 0 && dayData.symptomEntries.length === 0

    return (
      <TouchableOpacity
        key={dayData.dateKey}
        style={[
          styles.dayCard,
          isSelected && styles.dayCardSelected,
        ]}
        onPress={() => onSelectDate(dayData.date)}
        activeOpacity={0.7}
      >
        {/* Day Header */}
        <View style={styles.dayHeader}>
          <View style={styles.dayHeaderLeft}>
            <Text style={[styles.dayDate, dayData.isToday && styles.dayDateToday]}>
              {format(dayData.date, 'dd')}
            </Text>
            <Text style={styles.dayLabel}>
              {format(dayData.date, 'EEE', { locale: zhTW })}
            </Text>
          </View>
          {dayData.isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>今天</Text>
            </View>
          )}
        </View>

        {/* Meal Details */}
        {dayData.foodEntries.length > 0 ? (
          <View style={styles.mealSection}>
            <View style={styles.sectionHeader}>
              <Icon name="food-apple" size={16} color={colors.success} />
              <Text style={styles.sectionTitle}>飲食</Text>
            </View>
            {MEAL_TYPES.filter((meal) => meal.value !== 'snack').map((meal) => {
              const count = dayData.mealCounts[meal.value as keyof typeof dayData.mealCounts]
              return (
                <View key={meal.value} style={styles.mealRow}>
                  <Text style={styles.mealIcon}>{meal.icon}</Text>
                  <Text style={styles.mealLabel}>{meal.label}</Text>
                  <Text
                    style={[
                      styles.mealCount,
                      count === 0 && styles.mealCountZero,
                    ]}
                  >
                    {count} 筆
                  </Text>
                </View>
              )
            })}
            {dayData.mealCounts.snack > 0 && (
              <View style={styles.mealRow}>
                <Text style={styles.mealIcon}>🍪</Text>
                <Text style={styles.mealLabel}>點心</Text>
                <Text style={styles.mealCount}>{dayData.mealCounts.snack} 筆</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptySection}>
            <Icon name="food-off" size={24} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>無飲食記錄</Text>
          </View>
        )}

        {/* Symptom Details */}
        {dayData.symptomCount > 0 ? (
          <View style={styles.symptomSection}>
            <View style={styles.sectionHeader}>
              <Icon name="medical-bag" size={16} color={colors.error} />
              <Text style={styles.sectionTitle}>症狀</Text>
            </View>
            {dayData.symptomEntries.slice(0, 3).map((entry: SymptomEntry) => {
              const severityInfo = SEVERITY_LEVELS.find((s) => s.value === entry.severity)
              return (
                <View key={entry.id} style={styles.symptomRow}>
                  <Text style={styles.symptomIcon}>{severityInfo?.icon}</Text>
                  <Text style={styles.symptomName} numberOfLines={1}>
                    {entry.symptom_name}
                  </Text>
                </View>
              )
            })}
            {dayData.symptomCount > 3 && (
              <Text style={styles.moreText}>還有 {dayData.symptomCount - 3} 筆...</Text>
            )}
          </View>
        ) : (
          !hasNoData && (
            <View style={styles.healthySection}>
              <Icon name="emoticon-happy" size={20} color={colors.success} />
              <Text style={styles.healthyText}>無症狀</Text>
            </View>
          )
        )}

        {/* Placeholder for future: Bowel Movement */}
        {/* This section is reserved for future bowel movement tracking */}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Week Header with Navigation */}
      <View style={styles.weekHeader}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handlePrevWeek}
          activeOpacity={0.7}
        >
          <Icon name="chevron-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.weekTitle}
          onPress={handleToday}
          activeOpacity={0.7}
        >
          <Text style={styles.weekTitleText}>
            {format(weekStart, 'yyyy年MM月', { locale: zhTW })}
          </Text>
          <Text style={styles.weekTitleSubtext}>
            {format(weekStart, 'dd日')} - {format(weekEnd, 'dd日')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={handleNextWeek}
          activeOpacity={0.7}
        >
          <Icon name="chevron-right" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Week Days */}
      <ScrollView
        style={styles.weekScroll}
        contentContainerStyle={styles.weekContent}
        showsVerticalScrollIndicator={false}
      >
        {dayDataList.map((dayData) => renderDayCard(dayData))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
  },
  weekTitle: {
    flex: 1,
    alignItems: 'center',
  },
  weekTitleText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  weekTitleSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
  weekScroll: {
    flex: 1,
  },
  weekContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  dayCardSelected: {
    borderColor: colors.primary[500],
    borderWidth: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  todayBadge: {
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
  mealSection: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  mealIcon: {
    fontSize: 18,
    width: 24,
  },
  mealLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  mealCount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  mealCountZero: {
    color: colors.text.tertiary,
  },
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  symptomSection: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  symptomIcon: {
    fontSize: 16,
    width: 24,
  },
  symptomName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    flex: 1,
  },
  moreText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs / 2,
  },
  healthySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  healthyText: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
  },
})
