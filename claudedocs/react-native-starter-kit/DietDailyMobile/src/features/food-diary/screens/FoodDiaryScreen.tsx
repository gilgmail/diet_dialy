import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FAB, Card, IconButton, ActivityIndicator } from 'react-native-paper'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { colors, typography, spacing } from '@/theme'
import { useFoodDiary } from '../hooks/useFoodDiary'
import { MEAL_TYPES, type FoodEntry } from '../types'

type FoodDiaryScreenProps = NativeStackScreenProps<any, 'FoodDiary'>

export function FoodDiaryScreen({ navigation }: FoodDiaryScreenProps) {
  const { entries, isLoading, refetch, deleteEntry, isDeleting } = useFoodDiary()

  const handleAddEntry = () => {
    navigation.navigate('AddFoodEntry')
  }

  const handleDeleteEntry = (entry: FoodEntry) => {
    Alert.alert('刪除記錄', `確定要刪除「${entry.food_name}」嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(entry.id)
          } catch (error) {
            Alert.alert('錯誤', '刪除失敗')
          }
        },
      },
    ])
  }

  const getMealTypeInfo = (mealType: string) => {
    return MEAL_TYPES.find(m => m.value === mealType) || MEAL_TYPES[0]
  }

  const renderEntry = ({ item }: { item: FoodEntry }) => {
    const mealInfo = getMealTypeInfo(item.meal_type)

    return (
      <Card style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.entryHeaderLeft}>
            <Text style={styles.mealIcon}>{mealInfo.icon}</Text>
            <View>
              <Text style={styles.foodName}>{item.food_name}</Text>
              <Text style={styles.mealType}>{mealInfo.label}</Text>
            </View>
          </View>
          <IconButton
            icon="delete-outline"
            size={20}
            iconColor={colors.error}
            onPress={() => handleDeleteEntry(item)}
            disabled={isDeleting}
          />
        </View>

        <View style={styles.entryDetails}>
          {item.portion_size && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>份量：</Text>
              <Text style={styles.detailValue}>{item.portion_size}</Text>
            </View>
          )}
          {item.calories && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>熱量：</Text>
              <Text style={styles.detailValue}>{item.calories} kcal</Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>時間：</Text>
            <Text style={styles.detailValue}>
              {format(new Date(item.consumed_at), 'HH:mm')}
            </Text>
          </View>
        </View>

        {item.notes && (
          <View style={styles.entryNotes}>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </Card>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🍽️</Text>
      <Text style={styles.emptyTitle}>還沒有飲食記錄</Text>
      <Text style={styles.emptyText}>點擊下方按鈕開始記錄您的餐點</Text>
    </View>
  )

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>飲食日記</Text>
      <Text style={styles.subtitle}>記錄每日飲食內容</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          entries.length === 0 && styles.listContentEmpty,
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={[colors.primary[500]]}
          />
        }
      />

      {isLoading && entries.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddEntry}
        color={colors.text.inverse}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 56, // FAB height + padding
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  entryCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    elevation: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  entryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  foodName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  mealType: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  entryDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  entryNotes: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary[500],
  },
})
