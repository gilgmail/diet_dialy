'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, BarChart, Bar, HeatMapGrid
} from 'recharts';

interface FoodEntry {
  id: string;
  timestamp: string;
  foodName: string;
  category: string;
  amount: number;
  medicalScore: number;
  riskFactors: string[];
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
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
}

interface SymptomFoodCorrelationAnalyzerProps {
  foodEntries: FoodEntry[];
  symptomRecords: SymptomRecord[];
  timeWindow: number; // 分析時間窗口（小時）
}

interface CorrelationResult {
  food: string;
  symptom: string;
  correlation: number;
  confidence: number;
  occurrences: number;
  avgTimeLag: number; // 平均延遲時間（小時）
  riskLevel: 'low' | 'medium' | 'high';
}

interface FoodRiskProfile {
  food: string;
  category: string;
  totalCorrelations: number;
  highRiskSymptoms: string[];
  mediumRiskSymptoms: string[];
  lowRiskSymptoms: string[];
  overallRiskScore: number;
  recommendedAction: string;
}

const SymptomFoodCorrelationAnalyzer: React.FC<SymptomFoodCorrelationAnalyzerProps> = ({
  foodEntries,
  symptomRecords,
  timeWindow = 24
}) => {
  const [activeTab, setActiveTab] = useState<'correlations' | 'profiles' | 'timeline' | 'recommendations'>('correlations');
  const [selectedTimeWindow, setSelectedTimeWindow] = useState(timeWindow);
  const [minCorrelationThreshold, setMinCorrelationThreshold] = useState(0.3);

  // 計算食物與症狀的相關性
  const correlationResults = useMemo((): CorrelationResult[] => {
    const correlations: CorrelationResult[] = [];
    const uniqueFoods = [...new Set(foodEntries.map(entry => entry.foodName))];
    const uniqueSymptoms = [...new Set(symptomRecords.flatMap(record => record.symptoms))];

    uniqueFoods.forEach(food => {
      uniqueSymptoms.forEach(symptom => {
        const foodTimestamps = foodEntries
          .filter(entry => entry.foodName === food)
          .map(entry => new Date(entry.timestamp).getTime());

        const symptomTimestamps = symptomRecords
          .filter(record => record.symptoms.includes(symptom))
          .map(record => ({
            timestamp: new Date(record.timestamp).getTime(),
            severity: record.severity
          }));

        // 計算在時間窗口內的相關性
        let correlatedOccurrences = 0;
        let totalTimeLag = 0;
        let severitySum = 0;

        foodTimestamps.forEach(foodTime => {
          symptomTimestamps.forEach(symptomData => {
            const timeDiff = symptomData.timestamp - foodTime;
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (hoursDiff >= 0 && hoursDiff <= selectedTimeWindow) {
              correlatedOccurrences++;
              totalTimeLag += hoursDiff;
              severitySum += symptomData.severity;
            }
          });
        });

        if (correlatedOccurrences > 0) {
          const avgTimeLag = totalTimeLag / correlatedOccurrences;
          const avgSeverity = severitySum / correlatedOccurrences;

          // 計算相關性強度（基於頻率和嚴重程度）
          const foodFrequency = foodTimestamps.length;
          const symptomFrequency = symptomTimestamps.length;
          const expectedCoOccurrence = (foodFrequency * symptomFrequency) / (foodEntries.length + symptomRecords.length);

          const correlation = correlatedOccurrences > expectedCoOccurrence
            ? Math.min((correlatedOccurrences - expectedCoOccurrence) / expectedCoOccurrence * avgSeverity / 4, 1)
            : 0;

          // 計算置信度
          const confidence = Math.min(correlatedOccurrences / Math.max(foodFrequency, symptomFrequency, 1), 1);

          // 風險等級評估
          let riskLevel: 'low' | 'medium' | 'high' = 'low';
          if (correlation > 0.7 && confidence > 0.5) riskLevel = 'high';
          else if (correlation > 0.4 && confidence > 0.3) riskLevel = 'medium';

          if (correlation >= minCorrelationThreshold) {
            correlations.push({
              food,
              symptom,
              correlation: Math.round(correlation * 1000) / 1000,
              confidence: Math.round(confidence * 1000) / 1000,
              occurrences: correlatedOccurrences,
              avgTimeLag: Math.round(avgTimeLag * 10) / 10,
              riskLevel
            });
          }
        }
      });
    });

    return correlations.sort((a, b) => b.correlation - a.correlation);
  }, [foodEntries, symptomRecords, selectedTimeWindow, minCorrelationThreshold]);

  // 建立食物風險檔案
  const foodRiskProfiles = useMemo((): FoodRiskProfile[] => {
    const profiles = new Map<string, FoodRiskProfile>();

    correlationResults.forEach(result => {
      if (!profiles.has(result.food)) {
        const foodCategory = foodEntries.find(entry => entry.foodName === result.food)?.category || '未分類';
        profiles.set(result.food, {
          food: result.food,
          category: foodCategory,
          totalCorrelations: 0,
          highRiskSymptoms: [],
          mediumRiskSymptoms: [],
          lowRiskSymptoms: [],
          overallRiskScore: 0,
          recommendedAction: ''
        });
      }

      const profile = profiles.get(result.food)!;
      profile.totalCorrelations++;

      if (result.riskLevel === 'high') {
        profile.highRiskSymptoms.push(result.symptom);
      } else if (result.riskLevel === 'medium') {
        profile.mediumRiskSymptoms.push(result.symptom);
      } else {
        profile.lowRiskSymptoms.push(result.symptom);
      }
    });

    // 計算整體風險分數和建議
    profiles.forEach(profile => {
      const highRiskWeight = profile.highRiskSymptoms.length * 3;
      const mediumRiskWeight = profile.mediumRiskSymptoms.length * 2;
      const lowRiskWeight = profile.lowRiskSymptoms.length * 1;

      profile.overallRiskScore = (highRiskWeight + mediumRiskWeight + lowRiskWeight) / profile.totalCorrelations;

      if (profile.overallRiskScore >= 2.5) {
        profile.recommendedAction = '建議避免或大幅減少攝取';
      } else if (profile.overallRiskScore >= 1.5) {
        profile.recommendedAction = '建議謹慎攝取，觀察症狀變化';
      } else {
        profile.recommendedAction = '可適量攝取，持續監控';
      }
    });

    return Array.from(profiles.values()).sort((a, b) => b.overallRiskScore - a.overallRiskScore);
  }, [correlationResults, foodEntries]);

  // 時間線分析數據
  const timelineData = useMemo(() => {
    const timeline = new Map<string, {
      date: string;
      foodEntries: number;
      symptomOccurrences: number;
      avgSeverity: number;
      correlationEvents: number;
    }>();

    // 初始化時間線
    const startDate = new Date(Math.min(
      ...foodEntries.map(entry => new Date(entry.timestamp).getTime()),
      ...symptomRecords.map(record => new Date(record.timestamp).getTime())
    ));
    const endDate = new Date();

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      timeline.set(dateStr, {
        date: dateStr,
        foodEntries: 0,
        symptomOccurrences: 0,
        avgSeverity: 0,
        correlationEvents: 0
      });
    }

    // 填充食物數據
    foodEntries.forEach(entry => {
      const date = entry.timestamp.split('T')[0];
      const data = timeline.get(date);
      if (data) {
        data.foodEntries++;
      }
    });

    // 填充症狀數據
    const severityByDate = new Map<string, number[]>();
    symptomRecords.forEach(record => {
      const date = record.timestamp.split('T')[0];
      const data = timeline.get(date);
      if (data) {
        data.symptomOccurrences += record.symptoms.length;

        if (!severityByDate.has(date)) {
          severityByDate.set(date, []);
        }
        severityByDate.get(date)!.push(record.severity);
      }
    });

    // 計算平均嚴重程度
    severityByDate.forEach((severities, date) => {
      const data = timeline.get(date);
      if (data && severities.length > 0) {
        data.avgSeverity = severities.reduce((sum, s) => sum + s, 0) / severities.length;
      }
    });

    // 統計相關性事件
    correlationResults.forEach(result => {
      const foodDates = foodEntries
        .filter(entry => entry.foodName === result.food)
        .map(entry => entry.timestamp.split('T')[0]);

      foodDates.forEach(date => {
        const data = timeline.get(date);
        if (data && result.riskLevel !== 'low') {
          data.correlationEvents++;
        }
      });
    });

    return Array.from(timeline.values()).slice(-30); // 最近30天
  }, [foodEntries, symptomRecords, correlationResults]);

  const renderCorrelationsTab = () => (
    <div className="space-y-6">
      {/* 控制面板 */}
      <div className="bg-gray-50 p-4 rounded-lg flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <label htmlFor="time-window-select" className="text-sm font-medium text-gray-700">
            時間窗口:
          </label>
          <div className="flex items-center space-x-1">
            <select
              id="time-window-select"
              value={selectedTimeWindow}
              onChange={(e) => setSelectedTimeWindow(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
              aria-label="時間窗口 (小時)"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={72}>72</option>
            </select>
            <span className="text-sm text-gray-500" aria-hidden="true">小時</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">相關性閾值:</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={minCorrelationThreshold}
            onChange={(e) => setMinCorrelationThreshold(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-gray-600">{minCorrelationThreshold}</span>
        </div>
      </div>

      {/* 相關性列表 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b">
          <h3 className="font-semibold text-gray-800">相關性分析結果</h3>
          <p className="text-sm text-gray-600">
            發現 {correlationResults.length} 個潛在關聯，附信心水準百分比評估
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {correlationResults.map((result, index) => (
            <div key={index} className={`p-4 border-b border-gray-100 ${
              result.riskLevel === 'high' ? 'bg-red-50 border-l-4 border-l-red-500' :
              result.riskLevel === 'medium' ? 'bg-yellow-50 border-l-4 border-l-yellow-500' :
              'bg-green-50 border-l-4 border-l-green-500'
            }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {result.food} → {result.symptom}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    平均延遲時間: {result.avgTimeLag} 小時 |
                    發生次數: {result.occurrences} 次 |
                    信心水準: {(result.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    result.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                    result.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {result.riskLevel === 'high' ? '高風險' :
                     result.riskLevel === 'medium' ? '中風險' : '低風險'}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {(result.correlation * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">相關性</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 相關性散點圖 */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">相關性 vs 置信度分布圖</h3>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="correlation"
                domain={[0, 1]}
                label={{ value: '相關性', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                dataKey="confidence"
                domain={[0, 1]}
                label={{ value: '信心水準', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value, name) => [
                  typeof value === 'number' ? (value * 100).toFixed(1) + '%' : value,
                  name === 'correlation' ? '相關性' : '信心水準'
                ]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    const data = payload[0].payload;
                    return `${data.food} → ${data.symptom}`;
                  }
                  return '';
                }}
              />
              <Scatter
                data={correlationResults.map(r => ({
                  correlation: r.correlation,
                  confidence: r.confidence,
                  food: r.food,
                  symptom: r.symptom,
                  fill: r.riskLevel === 'high' ? '#ef4444' :
                        r.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
                }))}
                fill="#3b82f6"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderProfilesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b">
          <h3 className="font-semibold text-gray-800">食物風險檔案</h3>
          <p className="text-sm text-gray-600">根據症狀相關性建立的食物風險評估</p>
        </div>

        <div className="divide-y divide-gray-200">
          {foodRiskProfiles.map((profile, index) => (
            <div key={index} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{profile.food}</h4>
                  <div className="text-sm text-gray-600">{profile.category}</div>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    profile.overallRiskScore >= 2.5 ? 'bg-red-100 text-red-800' :
                    profile.overallRiskScore >= 1.5 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    風險分數: {profile.overallRiskScore.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {profile.highRiskSymptoms.length > 0 && (
                  <div className="bg-red-50 p-3 rounded border-l-4 border-red-500">
                    <div className="text-sm font-medium text-red-800 mb-1">高風險症狀</div>
                    <div className="text-sm text-red-700">
                      {profile.highRiskSymptoms.join(', ')}
                    </div>
                  </div>
                )}
                {profile.mediumRiskSymptoms.length > 0 && (
                  <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-500">
                    <div className="text-sm font-medium text-yellow-800 mb-1">中風險症狀</div>
                    <div className="text-sm text-yellow-700">
                      {profile.mediumRiskSymptoms.join(', ')}
                    </div>
                  </div>
                )}
                {profile.lowRiskSymptoms.length > 0 && (
                  <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                    <div className="text-sm font-medium text-green-800 mb-1">低風險症狀</div>
                    <div className="text-sm text-green-700">
                      {profile.lowRiskSymptoms.join(', ')}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm font-medium text-blue-800 mb-1">建議行動</div>
                <div className="text-sm text-blue-700">{profile.recommendedAction}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTimelineTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">食物攝取與症狀時間線（最近30天）</h3>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            <LineChart data={timelineData}>
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
                dataKey="foodEntries"
                stroke="#3b82f6"
                strokeWidth={2}
                name="食物攝取次數"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="symptomOccurrences"
                stroke="#ef4444"
                strokeWidth={2}
                name="症狀發生次數"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgSeverity"
                stroke="#f59e0b"
                strokeWidth={2}
                name="平均嚴重程度"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="correlationEvents"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="相關性事件"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">每日食物風險暴露</h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer>
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="correlationEvents" fill="#ef4444" name="高風險食物攝取" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderRecommendationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">個人化飲食建議</h3>

        {/* 避免食物清單 */}
        <div className="mb-6">
          <h4 className="font-medium text-red-700 mb-3">🚫 建議避免的食物</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {foodRiskProfiles
              .filter(profile => profile.overallRiskScore >= 2.5)
              .map((profile, index) => (
                <div key={index} className="bg-red-50 p-3 rounded border border-red-200">
                  <div className="font-medium text-red-800">{profile.food}</div>
                  <div className="text-sm text-red-600 mt-1">
                    主要關聯症狀: {profile.highRiskSymptoms.slice(0, 2).join(', ')}
                    {profile.highRiskSymptoms.length > 2 && '...'}
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 謹慎攝取食物 */}
        <div className="mb-6">
          <h4 className="font-medium text-yellow-700 mb-3">⚠️ 謹慎攝取的食物</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {foodRiskProfiles
              .filter(profile => profile.overallRiskScore >= 1.5 && profile.overallRiskScore < 2.5)
              .map((profile, index) => (
                <div key={index} className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <div className="font-medium text-yellow-800">{profile.food}</div>
                  <div className="text-sm text-yellow-600 mt-1">
                    建議小量攝取，密切觀察症狀變化
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 安全食物清單 */}
        <div className="mb-6">
          <h4 className="font-medium text-green-700 mb-3">✅ 相對安全的食物</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {foodRiskProfiles
              .filter(profile => profile.overallRiskScore < 1.5)
              .slice(0, 8)
              .map((profile, index) => (
                <div key={index} className="bg-green-50 p-3 rounded border border-green-200">
                  <div className="font-medium text-green-800">{profile.food}</div>
                  <div className="text-sm text-green-600 mt-1">
                    可適量攝取，持續監控
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* 時間建議 */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-700 mb-3">⏰ 攝取時間建議</h4>
          <div className="space-y-2 text-sm text-blue-700">
            <div>• 避免在症狀高發時段前 {selectedTimeWindow} 小時內攝取高風險食物</div>
            <div>• 新食物試驗建議安排在症狀較少的時段</div>
            <div>• 記錄食物攝取時間，有助於建立個人化的安全時間表</div>
          </div>
        </div>

        {/* 追蹤建議 */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h4 className="font-medium text-purple-700 mb-3">📊 追蹤改善建議</h4>
          <div className="space-y-2 text-sm text-purple-700">
            <div>• 建議追蹤期間: 至少 {Math.max(14, correlationResults.length > 0 ? Math.ceil(correlationResults[0].avgTimeLag * 2) : 14)} 天</div>
            <div>• 每次攝取高風險食物後，密切觀察 {selectedTimeWindow} 小時內的症狀變化</div>
            <div>• 定期檢視相關性分析結果，調整飲食策略</div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { key: 'correlations', label: '相關性分析', render: renderCorrelationsTab },
    { key: 'profiles', label: '食物風險檔案（總覽）', render: renderProfilesTab },
    { key: 'timeline', label: '時間線分析', render: renderTimelineTab },
    { key: 'recommendations', label: '飲食建議', render: renderRecommendationsTab }
  ] as const;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">食物症狀相關性分析</h2>
        <p className="text-gray-600 mt-2">
          分析 {foodEntries.length} 條飲食記錄與 {symptomRecords.length} 條症狀記錄的關聯性
        </p>
      </div>

      {/* 標籤導航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" role="tablist" aria-label="食物症狀分析選項">
          {tabs.map(tab => (
            <button
              key={tab.key}
              role="tab"
              id={`tab-${tab.key}`}
              aria-controls={`panel-${tab.key}`}
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
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
      {tabs.map(tab => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`panel-${tab.key}`}
          aria-labelledby={`tab-${tab.key}`}
          hidden={activeTab !== tab.key}
          className={activeTab === tab.key ? '' : 'hidden'}
        >
          {activeTab === tab.key ? tab.render() : null}
        </div>
      ))}
    </div>
  );
};

export default SymptomFoodCorrelationAnalyzer;
