import React from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import { colors, spacing } from '@/theme'

/**
 * Dashboard 載入骨架 UI
 * 模擬實際內容的結構和佈局，提升使用者體驗
 */
export function DashboardSkeleton() {
  const pulseAnim = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  })

  return (
    <View style={styles.container}>
      {/* Quick Stats */}
      <View style={styles.section}>
        <View style={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <Animated.View key={i} style={[styles.statBox, { opacity }]} />
          ))}
        </View>
      </View>

      {/* Weekly Charts */}
      <View style={styles.section}>
        <Animated.View style={[styles.skeletonTitle, { opacity }]} />
        <Animated.View style={[styles.chartBox, { opacity }]} />
        <Animated.View style={[styles.chartBox, { opacity }]} />
      </View>

      {/* Health Insights */}
      <View style={styles.section}>
        <Animated.View style={[styles.skeletonTitle, { opacity }]} />
        {[1, 2].map((i) => (
          <Animated.View key={i} style={[styles.insightBox, { opacity }]} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    padding: spacing.lg,
  },
  skeletonTitle: {
    height: 24,
    width: '40%',
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  statBox: {
    width: '48%',
    height: 80,
    backgroundColor: colors.border,
    borderRadius: 8,
  },
  chartBox: {
    height: 200,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  insightBox: {
    height: 100,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
})
