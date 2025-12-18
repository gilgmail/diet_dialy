/**
 * Frequency Trend Chart Component
 *
 * 顯示排便頻率趨勢的折線圖組件
 *
 * 功能：
 * - 顯示每日排便次數趨勢
 * - 標記血便事件（紅點）
 * - 顯示正常範圍參考線（1-3次/天）
 * - 7日移動平均線
 * - 互動式數據點提示
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import type { DailyFrequency } from '../hooks/useBowelMovementStats';

interface Props {
  data: DailyFrequency[];
  bloodEvents?: Array<{ date: string; count: number }>;
  height?: number;
  showMovingAverage?: boolean;
}

/**
 * 計算移動平均
 */
function calculateMovingAverage(data: number[], window: number = 7): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2));
    const end = Math.min(data.length, i + Math.ceil(window / 2));
    const slice = data.slice(start, end);
    const avg = slice.reduce((sum, val) => sum + val, 0) / slice.length;
    result.push(avg);
  }

  return result;
}

/**
 * 排便頻率趨勢圖組件
 */
export const FrequencyTrendChart: React.FC<Props> = ({
  data,
  bloodEvents = [],
  height = 220,
  showMovingAverage = true,
}) => {
  const { width: screenWidth } = Dimensions.get('window');
  const chartWidth = screenWidth - 40; // 20px padding on each side

  // Chart configuration
  const chartPadding = { top: 20, right: 20, bottom: 40, left: 40 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = height - chartPadding.top - chartPadding.bottom;

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], movingAvgPoints: [], maxCount: 5, bloodEventPoints: [] };
    }

    const counts = data.map((d) => d.count);
    const maxCount = Math.max(...counts, 5); // Minimum 5 for scale

    // Calculate point positions
    const spacing = plotWidth / (data.length - 1 || 1);

    const points = data.map((item, index) => {
      const x = chartPadding.left + index * spacing;
      const y = chartPadding.top + plotHeight - (item.count / maxCount) * plotHeight;

      return { x, y, count: item.count, date: item.date, hasBlood: item.hasBlood };
    });

    // Calculate moving average
    let movingAvgPoints: Array<{ x: number; y: number }> = [];
    if (showMovingAverage && data.length >= 7) {
      const movingAvg = calculateMovingAverage(counts, 7);

      movingAvgPoints = movingAvg.map((avg, index) => {
        const x = chartPadding.left + index * spacing;
        const y = chartPadding.top + plotHeight - (avg / maxCount) * plotHeight;

        return { x, y };
      });
    }

    // Blood event positions
    const bloodEventPoints = points.filter((p) => p.hasBlood);

    return { points, movingAvgPoints, maxCount, bloodEventPoints };
  }, [data, showMovingAverage, plotWidth, plotHeight, chartPadding]);

  // Normal range reference lines (1-3 times/day)
  const normalRangeMin = chartPadding.top + plotHeight - (1 / chartData.maxCount) * plotHeight;
  const normalRangeMax = chartPadding.top + plotHeight - (3 / chartData.maxCount) * plotHeight;

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>排便頻率趨勢</Text>
        <Text style={styles.emptyText}>暫無數據</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>排便頻率趨勢</Text>

      {/* Chart using React Native Views */}
      <View style={[styles.chartContainer, { width: chartWidth, height }]}>
        {/* Normal range background (green shade) */}
        <View
          style={[
            styles.normalRangeBackground,
            {
              left: chartPadding.left,
              right: chartPadding.right,
              top: normalRangeMax,
              height: Math.abs(normalRangeMax - normalRangeMin),
            },
          ]}
        />

        {/* Reference lines */}
        <View
          style={[
            styles.referenceLine,
            {
              left: chartPadding.left,
              right: chartPadding.right,
              top: normalRangeMin,
            },
          ]}
        />
        <View
          style={[
            styles.referenceLine,
            {
              left: chartPadding.left,
              right: chartPadding.right,
              top: normalRangeMax,
            },
          ]}
        />

        {/* Y-axis labels */}
        {[0, 1, 2, 3, 4, 5].map((value) => {
          const y = chartPadding.top + plotHeight - (value / chartData.maxCount) * plotHeight;
          return (
            <View key={value} style={[styles.yAxisTick, { top: y, left: chartPadding.left - 5 }]} />
          );
        })}

        {/* Data points and lines */}
        {chartData.points.map((point, index) => {
          const nextPoint = chartData.points[index + 1];
          return (
            <React.Fragment key={index}>
              {/* Line to next point */}
              {nextPoint && (
                <View
                  style={[
                    styles.dataLine,
                    {
                      left: point.x,
                      top: point.y,
                      width: Math.sqrt(
                        Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
                      ),
                      transform: [
                        {
                          rotate: `${Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x)}rad`,
                        },
                      ],
                    },
                  ]}
                />
              )}
              {/* Data point */}
              <View
                style={[
                  styles.dataPoint,
                  {
                    left: point.x - 4,
                    top: point.y - 4,
                    backgroundColor: point.hasBlood ? '#EF4444' : '#4F46E5',
                  },
                ]}
              />
            </React.Fragment>
          );
        })}

        {/* Blood event markers (larger red circles) */}
        {chartData.bloodEventPoints.map((point, index) => (
          <View
            key={`blood-${index}`}
            style={[
              styles.bloodMarker,
              {
                left: point.x - 8,
                top: point.y - 8,
              },
            ]}
          />
        ))}

        {/* Moving average line (simplified) */}
        {showMovingAverage &&
          chartData.movingAvgPoints.length > 0 &&
          chartData.movingAvgPoints.map((point, index) => {
            const nextPoint = chartData.movingAvgPoints[index + 1];
            if (!nextPoint) return null;
            return (
              <View
                key={`avg-${index}`}
                style={[
                  styles.movingAvgLine,
                  {
                    left: point.x,
                    top: point.y,
                    width: Math.sqrt(
                      Math.pow(nextPoint.x - point.x, 2) + Math.pow(nextPoint.y - point.y, 2)
                    ),
                    transform: [
                      {
                        rotate: `${Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x)}rad`,
                      },
                    ],
                  },
                ]}
              />
            );
          })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendLine, { backgroundColor: '#6366F1' }]} />
          <Text style={styles.legendText}>實際次數</Text>
        </View>
        {showMovingAverage && chartData.movingAvgPoints.length > 0 && (
          <View style={styles.legendRow}>
            <View style={[styles.legendLine, { backgroundColor: '#9CA3AF' }]} />
            <Text style={styles.legendText}>7日平均</Text>
          </View>
        )}
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>血便事件</Text>
        </View>
      </View>

      {/* Normal range note */}
      <View style={styles.noteContainer}>
        <View style={[styles.noteDot, { backgroundColor: '#D1FAE5' }]} />
        <Text style={styles.noteText}>綠色區域：正常範圍（1-3次/天）</Text>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  chartContainer: {
    position: 'relative',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  normalRangeBackground: {
    position: 'absolute',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  referenceLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#D1FAE5',
  },
  yAxisTick: {
    position: 'absolute',
    width: 5,
    height: 1,
    backgroundColor: '#6B7280',
  },
  dataLine: {
    position: 'absolute',
    height: 3,
    backgroundColor: '#6366F1',
  },
  dataPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bloodMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  movingAvgLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendLine: {
    width: 20,
    height: 3,
    borderRadius: 2,
    marginRight: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  noteDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 8,
  },
  noteText: {
    fontSize: 11,
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

export default FrequencyTrendChart;
