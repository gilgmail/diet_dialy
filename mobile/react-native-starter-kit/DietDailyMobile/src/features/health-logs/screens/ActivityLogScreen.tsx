import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, TextInput } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { colors, spacing, typography } from '@/theme'
import { useAuthStore } from '@/shared/stores/authStore'
import { HealthLogService } from '../services/HealthLogService'
import type { MainStackParamList } from '@/app/navigation/types'
import type { RecentActivityTemplate } from '../types'

type ActivityLogScreenProps = NativeStackScreenProps<MainStackParamList, 'ActivityLog'>

export function ActivityLogScreen({ navigation }: ActivityLogScreenProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [activityTitle, setActivityTitle] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('30') // 預設 30 分鐘
  const [calories, setCalories] = useState('')
  const [steps, setSteps] = useState('')
  const [notes, setNotes] = useState('')
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [tempTime, setTempTime] = useState(new Date())
  const [showOtherData, setShowOtherData] = useState(false)

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

      const titleValue = activityTitle.trim()
      if (!titleValue) {
        throw new Error('請輸入活動名稱')
      }

      const payload = HealthLogService.buildActivityInput({
        activityType: titleValue, // 使用活動名稱作為 type
        title: titleValue,
        intensity: null, // 不記錄強度
        startTime,
        endTime: null, // 不使用結束時間
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

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      setTempTime(date)
    }
  }

  const handleConfirmTime = () => {
    setStartTime(tempTime)
    setShowTimePicker(false)
  }

  const handleCancelTime = () => {
    setShowTimePicker(false)
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>運動紀錄</Text>

        {/* 活動名稱 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>活動名稱</Text>
          <TextInput
            mode="outlined"
            label="輸入活動名稱"
            placeholder="例如：晨跑、瑜珈、重訓"
            value={activityTitle}
            onChangeText={setActivityTitle}
            style={styles.input}
          />
          {recentActivitiesQuery.data && recentActivitiesQuery.data.length > 0 && (
            <View>
              <Text style={styles.helperText}>最近的記錄（點擊快速填入）</Text>
              <View style={styles.suggestionRow}>
                {recentActivitiesQuery.data.slice(0, 5).map((activity: RecentActivityTemplate) => (
                  <TouchableOpacity
                    key={activity.id}
                    style={styles.suggestionChip}
                    onPress={() => {
                      setActivityTitle(activity.activity_title || activity.activity_type)
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

        {/* 活動時長 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>活動時長</Text>
          <TextInput
            mode="outlined"
            label="分鐘"
            keyboardType="numeric"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            style={styles.input}
          />
        </View>

        {/* 開始時間 */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>開始時間（選填）</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => {
              if (startTime) {
                setTempTime(startTime)
              }
              setShowTimePicker(true)
            }}
          >
            <Icon name="clock-outline" size={24} color={colors.text.secondary} />
            <Text style={styles.timeText}>
              {startTime ? format(startTime, 'HH:mm') : '未設定'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 其他數據（折疊） */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setShowOtherData(!showOtherData)}
          >
            <Text style={styles.sectionTitle}>其他數據（選填）</Text>
            <Icon
              name={showOtherData ? 'chevron-up' : 'chevron-down'}
              size={24}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
          {showOtherData && (
            <>
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
                style={styles.input}
              />
            </>
          )}
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

      {/* 時間選擇器 Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={handleCancelTime}>
                <Text style={styles.pickerCancelText}>取消</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>選擇時間</Text>
              <TouchableOpacity onPress={handleConfirmTime}>
                <Text style={styles.pickerConfirmText}>確認</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempTime}
              mode="time"
              display="spinner"
              onChange={handlePickerChange}
              locale="zh-TW"
              is24Hour={true}
            />
          </View>
        </View>
      </Modal>
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
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
  },
  timeText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    flex: 1,
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  pickerCancelText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  pickerConfirmText: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
})
