/**
 * Google Sheets 同步功能測試端點
 * 提供測試和演示功能，無需真實的 Google API 憑證
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, testType } = body;

    console.log(`🧪 Google Sheets 測試 - 用戶: ${userId}, 類型: ${testType}`);

    // 模擬不同的測試場景
    switch (testType) {
      case 'connection':
        // 測試連接
        return NextResponse.json({
          success: true,
          message: '✅ Google Sheets 連接測試成功',
          status: 'connected',
          mockData: {
            spreadsheetId: 'test_spreadsheet_123',
            worksheets: ['Food History', 'Symptoms', 'Reports', 'Profile'],
            lastSync: new Date().toISOString()
          }
        });

      case 'create_spreadsheet':
        // 測試創建試算表
        return NextResponse.json({
          success: true,
          message: '📊 成功創建 Google Sheets 試算表',
          spreadsheetId: `diet_daily_${userId}_${Date.now()}`,
          url: 'https://docs.google.com/spreadsheets/d/mock_url',
          worksheets: [
            { name: 'Food History', id: 0 },
            { name: 'Symptoms', id: 1 },
            { name: 'Reports', id: 2 },
            { name: 'Profile', id: 3 }
          ]
        });

      case 'sync_food':
        // 測試食物歷史同步
        const sampleFoodData = [
          {
            timestamp: new Date().toISOString(),
            foodId: 'apple',
            foodName: '蘋果',
            portion: 150,
            medicalScore: 8.5,
            notes: '健康選擇'
          },
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            foodId: 'rice',
            foodName: '白米飯',
            portion: 200,
            medicalScore: 7.0,
            notes: '主食'
          }
        ];

        return NextResponse.json({
          success: true,
          message: '🔄 食物歷史同步成功',
          synced: sampleFoodData.length,
          data: sampleFoodData,
          spreadsheetRange: 'Food History!A2:F' + (sampleFoodData.length + 1)
        });

      case 'sync_symptoms':
        // 測試症狀同步
        const sampleSymptomData = [
          {
            timestamp: new Date().toISOString(),
            type: 'abdominal_pain',
            severity: 5,
            duration: 120,
            triggerFood: '辛辣食物'
          }
        ];

        return NextResponse.json({
          success: true,
          message: '🩺 症狀記錄同步成功',
          synced: sampleSymptomData.length,
          data: sampleSymptomData,
          spreadsheetRange: 'Symptoms!A2:E' + (sampleSymptomData.length + 1)
        });

      case 'sync_profile':
        // 測試醫療檔案同步
        const profileData = {
          primaryCondition: 'IBD',
          secondaryConditions: ['過敏'],
          knownAllergies: ['花生', '海鮮'],
          personalTriggers: ['辛辣食物', '高纖維'],
          currentPhase: '緩解期'
        };

        return NextResponse.json({
          success: true,
          message: '👤 醫療檔案同步成功',
          data: profileData,
          spreadsheetRange: 'Profile!A1:B10'
        });

      case 'full_sync':
        // 完整同步測試
        return NextResponse.json({
          success: true,
          message: '🎯 完整數據同步成功',
          results: {
            foodHistory: { synced: 25, errors: 0 },
            symptoms: { synced: 8, errors: 0 },
            profile: { synced: 1, errors: 0 },
            reports: { synced: 3, errors: 0 }
          },
          totalTime: '2.3秒',
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/mock_url'
        });

      default:
        return NextResponse.json({
          success: false,
          message: '❌ 未知的測試類型',
          availableTypes: ['connection', 'create_spreadsheet', 'sync_food', 'sync_symptoms', 'sync_profile', 'full_sync']
        });
    }

  } catch (error) {
    console.error('Google Sheets 測試錯誤:', error);
    return NextResponse.json({
      success: false,
      message: '❌ 測試執行失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: '📊 Google Sheets 同步測試 API',
    description: '使用 POST 方法進行測試',
    availableTests: [
      'connection - 測試連接狀態',
      'create_spreadsheet - 測試創建試算表',
      'sync_food - 測試食物歷史同步',
      'sync_symptoms - 測試症狀同步',
      'sync_profile - 測試醫療檔案同步',
      'full_sync - 完整同步測試'
    ],
    usage: 'POST /api/test/google-sheets { "userId": "test-user", "testType": "connection" }'
  });
}