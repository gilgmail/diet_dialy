import React, { useState, useCallback, useMemo } from 'react'
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
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useSymptomDiary } from '../hooks/useSymptomDiary'
import { colors, typography, spacing } from '@/theme'
import { SEVERITY_LEVELS, COMMON_SYMPTOMS } from '../types'
import type { SeverityLevel, SymptomEntry } from '../types'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { format, isSameDay } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { parseSymptomNames } from '../utils/parseSymptomNames'

export function AddSymptomEntryScreen() {
  const navigation = useNavigation()
  const { createEntry, isCreating } = useSymptomDiary()

  // State for date selection
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [recentEntries, setRecentEntries] = useState<SymptomEntry[]>([])

  // Form state
  const [symptomName, setSymptomName] = useState('')
  const [severity, setSeverity] = useState<SeverityLevel>('mild')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [showOptionalFields, setShowOptionalFields] = useState(false)
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
      const now = new Date()
      setSelectedDate(prev => (isSameDay(prev, now) ? prev : now))
    }, [])
  )

  const handleSubmit = async () => {
    const symptomNames = parseSymptomNames(symptomName)

    if (symptomNames.length === 0) {
      Alert.alert('提醒', '請輸入症狀名稱')
      return
    }

    const createdEntries: SymptomEntry[] = []
    const durationMinutes = duration ? parseInt(duration, 10) : undefined
    const trimmedNotes = notes.trim()

    try {
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
    } catch (error) {
      if (createdEntries.length > 0) {
        const successfulNames = createdEntries.map(entry => entry.symptom_name).join('、')
        const remainingNames = symptomNames.slice(createdEntries.length).join('、')

        if (remainingNames) {
          setSymptomName(remainingNames)
        }

        if (remainingNames) {
          Alert.alert(
            '提醒',
            `已成功新增：「${successfulNames}」，但仍有以下症狀未完成：「${remainingNames}」，請稍後再試。`
          )
        } else {
          Alert.alert(
            '提醒',
            `已成功新增：「${successfulNames}」，但後續處理發生錯誤，請稍後再試。`
          )
        }
      } else {
        Alert.alert('錯誤', '新增失敗，請稍後再試')
      }
    }
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

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isCreating}
          disabled={isCreating || selectedSymptomNames.length === 0}
          style={styles.submitButton}
          buttonColor={colors.primary[500]}
          textColor={colors.text.inverse}
        >
          儲存
        </Button>
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
  submitButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
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
