'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';

// 症狀嚴重程度映射
const SEVERITY_MAPPING = {
  1: { label: '輕微', color: '#22c55e', value: 25 },
  2: { label: '中等', color: '#f59e0b', value: 50 },
  3: { label: '嚴重', color: '#ef4444', value: 75 },
  4: { label: '極嚴重', color: '#dc2626', value: 100 }
};

// 活動影響程度映射
const ACTIVITY_IMPACT_MAPPING = {
  0: { label: '無影響', color: '#10b981' },
  1: { label: '輕微影響', color: '#f59e0b' },
  2: { label: '中等影響', color: '#f97316' },
  3: { label: '嚴重影響', color: '#ef4444' }
};

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
  sleepQuality: number;
  stressLevel: number;
}

interface SymptomAnalysisEngineProps {
  records: SymptomRecord[];
  timeRange: '7d' | '30d' | '90d' | '180d' | 'all';
}

interface SymptomPattern {
  symptom: string;
  frequency: number;
  averageSeverity: number;
  commonTriggers: string[];
  timePatterns: { hour: number; frequency: number }[];
  correlations: { symptom: string; correlation: number }[];
}

const SymptomAnalysisEngine: React.FC<SymptomAnalysisEngineProps> = ({
  records,
  timeRange
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'correlations' | 'trends' | 'predictions'>('overview');

  // 過濾時間範圍內的記錄
  const filteredRecords = useMemo(() => {
    if (timeRange === 'all') return records;

    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 180;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return records.filter(record => new Date(record.timestamp) >= cutoff);
  }, [records, timeRange]);

  // 症狀模式分析
  const symptomPatterns = useMemo((): SymptomPattern[] => {
    const symptomStats = new Map<string, {
      count: number;
      totalSeverity: number;
      triggers: string[];
      hours: number[];
      coOccurrences: Map<string, number>;
    }>();

    filteredRecords.forEach(record => {
      const hour = new Date(record.timestamp).getHours();

      record.symptoms.forEach(symptom => {
        if (!symptomStats.has(symptom)) {
          symptomStats.set(symptom, {
            count: 0,
            totalSeverity: 0,
            triggers: [],
            hours: [],
            coOccurrences: new Map()
          });
        }

        const stats = symptomStats.get(symptom)!;
        stats.count++;
        stats.totalSeverity += record.severity;
        stats.triggers.push(...record.triggers);
        stats.hours.push(hour);

        // 計算共現症狀
        record.symptoms.forEach(otherSymptom => {
          if (otherSymptom !== symptom) {
            stats.coOccurrences.set(
              otherSymptom,
              (stats.coOccurrences.get(otherSymptom) || 0) + 1
            );
          }
        });
      });
    });

    return Array.from(symptomStats.entries()).map(([symptom, stats]) => {
      // 觸發因子頻率分析
      const triggerCounts = new Map<string, number>();
      stats.triggers.forEach(trigger => {
        triggerCounts.set(trigger, (triggerCounts.get(trigger) || 0) + 1);
      });

      const commonTriggers = Array.from(triggerCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([trigger]) => trigger);

      // 時間模式分析
      const hourCounts = new Map<number, number>();
      stats.hours.forEach(hour => {
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });

      const timePatterns = Array.from(hourCounts.entries())
        .map(([hour, frequency]) => ({ hour, frequency }))
        .sort((a, b) => a.hour - b.hour);

      // 相關性分析
      const totalRecords = filteredRecords.length;
      const correlations = Array.from(stats.coOccurrences.entries())
        .map(([otherSymptom, coCount]) => {
          const correlation = (coCount / stats.count) * 100;
          return { symptom: otherSymptom, correlation };
        })
        .sort((a, b) => b.correlation - a.correlation)
        .slice(0, 3);

      return {
        symptom,
        frequency: stats.count,
        averageSeverity: stats.totalSeverity / stats.count,
        commonTriggers,
        timePatterns,
        correlations
      };
    }).sort((a, b) => b.frequency - a.frequency);
  }, [filteredRecords]);

  // 趨勢分析數據
  const trendData = useMemo(() => {
    const dailyStats = new Map<string, {
      date: string;
      totalSymptoms: number;
      averageSeverity: number;
      averageActivityImpact: number;
      averageMoodImpact: number;
      averageStressLevel: number;
      uniqueSymptoms: Set<string>;
    }>();

    filteredRecords.forEach(record => {
      const date = record.timestamp.split('T')[0];

      if (!dailyStats.has(date)) {
        dailyStats.set(date, {
          date,
          totalSymptoms: 0,
          averageSeverity: 0,
          averageActivityImpact: 0,
          averageMoodImpact: 0,
          averageStressLevel: 0,
          uniqueSymptoms: new Set()
        });
      }

      const stats = dailyStats.get(date)!;
      stats.totalSymptoms += record.symptoms.length;
      stats.averageSeverity += record.severity;
      stats.averageActivityImpact += record.activityImpact;
      stats.averageMoodImpact += record.moodImpact;
      stats.averageStressLevel += record.stressLevel;
      record.symptoms.forEach(s => stats.uniqueSymptoms.add(s));
    });

    const recordsByDate = new Map<string, number>();
    filteredRecords.forEach(record => {
      const date = record.timestamp.split('T')[0];
      recordsByDate.set(date, (recordsByDate.get(date) || 0) + 1);
    });

    return Array.from(dailyStats.entries()).map(([date, stats]) => {
      const recordCount = recordsByDate.get(date) || 1;
      return {
        date,
        totalSymptoms: stats.totalSymptoms,
        averageSeverity: Math.round((stats.averageSeverity / recordCount) * 10) / 10,
        averageActivityImpact: Math.round((stats.averageActivityImpact / recordCount) * 10) / 10,
        averageMoodImpact: Math.round((stats.averageMoodImpact / recordCount) * 10) / 10,
        averageStressLevel: Math.round((stats.averageStressLevel / recordCount) * 10) / 10,
        uniqueSymptoms: stats.uniqueSymptoms.size,
        symptomDiversity: Math.round((stats.uniqueSymptoms.size / stats.totalSymptoms) * 100) || 0
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredRecords]);

  // 症狀雷達圖數據
  const radarData = useMemo(() => {
    const categories = ['嚴重程度', '活動影響', '心情影響', '壓力程度', '睡眠品質', '持續時間'];

    return symptomPatterns.slice(0, 5).map(pattern => {
      const symptomRecords = filteredRecords.filter(r => r.symptoms.includes(pattern.symptom));
      const avgActivityImpact = symptomRecords.reduce((sum, r) => sum + r.activityImpact, 0) / symptomRecords.length;
      const avgMoodImpact = symptomRecords.reduce((sum, r) => sum + r.moodImpact, 0) / symptomRecords.length;
      const avgStressLevel = symptomRecords.reduce((sum, r) => sum + r.stressLevel, 0) / symptomRecords.length;
      const avgSleepQuality = symptomRecords.reduce((sum, r) => sum + r.sleepQuality, 0) / symptomRecords.length;
      const avgDuration = symptomRecords.reduce((sum, r) => sum + r.duration, 0) / symptomRecords.length;

      return {
        symptom: pattern.symptom,
        嚴重程度: pattern.averageSeverity * 25,
        活動影響: avgActivityImpact * 25,
        心情影響: avgMoodImpact * 25,
        壓力程度: avgStressLevel * 25,
        睡眠品質: (5 - avgSleepQuality) * 20, // 反向，睡眠品質越差分數越高
        持續時間: Math.min(avgDuration / 60 * 20, 100) // 轉換為百分比
      };
    });
  }, [symptomPatterns, filteredRecords]);

  // 相關性矩陣數據
  const correlationMatrix = useMemo(() => {
    const symptoms = symptomPatterns.slice(0, 8).map(p => p.symptom);
    const matrix: Array<{ symptom1: string; symptom2: string; correlation: number }> = [];

    for (let i = 0; i < symptoms.length; i++) {
      for (let j = i + 1; j < symptoms.length; j++) {
        const symptom1 = symptoms[i];
        const symptom2 = symptoms[j];

        // 計算共現次數
        const coOccurrences = filteredRecords.filter(record =>
          record.symptoms.includes(symptom1) && record.symptoms.includes(symptom2)
        ).length;

        const symptom1Count = filteredRecords.filter(r => r.symptoms.includes(symptom1)).length;
        const symptom2Count = filteredRecords.filter(r => r.symptoms.includes(symptom2)).length;

        // Jaccard 相似度
        const union = symptom1Count + symptom2Count - coOccurrences;
        const correlation = union > 0 ? (coOccurrences / union) * 100 : 0;

        matrix.push({ symptom1, symptom2, correlation: Math.round(correlation * 10) / 10 });
      }
    }

    return matrix.sort((a, b) => b.correlation - a.correlation);
  }, [symptomPatterns, filteredRecords]);

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* 總體統計 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{filteredRecords.length}</div>
          <div className="text-sm text-blue-600">總記錄數</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {new Set(filteredRecords.flatMap(r => r.symptoms)).size}
          </div>
          <div className="text-sm text-green-600">不同症狀</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {filteredRecords.length > 0 ?
              Math.round((filteredRecords.reduce((sum, r) => sum + r.severity, 0) / filteredRecords.length) * 10) / 10
              : 0
            }
          </div>
          <div className="text-sm text-orange-600">平均嚴重程度</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(filteredRecords.flatMap(r => r.triggers)).size}
          </div>
          <div className="text-sm text-purple-600">識別觸發因子</div>
        </div>
      </div>

      {/* 症狀頻率圖表 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">症狀頻率分析</h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer>
            <BarChart data={symptomPatterns.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="symptom"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="frequency" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 嚴重程度分佈 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">嚴重程度分佈</h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                dataKey="value"
                data={[1, 2, 3, 4].map(severity => ({
                  name: SEVERITY_MAPPING[severity as keyof typeof SEVERITY_MAPPING].label,
                  value: filteredRecords.filter(r => r.severity === severity).length,
                  fill: SEVERITY_MAPPING[severity as keyof typeof SEVERITY_MAPPING].color
                }))}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {[1, 2, 3, 4].map((severity, index) => (
                  <Cell
                    key={severity}
                    fill={SEVERITY_MAPPING[severity as keyof typeof SEVERITY_MAPPING].color}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderPatternsTab = () => (
    <div className="space-y-6">
      {/* 症狀雷達圖 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">症狀影響雷達圖</h3>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            <RadarChart data={radarData.length > 0 ? radarData[0] ?
              Object.keys(radarData[0]).filter(key => key !== 'symptom').map(category => ({
                category,
                ...radarData.reduce((acc, symptom) => ({
                  ...acc,
                  [symptom.symptom]: symptom[category as keyof typeof symptom] || 0
                }), {})
              })) : [] : []}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis angle={0} domain={[0, 100]} />
              {radarData.slice(0, 3).map((symptom, index) => (
                <Radar
                  key={symptom.symptom}
                  name={symptom.symptom}
                  dataKey={symptom.symptom}
                  stroke={['#3b82f6', '#ef4444', '#10b981'][index]}
                  fill={['#3b82f6', '#ef4444', '#10b981'][index]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 時間模式分析 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">症狀發生時間模式</h3>
        <div className="space-y-4">
          {symptomPatterns.slice(0, 3).map(pattern => (
            <div key={pattern.symptom} className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium">{pattern.symptom}</h4>
              <div style={{ width: '100%', height: '150px' }} className="mt-2">
                <ResponsiveContainer>
                  <AreaChart data={pattern.timePatterns}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" domain={[0, 23]} />
                    <YAxis />
                    <Tooltip labelFormatter={(hour) => `${hour}:00`} />
                    <Area
                      type="monotone"
                      dataKey="frequency"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 常見觸發因子 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">症狀觸發因子分析</h3>
        <div className="space-y-4">
          {symptomPatterns.slice(0, 5).map(pattern => (
            <div key={pattern.symptom} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium">{pattern.symptom}</div>
                <div className="text-sm text-gray-600">
                  主要觸發因子: {pattern.commonTriggers.slice(0, 3).join(', ')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">頻率: {pattern.frequency}</div>
                <div className="text-sm text-gray-600">
                  平均嚴重度: {Math.round(pattern.averageSeverity * 10) / 10}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCorrelationsTab = () => (
    <div className="space-y-6">
      {/* 症狀相關性矩陣 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">症狀相關性分析</h3>
        <div className="space-y-3">
          {correlationMatrix.slice(0, 10).map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex-1">
                <div className="font-medium">{item.symptom1} ↔ {item.symptom2}</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-sm font-medium">{item.correlation}%</div>
                <div
                  className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${item.correlation}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 症狀共現散點圖 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">症狀嚴重程度與影響關係</h3>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            <ScatterChart>
              <CartesianGrid />
              <XAxis
                dataKey="severity"
                domain={[0, 4]}
                label={{ value: '嚴重程度', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                dataKey="activityImpact"
                domain={[0, 3]}
                label={{ value: '活動影響', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value, name) => [value, name === 'activityImpact' ? '活動影響' : '嚴重程度']}
              />
              <Scatter
                data={filteredRecords.map(record => ({
                  severity: record.severity,
                  activityImpact: record.activityImpact
                }))}
                fill="#3b82f6"
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderTrendsTab = () => (
    <div className="space-y-6">
      {/* 症狀趨勢圖 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">症狀趨勢分析</h3>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="averageSeverity"
                stroke="#ef4444"
                strokeWidth={2}
                name="平均嚴重程度"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="averageActivityImpact"
                stroke="#f59e0b"
                strokeWidth={2}
                name="活動影響"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="uniqueSymptoms"
                stroke="#10b981"
                strokeWidth={2}
                name="症狀種類"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 症狀多樣性趨勢 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">症狀複雜度趨勢</h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="totalSymptoms"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
                name="總症狀數"
              />
              <Area
                type="monotone"
                dataKey="uniqueSymptoms"
                stackId="2"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="不同症狀數"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderPredictionsTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">症狀預測分析</h3>

        {/* 風險預測 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700">基於模式的風險預測</h4>
          {symptomPatterns.slice(0, 3).map(pattern => {
            const riskLevel = pattern.frequency > 10 ? 'high' : pattern.frequency > 5 ? 'medium' : 'low';
            const riskColor = riskLevel === 'high' ? 'text-red-600' : riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600';

            return (
              <div key={pattern.symptom} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{pattern.symptom}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      基於過去 {pattern.frequency} 次記錄的分析
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${riskColor}`}>
                    {riskLevel === 'high' ? '高風險' : riskLevel === 'medium' ? '中風險' : '低風險'}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-600">預期嚴重程度:</span>
                    <span className="ml-2 font-medium">
                      {Math.round(pattern.averageSeverity * 10) / 10}/4
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">主要風險時段:</span>
                    <span className="ml-2">
                      {pattern.timePatterns
                        .sort((a, b) => b.frequency - a.frequency)
                        .slice(0, 2)
                        .map(t => `${t.hour}:00`)
                        .join(', ')}
                    </span>
                  </div>
                  {pattern.commonTriggers.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-600">建議避免:</span>
                      <span className="ml-2">{pattern.commonTriggers[0]}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 改善建議 */}
        <div className="mt-8">
          <h4 className="font-medium text-gray-700 mb-4">個人化改善建議</h4>
          <div className="space-y-3">
            {trendData.length > 7 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-800">趨勢分析建議</div>
                <div className="text-sm text-blue-700 mt-1">
                  {(() => {
                    const recentWeek = trendData.slice(-7);
                    const previousWeek = trendData.slice(-14, -7);
                    const recentAvg = recentWeek.reduce((sum, d) => sum + d.averageSeverity, 0) / recentWeek.length;
                    const previousAvg = previousWeek.length > 0
                      ? previousWeek.reduce((sum, d) => sum + d.averageSeverity, 0) / previousWeek.length
                      : recentAvg;

                    if (recentAvg > previousAvg + 0.5) {
                      return "症狀嚴重程度呈上升趨勢，建議加強預防措施並考慮就醫";
                    } else if (recentAvg < previousAvg - 0.5) {
                      return "症狀嚴重程度有改善趨勢，繼續保持當前的管理方式";
                    } else {
                      return "症狀保持穩定，可以考慮調整管理策略以進一步改善";
                    }
                  })()}
                </div>
              </div>
            )}

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="font-medium text-green-800">生活方式建議</div>
              <div className="text-sm text-green-700 mt-1">
                基於您的症狀模式，建議在 {
                  symptomPatterns[0]?.timePatterns
                    .sort((a, b) => b.frequency - a.frequency)[0]?.hour || 12
                }:00 前後時段特別注意預防措施
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">症狀智能分析系統</h2>
        <p className="text-gray-600 mt-2">
          基於 {filteredRecords.length} 條記錄的深度分析報告 ({timeRange === 'all' ? '全部' : timeRange})
        </p>
      </div>

      {/* 標籤導航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: '總覽分析' },
            { key: 'patterns', label: '模式識別' },
            { key: 'correlations', label: '相關性' },
            { key: 'trends', label: '趨勢分析' },
            { key: 'predictions', label: '預測建議' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
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
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'patterns' && renderPatternsTab()}
      {activeTab === 'correlations' && renderCorrelationsTab()}
      {activeTab === 'trends' && renderTrendsTab()}
      {activeTab === 'predictions' && renderPredictionsTab()}
    </div>
  );
};

export default SymptomAnalysisEngine;