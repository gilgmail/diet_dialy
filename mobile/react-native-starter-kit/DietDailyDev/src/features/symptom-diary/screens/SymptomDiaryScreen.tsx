import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { FAB, Card } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSymptomDiary } from '../hooks/useSymptomDiary'
import { colors, typography, spacing } from '@/theme'
import type { MainStackParamList } from '@/app/navigation/types'
import type { SymptomEntry } from '../types'
import { SEVERITY_LEVELS } from '../types'

type NavigationProp = NativeStackNavigationProp<MainStackParamList>

export function SymptomDiaryScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { entries, isLoading, deleteEntry, refetch } = useSymptomDiary()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleDelete = (entry: SymptomEntry) => {
    Alert.alert(
      '刪除症狀記錄',
      `確定要刪除「${entry.symptom_name}」嗎？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEntry(entry.id)
              Alert.alert('成功', '症狀記錄已刪除')
            } catch (error) {
              Alert.alert('錯誤', '刪除失敗，請稍後再試')
            }
          },
        },
      ]
    )
  }

  const getSeverityInfo = (severity: string) => {
    return (
      SEVERITY_LEVELS.find((s) => s.value === severity) || SEVERITY_LEVELS[0]
    )
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null
    if (minutes < 60) return `${minutes}分鐘`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}小時${mins}分鐘` : `${hours}小時`
  }

  const renderEntry = ({ item }: { item: SymptomEntry }) => {
    const severityInfo = getSeverityInfo(item.severity)
    const duration = formatDuration(item.duration_minutes)

    return (
      <Card style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <Text style={styles.severityIcon}>{severityInfo.icon}</Text>
          <View style={styles.entryHeaderText}>
            <Text style={styles.symptomName}>{item.symptom_name}</Text>
            <Text
              style={[
                styles.severityLabel,
                { color: severityInfo.color },
              ]}
            >
              {severityInfo.label}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={styles.deleteButton}
          >
            <Icon name="trash-can-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.entryDetails}>
          {duration && (
            <View style={styles.detailRow}>
              <Icon name="clock-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.detailText}>{duration}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Icon name="calendar" size={16} color={colors.text.secondary} />
            <Text style={styles.detailText}>{formatTime(item.recorded_at)}</Text>
          </View>
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Icon name="note-text-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}
      </Card>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>😊</Text>
      <Text style={styles.emptyTitle}>尚無症狀記錄</Text>
      <Text style={styles.emptySubtitle}>
        點擊右下角的 + 按鈕開始記錄
      </Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>症狀日記</Text>
        <Text style={styles.headerSubtitle}>追蹤您的健康狀況</Text>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          entries.length === 0 ? styles.emptyList : styles.list
        }
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        color={colors.text.inverse}
        onPress={() => navigation.navigate('AddSymptomEntry')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  list: {
    padding: spacing.md,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  entryCard: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  severityIcon: {
    fontSize: 32,
    marginRight: spacing.sm,
  },
  entryHeaderText: {
    flex: 1,
  },
  symptomName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  severityLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  entryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    margin: spacing.lg,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary[500],
  },
})
