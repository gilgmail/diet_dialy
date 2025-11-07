import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/shared/stores/authStore'
import { AuthService } from '@/features/auth/services/AuthService'
import { DashboardService } from '@/features/dashboard/services/DashboardService'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'
import { colors } from '@/theme'

export function RootNavigator() {
  const { user, isLoading } = useAuthStore()
  const queryClient = useQueryClient()

  // Initialize auth listener on mount
  useEffect(() => {
    AuthService.initAuthListener()
  }, [])

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
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
