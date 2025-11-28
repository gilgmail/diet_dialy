import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { foodEntryService } from '@/lib/supabase/food-entry-service';
import { FoodHistoryQuery } from '@/types/history';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/supabase/server-auth';
import type { Database } from '@/types/supabase';

function createRequestSupabaseClient(request: NextRequest) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set() {
          // No-op in API routes; we only need read access for session.
        },
        remove() {
          // No-op in API routes; we only need read access for session.
        }
      }
    }
  );
}

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
    console.log('📊 Query params:', { dateFrom: query.dateFrom, dateTo: query.dateTo, limit: query.limit });

    // Use Supabase food entry service instead of local JSON database
    let entries;
    if (query.dateFrom && query.dateTo) {
      entries = await foodEntryService.getEntriesByRange(
        authenticatedUser.id,
        query.dateFrom,
        query.dateTo,
        query.limit || 100
      );
    } else {
      entries = await foodEntryService.getRecentEntries(
        authenticatedUser.id,
        query.limit || 50
      );
    }

    console.log('📊 Food History API - Entries found:', entries.length);
    if (entries.length > 0) {
      console.log('📅 Sample entry consumedAt:', entries[0].consumedAt);
      console.log('📅 First 3 entries:', entries.slice(0, 3).map(e => ({ id: e.id, consumedAt: e.consumedAt })));
    }

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

    console.log('🔐 Creating history entry for authenticated user:', authenticatedUser.id);

    // Use Supabase food entry service
    const supabase = createRequestSupabaseClient(request);

    const entry = await foodEntryService.createEntry(
      authenticatedUser.id,
      {
        ...body,
        userId: authenticatedUser.id
      },
      { supabase }
    );

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
