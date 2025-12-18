import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { colors, typography, spacing } from '@/theme'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width } = Dimensions.get('window')

const ONBOARDING_STORAGE_KEY = '@onboarding_completed'

interface OnboardingPage {
  icon: string
  title: string
  description: string
}

const ONBOARDING_PAGES: OnboardingPage[] = [
  {
    icon: 'food-apple',
    title: '記錄飲食',
    description: '快速記錄每天的飲食，追蹤食物與症狀的關聯性',
  },
  {
    icon: 'medical-bag',
    title: '追蹤症狀',
    description: '記錄腹痛、腹瀉等症狀，幫助了解身體狀況',
  },
  {
    icon: 'toilet',
    title: '排便記錄',
    description: '使用 Bristol Scale 快速記錄排便狀況',
  },
  {
    icon: 'chart-line',
    title: '健康洞察',
    description: '透過數據分析，找出飲食與症狀的關聯模式',
  },
]

interface OnboardingScreenProps {
  onComplete: () => void
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentPage, setCurrentPage] = useState(0)

  const handleNext = () => {
    if (currentPage < ONBOARDING_PAGES.length - 1) {
      setCurrentPage(currentPage + 1)
    } else {
      handleComplete()
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
      onComplete()
    } catch (error) {
      console.error('[Onboarding] Failed to save completion:', error)
      onComplete() // Continue anyway
    }
  }

  const currentPageData = ONBOARDING_PAGES[currentPage]
  const isLastPage = currentPage === ONBOARDING_PAGES.length - 1

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {!isLastPage && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.skipButtonText}>跳過</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        pagingEnabled
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
      >
        {ONBOARDING_PAGES.map((page, index) => (
          <View key={index} style={styles.page}>
            <View style={styles.iconContainer}>
              <Icon name={page.icon} size={80} color={colors.primary[500]} />
            </View>
            <Text style={styles.title}>{page.title}</Text>
            <Text style={styles.description}>{page.description}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {/* Page Indicators */}
        <View style={styles.indicators}>
          {ONBOARDING_PAGES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentPage && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {currentPage > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentPage(currentPage - 1)}
            >
              <Icon name="chevron-left" size={24} color={colors.primary[500]} />
              <Text style={styles.backButtonText}>上一步</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextButton,
              isLastPage && styles.nextButtonPrimary,
            ]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.nextButtonText,
                isLastPage && styles.nextButtonTextPrimary,
              ]}
            >
              {isLastPage ? '開始使用' : '下一步'}
            </Text>
            {!isLastPage && (
              <Icon name="chevron-right" size={24} color={colors.text.inverse} />
            )}
          </TouchableOpacity>
        </View>
      </View>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['3xl'],
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: colors.primary[500],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    gap: spacing.xs,
    minHeight: 56,
  },
  nextButtonPrimary: {
    backgroundColor: colors.primary[600],
  },
  nextButtonText: {
    fontSize: typography.fontSize.lg,
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.bold,
  },
  nextButtonTextPrimary: {
    fontSize: typography.fontSize.xl,
  },
})

// Export storage key for checking completion
export { ONBOARDING_STORAGE_KEY }


