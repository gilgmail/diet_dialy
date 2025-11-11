import React, { useState } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
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

// Tab Bar Styles
const tabBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    height: 65,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  addButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    marginTop: -20,
  },
  addButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 80,
  },
  quickAddMenu: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    width: '80%',
    maxWidth: 300,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickAddItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.md,
  },
  quickAddFood: {
    backgroundColor: colors.success + '10',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  quickAddSymptom: {
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  quickAddText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
})

// Custom Tab Bar with middle + button
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const mainNavigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()

  const handleAddFood = () => {
    setShowQuickAdd(false)
    mainNavigation.navigate('AddFoodEntry', { date: undefined })
  }

  const handleAddSymptom = () => {
    setShowQuickAdd(false)
    mainNavigation.navigate('AddSymptomEntry', { date: undefined })
  }

  return (
    <>
      <View style={tabBarStyles.container}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const label = typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name
          const isFocused = state.index === index

          // Insert middle + button after second tab (History)
          if (index === 2) {
            return (
              <React.Fragment key={`${route.key}-with-add`}>
                {/* Middle + Button */}
                <TouchableOpacity
                  style={tabBarStyles.addButton}
                  onPress={() => setShowQuickAdd(true)}
                  activeOpacity={0.7}
                >
                  <View style={tabBarStyles.addButtonCircle}>
                    <Icon name="plus" size={32} color={colors.white} />
                  </View>
                </TouchableOpacity>

                {/* Regular tab */}
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  onPress={() => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    })

                    if (!isFocused && !event.defaultPrevented) {
                      navigation.navigate(route.name)
                    }
                  }}
                  style={tabBarStyles.tab}
                >
                  {options.tabBarIcon?.({
                    focused: isFocused,
                    color: isFocused ? colors.primary[500] : colors.text.secondary,
                    size: 24,
                  })}
                  <Text
                    style={[
                      tabBarStyles.label,
                      { color: isFocused ? colors.primary[500] : colors.text.secondary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            )
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name)
                }
              }}
              style={tabBarStyles.tab}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? colors.primary[500] : colors.text.secondary,
                size: 24,
              })}
              <Text
                style={[
                  tabBarStyles.label,
                  { color: isFocused ? colors.primary[500] : colors.text.secondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Quick Add Modal */}
      <Modal
        visible={showQuickAdd}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickAdd(false)}
      >
        <Pressable
          style={tabBarStyles.modalOverlay}
          onPress={() => setShowQuickAdd(false)}
        >
          <View style={tabBarStyles.quickAddMenu}>
            <TouchableOpacity
              style={[tabBarStyles.quickAddItem, tabBarStyles.quickAddFood]}
              onPress={handleAddFood}
              activeOpacity={0.7}
            >
              <Icon name="food-apple" size={24} color={colors.success} />
              <Text style={tabBarStyles.quickAddText}>新增飲食</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[tabBarStyles.quickAddItem, tabBarStyles.quickAddSymptom]}
              onPress={handleAddSymptom}
              activeOpacity={0.7}
            >
              <Icon name="medical-bag" size={24} color={colors.error} />
              <Text style={tabBarStyles.quickAddText}>新增症狀</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

// Removed ProfileScreen - functionality split between InsightsScreen and SettingsScreen

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.text.secondary,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
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
