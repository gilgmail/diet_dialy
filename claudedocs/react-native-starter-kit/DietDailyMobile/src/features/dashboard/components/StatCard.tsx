import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Card } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { colors, typography, spacing } from '@/theme'

interface StatCardProps {
  icon: string
  iconColor?: string
  label: string
  value: string | number
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function StatCard({
  icon,
  iconColor = colors.primary[500],
  label,
  value,
  subtitle,
  trend,
}: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    switch (trend) {
      case 'up':
        return <Icon name="trending-up" size={16} color="#10B981" />
      case 'down':
        return <Icon name="trending-down" size={16} color="#EF4444" />
      case 'neutral':
        return <Icon name="minus" size={16} color={colors.text.secondary} />
    }
  }

  return (
    <Card style={styles.card}>
      <View style={styles.iconContainer}>
        <Icon name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value}</Text>
          {getTrendIcon()}
        </View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
})
