import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Card } from 'react-native-paper'
import { colors, typography, spacing } from '@/theme'

interface DistributionItem {
  label: string
  value: number
  color: string
  icon?: string
}

interface DistributionChartProps {
  title: string
  data: DistributionItem[]
}

export function DistributionChart({ title, data }: DistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {/* Horizontal Bar */}
      <View style={styles.barContainer}>
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0
          if (percentage === 0) return null

          return (
            <View
              key={index}
              style={[
                styles.barSegment,
                {
                  width: `${percentage}%`,
                  backgroundColor: item.color,
                  borderTopLeftRadius: index === 0 ? 8 : 0,
                  borderBottomLeftRadius: index === 0 ? 8 : 0,
                  borderTopRightRadius: index === data.length - 1 ? 8 : 0,
                  borderBottomRightRadius: index === data.length - 1 ? 8 : 0,
                },
              ]}
            />
          )
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {data.map((item, index) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0

          return (
            <View key={index} style={styles.legendItem}>
              <View style={styles.legendLeft}>
                <View
                  style={[styles.legendColor, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendLabel}>
                  {item.icon} {item.label}
                </Text>
              </View>
              <View style={styles.legendRight}>
                <Text style={styles.legendValue}>{item.value}</Text>
                {percentage > 0 && (
                  <Text style={styles.legendPercentage}>({percentage}%)</Text>
                )}
              </View>
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
  barContainer: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  barSegment: {
    height: '100%',
  },
  legend: {
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  legendPercentage: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
})
