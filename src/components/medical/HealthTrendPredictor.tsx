'use client';

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, ReferenceLine
} from 'recharts';

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
}

interface PredictionResult {
  date: string;
  predicted: number;
  confidence: number;
  factors: {
    trend: number;
    seasonal: number;
    cyclical: number;
    external: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

interface HealthTrendPredictorProps {
  historicalData: HealthDataPoint[];
  predictionDays: number;
  metric: 'symptomSeverity' | 'symptomFrequency' | 'activityImpact' | 'moodImpact';
}

const HealthTrendPredictor: React.FC<HealthTrendPredictorProps> = ({
  historicalData,
  predictionDays = 14,
  metric = 'symptomSeverity'
}) => {
  const [selectedMetric, setSelectedMetric] = useState<typeof metric>(metric);
  const [predictionHorizon, setPredictionHorizon] = useState(predictionDays);
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true);

  // 簡化的趨勢分析和預測算法
  const trendAnalysis = useMemo(() => {
    if (historicalData.length < 7) return null;

    const sortedData = [...historicalData].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // 計算移動平均
    const movingAverage = (data: number[], window: number) => {
      const result: number[] = [];
      for (let i = window - 1; i < data.length; i++) {
        const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / window);
      }
      return result;
    };

    // 計算線性趨勢
    const calculateTrend = (values: number[]) => {
      const n = values.length;
      const x = Array.from({ length: n }, (_, i) => i);
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
      const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      return { slope, intercept };
    };

    // 檢測季節性模式（簡化版）
    const detectSeasonality = (values: number[]) => {
      const weeklyPattern = Array(7).fill(0);
      const weeklyCounts = Array(7).fill(0);

      sortedData.forEach((point, index) => {
        const dayOfWeek = new Date(point.date).getDay();
        weeklyPattern[dayOfWeek] += values[index];
        weeklyCounts[dayOfWeek]++;
      });

      return weeklyPattern.map((sum, i) =>
        weeklyCounts[i] > 0 ? sum / weeklyCounts[i] : 0
      );
    };

    const values = sortedData.map(point => point[selectedMetric]);
    const trend = calculateTrend(values);
    const ma7 = movingAverage(values, 7);
    const ma14 = movingAverage(values, Math.min(14, values.length));
    const seasonality = detectSeasonality(values);

    // 計算變異性指標
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    // 計算趨勢強度
    const trendStrength = Math.abs(trend.slope) / (volatility + 0.01);

    return {
      trend,
      ma7: ma7.slice(-7),
      ma14: ma14.slice(-7),
      seasonality,
      volatility,
      mean,
      trendStrength,
      recentTrend: ma7.length >= 2 ? ma7[ma7.length - 1] - ma7[ma7.length - 2] : 0
    };
  }, [historicalData, selectedMetric]);

