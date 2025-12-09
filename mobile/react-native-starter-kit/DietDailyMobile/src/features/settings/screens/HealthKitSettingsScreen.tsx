import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, typography, spacing } from '@/theme';
import { healthKitService } from '@/services/HealthKitService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface SyncStatus {
  lastSyncTime: Date | null;
  isLoading: boolean;
  syncResult: {
    synced_count: number;
    metrics_by_type: Record<string, number>;
  } | null;
}

/**
 * HealthKit 設定畫面
 *
 * 功能：
 * - HealthKit 可用性檢測
 * - 授權流程
 * - 立即同步健康數據
 * - 同步狀態顯示
 * - 數據類型說明
 */
export function HealthKitSettingsScreen() {
  const { user, isAuthenticated } = useAuth();
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: null,
    isLoading: false,
    syncResult: null,
  });

  useEffect(() => {
    checkHealthKitAvailability();
    checkAuthorizationStatus();
    loadLastSyncTime();
  }, []);

  /**
   * 檢查 HealthKit 可用性
   */
  const checkHealthKitAvailability = async () => {
    try {
      const available = await healthKitService.isAvailable();
      setIsAvailable(available);
    } catch (error) {
      console.error('Failed to check HealthKit availability:', error);
      setIsAvailable(false);
    }
  };

  /**
   * 檢查授權狀態
   */
  const checkAuthorizationStatus = async () => {
    try {
      setIsCheckingAuth(true);
      const authorized = await healthKitService.checkAuthorization();
      setIsAuthorized(authorized);
    } catch (error) {
      console.error('Failed to check authorization:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  /**
   * 載入最後同步時間
   */
  const loadLastSyncTime = async () => {
    try {
      const lastSync = await healthKitService.getLastSyncTime();
      setSyncStatus((prev) => ({ ...prev, lastSyncTime: lastSync }));
    } catch (error) {
      console.error('Failed to load last sync time:', error);
    }
  };

  /**
   * 請求 HealthKit 授權
   */
  const handleRequestAuthorization = async () => {
    try {
      await healthKitService.requestAuthorization();
      setIsAuthorized(true);
      Alert.alert(
        '授權成功',
        '您已成功授予 HealthKit 權限。現在可以開始同步健康數據了！',
        [{ text: '好的' }]
      );
    } catch (error) {
      console.error('Authorization failed:', error);
      Alert.alert(
        '授權失敗',
        error instanceof Error ? error.message : '無法授予 HealthKit 權限',
        [{ text: '知道了' }]
      );
    }
  };

  /**
   * 立即同步健康數據
   */
  const handleSyncNow = async () => {
    if (!isAuthenticated || !user) {
      Alert.alert('提示', '請先登入再同步健康數據', [{ text: '知道了' }]);
      return;
    }

    if (!isAuthorized) {
      Alert.alert(
        '需要授權',
        '請先授權 HealthKit 權限才能同步數據',
        [
          { text: '取消', style: 'cancel' },
          { text: '前往授權', onPress: handleRequestAuthorization },
        ]
      );
      return;
    }

    setSyncStatus((prev) => ({ ...prev, isLoading: true, syncResult: null }));

    try {
      const result = await healthKitService.syncHealthData(7); // 同步最近 7 天

      setSyncStatus({
        lastSyncTime: new Date(),
        isLoading: false,
        syncResult: result,
      });

      const metricsSummary = Object.entries(result.metrics_by_type)
        .map(([type, count]) => `${getMetricLabel(type)}: ${count} 筆`)
        .join('\n');

      Alert.alert(
        '同步成功！',
        `已同步 ${result.synced_count} 筆健康數據\n\n${metricsSummary}`,
        [{ text: '好的' }]
      );
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus((prev) => ({ ...prev, isLoading: false }));

      Alert.alert(
        '同步失敗',
        error instanceof Error ? error.message : '無法同步健康數據，請稍後再試',
        [{ text: '知道了' }]
      );
    }
  };

  /**
   * 獲取指標類型的中文標籤
   */
  const getMetricLabel = (type: string): string => {
    const labels: Record<string, string> = {
      steps: '步數',
      heart_rate: '心率',
      active_energy: '活動消耗',
      water_intake: '飲水量',
      sleep_analysis: '睡眠',
    };
    return labels[type] || type;
  };

  /**
   * 格式化相對時間
   */
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 1) return '剛剛';
    if (diffMinutes < 60) return `${diffMinutes} 分鐘前`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} 小時前`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} 天前`;

    return formatDistanceToNow(date, { addSuffix: true, locale: zhTW });
  };

  // iOS 專用檢查
  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableContainer}>
          <Icon name="apple" size={64} color={colors.text.secondary} />
          <Text style={styles.unavailableTitle}>HealthKit 僅限 iOS</Text>
          <Text style={styles.unavailableText}>
            HealthKit 是 Apple 的健康數據平台，僅在 iOS 裝置上可用。
          </Text>
        </View>
      </View>
    );
  }

  // HealthKit 不可用
  if (isAvailable === false) {
    return (
      <View style={styles.container}>
        <View style={styles.unavailableContainer}>
          <Icon name="heart-off" size={64} color={colors.text.secondary} />
          <Text style={styles.unavailableTitle}>HealthKit 不可用</Text>
          <Text style={styles.unavailableText}>
            您的裝置不支援 HealthKit，或 HealthKit 功能未啟用。
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="heart-pulse" size={48} color={colors.primary[500]} />
        <Text style={styles.headerTitle}>HealthKit 整合</Text>
        <Text style={styles.headerSubtitle}>
          自動同步 iPhone 和 Apple Watch 的健康數據
        </Text>
      </View>

      {/* 授權狀態卡片 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon
            name={isAuthorized ? 'check-circle' : 'alert-circle'}
            size={24}
            color={isAuthorized ? colors.success : colors.warning}
          />
          <Text style={styles.cardTitle}>
            {isAuthorized ? '已授權' : '需要授權'}
          </Text>
        </View>

        {isCheckingAuth ? (
          <ActivityIndicator size="small" color={colors.primary[500]} />
        ) : (
          <>
            <Text style={styles.cardText}>
              {isAuthorized
                ? '您已授權 DietDaily 讀取 HealthKit 健康數據。'
                : '授權後，我們將能夠讀取您的步數、心率、活動消耗、飲水量和睡眠數據。'}
            </Text>

            {!isAuthorized && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleRequestAuthorization}
              >
                <Icon name="shield-check" size={20} color={colors.background} />
                <Text style={styles.primaryButtonText}>授權 HealthKit</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* 同步狀態卡片 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="sync" size={24} color={colors.primary[500]} />
          <Text style={styles.cardTitle}>同步狀態</Text>
        </View>

        {syncStatus.lastSyncTime ? (
          <View style={styles.syncInfo}>
            <Text style={styles.syncLabel}>最後同步時間</Text>
            <Text style={styles.syncTime}>
              {formatRelativeTime(syncStatus.lastSyncTime)}
            </Text>
            <Text style={styles.syncDate}>
              {syncStatus.lastSyncTime.toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        ) : (
          <Text style={styles.cardText}>尚未同步任何數據</Text>
        )}

        {syncStatus.syncResult && (
          <View style={styles.syncResult}>
            <Text style={styles.syncResultTitle}>
              同步了 {syncStatus.syncResult.synced_count} 筆數據
            </Text>
            {Object.entries(syncStatus.syncResult.metrics_by_type).map(([type, count]) => (
              <View key={type} style={styles.metricRow}>
                <Text style={styles.metricLabel}>{getMetricLabel(type)}</Text>
                <Text style={styles.metricCount}>{count} 筆</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.syncButton,
            (!isAuthorized || syncStatus.isLoading) && styles.syncButtonDisabled,
          ]}
          onPress={handleSyncNow}
          disabled={!isAuthorized || syncStatus.isLoading}
        >
          {syncStatus.isLoading ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <Icon name="sync" size={20} color={colors.background} />
              <Text style={styles.syncButtonText}>立即同步</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 數據類型說明 */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="information" size={24} color={colors.primary[500]} />
          <Text style={styles.cardTitle}>同步的數據類型</Text>
        </View>

        <View style={styles.dataTypes}>
          <DataTypeItem
            icon="walk"
            title="步數"
            description="每日步數統計，幫助追蹤活動量"
          />
          <DataTypeItem
            icon="heart-pulse"
            title="心率"
            description="靜息和活動心率，了解心血管健康"
          />
          <DataTypeItem
            icon="fire"
            title="活動消耗"
            description="運動和活動消耗的熱量"
          />
          <DataTypeItem
            icon="cup-water"
            title="飲水量"
            description="每日水分攝取追蹤"
          />
          <DataTypeItem
            icon="sleep"
            title="睡眠"
            description="睡眠時間和睡眠階段分析"
          />
        </View>
      </View>

      {/* 隱私說明 */}
      <View style={styles.privacyCard}>
        <Icon name="shield-lock" size={24} color={colors.primary} />
        <Text style={styles.privacyTitle}>您的隱私很重要</Text>
        <Text style={styles.privacyText}>
          • 所有健康數據都經過加密傳輸{'\n'}
          • 數據僅用於分析飲食與症狀的關聯{'\n'}
          • 您可以隨時停止同步並刪除數據{'\n'}
          • 我們不會將您的健康數據分享給第三方
        </Text>
      </View>

      {/* Footer Spacing */}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

/**
 * 數據類型項目組件
 */
function DataTypeItem({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.dataTypeItem}>
      <Icon name={icon} size={32} color={colors.primary} />
      <View style={styles.dataTypeContent}>
        <Text style={styles.dataTypeTitle}>{title}</Text>
        <Text style={styles.dataTypeDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  cardText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.background,
  },
  syncInfo: {
    marginBottom: spacing.md,
  },
  syncLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  syncTime: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  syncDate: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  syncResult: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  syncResultTitle: {
    ...typography.subtitle,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  metricLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  metricCount: {
    ...typography.subtitle,
    color: colors.primary,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    gap: spacing.sm,
  },
  syncButtonDisabled: {
    backgroundColor: colors.text.disabled,
  },
  syncButtonText: {
    ...typography.button,
    color: colors.background,
  },
  dataTypes: {
    marginTop: spacing.sm,
  },
  dataTypeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dataTypeContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  dataTypeTitle: {
    ...typography.subtitle,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  dataTypeDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  privacyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  privacyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  privacyText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  unavailableTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  unavailableText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
