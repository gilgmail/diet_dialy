import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { SegmentedButtons } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { MainStackParamList } from '@/app/navigation/types'
import { MonthCalendarView } from '../components/MonthCalendarView'
import { WeekCalendarView } from '../components/WeekCalendarView'
import { ListHistoryView } from '../components/ListHistoryView'
import { colors, typography, spacing } from '@/theme'

type ViewMode = 'month' | 'week' | 'list'

export function HistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Always add to today
  const addButtonLabel = '新增今天記錄'

  const handleAddFood = () => {
    navigation.navigate('AddFoodEntry', {
      date: undefined, // Always use today's date
    })
  }

  const handleAddSymptom = () => {
    navigation.navigate('AddSymptomEntry', {
      date: undefined, // Always use today's date
    })
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>歷史記錄</Text>
        <Text style={styles.headerSubtitle}>查看過去的飲食和症狀記錄</Text>
      </View>

      {/* View Mode Switcher */}
      <View style={styles.viewSwitcherContainer}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ViewMode)}
          buttons={[
            {
              value: 'month',
              label: '月',
              icon: 'calendar-month',
            },
            {
              value: 'week',
              label: '週',
              icon: 'calendar-week',
            },
            {
              value: 'list',
              label: '列表',
              icon: 'format-list-bulleted',
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Context-Aware Add Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddFood}
          activeOpacity={0.7}
        >
          <Icon name="food-apple" size={20} color={colors.success} />
          <Text style={styles.addButtonText}>{addButtonLabel}</Text>
          <Icon name="plus-circle" size={20} color={colors.success} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, styles.addSymptomButton]}
          onPress={handleAddSymptom}
          activeOpacity={0.7}
        >
          <Icon name="medical-bag" size={20} color={colors.error} />
          <Text style={styles.addButtonText}>{addButtonLabel}</Text>
          <Icon name="plus-circle" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Calendar/List Views */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {viewMode === 'month' && (
          <MonthCalendarView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        )}
        {viewMode === 'week' && (
          <WeekCalendarView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        )}
        {viewMode === 'list' && (
          <ListHistoryView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        )}
      </ScrollView>
    </View>
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
  viewSwitcherContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentedButtons: {
    backgroundColor: colors.background,
  },
  addButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.success + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success + '30',
    gap: spacing.xs,
  },
  addSymptomButton: {
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '30',
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
})
