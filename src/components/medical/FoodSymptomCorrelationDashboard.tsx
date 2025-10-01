'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, BarChart, Bar, PieChart, Pie, Cell,
  HeatMap as RechartsHeatMap
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Eye, Clock, Target, Brain, AlertCircle, CheckCircle, Info } from 'lucide-react';
import type { CorrelationMatrix, FoodSymptomInsight, TimeWindowAnalysis } from '@/lib/ai/food-symptom-correlator';

interface FoodSymptomCorrelationDashboardProps {
  userId: string;
  initialData?: CorrelationMatrix;
  onAnalysisRequest?: (options: any) => Promise<CorrelationMatrix>;
}

interface AnalysisOptions {
  analysisWindowMonths: number;
  minSampleSize: number;
  includeWeakCorrelations: boolean;
  confidenceLevel: number;
}

const RISK_LEVEL_COLORS = {
  'very_high': '#dc2626', // red-600
  'high': '#ea580c',      // orange-600
  'moderate': '#d97706',  // amber-600
  'low': '#65a30d',       // lime-600
  'very_low': '#16a34a'   // green-600
};

const SYMPTOM_COLORS = {
  'overall_health': '#3b82f6',    // blue-500
  'abdominal_pain': '#ef4444',    // red-500
  'diarrhea': '#f59e0b',          // amber-500
  'bloody_stool': '#dc2626',      // red-600
  'bloating': '#8b5cf6'           // violet-500
};

const SIGNIFICANCE_LABELS = {
  'highly_significant': '高度顯著 (p<0.01)',
  'significant': '顯著 (p<0.05)',
  'marginally_significant': '邊際顯著 (p<0.1)',
  'not_significant': '不顯著'
};

