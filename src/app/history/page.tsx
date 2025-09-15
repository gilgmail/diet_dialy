'use client';

import React, { useState, useEffect } from 'react';
import { FoodHistoryEntry, CreateHistoryEntryRequest, PORTION_SIZES, FOOD_TAGS } from '@/types/history';
import { DatabaseFoodItem } from '@/types/food';
import FoodPhotoRecognition from '@/components/camera/FoodPhotoRecognition';
import ManualFoodEntry from '@/components/food/ManualFoodEntry';
import QuickFoodEntry from '@/components/food/QuickFoodEntry';
import CustomFoodEntry from '@/components/food/CustomFoodEntry';
import MedicalScoreCard from '@/components/medical/MedicalScoreCard';

interface RecognitionResult {
  food: DatabaseFoodItem;
  confidence: number;
  alternatives: Array<{
    food: DatabaseFoodItem;
    confidence: number;
  }>;
}

export default function HistoryPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'quick' | 'camera' | 'manual' | 'custom' | 'history'>('quick');
  const [foodHistory, setFoodHistory] = useState<FoodHistoryEntry[]>([]);
  const [selectedFood, setSelectedFood] = useState<DatabaseFoodItem | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load food history on mount
  useEffect(() => {
    loadFoodHistory();
  }, []);

  const loadFoodHistory = async () => {
    try {
      const response = await fetch('/api/history?userId=demo-user&limit=20');
      const data = await response.json();
      if (data.success) {
        setFoodHistory(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to load food history:', error);
    }
  };

  const handleFoodRecognized = (result: RecognitionResult) => {
    setRecognitionResult(result);
    setSelectedFood(result.food);
  };

  const handleRecognitionError = (error: string) => {
    console.error('Recognition error:', error);
    // Could show a toast notification here
  };

  const addToHistory = async (foodId: string, portion: any, photoUrl?: string, confidence?: number) => {
    setIsLoading(true);
    try {
      const historyRequest: CreateHistoryEntryRequest = {
        foodId,
        portion: portion || { amount: 1, unit: 'medium' as const },
        photoUrl,
        recognitionConfidence: confidence,
        tags: ['demo'],
        notes: photoUrl ? '透過拍照識別' : '手動新增'
      };

      const response = await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(historyRequest),
      });

      const data = await response.json();
      if (data.success) {
        await loadFoodHistory(); // Refresh history
        setRecognitionResult(null);
        setSelectedFood(null);
      }
    } catch (error) {
      console.error('Failed to add to history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 處理手動新增記錄
  const handleManualEntry = async (entry: Omit<FoodHistoryEntry, 'id' | 'timestamp'>) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: entry.userId,
          foodId: entry.food.id,
          amount_g: entry.amount_g,
          photos: entry.photos,
          notes: entry.notes,
          medicalScore: entry.medicalScore
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadFoodHistory(); // 重新載入記錄
        console.log('✅ 手動記錄新增成功');
      } else {
        throw new Error(data.error || '新增記錄失敗');
      }
    } catch (error) {
      console.error('❌ 手動新增記錄失敗:', error);
      throw error; // 讓組件處理錯誤顯示
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualError = (error: string) => {
    console.error('Manual entry error:', error);
    // 這裡可以添加 toast 通知
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-TW');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📚</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">食物追蹤</h1>
                <p className="text-xs text-gray-600">智能記錄與醫療分析</p>
              </div>
            </div>
            <a
              href="/"
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
            >
              🏠 首頁
            </a>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-md mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setActiveTab('quick')}
              className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'quick'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⚡ 快速
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'manual'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ✍️ 詳細
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'custom'
                  ? 'bg-green-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔧 新增
            </button>
          </div>
          <div className="flex bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'camera'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📸 拍照
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 記錄
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Quick Tab */}
        {activeTab === 'quick' && (
          <QuickFoodEntry
            onAddEntry={handleManualEntry}
            onError={handleManualError}
          />
        )}

        {/* Manual Tab (Detailed) */}
        {activeTab === 'manual' && (
          <ManualFoodEntry
            onAddEntry={handleManualEntry}
            onError={handleManualError}
          />
        )}

        {/* Custom Food Entry Tab */}
        {activeTab === 'custom' && (
          <CustomFoodEntry
            onAddEntry={handleManualEntry}
            onError={handleManualError}
          />
        )}

        {/* Camera Tab */}
        {activeTab === 'camera' && (
          <div className="space-y-6">
            <FoodPhotoRecognition
              onFoodRecognized={handleFoodRecognized}
              onError={handleRecognitionError}
            />

            {/* Recognition Result Actions */}
            {recognitionResult && (
              <div className="bg-white rounded-lg border-2 border-green-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">確認新增到記錄？</h3>

                {/* Medical Score Preview */}
                <div className="mb-4">
                  <MedicalScoreCard
                    score={{
                      score: recognitionResult.food.medical_scores.ibd_score,
                      level: recognitionResult.food.medical_scores.ibd_score === 4 ? '完美' :
                             recognitionResult.food.medical_scores.ibd_score === 3 ? '好' :
                             recognitionResult.food.medical_scores.ibd_score === 2 ? '普通' : '差',
                      emoji: recognitionResult.food.medical_scores.ibd_score === 4 ? '😍' :
                             recognitionResult.food.medical_scores.ibd_score === 3 ? '😊' :
                             recognitionResult.food.medical_scores.ibd_score === 2 ? '😐' : '😞',
                      riskFactors: recognitionResult.food.medical_scores.ibd_risk_factors,
                      recommendations: [`基於 ${Math.round(recognitionResult.confidence * 100)}% 識別信心度的建議`],
                      alternatives: [],
                      medicalReason: `IBD 評分: ${recognitionResult.food.medical_scores.ibd_score}/4`,
                      urgency: recognitionResult.food.medical_scores.ibd_score <= 2 ? 'high' : 'low'
                    }}
                    foodName={recognitionResult.food.name_zh}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setRecognitionResult(null)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => addToHistory(
                      recognitionResult.food.id,
                      { amount: 1, unit: 'medium' as const },
                      'mock-photo-url', // In real app, this would be the actual photo
                      recognitionResult.confidence
                    )}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? '新增中...' : '✅ 新增記錄'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                📊 最近記錄
              </h2>
              <span className="text-sm text-gray-600">
                {foodHistory.length} 筆記錄
              </span>
            </div>

            {foodHistory.length === 0 ? (
              <div className="bg-white rounded-lg border-2 border-gray-200 p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">尚無食物記錄</h3>
                <p className="text-gray-600 mb-4">開始使用拍照功能記錄您的食物吧！</p>
                <button
                  onClick={() => setActiveTab('camera')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  📸 立即拍照
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {foodHistory.map((entry) => (
                  <div key={entry.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {entry.foodData.name_zh}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {entry.foodData.name_en}
                        </p>

                        {/* Medical Score Indicator */}
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            entry.medicalScore?.score === 4
                              ? 'bg-green-100 text-green-800'
                              : entry.medicalScore?.score === 3
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {entry.medicalScore?.emoji} 醫療評分: {entry.medicalScore?.score || 'N/A'}/4 ({entry.medicalScore?.level})
                          </span>

                          {entry.recognitionConfidence && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              📸 {Math.round(entry.recognitionConfidence * 100)}%
                            </span>
                          )}
                        </div>

                        {/* Portion Info */}
                        <p className="text-xs text-gray-500 mt-1">
                          份量: {entry.portion && PORTION_SIZES[entry.portion.unit]
                            ? PORTION_SIZES[entry.portion.unit].label
                            : `${entry.amount_g || 100}g`}
                          {entry.portion?.customAmount && ` (${entry.portion.customAmount}${entry.portion.customUnit})`}
                        </p>
                      </div>

                      <div className="text-right text-sm text-gray-500">
                        <div>{formatDate(entry.consumedAt)}</div>
                        <div>{formatTime(entry.consumedAt)}</div>
                      </div>
                    </div>

                    {/* Notes */}
                    {entry.notes && (
                      <p className="text-sm text-gray-600 mt-2 pt-2 border-t">
                        💭 {entry.notes}
                      </p>
                    )}
                  </div>
                ))}

                {/* Load More Button */}
                <div className="text-center pt-4">
                  <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                    載入更多記錄...
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}