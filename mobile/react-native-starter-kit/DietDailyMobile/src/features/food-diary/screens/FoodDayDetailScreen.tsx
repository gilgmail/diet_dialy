import React, { useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, IconButton } from 'react-native-paper'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { colors, typography, spacing } from '@/theme'
import { useFoodDiary } from '../hooks/useFoodDiary'
import { MEAL_TYPES, type FoodEntry } from '../types'
import type { MainStackParamList } from '@/app/navigation/types'
import { useAuthStore } from '@/shared/stores/authStore'
import { SymptomDiaryService } from '@/features/symptom-diary/services/SymptomDiaryService'
import { SEVERITY_LEVELS } from '@/features/symptom-diary/types'
import type { SymptomEntry } from '@/features/symptom-diary/types'

type FoodDayDetailScreenProps = NativeStackScreenProps<MainStackParamList, 'FoodDayDetail'>

export function FoodDayDetailScreen({ route, navigation }: FoodDayDetailScreenProps) {
  const { date } = route.params
  const { user } = useAuthStore()
  const { entries, deleteEntry, isDeleting } = useFoodDiary()

  console.log('[FoodDayDetail] Screen rendered with date:', date, 'user:', user?.id)

  // Filter entries for this specific date, sorted by meal type
  const dayEntries = useMemo(() => {
    const mealOrder = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 }
    return entries
      .filter((entry) => {
        const entryDate = format(parseISO(entry.consumed_at), 'yyyy-MM-dd')
        return entryDate === date
      })
      .sort((a, b) => {
        const orderA = mealOrder[a.meal_type as keyof typeof mealOrder] ?? 999
        const orderB = mealOrder[b.meal_type as keyof typeof mealOrder] ?? 999
        if (orderA !== orderB) return orderA - orderB
        // If same meal type, sort by time
        return new Date(a.consumed_at).getTime() - new Date(b.consumed_at).getTime()
      })
  }, [entries, date])

  // Fetch symptom entries for this date
  const { data: symptomEntries = [], refetch: refetchSymptoms, isLoading, isFetching } = useQuery({
    queryKey: ['symptomEntriesForDate', user?.id, date],
    queryFn: async () => {
      if (!user?.id) {
        console.log('[FoodDayDetail] No user ID')
        return []
      }
      console.log('[FoodDayDetail] Fetching symptoms for date string:', date, 'user:', user.id)
      // Use date string directly - no Date object conversion needed
      const result = await SymptomDiaryService.getSymptomEntriesByDateString(user.id, date)
      console.log('[FoodDayDetail] Query result:', {
        date,
        dataCount: result.data?.length || 0,
        data: result.data,
        error: result.error
      })
      return result.data || []
    },
    enabled: !!user?.id,
    staleTime: 0, // Always consider data stale
    cacheTime: 0, // Don't cache results
  })

  console.log('[FoodDayDetail] Current state:', {
    symptomCount: symptomEntries.length,
    isLoading,
    isFetching,
    hasUser: !!user?.id
  })

  const handleDeleteEntry = (entry: FoodEntry) => {
    Alert.alert('刪除記錄', `確定要刪除「${entry.food_name}」嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(entry.id)
            if (dayEntries.length === 1) {
              navigation.goBack()
            }
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

  const getSeverityInfo = (severity: string) => {
    return SEVERITY_LEVELS.find(s => s.value === severity) || SEVERITY_LEVELS[0]
  }

  const handleDeleteSymptom = (entry: SymptomEntry) => {
    Alert.alert('刪除症狀記錄', '確定要刪除此症狀記錄嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!user?.id) return
            await SymptomDiaryService.deleteSymptomEntry(entry.id, user.id)
            refetchSymptoms()
          } catch (error) {
            Alert.alert('錯誤', '刪除失敗')
          }
        },
      },
    ])
  }

  const handleEditFood = (entry: FoodEntry) => {
    navigation.navigate('AddFoodEntry', { entryId: entry.id })
  }

  const handleEditSymptom = (entry: SymptomEntry) => {
    navigation.navigate('AddSymptomEntry', { entryId: entry.id })
  }

  const handleAddFood = () => {
    navigation.navigate('AddFoodEntry', { defaultDate: date })
  }

  const handleAddSymptom = () => {
    navigation.navigate('AddSymptomEntry', { defaultDate: date })
  }

  const renderEntry = ({ item }: { item: FoodEntry }) => {
    const mealInfo = getMealTypeInfo(item.meal_type)

    return (
      <TouchableOpacity onPress={() => handleEditFood(item)}>
        <Card style={styles.entryCard}>
          <View style={styles.entryContent}>
            <View style={styles.entryMainRow}>
              <Text style={styles.mealIcon}>{mealInfo.icon}</Text>
              <View style={styles.entryTextContainer}>
                <Text style={styles.foodName} numberOfLines={2}>
                  {item.food_name}
                </Text>
              </View>
              <IconButton
                icon="pencil-outline"
                size={20}
                iconColor={colors.primary[500]}
                onPress={() => handleEditFood(item)}
                style={styles.editButton}
              />
            </View>

            <View style={styles.entryDetails}>
              <Text style={styles.detailLabel}>時間：</Text>
              <Text style={styles.detailValue}>
                {format(new Date(item.consumed_at), 'HH:mm')}
              </Text>
            </View>

            {item.notes && (
              <View style={styles.entryNotes}>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  const renderSymptomEntry = ({ item }: { item: SymptomEntry }) => {
    const severityInfo = getSeverityInfo(item.severity)

    return (
      <TouchableOpacity onPress={() => handleEditSymptom(item)}>
        <Card style={styles.symptomCard}>
          <View style={styles.entryContent}>
            <View style={styles.entryMainRow}>
              <Text style={styles.severityIcon}>{severityInfo.icon}</Text>
              <View style={styles.entryTextContainer}>
                <Text style={styles.foodName} numberOfLines={2}>
                  {item.symptom_name}
                </Text>
                <Text style={[styles.severityLabel, { color: severityInfo.color }]}>
                  {severityInfo.label}
                </Text>
              </View>
              <IconButton
                icon="pencil-outline"
                size={20}
                iconColor={colors.primary[500]}
                onPress={() => handleEditSymptom(item)}
                style={styles.editButton}
              />
            </View>

            <View style={styles.entryDetails}>
              <Text style={styles.detailLabel}>時間：</Text>
              <Text style={styles.detailValue}>
                {format(new Date(item.recorded_at), 'HH:mm')}
              </Text>
            </View>

            {item.notes && (
              <View style={styles.entryNotes}>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  // Calculate day summary
  const daySummary = useMemo(() => {
    const totalCalories = dayEntries.reduce((sum, e) => sum + (e.calories || 0), 0)
    const mealBreakdown = {
      breakfast: dayEntries.filter(e => e.meal_type === 'breakfast').length,
      lunch: dayEntries.filter(e => e.meal_type === 'lunch').length,
      dinner: dayEntries.filter(e => e.meal_type === 'dinner').length,
      snack: dayEntries.filter(e => e.meal_type === 'snack').length,
    }
    return { totalCalories, mealBreakdown }
  }, [dayEntries])

  const renderHeader = () => {
    const dateObj = parseISO(`${date}T00:00:00`)
    const dateDisplay = format(dateObj, 'yyyy年MM月dd日 (E)', { locale: zhTW })

    return (
      <View style={styles.header}>
        <Text style={styles.title}>{dateDisplay}</Text>

        {/* Add buttons */}
        <View style={styles.addButtonsContainer}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddFood}>
            <IconButton icon="food-apple" size={20} iconColor={colors.primary[500]} />
            <Text style={styles.addButtonText}>新增飲食</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleAddSymptom}>
            <IconButton icon="medical-bag" size={20} iconColor={colors.primary[500]} />
            <Text style={styles.addButtonText}>新增症狀</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>飲食記錄</Text>
            <Text style={styles.summaryValue}>{dayEntries.length} 筆</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>症狀記錄</Text>
            <Text style={styles.summaryValue}>{symptomEntries.length} 筆</Text>
          </View>
          {daySummary.totalCalories > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>總熱量</Text>
              <Text style={styles.summaryValue}>{daySummary.totalCalories} kcal</Text>
            </View>
          )}
        </View>
        <View style={styles.mealSummaryContainer}>
          {daySummary.mealBreakdown.breakfast > 0 && (
            <View style={styles.mealSummaryItem}>
              <Text style={styles.mealSummaryIcon}>🌅</Text>
              <Text style={styles.mealSummaryText}>
                早餐 {daySummary.mealBreakdown.breakfast} 筆
              </Text>
            </View>
          )}
          {daySummary.mealBreakdown.lunch > 0 && (
            <View style={styles.mealSummaryItem}>
              <Text style={styles.mealSummaryIcon}>☀️</Text>
              <Text style={styles.mealSummaryText}>
                午餐 {daySummary.mealBreakdown.lunch} 筆
              </Text>
            </View>
          )}
          {daySummary.mealBreakdown.dinner > 0 && (
            <View style={styles.mealSummaryItem}>
              <Text style={styles.mealSummaryIcon}>🌙</Text>
              <Text style={styles.mealSummaryText}>
                晚餐 {daySummary.mealBreakdown.dinner} 筆
              </Text>
            </View>
          )}
          {daySummary.mealBreakdown.snack > 0 && (
            <View style={styles.mealSummaryItem}>
              <Text style={styles.mealSummaryIcon}>🍪</Text>
              <Text style={styles.mealSummaryText}>
                點心 {daySummary.mealBreakdown.snack} 筆
              </Text>
            </View>
          )}
        </View>
      </View>
    )
  }

  const renderSymptomSection = () => {
    if (symptomEntries.length === 0) return null

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>症狀記錄</Text>
        {symptomEntries.map((entry) => (
          <View key={entry.id}>
            {renderSymptomEntry({ item: entry })}
          </View>
        ))}
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={dayEntries}
        renderItem={renderEntry}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderSymptomSection}
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
    marginBottom: spacing.md,
  },
  addButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
    marginLeft: -spacing.xs,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  mealSummaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mealSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  mealSummaryIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  mealSummaryText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  entryCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    elevation: 1,
  },
  entryContent: {
    padding: spacing.md,
  },
  entryMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  mealIcon: {
    fontSize: 32,
    marginRight: spacing.sm,
    marginTop: spacing.xs / 2,
  },
  entryTextContainer: {
    flex: 1,
    marginRight: spacing.xs,
    paddingTop: spacing.xs / 2,
  },
  foodName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    lineHeight: typography.fontSize.lg * 1.3,
  },
  editButton: {
    margin: 0,
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
  },
  entryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 40,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.xs,
  },
  entryNotes: {
    marginTop: spacing.xs,
    marginLeft: 40,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    marginTop: spacing.xs,
  },
  sectionContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  symptomCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    elevation: 1,
  },
  severityIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  severityLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
})
