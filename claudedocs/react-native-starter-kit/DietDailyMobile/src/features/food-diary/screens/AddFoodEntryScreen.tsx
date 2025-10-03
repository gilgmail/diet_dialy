import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, TextInput, SegmentedButtons, Chip } from 'react-native-paper'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { colors, typography, spacing } from '@/theme'
import { useFoodDiary } from '../hooks/useFoodDiary'
import { MEAL_TYPES, type MealType, type FoodSearchResult } from '../types'
import { FoodSearchInput } from '../components/FoodSearchInput'

type AddFoodEntryScreenProps = NativeStackScreenProps<any, 'AddFoodEntry'>

export function AddFoodEntryScreen({ navigation }: AddFoodEntryScreenProps) {
  const { createEntry, isCreating } = useFoodDiary()

  const [foodName, setFoodName] = useState('')
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [portionSize, setPortionSize] = useState('')
  const [calories, setCalories] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedFoodInfo, setSelectedFoodInfo] = useState<FoodSearchResult | null>(null)

  const handleSelectFood = (food: FoodSearchResult) => {
    setFoodName(food.name)
    setSelectedFoodInfo(food)

    // Auto-fill nutrition information (calories from database is per 100g)
    if (food.calories !== undefined) setCalories(food.calories.toString())
  }

  const handleSubmit = async () => {
    if (!foodName.trim()) {
      Alert.alert('錯誤', '請輸入食物名稱')
      return
    }

    try {
      await createEntry({
        food_name: foodName.trim(),
        meal_type: mealType,
        portion_size: portionSize.trim() || undefined,
        calories: calories ? parseInt(calories, 10) : undefined,
        notes: notes.trim() || undefined,
      })

      Alert.alert('成功', '食物記錄已新增', [
        {
          text: '確定',
          onPress: () => navigation.goBack(),
        },
      ])
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>新增飲食記錄</Text>
            <Text style={styles.subtitle}>記錄您的餐點內容</Text>
          </View>

          {/* Food Name with Search */}
          <View style={styles.section}>
            <Text style={styles.label}>食物名稱 *</Text>
            <Text style={styles.helperText}>
              可以直接輸入或從資料庫搜尋
            </Text>
            <FoodSearchInput
              value={foodName}
              onChangeText={setFoodName}
              onSelectFood={handleSelectFood}
              placeholder="搜尋或輸入食物名稱..."
            />

            {/* Show selected food nutrition info */}
            {selectedFoodInfo && (
              <View style={styles.nutritionChips}>
                {selectedFoodInfo.category && (
                  <Chip
                    icon="tag"
                    style={styles.chip}
                    textStyle={styles.chipText}
                  >
                    {selectedFoodInfo.category}
                  </Chip>
                )}
                {selectedFoodInfo.protein !== undefined && (
                  <Chip style={styles.chip} textStyle={styles.chipText}>
                    蛋白質: {selectedFoodInfo.protein}g
                  </Chip>
                )}
                {selectedFoodInfo.carbohydrates !== undefined && (
                  <Chip style={styles.chip} textStyle={styles.chipText}>
                    碳水: {selectedFoodInfo.carbohydrates}g
                  </Chip>
                )}
                {selectedFoodInfo.fat !== undefined && (
                  <Chip style={styles.chip} textStyle={styles.chipText}>
                    脂肪: {selectedFoodInfo.fat}g
                  </Chip>
                )}
              </View>
            )}
          </View>

          {/* Meal Type */}
          <View style={styles.section}>
            <Text style={styles.label}>餐點類型 *</Text>
            <SegmentedButtons
              value={mealType}
              onValueChange={value => setMealType(value as MealType)}
              buttons={mealTypeButtons}
              style={styles.segmentedButtons}
            />
          </View>

          {/* Portion Size */}
          <View style={styles.section}>
            <Text style={styles.label}>份量</Text>
            <TextInput
              mode="outlined"
              placeholder="例如：1碗、100g"
              value={portionSize}
              onChangeText={setPortionSize}
              style={styles.input}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary[500]}
            />
          </View>

          {/* Calories */}
          <View style={styles.section}>
            <Text style={styles.label}>熱量 (kcal)</Text>
            <TextInput
              mode="outlined"
              placeholder="例如：150"
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
              style={styles.input}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary[500]}
            />
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>備註</Text>
            <TextInput
              mode="outlined"
              placeholder="其他說明..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea]}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary[500]}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={isCreating}
              style={[styles.button, styles.cancelButton]}
              labelStyle={styles.cancelButtonLabel}
            >
              取消
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isCreating}
              disabled={isCreating || !foodName.trim()}
              style={[styles.button, styles.submitButton]}
              labelStyle={styles.submitButtonLabel}
            >
              儲存
            </Button>
          </View>
        </View>
      </ScrollView>
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
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
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
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  helperText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
  },
  textArea: {
    minHeight: 80,
  },
  segmentedButtons: {
    backgroundColor: colors.surface,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  button: {
    flex: 1,
    borderRadius: 12,
  },
  cancelButton: {
    borderColor: colors.border,
  },
  cancelButtonLabel: {
    color: colors.text.secondary,
  },
  submitButton: {
    backgroundColor: colors.primary[500],
  },
  submitButtonLabel: {
    color: colors.text.inverse,
  },
  nutritionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    backgroundColor: colors.primary[50],
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipText: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[700],
  },
})
