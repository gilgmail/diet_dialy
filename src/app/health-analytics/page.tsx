'use client';

import React, { useState, useMemo } from 'react';
import HealthTrendDashboard from '@/components/medical/HealthTrendDashboard';
import SymptomAnalysisEngine from '@/components/medical/SymptomAnalysisEngine';
import SymptomFoodCorrelationAnalyzer from '@/components/medical/SymptomFoodCorrelationAnalyzer';
import HealthTrendPredictor from '@/components/medical/HealthTrendPredictor';
import PDFReportExporter from '@/components/medical/PDFReportExporter';

// 模擬數據生成器
const generateMockHealthData = (days: number) => {
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const baseVariation = Math.sin(i * 0.1) * 0.5; // 週期性變化
    const randomVariation = (Math.random() - 0.5) * 0.8; // 隨機變化

    data.push({
      date: date.toISOString().split('T')[0],
      symptomSeverity: Math.max(0, Math.min(4, 2 + baseVariation + randomVariation)),
      symptomFrequency: Math.max(0, Math.min(4, 1.5 + baseVariation * 0.8 + randomVariation * 0.6)),
      activityImpact: Math.max(0, Math.min(4, 1.8 + baseVariation * 1.2 + randomVariation * 0.7)),
      moodImpact: Math.max(0, Math.min(4, 1.6 + baseVariation * 0.9 + randomVariation * 0.8)),
      stressLevel: Math.max(0, Math.min(4, 2.2 + baseVariation * 0.7 + randomVariation * 0.5)),
      sleepQuality: Math.max(0, Math.min(4, 2.8 - baseVariation * 0.5 - randomVariation * 0.4)),
      dietCompliance: Math.max(0, Math.min(4, 3.2 - baseVariation * 0.3 - randomVariation * 0.3)),
      medicationAdherence: Math.max(0, Math.min(4, 3.5 - baseVariation * 0.2 - randomVariation * 0.2))
    });
  }

  return data;
};

