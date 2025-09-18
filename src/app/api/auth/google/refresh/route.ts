/**
 * Google OAuth Token Refresh API
 * 處理 Google OAuth refresh token 更新 access token
 */

import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CONFIG } from '@/lib/google/config';

export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // 初始化 OAuth2 客戶端
    const oauth2Client = new OAuth2Client(
      GOOGLE_CONFIG.clientId,
      GOOGLE_CONFIG.clientSecret,
      GOOGLE_CONFIG.redirectUri
    );

    console.log('🔄 Google OAuth - 刷新 access token');

    // 設置 refresh token
    oauth2Client.setCredentials({ refresh_token });

    // 刷新 access token
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('未能刷新 access token');
    }

    console.log('✅ Google OAuth - Token 刷新成功');

    // 返回新的 access token
    return NextResponse.json({
      success: true,
      access_token: credentials.access_token,
      expires_in: credentials.expiry_date ?
        Math.floor((credentials.expiry_date - Date.now()) / 1000) :
        3600,
      token_type: 'Bearer'
    });

  } catch (error) {
    console.error('❌ Google OAuth Token 刷新失敗:', error);

    return NextResponse.json(
      {
        error: 'Token 刷新失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: '🔄 Google OAuth Token Refresh API',
    description: '使用 POST 方法刷新 access token',
    usage: 'POST /api/auth/google/refresh { "refresh_token": "refresh_token_here" }'
  });
}