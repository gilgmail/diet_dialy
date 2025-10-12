import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Card } from 'react-native-paper'
import { colors, typography, spacing } from '@/theme'
import type { HealthInsight } from '../types'

interface InsightCardProps {
  insight: HealthInsight
}

export function InsightCard({ insight }: InsightCardProps) {
  const getBackgroundColor = () => {
    switch (insight.type) {
      case 'positive':
        return '#10B98120'
      case 'warning':
        return '#F59E0B20'
      case 'info':
        return colors.primary[50]
    }
  }

  const getBorderColor = () => {
    switch (insight.type) {
      case 'positive':
        return '#10B981'
      case 'warning':
        return '#F59E0B'
      case 'info':
        return colors.primary[500]
    }
  }

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: getBackgroundColor(),
          borderLeftColor: getBorderColor(),
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{insight.icon}</Text>
        <Text style={styles.title}>{insight.title}</Text>
      </View>
      <Text style={styles.description}>{insight.description}</Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
})
