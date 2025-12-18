import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, TextInput, SegmentedButtons, IconButton } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
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

function parseDateInput(dateInput?: string | Date | null): Date {
  // Normalize to date-only (no time) to avoid timezone drift and invalid strings
  if (!dateInput) {
    return new Date()
  }

  if (dateInput instanceof Date) {
    const normalized = new Date(dateInput)
    normalized.setHours(12, 0, 0, 0)
    return normalized
  }

  // Extract YYYY-MM-DD even if the string has a space or other time portion
  const datePart = dateInput.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? dateInput.split('T')[0]

  // Try YYYY-MM-DDT12:00:00
  const parsed = new Date(`${datePart}T12:00:00`)
  if (!Number.isNaN(parsed.getTime())) return parsed

  // Try raw string
  const direct = new Date(dateInput)
  if (!Number.isNaN(direct.getTime())) {
    direct.setHours(12, 0, 0, 0)
    return direct
  }

  const fallback = new Date()
  fallback.setHours(12, 0, 0, 0)
  return fallback
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
  const [selectedDate, setSelectedDate] = useState(() =>
    parseDateInput(route.params?.date || existingEntry?.consumed_at || null)
  )
  const [recentEntries, setRecentEntries] = useState<FoodEntry[]>([])
  
  // Fetch recent food entries (last 10) for quick selection
  const { data: recentFoodEntries = [] } = useQuery({
    queryKey: ['recentFoodEntries', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      // Get last 10 unique food names from recent entries
      const result = await FoodDiaryService.getFoodEntriesByDateRange(
        user.id,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date()
      )
      const uniqueFoods = new Map<string, FoodEntry>()
      result.data?.forEach(entry => {
        if (!uniqueFoods.has(entry.food_name)) {
          uniqueFoods.set(entry.food_name, entry)
        }
      })
      return Array.from(uniqueFoods.values()).slice(0, 10)
    },
    enabled: !!user?.id && !isEditMode,
  })
  const mealPriority: Record<MealType, number> = useMemo(
    () => ({ snack: 0, dinner: 1, lunch: 2, breakfast: 3 }),
    []
  )

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

  // Show today's entries in the "recent entries" section with desired meal ordering
  useEffect(() => {
    const sorted = [...todayEntries].sort((a, b) => {
      const orderA = mealPriority[a.meal_type]
      const orderB = mealPriority[b.meal_type]
      if (orderA !== orderB) return orderA - orderB
      return new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
    })
    setRecentEntries(sorted)
  }, [todayEntries, mealPriority])

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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

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
      setShowAdvancedOptions(true) // Show advanced options in edit mode

      // Update selected date to match entry date (with safety check)
      if (existingEntry.consumed_at) {
        const entryDate = parseDateInput(existingEntry.consumed_at)
        console.log('[AddFoodEntry] Setting date from entry:', {
          consumed_at: existingEntry.consumed_at,
          extracted: existingEntry.consumed_at.split('T')[0],
          dateObject: entryDate.toISOString(),
          formatted: format(entryDate, 'yyyy-MM-dd')
        })
        setSelectedDate(entryDate)
      }
    }
  }, [existingEntry?.id])

  // Handle date param updates (e.g., navigating with a timestamp)
  useEffect(() => {
    if (route.params?.date) {
      setSelectedDate(parseDateInput(route.params.date))
    }
  }, [route.params?.date])

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
      // Skip auto-reset in edit mode or when date parameter is provided
      if (isEditMode || route.params?.date) {
        console.log('[AddFoodEntry] Skip auto-reset:', { isEditMode, hasDateParam: !!route.params?.date })
        return
      }

      const now = new Date()
      setSelectedDate(prev => (isSameDay(prev, now) ? prev : now))
      setMealType(getMealTypeByTime())
    }, [isEditMode, route.params?.date])
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
          setRecentEntries(prev => {
            const next = [newEntry, ...prev]
            next.sort((a, b) => {
              const orderA = mealPriority[a.meal_type]
              const orderB = mealPriority[b.meal_type]
              if (orderA !== orderB) return orderA - orderB
              return new Date(b.consumed_at).getTime() - new Date(a.consumed_at).getTime()
            })
            return next.slice(0, 5)
          })
        }

        // Clear input for next entry (only in quick mode)
        if (!showAdvancedOptions) {
          setFoodName('')
          setSelectedFood(null)
          setMealType(getMealTypeByTime())
        } else {
          // In advanced mode, keep the form open for next entry
          setFoodName('')
          setSelectedFood(null)
        }

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
          {/* Quick Mode: Main Food Input - Large and Prominent */}
          {!showAdvancedOptions && !isEditMode && (
            <>
              {/* Recent Food Quick Selection */}
              {recentFoodEntries.length > 0 && (
                <View style={styles.recentFoodsContainer}>
                  <Text style={styles.recentFoodsTitle}>最近記錄的食物</Text>
                  <View style={styles.recentFoodsGrid}>
                    {recentFoodEntries.slice(0, 10).map((entry) => (
                      <TouchableOpacity
                        key={entry.id}
                        style={styles.recentFoodButton}
                        onPress={() => {
                          setFoodName(entry.food_name)
                          setMealType(entry.meal_type)
                          if (entry.food_id) {
                            // Try to find the food in search results
                            setSelectedFood({
                              id: entry.food_id,
                              name: entry.food_name,
                              category: entry.food_category || '',
                              calories: entry.calories || 0,
                            } as FoodSearchResult)
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.recentFoodIcon}>
                          {MEAL_TYPES.find(m => m.value === entry.meal_type)?.icon || '🍽️'}
                        </Text>
                        <Text style={styles.recentFoodName} numberOfLines={1}>
                          {entry.food_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Meal Type Quick Selector - Compact */}
              <View style={styles.quickMealSelector}>
                {MEAL_TYPES.map((meal) => (
                  <TouchableOpacity
                    key={meal.value}
                    style={[
                      styles.quickMealButton,
                      mealType === meal.value && styles.quickMealButtonSelected,
                    ]}
                    onPress={() => setMealType(meal.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickMealIcon}>{meal.icon}</Text>
                    <Text style={[
                      styles.quickMealLabel,
                      mealType === meal.value && styles.quickMealLabelSelected,
                    ]}>
                      {meal.label}
                    </Text>
                    {todayStats[meal.value] > 0 && (
                      <Text style={styles.quickMealCount}>{todayStats[meal.value]}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Main Food Input - Large */}
              <View style={styles.mainInputSection}>
                <FoodSearchInput
                  value={foodName}
                  onChangeText={handleFoodInputChange}
                  onSelectFood={handleSelectFood}
                  placeholder={
                    requireDatabaseFood
                      ? '搜尋並選擇食物...'
                      : '輸入食物名稱...'
                  }
                  requireDatabaseSelection={requireDatabaseFood}
                />
              </View>

              {/* Advanced Options Toggle */}
              <TouchableOpacity
                style={styles.advancedToggle}
                onPress={() => setShowAdvancedOptions(true)}
              >
                <Icon name="chevron-down" size={20} color={colors.primary[500]} />
                <Text style={styles.advancedToggleText}>顯示進階選項（日期、詳細資訊）</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Advanced Mode: Full Form */}
          {(showAdvancedOptions || isEditMode) && (
            <>
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
                  {MEAL_TYPES.map((meal) => (
                    <TouchableOpacity
                      key={meal.value}
                      style={[
                        styles.statItem,
                        mealType === meal.value && styles.statItemSelected
                      ]}
                      onPress={() => setMealType(meal.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.statIcon}>{meal.icon}</Text>
                      <Text style={styles.statCount}>{todayStats[meal.value]}</Text>
                      <Text style={[
                        styles.statLabel,
                        mealType === meal.value && styles.statLabelSelected
                      ]}>
                        {meal.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.statsHint}>點擊選擇餐別</Text>
              </View>

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

              {/* Collapse Advanced Options */}
              {!isEditMode && (
                <TouchableOpacity
                  style={styles.advancedToggle}
                  onPress={() => setShowAdvancedOptions(false)}
                >
                  <Icon name="chevron-up" size={20} color={colors.primary[500]} />
                  <Text style={styles.advancedToggleText}>隱藏進階選項</Text>
                </TouchableOpacity>
              )}
            </>
          )}
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
    borderRadius: 16,
    paddingVertical: spacing.md,
    minHeight: 56,
    flex: 1,
  },
  floatingButtonLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
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
  recentFoodsContainer: {
    backgroundColor: colors.primary[50],
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  recentFoodsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[700],
    marginBottom: spacing.sm,
  },
  recentFoodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recentFoodButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentFoodIcon: {
    fontSize: 24,
    marginBottom: spacing.xs / 2,
  },
  recentFoodName: {
    fontSize: typography.fontSize.xs,
    color: colors.text.primary,
    textAlign: 'center',
  },
  quickMealSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    justifyContent: 'space-around',
  },
  quickMealButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 80,
    justifyContent: 'center',
  },
  quickMealButtonSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  quickMealIcon: {
    fontSize: 28,
    marginBottom: spacing.xs / 2,
  },
  quickMealLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  quickMealLabelSelected: {
    color: colors.primary[700],
    fontWeight: typography.fontWeight.semibold,
  },
  quickMealCount: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[600],
    marginTop: spacing.xs / 2,
    fontWeight: typography.fontWeight.bold,
  },
  mainInputSection: {
    marginBottom: spacing.lg,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  advancedToggleText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
})
