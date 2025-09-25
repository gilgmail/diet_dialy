'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar
} from 'recharts';
import type { SymptomTrend, FoodSymptomCorrelation, SeverityPattern } from '@/lib/medical/symptom-tracker';

interface SymptomTrendsChartProps {
  weeklyTrends: SymptomTrend[];
  foodCorrelations: FoodSymptomCorrelation[];
  severityPatterns: SeverityPattern[];
}

const SYMPTOM_COLORS = {
  nausea: '#ef4444',
  vomiting: '#dc2626',
  abdominal_pain: '#f97316',
  diarrhea: '#eab308',
  constipation: '#84cc16',
  bloating: '#22c55e',
  heartburn: '#10b981',
  loss_of_appetite: '#14b8a6',
  fatigue: '#06b6d4',
  headache: '#0ea5e9',
  rash: '#3b82f6',
  itching: '#6366f1',
  difficulty_breathing: '#8b5cf6',
  joint_pain: '#a855f7',
  muscle_pain: '#c084fc',
  mood_changes: '#d946ef',
  insomnia: '#ec4899',
  other: '#64748b'
};

const CHART_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function SymptomTrendsChart({
  weeklyTrends,
  foodCorrelations,
  severityPatterns
}: SymptomTrendsChartProps) {
  // 準備趨勢圖表資料
  const trendChartData = weeklyTrends.map((trend, index) => ({
    symptom: trend.symptom_type,
    name: getSymptomLabel(trend.symptom_type),
    frequency: Math.round(trend.frequency * 100),
    severity: Math.round(trend.average_severity * 10),
    trend: trend.improvement_trend === 'improving' ? 1 :
           trend.improvement_trend === 'worsening' ? -1 : 0
  }));

  // 準備食物關聯圖表資料
  const correlationChartData = foodCorrelations
    .slice(0, 8) // 只顯示前8個最相關的食物
    .map(corr => ({
      food: corr.food_name,
      strength: Math.round(corr.correlation_strength * 100),
      occurrences: corr.occurrences,
      onset: Math.round(corr.time_to_onset / 60) // 轉換為小時
    }));

  // 準備嚴重程度分布資料
  const severityDistributionData = weeklyTrends.map(trend => ({
    symptom: getSymptomLabel(trend.symptom_type),
    mild: trend.average_severity < 3 ? 1 : 0,
    moderate: trend.average_severity >= 3 && trend.average_severity < 6 ? 1 : 0,
    severe: trend.average_severity >= 6 ? 1 : 0,
    frequency: Math.round(trend.frequency * 100)
  }));

  // 改善趨勢餅圖資料
  const improvementData = [
    {
      name: '改善中',
      value: weeklyTrends.filter(t => t.improvement_trend === 'improving').length,
      color: '#10b981'
    },
    {
      name: '穩定',
      value: weeklyTrends.filter(t => t.improvement_trend === 'stable').length,
      color: '#f59e0b'
    },
    {
      name: '惡化中',
      value: weeklyTrends.filter(t => t.improvement_trend === 'worsening').length,
      color: '#ef4444'
    }
  ];

  return (
    <div className="space-y-8">
      {/* 症狀頻率與嚴重度趨勢 */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="text-2xl mr-2">📊</span>
          症狀頻率與嚴重度分析
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              formatter={(value, name) => [
                `${value}${name === 'frequency' ? '%' : '/5'}`,
                name === 'frequency' ? '頻率' : '嚴重度'
              ]}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="frequency"
              stroke="#3b82f6"
              name="頻率 (%)"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="severity"
              stroke="#ef4444"
              name="嚴重度 (/5)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 食物關聯性分析 */}
      {correlationChartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">🍽️</span>
            食物症狀關聯性分析
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={correlationChartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="food"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value, name) => [
                  name === 'strength' ? `${value}%` :
                  name === 'occurrences' ? `${value}次` : `${value}小時`,
                  name === 'strength' ? '關聯強度' :
                  name === 'occurrences' ? '發生次數' : '發作時間'
                ]}
              />
              <Legend />
              <Bar
                dataKey="strength"
                fill="#3b82f6"
                name="關聯強度 (%)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 改善趨勢總覽 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">📈</span>
            改善趨勢分布
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={improvementData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {improvementData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <span className="text-2xl mr-2">⚡</span>
            症狀嚴重度分布
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={severityDistributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="symptom" angle={-45} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="mild" stackId="a" fill="#10b981" name="輕微" />
              <Bar dataKey="moderate" stackId="a" fill="#f59e0b" name="中等" />
              <Bar dataKey="severe" stackId="a" fill="#ef4444" name="嚴重" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 統計摘要 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <span className="text-2xl mr-2">📋</span>
          健康趨勢摘要
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {weeklyTrends.length}
            </div>
            <div className="text-sm text-gray-600">追蹤症狀類型</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {weeklyTrends.filter(t => t.improvement_trend === 'improving').length}
            </div>
            <div className="text-sm text-gray-600">改善中症狀</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {correlationChartData.length}
            </div>
            <div className="text-sm text-gray-600">食物關聯發現</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSymptomLabel(symptomType: string): string {
  const labels: Record<string, string> = {
    'nausea': '噁心',
    'vomiting': '嘔吐',
    'abdominal_pain': '腹痛',
    'diarrhea': '腹瀉',
    'constipation': '便秘',
    'bloating': '腹脹',
    'heartburn': '胃灼熱',
    'loss_of_appetite': '食慾不振',
    'fatigue': '疲勞',
    'headache': '頭痛',
    'rash': '皮疹',
    'itching': '搔癢',
    'difficulty_breathing': '呼吸困難',
    'joint_pain': '關節疼痛',
    'muscle_pain': '肌肉疼痛',
    'mood_changes': '情緒變化',
    'insomnia': '失眠',
    'other': '其他'
  };

  return labels[symptomType] || symptomType;
}