/**
 * Bowel Movement Dashboard Screen
 *
 * 排便追蹤儀表板主畫面
 *
 * 功能：
 * - 顯示統計卡片（平均頻率、血便事件、正常天數）
 * - Bristol Scale 分佈圖表
 * - 排便頻率趨勢圖
 * - 月曆熱圖
 * - 健康洞察和建議
 * - 下拉刷新
 * - 加載狀態處理
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useBowelMovementStats } from '../hooks/useBowelMovementStats';
import { StatCard } from '../components/StatCard';
import { BristolScaleChart } from '../components/BristolScaleChart';
import { FrequencyTrendChart } from '../components/FrequencyTrendChart';
import { BowelMovementCalendar } from '../components/BowelMovementCalendar';
import { InsightCard } from '../components/InsightCard';

interface Props {
  userId: string;
  days?: number; // 分析天數，默認 30 天
}

/**
 * 排便追蹤儀表板畫面
 */
export const BowelMovementDashboardScreen: React.FC<Props> = ({ userId, days = 30 }) => {
  const [refreshing, setRefreshing] = useState(false);

  // Fetch bowel movement statistics with React Query
  const { data: stats, isLoading, refetch } = useBowelMovementStats(userId, days);

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Loading state
  if (isLoading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>載入排便數據中...</Text>
      </View>
    );
  }

  // No data state
  if (!stats) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暫無排便記錄</Text>
        <Text style={styles.emptyHint}>開始記錄您的排便情況以查看分析</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>排便追蹤</Text>
        <Text style={styles.headerSubtitle}>最近 {days} 天分析</Text>
      </View>

      {/* Statistics Cards */}
      <View style={styles.statsRow}>
        <StatCard
          label="平均頻率"
          value={`${stats.avgFrequency.toFixed(1)}/天`}
          trend={stats.trend}
          icon="chart-line"
        />
        <StatCard
          label="血便事件"
          value={stats.bloodIncidents}
          alert={stats.bloodIncidents > 0}
          icon="alert-circle"
        />
        <StatCard
          label="正常天數"
          value={`${stats.normalDays}/${days}`}
          percentage={stats.normalDays / days}
          icon="check-circle"
        />
      </View>

      {/* Bristol Scale Distribution Chart */}
      <View style={styles.section}>
        <BristolScaleChart data={stats.bristolDistribution} />
      </View>

      {/* Frequency Trend Chart */}
      <View style={styles.section}>
        <FrequencyTrendChart
          data={stats.dailyFrequency}
          bloodEvents={stats.bloodEvents}
        />
      </View>

      {/* Monthly Calendar Heatmap */}
      <View style={styles.section}>
        <BowelMovementCalendar
          data={stats.dailyData}
          currentDate={new Date()}
          onDayPress={(date) => {
            console.log('Day pressed:', date);
            // TODO: Navigate to day detail screen
          }}
        />
      </View>

      {/* Insights Section */}
      {stats.insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 健康洞察</Text>
          {stats.insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onPress={() => {
                console.log('Insight pressed:', insight.id);
                // TODO: Navigate to insight detail or show modal
              }}
            />
          ))}
        </View>
      )}

      {/* Additional Information */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>關於 Bristol Scale</Text>
        <Text style={styles.infoText}>
          Bristol Scale（布里斯托大便分類法）是一種醫學上用來分類人類糞便形態的工具。
          它將糞便分為 7 種類型，從硬塊狀（類型 1）到完全液體狀（類型 7）。
        </Text>
        <Text style={styles.infoText}>
          • 類型 1-2：便秘{'\n'}
          • 類型 3-4：理想（正常）{'\n'}
          • 類型 5-7：腹瀉
        </Text>
      </View>

      {/* Footer Spacing */}
      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  infoSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    height: 40,
  },
});

export default BowelMovementDashboardScreen;
