'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { HealthSymptomCorrelation } from '@/types/medical';

interface HealthSymptomCorrelationChartProps {
  correlations: HealthSymptomCorrelation[];
  className?: string;
}

const significanceColors: Record<string, { badge: string; line: string }> = {
  strong: { badge: 'bg-red-100 text-red-800 border-red-300', line: '#ef4444' },
  moderate: { badge: 'bg-yellow-100 text-yellow-800 border-yellow-300', line: '#f59e0b' },
  weak: { badge: 'bg-gray-100 text-gray-800 border-gray-300', line: '#6b7280' },
  insufficient_data: { badge: 'bg-gray-100 text-gray-500 border-gray-200', line: '#9ca3af' }
};

const CorrelationCard = ({ correlation }: { correlation: HealthSymptomCorrelation }) => {
  const colors = (significanceColors[correlation.significance] || significanceColors.insufficient_data) as { badge: string; line: string };

  // Prepare data for chart
  const chartData = [
    {
      range: correlation.ranges.low.label,
      symptomScore: correlation.ranges.low.avgSymptomScore,
      days: correlation.ranges.low.dayCount,
      rangeType: '低'
    },
    {
      range: correlation.ranges.medium.label,
      symptomScore: correlation.ranges.medium.avgSymptomScore,
      days: correlation.ranges.medium.dayCount,
      rangeType: '中'
    },
    {
      range: correlation.ranges.high.label,
      symptomScore: correlation.ranges.high.avgSymptomScore,
      days: correlation.ranges.high.dayCount,
      rangeType: '高'
    }
  ];

  return (
    <div className="border rounded-lg p-4 bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 mb-1">
            {correlation.metricLabel}
          </h4>
          <p className="text-sm text-gray-600">{correlation.insight}</p>
        </div>
        <span className={`ml-4 px-3 py-1 rounded-full text-xs font-medium border ${colors.badge}`}>
          {correlation.significance === 'strong' ? '強相關' :
           correlation.significance === 'moderate' ? '中等相關' :
           correlation.significance === 'weak' ? '弱相關' : '資料不足'}
        </span>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              yAxisId="left"
              label={{ value: '症狀分數', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
              domain={[0, 5]}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: '樣本天數', angle: 90, position: 'insideRight', style: { fontSize: 12, fill: '#6b7280' } }}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '12px'
              }}
              formatter={(value: number, name: string) => {
                if (name === 'symptomScore') return [`${value.toFixed(2)} 分`, '症狀分數'];
                if (name === 'days') return [`${value} 天`, '樣本天數'];
                return [value, name];
              }}
              labelFormatter={(label) => `範圍：${label}`}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => {
                if (value === 'symptomScore') return '症狀分數';
                if (value === 'days') return '樣本天數';
                return value;
              }}
            />
            <Bar
              yAxisId="right"
              dataKey="days"
              fill="#94a3b8"
              opacity={0.6}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="symptomScore"
              stroke={colors.line}
              strokeWidth={2}
              dot={{ fill: colors.line, r: 5 }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Data Details Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">範圍</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">平均症狀分數</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">樣本天數</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {chartData.map((data, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-900">
                  <span className="font-medium">{data.rangeType}</span>
                  <span className="text-gray-600 ml-2 text-xs">({data.range})</span>
                </td>
                <td className="px-3 py-2 text-gray-900">
                  <span className="font-semibold">{data.symptomScore.toFixed(2)}</span> 分
                </td>
                <td className="px-3 py-2 text-gray-600">{data.days} 天</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export function HealthSymptomCorrelationChart({
  correlations,
  className = ''
}: HealthSymptomCorrelationChartProps) {
  if (correlations.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <h3 className="text-xl font-bold text-gray-900 mb-4">健康-症狀關聯分析</h3>
      <p className="text-sm text-gray-600 mb-6">
        以下圖表顯示健康指標的不同範圍與症狀嚴重度的關聯。每個指標分為低、中、高三個範圍，比較這三個範圍內的平均症狀分數。
      </p>
      <div className="space-y-6">
        {correlations.map((correlation, idx) => (
          <CorrelationCard key={idx} correlation={correlation} />
        ))}
      </div>
    </div>
  );
}
