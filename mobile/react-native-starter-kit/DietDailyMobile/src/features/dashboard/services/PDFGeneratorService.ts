// PDF 報告生成服務
// 將健康報告轉換為 PDF 並透過 iOS 分享功能分享

import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type {
  WeeklyHealthReport,
  DailyHealthData,
  PDFGenerationOptions,
  PDFGenerationResult
} from '../types/report'

export class PDFGeneratorService {
  /**
   * 生成並分享 PDF 報告
   */
  static async generateAndShare(
    report: WeeklyHealthReport,
    options?: PDFGenerationOptions
  ): Promise<PDFGenerationResult> {
    try {
      console.log('[PDFGeneratorService] Generating PDF...')

      // 1. 生成 HTML 內容
      const html = this.generateHTML(report, options)

      // 2. 轉換為 PDF
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      })

      console.log('[PDFGeneratorService] PDF generated:', uri)

      // 3. 檢查是否可分享
      const canShare = await Sharing.isAvailableAsync()
      if (!canShare) {
        return {
          success: false,
          error: '此裝置不支援分享功能'
        }
      }

      // 4. 分享 PDF
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: '分享健康報告',
        UTI: 'com.adobe.pdf'
      })

      console.log('[PDFGeneratorService] PDF shared successfully')
      return { success: true, uri }

    } catch (error) {
      console.error('[PDFGeneratorService] Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF 生成失敗'
      }
    }
  }

  /**
   * 生成 HTML 報告內容
   */
  private static generateHTML(
    report: WeeklyHealthReport,
    options?: PDFGenerationOptions
  ): string {
    const { summary, dailyData, statistics, aiAnalysis, startDate, endDate } = report
    const template = options?.template || 'patient'

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diet Daily 健康報告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang TC", "Microsoft JhengHei", "Helvetica Neue", sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      background: #fff;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
    }
    .header h1 {
      font-size: 28px;
      color: #1e40af;
      margin-bottom: 10px;
      font-weight: bold;
    }
    .header p {
      color: #64748b;
      font-size: 16px;
      margin: 5px 0;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 15px;
      border-left: 4px solid #2563eb;
      padding-left: 10px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #f1f5f9;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }
    .stat-label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
    }
    .daily-entry {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .daily-date {
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .meal-item {
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .meal-item:last-child { border-bottom: none; }
    .meal-item-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .meal-item-meta {
      font-size: 12px;
      color: #94a3b8;
    }
    .symptom-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      align-items: center;
    }
    .score-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .score-0 { background: #dcfce7; color: #166534; }
    .score-1 { background: #fef3c7; color: #92400e; }
    .score-2 { background: #fed7aa; color: #9a3412; }
    .score-3 { background: #fecaca; color: #991b1b; }
    .score-4 { background: #fca5a5; color: #7f1d1d; }
    .score-5 { background: #dc2626; color: #fff; }
    .ai-status {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .ai-insight {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    .ai-risky {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
    }
    .ai-safe {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      padding: 15px;
      border-radius: 8px;
      margin-top: 15px;
    }
    .disclaimer {
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 15px;
      border-radius: 8px;
      font-size: 12px;
      color: #991b1b;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .disclaimer strong {
      display: block;
      margin-bottom: 10px;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f8fafc;
      font-weight: bold;
      color: #475569;
      font-size: 13px;
    }
    td {
      font-size: 13px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 12px;
    }
    .completeness-bar {
      background: #e2e8f0;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 5px;
    }
    .completeness-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .no-data {
      color: #94a3b8;
      font-style: italic;
      padding: 10px 0;
    }
  </style>
</head>
<body>
  <!-- 標題 -->
  <div class="header">
    <h1>🏥 IBD 健康追蹤報告</h1>
    <p>${format(new Date(startDate), 'yyyy年MM月dd日', { locale: zhTW })} - ${format(new Date(endDate), 'yyyy年MM月dd日', { locale: zhTW })}</p>
    <p style="font-size: 14px; margin-top: 5px;">生成時間：${format(new Date(report.generatedAt), 'yyyy-MM-dd HH:mm', { locale: zhTW })}</p>
  </div>

  <!-- 摘要統計 -->
  <div class="section">
    <div class="section-title">📊 週報摘要</div>
    <div class="summary-grid">
      <div class="stat-card">
        <div class="stat-label">總飲食記錄</div>
        <div class="stat-value">${summary.totalFoods} 次</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">症狀記錄</div>
        <div class="stat-value">${summary.totalSymptomEntries} 次</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">排便次數</div>
        <div class="stat-value">${summary.totalBowelMovements} 次</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">資料完整度</div>
        <div class="stat-value">${Math.round(summary.dataCompleteness * 100)}%</div>
      </div>
    </div>
  </div>

  ${this.generateAISection(aiAnalysis)}
  ${this.generateDailySection(dailyData)}
  ${this.generateStatisticsSection(statistics)}
  ${this.generateDisclaimerSection()}

  <div class="footer">
    <p>本報告由 Diet Daily 應用程式自動生成</p>
    <p>版本：${report.metadata.reportVersion} | 時區：${report.metadata.timezone}</p>
  </div>
</body>
</html>
    `
  }

  /**
   * 生成 AI 分析區塊
   */
  private static generateAISection(aiAnalysis?: WeeklyHealthReport['aiAnalysis']): string {
    if (!aiAnalysis || aiAnalysis.status === 'unavailable') {
      return `
        <div class="section">
          <div class="ai-status">
            <strong>ℹ️ AI 分析狀態：</strong> 暫時無法使用
            <p style="margin-top: 10px; font-size: 13px;">AI 分析功能目前正在開發中。您可以先查看下方的原始資料和統計分析。</p>
          </div>
        </div>
      `
    }

    if (aiAnalysis.status === 'pending') {
      return `
        <div class="section">
          <div class="ai-status">
            <strong>⏳ AI 分析進行中...</strong>
            <p style="margin-top: 10px; font-size: 13px;">分析預計需要 1-2 分鐘。您可以稍後重新產生報告以查看 AI 洞察。</p>
          </div>
        </div>
      `
    }

    if (aiAnalysis.status === 'failed') {
      return `
        <div class="section">
          <div class="ai-status">
            <strong>⚠️ AI 分析失敗</strong>
            <p style="margin-top: 10px; font-size: 13px;">${aiAnalysis.error || '未知錯誤，請稍後再試'}</p>
          </div>
        </div>
      `
    }

    if (aiAnalysis.status === 'completed' && aiAnalysis.insights) {
      return `
        <div class="section">
          <div class="section-title">🤖 AI 健康洞察</div>
          <div class="ai-insight">
            ${aiAnalysis.insights.map(insight => `<p style="margin-bottom: 10px;">• ${this.escapeHtml(insight)}</p>`).join('')}
          </div>

          ${aiAnalysis.riskyFoods && aiAnalysis.riskyFoods.length > 0 ? `
            <div class="ai-risky">
              <strong>⚠️ 需要觀察的食物：</strong>
              <p style="margin-top: 10px;">${aiAnalysis.riskyFoods.map(f => this.escapeHtml(f)).join('、')}</p>
            </div>
          ` : ''}

          ${aiAnalysis.safeFoods && aiAnalysis.safeFoods.length > 0 ? `
            <div class="ai-safe">
              <strong>✅ 安全的食物：</strong>
              <p style="margin-top: 10px;">${aiAnalysis.safeFoods.map(f => this.escapeHtml(f)).join('、')}</p>
            </div>
          ` : ''}
        </div>
      `
    }

    return ''
  }

  /**
   * 生成每日記錄區塊
   */
  private static generateDailySection(dailyData: DailyHealthData[]): string {
    const dailyHTML = dailyData.map(day => {
      const dateStr = format(new Date(day.date), 'MM月dd日 EEEE', { locale: zhTW })
      const completenessPercent = Math.round(day.completeness * 100)

      return `
        <div class="daily-entry">
          <div class="daily-date">
            📅 ${dateStr}
            <span style="font-size: 14px; font-weight: normal; color: ${day.completeness > 0.7 ? '#16a34a' : day.completeness > 0.4 ? '#f59e0b' : '#94a3b8'};">
              (完整度: ${completenessPercent}%)
            </span>
          </div>

          <!-- 飲食記錄 -->
          ${day.foods.length > 0 ? `
            <div style="margin-top: 10px;">
              <strong style="color: #475569;">🍽️ 飲食記錄 (${day.foods.length} 次)</strong>
              ${day.foods.map(food => `
                <div class="meal-item">
                  <div class="meal-item-header">
                    <span>${this.escapeHtml(food.food_name)}</span>
                    ${food.meal_type ? `<span style="color: #64748b; font-size: 12px;">${this.getMealTypeLabel(food.meal_type)}</span>` : ''}
                  </div>
                  ${food.notes ? `<div class="meal-item-meta" style="margin-top: 4px; color: #94a3b8; font-size: 12px;">${this.escapeHtml(food.notes)}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : '<p class="no-data">無飲食記錄</p>'}

          <!-- 症狀記錄 -->
          ${day.symptoms ? `
            <div style="margin-top: 15px;">
              <strong style="color: #475569;">💊 症狀記錄</strong>
              <div style="margin-top: 10px;">
                <div class="symptom-row">
                  <span>整體健康</span>
                  <span class="score-badge score-${day.symptoms.overall_health || 0}">
                    ${day.symptoms.overall_health || 0}/5
                  </span>
                </div>
                <div class="symptom-row">
                  <span>腹痛程度</span>
                  <span class="score-badge score-${day.symptoms.abdominal_pain || 0}">
                    ${day.symptoms.abdominal_pain || 0}/5
                  </span>
                </div>
                <div class="symptom-row">
                  <span>腹瀉程度</span>
                  <span class="score-badge score-${day.symptoms.diarrhea || 0}">
                    ${day.symptoms.diarrhea || 0}/5
                  </span>
                </div>
                ${day.symptoms.bloating !== undefined && day.symptoms.bloating > 0 ? `
                <div class="symptom-row">
                  <span>脹氣程度</span>
                  <span class="score-badge score-${day.symptoms.bloating}">
                    ${day.symptoms.bloating}/5
                  </span>
                </div>
                ` : ''}
                ${day.symptoms.bloody_stool !== undefined && day.symptoms.bloody_stool > 0 ? `
                <div class="symptom-row">
                  <span>血便程度</span>
                  <span class="score-badge score-${day.symptoms.bloody_stool}">
                    ${day.symptoms.bloody_stool}/5
                  </span>
                </div>
                ` : ''}
              </div>
            </div>
          ` : '<p class="no-data" style="margin-top: 15px;">無症狀記錄</p>'}

          <!-- 排便記錄 -->
          ${day.bowelMovements.length > 0 ? `
            <div style="margin-top: 15px;">
              <strong style="color: #475569;">🚽 排便記錄 (${day.bowelMovements.length} 次)</strong>
              ${day.bowelMovements.map(bm => `
                <div style="margin-top: 5px; font-size: 13px; color: #64748b;">
                  Bristol Scale: ${bm.stool_type || '未記錄'}
                  ${bm.has_blood ? ' <span style="color: #dc2626; font-weight: bold;">⚠️ 有血</span>' : ''}
                  ${bm.difficulty ? ` | 難度: ${bm.difficulty}` : ''}
                </div>
              `).join('')}
            </div>
          ` : '<p class="no-data" style="margin-top: 15px;">無排便記錄</p>'}
        </div>
      `
    }).join('')

    return `
      <div class="section">
        <div class="section-title">📝 每日詳細記錄</div>
        ${dailyHTML}
      </div>
    `
  }

  /**
   * 生成統計分析區塊
   */
  private static generateStatisticsSection(statistics: any): string {
    return `
      <div class="section">
        <div class="section-title">📈 統計分析</div>

        <!-- 常吃食物 -->
        ${statistics.mostFrequentFoods.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <strong style="color: #475569;">最常食用的食物 (Top 10)：</strong>
            <table>
              <thead>
                <tr>
                  <th>食物名稱</th>
                  <th style="text-align: right;">次數</th>
                </tr>
              </thead>
              <tbody>
                ${statistics.mostFrequentFoods.map((food: any) => `
                  <tr>
                    <td>${this.escapeHtml(food.name)}</td>
                    <td style="text-align: right;">${food.count} 次</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- 症狀趨勢 -->
        ${statistics.symptomTrends.trend !== 'no_data' ? `
          <div style="margin-bottom: 20px;">
            <strong style="color: #475569;">症狀趨勢：</strong>
            <span style="font-size: 16px; font-weight: bold; color: ${
              statistics.symptomTrends.trend === 'improving' ? '#16a34a' :
              statistics.symptomTrends.trend === 'worsening' ? '#dc2626' : '#f59e0b'
            };">
              ${
                statistics.symptomTrends.trend === 'improving' ? '📈 改善中' :
                statistics.symptomTrends.trend === 'worsening' ? '📉 惡化中' : '➡️ 穩定'
              }
            </span>
            ${statistics.symptomTrends.avgScores ? `
              <div style="margin-top: 10px; font-size: 13px; color: #64748b;">
                <p>平均整體健康評分: ${statistics.symptomTrends.avgScores.overallHealth?.toFixed(1) || 'N/A'}/5</p>
                <p>平均腹痛程度: ${statistics.symptomTrends.avgScores.abdominalPain?.toFixed(1) || 'N/A'}/5</p>
                <p>平均腹瀉程度: ${statistics.symptomTrends.avgScores.diarrhea?.toFixed(1) || 'N/A'}/5</p>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- 排便統計 -->
        ${statistics.bowelMovementStats.totalCount > 0 ? `
          <div>
            <strong style="color: #475569;">排便統計：</strong>
            <p style="margin-top: 10px; font-size: 14px;">
              總次數：${statistics.bowelMovementStats.totalCount} 次 |
              平均每日：${statistics.bowelMovementStats.avgPerDay.toFixed(1)} 次
            </p>
            ${statistics.bowelMovementStats.hasBloodCount > 0 ? `
              <p style="color: #dc2626; margin-top: 5px; font-weight: bold;">
                ⚠️ 發現血便 ${statistics.bowelMovementStats.hasBloodCount} 次
              </p>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `
  }

  /**
   * 生成免責聲明區塊
   */
  private static generateDisclaimerSection(): string {
    return `
      <div class="disclaimer">
        <strong>⚠️ 重要聲明</strong>
        <p style="margin-top: 10px; line-height: 1.8;">
          1. 本報告僅供參考，不構成醫療建議或診斷依據。<br>
          2. 任何飲食調整或治療決策應諮詢您的主治醫師。<br>
          3. AI 分析結果基於統計模型，可能存在誤差。<br>
          4. 若症狀加重或出現緊急狀況，請立即就醫。<br>
          5. 本應用程式符合台灣個人資料保護法規範。
        </p>
      </div>
    `
  }

  /**
   * HTML 跳脫字元
   */
  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, m => map[m])
  }

  /**
   * 取得餐別標籤
   */
  private static getMealTypeLabel(mealType: string): string {
    const labels: Record<string, string> = {
      'breakfast': '早餐',
      'lunch': '午餐',
      'dinner': '晚餐',
      'snack': '點心'
    }
    return labels[mealType] || mealType
  }
}
