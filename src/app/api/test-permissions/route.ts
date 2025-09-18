/**
 * 測試 Google API 權限的專用 API
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { error: '需要 access_token 進行權限測試' },
        { status: 400 }
      );
    }

    console.log('🧪 開始測試 Google API 權限...');

    // 1. 測試基本用戶資訊 API
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!userResponse.ok) {
      throw new Error(`用戶資訊 API 失敗: ${userResponse.status} ${userResponse.statusText}`);
    }

    const userInfo = await userResponse.json();
    console.log('✅ 用戶資訊 API 成功:', userInfo.email);

    // 2. 測試 Google Sheets API - 簡單的列舉權限測試
    const sheetsTestResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `權限測試 - ${new Date().toISOString()}`,
          locale: 'zh_TW'
        },
        sheets: [{
          properties: {
            title: '測試工作表',
            gridProperties: {
              rowCount: 10,
              columnCount: 5
            }
          }
        }]
      })
    });

    let sheetsResult;
    if (sheetsTestResponse.ok) {
      sheetsResult = await sheetsTestResponse.json();
      console.log('✅ Google Sheets 創建成功:', sheetsResult.spreadsheetId);

      // 清理測試用的試算表 (刪除)
      try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${sheetsResult.spreadsheetId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        });
        console.log('🗑️ 測試試算表已清理');
      } catch (cleanupError) {
        console.warn('⚠️ 清理測試試算表失敗:', cleanupError);
      }
    } else {
      const errorText = await sheetsTestResponse.text();
      console.error('❌ Google Sheets API 失敗:', sheetsTestResponse.status, errorText);
      sheetsResult = {
        error: `HTTP ${sheetsTestResponse.status}: ${errorText}`,
        status: sheetsTestResponse.status
      };
    }

    // 3. 測試 Google Drive API
    const driveResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    let driveResult;
    if (driveResponse.ok) {
      driveResult = await driveResponse.json();
      console.log('✅ Google Drive API 成功');
    } else {
      const errorText = await driveResponse.text();
      console.error('❌ Google Drive API 失敗:', driveResponse.status, errorText);
      driveResult = {
        error: `HTTP ${driveResponse.status}: ${errorText}`,
        status: driveResponse.status
      };
    }

    return NextResponse.json({
      success: true,
      user_info: userInfo,
      sheets_api: sheetsResult,
      drive_api: driveResult,
      timestamp: new Date().toISOString(),
      permissions_summary: {
        user_info: '✅ 成功',
        sheets_create: sheetsResult.error ? '❌ 失敗' : '✅ 成功',
        drive_access: driveResult.error ? '❌ 失敗' : '✅ 成功'
      }
    });

  } catch (error) {
    console.error('❌ 權限測試失敗:', error);
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

export async function GET() {
  return NextResponse.json({
    message: '🧪 Google API 權限測試',
    description: '測試當前 access token 的 Google API 權限',
    usage: 'POST /api/test-permissions { "access_token": "your_token" }'
  });
}