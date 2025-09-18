/**
 * Google OAuth Token Exchange API
 * 處理 Google OAuth 授權碼交換 access token
 */

import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CONFIG } from '@/lib/google/config';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // 初始化 OAuth2 客戶端
    const oauth2Client = new OAuth2Client(
      GOOGLE_CONFIG.clientId,
      GOOGLE_CONFIG.clientSecret,
      GOOGLE_CONFIG.redirectUri
    );

    console.log('🔑 Google OAuth - 交換授權碼為 tokens');

    // 交換授權碼為 tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('未收到 access token');
    }

    console.log('✅ Google OAuth - Token 交換成功');

    // 返回 tokens（注意：在生產環境中應該更安全地處理）
    return NextResponse.json({
      success: true,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        expires_in: tokens.expiry_date ?
          Math.floor((tokens.expiry_date - Date.now()) / 1000) :
          3600,
        scope: tokens.scope || GOOGLE_CONFIG.scopes.join(' '),
        id_token: tokens.id_token
      }
    });

  } catch (error) {
    console.error('❌ Google OAuth Token 交換失敗:', error);

    return NextResponse.json(
      {
        error: 'Token 交換失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: '🔑 Google OAuth Token Exchange API',
    description: '使用 POST 方法交換授權碼為 access token',
    usage: 'POST /api/auth/google/token { "code": "authorization_code" }'
  });
}