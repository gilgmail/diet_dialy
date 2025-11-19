import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, SegmentedButtons, TextInput } from 'react-native-paper'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { colors, spacing, typography } from '@/theme'
import { useAuthStore } from '@/shared/stores/authStore'
import { HealthLogService } from '../services/HealthLogService'
import type { MainStackParamList } from '@/app/navigation/types'
import type { RecentActivityTemplate } from '../types'

type ActivityLogScreenProps = NativeStackScreenProps<MainStackParamList, 'ActivityLog'>

const ACTIVITY_PRESETS = [
  { value: 'walk', label: '散步' },
  { value: 'run', label: '跑步' },
  { value: 'yoga', label: '瑜珈' },
  { value: 'cycling', label: '騎車' },
  { value: 'strength', label: '重訓' },
  { value: 'custom', label: '自訂' },
] as const

const INTENSITY_OPTIONS = [
  { value: 'low', label: '輕度' },
  { value: 'moderate', label: '中度' },
  { value: 'high', label: '重度' },
] as const

export function ActivityLogScreen({ navigation }: ActivityLogScreenProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [activityType, setActivityType] = useState<typeof ACTIVITY_PRESETS[number]['value']>('walk')
  const [customActivity, setCustomActivity] = useState('')
  const [intensity, setIntensity] = useState<typeof INTENSITY_OPTIONS[number]['value']>('moderate')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [calories, setCalories] = useState('')
  const [steps, setSteps] = useState('')
  const [notes, setNotes] = useState('')
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null)

  const recentActivitiesQuery = useQuery({
    queryKey: ['recentActivities', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      return HealthLogService.getRecentActivities(user.id)
    },
    enabled: !!user?.id,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('尚未登入')

      const titleValue = customActivity.trim() || undefined

      if (activityType === 'custom' && !titleValue) {
        throw new Error('請輸入自訂活動名稱')
      }

      const typeValue = activityType === 'custom' ? 'custom' : activityType

      const payload = HealthLogService.buildActivityInput({
        activityType: typeValue,
        title: titleValue,
        intensity,
        startTime,
        endTime,
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
        calories: calories ? Number(calories) : null,
        steps: steps ? Number(steps) : null,
        notes: notes.trim() || undefined,
      })

      await HealthLogService.logActivitySession(user.id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayActivitySessions', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['recentActivities', user?.id] })
      Alert.alert('已記錄', '運動紀錄已更新', [{ text: '完成', onPress: () => navigation.goBack() }])
    },
    onError: (error: Error) => {
      Alert.alert('記錄失敗', error.message || '請稍後再試')
    },
  })

  const actualDuration = useMemo(() => {
    if (!startTime || !endTime) return null
    const diff = (endTime.getTime() - startTime.getTime()) / 60000
    if (diff <= 0) return null
    return `${diff} 分鐘`
  }, [startTime, endTime])

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(null)
      return
    }
    if (!date) {
      setShowPicker(null)
      return
    }

    if (showPicker === 'start') {
      setStartTime(date)
    } else if (showPicker === 'end') {
      setEndTime(date)
    }

    if (Platform.OS === 'android') {
      setShowPicker(null)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>運動紀錄</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>活動類型</Text>
          <SegmentedButtons
            value={activityType}
            onValueChange={(value) =>
              setActivityType(value as typeof ACTIVITY_PRESETS[number]['value'])
            }
            buttons={ACTIVITY_PRESETS.map(option => ({
              value: option.value,
              label: option.label,
            }))}
          />
          <TextInput
            mode="outlined"
            label={activityType === 'custom' ? '自訂活動名稱' : '活動標題（選填）'}
            placeholder="例如：夜間散步、核心訓練"
            value={customActivity}
            onChangeText={setCustomActivity}
            style={styles.input}
          />
          {recentActivitiesQuery.data && recentActivitiesQuery.data.length > 0 && (
            <View>
              <Text style={styles.helperText}>常用活動</Text>
              <View style={styles.suggestionRow}>
                {recentActivitiesQuery.data.map((activity: RecentActivityTemplate) => (
                  <TouchableOpacity
                    key={activity.id}
                    style={styles.suggestionChip}
                    onPress={() => {
                      if (ACTIVITY_PRESETS.some((preset) => preset.value === activity.activity_type)) {
                        setActivityType(activity.activity_type as typeof ACTIVITY_PRESETS[number]['value'])
                        setCustomActivity(activity.activity_title ?? '')
                      } else {
                        setActivityType('custom')
                        setCustomActivity(activity.activity_title || activity.activity_type)
                      }
                      if (activity.intensity) {
                        setIntensity(
                          (INTENSITY_OPTIONS.find((o) => o.value === activity.intensity)?.value as
                            | typeof INTENSITY_OPTIONS[number]['value']
                            | undefined) ?? 'moderate'
                        )
                      }
                      if (activity.duration_minutes) {
                        setDurationMinutes(String(activity.duration_minutes))
                      }
                    }}
                  >
                    <Text style={styles.suggestionChipText}>
                      {activity.activity_title || activity.activity_type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>強度與時長</Text>
          <SegmentedButtons
            value={intensity}
            onValueChange={(value) =>
              setIntensity(value as typeof INTENSITY_OPTIONS[number]['value'])
            }
            buttons={INTENSITY_OPTIONS}
          />

          <TextInput
            mode="outlined"
            label="活動時長 (分鐘)"
            keyboardType="numeric"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            style={styles.input}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>時間（選填）</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.dateButton, styles.half]}
              onPress={() => setShowPicker('start')}
            >
              <Text style={styles.dateText}>
                {startTime
                  ? format(startTime, 'MM/dd HH:mm', { locale: zhTW })
                  : '未設定'}
              </Text>
              <Text style={styles.dateHint}>開始時間</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateButton, styles.half]}
              onPress={() => setShowPicker('end')}
            >
              <Text style={styles.dateText}>
                {endTime
                  ? format(endTime, 'MM/dd HH:mm', { locale: zhTW })
                  : '未設定'}
              </Text>
              <Text style={styles.dateHint}>結束時間</Text>
            </TouchableOpacity>
          </View>
          {actualDuration && (
            <Text style={styles.helperText}>實際 {actualDuration}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>其他數據（選填）</Text>
          <View style={styles.row}>
            <TextInput
              mode="outlined"
              label="卡路里"
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
              style={[styles.input, styles.half]}
            />
            <TextInput
              mode="outlined"
              label="步數"
              keyboardType="numeric"
              value={steps}
              onChangeText={setSteps}
              style={[styles.input, styles.half]}
            />
          </View>
          <TextInput
            mode="outlined"
            label="備註"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <Button
          mode="contained"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={mutation.isPending}
        >
          儲存運動紀錄
        </Button>
      </ScrollView>

      {showPicker && (
        <DateTimePicker
          value={
            showPicker === 'start'
              ? startTime ?? new Date()
              : endTime ?? new Date()
          }
          mode="datetime"
          display="spinner"
          onChange={handlePickerChange}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  input: {
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  dateText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  dateHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  helperText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  suggestionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
  },
  suggestionChipText: {
    color: colors.primary[600],
    fontWeight: typography.fontWeight.semibold,
  },
})
