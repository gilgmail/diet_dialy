import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { TextInput, Button, SegmentedButtons } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import { useSymptomDiary } from '../hooks/useSymptomDiary'
import { colors, typography, spacing } from '@/theme'
import { SEVERITY_LEVELS, COMMON_SYMPTOMS } from '../types'
import type { SeverityLevel } from '../types'

export function AddSymptomEntryScreen() {
  const navigation = useNavigation()
  const { createEntry, isCreating } = useSymptomDiary()

  const [symptomName, setSymptomName] = useState('')
  const [severity, setSeverity] = useState<SeverityLevel>('mild')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async () => {
    if (!symptomName.trim()) {
      Alert.alert('提醒', '請輸入症狀名稱')
      return
    }

    try {
      await createEntry({
        symptom_name: symptomName.trim(),
        severity,
        duration_minutes: duration ? parseInt(duration, 10) : undefined,
        notes: notes.trim() || undefined,
      })

      Alert.alert('成功', '症狀記錄已新增', [
        {
          text: '確定',
          onPress: () => navigation.goBack(),
        },
      ])
    } catch (error) {
      Alert.alert('錯誤', '新增失敗，請稍後再試')
    }
  }

  const handleCommonSymptomSelect = (name: string) => {
    setSymptomName(name)
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
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
                  symptomName === symptom.name && styles.symptomChipActive,
                ]}
                onPress={() => handleCommonSymptomSelect(symptom.name)}
              >
                <Text style={styles.symptomIcon}>{symptom.icon}</Text>
                <Text
                  style={[
                    styles.symptomName,
                    symptomName === symptom.name && styles.symptomNameActive,
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

        {/* Duration Input */}
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

        {/* Notes Input */}
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

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isCreating}
          disabled={isCreating}
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
})
