/**
 * Exercise Intensity Chart Component
 *
 * 運動強度與症狀關係圖表
 *
 * 功能：
 * - 顯示低/中/高強度運動的症狀分數
 * - 柱狀圖展示平均症狀評分
 * - 顏色編碼（綠色=低強度，橘色=中強度，紅色=高強度）
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

interface IntensityData {
  intensity: 'low' | 'moderate' | 'high';
  avgSymptomScore: number;
  sampleSize: number;
  exerciseMinutes: number;
}

interface Props {
  data: IntensityData[];
  height?: number;
}

/**
 * 獲取強度顏色
 */
function getIntensityColor(intensity: string): string {
  switch (intensity) {
    case 'low':
      return '#10B981'; // 綠色
    case 'moderate':
      return '#F59E0B'; // 橘色
    case 'high':
      return '#EF4444'; // 紅色
    default:
      return '#6B7280';
  }
}

/**
 * 獲取強度標籤
 */
function getIntensityLabel(intensity: string): string {
  switch (intensity) {
    case 'low':
      return '低強度';
    case 'moderate':
      return '中強度';
    case 'high':
      return '高強度';
    default:
      return intensity;
  }
}

/**
 * 運動強度圖表組件
 */
export const ExerciseIntensityChart: React.FC<Props> = ({ data, height = 250 }) => {
  const { width: screenWidth } = Dimensions.get('window');
  const chartWidth = screenWidth - 40;

  // 圖表配置
  const chartPadding = { top: 20, right: 20, bottom: 60, left: 50 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = height - chartPadding.top - chartPadding.bottom;

  // 計算最大症狀分數
  const maxScore = Math.max(...data.map((d) => d.avgSymptomScore), 5);

  // 計算柱狀圖位置
  const barWidth = plotWidth / (data.length * 2);
  const spacing = barWidth;

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>暫無運動數據</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 圖表區域 */}
      <View style={[styles.chartContainer, { width: chartWidth, height }]}>
        {/* Y軸標籤 */}
        <View style={styles.yAxisLabels}>
          {[5, 4, 3, 2, 1, 0].map((value) => {
            const y =
              chartPadding.top + plotHeight - (value / maxScore) * plotHeight;
            return (
              <View key={value} style={[styles.yAxisLabel, { top: y - 8 }]}>
                <Text style={styles.yAxisText}>{value}</Text>
              </View>
            );
          })}
        </View>

        {/* 參考線 */}
        {[0, 1, 2, 3, 4, 5].map((value) => {
          const y =
            chartPadding.top + plotHeight - (value / maxScore) * plotHeight;
          return (
            <View
              key={`line-${value}`}
              style={[
                styles.referenceLine,
                {
                  left: chartPadding.left,
                  right: chartPadding.right,
                  top: y,
                },
              ]}
            />
          );
        })}

        {/* 柱狀圖 */}
        {data.map((item, index) => {
          const barHeight = (item.avgSymptomScore / maxScore) * plotHeight;
          const x = chartPadding.left + index * (barWidth + spacing) + spacing;
          const y = chartPadding.top + plotHeight - barHeight;

          return (
            <View key={item.intensity}>
              {/* 柱狀條 */}
              <View
                style={[
                  styles.bar,
                  {
                    left: x,
                    top: y,
                    width: barWidth,
                    height: barHeight,
                    backgroundColor: getIntensityColor(item.intensity),
                  },
                ]}
              />

              {/* 數值標籤 */}
              <View
                style={[
                  styles.valueLabel,
                  {
                    left: x,
                    top: y - 25,
                    width: barWidth,
                  },
                ]}
              >
                <Text style={styles.valueText}>
                  {item.avgSymptomScore.toFixed(1)}
                </Text>
                <Text style={styles.sampleText}>({item.sampleSize}天)</Text>
              </View>

              {/* X軸標籤 */}
              <View
                style={[
                  styles.xAxisLabel,
                  {
                    left: x,
                    top: chartPadding.top + plotHeight + 10,
                    width: barWidth,
                  },
                ]}
              >
                <Text style={styles.xAxisText}>
                  {getIntensityLabel(item.intensity)}
                </Text>
                <Text style={styles.exerciseMinutes}>
                  {Math.round(item.exerciseMinutes)}分鐘
                </Text>
              </View>
            </View>
          );
        })}

        {/* Y軸標題 */}
        <View style={styles.yAxisTitle}>
          <Text style={styles.yAxisTitleText}>症狀評分</Text>
        </View>
      </View>

      {/* 說明文字 */}
      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          💡 症狀評分越低表示腸道狀況越好
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartContainer: {
    position: 'relative',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  yAxisLabels: {
    position: 'absolute',
    left: 10,
    top: 0,
    bottom: 0,
  },
  yAxisLabel: {
    position: 'absolute',
    left: 0,
    width: 30,
    alignItems: 'flex-end',
  },
  yAxisText: {
    fontSize: 12,
    color: '#6B7280',
  },
  referenceLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  bar: {
    position: 'absolute',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  valueLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  sampleText: {
    fontSize: 10,
    color: '#6B7280',
  },
  xAxisLabel: {
    position: 'absolute',
    alignItems: 'center',
  },
  xAxisText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  exerciseMinutes: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  yAxisTitle: {
    position: 'absolute',
    left: 5,
    top: '50%',
    transform: [{ rotate: '-90deg' }],
  },
  yAxisTitleText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  noteContainer: {
    marginTop: 12,
    paddingHorizontal: 12,
  },
  noteText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    padding: 32,
  },
});

export default ExerciseIntensityChart;
