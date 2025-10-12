import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, TextInput, SegmentedButtons, Chip, IconButton } from 'react-native-paper'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { FoodDiaryService } from '../services/FoodDiaryService'
import { colors, typography, spacing } from '@/theme'
import { useFoodDiary } from '../hooks/useFoodDiary'
import { MEAL_TYPES, type MealType, type FoodSearchResult, type FoodEntry } from '../types'
import { FoodSearchInput } from '../components/FoodSearchInput'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

type AddFoodEntryScreenProps = NativeStackScreenProps<any, 'AddFoodEntry'>

// Get meal type based on current time
function getMealTypeByTime(): MealType {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 11) return 'breakfast'  // 5-11: 早餐
  if (hour >= 11 && hour < 15) return 'lunch'     // 11-15: 午餐
  if (hour >= 15 && hour < 17) return 'snack'     // 15-17: 點心
  if (hour >= 17 && hour < 20) return 'dinner'    // 17-20: 晚餐

  return 'snack' // 其他時間: 點心
}

export function AddFoodEntryScreen({ navigation }: AddFoodEntryScreenProps) {
  const { user } = useAuthStore()
  const { createEntry, isCreating } = useFoodDiary()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [recentEntries, setRecentEntries] = useState<FoodEntry[]>([])

  // Fetch selected date's entries
  const { data: todayEntries = [] } = useQuery({
    queryKey: ['foodEntries', user?.id, selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await FoodDiaryService.getFoodEntriesByDate(user.id, selectedDate)
      return result.data || []
    },
    enabled: !!user?.id,
  })

  // Calculate today's statistics
  const todayStats = useMemo(() => {
    const stats = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
      total: todayEntries.length,
    }

    todayEntries.forEach((entry: FoodEntry) => {
      if (entry.meal_type in stats) {
        stats[entry.meal_type as keyof typeof stats]++
      }
    })

    return stats
  }, [todayEntries])

  const [foodName, setFoodName] = useState('')
  const [mealType, setMealType] = useState<MealType>(getMealTypeByTime())

  const handleSelectFood = (food: FoodSearchResult) => {
    setFoodName(food.name)
  }

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (date) {
      setSelectedDate(date)
    }
  }

  const handleSubmit = async () => {
    if (!foodName.trim()) {
      Alert.alert('錯誤', '請輸入食物名稱')
      return
    }

    try {
      const newEntry = await createEntry({
        food_name: foodName.trim(),
        meal_type: mealType,
        consumed_at: selectedDate.toISOString(),
      })

      // Add to recent entries list
      if (newEntry) {
        setRecentEntries(prev => [newEntry, ...prev].slice(0, 5))
      }

      // Clear input for next entry
      setFoodName('')
      setMealType(getMealTypeByTime())

      // Show success feedback
      Alert.alert('成功', `已新增「${foodName.trim()}」`)
    } catch (error) {
      Alert.alert('錯誤', error instanceof Error ? error.message : '新增失敗')
    }
  }

  const mealTypeButtons = MEAL_TYPES.map(meal => ({
    value: meal.value,
    label: `${meal.icon} ${meal.label}`,
  }))

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Date Picker */}
          <View style={styles.datePickerContainer}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <IconButton icon="calendar" size={20} />
              <Text style={styles.dateText}>
                {format(selectedDate, 'yyyy年MM月dd日 (E)', { locale: zhTW })}
              </Text>
              <IconButton icon="chevron-down" size={20} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Today's Statistics */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>本日已記錄</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>🌅</Text>
                <Text style={styles.statCount}>{todayStats.breakfast}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>☀️</Text>
                <Text style={styles.statCount}>{todayStats.lunch}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>🌙</Text>
                <Text style={styles.statCount}>{todayStats.dinner}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statIcon}>🍪</Text>
                <Text style={styles.statCount}>{todayStats.snack}</Text>
              </View>
            </View>
          </View>

          {/* Recent Entries */}
          {recentEntries.length > 0 && (
            <View style={styles.recentEntriesContainer}>
              <Text style={styles.recentEntriesTitle}>剛新增的記錄</Text>
              {recentEntries.map((entry) => (
                <View key={entry.id} style={styles.recentEntryItem}>
                  <Text style={styles.recentEntryIcon}>
                    {MEAL_TYPES.find(m => m.value === entry.meal_type)?.icon}
                  </Text>
                  <Text style={styles.recentEntryText}>{entry.food_name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Food Name with Search */}
          <View style={styles.section}>
            <FoodSearchInput
              value={foodName}
              onChangeText={setFoodName}
              onSelectFood={handleSelectFood}
              placeholder="搜尋或輸入食物名稱..."
            />
          </View>

          {/* Meal Type */}
          <View style={styles.section}>
            <SegmentedButtons
              value={mealType}
              onValueChange={value => setMealType(value as MealType)}
              buttons={mealTypeButtons}
              style={styles.segmentedButtons}
            />
          </View>
        </View>
      </ScrollView>

      {/* Floating Save Button */}
      <View style={styles.floatingButtonContainer}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isCreating}
          disabled={isCreating || !foodName.trim()}
          style={styles.floatingButton}
          labelStyle={styles.floatingButtonLabel}
          icon="check"
        >
          儲存記錄
        </Button>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Space for floating button
  },
  content: {
    padding: spacing.lg,
  },
  datePickerContainer: {
    marginBottom: spacing.lg,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  dateText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  recentEntriesContainer: {
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  recentEntriesTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[700],
    marginBottom: spacing.sm,
  },
  recentEntryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  recentEntryIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  recentEntryText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  statsContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statCount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.background,
  },
  segmentedButtons: {
    backgroundColor: colors.surface,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  floatingButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 12,
    paddingVertical: spacing.xs,
  },
  floatingButtonLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
  },
})
