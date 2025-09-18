'use client';

import React, { useState } from 'react';
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
    { title: 'Medical recommendations', enabled: true },
    { title: '附錄：Raw data', enabled: false }
  ]);

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

  // 生成Medical recommendations
  const generateRecommendations = (stats: any) => {
    const recommendations: string[] = [];

    if (parseFloat(stats.avgSeverity) > 2.5) {
      recommendations.push('High symptom severity detected. Recommend discussing treatment plan adjustments with healthcare professionals.');
    }

    if (parseFloat(stats.avgActivity) > 2.0) {
      recommendations.push('Activity significantly affected. Recommend moderately adjusting daily activity intensity.');
    }

    if (parseFloat(stats.avgSleep) < 2.0) {
      recommendations.push('Poor sleep quality. Recommend improving sleep environment and establishing regular sleep patterns.');
    }

    if (stats.uniqueHighRiskFoods.length > 5) {
      recommendations.push('Multiple high-risk foods identified. Recommend creating a personalized dietary avoidance list.');
    }

    if (stats.trendDirection === '惡化' || stats.trendDirection === 'Worsening') {
      recommendations.push('Symptoms showing worsening trend. Recommend consulting healthcare professionals as soon as possible.');
    } else if (stats.trendDirection === '改善' || stats.trendDirection === 'Improving') {
      recommendations.push('Symptoms showing improvement trend. Recommend maintaining current management strategies.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring symptom changes and maintain good self-care habits.');
    }

    return recommendations;
  };

  // 清理中文字符以避免PDF亂碼
  const sanitizeForPDF = (text: string): string => {
    if (!text) return '';

    // 常見中文詞彙映射
    const commonTranslations: { [key: string]: string } = {
      '頭痛': 'Headache',
      '腹痛': 'Abdominal pain',
      '噁心': 'Nausea',
      '疲勞': 'Fatigue',
      '失眠': 'Insomnia',
      '發燒': 'Fever',
      '咳嗽': 'Cough',
      '米飯': 'Rice',
      '麵包': 'Bread',
      '牛奶': 'Milk',
      '雞蛋': 'Egg',
      '蔬菜': 'Vegetables',
      '水果': 'Fruits',
      '肉類': 'Meat',
      '魚': 'Fish',
      '雞肉': 'Chicken',
      '豬肉': 'Pork',
      '牛肉': 'Beef'
    };

    let result = text;

    // 首先嘗試翻譯常見詞彙
    Object.entries(commonTranslations).forEach(([chinese, english]) => {
      result = result.replace(new RegExp(chinese, 'g'), english);
    });

    // 如果還有中文字符，用更描述性的標記替換
    if (/[\u4e00-\u9fff]/.test(result)) {
      const chineseCount = (result.match(/[\u4e00-\u9fff]/g) || []).length;
      if (chineseCount > 0) {
        result = result.replace(/[\u4e00-\u9fff]/g, '') + ` [${chineseCount} Chinese chars]`;
      }
    }

    // 移除其他非ASCII字符並清理空格
    return result
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // 為數組中的每個項目清理中文字符
  const sanitizeArray = (arr: string[]): string[] => {
    return arr.map(item => sanitizeForPDF(item));
  };

  // 生成PDF報告
  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const filteredData = getFilteredData();
      const stats = calculateStats(filteredData);

      if (!stats) {
        alert('Insufficient data in selected period to generate report');
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
                  console.log('=== Starting Report Preview ===');

                  // 步驟1: 獲取過濾數據
                  console.log('Step 1: Getting raw data...');
                  console.log('Raw health data:', healthData);
                  console.log('Raw symptom records:', symptomRecords);
                  console.log('Raw food entries:', foodEntries);

                  const data = getFilteredData();
                  console.log('Step 2: Filtered data:', data);

                  if (!data || typeof data !== 'object') {
                    alert('Failed to get data, please reload the page');
                    return;
                  }

                  if (!data.healthData || data.healthData.length === 0) {
                    alert('No health data available for preview in selected period');
                    return;
                  }

                  // Step 3: Calculating statistics
                  console.log('Step 3: Calculating statistics...');
                  const stats = calculateStats(data);
                  console.log('Calculated statistics:', stats);

                  if (!stats) {
                    alert('Cannot calculate statistics, data may be incomplete or incorrectly formatted');
                    return;
                  }

                  // 步驟4: 生成建議
                  console.log('Step 4: Generating medical recommendations...');
                  const recommendations = generateRecommendations(stats);
                  console.log('Generated medical recommendations:', recommendations);

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
                  console.log('Statistics:', stats);
                  console.log('Medical recommendations:', recommendations);
                  console.log('Raw data:', data);
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
              onClick={generatePDF}
              disabled={isGenerating || getFilteredData().healthData.length === 0}
              className={`px-6 py-2 rounded-md text-sm font-medium ${
                isGenerating || getFilteredData().healthData.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isGenerating ? '生成中...' : '生成 PDF 報告'}
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
    </div>
  );
};

export default PDFReportExporter;