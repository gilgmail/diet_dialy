/**
 * Google OAuth 認證啟動端點
 * 將用戶重定向到 Google OAuth 授權頁面
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 從請求中獲取自定義的 state 參數（如果有的話）
    const customState = searchParams.get('state') || generateRandomState();

    console.log('🔑 啟動 Google OAuth 認證流程, state:', customState);

    // Google OAuth 2.0 參數
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
      ].join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: customState
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    console.log('🚀 重定向到 Google OAuth URL');
    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('❌ Google OAuth 啟動失敗:', error);
    return NextResponse.json(
      { error: 'OAuth 啟動失敗' },
      { status: 500 }
    );
  }
}

function generateRandomState(): string {
  return Math.random().toString(36).substr(2, 15);
}