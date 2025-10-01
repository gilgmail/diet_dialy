'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FoodSymptomCorrelationDashboard from '@/components/medical/FoodSymptomCorrelationDashboard';
import { useCorrelationAnalysis } from '@/hooks/useCorrelationAnalysis';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Brain, ArrowLeft, Info, AlertTriangle } from 'lucide-react';

const CorrelationAnalysisPage: React.FC = () => {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [showIntroduction, setShowIntroduction] = useState(true);

  // Auth state
  const { user, isLoading: authLoading, isAuthenticated } = useSupabaseAuth();

  // Correlation analysis hook
  const {
    correlationData,
    isLoading,
    error,
    isAnalyzing,
    performAnalysis,
    getCachedAnalysis
  } = useCorrelationAnalysis();

  // Initialize user ID from auth
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin?redirect=/correlation-analysis');
    }
  }, [authLoading, isAuthenticated, router]);

  // Check for cached analysis on load
  useEffect(() => {
    if (userId && isAuthenticated && !correlationData) {
      getCachedAnalysis(userId);
    }
  }, [userId, isAuthenticated, correlationData, getCachedAnalysis]);

  // Handle analysis request from dashboard
  const handleAnalysisRequest = async (options: any) => {
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return await performAnalysis(userId, options);
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  // Show auth required if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">需要登入</h2>
          <p className="text-gray-600 mb-6">
            請先登入以使用食物症狀關聯分析功能
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/auth/signin?redirect=/correlation-analysis')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              前往登入
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
            >
              返回主頁
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                返回
              </button>
              <div className="flex items-center space-x-3">
                <Brain className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">食物症狀關聯分析</h1>
                  <p className="text-sm text-gray-500">AI 驅動的個人化飲食洞察</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIntroduction(true)}
              className="flex items-center text-gray-500 hover:text-gray-700"
            >
              <Info className="h-5 w-5 mr-1" />
              說明
            </button>
          </div>
        </div>
      </div>

      {/* Introduction Modal */}
      {showIntroduction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">關於食物症狀關聯分析</h2>
                <button
                  onClick={() => setShowIntroduction(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 text-sm text-gray-700">
                <section>
                  <h3 className="font-medium text-gray-900 mb-2">🔬 分析原理</h3>
                  <p>
                    本系統使用先進的統計分析方法，包括皮爾遜相關性分析、時間窗口分析和信心區間計算，
                    來識別您的飲食與症狀之間的潛在關聯性。
                  </p>
                </section>

                <section>
                  <h3 className="font-medium text-gray-900 mb-2">📊 分析內容</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>多時間窗口相關性分析 (6-72小時)</li>
                    <li>統計顯著性檢驗 (p值和信心區間)</li>
                    <li>症狀特定影響評估</li>
                    <li>個人化風險等級評估</li>
                    <li>基於證據的飲食建議</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-medium text-gray-900 mb-2">⚠️ 重要提醒</h3>
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <ul className="list-disc list-inside space-y-1 text-yellow-800">
                      <li>此分析僅供參考，不能替代專業醫療建議</li>
                      <li>相關性不等於因果關係</li>
                      <li>建議與醫療專業人員討論分析結果</li>
                      <li>需要足夠的數據量才能產生可靠的分析</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h3 className="font-medium text-gray-900 mb-2">📈 數據需求</h3>
                  <p>
                    為獲得最佳分析結果，建議至少有：
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>30天以上的症狀記錄</li>
                    <li>50筆以上的食物攝取記錄</li>
                    <li>每種分析食物至少10次攝取記錄</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-medium text-gray-900 mb-2">🎯 如何使用</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>查看總覽了解整體風險分布</li>
                    <li>在深度分析中探索特定食物的詳細關聯</li>
                    <li>查看時間趨勢了解症狀變化模式</li>
                    <li>根據建議調整個人飲食計劃</li>
                    <li>定期重新分析以追蹤改善情況</li>
                  </ol>
                </section>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowIntroduction(false)}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  開始使用
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="py-8">
        {userId ? (
          <FoodSymptomCorrelationDashboard
            userId={userId}
            initialData={correlationData}
            onAnalysisRequest={handleAnalysisRequest}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-4">用戶驗證失敗</h2>
              <p className="text-gray-600 mb-6">
                無法確認用戶身份，請重新登入後再試。
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                重新載入
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress indicator for analysis */}
      {isAnalyzing && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-700">正在進行關聯分析...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrelationAnalysisPage;