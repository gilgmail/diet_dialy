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
  TextInput,
  Modal,
  type AlertButton,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import DateTimePicker from '@react-native-community/datetimepicker'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import Constants from 'expo-constants'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSettingsStore } from '../stores/settingsStore'
import { NotificationService } from '../services/notificationService'
import {
  CHRONIC_DISEASES,
  TIMEZONES,
  COMMON_ALLERGENS,
  type ChronicDiseaseValue,
} from '../types'
import { colors, typography, spacing } from '@/theme'
import type { MainStackParamList } from '@/app/navigation/types'
import { AIModelSelector } from '../components/AIModelSelector'

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
  const [debugMode, setDebugMode] = useState(settings.debugMode ?? false)
  const [customPrompt, setCustomPrompt] = useState(settings.customPrompt ?? '')
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner' | null>(null)
  const [tempTime, setTempTime] = useState(new Date())
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
      await NotificationService.scheduleMealReminders(user.id, settings.mealReminders, {
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

    const buttons: AlertButton[] = TIMEZONES.map((tz) => ({
      text: tz.label,
      onPress: () => {
        updateSettings(user.id, { timezone: tz.value, timezoneOffset: tz.offset })
        Alert.alert('成功', `時區已變更為 ${tz.label}`)
      },
    }))

    buttons.push({ text: '取消', style: 'cancel' })

    Alert.alert('選擇時區', '', buttons)
  }

  const handleChangeDisease = () => {
    if (!user?.id) return

    const buttons: AlertButton[] = CHRONIC_DISEASES.map((disease) => ({
      text: disease.label,
      onPress: () => {
        updateSettings(user.id, { chronicDisease: disease.value as ChronicDiseaseValue })
        Alert.alert('成功', `慢性病設定已更新為 ${disease.label}`)
      },
    }))

    buttons.push({
      text: '無',
      onPress: () => {
        updateSettings(user.id, { chronicDisease: null })
        Alert.alert('成功', '已清除慢性病設定')
      },
    })

    buttons.push({ text: '取消', style: 'cancel' })

    Alert.alert('選擇慢性病', '', buttons)
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
    const options: AlertButton[] = []

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
              onPress: (customAllergen?: string) => {
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

    // Parse current time for this meal
    const currentTime = settings.mealReminders[meal]
    const [hours, minutes] = currentTime.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)

    setSelectedMeal(meal)
    setTempTime(date)
    setShowTimePicker(true)
  }

  const handleTimePickerChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false)
    }

    if (event.type === 'dismissed' || !selectedDate || !selectedMeal || !user?.id) {
      if (Platform.OS === 'android') {
        setSelectedMeal(null)
      }
      return
    }

    setTempTime(selectedDate)

    if (Platform.OS === 'android') {
      // Android: Apply immediately
      const hours = selectedDate.getHours().toString().padStart(2, '0')
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0')
      const time = `${hours}:${minutes}`

      const newReminders = {
        ...settings.mealReminders,
        [selectedMeal]: time,
      }

      updateSettings(user.id, { mealReminders: newReminders })

      // Reschedule notifications if enabled
      if (settings.notificationsEnabled) {
        NotificationService.scheduleMealReminders(user.id, newReminders, {
          force: true,
          meals: [selectedMeal],
        })
      }

      setSelectedMeal(null)
    }
  }

  const handleConfirmTime = async () => {
    if (!selectedMeal || !user?.id) return

    const hours = tempTime.getHours().toString().padStart(2, '0')
    const minutes = tempTime.getMinutes().toString().padStart(2, '0')
    const time = `${hours}:${minutes}`

    const newReminders = {
      ...settings.mealReminders,
      [selectedMeal]: time,
    }

    await updateSettings(user.id, { mealReminders: newReminders })

    // Reschedule notifications if enabled
    if (settings.notificationsEnabled) {
      await NotificationService.scheduleMealReminders(user.id, newReminders, {
        force: true,
        meals: [selectedMeal],
      })
    }

    setShowTimePicker(false)
    setSelectedMeal(null)
  }

  const handleCancelTimePicker = () => {
    setShowTimePicker(false)
    setSelectedMeal(null)
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

      {/* AI Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI 設定</Text>
        <AIModelSelector />
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

      {/* Debug Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>開發者選項</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Icon name="bug" size={24} color={colors.warning} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>Debug 模式</Text>
              <Text style={styles.settingDescription}>
                {debugMode ? '已啟用 - 可調整 AI 提示詞' : '已關閉'}
              </Text>
            </View>
          </View>
          <Switch
            value={debugMode}
            onValueChange={async (value) => {
              setDebugMode(value)
              if (user?.id) {
                await updateSettings(user.id, { debugMode: value })
              }
            }}
            trackColor={{ false: colors.border, true: colors.warning }}
            thumbColor={debugMode ? colors.warning : colors.text.disabled}
          />
        </View>

        {debugMode && (
          <View style={styles.promptContainer}>
            <View style={styles.promptHeader}>
              <Text style={styles.promptLabel}>自訂 AI 提示詞（選填）</Text>
              <TouchableOpacity
                style={styles.loadDefaultButton}
                onPress={async () => {
                  try {
                    const apiBase = process.env.EXPO_PUBLIC_API_URL
                    if (!apiBase) {
                      Alert.alert('錯誤', 'API URL 未設定')
                      return
                    }

                    const response = await fetch(`${apiBase}/api/ai/default-prompt`)
                    const data = await response.json()

                    if (data.success && data.prompt) {
                      setCustomPrompt(data.prompt)
                      Alert.alert(
                        '已載入預設提示詞',
                        `變體：${data.label}\n\n${data.description}\n\n您可以在此基礎上修改。`,
                        [{ text: '確定' }]
                      )
                    } else {
                      Alert.alert('錯誤', '無法載入預設提示詞')
                    }
                  } catch (error) {
                    console.error('Failed to load default prompt:', error)
                    Alert.alert('錯誤', '載入失敗，請檢查網路連線')
                  }
                }}
              >
                <Icon name="download" size={16} color={colors.primary[600]} />
                <Text style={styles.loadDefaultButtonText}>載入預設</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.promptHint}>
              留空則使用預設提示詞。點擊「載入預設」查看完整提示詞並修改。
            </Text>
            <TextInput
              style={styles.promptInput}
              value={customPrompt}
              onChangeText={setCustomPrompt}
              placeholder="例如：請特別關注高 FODMAP 食物..."
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              onBlur={async () => {
                if (user?.id) {
                  await updateSettings(user.id, { customPrompt })
                }
              }}
            />
            <View style={styles.promptActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  Alert.alert(
                    '清除提示詞',
                    '確定要清除自訂提示詞？將恢復使用預設提示詞。',
                    [
                      { text: '取消', style: 'cancel' },
                      {
                        text: '清除',
                        style: 'destructive',
                        onPress: async () => {
                          setCustomPrompt('')
                          if (user?.id) {
                            await updateSettings(user.id, { customPrompt: '' })
                            Alert.alert('已清除', '已恢復使用預設提示詞')
                          }
                        },
                      },
                    ]
                  )
                }}
              >
                <Text style={styles.clearButtonText}>清除</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptSaveButton}
                onPress={async () => {
                  if (user?.id) {
                    await updateSettings(user.id, { customPrompt })
                    Alert.alert('已儲存', '自訂提示詞已更新')
                  }
                }}
              >
                <Text style={styles.promptSaveButtonText}>儲存提示詞</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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

      {/* Time Picker Modal for iOS */}
      {Platform.OS === 'ios' && showTimePicker && selectedMeal && (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="slide"
        >
          <View style={styles.timePickerModalOverlay}>
            <View style={styles.timePickerModal}>
              <View style={styles.timePickerHeader}>
                <Text style={styles.timePickerTitle}>
                  設定{MEAL_NAMES[selectedMeal]}提醒時間
                </Text>
              </View>
              <DateTimePicker
                value={tempTime}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleTimePickerChange}
                style={styles.timePicker}
              />
              <View style={styles.timePickerActions}>
                <TouchableOpacity
                  style={styles.timePickerCancelButton}
                  onPress={handleCancelTimePicker}
                >
                  <Text style={styles.timePickerCancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timePickerConfirmButton}
                  onPress={handleConfirmTime}
                >
                  <Text style={styles.timePickerConfirmText}>確認</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker for Android */}
      {Platform.OS === 'android' && showTimePicker && selectedMeal && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleTimePickerChange}
        />
      )}
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
  promptContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  promptLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  loadDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary[50],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  loadDefaultButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[600],
  },
  promptHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  promptInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    minHeight: 120,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  promptActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  clearButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  promptSaveButton: {
    flex: 1,
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  promptSaveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.surface,
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
  timePickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  timePickerModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl,
  },
  timePickerHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  timePickerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  timePicker: {
    width: '100%',
    height: 200,
  },
  timePickerActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  timePickerCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  timePickerConfirmButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.primary[500],
  },
  timePickerCancelText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  timePickerConfirmText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.surface,
  },
})
