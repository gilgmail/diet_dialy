/**
 * Bowel Movement Calendar Component
 *
 * 月曆熱圖組件顯示排便模式
 *
 * 功能：
 * - 顯示每日排便次數（熱圖顏色強度）
 * - Bristol Scale 類型顏色編碼
 * - 血便事件標記（紅色邊框）
 * - 點擊日期顯示詳情
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface DayData {
  date: string;
  bristolType: number | null;
  hasBlood: boolean;
  frequency: number;
}

interface Props {
  data: DayData[];
  currentDate?: Date;
  onDayPress?: (date: string) => void;
}

/**
 * 根據 Bristol Type 獲取顏色
 */
function getBristolColor(type: number | null, frequency: number): string {
  if (frequency === 0 || type === null) return '#F3F4F6'; // 灰色（無數據）

  // Bristol Scale color mapping
  if (type <= 2) return '#D97706'; // 棕色（便秘）
  if (type <= 4) return '#10B981'; // 綠色（正常）
  return '#F97316'; // 橘色（腹瀉）
}

/**
 * 根據頻率獲取顏色強度
 */
function getIntensityAlpha(frequency: number): number {
  if (frequency === 0) return 0.1;
  if (frequency === 1) return 0.3;
  if (frequency === 2) return 0.6;
  if (frequency === 3) return 0.8;
  return 1.0; // 4+ times
}

/**
 * 排便月曆熱圖組件
 */
export const BowelMovementCalendar: React.FC<Props> = ({
  data,
  currentDate = new Date(),
  onDayPress,
}) => {
  const { width: screenWidth } = Dimensions.get('window');
  const calendarWidth = screenWidth - 40; // 20px padding
  const cellSize = (calendarWidth - 48) / 7; // 7 days, 48px total horizontal padding

  // Generate calendar grid
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Prepend empty cells for days before month start
    const startDayOfWeek = getDay(monthStart);
    const emptyCellsBefore = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Monday = 0

    const emptyCells = Array(emptyCellsBefore).fill(null);

    // Map days to data
    const dataMap = new Map<string, DayData>();
    data.forEach((d) => dataMap.set(d.date, d));

    const cells = daysInMonth.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayData = dataMap.get(dateStr);

      return {
        date: dateStr,
        day: format(day, 'd'),
        bristolType: dayData?.bristolType || null,
        hasBlood: dayData?.hasBlood || false,
        frequency: dayData?.frequency || 0,
      };
    });

    return [...emptyCells, ...cells];
  }, [data, currentDate]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {format(currentDate, 'yyyy年 M月', { locale: zhTW })} 排便模式
      </Text>

      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {['一', '二', '三', '四', '五', '六', '日'].map((day) => (
          <View key={day} style={[styles.weekdayCell, { width: cellSize }]}>
            <Text style={styles.weekdayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarData.map((cell, index) => {
          if (!cell) {
            // Empty cell
            return <View key={`empty-${index}`} style={[styles.cell, { width: cellSize, height: cellSize }]} />;
          }

          const backgroundColor = getBristolColor(cell.bristolType, cell.frequency);
          const opacity = getIntensityAlpha(cell.frequency);

          return (
            <TouchableOpacity
              key={cell.date}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor,
                  opacity,
                  borderColor: cell.hasBlood ? '#EF4444' : 'transparent',
                  borderWidth: cell.hasBlood ? 2 : 0,
                },
              ]}
              onPress={() => onDayPress?.(cell.date)}
            >
              <Text style={styles.dayText}>{cell.day}</Text>
              {cell.frequency > 0 && (
                <Text style={styles.frequencyText}>{cell.frequency}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>圖例：</Text>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#D97706', opacity: 0.6 }]} />
            <Text style={styles.legendText}>便秘 (1-2)</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#10B981', opacity: 0.6 }]} />
            <Text style={styles.legendText}>正常 (3-4)</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#F97316', opacity: 0.6 }]} />
            <Text style={styles.legendText}>腹瀉 (5)</Text>
          </View>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#10B981', opacity: 0.3 }]} />
            <Text style={styles.legendText}>1次</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#10B981', opacity: 0.6 }]} />
            <Text style={styles.legendText}>2次</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#10B981', opacity: 1.0 }]} />
            <Text style={styles.legendText}>3次+</Text>
          </View>

          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendBox,
                { backgroundColor: '#10B981', opacity: 0.6, borderColor: '#EF4444', borderWidth: 2 },
              ]}
            />
            <Text style={styles.legendText}>血便</Text>
          </View>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          本月共記錄 {data.filter((d) => d.frequency > 0).length} 天，
          {data.filter((d) => d.hasBlood).length > 0 && (
            <Text style={styles.bloodWarning}>發現 {data.filter((d) => d.hasBlood).length} 天血便事件</Text>
          )}
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cell: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  frequencyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
  },
  legend: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
  },
  summary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  bloodWarning: {
    color: '#EF4444',
    fontWeight: '600',
  },
});

export default BowelMovementCalendar;
