import { NextRequest, NextResponse } from 'next/server';
import { SymptomCorrelationService } from '@/lib/supabase/symptom-correlation-service';
import type {
  SymptomFoodCorrelation,
  SymptomCorrelationResponse
} from '@/types/medical';

/**
 * GET /api/medical/symptom-correlations
 * 獲取症狀與食物關聯性分析
 * Query params:
 * - userId: string (required)
 * - foodId: string (optional, for specific food)
 * - correlationType: string ('positive' | 'negative' | 'neutral', optional)
 * - minStrength: number (minimum correlation strength, optional)
 * - startDate: string (YYYY-MM-DD, optional)
 * - endDate: string (YYYY-MM-DD, optional)
 * - limit: number (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const foodId = searchParams.get('foodId');
    const correlationType = searchParams.get('correlationType') as 'positive' | 'negative' | 'neutral';
    const minStrength = parseFloat(searchParams.get('minStrength') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('🔗 Symptom Correlations API - GET Request');
    console.log('📋 User ID:', userId);
    console.log('🍽️ Food ID:', foodId);
    console.log('📊 Type:', correlationType);
    console.log('💪 Min Strength:', minStrength);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      } as SymptomCorrelationResponse, { status: 400 });
    }

    let correlations: SymptomFoodCorrelation[] = [];

    // Get specific food correlation
    if (foodId) {
      const correlation = await SymptomCorrelationService.getFoodCorrelation(userId, foodId);
      correlations = correlation ? [correlation] : [];
    }
    // Get correlations by filters
    else {
      const filters: any = {
        correlationType,
        minStrength: minStrength > 0 ? minStrength : undefined,
        startDate,
        endDate,
        limit
      };

      correlations = await SymptomCorrelationService.getCorrelationsByFilters(userId, filters);
    }

    console.log(`✅ Found ${correlations.length} symptom-food correlations`);

    return NextResponse.json({
      success: true,
      message: `成功獲取 ${correlations.length} 個症狀關聯性分析`,
      data: correlations
    } as SymptomCorrelationResponse);

  } catch (error) {
    console.error('❌ Symptom Correlations API Error:', error);
    return NextResponse.json({
      success: false,
      message: '獲取症狀關聯性分析時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as SymptomCorrelationResponse, { status: 500 });
  }
}

/**
 * POST /api/medical/symptom-correlations
 * 計算新的症狀與食物關聯性
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, analysisOptions } = body;

    console.log('🔗 Symptom Correlations API - POST Request');
    console.log('📋 User ID:', userId);
    console.log('🔧 Analysis Options:', analysisOptions);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      } as SymptomCorrelationResponse, { status: 400 });
    }

    // Set default analysis options
    const options = {
      analysisMethod: analysisOptions?.analysisMethod || 'statistical',
      minSampleSize: analysisOptions?.minSampleSize || 5,
      confidenceThreshold: analysisOptions?.confidenceThreshold || 0.6,
      timeRangeMonths: analysisOptions?.timeRangeMonths || 3,
      includeWeakCorrelations: analysisOptions?.includeWeakCorrelations || false,
      ...analysisOptions
    };

    console.log('🔬 Starting correlation analysis with options:', options);

    const correlations = await SymptomCorrelationService.computeAllCorrelations(userId, options);

    console.log(`✅ Successfully computed ${correlations.length} correlations`);

    return NextResponse.json({
      success: true,
      message: `成功計算 ${correlations.length} 個症狀關聯性`,
      data: correlations
    } as SymptomCorrelationResponse);

  } catch (error) {
    console.error('❌ Symptom Correlations API Error:', error);
    return NextResponse.json({
      success: false,
      message: '計算症狀關聯性時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as SymptomCorrelationResponse, { status: 500 });
  }
}

/**
 * PUT /api/medical/symptom-correlations
 * 更新症狀關聯性 (用戶確認/否認)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, correlationId, userConfirmed, userNotes } = body;

    console.log('🔗 Symptom Correlations API - PUT Request');
    console.log('📋 User ID:', userId);
    console.log('🔄 Correlation ID:', correlationId);
    console.log('✅ User Confirmed:', userConfirmed);

    if (!userId || !correlationId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 和關聯性 ID 為必填參數',
        data: null
      } as SymptomCorrelationResponse, { status: 400 });
    }

    const updates = {
      user_confirmed: userConfirmed,
      user_notes: userNotes,
      last_updated: new Date()
    };

    const updatedCorrelation = await SymptomCorrelationService.updateCorrelation(
      correlationId,
      userId,
      updates
    );

    if (!updatedCorrelation) {
      return NextResponse.json({
        success: false,
        message: '未找到要更新的關聯性記錄',
        data: null
      } as SymptomCorrelationResponse, { status: 404 });
    }

    console.log('✅ Successfully updated correlation');

    return NextResponse.json({
      success: true,
      message: '成功更新症狀關聯性',
      data: [updatedCorrelation]
    } as SymptomCorrelationResponse);

  } catch (error) {
    console.error('❌ Symptom Correlations API Error:', error);
    return NextResponse.json({
      success: false,
      message: '更新症狀關聯性時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as SymptomCorrelationResponse, { status: 500 });
  }
}

/**
 * DELETE /api/medical/symptom-correlations
 * 刪除症狀關聯性記錄
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const correlationId = searchParams.get('correlationId');
    const foodId = searchParams.get('foodId');

    console.log('🔗 Symptom Correlations API - DELETE Request');
    console.log('📋 User ID:', userId);
    console.log('🗑️ Correlation ID:', correlationId);
    console.log('🍽️ Food ID:', foodId);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      } as SymptomCorrelationResponse, { status: 400 });
    }

    let success = false;

    if (correlationId) {
      // Delete specific correlation
      success = await SymptomCorrelationService.deleteCorrelation(correlationId, userId);
    } else if (foodId) {
      // Delete all correlations for specific food
      success = await SymptomCorrelationService.deleteCorrelationsByFood(userId, foodId);
    } else {
      return NextResponse.json({
        success: false,
        message: '必須提供 correlationId 或 foodId 參數',
        data: null
      } as SymptomCorrelationResponse, { status: 400 });
    }

    if (!success) {
      return NextResponse.json({
        success: false,
        message: '未找到要刪除的關聯性記錄',
        data: null
      } as SymptomCorrelationResponse, { status: 404 });
    }

    console.log('✅ Successfully deleted symptom correlation');

    return NextResponse.json({
      success: true,
      message: '成功刪除症狀關聯性',
      data: null
    } as SymptomCorrelationResponse);

  } catch (error) {
    console.error('❌ Symptom Correlations API Error:', error);
    return NextResponse.json({
      success: false,
      message: '刪除症狀關聯性時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as SymptomCorrelationResponse, { status: 500 });
  }
}