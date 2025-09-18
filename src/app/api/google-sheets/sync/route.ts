/**
 * Google Sheets 同步 API
 * 處理食物歷史資料與個人 Google Sheets 的同步
 */

import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CONFIG } from '@/lib/google/config';

export async function POST(request: NextRequest) {
  try {
    const {
      access_token,
      spreadsheetId,
      syncType,
      data
    } = await request.json();

    if (!access_token || !spreadsheetId) {
      return NextResponse.json(
        { error: 'Access token 和 spreadsheet ID 是必需的' },
        { status: 400 }
      );
    }

    console.log(`🔄 開始同步 ${syncType} 到 Google Sheets: ${spreadsheetId}`);

    // 初始化 OAuth2 客戶端
    const oauth2Client = new OAuth2Client(
      GOOGLE_CONFIG.clientId,
      GOOGLE_CONFIG.clientSecret,
      GOOGLE_CONFIG.redirectUri
    );

    oauth2Client.setCredentials({ access_token });

    let result;

    switch (syncType) {
      case 'food_history':
        result = await syncFoodHistory(oauth2Client, spreadsheetId, data);
        break;
      case 'symptoms':
        result = await syncSymptoms(oauth2Client, spreadsheetId, data);
        break;
      case 'medical_profile':
        result = await syncMedicalProfile(oauth2Client, spreadsheetId, data);
        break;
      default:
        throw new Error(`不支援的同步類型: ${syncType}`);
    }

    console.log(`✅ ${syncType} 同步成功`);

    return NextResponse.json({
      success: true,
      message: `${syncType} 同步成功`,
      result,
      syncTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Google Sheets 同步失敗:', error);

    return NextResponse.json(
      {
        error: '同步失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    );
  }
}

/**
 * 同步食物歷史資料
 */
async function syncFoodHistory(
  oauth2Client: OAuth2Client,
  spreadsheetId: string,
  foodData: any[]
) {
  const sheetsAPI = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

  // 準備食物歷史資料
  const rows = foodData.map(entry => [
    new Date(entry.consumedAt || Date.now()).toLocaleDateString('zh-TW'),
    new Date(entry.consumedAt || Date.now()).toLocaleTimeString('zh-TW'),
    entry.foodId || '',
    entry.foodData?.name_zh || entry.foodData?.name_en || '未知食物',
    entry.foodData?.category || '未分類',
    `${entry.portion?.amount || ''} ${entry.portion?.unit || ''}`,
    entry.portion?.unit || '',
    entry.medicalScore?.score || 'N/A',
    entry.medicalScore?.level || 'N/A',
    entry.allergyWarnings?.join('; ') || '無',
    entry.symptoms?.before?.join('; ') || '無',
    entry.symptoms?.after?.join('; ') || '無',
    entry.symptoms?.severity || 'N/A',
    entry.notes || '',
    entry.location || ''
  ]);

  // 清除現有資料（保留標題行）
  await oauth2Client.request({
    url: `${sheetsAPI}/values/食物歷史!A2:O1000:clear`,
    method: 'POST'
  });

  // 如果有資料則插入
  if (rows.length > 0) {
    await oauth2Client.request({
      url: `${sheetsAPI}/values/食物歷史!A2?valueInputOption=RAW`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        values: rows
      }
    });
  }

  return {
    syncedCount: rows.length,
    range: `食物歷史!A2:O${rows.length + 1}`
  };
}

/**
 * 同步症狀記錄
 */
async function syncSymptoms(
  oauth2Client: OAuth2Client,
  spreadsheetId: string,
  symptomsData: any[]
) {
  const sheetsAPI = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

  const rows = symptomsData.flatMap(entry =>
    (entry.symptoms || []).map((symptom: any) => [
      new Date(entry.recordedAt || Date.now()).toLocaleDateString('zh-TW'),
      new Date(symptom.timestamp || Date.now()).toLocaleTimeString('zh-TW'),
      symptom.type || '',
      symptom.severity || '',
      symptom.severity_score || '',
      `${symptom.duration || 0} 分鐘`,
      symptom.triggers?.join('; ') || '無',
      symptom.related_food_ids?.join('; ') || '無',
      symptom.notes || '',
      symptom.activity_impact || '無'
    ])
  );

  // 清除現有資料
  await oauth2Client.request({
    url: `${sheetsAPI}/values/症狀記錄!A2:J1000:clear`,
    method: 'POST'
  });

  // 插入新資料
  if (rows.length > 0) {
    await oauth2Client.request({
      url: `${sheetsAPI}/values/症狀記錄!A2?valueInputOption=RAW`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        values: rows
      }
    });
  }

  return {
    syncedCount: rows.length,
    range: `症狀記錄!A2:J${rows.length + 1}`
  };
}

/**
 * 同步醫療檔案
 */
async function syncMedicalProfile(
  oauth2Client: OAuth2Client,
  spreadsheetId: string,
  profileData: any
) {
  const sheetsAPI = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

  const row = [
    new Date().toLocaleDateString('zh-TW'),
    profileData.primary_condition || '',
    profileData.secondary_conditions?.join('; ') || '',
    profileData.known_allergies?.join('; ') || '',
    profileData.personal_triggers?.join('; ') || '',
    profileData.current_phase || '',
    profileData.lactose_intolerant ? '是' : '否',
    profileData.fiber_sensitive ? '是' : '否',
    profileData.ibs_subtype || '',
    JSON.stringify(profileData.fodmap_tolerance || {})
  ];

  // 清除現有資料
  await oauth2Client.request({
    url: `${sheetsAPI}/values/醫療檔案!A2:J100:clear`,
    method: 'POST'
  });

  // 插入新資料
  await oauth2Client.request({
    url: `${sheetsAPI}/values/醫療檔案!A2?valueInputOption=RAW`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      values: [row]
    }
  });

  return {
    syncedCount: 1,
    range: '醫療檔案!A2:J2'
  };
}

export async function GET() {
  return NextResponse.json({
    message: '🔄 Google Sheets 同步 API',
    description: '同步食物歷史、症狀記錄和醫療檔案到個人 Google Sheets',
    supportedTypes: ['food_history', 'symptoms', 'medical_profile'],
    usage: 'POST /api/google-sheets/sync { "access_token": "...", "spreadsheetId": "...", "syncType": "food_history", "data": [...] }'
  });
}