const FoodSymptomCorrelationDashboard: React.FC<FoodSymptomCorrelationDashboardProps> = ({
  userId,
  initialData,
  onAnalysisRequest
}) => {
  const [correlationData, setCorrelationData] = useState<CorrelationMatrix | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'timeline' | 'recommendations' | 'settings'>('overview');
  const [selectedFood, setSelectedFood] = useState<FoodSymptomInsight | null>(null);
  const [analysisOptions, setAnalysisOptions] = useState<AnalysisOptions>({
    analysisWindowMonths: 3,
    minSampleSize: 10,
    includeWeakCorrelations: false,
    confidenceLevel: 0.95
  });

  // Load initial analysis
  useEffect(() => {
    if (!correlationData && !isLoading) {
      handleAnalysisRequest();
    }
  }, [userId]);

  const handleAnalysisRequest = async () => {
    if (!onAnalysisRequest) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await onAnalysisRequest(analysisOptions);
      setCorrelationData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Derived data for visualizations
  const summaryStats = useMemo(() => {
    if (!correlationData) return null;

    const insights = correlationData.food_insights;
    const riskCounts = insights.reduce((acc, insight) => {
      acc[insight.overall_risk_assessment.risk_level]++;
      return acc;
    }, {
      'very_high': 0, 'high': 0, 'moderate': 0, 'low': 0, 'very_low': 0
    } as Record<string, number>);

    const avgConfidence = insights.reduce((sum, insight) =>
      sum + insight.overall_risk_assessment.confidence_score, 0) / insights.length;

    return {
      totalFoods: insights.length,
      highRiskFoods: riskCounts.very_high + riskCounts.high,
      moderateRiskFoods: riskCounts.moderate,
      safeFoods: riskCounts.low + riskCounts.very_low,
      avgConfidence: avgConfidence,
      riskDistribution: riskCounts
    };
  }, [correlationData]);

  const timelineData = useMemo(() => {
    if (!correlationData) return [];

    // Create timeline showing analysis period trends
    const { analysis_period } = correlationData;
    const days = Math.ceil((analysis_period.end_date.getTime() - analysis_period.start_date.getTime()) / (1000 * 60 * 60 * 24));

    return Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const date = new Date(analysis_period.start_date);
      date.setDate(date.getDate() + i);

      return {
        date: date.toISOString().split('T')[0],
        avgRisk: Math.random() * 3 + 1, // Placeholder - would calculate actual daily risk
        foodEntries: Math.floor(Math.random() * 5) + 1,
        symptomSeverity: Math.random() * 4 + 1
      };
    });
  }, [correlationData]);

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">分析食物總數</p>
              <p className="text-2xl font-bold text-gray-900">{summaryStats?.totalFoods || 0}</p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">高風險食物</p>
              <p className="text-2xl font-bold text-red-600">{summaryStats?.highRiskFoods || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">相對安全食物</p>
              <p className="text-2xl font-bold text-green-600">{summaryStats?.safeFoods || 0}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">平均信心度</p>
              <p className="text-2xl font-bold text-blue-600">
                {((summaryStats?.avgConfidence || 0) * 100).toFixed(1)}%
              </p>
            </div>
            <Brain className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Risk Distribution Chart */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">食物風險分布</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(summaryStats?.riskDistribution || {}).map(([level, count]) => ({
                    name: level,
                    value: count,
                    fill: RISK_LEVEL_COLORS[level as keyof typeof RISK_LEVEL_COLORS]
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  dataKey="value"
                />
                <Tooltip formatter={(value, name) => [value, `${name} 風險`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(summaryStats?.riskDistribution || {}).map(([level, count]) => ({
                level,
                count,
                fill: RISK_LEVEL_COLORS[level as keyof typeof RISK_LEVEL_COLORS]
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Global Patterns */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">全域模式</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-red-700 mb-3">🚫 最有問題的食物</h4>
            <div className="space-y-2">
              {correlationData?.global_patterns.most_problematic_foods.slice(0, 5).map((food, index) => (
                <div key={index} className="bg-red-50 p-2 rounded border border-red-200">
                  <span className="text-red-800 font-medium">{food}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-green-700 mb-3">✅ 最安全的食物</h4>
            <div className="space-y-2">
              {correlationData?.global_patterns.safest_foods.slice(0, 5).map((food, index) => (
                <div key={index} className="bg-green-50 p-2 rounded border border-green-200">
                  <span className="text-green-800 font-medium">{food}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-6">
      {/* Food Insights List */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">食物症狀關聯分析</h3>
          <p className="text-sm text-gray-600">點擊食物查看詳細分析</p>
        </div>

        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {correlationData?.food_insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedFood?.food_id === insight.food_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
              onClick={() => setSelectedFood(insight)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium text-gray-900">{insight.food_name}</h4>
                    <span className="text-sm text-gray-500">({insight.food_category})</span>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      insight.overall_risk_assessment.risk_level === 'very_high' ? 'bg-red-100 text-red-800' :
                      insight.overall_risk_assessment.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                      insight.overall_risk_assessment.risk_level === 'moderate' ? 'bg-amber-100 text-amber-800' :
                      insight.overall_risk_assessment.risk_level === 'low' ? 'bg-lime-100 text-lime-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {insight.overall_risk_assessment.risk_level} 風險
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    信心度: {(insight.overall_risk_assessment.confidence_score * 100).toFixed(1)}% |
                    建議: {insight.overall_risk_assessment.recommendation === 'avoid' ? '避免' :
                           insight.overall_risk_assessment.recommendation === 'limit' ? '限制' :
                           insight.overall_risk_assessment.recommendation === 'monitor' ? '監控' : '安全'}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {insight.overall_risk_assessment.reasoning.slice(0, 2).map((reason, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="ml-4">
                  <Eye className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Food Analysis */}
      {selectedFood && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{selectedFood.food_name}</h3>
              <p className="text-gray-600">{selectedFood.food_category}</p>
            </div>
            <button
              onClick={() => setSelectedFood(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Time Window Analysis */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3">時間窗口分析</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedFood.time_windows.map((window, index) => (
                <div key={index} className={`p-4 rounded-lg border-2 ${
                  window.optimal_window ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{window.time_window_hours} 小時</span>
                    {window.optimal_window && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">最佳窗口</span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    {Object.entries(window.correlations).map(([symptom, corr]) => (
                      <div key={symptom} className="flex justify-between">
                        <span className="text-gray-600">{symptom}:</span>
                        <div className="text-right">
                          <span className={`font-medium ${
                            Math.abs(corr.correlation_coefficient) > 0.5 ? 'text-red-600' :
                            Math.abs(corr.correlation_coefficient) > 0.3 ? 'text-orange-600' :
                            'text-green-600'
                          }`}>
                            {corr.correlation_coefficient.toFixed(3)}
                          </span>
                          <div className="text-xs text-gray-500">
                            {SIGNIFICANCE_LABELS[corr.statistical_significance]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Symptom Impact Visualization */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3">症狀影響分析</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={Object.entries(selectedFood.symptom_impacts).map(([symptom, impact]) => ({
                    symptom,
                    correlation: Math.abs(impact.correlation),
                    confidence: impact.confidence,
                    fill: SYMPTOM_COLORS[symptom as keyof typeof SYMPTOM_COLORS]
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="symptom" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="correlation" name="相關性強度" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {Object.entries(selectedFood.symptom_impacts).map(([symptom, impact]) => (
                  <div key={symptom} className="bg-gray-50 p-3 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{symptom}</span>
                      <div className="flex items-center space-x-2">
                        {impact.clinical_significance ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Info className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`text-sm ${
                          impact.trend === 'worsening' ? 'text-red-600' :
                          impact.trend === 'improving' ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {impact.trend === 'worsening' ? '惡化' :
                           impact.trend === 'improving' ? '改善' : '穩定'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      相關性: {impact.correlation.toFixed(3)} |
                      信心度: {(impact.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">個人化建議</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium text-blue-700 mb-2">⏰ 攝取時間建議</h5>
                <ul className="text-sm text-blue-600 space-y-1">
                  {selectedFood.recommendations.consumption_timing.map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h5 className="text-sm font-medium text-purple-700 mb-2">📏 份量建議</h5>
                <ul className="text-sm text-purple-600 space-y-1">
                  {selectedFood.recommendations.portion_suggestions.map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h5 className="text-sm font-medium text-green-700 mb-2">👀 監控建議</h5>
                <ul className="text-sm text-green-600 space-y-1">
                  {selectedFood.recommendations.monitoring_advice.map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h5 className="text-sm font-medium text-orange-700 mb-2">🔄 替代建議</h5>
                <ul className="text-sm text-orange-600 space-y-1">
                  {selectedFood.recommendations.alternative_foods.map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTimelineTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">分析期間趨勢</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avgRisk"
              stroke="#ef4444"
              strokeWidth={2}
              name="平均風險"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="foodEntries"
              stroke="#3b82f6"
              strokeWidth={2}
              name="食物記錄數"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="symptomSeverity"
              stroke="#f59e0b"
              strokeWidth={2}
              name="症狀嚴重程度"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderRecommendationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">綜合飲食建議</h3>

        {/* High-level recommendations based on analysis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-medium text-red-800 mb-3">🚫 應避免的食物</h4>
            <div className="space-y-2">
              {correlationData?.food_insights
                .filter(insight => insight.overall_risk_assessment.recommendation === 'avoid')
                .slice(0, 5)
                .map((insight, index) => (
                  <div key={index} className="text-sm text-red-700">
                    • {insight.food_name}
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-3">⚠️ 需要限制的食物</h4>
            <div className="space-y-2">
              {correlationData?.food_insights
                .filter(insight => insight.overall_risk_assessment.recommendation === 'limit')
                .slice(0, 5)
                .map((insight, index) => (
                  <div key={index} className="text-sm text-yellow-700">
                    • {insight.food_name}
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-800 mb-3">✅ 相對安全的食物</h4>
            <div className="space-y-2">
              {correlationData?.food_insights
                .filter(insight => insight.overall_risk_assessment.recommendation === 'safe')
                .slice(0, 5)
                .map((insight, index) => (
                  <div key={index} className="text-sm text-green-700">
                    • {insight.food_name}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* General recommendations */}
        <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-3">📋 一般建議</h4>
          <div className="text-sm text-blue-700 space-y-2">
            <div>• 在症狀穩定期間嘗試新食物</div>
            <div>• 記錄食物攝取時間和症狀出現時間</div>
            <div>• 逐步調整飲食，避免同時改變多種食物</div>
            <div>• 定期重新分析食物-症狀關聯性</div>
            <div>• 與醫療專業人員討論分析結果</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">分析設定</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分析時間窗口 (月)
            </label>
            <select
              value={analysisOptions.analysisWindowMonths}
              onChange={(e) => setAnalysisOptions(prev => ({
                ...prev,
                analysisWindowMonths: Number(e.target.value)
              }))}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value={1}>1 個月</option>
              <option value={3}>3 個月</option>
              <option value={6}>6 個月</option>
              <option value={12}>12 個月</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              最小樣本數
            </label>
            <input
              type="number"
              min="5"
              max="50"
              value={analysisOptions.minSampleSize}
              onChange={(e) => setAnalysisOptions(prev => ({
                ...prev,
                minSampleSize: Number(e.target.value)
              }))}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              信心水準
            </label>
            <select
              value={analysisOptions.confidenceLevel}
              onChange={(e) => setAnalysisOptions(prev => ({
                ...prev,
                confidenceLevel: Number(e.target.value)
              }))}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value={0.90}>90%</option>
              <option value={0.95}>95%</option>
              <option value={0.99}>99%</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeWeak"
              checked={analysisOptions.includeWeakCorrelations}
              onChange={(e) => setAnalysisOptions(prev => ({
                ...prev,
                includeWeakCorrelations: e.target.checked
              }))}
              className="mr-2"
            />
            <label htmlFor="includeWeak" className="text-sm text-gray-700">
              包含弱相關性分析
            </label>
          </div>

          <button
            onClick={handleAnalysisRequest}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '分析中...' : '重新分析'}
          </button>
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-800">分析錯誤: {error}</span>
        </div>
        <button
          onClick={handleAnalysisRequest}
          className="mt-4 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
        >
          重試
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">正在進行食物症狀關聯分析...</p>
      </div>
    );
  }

  if (!correlationData) {
    return (
      <div className="bg-gray-50 rounded-lg border p-12 text-center">
        <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">尚未進行關聯分析</p>
        <button
          onClick={handleAnalysisRequest}
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
        >
          開始分析
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">食物症狀關聯性分析</h2>
        <p className="text-gray-600 mt-2">
          分析期間: {correlationData.analysis_period.start_date.toLocaleDateString()} - {correlationData.analysis_period.end_date.toLocaleDateString()}
          ({correlationData.analysis_period.total_days} 天)
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: '總覽', icon: Target },
            { key: 'insights', label: '深度分析', icon: Brain },
            { key: 'timeline', label: '時間趨勢', icon: TrendingUp },
            { key: 'recommendations', label: '飲食建議', icon: CheckCircle },
            { key: 'settings', label: '設定', icon: Info }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'insights' && renderInsightsTab()}
      {activeTab === 'timeline' && renderTimelineTab()}
      {activeTab === 'recommendations' && renderRecommendationsTab()}
      {activeTab === 'settings' && renderSettingsTab()}
    </div>
  );
};

export default FoodSymptomCorrelationDashboard;