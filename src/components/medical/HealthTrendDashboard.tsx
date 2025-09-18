'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, ComposedChart, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell,
  ScatterChart, Scatter, ReferenceLine, Legend
} from 'recharts';
import SymptomAnalysisEngine from './SymptomAnalysisEngine';
import SymptomFoodCorrelationAnalyzer from './SymptomFoodCorrelationAnalyzer';
import HealthTrendPredictor from './HealthTrendPredictor';

interface HealthDataPoint {
  date: string;
  symptomSeverity: number;
  symptomFrequency: number;
  activityImpact: number;
  moodImpact: number;
  stressLevel: number;
  sleepQuality: number;
  dietCompliance: number;
  medicationAdherence?: number;
  exerciseLevel?: number;
  hydrationLevel?: number;
  weatherImpact?: number;
}

interface SymptomRecord {
  id: string;
  timestamp: string;
  symptoms: string[];
  severity: number;
  duration: number;
  triggers: string[];
  notes: string;
  activityImpact: number;
  moodImpact: number;
  stressLevel: number;
  sleepQuality: number;
}

interface FoodEntry {
  id: string;
  timestamp: string;
  foodName: string;
  category: string;
  amount: number;
  medicalScore: number;
  riskFactors: string[];
}

interface HealthTrendDashboardProps {
  healthData: HealthDataPoint[];
  symptomRecords: SymptomRecord[];
  foodEntries: FoodEntry[];
  timeRange: '7d' | '30d' | '90d' | '180d' | 'all';
  onTimeRangeChange: (range: '7d' | '30d' | '90d' | '180d' | 'all') => void;
}

interface TrendSummary {
  overall: 'improving' | 'stable' | 'declining';
  severity: { trend: number; change: string };
  frequency: { trend: number; change: string };
  activity: { trend: number; change: string };
  mood: { trend: number; change: string };
  sleep: { trend: number; change: string };
  recommendations: string[];
}

const COLORS = {
  severity: '#ef4444',
  frequency: '#f97316',
  activity: '#eab308',
  mood: '#8b5cf6',
  stress: '#ec4899',
  sleep: '#06b6d4',
  diet: '#10b981',
  medication: '#84cc16'
};

