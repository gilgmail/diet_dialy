import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { TextInput, Button, SegmentedButtons, IconButton } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { useSymptomDiary } from '../hooks/useSymptomDiary'
import { colors, typography, spacing } from '@/theme'
import { SEVERITY_LEVELS, COMMON_SYMPTOMS } from '../types'
import type { SeverityLevel, SymptomEntry } from '../types'
import type { MainStackParamList } from '@/app/navigation/types'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { format, isSameDay } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { parseSymptomNames } from '../utils/parseSymptomNames'

export function AddSymptomEntryScreen() {
  const navigation = useNavigation()
  const route = useRoute<RouteProp<MainStackParamList, 'AddSymptomEntry'>>()
  const { entries, createEntry, updateEntry, deleteEntry, isCreating, isUpdating, isDeleting } = useSymptomDiary()

  // Check if editing existing entry
  const entryId = route.params?.entryId
  const isEditMode = !!entryId
  const existingEntry = isEditMode ? entries.find(e => e.id === entryId) : null

  // Support date parameter from navigation (for historical entries)
  // Use T12:00:00 to avoid timezone conversion issues
  const initialDate = route.params?.date
    ? new Date(`${route.params.date}T12:00:00`)
    : existingEntry
    ? new Date(`${existingEntry.occurred_at.split('T')[0]}T12:00:00`)
    : new Date()
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [recentEntries, setRecentEntries] = useState<SymptomEntry[]>([])

  // Form state
  const [symptomName, setSymptomName] = useState('')
  const [severity, setSeverity] = useState<SeverityLevel>('mild')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')

  // Load existing entry data when available
  useEffect(() => {
    if (existingEntry) {
      console.log('[AddSymptomEntry] Loading existing entry data:', {
        symptom_name: existingEntry.symptom_name,
        severity: existingEntry.severity,
        occurred_at: existingEntry.occurred_at
      })
      setSymptomName(existingEntry.symptom_name)
      setSeverity(existingEntry.severity)
      setDuration(existingEntry.duration_minutes?.toString() || '')
      setNotes(existingEntry.notes || '')

      // Update selected date to match entry date
      const entryDate = new Date(`${existingEntry.occurred_at.split('T')[0]}T12:00:00`)
      console.log('[AddSymptomEntry] Setting date from entry:', {
        occurred_at: existingEntry.occurred_at,
        extracted: existingEntry.occurred_at.split('T')[0],
        dateObject: entryDate.toISOString(),
        formatted: format(entryDate, 'yyyy-MM-dd')
      })
      setSelectedDate(entryDate)
    }
  }, [existingEntry?.id])
  const [showOptionalFields, setShowOptionalFields] = useState(
    !!(existingEntry?.duration_minutes || existingEntry?.notes)
  )
  const selectedSymptomNames = useMemo(
    () => parseSymptomNames(symptomName),
    [symptomName]
  )

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date && event.type !== 'dismissed') {
      setSelectedDate(date)
    }

    if (Platform.OS === 'android') {
      setShowDatePicker(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      // Skip auto-reset in edit mode
      if (isEditMode) {
        console.log('[AddSymptomEntry] Skip auto-reset in edit mode')
        return
      }

      const now = new Date()
      setSelectedDate(prev => (isSameDay(prev, now) ? prev : now))
    }, [isEditMode])
  )

  const handleSubmit = async () => {
    const trimmedName = symptomName.trim()

    if (!trimmedName) {
      Alert.alert('提醒', '請輸入症狀名稱')
      return
    }

    const formatErrorMessage = (error: unknown) => {
      if (error instanceof Error) return error.message
      if (typeof error === 'string') return error
      try {
        return JSON.stringify(error)
      } catch {
        return '未知錯誤'
      }
    }

    const durationMinutes = duration ? parseInt(duration, 10) : undefined
    const trimmedNotes = notes.trim()

    try {
      if (isEditMode && entryId) {
        // Update existing entry
        await updateEntry({
          entryId,
          input: {
            symptom_name: trimmedName,
            severity,
            duration_minutes: durationMinutes,
            notes: trimmedNotes || undefined,
            occurred_at: selectedDate.toISOString(),
          },
        })
        Alert.alert('成功', `已更新「${trimmedName}」`)
        navigation.goBack()
      } else {
        // Create new entry - support multiple symptoms
        const symptomNames = parseSymptomNames(trimmedName)
        const createdEntries: SymptomEntry[] = []

        for (const name of symptomNames) {
          const newEntry = await createEntry({
            symptom_name: name,
            severity,
            duration_minutes: durationMinutes,
            notes: trimmedNotes || undefined,
            occurred_at: selectedDate.toISOString(),
          })

          if (newEntry) {
            createdEntries.push(newEntry)
          }
        }

        if (createdEntries.length === 0) {
          throw new Error('No symptom entries were created')
        }

        setRecentEntries(prev => {
          const existing = prev.filter(entry => !createdEntries.some(newEntry => newEntry.id === entry.id))
          return [...createdEntries, ...existing].slice(0, 5)
        })

        // Clear input for next entry
        setSymptomName('')
        setSeverity('mild')
        setDuration('')
        setNotes('')

        const successNames = createdEntries.map(entry => entry.symptom_name).join('、')
        Alert.alert('成功', `已新增症狀記錄「${successNames}」`)
      }
    } catch (error) {
      Alert.alert('錯誤', error instanceof Error ? error.message : isEditMode ? '更新失敗' : '新增失敗')
    }
  }

  const handleDelete = async () => {
    if (!isEditMode || !entryId) return

    Alert.alert('確認刪除', `確定要刪除「${symptomName}」嗎？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEntry(entryId)
            Alert.alert('成功', '已刪除記錄')
            navigation.goBack()
          } catch (error) {
            Alert.alert('錯誤', error instanceof Error ? error.message : '刪除失敗')
          }
        },
      },
    ])
  }

  const handleCommonSymptomSelect = (name: string) => {
    setSymptomName(prev => {
      const names = parseSymptomNames(prev)
      if (names.includes(name)) {
        return names.join('、')
      }
      return [...names, name].join('、')
    })
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Date Picker */}
        <View style={styles.datePickerContainer}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(prev => !prev)}
          >
            <IconButton icon="calendar" size={20} />
            <Text style={styles.dateText}>
              {format(selectedDate, 'yyyy年MM月dd日 (E)', { locale: zhTW })}
            </Text>
            <IconButton icon={showDatePicker ? 'chevron-up' : 'chevron-down'} size={20} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Recent Entries */}
        {recentEntries.length > 0 && (
          <View style={styles.recentEntriesContainer}>
            <Text style={styles.recentEntriesTitle}>剛新增的記錄</Text>
            {recentEntries.map((entry) => {
              const severityInfo = SEVERITY_LEVELS.find(s => s.value === entry.severity)
              return (
                <View key={entry.id} style={styles.recentEntryItem}>
                  <Text style={styles.recentEntryIcon}>{severityInfo?.icon}</Text>
                  <Text style={styles.recentEntryText}>
                    {entry.symptom_name} ({severityInfo?.label})
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Symptom Name Input */}
        <View style={styles.section}>
          <Text style={styles.label}>
            症狀名稱 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            mode="outlined"
            placeholder="例：頭痛、腹痛"
            value={symptomName}
            onChangeText={setSymptomName}
            style={styles.input}
            outlineColor={colors.border}
            activeOutlineColor={colors.primary[500]}
          />
          <Text style={styles.hint}>可使用逗號或頓號分隔多個症狀</Text>
        </View>

        {/* Common Symptoms */}
        <View style={styles.section}>
          <Text style={styles.label}>常見症狀</Text>
          <View style={styles.symptomsGrid}>
            {COMMON_SYMPTOMS.map((symptom) => (
              <TouchableOpacity
                key={symptom.name}
                style={[
                  styles.symptomChip,
                  selectedSymptomNames.includes(symptom.name) && styles.symptomChipActive,
                ]}
                onPress={() => handleCommonSymptomSelect(symptom.name)}
              >
                <Text style={styles.symptomIcon}>{symptom.icon}</Text>
                <Text
                  style={[
                    styles.symptomName,
                    selectedSymptomNames.includes(symptom.name) && styles.symptomNameActive,
                  ]}
                >
                  {symptom.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Severity Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>
            嚴重程度 <Text style={styles.required}>*</Text>
          </Text>
          <SegmentedButtons
            value={severity}
            onValueChange={(value) => setSeverity(value as SeverityLevel)}
            buttons={SEVERITY_LEVELS.map((level) => ({
              value: level.value,
              label: `${level.icon} ${level.label}`,
              style: severity === level.value ? { backgroundColor: level.color + '20' } : undefined,
            }))}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Optional Fields Toggle */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.optionalFieldsToggle}
            onPress={() => setShowOptionalFields(!showOptionalFields)}
          >
            <Icon
              name={showOptionalFields ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.primary[500]}
            />
            <Text style={styles.optionalFieldsToggleText}>
              {showOptionalFields ? '隱藏選填欄位' : '顯示選填欄位（持續時間、備註）'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Duration Input - Collapsible */}
        {showOptionalFields && (
          <View style={styles.section}>
            <Text style={styles.label}>持續時間（分鐘）</Text>
            <TextInput
              mode="outlined"
              placeholder="例：30"
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              style={styles.input}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary[500]}
            />
            <Text style={styles.hint}>選填 - 症狀持續的分鐘數</Text>
          </View>
        )}

        {/* Notes Input - Collapsible */}
        {showOptionalFields && (
          <View style={styles.section}>
            <Text style={styles.label}>備註</Text>
            <TextInput
              mode="outlined"
              placeholder="例：早上起床後開始，午餐後好轉"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.textArea]}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary[500]}
            />
            <Text style={styles.hint}>選填 - 其他相關資訊</Text>
          </View>
        )}

        {/* Submit and Delete Buttons */}
        <View style={styles.floatingButtonContainer}>
          {isEditMode && (
            <Button
              mode="outlined"
              onPress={handleDelete}
              loading={isDeleting}
              disabled={isDeleting || isUpdating}
              style={[styles.floatingButton, styles.deleteButton]}
              labelStyle={styles.deleteButtonLabel}
              icon="delete"
            >
              刪除記錄
            </Button>
          )}
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isEditMode ? isUpdating : isCreating}
            disabled={
              (isEditMode ? isUpdating : isCreating) ||
              isDeleting ||
              selectedSymptomNames.length === 0
            }
            style={styles.floatingButton}
            labelStyle={styles.floatingButtonLabel}
            buttonColor={colors.primary[500]}
            textColor={colors.text.inverse}
            icon="check"
          >
            {isEditMode ? '更新記錄' : '儲存記錄'}
          </Button>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  datePickerContainer: {
    marginBottom: spacing.lg,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  dateText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  recentEntriesContainer: {
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  recentEntriesTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[700],
    marginBottom: spacing.sm,
  },
  recentEntryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  recentEntryIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  recentEntryText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.surface,
  },
  textArea: {
    minHeight: 100,
  },
  hint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  symptomChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  symptomIcon: {
    fontSize: 16,
  },
  symptomName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  symptomNameActive: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  segmentedButtons: {
    backgroundColor: colors.surface,
  },
  floatingButtonContainer: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  floatingButton: {
    borderRadius: 12,
    paddingVertical: spacing.xs,
    flex: 1,
  },
  floatingButtonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderColor: colors.error,
    borderWidth: 2,
  },
  deleteButtonLabel: {
    color: colors.error,
  },
  optionalFieldsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  optionalFieldsToggleText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
})
