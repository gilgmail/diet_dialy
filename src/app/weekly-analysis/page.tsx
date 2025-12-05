'use client';

import React, { useState, useEffect } from 'react';
import { HealthMetricsCards } from '@/components/medical/HealthMetricsCards';
import { HealthSymptomCorrelationChart } from '@/components/medical/charts/HealthSymptomCorrelationChart';
import { Activity, Heart, FileText, Download, Calendar, TrendingUp } from 'lucide-react';

interface WeeklyAnalysisReport {
  id: string;
  title: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  summary: string;
  pdfPath: string;
  jsonPath: string;
  analysisMode?: string;
  analysisVersion?: string;
  followUpActions: string[];
  foodsToMonitor?: Array<{
    food: string;
    risk_level?: string;
    reasoning?: string[];
    recommended_actions?: string[];
  }>;
  supportiveFoods?: Array<{
    food: string;
    benefits?: string[];
    suggestions?: string[];
  }>;
  dailyFoodBreakdown?: Array<{
    date?: string;
    day_summary?: string;
    meals?: Array<{
      meal?: string;
      foods?: Array<{
        name?: string;
        suitability?: string;
        reasoning?: string[];
      }>;
    }>;
  }>;
  nextSteps?: {
    maintain?: string[];
    monitor?: string[];
    experiments?: string[];
  };
  reportNumber?: number;
  totalReports?: number;
}

export default function WeeklyAnalysisPage() {
  const [reports, setReports] = useState<WeeklyAnalysisReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyAnalysisReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);

  // Load user's weekly analysis history
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      // TODO: Get actual user ID from auth context
      const userId = 'demo-user';
      const response = await fetch(`/api/ai/weekly-ibd-analysis?userId=${userId}&limit=10`);
      const data = await response.json();

      if (data.success && data.history) {
        setReports(data.history);
      }
    } catch (error) {
      console.error('Failed to load weekly analysis reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewReport = async () => {
    setIsGenerating(true);
    try {
      // TODO: Get actual user ID from auth context
      const userId = 'demo-user';
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const response = await fetch('/api/ai/weekly-ibd-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          promptStyle: 'balanced'
        })
      });

      const data = await response.json();

      if (data.success) {
        await loadReports();
        alert('✅ 週報告生成成功！');
      } else {
        alert(`❌ 生成失敗：${data.error}`);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('❌ 生成報告時發生錯誤');
    } finally {
      setIsGenerating(false);
    }
  };

  const viewReportDetails = async (report: WeeklyAnalysisReport) => {
    setSelectedReport(report);

    // Fetch full analysis data including health metrics
    try {
      const response = await fetch(report.jsonPath);
      const fullData = await response.json();
      setAnalysisData(fullData);
    } catch (error) {
      console.error('Failed to load full analysis data:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            週間 IBD 分析報告
          </h1>
          <p className="text-gray-600 mt-2">
            基於飲食、症狀與健康數據的綜合 AI 分析
          </p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">生成新報告</h2>
              <p className="text-sm text-gray-600 mt-1">
                分析過去 7 天的飲食、症狀與健康指標
              </p>
            </div>
            <button
              onClick={generateNewReport}
              disabled={isGenerating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  生成中...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  生成報告
                </>
              )}
            </button>
          </div>
        </div>

        {/* Reports List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">尚無分析報告</h3>
            <p className="text-gray-600 mb-6">點擊上方按鈕生成您的第一份週間分析報告</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <h3 className="font-semibold text-gray-900">
                        {formatDate(report.startDate)} - {formatDate(report.endDate)}
                      </h3>
                      {report.reportNumber && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          #{report.reportNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{report.summary}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      生成於 {formatDate(report.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => viewReportDetails(report)}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    📖 查看完整分析
                  </button>
                  <a
                    href={report.pdfPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    下載 PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Report Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b">
                  <h2 className="text-xl font-semibold text-gray-900">
                    完整分析報告
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedReport(null);
                      setAnalysisData(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Report Content */}
                <div className="space-y-6">
                  {/* Period Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">分析期間</span>
                    </div>
                    <p className="text-gray-700">
                      {formatDate(selectedReport.startDate)} - {formatDate(selectedReport.endDate)}
                    </p>
                  </div>

                  {/* Summary */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 總結</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedReport.summary}</p>
                  </div>

                  {/* Health Metrics Section - NEW INTEGRATION */}
                  {analysisData?.lifestyleFactors?.healthMetrics && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-500" />
                        健康因子分析
                      </h3>
                      <div className="space-y-6">
                        {/* Health Metrics Cards */}
                        <HealthMetricsCards
                          overview={analysisData.lifestyleFactors.healthMetrics.overview}
                          dataQuality={analysisData.lifestyleFactors.healthMetrics.dataQuality}
                          qualityNotes={analysisData.lifestyleFactors.healthMetrics.qualityNotes}
                        />

                        {/* Health-Symptom Correlation Charts */}
                        {analysisData.lifestyleFactors.healthMetrics.correlations.length > 0 && (
                          <HealthSymptomCorrelationChart
                            correlations={analysisData.lifestyleFactors.healthMetrics.correlations}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Enable HealthKit Prompt - if no health data */}
                  {!analysisData?.lifestyleFactors?.healthMetrics && (
                    <div className="border-t pt-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900 mb-1">
                              啟用健康指標追蹤
                            </h4>
                            <p className="text-sm text-blue-800 mb-3">
                              連接 HealthKit 以追蹤運動、壓力、水分攝取如何影響您的 IBD 症狀。
                              獲得更全面的健康分析與個人化建議。
                            </p>
                            <a
                              href="/settings/healthkit"
                              className="inline-block text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
                            >
                              前往設定 HealthKit 同步 →
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Foods to Monitor */}
                  {selectedReport.foodsToMonitor && selectedReport.foodsToMonitor.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">⚠️ 需要監控的食物</h3>
                      <div className="space-y-3">
                        {selectedReport.foodsToMonitor.map((item, idx) => (
                          <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="font-medium text-red-900 mb-2">{item.food}</div>
                            {item.reasoning && item.reasoning.length > 0 && (
                              <ul className="text-sm text-red-800 space-y-1">
                                {item.reasoning.map((reason, ridx) => (
                                  <li key={ridx} className="flex items-start">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Supportive Foods */}
                  {selectedReport.supportiveFoods && selectedReport.supportiveFoods.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">✅ 有益的食物</h3>
                      <div className="space-y-3">
                        {selectedReport.supportiveFoods.map((item, idx) => (
                          <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="font-medium text-green-900 mb-2">{item.food}</div>
                            {item.benefits && item.benefits.length > 0 && (
                              <ul className="text-sm text-green-800 space-y-1">
                                {item.benefits.map((benefit, bidx) => (
                                  <li key={bidx} className="flex items-start">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                                    {benefit}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Actions */}
                  {selectedReport.followUpActions && selectedReport.followUpActions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 後續行動</h3>
                      <ul className="space-y-2">
                        {selectedReport.followUpActions.map((action, idx) => (
                          <li key={idx} className="flex items-start text-gray-700">
                            <span className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
