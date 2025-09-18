'use client';

import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';

interface HealthDataPoint {
  date: string;
  symptomSeverity: number;
  symptomFrequency: number;
  activityImpact: number;
  moodImpact: number;
  stressLevel: number;
  sleepQuality: number;
  dietCompliance: number;
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

interface FoodEntry {
  id: string;
  timestamp: string;
  foodName: string;
  category: string;
  amount: number;
  medicalScore: number;
  riskFactors: string[];
}

interface PDFReportExporterProps {
  healthData: HealthDataPoint[];
  symptomRecords: SymptomRecord[];
  foodEntries: FoodEntry[];
  patientInfo?: {
    name?: string;
    age?: number;
    conditions?: string[];
    medications?: string[];
  };
}

interface ReportSection {
  title: string;
  enabled: boolean;
  data?: any;
}

const PDFReportExporter: React.FC<PDFReportExporterProps> = ({
  healthData,
  symptomRecords,
  foodEntries,
  patientInfo
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [reportSections, setReportSections] = useState<ReportSection[]>([
    { title: '基本資訊', enabled: true },
    { title: '症狀趨勢摘要', enabled: true },
    { title: '飲食記錄分析', enabled: true },
    { title: '症狀詳細記錄', enabled: true },
    { title: '食物症狀關聯性', enabled: true },
    { title: '醫療建議', enabled: true },
    { title: '附錄：原始數據', enabled: false }
  ]);
  const reportContentRef = useRef<HTMLDivElement>(null);

  // 過濾報告期間的數據 - 加強錯誤處理
  const getFilteredData = () => {
    try {
      const now = new Date();
      const days = reportPeriod === '7d' ? 7 : reportPeriod === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const safeHealthData = (healthData || []).filter(d => {
        try {
          return d && d.date && new Date(d.date) >= cutoff;
        } catch (error) {
          console.warn('Health data date format error:', d);
          return false;
        }
      });

      const safeSymptomRecords = (symptomRecords || []).filter(r => {
        try {
          return r && r.timestamp && new Date(r.timestamp) >= cutoff;
        } catch (error) {
          console.warn('Symptom record date format error:', r);
          return false;
        }
      });

      const safeFoodEntries = (foodEntries || []).filter(f => {
        try {
          return f && f.timestamp && new Date(f.timestamp) >= cutoff;
        } catch (error) {
          console.warn('Food entry date format error:', f);
          return false;
        }
      });

      return {
        healthData: safeHealthData,
        symptomRecords: safeSymptomRecords,
        foodEntries: safeFoodEntries
      };
    } catch (error) {
      console.error('Error filtering data:', error);
      return {
        healthData: [],
        symptomRecords: [],
        foodEntries: []
      };
    }
  };

  // 計算Statistics
  const calculateStats = (data: any) => {
    const { healthData: filteredHealth, symptomRecords: filteredSymptoms, foodEntries: filteredFood } = data;

    if (filteredHealth.length === 0) return null;

    // 計算報告期間天數
    const days = reportPeriod === '7d' ? 7 : reportPeriod === '30d' ? 30 : 90;

    // 健康指標平均值
    const avgSeverity = filteredHealth.reduce((sum, d) => sum + d.symptomSeverity, 0) / filteredHealth.length;
    const avgActivity = filteredHealth.reduce((sum, d) => sum + d.activityImpact, 0) / filteredHealth.length;
    const avgMood = filteredHealth.reduce((sum, d) => sum + d.moodImpact, 0) / filteredHealth.length;
    const avgSleep = filteredHealth.reduce((sum, d) => sum + d.sleepQuality, 0) / filteredHealth.length;

    // 症狀頻率分析
    const symptomCounts = new Map<string, number>();
    filteredSymptoms.forEach(record => {
      record.symptoms.forEach(symptom => {
        symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1);
      });
    });

    const topSymptoms = Array.from(symptomCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // 食物風險分析
    const highRiskFoods = filteredFood
      .filter(food => food.medicalScore < 2)
      .map(food => food.foodName);

    const uniqueHighRiskFoods = [...new Set(highRiskFoods)].slice(0, 10);

    // 趨勢分析（簡化版）
    const recentWeek = filteredHealth.slice(-7);
    const previousWeek = filteredHealth.slice(-14, -7);

    let trendDirection = '穩定';
    if (recentWeek.length > 0 && previousWeek.length > 0) {
      const recentAvg = recentWeek.reduce((sum, d) => sum + d.symptomSeverity, 0) / recentWeek.length;
      const previousAvg = previousWeek.reduce((sum, d) => sum + d.symptomSeverity, 0) / previousWeek.length;
      const change = ((recentAvg - previousAvg) / previousAvg) * 100;

      if (change > 10) trendDirection = '惡化';
      else if (change < -10) trendDirection = '改善';
    }

    return {
      avgSeverity: avgSeverity.toFixed(2),
      avgActivity: avgActivity.toFixed(2),
      avgMood: avgMood.toFixed(2),
      avgSleep: avgSleep.toFixed(2),
      totalSymptomRecords: filteredSymptoms.length,
      totalFoodEntries: filteredFood.length,
      topSymptoms,
      uniqueHighRiskFoods,
      trendDirection,
      reportPeriodDays: days
    };
  };

  // 生成醫療建議
  const generateRecommendations = (stats: any) => {
    const recommendations: string[] = [];

    if (parseFloat(stats.avgSeverity) > 2.5) {
      recommendations.push('檢測到高症狀嚴重度。建議與醫療專業人員討論治療計劃調整。');
    }

    if (parseFloat(stats.avgActivity) > 2.0) {
      recommendations.push('活動受到顯著影響。建議適度調整日常活動強度。');
    }

    if (parseFloat(stats.avgSleep) < 2.0) {
      recommendations.push('睡眠品質不佳。建議改善睡眠環境並建立規律的睡眠模式。');
    }

    if (stats.uniqueHighRiskFoods.length > 5) {
      recommendations.push('識別出多種高風險食物。建議建立個人化的飲食避免清單。');
    }

    if (stats.trendDirection === '惡化') {
      recommendations.push('症狀呈現惡化趨勢。建議盡快諮詢醫療專業人員。');
    } else if (stats.trendDirection === '改善') {
      recommendations.push('症狀呈現改善趨勢。建議維持目前的管理策略。');
    }

    if (recommendations.length === 0) {
      recommendations.push('請繼續監測症狀變化並維持良好的自我照護習慣。');
    }

    return recommendations;
  };

  // 新的中文PDF生成方法 - 使用html2canvas將HTML內容轉為圖片
  const generateChinesePDF = async () => {
    if (!reportContentRef.current) return;

    setIsGenerating(true);

    try {
      // 動態導入 html2canvas
      const html2canvas = (await import('html2canvas')).default;

      // 獲取過濾後的數據
      const data = getFilteredData();
      if (!data || data.healthData.length === 0) {
        alert('無足夠數據生成報告，請確保選定期間內有健康記錄');
        return;
      }

      // 創建PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // 將HTML內容轉換為圖片
      const canvas = await html2canvas(reportContentRef.current, {
        scale: 2, // 高解析度
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: reportContentRef.current.scrollWidth,
        height: reportContentRef.current.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 20; // 留邊距
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // 如果內容太長，分頁處理
      if (imgHeight > pageHeight - 20) {
        let yPosition = 0;
        const maxHeightPerPage = pageHeight - 20;

        while (yPosition < imgHeight) {
          if (yPosition > 0) {
            pdf.addPage();
          }

          // 計算當前頁面要顯示的部分
          const sourceY = (yPosition / imgHeight) * canvas.height;
          const sourceHeight = Math.min(
            (maxHeightPerPage / imgHeight) * canvas.height,
            canvas.height - sourceY
          );

          // 創建當前頁面的canvas
          const pageCanvas = document.createElement('canvas');
          const pageCtx = pageCanvas.getContext('2d');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;

          if (pageCtx) {
            pageCtx.drawImage(
              canvas,
              0, sourceY, canvas.width, sourceHeight,
              0, 0, canvas.width, sourceHeight
            );

            const pageImgData = pageCanvas.toDataURL('image/png');
            const currentPageHeight = Math.min(maxHeightPerPage, imgHeight - yPosition);

            pdf.addImage(pageImgData, 'PNG', 10, 10, imgWidth, currentPageHeight);
          }

          yPosition += maxHeightPerPage;
        }
      } else {
        // 單頁顯示
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      }

      // 生成文件名
      const now = new Date();
      const timestamp = now.toISOString().split('T')[0];
      const periodText = reportPeriod === '7d' ? '7天' : reportPeriod === '30d' ? '30天' : '90天';
      const filename = `健康報告_${periodText}_${timestamp}.pdf`;

      // 下載PDF
      pdf.save(filename);

      alert('中文PDF報告已成功生成並下載！');

    } catch (error) {
      console.error('生成中文PDF時發生錯誤:', error);
      alert('生成PDF報告時發生錯誤，請稍後再試');
    } finally {
      setIsGenerating(false);
    }
  };

  // 生成PDF報告
  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const filteredData = getFilteredData();
      const stats = calculateStats(filteredData);

      if (!stats) {
        alert('選定期間內數據不足，無法生成報告');
        setIsGenerating(false);
        return;
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // 標題 - 使用英文避免中文字體問題
      pdf.setFontSize(20);
      pdf.text('Diet Daily - Health Tracking Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // 中文副標題 - 使用支援Unicode的方式
      pdf.setFontSize(16);
      // 暫時用英文替代避免亂碼，或使用圖片方式
      pdf.text('Health Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // 報告期間
      pdf.setFontSize(12);
      pdf.text(`Report Period: ${stats.reportPeriodDays} days (${new Date(Date.now() - stats.reportPeriodDays * 24 * 60 * 60 * 1000).toLocaleDateString()} - ${new Date().toLocaleDateString()})`, 20, yPosition);
      yPosition += 10;
      pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 20, yPosition);
      yPosition += 20;

      // 基本資訊
      if (reportSections[0].enabled && patientInfo) {
        pdf.setFontSize(16);
        pdf.text('Patient Information', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        if (patientInfo.name) {
          pdf.text(`Patient Name: ${sanitizeForPDF(patientInfo.name)}`, 25, yPosition);
          yPosition += 7;
        }
        if (patientInfo.age) {
          pdf.text(`Age: ${patientInfo.age}`, 25, yPosition);
          yPosition += 7;
        }
        if (patientInfo.conditions && patientInfo.conditions.length > 0) {
          const sanitizedConditions = sanitizeArray(patientInfo.conditions);
          pdf.text(`Primary Conditions: ${sanitizedConditions.join(', ')}`, 25, yPosition);
          yPosition += 7;
        }
        yPosition += 10;
      }

      // 症狀趨勢摘要
      if (reportSections[1].enabled) {
        pdf.setFontSize(16);
        pdf.text('Symptom Trends Summary', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        pdf.text(`Average Symptom Severity: ${stats.avgSeverity}/4`, 25, yPosition);
        yPosition += 7;
        pdf.text(`Average Activity Impact: ${stats.avgActivity}/4`, 25, yPosition);
        yPosition += 7;
        pdf.text(`Average Mood Impact: ${stats.avgMood}/4`, 25, yPosition);
        yPosition += 7;
        pdf.text(`Average Sleep Quality: ${stats.avgSleep}/4`, 25, yPosition);
        yPosition += 7;

        // 翻譯趨勢方向
        const trendTranslation = {
          '改善': 'Improving',
          '惡化': 'Worsening',
          '穩定': 'Stable'
        };
        const trendText = trendTranslation[stats.trendDirection] || stats.trendDirection;
        pdf.text(`Symptom Trend: ${trendText}`, 25, yPosition);
        yPosition += 15;
      }

      // 飲食記錄分析
      if (reportSections[2].enabled) {
        pdf.setFontSize(16);
        pdf.text('Dietary Analysis', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        pdf.text(`Total Food Records: ${stats.totalFoodEntries}`, 25, yPosition);
        yPosition += 7;
        pdf.text(`High-risk Food Types: ${stats.uniqueHighRiskFoods.length}`, 25, yPosition);
        yPosition += 7;

        if (stats.uniqueHighRiskFoods.length > 0) {
          pdf.text('Main High-risk Foods:', 25, yPosition);
          yPosition += 7;
          stats.uniqueHighRiskFoods.slice(0, 8).forEach((food: string, index: number) => {
            const sanitizedFood = sanitizeForPDF(food);
            pdf.text(`  ${index + 1}. ${sanitizedFood}`, 30, yPosition);
            yPosition += 6;
          });
        }
        yPosition += 10;
      }

      // 症狀詳細記錄
      if (reportSections[3].enabled) {
        pdf.setFontSize(16);
        pdf.text('Detailed Symptom Records', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        pdf.text(`Total Symptom Records: ${stats.totalSymptomRecords}`, 25, yPosition);
        yPosition += 7;

        if (stats.topSymptoms.length > 0) {
          pdf.text('Most Common Symptoms:', 25, yPosition);
          yPosition += 7;
          stats.topSymptoms.forEach(([symptom, count]: [string, number], index: number) => {
            const sanitizedSymptom = sanitizeForPDF(symptom);
            pdf.text(`  ${index + 1}. ${sanitizedSymptom} (${count} times)`, 30, yPosition);
            yPosition += 6;
          });
        }
        yPosition += 15;
      }

      // 檢查是否需要新頁面
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = 20;
      }

      // Medical recommendations
      if (reportSections[5].enabled) {
        const recommendations = generateRecommendations(stats);

        pdf.setFontSize(16);
        pdf.text('Medical Recommendations', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        recommendations.forEach((rec, index) => {
          const lines = pdf.splitTextToSize(`${index + 1}. ${rec}`, pageWidth - 50);
          lines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = 20;
            }
            pdf.text(line, 25, yPosition);
            yPosition += 6;
          });
          yPosition += 3;
        });
        yPosition += 15;
      }

      // 免責聲明
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(10);
      pdf.setTextColor(100);
      const disclaimer = 'Medical Disclaimer: This report is for reference only and cannot replace professional medical advice. For health issues, please consult qualified healthcare professionals.';
      const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - 40);
      disclaimerLines.forEach((line: string) => {
        pdf.text(line, 20, yPosition);
        yPosition += 5;
      });

      // 生成文件名
      const periodLabel = reportPeriod === '7d' ? '7days' : reportPeriod === '30d' ? '30days' : '90days';
      const fileName = `Diet_Daily_Health_Report_${periodLabel}_${new Date().toISOString().split('T')[0]}.pdf`;

      // 保存PDF
      pdf.save(fileName);

    } catch (error) {
      console.error('PDF report generation failed:', error);

      // 詳細錯誤信息
      let errorMessage = 'Error generating PDF report, please try again later';
      if (error instanceof Error) {
        if (error.message.includes('font')) {
          errorMessage = 'Font loading failed, attempting to generate report with default font';
        } else if (error.message.includes('canvas')) {
          errorMessage = 'Chart generation failed, please check if browser supports Canvas';
        } else {
          errorMessage = `Error details: ${error.message}`;
        }
      }

      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSection = (index: number) => {
    const newSections = [...reportSections];
    newSections[index].enabled = !newSections[index].enabled;
    setReportSections(newSections);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">PDF 報告匯出</h2>

        {/* 報告設定 */}
        <div className="space-y-6">
          {/* 報告期間選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">報告期間</label>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value as typeof reportPeriod)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="7d">最近 7 天</option>
              <option value="30d">最近 30 天</option>
              <option value="90d">最近 90 天</option>
            </select>
          </div>

          {/* 報告章節選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">包含章節</label>
            <div className="space-y-2">
              {reportSections.map((section, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`section-${index}`}
                    checked={section.enabled}
                    onChange={() => toggleSection(index)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={`section-${index}`} className="ml-3 text-sm text-gray-700">
                    {section.title}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* 數據預覽 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">數據預覽</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">健康記錄</div>
                <div className="font-semibold">{getFilteredData().healthData.length} 筆</div>
              </div>
              <div>
                <div className="text-gray-600">症狀記錄</div>
                <div className="font-semibold">{getFilteredData().symptomRecords.length} 筆</div>
              </div>
              <div>
                <div className="text-gray-600">飲食記錄</div>
                <div className="font-semibold">{getFilteredData().foodEntries.length} 筆</div>
              </div>
              <div>
                <div className="text-gray-600">期間</div>
                <div className="font-semibold">
                  {reportPeriod === '7d' ? '7 天' : reportPeriod === '30d' ? '30 天' : '90 天'}
                </div>
              </div>
            </div>
          </div>

          {/* 生成按鈕 */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                try {
                  console.log('=== 開始報告預覽 ===');

                  // 步驟1: 獲取過濾數據
                  console.log('步驟1: 獲取原始數據...');
                  console.log('原始健康數據:', healthData);
                  console.log('原始症狀記錄:', symptomRecords);
                  console.log('原始飲食記錄:', foodEntries);

                  const data = getFilteredData();
                  console.log('步驟2: 過濾後數據:', data);

                  if (!data || typeof data !== 'object') {
                    alert('獲取數據失敗，請重新載入頁面');
                    return;
                  }

                  if (!data.healthData || data.healthData.length === 0) {
                    alert('選定期間內無健康數據可供預覽');
                    return;
                  }

                  // Step 3: Calculating statistics
                  console.log('步驟3: 計算統計數據...');
                  const stats = calculateStats(data);
                  console.log('計算出的統計數據:', stats);

                  if (!stats) {
                    alert('無法計算統計數據，數據可能不完整或格式不正確');
                    return;
                  }

                  // 步驟4: 生成建議
                  console.log('步驟4: 生成醫療建議...');
                  const recommendations = generateRecommendations(stats);
                  console.log('生成的醫療建議:', recommendations);

                  // 步驟5: 安全地構建預覽信息
                  const safeValue = (value: any, defaultValue: any = 'Unknown') => {
                    if (value === null || value === undefined) return defaultValue;
                    if (typeof value === 'number' && isNaN(value)) return defaultValue;
                    return value;
                  };

                  const formatNumber = (num: any, decimals = 1) => {
                    const n = parseFloat(num);
                    return isNaN(n) ? '0.0' : n.toFixed(decimals);
                  };

                  let topSymptomsText = 'No major symptom records';
                  try {
                    if (Array.isArray(stats.topSymptoms) && stats.topSymptoms.length > 0) {
                      topSymptomsText = stats.topSymptoms
                        .map(([name, count]: [string, number]) => `${sanitizeForPDF(name)}(${count} times)`)
                        .join(', ');
                    }
                  } catch (e) {
                    console.warn('Error processing symptom data:', e);
                  }

                  // 顯示詳細的預覽信息
                  const previewInfo = `
Report Preview Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 數據統計:
• Health Records: ${safeValue(data.healthData?.length, 0)} entries
• Symptom Records: ${safeValue(data.symptomRecords?.length, 0)} entries
• Food Entries: ${safeValue(data.foodEntries?.length, 0)} entries
• 報告期間: ${safeValue(stats.reportPeriodDays, 0)} 天

📈 Health Indicators:
• Average Symptom Severity: ${formatNumber(stats.avgSeverity)}/4
• Average Activity Impact: ${formatNumber(stats.avgActivity)}/4
• Average Mood Impact: ${formatNumber(stats.avgMood)}/4
• Average Sleep Quality: ${formatNumber(stats.avgSleep)}/4
• Symptom Trend: ${safeValue(stats.trendDirection, 'No trend data')}

🍽️ Dietary Analysis:
• High-risk Food Types: ${safeValue(stats.uniqueHighRiskFoods?.length, 0)}
• Main Symptoms: ${topSymptomsText}

💡 Medical Recommendations: ${safeValue(recommendations?.length, 0)} items

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detailed data output to browser console (F12 > Console)
Preview successful! Report data integrity is good.
                  `;

                  console.log('========== 報告預覽詳細數據 ==========');
                  console.log('統計數據:', stats);
                  console.log('醫療建議:', recommendations);
                  console.log('原始數據:', data);
                  console.log('=======================================');

                  alert(previewInfo);

                } catch (error) {
                  console.error('Error during report preview:', error);
                  console.error('Error stack:', error instanceof Error ? error.stack : 'Unknown error');

                  // 提供更詳細的錯誤信息
                  let errorMessage = 'Error during report preview:\n\n';
                  if (error instanceof Error) {
                    if (error.message.includes('Cannot read propert')) {
                      errorMessage += 'Data structure anomaly, please check the format of health data, symptom records, or food entries.';
                    } else if (error.message.includes('map') || error.message.includes('forEach')) {
                      errorMessage += 'Data traversal failed, some data may not be in the expected array format.';
                    } else {
                      errorMessage += `Specific error: ${error.message}`;
                    }
                  } else {
                    errorMessage += 'Unknown error type, please check browser console for more information.';
                  }

                  errorMessage += '\n\nPlease try reloading the page or contact technical support.';
                  alert(errorMessage);
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              預覽報告
            </button>
            <button
              onClick={generateChinesePDF}
              disabled={isGenerating || getFilteredData().healthData.length === 0}
              className={`px-6 py-2 rounded-md text-sm font-medium ${
                isGenerating || getFilteredData().healthData.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isGenerating ? '生成中...' : '生成中文 PDF 報告'}
            </button>
          </div>

          {/* 說明文字 */}
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <div className="font-medium text-blue-800 mb-1">報告內容說明:</div>
            <ul className="space-y-1 text-blue-700">
              <li>• 報告將包含選定期間內的健康數據統計分析</li>
              <li>• 症狀趨勢、飲食記錄和風險評估</li>
              <li>• 基於數據的個人化Medical recommendations</li>
              <li>• 適合與醫療專業人員分享討論</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 隱藏的中文報告內容，用於PDF生成 */}
      <div ref={reportContentRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '210mm', padding: '20mm', fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#000' }}>
        {(() => {
          const data = getFilteredData();
          const stats = calculateStats(data);
          if (!stats) return null;

          const recommendations = generateRecommendations(stats);
          return (
            <div>
              <h1 style={{ textAlign: 'center', fontSize: '18px', marginBottom: '20px', color: '#2563eb' }}>
                健康追蹤報告 ({reportPeriod === '7d' ? '7天' : reportPeriod === '30d' ? '30天' : '90天'})
              </h1>

              {patientInfo && (
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '16px', marginBottom: '10px', borderBottom: '1px solid #ccc' }}>基本資訊</h2>
                  {patientInfo.name && <p><strong>姓名:</strong> {patientInfo.name}</p>}
                  {patientInfo.age && <p><strong>年齡:</strong> {patientInfo.age} 歲</p>}
                  {patientInfo.conditions && patientInfo.conditions.length > 0 && (
                    <p><strong>現有疾病:</strong> {patientInfo.conditions.join(', ')}</p>
                  )}
                  {patientInfo.medications && patientInfo.medications.length > 0 && (
                    <p><strong>目前用藥:</strong> {patientInfo.medications.join(', ')}</p>)}
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', marginBottom: '10px', borderBottom: '1px solid #ccc' }}>健康指標概覽</h2>
                <p><strong>平均症狀嚴重度:</strong> {stats.avgSeverity}/5</p>
                <p><strong>活動影響程度:</strong> {stats.avgActivity}/5</p>
                <p><strong>情緒影響程度:</strong> {stats.avgMood}/5</p>
                <p><strong>睡眠品質:</strong> {stats.avgSleep}/5</p>
                <p><strong>總健康記錄數:</strong> {stats.totalHealthRecords} 筆</p>
                <p><strong>症狀記錄數:</strong> {stats.totalSymptomRecords} 筆</p>
                <p><strong>飲食記錄數:</strong> {stats.totalFoodEntries} 筆</p>
                <p><strong>症狀趨勢:</strong> {stats.trendDirection}</p>
              </div>

              {stats.topSymptoms.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '16px', marginBottom: '10px', borderBottom: '1px solid #ccc' }}>主要症狀分析</h2>
                  {stats.topSymptoms.map(([symptom, count]: [string, number], index: number) => (
                    <p key={index}>{index + 1}. {symptom} ({count} 次)</p>
                  ))}
                </div>
              )}

              {stats.uniqueHighRiskFoods.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '16px', marginBottom: '10px', borderBottom: '1px solid #ccc' }}>高風險食物清單</h2>
                  {stats.uniqueHighRiskFoods.slice(0, 8).map((food: string, index: number) => (
                    <p key={index}>{index + 1}. {food}</p>
                  ))}
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', marginBottom: '10px', borderBottom: '1px solid #ccc' }}>醫療建議</h2>
                {recommendations.map((rec: string, index: number) => (
                  <p key={index} style={{ marginBottom: '8px' }}>• {rec}</p>
                ))}
              </div>

              <div style={{ marginTop: '30px', fontSize: '10px', color: '#666', textAlign: 'center' }}>
                <p>此報告由 Diet Daily 健康追蹤系統生成</p>
                <p>生成時間: {new Date().toLocaleString('zh-TW')}</p>
                <p>免責聲明: 此報告僅供參考，不可替代專業醫療建議</p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default PDFReportExporter;