const generateMockSymptomRecords = (count: number) => {
  const symptoms = ['腹痛', '腹瀉', '脹氣', '噁心', '疲勞', '頭痛', '關節痛', '皮疹'];
  const triggers = ['壓力', '特定食物', '天氣變化', '睡眠不足', '運動', '情緒波動'];
  const records = [];

  for (let i = 0; i < count; i++) {
    const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const selectedSymptoms = symptoms.slice(0, Math.floor(Math.random() * 3) + 1);

    records.push({
      id: `symptom-${i}`,
      timestamp: date.toISOString(),
      symptoms: selectedSymptoms,
      severity: Math.floor(Math.random() * 4) + 1,
      duration: Math.floor(Math.random() * 240) + 15, // 15-255分鐘
      triggers: triggers.slice(0, Math.floor(Math.random() * 2) + 1),
      notes: `症狀記錄 ${i + 1}`,
      activityImpact: Math.floor(Math.random() * 4) + 1,
      moodImpact: Math.floor(Math.random() * 4) + 1,
      stressLevel: Math.floor(Math.random() * 4) + 1,
      sleepQuality: Math.floor(Math.random() * 4) + 1
    });
  }

  return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const generateMockFoodEntries = (count: number) => {
  const foods = [
    { name: '白米飯', category: '主食', score: 3.5 },
    { name: '牛奶', category: '乳製品', score: 1.8 },
    { name: '蘋果', category: '水果', score: 3.8 },
    { name: '咖啡', category: '飲品', score: 2.2 },
    { name: '巧克力', category: '甜點', score: 1.5 },
    { name: '雞胸肉', category: '蛋白質', score: 3.6 },
    { name: '青花菜', category: '蔬菜', score: 3.9 },
    { name: '麵包', category: '主食', score: 2.8 },
    { name: '優格', category: '乳製品', score: 3.2 },
    { name: '堅果', category: '零食', score: 3.4 }
  ];

  const entries = [];

  for (let i = 0; i < count; i++) {
    const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const food = foods[Math.floor(Math.random() * foods.length)];

    if (food) {
      entries.push({
        id: `food-${i}`,
        timestamp: date.toISOString(),
        foodName: food.name,
        category: food.category,
        amount: Math.floor(Math.random() * 200) + 50, // 50-250g
        medicalScore: food.score + (Math.random() - 0.5) * 0.4,
        riskFactors: food.score < 2.5 ? ['可能觸發症狀'] : []
      });
    }
  }

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const HealthAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'correlations' | 'predictions' | 'export'>('dashboard');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '180d' | 'all'>('30d');
  const [dataLoaded, setDataLoaded] = useState(true);

  // 生成模擬數據
  const mockHealthData = useMemo(() => generateMockHealthData(90), []);
  const mockSymptomRecords = useMemo(() => generateMockSymptomRecords(45), []);
  const mockFoodEntries = useMemo(() => generateMockFoodEntries(120), []);

  // 用戶資訊（模擬）
  const patientInfo = {
    name: '測試用戶',
    age: 35,
    conditions: ['IBD', '食物敏感'],
    medications: ['美沙拉嗪', '益生菌']
  };

  const tabs = [
    { key: 'dashboard', label: '🏠 健康儀表板', description: '整合健康趨勢分析' },
    { key: 'analysis', label: '🧠 症狀深度分析', description: '智能症狀模式識別' },
    { key: 'correlations', label: '🔗 食物關聯性', description: '食物症狀關聯分析' },
    { key: 'predictions', label: '📈 趨勢預測', description: '健康趨勢預測分析' },
    { key: 'export', label: '📄 PDF報告', description: '匯出醫療報告' }
  ];

  if (!dataLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <div className="mt-4 text-gray-600">載入健康分析系統...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頁面標題 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">健康分析中心</h1>
              <p className="text-gray-600 mt-2">
                基於 AI 的症狀追蹤、食物關聯性分析和健康趨勢預測系統
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                數據範圍: {mockHealthData.length} 天健康記錄
              </div>
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                系統運行正常
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 功能導航 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors relative group ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{tab.label}</span>
                </div>
                {/* 功能說明提示 */}
                <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {tab.description}
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 統計概覽 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-blue-600">{mockHealthData.length}</div>
            <div className="text-sm text-gray-600">健康記錄天數</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-green-600">{mockSymptomRecords.length}</div>
            <div className="text-sm text-gray-600">症狀記錄數</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-orange-600">{mockFoodEntries.length}</div>
            <div className="text-sm text-gray-600">飲食記錄數</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-purple-600">
              {[...new Set(mockSymptomRecords.flatMap(r => r.symptoms))].length}
            </div>
            <div className="text-sm text-gray-600">不同症狀類型</div>
          </div>
        </div>

        {/* 主要內容區域 */}
        <div className="bg-white rounded-lg shadow-sm border">
          {activeTab === 'dashboard' && (
            <HealthTrendDashboard
              healthData={mockHealthData}
              symptomRecords={mockSymptomRecords}
              foodEntries={mockFoodEntries}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          )}

          {activeTab === 'analysis' && (
            <div className="p-6">
              <SymptomAnalysisEngine
                records={mockSymptomRecords}
                timeRange={timeRange}
              />
            </div>
          )}

          {activeTab === 'correlations' && (
            <div className="p-6">
              <SymptomFoodCorrelationAnalyzer
                foodEntries={mockFoodEntries}
                symptomRecords={mockSymptomRecords}
                timeWindow={24}
              />
            </div>
          )}

          {activeTab === 'predictions' && (
            <div className="p-6">
              <HealthTrendPredictor
                historicalData={mockHealthData}
                predictionDays={14}
                metric="symptomSeverity"
              />
            </div>
          )}

          {activeTab === 'export' && (
            <div className="p-6">
              <PDFReportExporter
                healthData={mockHealthData}
                symptomRecords={mockSymptomRecords}
                foodEntries={mockFoodEntries}
                patientInfo={patientInfo}
              />
            </div>
          )}
        </div>

        {/* 系統資訊 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">🔬 新功能特色</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-blue-700">
            <div>
              <div className="font-medium">📊 症狀智能分析</div>
              <div>模式識別、相關性分析、風險評估</div>
            </div>
            <div>
              <div className="font-medium">🔗 食物關聯分析</div>
              <div>食物與症狀的統計關聯性分析</div>
            </div>
            <div>
              <div className="font-medium">📈 健康趨勢預測</div>
              <div>基於歷史數據的智能預測系統</div>
            </div>
            <div>
              <div className="font-medium">☁️ Google Sheets 同步</div>
              <div>個人雲端數據備份與分享</div>
            </div>
            <div>
              <div className="font-medium">📄 PDF 醫療報告</div>
              <div>專業格式的醫療報告匯出</div>
            </div>
            <div>
              <div className="font-medium">🎯 個人化建議</div>
              <div>基於數據分析的健康管理建議</div>
            </div>
          </div>
        </div>

        {/* 技術說明 */}
        <div className="mt-4 text-center text-sm text-gray-500">
          <div>✨ 本頁面使用模擬數據展示功能，實際使用時將連接真實的用戶數據</div>
          <div className="mt-1">
            🔒 所有數據處理均在本地進行，確保用戶隱私安全
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthAnalyticsPage;