import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '@/shared/stores/authStore'
import { AuthService } from '@/features/auth/services/AuthService'
import { DashboardService } from '@/features/dashboard/services/DashboardService'
import { realtimeService } from '@/shared/services/realtimeService'
import { OnboardingScreen, ONBOARDING_STORAGE_KEY } from '@/features/onboarding/screens/OnboardingScreen'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'
import { colors } from '@/theme'

export function RootNavigator() {
  const { user, isLoading } = useAuthStore()
  const queryClient = useQueryClient()
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null)

  // Check onboarding status
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
        setShowOnboarding(completed !== 'true' && !!user)
      } catch (error) {
        console.error('[RootNavigator] Failed to check onboarding:', error)
        setShowOnboarding(false)
      }
    }

    if (user && !isLoading) {
      checkOnboarding()
    } else {
      setShowOnboarding(false)
    }
  }, [user, isLoading])

  // Initialize auth listener on mount
  useEffect(() => {
    AuthService.initAuthListener()
  }, [])

  // Initialize global realtime subscriptions after login
  useEffect(() => {
    if (!user?.id) {
      // Cleanup subscriptions when user logs out
      realtimeService.cleanup()
      return
    }

    console.log('[RootNavigator] Initializing realtime service for user:', user.id)
    
    // Initialize realtime subscriptions for all tables
    realtimeService.initialize(user.id, {
      onFoodEntryChange: () => {
        console.log('[RootNavigator] Food entry changed, cache invalidated')
      },
      onSymptomEntryChange: () => {
        console.log('[RootNavigator] Symptom entry changed, cache invalidated')
      },
      onBowelEntryChange: () => {
        console.log('[RootNavigator] Bowel entry changed, cache invalidated')
      },
    })

    return () => {
      // Cleanup on unmount or user change
      realtimeService.cleanup()
    }
  }, [user?.id])

  // Warm up Dashboard query cache after login
  useEffect(() => {
    if (!user?.id) {
      return
    }

    let isActive = true
    const prefetch = async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: ['dashboard', user.id],
          queryFn: async () => {
            const result = await DashboardService.getDashboardData(user.id)
            if (result.error || !result.data) {
              throw new Error(result.error?.message ?? 'Failed to prefetch dashboard data')
            }
            return result.data
          },
          staleTime: 1000 * 60 * 10,
          gcTime: 1000 * 60 * 30,
        })
        console.log('[RootNavigator] Dashboard prefetch completed')
      } catch (error) {
        if (isActive) {
          console.warn('[RootNavigator] Dashboard prefetch failed:', error)
        }
      }
    }

    prefetch()

    return () => {
      isActive = false
    }
  }, [user?.id, queryClient])

  if (isLoading || showOnboarding === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    )
  }

  // Show onboarding for first-time users
  if (showOnboarding && user) {
    return (
      <OnboardingScreen
        onComplete={() => setShowOnboarding(false)}
      />
    )
  }

  return (
    <NavigationContainer>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
})