  // 生成預測數據
  const predictions = useMemo((): PredictionResult[] => {
    if (!trendAnalysis || historicalData.length < 7) return [];

    const predictions: PredictionResult[] = [];
    const lastDate = new Date(Math.max(...historicalData.map(d => new Date(d.date).getTime())));
    const baseValue = trendAnalysis.ma7[trendAnalysis.ma7.length - 1] || trendAnalysis.mean;

    for (let i = 1; i <= predictionHorizon; i++) {
      const futureDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfWeek = futureDate.getDay();

      // 基本趨勢預測
      const trendComponent = trendAnalysis.trend.slope * i;

      // 季節性調整
      const seasonalComponent = (trendAnalysis.seasonality[dayOfWeek] - trendAnalysis.mean) * 0.3;

      // 週期性調整（簡化）
      const cyclicalComponent = Math.sin(2 * Math.PI * i / 7) * trendAnalysis.volatility * 0.2;

      // 外部因子（隨機波動）
      const externalComponent = (Math.random() - 0.5) * trendAnalysis.volatility * 0.1;

      const predicted = Math.max(0, Math.min(4,
        baseValue + trendComponent + seasonalComponent + cyclicalComponent + externalComponent
      ));

      // 置信度計算（基於數據穩定性和預測距離）
      const dataStability = 1 / (1 + trendAnalysis.volatility);
      const timeDecay = Math.exp(-i / predictionHorizon);
      const confidence = Math.max(0.1, Math.min(1, dataStability * timeDecay));

      // 風險等級評估
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (predicted > trendAnalysis.mean + trendAnalysis.volatility) {
        riskLevel = predicted > trendAnalysis.mean + 2 * trendAnalysis.volatility ? 'high' : 'medium';
      }

      // 生成建議
      const recommendations: string[] = [];
      if (trendAnalysis.recentTrend > 0.2) {
        recommendations.push('症狀呈上升趨勢，建議加強預防措施');
      }
      if (riskLevel === 'high') {
        recommendations.push('高風險期，建議避免已知觸發因子');
      }
      if (dayOfWeek === 1 || dayOfWeek === 0) { // 週末
        recommendations.push('週末期間注意生活作息規律');
      }

      predictions.push({
        date: futureDate.toISOString().split('T')[0],
        predicted: Math.round(predicted * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        factors: {
          trend: Math.round(trendComponent * 100) / 100,
          seasonal: Math.round(seasonalComponent * 100) / 100,
          cyclical: Math.round(cyclicalComponent * 100) / 100,
          external: Math.round(externalComponent * 100) / 100
        },
        riskLevel,
        recommendations
      });
    }

    return predictions;
  }, [trendAnalysis, predictionHorizon, historicalData]);

  // 合併歷史和預測數據用於圖表
  const chartData = useMemo(() => {
    const historical = historicalData
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(point => ({
        date: point.date,
        actual: point[selectedMetric],
        predicted: null,
        upperBound: null,
        lowerBound: null,
        confidence: null,
        type: 'historical'
      }));

    const predicted = predictions.map(pred => ({
      date: pred.date,
      actual: null,
      predicted: pred.predicted,
      upperBound: showConfidenceInterval ?
        pred.predicted + (1 - pred.confidence) * (trendAnalysis?.volatility || 1) : null,
      lowerBound: showConfidenceInterval ?
        Math.max(0, pred.predicted - (1 - pred.confidence) * (trendAnalysis?.volatility || 1)) : null,
      confidence: pred.confidence,
      type: 'prediction'
    }));

    return [...historical, ...predicted];
  }, [historicalData, predictions, selectedMetric, showConfidenceInterval, trendAnalysis]);

  // 風險警報
  const riskAlerts = useMemo(() => {
    const alerts: Array<{ date: string; level: string; message: string }> = [];

    predictions.forEach(pred => {
      if (pred.riskLevel === 'high') {
        alerts.push({
          date: pred.date,
          level: 'high',
          message: `預測高風險期：${pred.date}，預期${selectedMetric}為 ${pred.predicted}`
        });
      }
    });

    // 趨勢警報
    if (trendAnalysis && trendAnalysis.recentTrend > 0.5) {
      alerts.push({
        date: 'trend',
        level: 'warning',
        message: '檢測到症狀惡化趨勢，建議檢討近期生活方式變化'
      });
    }

    return alerts;
  }, [predictions, trendAnalysis, selectedMetric]);

  const metricLabels = {
    symptomSeverity: '症狀嚴重程度',
    symptomFrequency: '症狀頻率',
    activityImpact: '活動影響',
    moodImpact: '心情影響'
  };

  if (!trendAnalysis) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800 font-medium">數據不足</div>
          <div className="text-yellow-700 text-sm mt-1">
            需要至少7天的歷史數據才能進行趨勢預測分析
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">健康趨勢預測分析</h2>
        <p className="text-gray-600 mt-2">
          基於 {historicalData.length} 天歷史數據的智能預測
        </p>
      </div>

      {/* 控制面板 */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">預測指標:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as typeof selectedMetric)}
            className="border rounded px-3 py-1 text-sm"
          >
            {Object.entries(metricLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">預測天數:</label>
          <input
            type="number"
            min="1"
            max="30"
            value={predictionHorizon}
            onChange={(e) => setPredictionHorizon(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm w-16"
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showConfidence"
            checked={showConfidenceInterval}
            onChange={(e) => setShowConfidenceInterval(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="showConfidence" className="text-sm text-gray-700">
            顯示置信區間
          </label>
        </div>
      </div>

      {/* 風險警報 */}
      {riskAlerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">風險警報</h3>
          <div className="space-y-2">
            {riskAlerts.map((alert, index) => (
              <div key={index} className={`p-3 rounded border-l-4 ${
                alert.level === 'high' ? 'bg-red-50 border-l-red-500 text-red-700' :
                alert.level === 'warning' ? 'bg-yellow-50 border-l-yellow-500 text-yellow-700' :
                'bg-blue-50 border-l-blue-500 text-blue-700'
              }`}>
                <div className="text-sm font-medium">{alert.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 主要趨勢圖 */}
      <div className="bg-white p-6 rounded-lg border mb-6">
        <h3 className="text-lg font-semibold mb-4">
          {metricLabels[selectedMetric]} 趨勢預測
        </h3>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis domain={[0, 4]} />
              <Tooltip
                formatter={(value, name) => [
                  value,
                  name === 'actual' ? '實際值' :
                  name === 'predicted' ? '預測值' :
                  name === 'upperBound' ? '上限' :
                  name === 'lowerBound' ? '下限' : name
                ]}
              />
              <ReferenceLine x={historicalData[historicalData.length - 1]?.date} stroke="#666" strokeDasharray="2 2" />

              {/* 歷史數據線 */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={false}
                name="實際值"
              />

              {/* 預測線 */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                connectNulls={false}
                name="預測值"
              />

              {/* 置信區間 */}
              {showConfidenceInterval && (
                <>
                  <Line
                    type="monotone"
                    dataKey="upperBound"
                    stroke="#ef444440"
                    strokeWidth={1}
                    dot={false}
                    connectNulls={false}
                    name="上限"
                  />
                  <Line
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="#ef444440"
                    strokeWidth={1}
                    dot={false}
                    connectNulls={false}
                    name="下限"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 預測因子分析 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">趨勢成分分析</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">線性趨勢</span>
              <span className={`text-sm font-medium ${
                trendAnalysis.trend.slope > 0 ? 'text-red-600' :
                trendAnalysis.trend.slope < 0 ? 'text-green-600' : 'text-gray-600'
              }`}>
                {trendAnalysis.trend.slope > 0 ? '↗ 上升' :
                 trendAnalysis.trend.slope < 0 ? '↘ 下降' : '→ 平穩'}
                ({Math.abs(trendAnalysis.trend.slope).toFixed(3)})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">變異性</span>
              <span className="text-sm font-medium">{trendAnalysis.volatility.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">趨勢強度</span>
              <span className={`text-sm font-medium ${
                trendAnalysis.trendStrength > 1 ? 'text-orange-600' : 'text-blue-600'
              }`}>
                {trendAnalysis.trendStrength > 1 ? '強' : '弱'}
                ({trendAnalysis.trendStrength.toFixed(2)})
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">預測統計</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">高風險天數</span>
              <span className="text-sm font-medium text-red-600">
                {predictions.filter(p => p.riskLevel === 'high').length} 天
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">平均置信度</span>
              <span className="text-sm font-medium">
                {predictions.length > 0 ?
                  Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100) : 0
                }%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">預期平均值</span>
              <span className="text-sm font-medium">
                {predictions.length > 0 ?
                  (predictions.reduce((sum, p) => sum + p.predicted, 0) / predictions.length).toFixed(2) : '0'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 預測詳細列表 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b">
          <h3 className="font-semibold text-gray-800">詳細預測結果</h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {predictions.map((pred, index) => (
            <div key={index} className={`p-4 border-b border-gray-100 ${
              pred.riskLevel === 'high' ? 'bg-red-50' :
              pred.riskLevel === 'medium' ? 'bg-yellow-50' : ''
            }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{pred.date}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    預測值: {pred.predicted} | 置信度: {(pred.confidence * 100).toFixed(0)}%
                  </div>
                  {pred.recommendations.length > 0 && (
                    <div className="text-sm text-blue-600 mt-1">
                      💡 {pred.recommendations[0]}
                    </div>
                  )}
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  pred.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                  pred.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {pred.riskLevel === 'high' ? '高風險' :
                   pred.riskLevel === 'medium' ? '中風險' : '低風險'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 模型說明 */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2">預測模型說明</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <div>• 基於線性回歸和移動平均的混合預測模型</div>
          <div>• 考慮季節性變化（週內週末模式）</div>
          <div>• 置信度基於歷史數據穩定性和預測時間距離</div>
          <div>• 預測精度會隨時間距離增加而降低</div>
          <div>• 建議結合實際觀察調整預測結果</div>
        </div>
      </div>
    </div>
  );
};

export default HealthTrendPredictor;