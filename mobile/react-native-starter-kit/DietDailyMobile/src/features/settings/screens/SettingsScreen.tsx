import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import Constants from 'expo-constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSettingsStore } from '../stores/settingsStore'
import { NotificationService } from '../services/notificationService'
import { CHRONIC_DISEASES, TIMEZONES, COMMON_ALLERGENS } from '../types'
import { colors, typography, spacing } from '@/theme'
import type { MainStackParamList } from '@/app/navigation/types'

const MEAL_NAMES: Record<'breakfast' | 'lunch' | 'dinner', string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>()
  const { user } = useAuth()
  const { settings, isLoading, initializeSettings, updateSettings, subscribeToChanges } = useSettingsStore()
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled)
  const currentTimezone = useMemo(
    () => TIMEZONES.find((tz) => tz.value === settings.timezone),
    [settings.timezone]
  )
  const currentDisease = useMemo(
    () =>
      settings.chronicDisease
        ? CHRONIC_DISEASES.find((d) => d.value === settings.chronicDisease) ?? null
        : null,
    [settings.chronicDisease]
  )
  const currentAllergiesLabel = useMemo(() => {
    if (!settings.knownAllergies.length) return '未設定'
    const preview = settings.knownAllergies.slice(0, 3).join('、')
    const suffix = settings.knownAllergies.length > 3 ? ` 等 ${settings.knownAllergies.length} 項` : ''
    return `${preview}${suffix}`
  }, [settings.knownAllergies])

  useEffect(() => {
    if (!user?.id) return

    // Initialize settings from Supabase
    initializeSettings(user.id)

    // Subscribe to real-time changes
    const unsubscribe = subscribeToChanges(user.id)

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user?.id])

  useEffect(() => {
    setNotificationsEnabled(settings.notificationsEnabled)
  }, [settings.notificationsEnabled])

  useEffect(() => {
    if (!settings.notificationsEnabled) {
      NotificationService.cancelAllMealReminders()
    }
  }, [settings.notificationsEnabled])

  const handleToggleNotifications = async (value: boolean) => {
    if (!user?.id) return

    if (value) {
      setNotificationsEnabled(true)
      const hasPermission = await NotificationService.requestPermissions()
      if (!hasPermission) {
        Alert.alert(
          '權限不足',
          '請在設定中開啟通知權限以使用提醒功能。',
          [
            { text: '取消', style: 'cancel' },
            { text: '前往設定', onPress: () => Linking.openSettings() },
          ]
        )
        setNotificationsEnabled(false)
        return
      }
      updateSettings(user.id, { notificationsEnabled: true })
      await NotificationService.scheduleMealReminders(settings.mealReminders, {
        force: true,
      })
      Alert.alert('成功', '用餐提醒已啟用')
    } else {
      setNotificationsEnabled(false)
      updateSettings(user.id, { notificationsEnabled: false })
      await NotificationService.cancelAllMealReminders()
      Alert.alert('成功', '用餐提醒已關閉')
    }
  }

  const handleChangeTimezone = () => {
    if (!user?.id) return

    Alert.alert(
      '選擇時區',
      '',
      TIMEZONES.map((tz) => ({
        text: tz.label,
        onPress: () => {
          updateSettings(user.id, { timezone: tz.value, timezoneOffset: tz.offset })
          Alert.alert('成功', `時區已變更為 ${tz.label}`)
        },
      })).concat({ text: '取消', style: 'cancel' })
    )
  }

  const handleChangeDisease = () => {
    if (!user?.id) return

    const options = CHRONIC_DISEASES.map((disease) => ({
      text: disease.label,
      onPress: () => {
        updateSettings(user.id, { chronicDisease: disease.value })
        Alert.alert('成功', `慢性病設定已更新為 ${disease.label}`)
      },
    }))

    // Add "None" option
    options.push({
      text: '無',
      onPress: () => {
        updateSettings(user.id, { chronicDisease: null })
        Alert.alert('成功', '已清除慢性病設定')
      },
    })

    options.push({ text: '取消', style: 'cancel' } as any)

    Alert.alert('選擇慢性病', '', options)
  }

  const handleManageAllergies = () => {
    if (!user?.id) return

    // Show current allergies with option to remove
    const currentAllergies = settings.knownAllergies
    const availableAllergens = COMMON_ALLERGENS.filter(a => !currentAllergies.includes(a))

    if (currentAllergies.length === 0 && availableAllergens.length === 0) {
      Alert.alert('提示', '所有常見過敏原已選擇')
      return
    }

    // Create options: current allergies (with ✓), available allergens, custom input
    const options: any[] = []

    // Show selected allergies first
    if (currentAllergies.length > 0) {
      currentAllergies.forEach(allergen => {
        options.push({
          text: `✓ ${allergen} (點擊移除)`,
          onPress: () => {
            const newAllergies = currentAllergies.filter(a => a !== allergen)
            updateSettings(user.id, { knownAllergies: newAllergies })
            Alert.alert('成功', `已移除過敏原：${allergen}`)
          },
        })
      })
    }

    // Show available allergens
    availableAllergens.forEach(allergen => {
      options.push({
        text: allergen,
        onPress: () => {
          const newAllergies = [...currentAllergies, allergen]
          updateSettings(user.id, { knownAllergies: newAllergies })
        },
      })
    })

    // Add custom allergen option
    options.push({
      text: '+ 自訂過敏原',
      onPress: () => {
        Alert.prompt(
          '自訂過敏原',
          '請輸入過敏原名稱',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '新增',
              onPress: (customAllergen) => {
                if (!customAllergen || !user?.id) return
                const trimmed = customAllergen.trim()
                if (!trimmed) return
                if (currentAllergies.includes(trimmed)) {
                  Alert.alert('提示', '此過敏原已存在')
                  return
                }
                const newAllergies = [...currentAllergies, trimmed]
                updateSettings(user.id, { knownAllergies: newAllergies })
              },
            },
          ],
          'plain-text'
        )
      },
    })

    options.push({ text: '完成', style: 'cancel' })

    Alert.alert('管理已知過敏原', currentAllergies.length > 0 ? '已選擇的過敏原可點擊移除' : '', options)
  }

  const handleChangeMealTime = (meal: 'breakfast' | 'lunch' | 'dinner') => {
    if (!user?.id) return

    const mealNames = MEAL_NAMES

    Alert.prompt(
      `設定${mealNames[meal]}提醒時間`,
      '請輸入時間 (格式: HH:mm，例如: 08:00)',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確認',
          onPress: async (time) => {
            if (!time || !user?.id) return

            // Validate time format
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
            if (!timeRegex.test(time)) {
              Alert.alert('格式錯誤', '請輸入正確的時間格式 (HH:mm)')
              return
            }

            const newReminders = {
              ...settings.mealReminders,
              [meal]: time,
            }
            updateSettings(user.id, { mealReminders: newReminders })

            // Reschedule notifications if enabled
            if (settings.notificationsEnabled) {
              await NotificationService.scheduleMealReminders(newReminders, {
                force: true,
                meals: [meal],
              })
            }

            Alert.alert('成功', `${mealNames[meal]}提醒時間已設定為 ${time}`)
          },
        },
      ],
      'plain-text',
      settings.mealReminders[meal]
    )
  }

  const handleSendBugReport = () => {
    const email = 'gilko0725@gmail.com'
    const subject = 'DietDaily Bug Report'
    const body = `
版本: ${Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'N/A'}
Build: ${Platform.OS === 'ios'
  ? Constants.expoConfig?.ios?.buildNumber ?? Constants.nativeBuildVersion
  : Constants.expoConfig?.android?.versionCode ?? Constants.nativeBuildVersion} (${Platform.OS})
Device: ${Platform.OS} ${Platform.Version}

請描述您遇到的問題:

    `

    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    Linking.openURL(mailto).catch(() => {
      Alert.alert('錯誤', '無法開啟郵件應用程式')
    })
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>載入設定中...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>提醒設定</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Icon name="bell-outline" size={24} color={colors.primary[500]} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>用餐提醒</Text>
              <Text style={styles.settingDescription}>
                {notificationsEnabled ? '已啟用' : '已關閉'}
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: colors.border, true: colors.primary[300] }}
            thumbColor={notificationsEnabled ? colors.primary[500] : colors.text.disabled}
          />
        </View>

        {notificationsEnabled && (
          <>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => handleChangeMealTime('breakfast')}
            >
              <View style={styles.settingInfo}>
                <Icon name="weather-sunset-up" size={24} color={colors.warning} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>早餐提醒</Text>
                  <Text style={styles.settingDescription}>{settings.mealReminders.breakfast}</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => handleChangeMealTime('lunch')}
            >
              <View style={styles.settingInfo}>
                <Icon name="weather-sunny" size={24} color={colors.success} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>午餐提醒</Text>
                  <Text style={styles.settingDescription}>{settings.mealReminders.lunch}</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => handleChangeMealTime('dinner')}
            >
              <View style={styles.settingInfo}>
                <Icon name="weather-night" size={24} color={colors.primary[500]} />
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingLabel}>晚餐提醒</Text>
                  <Text style={styles.settingDescription}>{settings.mealReminders.dinner}</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Regional Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>地區設定</Text>

        <TouchableOpacity style={styles.settingRow} onPress={handleChangeTimezone}>
          <View style={styles.settingInfo}>
            <Icon name="earth" size={24} color={colors.primary[500]} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>時區</Text>
              <Text style={styles.settingDescription}>{currentTimezone?.label}</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Health Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>健康設定</Text>

        <TouchableOpacity style={styles.settingRow} onPress={handleChangeDisease}>
          <View style={styles.settingInfo}>
            <Icon name="medical-bag" size={24} color={colors.primary[500]} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>慢性病類型</Text>
              <Text style={styles.settingDescription}>
                {currentDisease?.label || '未設定'}
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color={colors.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingRow} onPress={handleManageAllergies}>
          <View style={styles.settingInfo}>
            <Icon name="alert-circle-outline" size={24} color={colors.warning} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>已知過敏原</Text>
              <Text style={styles.settingDescription}>{currentAllergiesLabel}</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>關於</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Icon name="information-outline" size={24} color={colors.primary[500]} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>版本資訊</Text>
              <Text style={styles.settingDescription}>
                v{Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'N/A'} (
                {Platform.OS === 'ios'
                  ? `Build ${Constants.expoConfig?.ios?.buildNumber ?? Constants.nativeBuildVersion ?? 'N/A'}`
                  : `Build ${
                      Constants.expoConfig?.android?.versionCode ??
                      Constants.nativeBuildVersion ??
                      'N/A'
                    }`}
                )
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.settingRow} onPress={handleSendBugReport}>
          <View style={styles.settingInfo}>
            <Icon name="bug-outline" size={24} color={colors.error} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>回報問題</Text>
              <Text style={styles.settingDescription}>gilko0725@gmail.com</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          DietDaily © 2024
        </Text>
        <Text style={styles.footerText}>
          用心記錄，健康生活
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  settingDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  footerText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.disabled,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
})
