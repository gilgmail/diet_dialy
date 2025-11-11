import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { Menu } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { format, addMonths, subMonths } from 'date-fns'
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
  const [monthMenuVisible, setMonthMenuVisible] = useState(false)
  const [viewMenuVisible, setViewMenuVisible] = useState(false)

  const viewModeLabels = {
    month: '月曆',
    week: '週曆',
    list: '列表',
  }

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleToday = () => {
    setCurrentMonth(new Date())
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>歷史記錄</Text>
        <Text style={styles.headerSubtitle}>查看過去的飲食和症狀記錄</Text>
      </View>

      {/* Navigation Bar */}
      <View style={styles.navBar}>
        {/* Left: Month Navigation */}
        <View style={styles.monthNavContainer}>
          <TouchableOpacity
            style={styles.navArrow}
            onPress={handlePrevMonth}
            activeOpacity={0.7}
          >
            <Icon name="chevron-left" size={20} color={colors.text.primary} />
          </TouchableOpacity>

          <Menu
            visible={monthMenuVisible}
            onDismiss={() => setMonthMenuVisible(false)}
            anchor={
              <TouchableOpacity
                style={styles.monthButton}
                onPress={() => setMonthMenuVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.monthText}>
                  {format(currentMonth, 'yyyy年MM月', { locale: zhTW })}
                </Text>
                <Icon name="menu-down" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            }
          >
            <Menu.Item onPress={handleToday} title="回到今天" />
          </Menu>

          <TouchableOpacity
            style={styles.navArrow}
            onPress={handleNextMonth}
            activeOpacity={0.7}
          >
            <Icon name="chevron-right" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Right: View Mode Selector */}
        <Menu
          visible={viewMenuVisible}
          onDismiss={() => setViewMenuVisible(false)}
          anchor={
            <TouchableOpacity
              style={styles.viewModeButton}
              onPress={() => setViewMenuVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewModeText}>{viewModeLabels[viewMode]}</Text>
              <Icon name="menu-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          }
        >
          <Menu.Item
            onPress={() => {
              setViewMode('month')
              setViewMenuVisible(false)
            }}
            title="月曆"
            leadingIcon="calendar-month"
          />
          <Menu.Item
            onPress={() => {
              setViewMode('week')
              setViewMenuVisible(false)
            }}
            title="週曆"
            leadingIcon="calendar-week"
          />
          <Menu.Item
            onPress={() => {
              setViewMode('list')
              setViewMenuVisible(false)
            }}
            title="列表"
            leadingIcon="format-list-bulleted"
          />
        </Menu>
      </View>

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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navArrow: {
    padding: spacing.xs,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  monthText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: colors.background,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewModeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
})
