/**
 * Diet Daily - Google Sheets 資料同步系統
 * 將使用者的飲食和健康資料同步到 Google Sheets
 */

import { google } from 'googleapis';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  worksheetName: string;
  credentials: {
    client_id: string;
    client_secret: string;
    refresh_token: string;
  };
}

export interface SyncData {
  foodHistory: any[];
  medicalProfile: any;
  symptoms: any[];
  reports: any[];
  symptomAnalysis?: any[];
  correlationData?: any[];
  trendPredictions?: any[];
}

class GoogleSheetsSyncManager {
  private sheets: any;
  private auth: any;

  constructor() {
    this.initializeAuth();
  }

  /**
   * 初始化 Google Sheets API 認證
   */
  private async initializeAuth() {
    try {
      this.auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // 設定 refresh token (需要從環境變數或用戶設定獲取)
      this.auth.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });

      console.log('✅ Google Sheets API 初始化成功');
    } catch (error) {
      console.error('❌ Google Sheets API 初始化失敗:', error);
    }
  }

  /**
   * 創建新的試算表
   */
  async createSpreadsheet(title: string = 'Diet Daily - 健康追蹤資料'): Promise<string | null> {
    try {
      const response = await this.sheets.spreadsheets.create({
        resource: {
          properties: {
            title,
            locale: 'zh_TW',
            timeZone: 'Asia/Taipei'
          },
          sheets: [
            {
              properties: {
                title: '食物歷史',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 15
                }
              }
            },
            {
              properties: {
                title: '症狀記錄',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10
                }
              }
            },
            {
              properties: {
                title: '醫療報告',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 20
                }
              }
            },
            {
              properties: {
                title: '醫療設定檔',
                gridProperties: {
                  rowCount: 100,
                  columnCount: 10
                }
              }
            },
            {
              properties: {
                title: '症狀分析結果',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 15
                }
              }
            },
            {
              properties: {
                title: '食物症狀關聯性',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 12
                }
              }
            },
            {
              properties: {
                title: '趨勢預測',
                gridProperties: {
                  rowCount: 500,
                  columnCount: 10
                }
              }
            }
          ]
        }
      });

      const spreadsheetId = response.data.spreadsheetId;

      // 設定標題行
      await this.setupHeaders(spreadsheetId);

      console.log(`📊 試算表已創建: ${spreadsheetId}`);
      return spreadsheetId;
    } catch (error) {
      console.error('創建試算表失敗:', error);
      return null;
    }
  }

  /**
   * 設定各工作表的標題行
   */
  private async setupHeaders(spreadsheetId: string) {
    try {
      const updates = [
        {
          range: '食物歷史!A1:O1',
          values: [[
            '日期', '時間', '食物ID', '食物名稱', '食物類別',
            '份量', '單位', '醫療評分', '風險等級', '過敏警告',
            '症狀前', '症狀後', '嚴重度', '備註', '位置'
          ]]
        },
        {
          range: '症狀記錄!A1:J1',
          values: [[
            '日期', '時間', '症狀類型', '嚴重度', '評分',
            '持續時間', '觸發因子', '相關食物', '備註', '活動影響'
          ]]
        },
        {
          range: '醫療報告!A1:T1',
          values: [[
            '生成日期', '報告類型', '開始日期', '結束日期', '總食物數',
            '不同食物數', '平均醫療評分', '高風險食物', '症狀次數', '主要發現',
            '建議1', '建議2', '建議3', '建議4', '建議5',
            '警告信號', '信心度', '資料點數', '主要條件', '免責聲明'
          ]]
        },
        {
          range: '醫療設定檔!A1:J1',
          values: [[
            '更新日期', '主要條件', '次要條件', '已知過敏', '個人觸發因子',
            '當前階段', '乳糖不耐', '纖維敏感', 'IBS 亞型', 'FODMAP 耐受性'
          ]]
        },
        {
          range: '症狀分析結果!A1:O1',
          values: [[
            '分析日期', '症狀', '頻率', '平均嚴重度', '最高嚴重度', '總持續時間',
            '主要觸發因子', '時間模式', '活動影響', '心情影響', '相關性分數',
            '風險等級', '預測趨勢', '建議行動', '置信度'
          ]]
        },
        {
          range: '食物症狀關聯性!A1:L1',
          values: [[
            '分析日期', '食物名稱', '食物分類', '症狀', '相關性係數', '置信度',
            '發生次數', '平均延遲時間', '風險等級', '建議行動', '影響嚴重度', '統計顯著性'
          ]]
        },
        {
          range: '趨勢預測!A1:J1',
          values: [[
            '預測日期', '指標類型', '預測值', '置信度', '風險等級',
            '趨勢方向', '季節調整', '週期性因子', '建議', '模型版本'
          ]]
        }
      ];

      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: 'RAW',
          data: updates
        }
      });

      console.log('📋 標題行設定完成');
    } catch (error) {
      console.error('設定標題行失敗:', error);
    }
  }

  /**
   * 同步食物歷史資料
   */
  async syncFoodHistory(spreadsheetId: string, foodHistory: any[]): Promise<boolean> {
    try {
      if (foodHistory.length === 0) {
        console.log('📭 沒有食物歷史資料需要同步');
        return true;
      }

      // 準備資料
      const rows = foodHistory.map(entry => [
        new Date(entry.consumedAt).toLocaleDateString('zh-TW'),
        new Date(entry.consumedAt).toLocaleTimeString('zh-TW'),
        entry.foodId,
        entry.foodData?.name_zh || entry.foodData?.name_en || '未知',
        entry.foodData?.category || '未分類',
        `${entry.portion.amount} ${entry.portion.unit}`,
        entry.portion.customUnit || entry.portion.unit,
        entry.medicalScore?.score || 'N/A',
        entry.medicalScore?.level || 'N/A',
        entry.allergyWarnings?.length ? entry.allergyWarnings.join('; ') : '無',
        entry.symptoms?.before?.join('; ') || '無',
        entry.symptoms?.after?.join('; ') || '無',
        entry.symptoms?.severity || 'N/A',
        entry.notes || '',
        entry.location || ''
      ]);

      // 清除現有資料（保留標題行）
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: '食物歷史!A2:O1000'
      });

      // 插入新資料
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `食物歷史!A2:O${rows.length + 1}`,
        valueInputOption: 'RAW',
        resource: {
          values: rows
        }
      });

      console.log(`🍽️ 已同步 ${rows.length} 筆食物歷史記錄`);
      return true;
    } catch (error) {
      console.error('同步食物歷史失敗:', error);
      return false;
    }
  }

  /**
   * 同步症狀記錄
   */
  async syncSymptoms(spreadsheetId: string, symptoms: any[]): Promise<boolean> {
    try {
      if (symptoms.length === 0) {
        console.log('📭 沒有症狀記錄需要同步');
        return true;
      }

      const rows = symptoms.flatMap(entry =>
        entry.symptoms.map((symptom: any) => [
          new Date(entry.recordedAt).toLocaleDateString('zh-TW'),
          new Date(symptom.timestamp).toLocaleTimeString('zh-TW'),
          symptom.type,
          symptom.severity,
          symptom.severity_score,
          `${symptom.duration} 分鐘`,
          symptom.triggers?.join('; ') || '無',
          symptom.related_food_ids?.join('; ') || '無',
          symptom.notes || '',
          symptom.activity_impact || '無'
        ])
      );

      // 清除現有資料
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: '症狀記錄!A2:J1000'
      });

      // 插入新資料
      if (rows.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `症狀記錄!A2:J${rows.length + 1}`,
          valueInputOption: 'RAW',
          resource: {
            values: rows
          }
        });
      }

      console.log(`🩺 已同步 ${rows.length} 筆症狀記錄`);
      return true;
    } catch (error) {
      console.error('同步症狀記錄失敗:', error);
      return false;
    }
  }

  /**
   * 同步醫療報告
   */
  async syncReports(spreadsheetId: string, reports: any[]): Promise<boolean> {
    try {
      if (reports.length === 0) {
        console.log('📭 沒有醫療報告需要同步');
        return true;
      }

      const rows = reports.map(report => [
        new Date(report.metadata.generatedAt).toLocaleDateString('zh-TW'),
        report.reportType,
        report.period.startDate,
        report.period.endDate,
        report.summary.totalFoods,
        report.summary.uniqueFoods,
        report.summary.averageMedicalScore,
        report.summary.highRiskFoods || 0,
        report.summary.totalSymptoms || 0,
        report.medicalInsights.keyFindings.slice(0, 1).join('; '),
        report.medicalInsights.recommendations[0] || '',
        report.medicalInsights.recommendations[1] || '',
        report.medicalInsights.recommendations[2] || '',
        report.medicalInsights.recommendations[3] || '',
        report.medicalInsights.recommendations[4] || '',
        report.medicalInsights.warningSignals.join('; '),
        report.metadata.confidenceScore,
        report.metadata.dataPoints,
        report.metadata.primaryCondition || '',
        report.metadata.disclaimer
      ]);

      // 清除現有資料
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: '醫療報告!A2:T1000'
      });

      // 插入新資料
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `醫療報告!A2:T${rows.length + 1}`,
        valueInputOption: 'RAW',
        resource: {
          values: rows
        }
      });

      console.log(`📊 已同步 ${rows.length} 筆醫療報告`);
      return true;
    } catch (error) {
      console.error('同步醫療報告失敗:', error);
      return false;
    }
  }

  /**
   * 同步醫療設定檔
   */
  async syncMedicalProfile(spreadsheetId: string, profile: any): Promise<boolean> {
    try {
      if (!profile) {
        console.log('📭 沒有醫療設定檔需要同步');
        return true;
      }

      const row = [
        new Date().toLocaleDateString('zh-TW'),
        profile.primary_condition,
        profile.secondary_conditions?.join('; ') || '',
        profile.known_allergies?.join('; ') || '',
        profile.personal_triggers?.join('; ') || '',
        profile.current_phase || '',
        profile.lactose_intolerant ? '是' : '否',
        profile.fiber_sensitive ? '是' : '否',
        profile.ibs_subtype || '',
        JSON.stringify(profile.fodmap_tolerance || {})
      ];

      // 清除現有資料
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: '醫療設定檔!A2:J100'
      });

      // 插入新資料
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: '醫療設定檔!A2:J2',
        valueInputOption: 'RAW',
        resource: {
          values: [row]
        }
      });

      console.log('👤 已同步醫療設定檔');
      return true;
    } catch (error) {
      console.error('同步醫療設定檔失敗:', error);
      return false;
    }
  }

  /**
   * 完整資料同步
   */
  async syncAllData(spreadsheetId: string, data: SyncData): Promise<boolean> {
    try {
      console.log('🔄 開始完整資料同步...');

      const results = await Promise.allSettled([
        this.syncFoodHistory(spreadsheetId, data.foodHistory),
        this.syncSymptoms(spreadsheetId, data.symptoms),
        this.syncReports(spreadsheetId, data.reports),
        this.syncMedicalProfile(spreadsheetId, data.medicalProfile),
        ...(data.symptomAnalysis ? [this.syncSymptomAnalysis(spreadsheetId, data.symptomAnalysis)] : []),
        ...(data.correlationData ? [this.syncCorrelationData(spreadsheetId, data.correlationData)] : []),
        ...(data.trendPredictions ? [this.syncTrendPredictions(spreadsheetId, data.trendPredictions)] : [])
      ]);

      const successful = results.filter(result =>
        result.status === 'fulfilled' && result.value === true
      ).length;

      const total = results.length;

      console.log(`✅ 同步完成: ${successful}/${total} 成功`);

      return successful === total;
    } catch (error) {
      console.error('完整資料同步失敗:', error);
      return false;
    }
  }

  /**
   * 取得試算表資訊
   */
  async getSpreadsheetInfo(spreadsheetId: string) {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId
      });

      return {
        title: response.data.properties?.title,
        url: response.data.spreadsheetUrl,
        sheets: response.data.sheets?.map((sheet: any) => ({
          title: sheet.properties?.title,
          id: sheet.properties?.sheetId
        }))
      };
    } catch (error) {
      console.error('取得試算表資訊失敗:', error);
      return null;
    }
  }

  /**
   * 同步症狀分析結果
   */
  async syncSymptomAnalysis(spreadsheetId: string, analysisResults: any[]): Promise<boolean> {
    try {
      if (analysisResults.length === 0) {
        console.log('📭 沒有症狀分析結果需要同步');
        return true;
      }

      const rows = analysisResults.map(result => [
        new Date().toLocaleDateString('zh-TW'),
        result.symptom,
        result.frequency,
        result.averageSeverity.toFixed(2),
        result.maxSeverity || 'N/A',
        result.totalDuration || 'N/A',
        result.commonTriggers?.slice(0, 3).join('; ') || '無',
        result.timePattern || '無特定模式',
        result.averageActivityImpact?.toFixed(2) || 'N/A',
        result.averageMoodImpact?.toFixed(2) || 'N/A',
        result.correlationScore?.toFixed(3) || 'N/A',
        result.riskLevel || 'unknown',
        result.predictedTrend || 'stable',
        result.recommendedAction || '持續觀察',
        result.confidence?.toFixed(2) || 'N/A'
      ]);

      // 清除現有資料
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: '症狀分析結果!A2:O1000'
      });

      // 插入新資料
      if (rows.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `症狀分析結果!A2:O${rows.length + 1}`,
          valueInputOption: 'RAW',
          resource: {
            values: rows
          }
        });
      }

      console.log(`🧠 已同步 ${rows.length} 筆症狀分析結果`);
      return true;
    } catch (error) {
      console.error('同步症狀分析結果失敗:', error);
      return false;
    }
  }

  /**
   * 同步食物症狀關聯性資料
   */
  async syncCorrelationData(spreadsheetId: string, correlationData: any[]): Promise<boolean> {
    try {
      if (correlationData.length === 0) {
        console.log('📭 沒有關聯性資料需要同步');
        return true;
      }

      const rows = correlationData.map(correlation => [
        new Date().toLocaleDateString('zh-TW'),
        correlation.food,
        correlation.foodCategory || '未分類',
        correlation.symptom,
        correlation.correlation.toFixed(3),
        correlation.confidence.toFixed(3),
        correlation.occurrences,
        correlation.avgTimeLag?.toFixed(1) || 'N/A',
        correlation.riskLevel,
        correlation.recommendedAction || '持續觀察',
        correlation.severityImpact?.toFixed(2) || 'N/A',
        correlation.statisticalSignificance || 'N/A'
      ]);

      // 清除現有資料
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: '食物症狀關聯性!A2:L1000'
      });

      // 插入新資料
      if (rows.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `食物症狀關聯性!A2:L${rows.length + 1}`,
          valueInputOption: 'RAW',
          resource: {
            values: rows
          }
        });
      }

      console.log(`🔗 已同步 ${rows.length} 筆關聯性分析資料`);
      return true;
    } catch (error) {
      console.error('同步關聯性資料失敗:', error);
      return false;
    }
  }

  /**
   * 同步趨勢預測資料
   */
  async syncTrendPredictions(spreadsheetId: string, trendPredictions: any[]): Promise<boolean> {
    try {
      if (trendPredictions.length === 0) {
        console.log('📭 沒有趨勢預測資料需要同步');
        return true;
      }

      const rows = trendPredictions.map(prediction => [
        prediction.date,
        prediction.metricType || 'symptomSeverity',
        prediction.predicted.toFixed(2),
        prediction.confidence.toFixed(2),
        prediction.riskLevel,
        prediction.trendDirection || 'stable',
        prediction.factors?.seasonal?.toFixed(3) || '0',
        prediction.factors?.cyclical?.toFixed(3) || '0',
        prediction.recommendations?.slice(0, 2).join('; ') || '無特別建議',
        prediction.modelVersion || 'v1.0'
      ]);

      // 清除現有資料
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: '趨勢預測!A2:J500'
      });

      // 插入新資料
      if (rows.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `趨勢預測!A2:J${rows.length + 1}`,
          valueInputOption: 'RAW',
          resource: {
            values: rows
          }
        });
      }

      console.log(`📈 已同步 ${rows.length} 筆趨勢預測資料`);
      return true;
    } catch (error) {
      console.error('同步趨勢預測資料失敗:', error);
      return false;
    }
  }

  /**
   * 檢查 Google Sheets API 連線狀態
   */
  async checkConnection(): Promise<boolean> {
    try {
      // 嘗試列出試算表（測試連線）
      await this.sheets.spreadsheets.create({
        resource: {
          properties: {
            title: 'Connection Test'
          }
        }
      });

      console.log('✅ Google Sheets 連線正常');
      return true;
    } catch (error) {
      console.error('❌ Google Sheets 連線失敗:', error);
      return false;
    }
  }
}

// 匯出單例實例
export const googleSheetsSync = new GoogleSheetsSyncManager();

// 為測試匯出類別
export { GoogleSheetsSyncManager };