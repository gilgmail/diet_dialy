import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, SegmentedButtons, TextInput } from 'react-native-paper'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { colors, spacing, typography } from '@/theme'
import { useAuthStore } from '@/shared/stores/authStore'
import { HealthLogService } from '../services/HealthLogService'
import type { MainStackParamList } from '@/app/navigation/types'

type SleepLogScreenProps = NativeStackScreenProps<MainStackParamList, 'SleepLog'>

function combineDate(base: Date, timeSource: Date) {
  const result = new Date(base)
  result.setHours(timeSource.getHours(), timeSource.getMinutes(), 0, 0)
  return result
}

export function SleepLogScreen({ navigation }: SleepLogScreenProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [plannedStart, setPlannedStart] = useState(() => new Date())
  const [plannedDurationHours, setPlannedDurationHours] = useState(8)
  const [actualStart, setActualStart] = useState<Date | null>(null)
  const [actualEnd, setActualEnd] = useState<Date | null>(null)
  const [qualityScore, setQualityScore] = useState('3')
  const [isMainSleep, setIsMainSleep] = useState(true)
  const [notes, setNotes] = useState('')

  const [showDatePicker, setShowDatePicker] = useState<'date' | 'planned' | 'start' | 'end' | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('尚未登入')

      const payload = HealthLogService.buildSleepInput({
        plannedStart,
        plannedDuration: plannedDurationHours ? plannedDurationHours * 60 : null,
        actualStart,
        actualEnd,
        isMainSleep,
        qualityScore: Number(qualityScore),
        notes: notes.trim() || undefined,
      })

      await HealthLogService.logSleepSession(user.id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todaySleepSessions', user?.id] })
      Alert.alert('已記錄', '睡眠紀錄已更新', [{ text: '完成', onPress: () => navigation.goBack() }])
    },
    onError: (error: Error) => {
      Alert.alert('記錄失敗', error.message || '請稍後再試')
    },
  })

  const durationHoursLabel = useMemo(() => {
    if (!plannedDurationHours) return '未設定'
    return `${plannedDurationHours.toFixed(1)} 小時`
  }, [plannedDurationHours])

  const adjustPlannedDuration = (delta: number) => {
    setPlannedDurationHours((prev) => {
      const next = Math.min(12, Math.max(0.5, Math.round((prev + delta) * 2) / 2))
      return Number.isNaN(next) ? 0.5 : next
    })
  }

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(null)
      return
    }

    if (!date) {
      setShowDatePicker(null)
      return
    }

    switch (showDatePicker) {
      case 'date':
        setSelectedDate(date)
        setPlannedStart(combineDate(date, plannedStart))
        if (actualStart) setActualStart(combineDate(date, actualStart))
        if (actualEnd) setActualEnd(combineDate(date, actualEnd))
        break;
      case 'planned':
        setPlannedStart(combineDate(selectedDate, date))
        break
      case 'start':
        setActualStart(date)
        break
      case 'end':
        setActualEnd(date)
        break
      default:
        break
    }

    if (Platform.OS === 'android') {
      setShowDatePicker(null)
    }
  }

  const actualDuration = useMemo(() => {
    if (!actualStart || !actualEnd) return null
    const diff = (actualEnd.getTime() - actualStart.getTime()) / 3600000
    if (diff <= 0) return null
    return `${diff.toFixed(1)} 小時`
  }, [actualStart, actualEnd])

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>睡眠紀錄</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>記錄日期</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker('date')}
          >
            <Text style={styles.dateText}>
              {format(selectedDate, 'yyyy/MM/dd (EEE)', { locale: zhTW })}
            </Text>
            <Text style={styles.dateHint}>點擊修改日期</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>預計睡眠</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker('planned')}
          >
            <Text style={styles.dateText}>
              {format(plannedStart, 'HH:mm')}
            </Text>
            <Text style={styles.dateHint}>預計就寢時間</Text>
          </TouchableOpacity>

          <View style={styles.durationRow}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustPlannedDuration(-0.5)}
            >
              <Text style={styles.adjustButtonText}>-0.5h</Text>
            </TouchableOpacity>
            <Text style={styles.durationText}>{durationHoursLabel}</Text>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => adjustPlannedDuration(0.5)}
            >
              <Text style={styles.adjustButtonText}>+0.5h</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>以 0.5 小時為單位調整</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>實際睡眠（選填）</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.dateButton, styles.halfWidth]}
              onPress={() => setShowDatePicker('start')}
            >
              <Text style={styles.dateText}>
                {actualStart ? format(actualStart, 'MM/dd HH:mm') : '未填寫'}
              </Text>
              <Text style={styles.dateHint}>實際入睡</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateButton, styles.halfWidth]}
              onPress={() => setShowDatePicker('end')}
            >
              <Text style={styles.dateText}>
                {actualEnd ? format(actualEnd, 'MM/dd HH:mm') : '未填寫'}
              </Text>
              <Text style={styles.dateHint}>實際起床</Text>
            </TouchableOpacity>
          </View>
          {actualDuration && (
            <Text style={styles.helperText}>實際 {actualDuration}</Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.sectionTitle}>主要睡眠</Text>
            <Switch value={isMainSleep} onValueChange={setIsMainSleep} />
          </View>

          <Text style={styles.sectionTitle}>睡眠品質</Text>
          <SegmentedButtons
            value={qualityScore}
            onValueChange={(value) => setQualityScore(value)}
            buttons={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5' },
            ]}
            style={styles.segmented}
          />
        </View>

        <View style={styles.card}>
          <TextInput
            mode="outlined"
            label="備註（選填）"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <Button
          mode="contained"
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending}
          loading={mutation.isPending}
        >
          儲存睡眠紀錄
        </Button>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={
            showDatePicker === 'date'
              ? selectedDate
              : showDatePicker === 'planned'
              ? plannedStart
              : showDatePicker === 'start'
              ? actualStart ?? selectedDate
              : actualEnd ?? selectedDate
          }
          mode={showDatePicker === 'planned' ? 'time' : 'datetime'}
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
  dateButton: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
  input: {
    backgroundColor: colors.surface,
  },
  helperText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  adjustButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  adjustButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  durationText: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmented: {
    marginTop: spacing.xs,
  },
})
