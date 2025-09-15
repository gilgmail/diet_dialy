import { NextRequest, NextResponse } from 'next/server';
import { foodDatabase } from '@/lib/food-database';

// GET /api/foods/stats - Get database statistics
export async function GET(request: NextRequest) {
  try {
    const stats = await foodDatabase.getDatabaseStats();

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('GET /api/foods/stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '獲取統計失敗' },
      { status: 500 }
    );
  }
}