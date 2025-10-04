import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Button } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { DashboardScreen } from '@/features/dashboard/screens/DashboardScreen'
import { FoodDiaryScreen } from '@/features/food-diary/screens/FoodDiaryScreen'
import { FoodDayDetailScreen } from '@/features/food-diary/screens/FoodDayDetailScreen'
import { AddFoodEntryScreen } from '@/features/food-diary/screens/AddFoodEntryScreen'
import { SymptomDiaryScreen } from '@/features/symptom-diary/screens/SymptomDiaryScreen'
import { AddSymptomEntryScreen } from '@/features/symptom-diary/screens/AddSymptomEntryScreen'
import { HomeScreen } from '@/features/home/screens/HomeScreen'
import { colors, typography, spacing } from '@/theme'
import type { MainStackParamList, MainTabParamList } from './types'

const Stack = createNativeStackNavigator<MainStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()



// Profile Screen with Dashboard embedded and logout at top
function ProfileScreen() {
  const { user, signOut } = useAuth()

  return (
    <View style={styles.profileContainer}>
      <View style={styles.profileHeader}>
        <View style={styles.profileHeaderLeft}>
          <Text style={styles.profileTitle}>我的</Text>
          <Text style={styles.profileSubtitle}>
            {user?.name || user?.email || '使用者'}
          </Text>
        </View>
        <Button
          mode="outlined"
          onPress={signOut}
          style={styles.logoutButton}
          labelStyle={styles.logoutButtonLabel}
          icon="logout"
          compact
        >
          登出
        </Button>
      </View>
      <DashboardScreen hideHeader={true} />
    </View>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: '新增',
          tabBarIcon: ({ color, size }) => (
            <Icon name="plus-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FoodDiary"
        component={FoodDiaryScreen}
        options={{
          tabBarLabel: '飲食',
          tabBarIcon: ({ color, size }) => (
            <Icon name="food-apple-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Symptoms"
        component={SymptomDiaryScreen}
        options={{
          tabBarLabel: '症狀',
          tabBarIcon: ({ color, size }) => (
            <Icon name="medical-bag" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '我的',
          tabBarIcon: ({ color, size}) => (
            <Icon name="account-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

export function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="AddFoodEntry"
        component={AddFoodEntryScreen}
        options={{
          headerShown: true,
          title: '新增飲食記錄',
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text.primary,
        }}
      />
      <Stack.Screen
        name="AddSymptomEntry"
        component={AddSymptomEntryScreen}
        options={{
          headerShown: true,
          title: '新增症狀記錄',
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text.primary,
        }}
      />
      <Stack.Screen
        name="FoodDayDetail"
        component={FoodDayDetailScreen}
        options={{
          headerShown: true,
          title: '每日詳情',
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text.primary,
        }}
      />
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileHeaderLeft: {
    flex: 1,
  },
  profileTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  profileSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  logoutButton: {
    borderColor: colors.error,
    borderRadius: 8,
  },
  logoutButtonLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  info: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
    marginBottom: spacing['3xl'],
    textAlign: 'center',
  },
  button: {
    borderColor: colors.border,
    borderRadius: 12,
    minWidth: 200,
  },
  buttonLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
})
