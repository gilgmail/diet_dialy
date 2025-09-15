'use client';

import React, { useState, useEffect } from 'react';
import { MedicalReport, MedicalReportRequest, REPORT_TEMPLATES } from '@/types/medical-report';

export default function ReportsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReport, setCurrentReport] = useState<MedicalReport | null>(null);
  const [reportRequest, setReportRequest] = useState<MedicalReportRequest>({
    userId: 'demo-user',
    reportType: 'weekly',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    includeSymptoms: true,
    analysisDepth: 'standard'
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const response = await fetch('/api/reports?userId=demo-user&limit=10');
      const data = await response.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportRequest),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentReport(data.report);
        await loadReports(); // Refresh history
        setActiveTab('history');
      } else {
        alert('報告生成失敗: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('報告生成失敗，請重試');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  const getRiskLevelColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    if (score >= 40) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getRiskLevelText = (score: number) => {
    if (score >= 80) return '低風險';
    if (score >= 60) return '中等風險';
    if (score >= 40) return '高風險';
    return '嚴重風險';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">📊</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">醫療報告</h1>
                <p className="text-xs text-gray-600">專業醫療分析與建議</p>
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
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'generate'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📝 生成報告
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📚 歷史記錄
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              📝 生成醫療報告
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Report Configuration */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    報告類型
                  </label>
                  <select
                    value={reportRequest.reportType}
                    onChange={(e) => setReportRequest({
                      ...reportRequest,
                      reportType: e.target.value as 'weekly' | 'monthly' | 'custom'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="weekly">週報告</option>
                    <option value="monthly">月報告</option>
                    <option value="custom">自定義期間</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      開始日期
                    </label>
                    <input
                      type="date"
                      value={reportRequest.startDate}
                      onChange={(e) => setReportRequest({
                        ...reportRequest,
                        startDate: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      結束日期
                    </label>
                    <input
                      type="date"
                      value={reportRequest.endDate}
                      onChange={(e) => setReportRequest({
                        ...reportRequest,
                        endDate: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分析深度
                  </label>
                  <select
                    value={reportRequest.analysisDepth}
                    onChange={(e) => setReportRequest({
                      ...reportRequest,
                      analysisDepth: e.target.value as 'basic' | 'standard' | 'comprehensive'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="basic">基礎分析</option>
                    <option value="standard">標準分析</option>
                    <option value="comprehensive">深度分析</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="includeSymptoms"
                    checked={reportRequest.includeSymptoms}
                    onChange={(e) => setReportRequest({
                      ...reportRequest,
                      includeSymptoms: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includeSymptoms" className="ml-2 block text-sm text-gray-700">
                    包含症狀分析
                  </label>
                </div>
              </div>

              {/* Report Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">報告預覽</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>期間: {formatDate(reportRequest.startDate)} 至 {formatDate(reportRequest.endDate)}</div>
                  <div>類型: {reportRequest.reportType === 'weekly' ? '週報告' : reportRequest.reportType === 'monthly' ? '月報告' : '自定義'}</div>
                  <div>深度: {reportRequest.analysisDepth === 'basic' ? '基礎' : reportRequest.analysisDepth === 'standard' ? '標準' : '深度'}分析</div>
                  <div>症狀: {reportRequest.includeSymptoms ? '包含' : '不包含'}</div>
                </div>

                <button
                  onClick={generateReport}
                  disabled={isGenerating}
                  className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      生成中...
                    </div>
                  ) : (
                    '📊 生成報告'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                📚 歷史報告
              </h2>
              <span className="text-sm text-gray-600">
                {reports.length} 份報告
              </span>
            </div>

            {reports.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">尚無醫療報告</h3>
                <p className="text-gray-600 mb-4">開始生成您的第一份醫療分析報告吧！</p>
                <button
                  onClick={() => setActiveTab('generate')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  📝 立即生成
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {report.reportType === 'weekly' ? '週' : report.reportType === 'monthly' ? '月' : '自定義'}報告
                        </h3>
                        <p className="text-sm text-gray-600">{report.period.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(report.metadata.generatedAt)} 生成
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(report.summary.averageMedicalScore)}`}>
                          {getRiskLevelText(report.summary.averageMedicalScore)} ({report.summary.averageMedicalScore})
                        </span>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-semibold text-gray-900">{report.summary.totalFoods}</div>
                        <div className="text-xs text-gray-600">總食物數</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-semibold text-gray-900">{report.summary.uniqueFoods}</div>
                        <div className="text-xs text-gray-600">種類</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-semibold text-gray-900">{Math.round(report.summary.riskFactorExposure)}%</div>
                        <div className="text-xs text-gray-600">風險暴露</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-semibold text-gray-900">{Math.round(report.summary.complianceScore)}%</div>
                        <div className="text-xs text-gray-600">遵循度</div>
                      </div>
                    </div>

                    {/* Key Insights */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">🔍 主要發現</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {report.medicalInsights.keyFindings.slice(0, 2).map((finding, index) => (
                            <li key={index} className="flex items-start">
                              <span className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">💡 建議事項</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {report.medicalInsights.recommendations.slice(0, 2).map((rec, index) => (
                            <li key={index} className="flex items-start">
                              <span className="w-2 h-2 bg-green-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => setCurrentReport(report)}
                        className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                      >
                        📖 查看完整報告 →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Detailed Report Modal/View */}
        {currentReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    完整醫療報告
                  </h2>
                  <button
                    onClick={() => setCurrentReport(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Report Content */}
                <div className="space-y-6">
                  {/* Report Header */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-2">{currentReport.period.description}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">報告類型:</span>
                        <span className="ml-1 font-medium">{currentReport.reportType === 'weekly' ? '週報告' : '月報告'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">數據點數:</span>
                        <span className="ml-1 font-medium">{currentReport.metadata.dataPoints}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">信心度:</span>
                        <span className="ml-1 font-medium">{Math.round(currentReport.metadata.confidenceScore * 100)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">生成時間:</span>
                        <span className="ml-1 font-medium">{formatDate(currentReport.metadata.generatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Section */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">📊 總結統計</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-600">{currentReport.summary.totalFoods}</div>
                        <div className="text-sm text-blue-700">總食物數量</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600">{currentReport.summary.uniqueFoods}</div>
                        <div className="text-sm text-green-700">不同種類</div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <div className="text-2xl font-bold text-yellow-600">{Math.round(currentReport.summary.averageMedicalScore)}</div>
                        <div className="text-sm text-yellow-700">平均醫療評分</div>
                      </div>
                    </div>
                  </div>

                  {/* Key Findings */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">🔍 主要發現</h3>
                    <ul className="space-y-2">
                      {currentReport.medicalInsights.keyFindings.map((finding, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span className="text-gray-700">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">💡 醫療建議</h3>
                    <ul className="space-y-2">
                      {currentReport.medicalInsights.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span className="text-gray-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Warning Signals */}
                  {currentReport.medicalInsights.warningSignals.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">⚠️ 警告信號</h3>
                      <ul className="space-y-2">
                        {currentReport.medicalInsights.warningSignals.map((warning, index) => (
                          <li key={index} className="flex items-start">
                            <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                            <span className="text-gray-700">{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">{currentReport.metadata.disclaimer}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}