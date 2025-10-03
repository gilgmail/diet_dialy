import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { TextInput, Card } from 'react-native-paper'
import { colors, typography, spacing } from '@/theme'
import { FoodDiaryService } from '../services/FoodDiaryService'
import type { FoodSearchResult } from '../types'

interface FoodSearchInputProps {
  value: string
  onChangeText: (text: string) => void
  onSelectFood: (food: FoodSearchResult) => void
  placeholder?: string
}

export function FoodSearchInput({
  value,
  onChangeText,
  onSelectFood,
  placeholder = '搜尋食物...',
}: FoodSearchInputProps) {
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const handleSearch = useCallback(
    async (query: string) => {
      onChangeText(query)

      if (query.trim().length < 1) {
        setSearchResults([])
        setShowResults(false)
        return
      }

      setIsSearching(true)
      setShowResults(true)

      try {
        const { data, error } = await FoodDiaryService.searchFoods(query)

        if (error) {
          console.error('Food search error:', error)
          setSearchResults([])
        } else {
          setSearchResults(data || [])
        }
      } catch (error) {
        console.error('Food search failed:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    },
    [onChangeText]
  )

  const handleSelectFood = (food: FoodSearchResult) => {
    onSelectFood(food)
    setShowResults(false)
    setSearchResults([])
  }

  const renderFoodItem = ({ item }: { item: FoodSearchResult }) => (
    <TouchableOpacity
      onPress={() => handleSelectFood(item)}
      style={styles.resultItem}
    >
      <View style={styles.resultItemHeader}>
        <View style={styles.foodNameContainer}>
          <Text style={styles.foodName}>{item.name}</Text>
          {item.name_en && (
            <Text style={styles.foodNameEn}>{item.name_en}</Text>
          )}
        </View>
        <Text style={styles.foodCategory}>{item.category}</Text>
      </View>
      {item.brand && (
        <Text style={styles.brandText}>品牌: {item.brand}</Text>
      )}
      <View style={styles.resultItemDetails}>
        {item.serving_size && (
          <Text style={styles.detailText}>份量: {item.serving_size}</Text>
        )}
        {item.calories !== undefined && (
          <Text style={styles.detailText}>熱量: {item.calories} kcal</Text>
        )}
      </View>
      {(item.protein !== undefined ||
        item.carbohydrates !== undefined ||
        item.fat !== undefined) && (
        <View style={styles.nutritionInfo}>
          {item.protein !== undefined && (
            <Text style={styles.nutritionText}>蛋白質: {item.protein}g</Text>
          )}
          {item.carbohydrates !== undefined && (
            <Text style={styles.nutritionText}>
              碳水: {item.carbohydrates}g
            </Text>
          )}
          {item.fat !== undefined && (
            <Text style={styles.nutritionText}>脂肪: {item.fat}g</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        placeholder={placeholder}
        value={value}
        onChangeText={handleSearch}
        onFocus={() => value.length > 0 && setShowResults(true)}
        style={styles.input}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary[500]}
        right={
          isSearching ? (
            <TextInput.Icon icon={() => <ActivityIndicator size={20} />} />
          ) : null
        }
      />

      {showResults && searchResults.length > 0 && (
        <Card style={styles.resultsCard}>
          <FlatList
            data={searchResults}
            renderItem={renderFoodItem}
            keyExtractor={item => item.id}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
          />
        </Card>
      )}

      {showResults && searchResults.length === 0 && !isSearching && value.trim().length > 0 && (
        <Card style={styles.resultsCard}>
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>資料庫中沒有「{value}」</Text>
            <Text style={styles.noResultsHint}>
              沒關係！可以直接使用此名稱記錄
            </Text>
          </View>
        </Card>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  input: {
    backgroundColor: colors.background,
  },
  resultsCard: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    maxHeight: 300,
    backgroundColor: colors.surface,
    elevation: 4,
    zIndex: 20,
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  foodNameContainer: {
    flex: 1,
  },
  foodName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  foodNameEn: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  foodCategory: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    marginLeft: spacing.sm,
  },
  brandText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
  },
  resultItemDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  nutritionInfo: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  nutritionText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noResultsContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  noResultsHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
})
