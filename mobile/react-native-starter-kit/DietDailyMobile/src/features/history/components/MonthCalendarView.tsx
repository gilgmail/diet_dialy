import React, { useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useQuery } from '@tanstack/react-query'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useAuthStore } from '@/shared/stores/authStore'
import { FoodDiaryService } from '@/features/food-diary/services/FoodDiaryService'
import { SymptomDiaryService } from '@/features/symptom-diary/services/SymptomDiaryService'
import type { FoodEntry } from '@/features/food-diary/types'
import type { SymptomEntry } from '@/features/symptom-diary/types'
import type { MainStackParamList } from '@/app/navigation/types'
import { colors, typography, spacing } from '@/theme'

interface MonthCalendarViewProps {
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  currentMonth: Date
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
  maxSeverity: 'mild' | 'moderate' | 'severe' | null
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

export function MonthCalendarView({ selectedDate, onSelectDate, currentMonth }: MonthCalendarViewProps) {
  const { user } = useAuthStore()
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()

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
      const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
      const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
      console.log('[MonthCalendarView] Fetching symptoms range:', {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      })
      const result = await SymptomDiaryService.getSymptomEntriesByDateRange(
        user.id,
        startDate,
        endDate
      )
      console.log('[MonthCalendarView] Symptom entries fetched:', {
        count: result.data?.length || 0,
        entries: result.data?.map(e => ({ date: e.recorded_date, name: e.symptom_name }))
      })
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
        maxSeverity: null,
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

    // Count symptom entries and calculate max severity
    console.log('[MonthCalendarView] Processing symptom entries:', symptomEntries.length)
    symptomEntries.forEach((entry: SymptomEntry) => {
      // Use recorded_date field (not recorded_at) to match database query
      const key = entry.recorded_date
      const dayData = map.get(key)
      console.log('[MonthCalendarView] Symptom entry:', {
        date: key,
        name: entry.symptom_name,
        hasDayData: !!dayData
      })
      if (dayData) {
        dayData.symptomCount++
        dayData.hasSymptoms = true
        dayData.symptomEntries.push(entry)

        // Update max severity
        const severityRank = { mild: 1, moderate: 2, severe: 3 }
        const currentRank = dayData.maxSeverity ? severityRank[dayData.maxSeverity] : 0
        const newRank = severityRank[entry.severity]
        if (newRank > currentRank) {
          dayData.maxSeverity = entry.severity
        }
      }
    })

    // Debug: Log final symptom counts
    console.log('[MonthCalendarView] Final symptom counts by date:')
    Array.from(map.entries()).forEach(([date, data]) => {
      if (data.symptomCount > 0) {
        console.log(`  ${date}: ${data.symptomCount} symptoms`)
      }
    })

    return map
  }, [calendarDays, currentMonth, foodEntries, symptomEntries])

  const renderDay = (date: Date) => {
    const dayData = dayDataMap.get(format(date, 'yyyy-MM-dd'))
    if (!dayData) return null

    const isSelected = selectedDate && isSameDay(selectedDate, date)

    // Determine background color based on symptom severity
    let bgColor = colors.background

    if (dayData.hasSymptoms && dayData.symptomCount > 0) {
      // Color based on max severity
      if (dayData.maxSeverity === 'mild') {
        bgColor = '#FEF3C7' // Light yellow for mild
      } else if (dayData.maxSeverity === 'moderate' || dayData.maxSeverity === 'severe') {
        bgColor = colors.error + '15' // Light red for moderate and above
      }
    }
    // If has records but no symptoms - green (healthy)
    else if (dayData.foodCount > 0) {
      bgColor = colors.success + '15' // Light green
    }

    const handleDayPress = () => {
      if (!dayData.isCurrentMonth) return

      // Select the date
      onSelectDate(date)

      // Always navigate to detail page (even if no records)
      navigation.navigate('FoodDayDetail', {
        date: format(date, 'yyyy-MM-dd'),
      })
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
        onPress={handleDayPress}
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
                {dayData.mealsRecorded}餐
              </Text>
            )}

            {/* Symptom summary */}
            {dayData.symptomCount > 0 && (
              <Text style={styles.symptomText} numberOfLines={1}>
                {dayData.symptomCount}症
              </Text>
            )}
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
            <Text style={styles.legendText}>健康（有記錄無症狀）</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.error + '15' }]} />
            <Text style={styles.legendText}>有症狀</Text>
          </View>
        </View>
        <Text style={styles.legendHint}>
          數字表示記錄的餐數，點擊日期可查看詳細記錄
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
