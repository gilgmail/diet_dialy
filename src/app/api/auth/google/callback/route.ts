/**
 * Google OAuth Callback API
 * 處理 Google OAuth 回調並完成認證流程
 */

import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CONFIG } from '@/lib/google/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // 檢查是否有錯誤
    if (error) {
      console.error('❌ Google OAuth 授權錯誤:', error);
      return NextResponse.redirect(
        new URL(`/google-sync?auth_error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      console.error('❌ 缺少授權碼');
      return NextResponse.redirect(
        new URL('/google-sync?auth_error=missing_code', request.url)
      );
    }

    console.log('🔑 Google OAuth - 收到授權碼，開始處理回調');

    // 初始化 OAuth2 客戶端
    const oauth2Client = new OAuth2Client(
      GOOGLE_CONFIG.clientId,
      GOOGLE_CONFIG.clientSecret,
      GOOGLE_CONFIG.redirectUri
    );

    // 交換授權碼為 tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('未收到 access token');
    }

    // 獲取用戶資訊
    oauth2Client.setCredentials(tokens);
    const userInfoResponse = await oauth2Client.request({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo'
    });

    const userInfo = userInfoResponse.data;

    console.log('✅ Google OAuth - 認證成功:', userInfo.email);

    // 將認證資訊存儲到 URL 參數中，前端可以讀取
    const authData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: userInfo,
      state: state
    };

    // 重定向到 Google 同步頁面，附帶認證資訊
    // 同時支持直接跳轉到 sheets-test 頁面進行測試
    const targetPath = state?.includes('sheets-test') ? '/sheets-test' : '/google-sync';
    const redirectUrl = new URL(targetPath, request.url);
    redirectUrl.searchParams.set('auth_success', 'true');
    redirectUrl.searchParams.set('auth_data', JSON.stringify(authData));

    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Google OAuth 回調處理失敗:', error);

    const redirectUrl = new URL('/google-sync', request.url);
    redirectUrl.searchParams.set('auth_error', 'callback_failed');
    redirectUrl.searchParams.set('error_details',
      error instanceof Error ? error.message : '未知錯誤'
    );

    return NextResponse.redirect(redirectUrl);
  }
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}