import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { Button, TextInput, SegmentedButtons, IconButton } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { appConfig } from '@/shared/config/appConfig'
import { useFoodDiary } from '@/features/food-diary/hooks/useFoodDiary'
import { useSymptomDiary } from '@/features/symptom-diary/hooks/useSymptomDiary'
import { FoodDiaryService } from '@/features/food-diary/services/FoodDiaryService'
import { FoodSearchInput } from '@/features/food-diary/components/FoodSearchInput'
import {
  MEAL_TYPES,
  type MealType,
  type FoodSearchResult,
  type FoodEntry,
  type CreateFoodEntryInput,
} from '@/features/food-diary/types'
import {
  SEVERITY_LEVELS,
  COMMON_SYMPTOMS,
  type SeverityLevel,
  type SymptomEntry,
} from '@/features/symptom-diary/types'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { colors, typography, spacing } from '@/theme'

// Get meal type based on current time
function getMealTypeByTime(): MealType {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 15 && hour < 17) return 'snack'
  if (hour >= 17 && hour < 20) return 'dinner'
  return 'snack'
}

export function HomeScreen() {
  const { user } = useAuthStore()
  const { createEntry: createFoodEntry, isCreating: isCreatingFood } = useFoodDiary()
  const { createEntry: createSymptomEntry, isCreating: isCreatingSymptom } =
    useSymptomDiary()
  const { requireDatabaseFood } = appConfig

  // UI state - Default expand food card
  const [expandedCard, setExpandedCard] = useState<'food' | 'symptom' | null>('food')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Food form state
  const [foodName, setFoodName] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null)
  const [mealType, setMealType] = useState<MealType>(getMealTypeByTime())
  const [recentFoodEntries, setRecentFoodEntries] = useState<FoodEntry[]>([])

  // Symptom form state
  const [symptomName, setSymptomName] = useState('')
  const [severity, setSeverity] = useState<SeverityLevel>('mild')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const [recentSymptomEntries, setRecentSymptomEntries] = useState<SymptomEntry[]>([])

  // Fetch today's food entries for stats
  const { data: todayFoodEntries = [] } = useQuery({
    queryKey: ['foodEntries', user?.id, selectedDate.toISOString().split('T')[0]],
    queryFn: async () => {
      if (!user?.id) return []
      const result = await FoodDiaryService.getFoodEntriesByDate(user.id, selectedDate)
      return result.data || []
    },
    enabled: !!user?.id && expandedCard === 'food',
  })

  const todayStats = useMemo(() => {
    const stats = { breakfast: 0, lunch: 0, dinner: 0, snack: 0, total: todayFoodEntries.length }
    todayFoodEntries.forEach((entry: FoodEntry) => {
      if (entry.meal_type in stats) {
        stats[entry.meal_type as keyof typeof stats]++
      }
    })
    return stats
  }, [todayFoodEntries])

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (date) {
      setSelectedDate(date)
    }
  }

  const handleFoodInputChange = (text: string) => {
    setFoodName(text)
    setSelectedFood(null)
  }

  const handleSelectFood = (food: FoodSearchResult) => {
    setSelectedFood(food)
    setFoodName(food.name)
  }

  const handleFoodSubmit = async () => {
    const chosenFood = selectedFood
    const trimmedName = foodName.trim()

    if (!trimmedName) {
      Alert.alert('錯誤', '請輸入食物名稱')
      return
    }

    if (requireDatabaseFood && !chosenFood) {
      Alert.alert('提醒', '請從資料庫選擇食物')
      return
    }

    try {
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

      const newEntry = await createFoodEntry(payload)

      if (newEntry) {
        setRecentFoodEntries((prev) => [newEntry, ...prev].slice(0, 5))
      }

      setFoodName('')
      setSelectedFood(null)
      setMealType(getMealTypeByTime())
      const displayName = chosenFood?.name ?? trimmedName
      Alert.alert('成功', `已新增「${displayName}」`)
    } catch (error) {
      Alert.alert('錯誤', error instanceof Error ? error.message : '新增失敗')
    }
  }

  const handleSymptomSubmit = async () => {
    if (!symptomName.trim()) {
      Alert.alert('提醒', '請輸入症狀名稱')
      return
    }

    try {
      const newEntry = await createSymptomEntry({
        symptom_name: symptomName.trim(),
        severity,
        duration_minutes: duration ? parseInt(duration, 10) : undefined,
        notes: notes.trim() || undefined,
        occurred_at: selectedDate.toISOString(),
      })

      if (newEntry) {
        setRecentSymptomEntries((prev) => {
          const filtered = prev.filter((e) => e.id !== newEntry.id)
          return [newEntry, ...filtered].slice(0, 5)
        })
      }

      setSymptomName('')
      setSeverity('mild')
      setDuration('')
      setNotes('')
      Alert.alert('成功', `已新增症狀記錄「${symptomName.trim()}」`)
    } catch (error) {
      Alert.alert('錯誤', '新增失敗，請稍後再試')
    }
  }

  const handleCommonSymptomSelect = (name: string) => {
    setSymptomName(name)
  }

  // Format meal type buttons - show emoji only, or emoji + label when selected
  const mealTypeButtons = MEAL_TYPES.map((meal) => ({
    value: meal.value,
    label: mealType === meal.value ? `${meal.icon} ${meal.label}` : meal.icon,
  }))

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>快速記錄</Text>
        <Text style={styles.headerSubtitle}>直接在首頁快速記錄飲食和症狀</Text>
      </View>

      {/* Date Picker - Shared */}
      <View style={styles.datePickerContainer}>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
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

      {/* Food Entry Card */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpandedCard(expandedCard === 'food' ? null : 'food')}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeaderLeft}>
            <Icon name="food-apple" size={32} color={colors.success} />
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>新增飲食記錄</Text>
              <Text style={styles.cardSubtitle}>記錄您的飲食內容</Text>
            </View>
          </View>
          <Icon
            name={expandedCard === 'food' ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {expandedCard === 'food' && (
          <View style={styles.cardContent}>
            {/* Today's Stats */}
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
            {recentFoodEntries.length > 0 && (
              <View style={styles.recentEntriesContainer}>
                <Text style={styles.recentEntriesTitle}>剛新增的記錄</Text>
                {recentFoodEntries.map((entry) => (
                  <View key={entry.id} style={styles.recentEntryItem}>
                    <Text style={styles.recentEntryIcon}>
                      {MEAL_TYPES.find((m) => m.value === entry.meal_type)?.icon}
                    </Text>
                    <Text style={styles.recentEntryText}>{entry.food_name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Food Search */}
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

            {/* Meal Type */}
            <View style={styles.section}>
              <View style={styles.mealTypeGrid}>
                {MEAL_TYPES.map((meal) => (
                  <TouchableOpacity
                    key={meal.value}
                    style={[
                      styles.mealTypeButton,
                      mealType === meal.value && styles.mealTypeButtonActive,
                    ]}
                    onPress={() => setMealType(meal.value)}
                  >
                    <Text style={styles.mealTypeEmoji}>{meal.icon}</Text>
                    {mealType === meal.value && (
                      <Text style={styles.mealTypeLabel}>{meal.label}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Submit Button */}
            <Button
              mode="contained"
              onPress={handleFoodSubmit}
              loading={isCreatingFood}
              disabled={
                isCreatingFood ||
                !foodName.trim() ||
                (requireDatabaseFood && !selectedFood)
              }
              style={styles.submitButton}
              buttonColor={colors.success}
              icon="check"
            >
              儲存飲食記錄
            </Button>
          </View>
        )}
      </View>

      {/* Symptom Entry Card */}
      <View style={[styles.card, styles.symptomCard]}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpandedCard(expandedCard === 'symptom' ? null : 'symptom')}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeaderLeft}>
            <Icon name="medical-bag" size={32} color={colors.error} />
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>新增症狀記錄</Text>
              <Text style={styles.cardSubtitle}>記錄您的症狀類型</Text>
            </View>
          </View>
          <Icon
            name={expandedCard === 'symptom' ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {expandedCard === 'symptom' && (
          <View style={styles.cardContent}>
            {/* Recent Entries */}
            {recentSymptomEntries.length > 0 && (
              <View style={styles.recentEntriesContainer}>
                <Text style={styles.recentEntriesTitle}>剛新增的記錄</Text>
                {recentSymptomEntries.map((entry) => {
                  const severityInfo = SEVERITY_LEVELS.find((s) => s.value === entry.severity)
                  return (
                    <View key={entry.id} style={styles.recentEntryItem}>
                      <Text style={styles.recentEntryIcon}>{severityInfo?.icon}</Text>
                      <Text style={styles.recentEntryText}>
                        {entry.symptom_name} ({severityInfo?.label})
                      </Text>
                    </View>
                  )
                })}
              </View>
            )}

            {/* Symptom Name */}
            <View style={styles.section}>
              <Text style={styles.label}>
                症狀名稱 <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                mode="outlined"
                placeholder="例：頭痛、腹痛"
                value={symptomName}
                onChangeText={setSymptomName}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary[500]}
              />
            </View>

            {/* Common Symptoms */}
            <View style={styles.section}>
              <Text style={styles.label}>常見症狀</Text>
              <View style={styles.symptomsGrid}>
                {COMMON_SYMPTOMS.map((symptom) => (
                  <TouchableOpacity
                    key={symptom.name}
                    style={[
                      styles.symptomChip,
                      symptomName === symptom.name && styles.symptomChipActive,
                    ]}
                    onPress={() => handleCommonSymptomSelect(symptom.name)}
                  >
                    <Text style={styles.symptomIcon}>{symptom.icon}</Text>
                    <Text
                      style={[
                        styles.symptomName,
                        symptomName === symptom.name && styles.symptomNameActive,
                      ]}
                    >
                      {symptom.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Severity */}
            <View style={styles.section}>
              <Text style={styles.label}>
                嚴重程度 <Text style={styles.required}>*</Text>
              </Text>
              <SegmentedButtons
                value={severity}
                onValueChange={(value) => setSeverity(value as SeverityLevel)}
                buttons={SEVERITY_LEVELS.map((level) => ({
                  value: level.value,
                  label: `${level.icon} ${level.label}`,
                  style:
                    severity === level.value
                      ? { backgroundColor: level.color + '20' }
                      : undefined,
                }))}
                style={styles.segmentedButtons}
              />
            </View>

            {/* Optional Fields Toggle */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.optionalFieldsToggle}
                onPress={() => setShowOptionalFields(!showOptionalFields)}
              >
                <Icon
                  name={showOptionalFields ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.primary[500]}
                />
                <Text style={styles.optionalFieldsToggleText}>
                  {showOptionalFields ? '隱藏選填欄位' : '顯示選填欄位（持續時間、備註）'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Duration - Collapsible */}
            {showOptionalFields && (
              <View style={styles.section}>
                <Text style={styles.label}>持續時間（分鐘）</Text>
                <TextInput
                  mode="outlined"
                  placeholder="例：30"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                  style={styles.input}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary[500]}
                />
              </View>
            )}

            {/* Notes - Collapsible */}
            {showOptionalFields && (
              <View style={styles.section}>
                <Text style={styles.label}>備註</Text>
                <TextInput
                  mode="outlined"
                  placeholder="例：早上起床後開始，午餐後好轉"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  style={[styles.input, styles.textArea]}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary[500]}
                />
              </View>
            )}

            {/* Submit Button */}
            <Button
              mode="contained"
              onPress={handleSymptomSubmit}
              loading={isCreatingSymptom}
              disabled={isCreatingSymptom}
              style={styles.submitButton}
              buttonColor={colors.error}
              icon="check"
            >
              儲存症狀記錄
            </Button>
          </View>
        )}
      </View>

      {/* Quick Tip */}
      <View style={styles.tipContainer}>
        <Icon name="information-outline" size={20} color={colors.primary[500]} />
        <Text style={styles.tipText}>點擊卡片標題展開快速記錄表單</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  datePickerContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.success + '20',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  symptomCard: {
    borderColor: colors.error + '20',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardHeaderText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  cardSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  cardContent: {
    padding: spacing.lg,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statsContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: spacing.xs,
  },
  statCount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  recentEntriesContainer: {
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  section: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.surface,
  },
  textArea: {
    minHeight: 100,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  symptomChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  symptomIcon: {
    fontSize: 16,
  },
  symptomName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  symptomNameActive: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  segmentedButtons: {
    backgroundColor: colors.surface,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  mealTypeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.border,
    minHeight: 60,
    gap: spacing.xs,
  },
  mealTypeButtonActive: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success,
  },
  mealTypeEmoji: {
    fontSize: 24,
  },
  mealTypeLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.success,
  },
  submitButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  optionalFieldsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  optionalFieldsToggleText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  tipText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
})
