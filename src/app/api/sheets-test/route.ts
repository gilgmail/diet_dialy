/**
 * Simple Google Sheets API test
 * Takes an access token and tries to create a test spreadsheet
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { access_token } = await request.json();

    if (!access_token) {
      return NextResponse.json(
        { error: '需要 access_token' },
        { status: 400 }
      );
    }

    console.log('🧪 測試 Google Sheets API 創建...');

    // Test creating a simple spreadsheet
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: `測試試算表 - ${new Date().toISOString()}`,
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

    const responseStatus = createResponse.status;
    console.log('📊 Google Sheets API 狀態:', responseStatus);

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('❌ Google Sheets API 錯誤:', errorText);

      return NextResponse.json({
        success: false,
        error: `HTTP ${responseStatus}: ${errorText}`,
        status: responseStatus
      });
    }

    const spreadsheet = await createResponse.json();
    console.log('✅ Google Sheets 創建成功:', spreadsheet.spreadsheetId);

    // Clean up by deleting the test spreadsheet
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheet.spreadsheetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
      console.log('🗑️ 測試試算表已清理');
    } catch (cleanupError) {
      console.warn('⚠️ 清理失敗:', cleanupError);
    }

    return NextResponse.json({
      success: true,
      spreadsheetId: spreadsheet.spreadsheetId,
      message: '✅ Google Sheets API 測試成功',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Sheets 測試失敗:', error);
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
    message: '🧪 Google Sheets API 測試端點',
    usage: 'POST { "access_token": "your_token" }'
  });
}