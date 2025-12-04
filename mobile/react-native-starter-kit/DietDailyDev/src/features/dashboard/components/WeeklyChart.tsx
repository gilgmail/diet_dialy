import React from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { Card } from 'react-native-paper'
import { colors, typography, spacing } from '@/theme'
import type { DailyStats } from '../types'

interface WeeklyChartProps {
  data: DailyStats[]
  title: string
  dataKey: 'foodCount' | 'symptomCount' | 'totalCalories'
  color?: string
}

export function WeeklyChart({
  data,
  title,
  dataKey,
  color = colors.primary[500],
}: WeeklyChartProps) {
  const maxValue = Math.max(...data.map((d) => d[dataKey]), 1)
  const chartWidth = Dimensions.get('window').width - spacing.lg * 4

  const getDayLabel = (dateString: string) => {
    const date = new Date(dateString)
    const days = ['日', '一', '二', '三', '四', '五', '六']
    return days[date.getDay()]
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const barHeight = (item[dataKey] / maxValue) * 100
          return (
            <View key={index} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                {item[dataKey] > 0 && (
                  <Text style={styles.value}>{item[dataKey]}</Text>
                )}
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(barHeight, 5)}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.label}>{getDayLabel(item.date)}</Text>
            </View>
          )
        })}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barWrapper: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  value: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
})
