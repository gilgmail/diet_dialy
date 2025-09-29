import { NextRequest, NextResponse } from 'next/server';
import { foodHistoryDatabase } from '@/lib/food-history-database';
import { CreateHistoryEntryRequest, FoodHistoryQuery } from '@/types/history';
import { ExtendedMedicalProfile, MedicalCondition } from '@/types/medical';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/supabase/server-auth';

// GET /api/history - Query food history entries
export async function GET(request: NextRequest) {
  try {
    // ✅ SECURITY: Get authenticated user from session
    const authenticatedUser = await getAuthenticatedUser(request);
    if (!authenticatedUser) {
      return createUnauthorizedResponse('請先登入以查看歷史記錄');
    }

    const { searchParams } = new URL(request.url);

    // ✅ SECURITY: Use authenticated user ID, ignore any userId from URL parameters
    const query: FoodHistoryQuery = {
      userId: authenticatedUser.id, // Use authenticated user ID only
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

    console.log('🔐 Authenticated history query for user:', authenticatedUser.id);
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
    // ✅ SECURITY: Get authenticated user from session
    const authenticatedUser = await getAuthenticatedUser(request);
    if (!authenticatedUser) {
      return createUnauthorizedResponse('請先登入以新增記錄');
    }

    const body = await request.json();
    const createRequest: CreateHistoryEntryRequest = {
      ...body,
      userId: authenticatedUser.id // ✅ SECURITY: Force use authenticated user ID
    };

    // Create a demo medical profile for scoring
    // TODO: In production, this should come from user's actual medical profile
    const demoMedicalProfile: ExtendedMedicalProfile = {
      id: `profile-${authenticatedUser.id}`,
      userId: authenticatedUser.id,
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

    console.log('🔐 Creating history entry for authenticated user:', authenticatedUser.id);
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