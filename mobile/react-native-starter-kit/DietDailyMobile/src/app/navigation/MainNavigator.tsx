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
import { FoodDiaryScreen } from '@/features/food-diary/screens/FoodDiaryScreen'
import { FoodDayDetailScreen } from '@/features/food-diary/screens/FoodDayDetailScreen'
import { AddFoodEntryScreen } from '@/features/food-diary/screens/AddFoodEntryScreen'
import { SymptomDiaryScreen } from '@/features/symptom-diary/screens/SymptomDiaryScreen'
import { AddSymptomEntryScreen } from '@/features/symptom-diary/screens/AddSymptomEntryScreen'
import { HomeScreen } from '@/features/home/screens/HomeScreen'
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen'
import { colors, typography, spacing } from '@/theme'
import type { MainStackParamList, MainTabParamList } from './types'

const Stack = createNativeStackNavigator<MainStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()



// Profile Screen with Dashboard embedded and logout at top
function ProfileScreen() {
  const { user, signOut } = useAuth()
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const canGoBack = navigation.canGoBack()

  return (
    <View style={styles.profileContainer}>
      <View style={styles.profileHeader}>
        <View style={styles.profileHeaderLeft}>
          <Text style={styles.profileTitle}>我的</Text>
          <Text style={styles.profileSubtitle}>
            {user?.name || user?.email || '使用者'}
          </Text>
        </View>
        <View style={styles.profileSpacer} />
      </View>
      <View style={styles.profileActionsBar}>
        {canGoBack ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Icon name='arrow-left' size={20} color={colors.text.primary} />
            <Text style={styles.actionButtonLabel}>回上一頁</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
        >
          <Icon name="cog-outline" size={20} color={colors.text.primary} />
          <Text style={styles.actionButtonLabel}>設定</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.logoutActionButton]}
          onPress={signOut}
          accessibilityRole="button"
        >
          <Icon name="logout" size={20} color={colors.error} />
          <Text style={[styles.actionButtonLabel, styles.logoutActionLabel]}>登出</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.dashboardWrapper}>
        <DashboardScreen hideHeader={true} />
      </View>
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
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          title: '設定',
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
  dashboardWrapper: {
    flex: 1,
  },
  profileHeaderLeft: {
    flex: 1,
  },
  profileSpacer: {
    width: 1,
    height: 1,
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
  profileActionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  logoutActionButton: {
    backgroundColor: colors.background,
    borderColor: colors.error,
  },
  logoutActionLabel: {
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
