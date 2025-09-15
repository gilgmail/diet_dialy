import { NextRequest, NextResponse } from 'next/server';
import { foodDatabase } from '@/lib/food-database';

// POST /api/foods/reload - Force reload database from file
export async function POST(request: NextRequest) {
  try {
    await foodDatabase.reloadDatabase();
    const stats = await foodDatabase.getDatabaseStats();

    return NextResponse.json({
      success: true,
      message: '資料庫已重新載入',
      stats
    });
  } catch (error) {
    console.error('POST /api/foods/reload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '重新載入失敗' },
      { status: 500 }
    );
  }
}