const HealthTrendDashboard: React.FC<HealthTrendDashboardProps> = ({
  healthData,
  symptomRecords,
  foodEntries,
  timeRange,
  onTimeRangeChange
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'analysis' | 'correlations' | 'predictions'>('overview');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['symptomSeverity', 'activityImpact', 'moodImpact']);

  // 過濾時間範圍內的數據
  const filteredHealthData = useMemo(() => {
    if (timeRange === 'all') return healthData;

    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 180;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return healthData.filter(point => new Date(point.date) >= cutoff);
  }, [healthData, timeRange]);

  // 趨勢摘要分析
  const trendSummary = useMemo((): TrendSummary => {
    if (filteredHealthData.length < 7) {
      return {
        overall: 'stable',
        severity: { trend: 0, change: '數據不足' },
        frequency: { trend: 0, change: '數據不足' },
        activity: { trend: 0, change: '數據不足' },
        mood: { trend: 0, change: '數據不足' },
        sleep: { trend: 0, change: '數據不足' },
        recommendations: ['需要更多數據以提供準確分析']
      };
    }

    const recentWeek = filteredHealthData.slice(-7);
    const previousWeek = filteredHealthData.slice(-14, -7);

    const calculateTrend = (recent: number[], previous: number[]) => {
      if (previous.length === 0) return 0;
      const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
      const previousAvg = previous.reduce((sum, val) => sum + val, 0) / previous.length;
      return ((recentAvg - previousAvg) / previousAvg) * 100;
    };

    const getTrendChange = (trend: number): string => {
      if (Math.abs(trend) < 5) return '穩定';
      return trend > 0 ? `上升 ${trend.toFixed(1)}%` : `下降 ${Math.abs(trend).toFixed(1)}%`;
    };

    const severityTrend = calculateTrend(
      recentWeek.map(d => d.symptomSeverity),
      previousWeek.map(d => d.symptomSeverity)
    );

    const frequencyTrend = calculateTrend(
      recentWeek.map(d => d.symptomFrequency),
      previousWeek.map(d => d.symptomFrequency)
    );

    const activityTrend = calculateTrend(
      recentWeek.map(d => d.activityImpact),
      previousWeek.map(d => d.activityImpact)
    );

    const moodTrend = calculateTrend(
      recentWeek.map(d => d.moodImpact),
      previousWeek.map(d => d.moodImpact)
    );

    const sleepTrend = calculateTrend(
      recentWeek.map(d => d.sleepQuality),
      previousWeek.map(d => d.sleepQuality)
    );

    // 整體趨勢評估
    let overall: 'improving' | 'stable' | 'declining' = 'stable';
    if (severityTrend < -10 && activityTrend < -10 && moodTrend < -10) {
      overall = 'improving';
    } else if (severityTrend > 10 || activityTrend > 10 || moodTrend > 10) {
      overall = 'declining';
    }

    // 生成建議
    const recommendations: string[] = [];
    if (severityTrend > 15) recommendations.push('症狀嚴重程度上升，建議檢討近期飲食和生活習慣');
    if (activityTrend > 15) recommendations.push('活動能力下降，建議適度調整作息和運動');
    if (moodTrend > 15) recommendations.push('心情狀態不佳，建議尋求專業支持或調整壓力管理');
    if (sleepTrend < -15) recommendations.push('睡眠品質惡化，建議改善睡眠環境和作息規律');
    if (overall === 'improving') recommendations.push('目前趨勢良好，建議維持現有的健康管理策略');
    if (recommendations.length === 0) recommendations.push('持續監控健康指標，維持良好的自我照護');

    return {
      overall,
      severity: { trend: severityTrend, change: getTrendChange(severityTrend) },
      frequency: { trend: frequencyTrend, change: getTrendChange(frequencyTrend) },
      activity: { trend: activityTrend, change: getTrendChange(activityTrend) },
      mood: { trend: moodTrend, change: getTrendChange(moodTrend) },
      sleep: { trend: sleepTrend, change: getTrendChange(sleepTrend) },
      recommendations
    };
  }, [filteredHealthData]);

  // 健康指標統計
  const healthStats = useMemo(() => {
    if (filteredHealthData.length === 0) return null;

    const latest = filteredHealthData[filteredHealthData.length - 1];
    const averages = filteredHealthData.reduce(
      (acc, point) => ({
        severity: acc.severity + point.symptomSeverity,
        frequency: acc.frequency + point.symptomFrequency,
        activity: acc.activity + point.activityImpact,
        mood: acc.mood + point.moodImpact,
        stress: acc.stress + point.stressLevel,
        sleep: acc.sleep + point.sleepQuality,
        diet: acc.diet + point.dietCompliance
      }),
      { severity: 0, frequency: 0, activity: 0, mood: 0, stress: 0, sleep: 0, diet: 0 }
    );

    const count = filteredHealthData.length;
    Object.keys(averages).forEach(key => {
      averages[key as keyof typeof averages] /= count;
    });

    return { latest, averages };
  }, [filteredHealthData]);

  // 相關性矩陣數據
  const correlationMatrix = useMemo(() => {
    if (filteredHealthData.length < 10) return [];

    const metrics = ['symptomSeverity', 'activityImpact', 'moodImpact', 'stressLevel', 'sleepQuality', 'dietCompliance'];
    const correlations: Array<{ metric1: string; metric2: string; correlation: number }> = [];

    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const metric1 = metrics[i];
        const metric2 = metrics[j];

        const values1 = filteredHealthData.map(d => d[metric1 as keyof HealthDataPoint] as number);
        const values2 = filteredHealthData.map(d => d[metric2 as keyof HealthDataPoint] as number);

        // 簡化的皮爾森相關係數計算
        const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
        const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;

        let numerator = 0;
        let denominator1 = 0;
        let denominator2 = 0;

        for (let k = 0; k < values1.length; k++) {
          const diff1 = values1[k] - mean1;
          const diff2 = values2[k] - mean2;
          numerator += diff1 * diff2;
          denominator1 += diff1 * diff1;
          denominator2 += diff2 * diff2;
        }

        const correlation = numerator / Math.sqrt(denominator1 * denominator2);
        correlations.push({
          metric1,
          metric2,
          correlation: isNaN(correlation) ? 0 : correlation
        });
      }
    }

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }, [filteredHealthData]);

  const metricLabels = {
    symptomSeverity: '症狀嚴重程度',
    symptomFrequency: '症狀頻率',
    activityImpact: '活動影響',
    moodImpact: '心情影響',
    stressLevel: '壓力程度',
    sleepQuality: '睡眠品質',
    dietCompliance: '飲食遵循度',
    medicationAdherence: '用藥遵循度'
  };

  const renderOverviewDashboard = () => (
    <div className="space-y-6">
      {/* 趨勢摘要卡片 */}
      <div className={`p-6 rounded-lg border-l-4 ${
        trendSummary.overall === 'improving' ? 'bg-green-50 border-l-green-500' :
        trendSummary.overall === 'declining' ? 'bg-red-50 border-l-red-500' :
        'bg-blue-50 border-l-blue-500'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">整體趨勢</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            trendSummary.overall === 'improving' ? 'bg-green-100 text-green-800' :
            trendSummary.overall === 'declining' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {trendSummary.overall === 'improving' ? '改善中' :
             trendSummary.overall === 'declining' ? '需關注' : '穩定'}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-sm text-gray-600">症狀嚴重程度</div>
            <div className={`font-semibold ${trendSummary.severity.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {trendSummary.severity.change}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">活動影響</div>
            <div className={`font-semibold ${trendSummary.activity.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {trendSummary.activity.change}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">心情影響</div>
            <div className={`font-semibold ${trendSummary.mood.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {trendSummary.mood.change}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">個人化建議:</div>
          {trendSummary.recommendations.map((rec, index) => (
            <div key={index} className="text-sm text-gray-600 flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 健康指標統計 */}
      {healthStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-red-600">{healthStats.latest.symptomSeverity.toFixed(1)}</div>
            <div className="text-sm text-gray-600">當前症狀嚴重程度</div>
            <div className="text-xs text-gray-500 mt-1">
              平均: {healthStats.averages.severity.toFixed(1)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-orange-600">{healthStats.latest.activityImpact.toFixed(1)}</div>
            <div className="text-sm text-gray-600">當前活動影響</div>
            <div className="text-xs text-gray-500 mt-1">
              平均: {healthStats.averages.activity.toFixed(1)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-purple-600">{healthStats.latest.moodImpact.toFixed(1)}</div>
            <div className="text-sm text-gray-600">當前心情影響</div>
            <div className="text-xs text-gray-500 mt-1">
              平均: {healthStats.averages.mood.toFixed(1)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{healthStats.latest.sleepQuality.toFixed(1)}</div>
            <div className="text-sm text-gray-600">當前睡眠品質</div>
            <div className="text-xs text-gray-500 mt-1">
              平均: {healthStats.averages.sleep.toFixed(1)}
            </div>
          </div>
        </div>
      )}

      {/* 主要趨勢圖表 */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">健康指標趨勢</h3>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600">顯示指標:</div>
            <select
              multiple
              value={selectedMetrics}
              onChange={(e) => setSelectedMetrics(Array.from(e.target.selectedOptions, option => option.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              {Object.entries(metricLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            <LineChart data={filteredHealthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis domain={[0, 4]} />
              <Tooltip />
              <Legend />
              {selectedMetrics.map((metric, index) => (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={Object.values(COLORS)[index % Object.values(COLORS).length]}
                  strokeWidth={2}
                  name={metricLabels[metric as keyof typeof metricLabels]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 相關性分析 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">健康指標相關性</h3>
        <div className="space-y-3">
          {correlationMatrix.slice(0, 8).map((corr, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex-1">
                <div className="font-medium">
                  {metricLabels[corr.metric1 as keyof typeof metricLabels]} ↔ {metricLabels[corr.metric2 as keyof typeof metricLabels]}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`text-sm font-medium ${
                  Math.abs(corr.correlation) > 0.7 ? 'text-red-600' :
                  Math.abs(corr.correlation) > 0.4 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {(corr.correlation * 100).toFixed(0)}%
                </div>
                <div
                  className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden"
                >
                  <div
                    className={`h-full transition-all ${
                      Math.abs(corr.correlation) > 0.7 ? 'bg-red-500' :
                      Math.abs(corr.correlation) > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.abs(corr.correlation) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 週期性模式分析 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">週期性模式分析</h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer>
            <ComposedChart data={filteredHealthData.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="symptomFrequency" fill={COLORS.frequency} fillOpacity={0.8} name="症狀頻率" />
              <Line type="monotone" dataKey="symptomSeverity" stroke={COLORS.severity} strokeWidth={2} name="症狀嚴重程度" />
              <Line type="monotone" dataKey="sleepQuality" stroke={COLORS.sleep} strokeWidth={2} name="睡眠品質" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">健康趨勢儀表板</h1>
            <p className="text-gray-600 mt-2">
              基於 {filteredHealthData.length} 天數據的深度健康分析
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <label className="text-sm font-medium text-gray-700">時間範圍:</label>
              <select
                value={timeRange}
                onChange={(e) => onTimeRangeChange(e.target.value as typeof timeRange)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="7d">最近 7 天</option>
                <option value="30d">最近 30 天</option>
                <option value="90d">最近 90 天</option>
                <option value="180d">最近 180 天</option>
                <option value="all">全部數據</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 視圖導航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: '總覽儀表板' },
            { key: 'analysis', label: '症狀深度分析' },
            { key: 'correlations', label: '食物關聯性' },
            { key: 'predictions', label: '趨勢預測' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeView === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 內容區域 */}
      {activeView === 'overview' && renderOverviewDashboard()}

      {activeView === 'analysis' && (
        <SymptomAnalysisEngine
          records={symptomRecords}
          timeRange={timeRange}
        />
      )}

      {activeView === 'correlations' && (
        <SymptomFoodCorrelationAnalyzer
          foodEntries={foodEntries}
          symptomRecords={symptomRecords}
          timeWindow={24}
        />
      )}

      {activeView === 'predictions' && (
        <HealthTrendPredictor
          historicalData={filteredHealthData}
          predictionDays={14}
          metric="symptomSeverity"
        />
      )}
    </div>
  );
};

export default HealthTrendDashboard;