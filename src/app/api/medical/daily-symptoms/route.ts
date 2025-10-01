import { NextRequest, NextResponse } from 'next/server';
import { DailySymptomService } from '@/lib/supabase/daily-symptom-service';
import type {
  DailySymptomEntry,
  DailySymptomEntryResponse,
  CoreSymptomScores,
  ContextualScores,
  AdditionalSymptom
} from '@/types/medical';

/**
 * GET /api/medical/daily-symptoms
 * 獲取每日症狀記錄
 * Query params:
 * - userId: string (required)
 * - date: string (YYYY-MM-DD, optional - defaults to today)
 * - startDate: string (for range queries)
 * - endDate: string (for range queries)
 * - limit: number (optional, default 30)
 * - datesOnly: boolean (optional - returns only dates with records)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '30');
    const datesOnly = searchParams.get('datesOnly') === 'true';

    console.log('🩺 Daily Symptoms API - GET Request');
    console.log('📋 User ID:', userId);
    console.log('📅 Date:', date);
    console.log('📊 Range:', startDate, 'to', endDate);
    console.log('📆 Dates Only:', datesOnly);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      } as DailySymptomEntryResponse, { status: 400 });
    }

    // Dates only query - returns array of dates with records
    if (datesOnly) {
      const dates = await DailySymptomService.getRecordedDates(userId, startDate || undefined, endDate || undefined);
      return NextResponse.json({
        success: true,
        message: `找到 ${dates.length} 個有記錄的日期`,
        data: dates
      });
    }

    // Single date query
    if (date) {
      const entry = await DailySymptomService.getEntryByDate(userId, date);
      return NextResponse.json({
        success: true,
        message: entry ? '成功獲取每日症狀記錄' : '該日期無症狀記錄',
        data: entry
      } as DailySymptomEntryResponse);
    }

    // Range query
    if (startDate && endDate) {
      const entries = await DailySymptomService.getEntriesByRange(userId, startDate, endDate);
      return NextResponse.json({
        success: true,
        message: `成功獲取 ${entries.length} 筆症狀記錄`,
        data: entries
      });
    }

    // Recent entries query (default)
    const entries = await DailySymptomService.getRecentEntries(userId, limit);
    return NextResponse.json({
      success: true,
      message: `成功獲取最近 ${entries.length} 筆症狀記錄`,
      data: entries
    });

  } catch (error) {
    console.error('❌ Daily Symptoms API Error:', error);
    return NextResponse.json({
      success: false,
      message: '獲取每日症狀記錄時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as DailySymptomEntryResponse, { status: 500 });
  }
}

/**
 * POST /api/medical/daily-symptoms
 * 創建新的每日症狀記錄
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...symptomData } = body;

    console.log('🩺 Daily Symptoms API - POST Request');
    console.log('📋 User ID:', userId);
    console.log('💊 Symptom Data:', symptomData);

    // DEBUG: Check auth session
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔐 Auth Check - User:', user?.id, 'Error:', authError);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      } as DailySymptomEntryResponse, { status: 400 });
    }

    // Validate core symptom scores
    const coreSymptoms: CoreSymptomScores = {
      overall_health: symptomData.overall_health,
      abdominal_pain: symptomData.abdominal_pain || 0,
      diarrhea: symptomData.diarrhea || 0,
      bloody_stool: symptomData.bloody_stool || 0,
      bloating: symptomData.bloating || 0
    };

    // Validate overall_health is required
    if (!coreSymptoms.overall_health ||
        coreSymptoms.overall_health < 1 ||
        coreSymptoms.overall_health > 5) {
      return NextResponse.json({
        success: false,
        message: '整體健康評分為必填欄位 (1-5)',
        data: null
      } as DailySymptomEntryResponse, { status: 400 });
    }

    // Validate other symptom scores (0-5)
    const symptomKeys: (keyof Omit<CoreSymptomScores, 'overall_health'>)[] = [
      'abdominal_pain', 'diarrhea', 'bloody_stool', 'bloating'
    ];

    for (const key of symptomKeys) {
      const value = coreSymptoms[key];
      if (value < 0 || value > 5) {
        return NextResponse.json({
          success: false,
          message: `${key} 評分必須在 0-5 之間`,
          data: null
        } as DailySymptomEntryResponse, { status: 400 });
      }
    }

    // Prepare entry data
    const entryData: Omit<DailySymptomEntry, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      recorded_date: symptomData.recorded_date || new Date().toISOString().split('T')[0],
      recorded_at: new Date(symptomData.recorded_at || Date.now()),

      // Core symptoms
      ...coreSymptoms,

      // Bowel movement tracking
      bowel_movement_count: symptomData.bowel_movement_count,
      stool_type: symptomData.stool_type,

      // Contextual scores
      mood_score: symptomData.mood_score,
      energy_level: symptomData.energy_level,
      sleep_quality: symptomData.sleep_quality,
      stress_level: symptomData.stress_level,

      // Additional symptoms
      additional_symptoms: symptomData.additional_symptoms || [],

      // Medication tracking
      medications_taken: symptomData.medications_taken || [],
      medication_adherence: symptomData.medication_adherence,

      // Environmental factors
      weather_conditions: symptomData.weather_conditions,
      activity_level: symptomData.activity_level,

      // User observations
      notes: symptomData.notes,
      triggers_identified: symptomData.triggers_identified || [],
      improvement_factors: symptomData.improvement_factors || [],

      // Correlations
      related_food_entries: symptomData.related_food_entries || [],

      // Metadata
      entry_source: symptomData.entry_source || 'manual',
      data_completeness_score: symptomData.data_completeness_score || 1.0
    };

    const createdEntry = await DailySymptomService.createEntry(entryData);

    console.log('✅ Successfully created daily symptom entry:', createdEntry.id);

    return NextResponse.json({
      success: true,
      message: '成功創建每日症狀記錄',
      data: createdEntry
    } as DailySymptomEntryResponse);

  } catch (error) {
    console.error('❌ Daily Symptoms API Error:', error);
    return NextResponse.json({
      success: false,
      message: '創建每日症狀記錄時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as DailySymptomEntryResponse, { status: 500 });
  }
}

/**
 * PUT /api/medical/daily-symptoms
 * 更新每日症狀記錄
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, entryId, date, ...updates } = body;

    console.log('🩺 Daily Symptoms API - PUT Request');
    console.log('📋 User ID:', userId);
    console.log('🔄 Entry ID:', entryId);
    console.log('📅 Date:', date);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      } as DailySymptomEntryResponse, { status: 400 });
    }

    let updatedEntry: DailySymptomEntry | null = null;

    // Update by entry ID
    if (entryId) {
      updatedEntry = await DailySymptomService.updateEntry(entryId, userId, updates);
    }
    // Update by date (upsert pattern)
    else if (date) {
      updatedEntry = await DailySymptomService.updateEntryByDate(userId, date, updates);
    }
    else {
      return NextResponse.json({
        success: false,
        message: '必須提供 entryId 或 date 參數',
        data: null
      } as DailySymptomEntryResponse, { status: 400 });
    }

    if (!updatedEntry) {
      return NextResponse.json({
        success: false,
        message: '未找到要更新的症狀記錄',
        data: null
      } as DailySymptomEntryResponse, { status: 404 });
    }

    console.log('✅ Successfully updated daily symptom entry');

    return NextResponse.json({
      success: true,
      message: '成功更新每日症狀記錄',
      data: updatedEntry
    } as DailySymptomEntryResponse);

  } catch (error) {
    console.error('❌ Daily Symptoms API Error:', error);
    return NextResponse.json({
      success: false,
      message: '更新每日症狀記錄時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as DailySymptomEntryResponse, { status: 500 });
  }
}

/**
 * DELETE /api/medical/daily-symptoms
 * 刪除每日症狀記錄
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const entryId = searchParams.get('entryId');
    const date = searchParams.get('date');

    console.log('🩺 Daily Symptoms API - DELETE Request');
    console.log('📋 User ID:', userId);
    console.log('🗑️ Entry ID:', entryId);
    console.log('📅 Date:', date);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      } as DailySymptomEntryResponse, { status: 400 });
    }

    let success = false;

    // Delete by entry ID
    if (entryId) {
      success = await DailySymptomService.deleteEntry(entryId, userId);
    }
    // Delete by date
    else if (date) {
      success = await DailySymptomService.deleteEntryByDate(userId, date);
    }
    else {
      return NextResponse.json({
        success: false,
        message: '必須提供 entryId 或 date 參數',
        data: null
      } as DailySymptomEntryResponse, { status: 400 });
    }

    if (!success) {
      return NextResponse.json({
        success: false,
        message: '未找到要刪除的症狀記錄',
        data: null
      } as DailySymptomEntryResponse, { status: 404 });
    }

    console.log('✅ Successfully deleted daily symptom entry');

    return NextResponse.json({
      success: true,
      message: '成功刪除每日症狀記錄',
      data: null
    } as DailySymptomEntryResponse);

  } catch (error) {
    console.error('❌ Daily Symptoms API Error:', error);
    return NextResponse.json({
      success: false,
      message: '刪除每日症狀記錄時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as DailySymptomEntryResponse, { status: 500 });
  }
}