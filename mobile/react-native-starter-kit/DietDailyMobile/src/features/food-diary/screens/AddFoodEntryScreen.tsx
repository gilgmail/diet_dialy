import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, TextInput, SegmentedButtons, IconButton } from 'react-native-paper'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useQuery } from '@tanstack/react-query'
import { useFocusEffect } from '@react-navigation/native'
import { useAuthStore } from '@/shared/stores/authStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { NotificationService } from '@/features/settings/services/notificationService'
import { FoodDiaryService } from '../services/FoodDiaryService'
import { colors, typography, spacing } from '@/theme'
import { useFoodDiary } from '../hooks/useFoodDiary'
import { appConfig } from '@/shared/config/appConfig'
import {
  MEAL_TYPES,
  type MealType,
  type FoodSearchResult,
  type FoodEntry,
  type CreateFoodEntryInput,
} from '../types'
import { FoodSearchInput } from '../components/FoodSearchInput'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { format, isSameDay } from 'date-fns'
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

export function AddFoodEntryScreen({ navigation, route }: AddFoodEntryScreenProps) {
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()
  const { entries, createEntry, updateEntry, deleteEntry, isCreating, isUpdating, isDeleting } = useFoodDiary()
  const { requireDatabaseFood } = appConfig

  // Check if editing existing entry
  const entryId = route.params?.entryId
  const isEditMode = !!entryId
  const existingEntry = isEditMode ? entries.find(e => e.id === entryId) : null

  // Support date parameter from navigation (for historical entries)
  // Use T12:00:00 to avoid timezone conversion issues
  const initialDate = route.params?.date
    ? new Date(`${route.params.date}T12:00:00`)
    : existingEntry
    ? new Date(`${existingEntry.consumed_at.split('T')[0]}T12:00:00`)
    : new Date()
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [recentEntries, setRecentEntries] = useState<FoodEntry[]>([])

  // Fetch selected date's entries
  const selectedDateKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate])

  const { data: todayEntries = [] } = useQuery({
    queryKey: ['foodEntries', user?.id, selectedDateKey],
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
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null)
  const [mealType, setMealType] = useState<MealType>(getMealTypeByTime())

  // Load existing entry data when available
  useEffect(() => {
    if (existingEntry) {
      console.log('[AddFoodEntry] Loading existing entry data:', {
        food_name: existingEntry.food_name,
        meal_type: existingEntry.meal_type,
        consumed_at: existingEntry.consumed_at
      })
      setFoodName(existingEntry.food_name)
      setMealType(existingEntry.meal_type)

      // Update selected date to match entry date
      const entryDate = new Date(`${existingEntry.consumed_at.split('T')[0]}T12:00:00`)
      console.log('[AddFoodEntry] Setting date from entry:', {
        consumed_at: existingEntry.consumed_at,
        extracted: existingEntry.consumed_at.split('T')[0],
        dateObject: entryDate.toISOString(),
        formatted: format(entryDate, 'yyyy-MM-dd')
      })
      setSelectedDate(entryDate)
    }
  }, [existingEntry?.id])

  const handleFoodInputChange = (text: string) => {
    setFoodName(text)
    setSelectedFood(null)
  }

  const handleSelectFood = (food: FoodSearchResult) => {
    setSelectedFood(food)
    setFoodName(food.name)
  }

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date && event.type !== 'dismissed') {
      setSelectedDate(date)
    }

    if (Platform.OS === 'android') {
      setShowDatePicker(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      const now = new Date()
      setSelectedDate(prev => (isSameDay(prev, now) ? prev : now))
      setMealType(getMealTypeByTime())
    }, [])
  )

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || !settings.notificationsEnabled) {
        return undefined
      }

      NotificationService.pauseRemindersForMeals().catch((error) => {
        console.warn('[AddFoodEntry] Failed to pause reminders:', error)
      })

      return () => {
        NotificationService.scheduleMealReminders(user.id, settings.mealReminders).catch(
          (error) => {
            console.warn('[AddFoodEntry] Failed to resume reminders:', error)
          }
        )
      }
    }, [
      user?.id,
      settings.notificationsEnabled,
      settings.mealReminders.breakfast,
      settings.mealReminders.lunch,
      settings.mealReminders.dinner,
    ])
  )

  const handleSubmit = async () => {
    const chosenFood = selectedFood
    const trimmedName = foodName.trim()

    if (!trimmedName) {
      Alert.alert('錯誤', '請輸入食物名稱')
      return
    }

    if (requireDatabaseFood && !chosenFood && !isEditMode) {
      Alert.alert('提醒', '請從資料庫選擇食物')
      return
    }

    try {
      if (isEditMode && entryId) {
        // Update existing entry
        const payload: CreateFoodEntryInput = {
          food_name: trimmedName,
          meal_type: mealType,
          consumed_at: selectedDate.toISOString(),
        }

        if (chosenFood) {
          payload.food_id = chosenFood.id
          payload.food_category = chosenFood.category
          payload.calories = chosenFood.calories
        }

        await updateEntry({ entryId, input: payload })
        Alert.alert('成功', `已更新「${trimmedName}」`)
        navigation.goBack()
      } else {
        // Create new entry
        const payload: CreateFoodEntryInput = {
          food_name: trimmedName,
          meal_type: mealType,
          consumed_at: selectedDate.toISOString(),
        }

        if (chosenFood) {
          payload.food_id = chosenFood.id
          payload.food_category = chosenFood.category
          payload.calories = chosenFood.calories
        }

        const newEntry = await createEntry(payload)

        // Add to recent entries list
        if (newEntry) {
          setRecentEntries(prev => [newEntry, ...prev].slice(0, 5))
        }

        // Clear input for next entry
        setFoodName('')
        setSelectedFood(null)
        setMealType(getMealTypeByTime())

        // Show success feedback
        const displayName = chosenFood?.name ?? trimmedName
        Alert.alert('成功', `已新增「${displayName}」`)
      }
    } catch (error) {
      Alert.alert('錯誤', error instanceof Error ? error.message : isEditMode ? '更新失敗' : '新增失敗')
    }
  }

  const handleDelete = async () => {
    if (!isEditMode || !entryId) return

    Alert.alert('確認刪除', `確定要刪除「${foodName}」嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(entryId)
            Alert.alert('成功', '已刪除記錄')
            navigation.goBack()
          } catch (error) {
            Alert.alert('錯誤', error instanceof Error ? error.message : '刪除失敗')
          }
        },
      },
    ])
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
              onPress={() => setShowDatePicker(prev => !prev)}
            >
              <IconButton icon="calendar" size={20} />
              <Text style={styles.dateText}>
                {format(selectedDate, 'yyyy年MM月dd日 (E)', { locale: zhTW })}
              </Text>
              <IconButton icon={showDatePicker ? 'chevron-up' : 'chevron-down'} size={20} />
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

          {/* Today's Statistics & Meal Type Selector */}
          <View style={styles.statsContainer}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>本日已記錄 · 選擇餐別</Text>
            </View>
            <View style={styles.statsRow}>
              <TouchableOpacity
                style={[
                  styles.statItem,
                  mealType === 'breakfast' && styles.statItemSelected
                ]}
                onPress={() => setMealType('breakfast')}
                activeOpacity={0.7}
              >
                <Text style={styles.statIcon}>🌅</Text>
                <Text style={styles.statCount}>{todayStats.breakfast}</Text>
                <Text style={[
                  styles.statLabel,
                  mealType === 'breakfast' && styles.statLabelSelected
                ]}>早餐</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statItem,
                  mealType === 'lunch' && styles.statItemSelected
                ]}
                onPress={() => setMealType('lunch')}
                activeOpacity={0.7}
              >
                <Text style={styles.statIcon}>☀️</Text>
                <Text style={styles.statCount}>{todayStats.lunch}</Text>
                <Text style={[
                  styles.statLabel,
                  mealType === 'lunch' && styles.statLabelSelected
                ]}>午餐</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statItem,
                  mealType === 'dinner' && styles.statItemSelected
                ]}
                onPress={() => setMealType('dinner')}
                activeOpacity={0.7}
              >
                <Text style={styles.statIcon}>🌙</Text>
                <Text style={styles.statCount}>{todayStats.dinner}</Text>
                <Text style={[
                  styles.statLabel,
                  mealType === 'dinner' && styles.statLabelSelected
                ]}>晚餐</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statItem,
                  mealType === 'snack' && styles.statItemSelected
                ]}
                onPress={() => setMealType('snack')}
                activeOpacity={0.7}
              >
                <Text style={styles.statIcon}>🍪</Text>
                <Text style={styles.statCount}>{todayStats.snack}</Text>
                <Text style={[
                  styles.statLabel,
                  mealType === 'snack' && styles.statLabelSelected
                ]}>點心</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.statsHint}>點擊選擇餐別</Text>
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
              onChangeText={handleFoodInputChange}
              onSelectFood={handleSelectFood}
              placeholder={
                requireDatabaseFood
                  ? '搜尋並選擇資料庫中的食物...'
                  : '輸入食物名稱...'
              }
              requireDatabaseSelection={requireDatabaseFood}
            />
          </View>
        </View>
      </ScrollView>

      {/* Floating Save Button */}
      <View style={styles.floatingButtonContainer}>
        {isEditMode && (
          <Button
            mode="outlined"
            onPress={handleDelete}
            loading={isDeleting}
            disabled={isDeleting || isUpdating}
            style={[styles.floatingButton, styles.deleteButton]}
            labelStyle={styles.deleteButtonLabel}
            icon="delete"
          >
            刪除記錄
          </Button>
        )}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isEditMode ? isUpdating : isCreating}
          disabled={
            (isEditMode ? isUpdating : isCreating) ||
            isDeleting ||
            !foodName.trim() ||
            (!isEditMode && requireDatabaseFood && !selectedFood)
          }
          style={styles.floatingButton}
          labelStyle={styles.floatingButtonLabel}
          icon="check"
        >
          {isEditMode ? '更新記錄' : '儲存記錄'}
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    flex: 1,
  },
  statItemSelected: {
    backgroundColor: colors.primary[100],
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  statCount: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  statLabelSelected: {
    color: colors.primary[700],
    fontWeight: typography.fontWeight.semibold,
  },
  statsHint: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
    textAlign: 'center',
    marginTop: spacing.xs,
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
    flexDirection: 'row',
    gap: spacing.md,
  },
  floatingButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 12,
    paddingVertical: spacing.xs,
    flex: 1,
  },
  floatingButtonLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderColor: colors.error,
    borderWidth: 2,
  },
  deleteButtonLabel: {
    color: colors.error,
  },
})
