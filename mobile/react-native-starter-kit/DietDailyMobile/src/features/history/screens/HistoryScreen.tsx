import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { SegmentedButtons } from 'react-native-paper'
import { MonthCalendarView } from '../components/MonthCalendarView'
import { WeekCalendarView } from '../components/WeekCalendarView'
import { ListHistoryView } from '../components/ListHistoryView'
import { colors, typography, spacing } from '@/theme'

type ViewMode = 'month' | 'week' | 'list'

export function HistoryScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

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
  content: {
    flex: 1,
  },
})
