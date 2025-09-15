import { NextRequest, NextResponse } from 'next/server';
import { foodHistoryDatabase } from '@/lib/food-history-database';
import { CreateHistoryEntryRequest, FoodHistoryQuery } from '@/types/history';
import { ExtendedMedicalProfile, MedicalCondition } from '@/types/medical';

// GET /api/history - Query food history entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query: FoodHistoryQuery = {
      userId: searchParams.get('userId') || 'demo-user',
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      foodIds: searchParams.get('foodIds')?.split(',') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      includeSymptoms: searchParams.get('includeSymptoms') === 'true',
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      sortBy: searchParams.get('sortBy') as any || 'consumedAt',
      sortOrder: searchParams.get('sortOrder') as any || 'desc'
    };

    const entries = await foodHistoryDatabase.queryHistory(query);

    return NextResponse.json({
      success: true,
      entries,
      total: entries.length
    });
  } catch (error) {
    console.error('GET /api/history error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '查詢歷史失敗' },
      { status: 500 }
    );
  }
}

// POST /api/history - Create new food history entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const createRequest: CreateHistoryEntryRequest = body;

    // Create a demo medical profile for scoring
    // In a real app, this would come from user authentication
    const demoMedicalProfile: ExtendedMedicalProfile = {
      id: 'demo-profile',
      userId: 'demo-user',
      primary_condition: 'ibd' as MedicalCondition,
      current_phase: 'remission',
      known_allergies: [],
      personal_triggers: [],
      current_side_effects: [],
      lactose_intolerant: false,
      fiber_sensitive: false,
      allergies: [],
      medications: [],
      dietaryRestrictions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const entry = await foodHistoryDatabase.createHistoryEntry(createRequest, demoMedicalProfile);

    return NextResponse.json({
      success: true,
      message: '食物記錄已新增',
      entry
    });
  } catch (error) {
    console.error('POST /api/history error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '新增記錄失敗' },
      { status: 500 }
    );
  }
}