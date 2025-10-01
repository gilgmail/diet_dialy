import { NextRequest, NextResponse } from 'next/server';
import { SymptomPatternAnalyzer } from '@/lib/supabase/symptom-pattern-analyzer';
import type {
  SymptomPatternAnalysis,
  SymptomPatternResponse
} from '@/types/medical';

/**
 * GET /api/medical/symptom-patterns
 * 獲取症狀模式分析
 * Query params:
 * - userId: string (required)
 * - period: string ('weekly' | 'monthly' | 'quarterly', default: 'monthly')
 * - startDate: string (YYYY-MM-DD, optional)
 * - endDate: string (YYYY-MM-DD, optional)
 * - refresh: boolean (force recompute, default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') as 'weekly' | 'monthly' | 'quarterly' || 'monthly';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const refresh = searchParams.get('refresh') === 'true';

    console.log('📊 Symptom Patterns API - GET Request');
    console.log('📋 User ID:', userId);
    console.log('📅 Period:', period);
    console.log('🔄 Refresh:', refresh);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      } as SymptomPatternResponse, { status: 400 });
    }

    // Validate period
    if (!['weekly', 'monthly', 'quarterly'].includes(period)) {
      return NextResponse.json({
        success: false,
        message: '分析期間必須是 weekly, monthly, 或 quarterly',
        data: null
      } as SymptomPatternResponse, { status: 400 });
    }

    let analysis: SymptomPatternAnalysis | null = null;

    // If specific date range provided, compute for that range
    if (startDate && endDate) {
      analysis = await SymptomPatternAnalyzer.computePatternAnalysis(
        userId,
        period,
        new Date(startDate),
        new Date(endDate),
        refresh
      );
    } else {
      // Get latest analysis for the period
      analysis = await SymptomPatternAnalyzer.getLatestPatternAnalysis(userId, period);

      // If no analysis exists or refresh requested, compute new one
      if (!analysis || refresh) {
        const now = new Date();
        const periodStart = SymptomPatternAnalyzer.getPeriodStart(now, period);

        analysis = await SymptomPatternAnalyzer.computePatternAnalysis(
          userId,
          period,
          periodStart,
          now,
          refresh
        );
      }
    }

    if (!analysis) {
      return NextResponse.json({
        success: false,
        message: '無法生成症狀模式分析，可能數據不足',
        data: null
      } as SymptomPatternResponse, { status: 404 });
    }

    console.log('✅ Successfully retrieved symptom pattern analysis');

    return NextResponse.json({
      success: true,
      message: '成功獲取症狀模式分析',
      data: analysis
    } as SymptomPatternResponse);

  } catch (error) {
    console.error('❌ Symptom Patterns API Error:', error);
    return NextResponse.json({
      success: false,
      message: '獲取症狀模式分析時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as SymptomPatternResponse, { status: 500 });
  }
}

/**
 * POST /api/medical/symptom-patterns
 * 手動觸發症狀模式分析計算
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, period, startDate, endDate, analysisOptions } = body;

    console.log('📊 Symptom Patterns API - POST Request');
    console.log('📋 User ID:', userId);
    console.log('📅 Period:', period);
    console.log('🔧 Options:', analysisOptions);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      } as SymptomPatternResponse, { status: 400 });
    }

    if (!period || !['weekly', 'monthly', 'quarterly'].includes(period)) {
      return NextResponse.json({
        success: false,
        message: '分析期間必須是 weekly, monthly, 或 quarterly',
        data: null
      } as SymptomPatternResponse, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        message: '開始日期和結束日期為必填參數',
        data: null
      } as SymptomPatternResponse, { status: 400 });
    }

    const analysis = await SymptomPatternAnalyzer.computePatternAnalysis(
      userId,
      period,
      new Date(startDate),
      new Date(endDate),
      true, // Force recompute
      analysisOptions
    );

    if (!analysis) {
      return NextResponse.json({
        success: false,
        message: '無法計算症狀模式分析，可能數據不足',
        data: null
      } as SymptomPatternResponse, { status: 400 });
    }

    console.log('✅ Successfully computed symptom pattern analysis');

    return NextResponse.json({
      success: true,
      message: '成功計算症狀模式分析',
      data: analysis
    } as SymptomPatternResponse);

  } catch (error) {
    console.error('❌ Symptom Patterns API Error:', error);
    return NextResponse.json({
      success: false,
      message: '計算症狀模式分析時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as SymptomPatternResponse, { status: 500 });
  }
}

/**
 * DELETE /api/medical/symptom-patterns
 * 刪除症狀模式分析記錄
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const analysisId = searchParams.get('analysisId');
    const period = searchParams.get('period');

    console.log('📊 Symptom Patterns API - DELETE Request');
    console.log('📋 User ID:', userId);
    console.log('🗑️ Analysis ID:', analysisId);
    console.log('📅 Period:', period);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      } as SymptomPatternResponse, { status: 400 });
    }

    let success = false;

    if (analysisId) {
      // Delete specific analysis
      success = await SymptomPatternAnalyzer.deletePatternAnalysis(analysisId, userId);
    } else if (period) {
      // Delete all analyses for period
      success = await SymptomPatternAnalyzer.deletePatternAnalysesByPeriod(userId, period as any);
    } else {
      return NextResponse.json({
        success: false,
        message: '必須提供 analysisId 或 period 參數',
        data: null
      } as SymptomPatternResponse, { status: 400 });
    }

    if (!success) {
      return NextResponse.json({
        success: false,
        message: '未找到要刪除的分析記錄',
        data: null
      } as SymptomPatternResponse, { status: 404 });
    }

    console.log('✅ Successfully deleted symptom pattern analysis');

    return NextResponse.json({
      success: true,
      message: '成功刪除症狀模式分析',
      data: null
    } as SymptomPatternResponse);

  } catch (error) {
    console.error('❌ Symptom Patterns API Error:', error);
    return NextResponse.json({
      success: false,
      message: '刪除症狀模式分析時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as SymptomPatternResponse, { status: 500 });
  }
}