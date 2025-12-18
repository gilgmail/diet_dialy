import React, { useEffect, useState, useRef } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '@/shared/stores/authStore'
import { useSettingsStore } from '@/features/settings/stores/settingsStore'
import { AuthService } from '@/features/auth/services/AuthService'
import { DashboardService } from '@/features/dashboard/services/DashboardService'
import { NotificationService } from '@/features/settings/services/notificationService'
import { realtimeService } from '@/shared/services/realtimeService'
import { OnboardingScreen, ONBOARDING_STORAGE_KEY } from '@/features/onboarding/screens/OnboardingScreen'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'
import { colors } from '@/theme'
import type { NavigationContainerRef } from '@react-navigation/native'

export function RootNavigator() {
  const { user, isLoading } = useAuthStore()
  const { settings } = useSettingsStore()
  const queryClient = useQueryClient()
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null)
  const navigationRef = useRef<NavigationContainerRef<any>>(null)

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

  // Setup notification handlers
  useEffect(() => {
    // Handle notification received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[RootNavigator] Notification received:', notification)
    })

    // Handle notification tap
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data
      const type = data?.type as string

      console.log('[RootNavigator] Notification tapped:', type, data)

      if (!navigationRef.current) {
        console.warn('[RootNavigator] Navigation ref not ready')
        return
      }

      if (type === 'symptom-reminder') {
        navigationRef.current.navigate('AddSymptomEntry')
      } else if (type === 'bowel-reminder') {
        navigationRef.current.navigate('AddBowelMovement')
      } else if (type === 'backfill-reminder') {
        const date = data?.date as string
        if (date) {
          // Navigate to symptom entry with date parameter for backfill
          navigationRef.current.navigate('AddSymptomEntry', { date })
        } else {
          navigationRef.current.navigate('AddSymptomEntry')
        }
      }
    })

    return () => {
      notificationListener.remove()
      responseListener.remove()
    }
  }, [])

  // Schedule health reminders and check backfill on app start
  useEffect(() => {
    if (!user?.id || !settings.notificationsEnabled) {
      return
    }

    const setupReminders = async () => {
      try {
        // Schedule symptom reminder
        if (settings.symptomReminderEnabled) {
          await NotificationService.scheduleSymptomReminder(user.id)
        }

        // Schedule bowel reminder
        if (settings.bowelReminderEnabled) {
          await NotificationService.scheduleBowelReminder(user.id)
        }

        // Check for missing entries from yesterday
        if (settings.enableBackfillReminder) {
          await NotificationService.checkAndRemindBackfill(user.id)
        }
      } catch (error) {
        console.error('[RootNavigator] Error setting up reminders:', error)
      }
    }

    setupReminders()
  }, [user?.id, settings.notificationsEnabled, settings.symptomReminderEnabled, settings.bowelReminderEnabled, settings.enableBackfillReminder])

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
    <NavigationContainer ref={navigationRef}>
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
