/**
 * 測試 Google Sheets 同步功能的專用 API
 * 用於測試真實的 Google 帳號同步
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { access_token, test_type = 'basic_sync' } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { error: '需要 access_token 進行測試' },
        { status: 400 }
      );
    }

    console.log(`🧪 開始測試同步功能: ${test_type}`);

    let testResult;

    switch (test_type) {
      case 'create_spreadsheet':
        testResult = await testCreateSpreadsheet(access_token);
        break;
      case 'sync_food_data':
        testResult = await testSyncFoodData(access_token);
        break;
      case 'full_integration':
        testResult = await testFullIntegration(access_token);
        break;
      default:
        testResult = await testBasicConnection(access_token);
    }

    return NextResponse.json({
      success: true,
      test_type,
      result: testResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ 同步測試失敗:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * 測試基本 Google API 連接
 */
async function testBasicConnection(accessToken: string) {
  console.log('🔍 測試基本 Google API 連接...');

  const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Google API 連接失敗: ${response.statusText}`);
  }

  const userInfo = await response.json();
  console.log(`✅ Google API 連接成功: ${userInfo.email}`);

  return {
    connection: 'success',
    user: userInfo.email,
    message: 'Google API 連接正常'
  };
}

/**
 * 測試創建 Google Sheets
 */
async function testCreateSpreadsheet(accessToken: string) {
  console.log('📊 測試創建 Google Sheets...');

  const spreadsheetData = {
    properties: {
      title: `Diet Daily 測試 - ${new Date().toLocaleDateString('zh-TW')}`,
      locale: 'zh_TW',
      timeZone: 'Asia/Taipei'
    },
    sheets: [
      {
        properties: {
          title: '食物歷史測試',
          gridProperties: {
            rowCount: 100,
            columnCount: 10
          }
        }
      }
    ]
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(spreadsheetData)
  });

  if (!response.ok) {
    throw new Error(`創建 Google Sheets 失敗: ${response.statusText}`);
  }

  const result = await response.json();
  console.log(`✅ Google Sheets 創建成功: ${result.spreadsheetId}`);

  return {
    spreadsheet_created: true,
    spreadsheet_id: result.spreadsheetId,
    spreadsheet_url: result.spreadsheetUrl,
    message: 'Google Sheets 創建成功'
  };
}

/**
 * 測試同步食物資料
 */
async function testSyncFoodData(accessToken: string) {
  console.log('🍎 測試同步食物資料...');

  // 先創建測試用的 Google Sheets
  const createResult = await testCreateSpreadsheet(accessToken);
  const spreadsheetId = createResult.spreadsheet_id;

  // 準備測試資料
  const testFoodData = [
    [
      new Date().toLocaleDateString('zh-TW'),
      new Date().toLocaleTimeString('zh-TW'),
      'apple',
      '蘋果',
      '水果',
      '150 克',
      '克',
      '8.5',
      '低風險',
      '無',
      '無',
      '無',
      '0',
      '測試資料',
      '測試環境'
    ]
  ];

  // 設置標題行
  const headerResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/食物歷史測試!A1:O1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [[
          '日期', '時間', '食物ID', '食物名稱', '食物類別',
          '份量', '單位', '醫療評分', '風險等級', '過敏警告',
          '症狀前', '症狀後', '嚴重度', '備註', '位置'
        ]]
      })
    }
  );

  // 插入測試資料
  const dataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/食物歷史測試!A2?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: testFoodData
      })
    }
  );

  if (!headerResponse.ok || !dataResponse.ok) {
    throw new Error('同步食物資料到 Google Sheets 失敗');
  }

  console.log('✅ 食物資料同步成功');

  return {
    sync_completed: true,
    spreadsheet_id: spreadsheetId,
    records_synced: testFoodData.length,
    spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    message: '食物資料同步成功'
  };
}

/**
 * 完整整合測試
 */
async function testFullIntegration(accessToken: string) {
  console.log('🔄 執行完整整合測試...');

  const results = {
    connection_test: await testBasicConnection(accessToken),
    spreadsheet_test: await testCreateSpreadsheet(accessToken),
    sync_test: null as any
  };

  // 使用剛創建的試算表進行同步測試
  const spreadsheetId = results.spreadsheet_test.spreadsheet_id;

  // 測試同步功能（使用已創建的試算表）
  const testFoodData = [
    [
      new Date().toLocaleDateString('zh-TW'),
      new Date().toLocaleTimeString('zh-TW'),
      'banana',
      '香蕉',
      '水果',
      '120 克',
      '克',
      '7.5',
      '低風險',
      '無',
      '無',
      '無',
      '0',
      '整合測試資料',
      '測試環境'
    ]
  ];

  const syncResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/食物歷史測試!A2?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: testFoodData
      })
    }
  );

  results.sync_test = {
    sync_completed: syncResponse.ok,
    records_synced: testFoodData.length,
    message: syncResponse.ok ? '完整整合測試成功' : '同步測試失敗'
  };

  console.log('✅ 完整整合測試完成');

  return {
    overall_success: true,
    test_results: results,
    message: '完整整合測試成功完成'
  };
}

export async function GET() {
  return NextResponse.json({
    message: '🧪 Google Sheets 同步測試 API',
    description: '測試真實 Google 帳號的同步功能',
    available_tests: [
      'basic_connection - 測試基本 Google API 連接',
      'create_spreadsheet - 測試創建 Google Sheets',
      'sync_food_data - 測試同步食物資料',
      'full_integration - 完整整合測試'
    ],
    usage: 'POST /api/test/sync { "access_token": "your_token", "test_type": "test_name" }'
  });
}