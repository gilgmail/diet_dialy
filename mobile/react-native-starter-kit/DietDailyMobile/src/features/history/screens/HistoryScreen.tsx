import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { format, addMonths, subMonths, isSameMonth } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { MonthCalendarView } from '../components/MonthCalendarView'
import { WeekCalendarView } from '../components/WeekCalendarView'
import { ListHistoryView } from '../components/ListHistoryView'
import { colors, typography, spacing } from '@/theme'

type ViewMode = 'month' | 'week' | 'list'

export function HistoryScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleMonthClick = () => {
    const now = new Date()
    if (!isSameMonth(currentMonth, now)) {
      setCurrentMonth(now)
    }
  }


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>歷史記錄</Text>
        <Text style={styles.headerSubtitle}>查看過去的飲食和症狀記錄</Text>
      </View>

      {/* Tab Bar for View Mode Selection */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'month' && styles.activeTab]}
          onPress={() => setViewMode('month')}
          activeOpacity={0.7}
        >
          <Icon
            name="calendar-month"
            size={20}
            color={viewMode === 'month' ? colors.primary[500] : colors.text.secondary}
          />
          <Text
            style={[styles.tabText, viewMode === 'month' && styles.activeTabText]}
          >
            月曆
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'week' && styles.activeTab]}
          onPress={() => setViewMode('week')}
          activeOpacity={0.7}
        >
          <Icon
            name="calendar-week"
            size={20}
            color={viewMode === 'week' ? colors.primary[500] : colors.text.secondary}
          />
          <Text
            style={[styles.tabText, viewMode === 'week' && styles.activeTabText]}
          >
            週曆
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'list' && styles.activeTab]}
          onPress={() => setViewMode('list')}
          activeOpacity={0.7}
        >
          <Icon
            name="format-list-bulleted"
            size={20}
            color={viewMode === 'list' ? colors.primary[500] : colors.text.secondary}
          />
          <Text
            style={[styles.tabText, viewMode === 'list' && styles.activeTabText]}
          >
            列表
          </Text>
        </TouchableOpacity>
      </View>

      {/* Month Navigation (only shown for month view) */}
      {viewMode === 'month' && (
        <View style={styles.monthNavBar}>
          <TouchableOpacity
            style={styles.navArrow}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
          >
            <Icon name="chevron-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.monthDisplay}
            onPress={handleMonthClick}
            activeOpacity={isSameMonth(currentMonth, new Date()) ? 1 : 0.6}
          >
            <Text style={[
              styles.monthText,
              !isSameMonth(currentMonth, new Date()) && styles.monthTextClickable
            ]}>
              {format(currentMonth, 'yyyy年MM月', { locale: zhTW })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navArrow}
            onPress={handleNextMonth}
            activeOpacity={0.7}
          >
            <Icon name="chevron-right" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Calendar/List Views */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {viewMode === 'month' && (
          <MonthCalendarView
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            currentMonth={currentMonth}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
  },
  monthNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  navArrow: {
    padding: spacing.sm,
  },
  monthDisplay: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  monthText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  monthTextClickable: {
    color: colors.primary[600],
    textDecorationLine: 'underline',
  },
  content: {
    flex: 1,
  },
})
