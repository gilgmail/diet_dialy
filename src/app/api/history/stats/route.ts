import { NextRequest, NextResponse } from 'next/server';
import { foodHistoryDatabase } from '@/lib/food-history-database';

// GET /api/history/stats - Get food history statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get('userId') || 'demo-user';
    const days = parseInt(searchParams.get('days') || '30');

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