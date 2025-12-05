import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
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
  requireDatabaseSelection?: boolean
}

export function FoodSearchInput({
  value,
  onChangeText,
  onSelectFood,
  placeholder = '搜尋食物...',
  requireDatabaseSelection = false,
}: FoodSearchInputProps) {
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Close dropdown when value is cleared externally
  useEffect(() => {
    if (value.trim().length === 0) {
      setShowResults(false)
      setSearchResults([])
    }
  }, [value])

  const handleSearch = useCallback(
    async (query: string) => {
      onChangeText(query)

      // If database selection is not required, don't search
      if (!requireDatabaseSelection) {
        setSearchResults([])
        setShowResults(false)
        return
      }

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
    [onChangeText, requireDatabaseSelection]
  )

  const handleSelectFood = (food: FoodSearchResult) => {
    onSelectFood(food)
    setShowResults(false)
    setSearchResults([])
  }

  const renderFoodItem = (item: FoodSearchResult) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => handleSelectFood(item)}
      style={styles.resultItem}
    >
      <Text style={styles.foodName}>{item.name}</Text>
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
        textColor={colors.text.primary}
        right={
          isSearching ? (
            <TextInput.Icon icon={() => <ActivityIndicator size={20} />} />
          ) : null
        }
      />

      {requireDatabaseSelection && showResults && searchResults.length > 0 && (
        <View style={styles.resultsWrapper}>
          <Card style={styles.resultsCard}>
            <ScrollView
              style={styles.resultsList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {searchResults.map(renderFoodItem)}
            </ScrollView>
          </Card>
        </View>
      )}

      {requireDatabaseSelection && showResults && searchResults.length === 0 && !isSearching && value.trim().length > 0 && (
        <View style={styles.resultsWrapper}>
          <Card style={styles.resultsCard}>
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>資料庫中沒有「{value}」</Text>
              <Text style={styles.noResultsHint}>
                請調整關鍵字或選擇其他食物，目前僅支援資料庫中的食物項目
              </Text>
            </View>
          </Card>
        </View>
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
  resultsWrapper: {
    marginTop: spacing.xs,
    width: '100%',
  },
  resultsCard: {
    maxHeight: 240,
    backgroundColor: colors.surface,
    elevation: 6,
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  resultsList: {
    maxHeight: 240,
  },
  resultItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  foodName: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  noResultsContainer: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
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
    textAlign: 'center',
  },
})
