import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, TextInput, RadioButton, IconButton } from 'react-native-paper'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { format, isSameDay } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useBowelDiary } from '../hooks/useBowelDiary'
import { useBowelDiarySummary } from '../hooks/useBowelDiarySummary'
import { STOOL_TYPES, BLOOD_STATUS, DIFFICULTY_LEVELS } from '../types'
import type { StoolType, DifficultyLevel } from '../types'
import { colors, typography, spacing } from '@/theme'

type AddBowelMovementScreenProps = NativeStackScreenProps<any, 'AddBowelMovement'>

export function AddBowelMovementScreen({ navigation, route }: AddBowelMovementScreenProps) {
  const entryId = route.params?.entryId
  const dateParam = route.params?.date
  const isEditMode = !!entryId

  // States
  const [selectedDate] = useState(
    dateParam ? new Date(`${dateParam}T12:00:00`) : new Date()
  )
  const [stoolType, setStoolType] = useState<StoolType>(3)
  const [hasBlood, setHasBlood] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [difficulty, setDifficulty] = useState<DifficultyLevel | undefined>()
  const [notes, setNotes] = useState('')

  const { entries, createEntry, updateEntry, deleteEntry, isCreating, isUpdating, isDeleting } = useBowelDiary(selectedDate)
  const { summary, refetch: refetchSummary } = useBowelDiarySummary(selectedDate)

  // Load existing entry in edit mode
  useEffect(() => {
    if (isEditMode && entryId) {
      const existingEntry = entries.find((e: any) => e.id === entryId)
      if (existingEntry) {
        setStoolType(existingEntry.stool_type)
        setHasBlood(existingEntry.has_blood)
        setDifficulty(existingEntry.difficulty)
        setNotes(existingEntry.notes || '')
        if (existingEntry.difficulty || existingEntry.notes) {
          setShowDetails(true)
        }
      }
    }
  }, [isEditMode, entryId, entries])

  // Reset form when screen gets focus (only in create mode)
  useFocusEffect(
    useCallback(() => {
      if (!isEditMode) {
        setStoolType(3)
        setHasBlood(false)
        setShowDetails(false)
        setDifficulty(undefined)
        setNotes('')
      }
    }, [isEditMode])
  )

  const handleQuickSave = async (type: StoolType) => {
    try {
      await createEntry({
        stool_type: type,
        has_blood: false,
        occurred_at: selectedDate.toISOString(),
      })
      Alert.alert('成功', '已記錄大便')
      navigation.goBack()
    } catch (error) {
      Alert.alert('錯誤', '記錄失敗')
    }
  }

  const handleSave = async () => {
    try {
      if (isEditMode && entryId) {
        await updateEntry({
          entryId,
          input: {
            stool_type: stoolType,
            has_blood: hasBlood,
            difficulty,
            notes: notes.trim() || undefined,
            occurred_at: selectedDate.toISOString(),
          },
        })
        Alert.alert('成功', '已更新記錄')
      } else {
        await createEntry({
          stool_type: stoolType,
          has_blood: hasBlood,
          difficulty,
          notes: notes.trim() || undefined,
          occurred_at: selectedDate.toISOString(),
        })
        Alert.alert('成功', '已記錄大便')
      }
      navigation.goBack()
    } catch (error) {
      Alert.alert('錯誤', isEditMode ? '更新失敗' : '記錄失敗')
    }
  }

  const handleDelete = async () => {
    if (!isEditMode || !entryId) return

    Alert.alert('確認刪除', '確定要刪除這筆記錄嗎？', [
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
            Alert.alert('錯誤', '刪除失敗')
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Date Display */}
          <View style={styles.dateDisplay}>
            <IconButton icon="calendar" size={20} />
            <Text style={styles.dateText}>
              {format(selectedDate, 'yyyy年MM月dd日 (E)', { locale: zhTW })}
            </Text>
            {isSameDay(selectedDate, new Date()) && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayText}>今天</Text>
              </View>
            )}
          </View>

          {/* Today's Summary - Only show in create mode and if it's today */}
          {!isEditMode && isSameDay(selectedDate, new Date()) && summary.totalCount > 0 && (
            <View style={styles.todaySummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>今日已記錄：</Text>
                <Text style={styles.summaryValue}>{summary.totalCount} 次</Text>
              </View>
              {summary.lastTime && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>最後記錄：</Text>
                  <Text style={styles.summaryValue}>
                    {format(summary.lastTime, 'HH:mm')}
                  </Text>
                </View>
              )}

              {/* Today's Records List */}
              <View style={styles.todayRecordsList}>
                <Text style={styles.recordsListTitle}>今日記錄：</Text>
                {entries
                  .filter(entry => isSameDay(new Date(entry.occurred_at), new Date()))
                  .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
                  .map((entry) => {
                    const stoolInfo = STOOL_TYPES.find(t => t.value === entry.stool_type) || STOOL_TYPES[2]
                    return (
                      <TouchableOpacity
                        key={entry.id}
                        style={styles.recordItem}
                        onPress={() => {
                          navigation.replace('AddBowelMovement', { entryId: entry.id })
                        }}
                      >
                        <Text style={styles.recordIcon}>{stoolInfo.icon}</Text>
                        <View style={styles.recordDetails}>
                          <Text style={styles.recordTime}>
                            {format(new Date(entry.occurred_at), 'HH:mm')}
                          </Text>
                          <Text style={styles.recordType}>{stoolInfo.label}</Text>
                        </View>
                        {entry.has_blood && (
                          <Text style={styles.recordWarning}>⚠️</Text>
                        )}
                        <IconButton
                          icon="pencil"
                          size={16}
                          iconColor={colors.primary[500]}
                        />
                      </TouchableOpacity>
                    )
                  })}
              </View>
            </View>
          )}

          {/* Quick Selection (only in create mode) */}
          {!isEditMode && !showDetails && (
            <View style={styles.quickSection}>
              <Text style={styles.sectionTitle}>快速記錄</Text>
              <Text style={styles.sectionHint}>點擊形態立即儲存</Text>

              <View style={styles.stoolTypeGrid}>
                {STOOL_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={styles.stoolTypeButton}
                    onPress={() => handleQuickSave(type.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stoolTypeIcon}>{type.icon}</Text>
                    <Text style={styles.stoolTypeLabel}>{type.label}</Text>
                    <Text style={styles.stoolTypeDescription}>{type.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                mode="text"
                onPress={() => setShowDetails(true)}
                style={styles.showDetailsButton}
              >
                或 填寫詳細資訊 ▼
              </Button>
            </View>
          )}

          {/* Detailed Form */}
          {(showDetails || isEditMode) && (
            <>
              {/* Stool Type */}
              <View style={styles.section}>
                <Text style={styles.label}>
                  大便形態 <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.stoolTypeGrid}>
                  {STOOL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.stoolTypeButton,
                        stoolType === type.value && styles.stoolTypeButtonSelected,
                      ]}
                      onPress={() => setStoolType(type.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.stoolTypeIcon}>{type.icon}</Text>
                      <Text style={[
                        styles.stoolTypeLabel,
                        stoolType === type.value && styles.stoolTypeLabelSelected
                      ]}>
                        {type.label}
                      </Text>
                      <Text style={styles.stoolTypeDescription}>{type.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Blood Status */}
              <View style={styles.section}>
                <Text style={styles.label}>是否有血便</Text>
                <RadioButton.Group
                  onValueChange={(value) => setHasBlood(value === 'true')}
                  value={hasBlood.toString()}
                >
                  <View style={styles.radioRow}>
                    {BLOOD_STATUS.map((status) => (
                      <TouchableOpacity
                        key={status.value.toString()}
                        style={styles.radioButton}
                        onPress={() => setHasBlood(status.value)}
                      >
                        <RadioButton value={status.value.toString()} />
                        <Text style={styles.radioLabel}>
                          {status.icon} {status.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </RadioButton.Group>
              </View>

              {/* Difficulty (Optional) */}
              <View style={styles.section}>
                <Text style={styles.label}>排便難度 (選填)</Text>
                <View style={styles.difficultyRow}>
                  {DIFFICULTY_LEVELS.map((level) => (
                    <TouchableOpacity
                      key={level.value}
                      style={[
                        styles.difficultyButton,
                        difficulty === level.value && styles.difficultyButtonSelected,
                      ]}
                      onPress={() => setDifficulty(difficulty === level.value ? undefined : level.value)}
                    >
                      <Text style={styles.difficultyIcon}>{level.icon}</Text>
                      <Text style={styles.difficultyLabel}>{level.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Notes (Optional) */}
              <View style={styles.section}>
                <Text style={styles.label}>備註 (選填)</Text>
                <TextInput
                  mode="outlined"
                  placeholder="例：飯後、伴隨腹痛等"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  style={styles.notesInput}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary[500]}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons (only show when in details mode or edit mode) */}
      {(showDetails || isEditMode) && (
        <View style={styles.actionButtons}>
          {isEditMode && (
            <Button
              mode="outlined"
              onPress={handleDelete}
              loading={isDeleting}
              disabled={isDeleting || isUpdating}
              style={[styles.actionButton, styles.deleteButton]}
              labelStyle={styles.deleteButtonLabel}
              icon="delete"
            >
              刪除
            </Button>
          )}
          <Button
            mode="contained"
            onPress={handleSave}
            loading={isEditMode ? isUpdating : isCreating}
            disabled={isCreating || isUpdating || isDeleting}
            style={styles.actionButton}
            icon="check"
          >
            {isEditMode ? '更新' : '儲存'}
          </Button>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    padding: spacing.lg,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  dateText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  todaySummary: {
    backgroundColor: '#FFF9F0',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#D2691E',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#D2691E',
  },
  todayRecordsList: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5D5C3',
  },
  recordsListTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  recordDetails: {
    flex: 1,
  },
  recordTime: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  recordType: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  recordWarning: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  todayBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  todayText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[600],
  },
  quickSection: {
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
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
  stoolTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stoolTypeButton: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stoolTypeButtonSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  stoolTypeIcon: {
    fontSize: 32,
    marginBottom: spacing.xs / 2,
  },
  stoolTypeLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  stoolTypeLabelSelected: {
    color: colors.primary[600],
  },
  stoolTypeDescription: {
    fontSize: typography.fontSize.xs * 0.8,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs / 2,
  },
  showDetailsButton: {
    marginTop: spacing.md,
  },
  radioRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  difficultyButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  difficultyButtonSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  difficultyIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  difficultyLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  notesInput: {
    backgroundColor: colors.surface,
    minHeight: 80,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderColor: colors.error,
    borderWidth: 2,
  },
  deleteButtonLabel: {
    color: colors.error,
  },
})
