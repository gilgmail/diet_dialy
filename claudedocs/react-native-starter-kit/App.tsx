import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PaperProvider } from 'react-native-paper'
import { NavigationContainer } from '@react-navigation/native'
import { View, Text, StyleSheet } from 'react-native'
import { colors, typography } from './src/theme'

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
})

// Temporary placeholder screen
function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diet Daily Mobile</Text>
      <Text style={styles.subtitle}>React Native 應用已成功初始化！</Text>
      <Text style={styles.info}>下一步：實施認證模組</Text>
    </View>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <PaperProvider>
          <NavigationContainer>
            <HomeScreen />
            <StatusBar style="auto" />
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  info: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
    textAlign: 'center',
  },
})
