import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { DashboardScreen } from '@/features/dashboard/screens/DashboardScreen'
import { ReportDetailScreen } from '@/features/dashboard/screens/ReportDetailScreen'
import { FoodDayDetailScreen } from '@/features/food-diary/screens/FoodDayDetailScreen'
import { AddFoodEntryScreen } from '@/features/food-diary/screens/AddFoodEntryScreen'
import { AddSymptomEntryScreen } from '@/features/symptom-diary/screens/AddSymptomEntryScreen'
import { TodayScreen } from '@/features/today/screens/TodayScreen'
import { HistoryScreen } from '@/features/history/screens/HistoryScreen'
import { InsightsScreen } from '@/features/insights/screens/InsightsScreen'
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen'
import { colors, typography, spacing } from '@/theme'
import type { MainStackParamList, MainTabParamList } from './types'

const Stack = createNativeStackNavigator<MainStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()



// Removed ProfileScreen - functionality split between InsightsScreen and SettingsScreen

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
      initialRouteName="Today"
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarLabel: '今日',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-today" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: '歷史',
          tabBarIcon: ({ color, size }) => (
            <Icon name="history" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          tabBarLabel: '洞察',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chart-line" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '設定',
          tabBarIcon: ({ color, size}) => (
            <Icon name="cog-outline" size={size} color={color} />
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
      <Stack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{
          headerShown: true,
          title: 'AI 分析報告',
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
  // Styles removed - no longer needed after navigation restructure
})
