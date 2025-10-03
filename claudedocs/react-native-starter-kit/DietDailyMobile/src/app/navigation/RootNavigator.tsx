import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useAuthStore } from '@/shared/stores/authStore'
import { AuthService } from '@/features/auth/services/AuthService'
import { AuthNavigator } from './AuthNavigator'
import { MainNavigator } from './MainNavigator'
import { colors } from '@/theme'

export function RootNavigator() {
  const { user, isLoading } = useAuthStore()

  // Initialize auth listener on mount
  useEffect(() => {
    AuthService.initAuthListener()
  }, [])

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
