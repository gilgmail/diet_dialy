import React, { useEffect, useMemo, useState } from 'react'
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
import { Button, SegmentedButtons, TextInput, ActivityIndicator } from 'react-native-paper'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { colors, spacing, typography } from '@/theme'
import { useAuthStore } from '@/shared/stores/authStore'
import { HealthLogService } from '../services/HealthLogService'
import type { MedicationRegimenSummary } from '../types'
import type { MainStackParamList } from '@/app/navigation/types'

type MedicationLogScreenProps = NativeStackScreenProps<MainStackParamList, 'MedicationLog'>

const STATUS_OPTIONS = [
  { value: 'taken', label: '準時' },
  { value: 'delayed', label: '延遲' },
  { value: 'skipped', label: '略過' },
  { value: 'missed', label: '忘記' },
] as const

export function MedicationLogScreen({ navigation }: MedicationLogScreenProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [takenAt, setTakenAt] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedRegimen, setSelectedRegimen] = useState<MedicationRegimenSummary | null>(null)
  const [dose, setDose] = useState('')
  const [adherence, setAdherence] = useState<typeof STATUS_OPTIONS[number]['value']>('taken')
  const [symptomTriggered, setSymptomTriggered] = useState(false)
  const [symptomNotes, setSymptomNotes] = useState('')
  const [notes, setNotes] = useState('')

  const regimenQuery = useQuery({
    queryKey: ['medicationRegimens', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('尚未登入')
      return HealthLogService.getActiveRegimens(user.id)
    },
    enabled: !!user?.id,
  })

  const prioritizedRegimens = useMemo(() => {
    const data = regimenQuery.data ?? []
    const injections = data.filter((item) => item.route === 'injection')
    const others = data.filter((item) => item.route !== 'injection')
    return injections.length > 0 ? injections : data.length > 0 ? data : []
  }, [regimenQuery.data])

  const mutation = useMutation({
    mutationFn: async () => {
        if (!user?.id || !selectedRegimen) {
          throw new Error('缺少療程序號')
        }

      const payload = HealthLogService.buildMedicationInput({
        regimenId: selectedRegimen.id,
        takenAt,
        dose: dose.trim() || undefined,
        route: selectedRegimen.route ?? undefined,
        symptomTriggered,
        symptomNotes: symptomNotes.trim() || undefined,
        adherenceStatus: adherence,
        notes: notes.trim() || undefined,
      })

      await HealthLogService.logMedicationAdministration(user.id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayMedicationLogs', user?.id] })
      Alert.alert('已記錄', '用藥紀錄已更新', [
        {
          text: '完成',
          onPress: () => navigation.goBack(),
        },
      ])
    },
    onError: (error: Error) => {
      Alert.alert('記錄失敗', error.message || '無法儲存紀錄')
    },
  })

  useEffect(() => {
    if (prioritizedRegimens.length > 0) {
      setSelectedRegimen((prev) => prev ?? prioritizedRegimens[0])
      if (!dose) {
        setDose(prioritizedRegimens[0].default_dose ?? '')
      }
    }
  }, [prioritizedRegimens, dose])

  const handleChangeRegimen = (regimen: MedicationRegimenSummary) => {
    setSelectedRegimen(regimen)
    setDose(regimen.default_dose ?? '')
  }

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false)
      return
    }

    if (date) {
      setTakenAt(date)
    }
    if (Platform.OS === 'android') {
      setShowDatePicker(false)
    }
  }

  const regimenCards = useMemo(() => {
    if (!prioritizedRegimens || prioritizedRegimens.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>尚未建立療程</Text>
          <Text style={styles.emptyDescription}>
            請先在後台或提醒設定中建立療程，才能記錄用藥。
          </Text>
        </View>
      )
    }

    return prioritizedRegimens.map((regimen) => {
      const isSelected = selectedRegimen?.id === regimen.id
      const title = regimen.custom_name || regimen.medication_name || '未命名療程'
      const frequency =
        regimen.frequency_type === 'every_n_days'
          ? `每 ${regimen.interval_days ?? '?'} 天`
          : regimen.frequency_type === 'cron'
          ? '自訂排程'
          : '症狀時服用'

      return (
        <TouchableOpacity
          key={regimen.id}
          style={[styles.regimenCard, isSelected && styles.regimenCardActive]}
          onPress={() => handleChangeRegimen(regimen)}
          activeOpacity={0.9}
        >
          <Text style={styles.regimenTitle}>{title}</Text>
          <Text style={styles.regimenMeta}>
            {frequency} · {regimen.route === 'injection' ? '針劑' : '口服'}
          </Text>
          {regimen.default_dose && (
            <Text style={styles.regimenDose}>建議：{regimen.default_dose}</Text>
          )}
        </TouchableOpacity>
      )
    })
  }, [regimenQuery.data, selectedRegimen])

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>用藥紀錄</Text>

        {regimenQuery.isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>載入療程資料...</Text>
          </View>
        ) : (
          <View style={styles.cardGroup}>
            <Text style={styles.sectionTitle}>選擇療程</Text>
            <Text style={styles.sectionDescription}>
              醫護人員會預先設定療程，目前僅提供針劑記錄。
            </Text>
            {regimenCards}
          </View>
        )}

        <View style={styles.cardGroup}>
          <Text style={styles.sectionTitle}>施打/服用時間</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={styles.datetimeButton}
            activeOpacity={0.8}
          >
            <Text style={styles.datetimeText}>
              {format(takenAt, 'yyyy/MM/dd HH:mm', { locale: zhTW })}
            </Text>
            <Text style={styles.datetimeHint}>點擊修改時間</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardGroup}>
          <Text style={styles.sectionTitle}>劑量與狀態</Text>
          <TextInput
            mode="outlined"
            label="服用劑量"
            placeholder="例如 2 mg / 1 tab"
            value={dose}
            onChangeText={setDose}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>服藥狀態</Text>
          <SegmentedButtons
            value={adherence}
            onValueChange={(value) =>
              setAdherence(value as typeof STATUS_OPTIONS[number]['value'])
            }
            buttons={STATUS_OPTIONS.map(status => ({
              value: status.value,
              label: status.label,
            }))}
            style={styles.segmented}
          />
        </View>

        <View style={styles.cardGroup}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.sectionTitle}>症狀觸發</Text>
              <Text style={styles.sectionDescription}>勾選後可填症狀說明</Text>
            </View>
            <Switch
              value={symptomTriggered}
              onValueChange={setSymptomTriggered}
            />
          </View>

          {symptomTriggered && (
            <TextInput
              mode="outlined"
              label="症狀說明"
              multiline
              value={symptomNotes}
              onChangeText={setSymptomNotes}
              style={styles.input}
            />
          )}

          <TextInput
            mode="outlined"
            label="備註（選填）"
            multiline
            value={notes}
            onChangeText={setNotes}
            style={styles.input}
          />
        </View>

        <Button
          mode="contained"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!selectedRegimen || mutation.isPending}
          style={styles.saveButton}
        >
          儲存用藥紀錄
        </Button>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={takenAt}
          mode="datetime"
          display="spinner"
          onChange={handleDateChange}
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
    marginBottom: spacing.sm,
  },
  cardGroup: {
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
  sectionDescription: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  regimenCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  regimenCardActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  regimenTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  regimenMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 4,
  },
  regimenDose: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    marginTop: 4,
  },
  datetimeButton: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  datetimeText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  datetimeHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surface,
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  segmented: {
    marginTop: spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    marginTop: spacing.md,
  },
  loadingBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.text.secondary,
  },
  emptyState: {
    paddingVertical: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  emptyDescription: {
    marginTop: spacing.xs,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
})
