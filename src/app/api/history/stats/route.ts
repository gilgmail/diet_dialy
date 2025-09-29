import { NextRequest, NextResponse } from 'next/server';
import { foodHistoryDatabase } from '@/lib/food-history-database';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/supabase/server-auth';

// GET /api/history/stats - Get food history statistics
export async function GET(request: NextRequest) {
  try {
    // ✅ SECURITY: Get authenticated user from session
    const authenticatedUser = await getAuthenticatedUser(request);
    if (!authenticatedUser) {
      return createUnauthorizedResponse('請先登入以查看統計資料');
    }

    const { searchParams } = new URL(request.url);

    // ✅ SECURITY: Use authenticated user ID, ignore any userId from URL parameters
    const userId = authenticatedUser.id;
    const days = parseInt(searchParams.get('days') || '30');

    console.log('📊 取得統計資料 (已驗證用戶):', { userId, days });
    const stats = await foodHistoryDatabase.getStats(userId, days);

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('GET /api/history/stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '取得統計失敗' },
      { status: 500 }
    );
  }
}