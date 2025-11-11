import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useQuery } from '@tanstack/react-query'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useAuthStore } from '@/shared/stores/authStore'
import { FoodDiaryService } from '@/features/food-diary/services/FoodDiaryService'
import { SymptomDiaryService } from '@/features/symptom-diary/services/SymptomDiaryService'
import type { FoodEntry } from '@/features/food-diary/types'
import type { SymptomEntry } from '@/features/symptom-diary/types'
import { colors, typography, spacing } from '@/theme'

interface MonthCalendarViewProps {
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}

interface DayData {
  date: Date
  dateKey: string
  isCurrentMonth: boolean
  isToday: boolean
  foodCount: number
  symptomCount: number
  mealsRecorded: number // 0-3 (breakfast, lunch, dinner)
  hasSymptoms: boolean
  symptomEntries: SymptomEntry[]
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

export function MonthCalendarView({ selectedDate, onSelectDate }: MonthCalendarViewProps) {
  const { user } = useAuthStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth])
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth])

  // Get calendar grid (including days from previous/next month)
  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart, { weekStartsOn: 0 })
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 })
    const days: Date[] = []
    let day = start

    while (day <= end) {
      days.push(day)
      day = addDays(day, 1)
    }

    return days
  }, [monthStart, monthEnd])

  // Fetch food entries for current month
  const { data: foodEntries = [] } = useQuery({
    queryKey: ['foodEntries', user?.id, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await FoodDiaryService.getFoodEntriesByDateRange(
        user.id,
        startOfWeek(monthStart, { weekStartsOn: 0 }),
        endOfWeek(monthEnd, { weekStartsOn: 0 })
      )
      return result.data || []
    },
    enabled: !!user?.id,
  })

  // Fetch symptom entries for current month
  const { data: symptomEntries = [] } = useQuery({
    queryKey: ['symptomEntries', user?.id, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await SymptomDiaryService.getSymptomEntriesByDateRange(
        user.id,
        startOfWeek(monthStart, { weekStartsOn: 0 }),
        endOfWeek(monthEnd, { weekStartsOn: 0 })
      )
      return result.data || []
    },
    enabled: !!user?.id,
  })

  // Process data for each day
  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>()
    const today = new Date()

    calendarDays.forEach((date) => {
      const key = format(date, 'yyyy-MM-dd')
      map.set(key, {
        date,
        dateKey: key,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isToday: isSameDay(date, today),
        foodCount: 0,
        symptomCount: 0,
        mealsRecorded: 0,
        hasSymptoms: false,
        symptomEntries: [],
      })
    })

    // Count food entries and calculate meals recorded
    foodEntries.forEach((entry: FoodEntry) => {
      const key = format(new Date(entry.consumed_at), 'yyyy-MM-dd')
      const dayData = map.get(key)
      if (dayData) {
        dayData.foodCount++
      }
    })

    // Calculate meals recorded (breakfast, lunch, dinner)
    calendarDays.forEach((date) => {
      const key = format(date, 'yyyy-MM-dd')
      const dayData = map.get(key)
      if (!dayData) return

      const dayFoodEntries = foodEntries.filter((entry: FoodEntry) => {
        return format(new Date(entry.consumed_at), 'yyyy-MM-dd') === key
      })

      const meals = {
        breakfast: dayFoodEntries.some((e: FoodEntry) => e.meal_type === 'breakfast'),
        lunch: dayFoodEntries.some((e: FoodEntry) => e.meal_type === 'lunch'),
        dinner: dayFoodEntries.some((e: FoodEntry) => e.meal_type === 'dinner'),
      }

      dayData.mealsRecorded = [meals.breakfast, meals.lunch, meals.dinner].filter(Boolean).length
    })

    // Count symptom entries and store them
    symptomEntries.forEach((entry: SymptomEntry) => {
      const key = format(new Date(entry.recorded_at), 'yyyy-MM-dd')
      const dayData = map.get(key)
      if (dayData) {
        dayData.symptomCount++
        dayData.hasSymptoms = true
        dayData.symptomEntries.push(entry)
      }
    })

    return map
  }, [calendarDays, currentMonth, foodEntries, symptomEntries])

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleToday = () => {
    setCurrentMonth(new Date())
  }

  const renderDay = (date: Date) => {
    const dayData = dayDataMap.get(format(date, 'yyyy-MM-dd'))
    if (!dayData) return null

    const isSelected = selectedDate && isSameDay(selectedDate, date)

    // Determine background color
    let bgColor = colors.background

    // If has symptoms - red
    if (dayData.hasSymptoms && dayData.symptomCount > 0) {
      bgColor = colors.error + '15' // Light red
    }
    // If has records but no symptoms - green (healthy)
    else if (dayData.foodCount > 0 || dayData.hasSymptoms) {
      bgColor = colors.success + '15' // Light green
    }

    return (
      <TouchableOpacity
        key={dayData.dateKey}
        style={[
          styles.dayCell,
          { backgroundColor: bgColor },
          !dayData.isCurrentMonth && styles.dayCellOtherMonth,
          isSelected && styles.dayCellSelected,
        ]}
        onPress={() => onSelectDate(date)}
        activeOpacity={0.7}
        disabled={!dayData.isCurrentMonth}
      >
        <View style={styles.dayCellContent}>
          {/* Date number at top */}
          <Text
            style={[
              styles.dayNumber,
              !dayData.isCurrentMonth && styles.dayNumberOtherMonth,
              dayData.isToday && styles.dayNumberToday,
            ]}
          >
            {format(date, 'd')}
          </Text>

          {/* Content area */}
          <View style={styles.contentArea}>
            {/* Meal completion indicator */}
            {dayData.foodCount > 0 && (
              <Text style={styles.mealIndicator}>
                餐 {dayData.mealsRecorded}
              </Text>
            )}

            {/* Symptom entries */}
            {dayData.symptomEntries.slice(0, 2).map((entry, index) => (
              <Text key={index} style={styles.symptomText} numberOfLines={1}>
                {entry.symptom_name}
              </Text>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  // Split days into weeks
  const weeks = useMemo(() => {
    const result: Date[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7))
    }
    return result
  }, [calendarDays])

  return (
    <View style={styles.container}>
      {/* Month Header with Navigation */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={handlePrevMonth}
          activeOpacity={0.7}
        >
          <Icon name="chevron-left" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.monthTitle}
          onPress={handleToday}
          activeOpacity={0.7}
        >
          <Text style={styles.monthTitleText}>
            {format(currentMonth, 'yyyy年MM月', { locale: zhTW })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={handleNextMonth}
          activeOpacity={0.7}
        >
          <Icon name="chevron-right" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Weekday Labels */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label, index) => (
          <View key={index} style={styles.weekdayCell}>
            <Text style={styles.weekdayLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day) => renderDay(day))}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>圖例說明</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.success + '15' }]} />
            <Text style={styles.legendText}>有飲食</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.error + '15' }]} />
            <Text style={styles.legendText}>有症狀</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FFF8DC' }]} />
            <Text style={styles.legendText}>兩者都有</Text>
          </View>
        </View>
        <Text style={styles.legendHint}>
          數字表示記錄的餐數（早/午/晚），🔴 表示有症狀，🟢 表示健康
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    flex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  navButton: {
    padding: spacing.md,
  },
  monthTitle: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitleText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  weekdayLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
  },
  calendarGrid: {
    paddingHorizontal: spacing.xs,
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: colors.border,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    minHeight: 80,
    backgroundColor: colors.background,
  },
  dayCellOtherMonth: {
    opacity: 0.3,
    backgroundColor: colors.surface,
  },
  dayCellSelected: {
    borderColor: colors.primary[500],
    borderWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  dayCellContent: {
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
    height: '100%',
  },
  dayNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  dayNumberOtherMonth: {
    color: colors.text.tertiary,
  },
  dayNumberToday: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
    backgroundColor: colors.primary[500],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  contentArea: {
    flex: 1,
    width: '100%',
    gap: 2,
  },
  mealIndicator: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  symptomText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.primary,
  },
  legend: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  legendHint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
})
