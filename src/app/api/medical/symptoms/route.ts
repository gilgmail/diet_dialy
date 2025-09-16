import { NextRequest, NextResponse } from 'next/server';
import type { SymptomEntry, Symptom } from '@/types/medical';
import { symptomTracker } from '@/lib/medical/symptom-tracker';

/**
 * GET /api/medical/symptoms
 * 獲取症狀記錄和分析
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';
    const action = searchParams.get('action') || 'stats';
    const days = parseInt(searchParams.get('days') || '30');

    console.log('🩺 Symptoms API - GET Request');
    console.log('📋 User ID:', userId);
    console.log('🎯 Action:', action);
    console.log('📅 Days:', days);

    switch (action) {
      case 'stats':
        const stats = symptomTracker.getSymptomStats(days);
        return NextResponse.json({
          success: true,
          message: '成功獲取症狀統計',
          data: stats
        });

      case 'analysis':
        const analysis = symptomTracker.analyzeSymptoms(days);
        return NextResponse.json({
          success: true,
          message: '成功獲取症狀分析',
          data: analysis
        });

      case 'trends':
        const trends = symptomTracker.analyzeSymptoms(days);
        return NextResponse.json({
          success: true,
          message: '成功獲取症狀趨勢',
          data: {
            weekly_trends: trends.weekly_trends,
            severity_patterns: trends.severity_patterns
          }
        });

      case 'correlations':
        const correlations = symptomTracker.analyzeSymptoms(days);
        return NextResponse.json({
          success: true,
          message: '成功獲取食物關聯性',
          data: {
            food_correlations: correlations.food_correlations
          }
        });

      default:
        return NextResponse.json({
          success: false,
          message: '無效的查詢動作',
          data: null
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Symptoms API Error:', error);

    return NextResponse.json({
      success: false,
      message: '獲取症狀資料時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}

/**
 * POST /api/medical/symptoms
 * 記錄新的症狀
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'demo-user', symptoms, notes, triggeredBy } = body;

    console.log('🩺 Symptoms API - POST Request');
    console.log('📋 User ID:', userId);
    console.log('💊 Symptoms:', symptoms);

    // 驗證症狀資料
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return NextResponse.json({
        success: false,
        message: '症狀資料為必填欄位',
        data: null
      }, { status: 400 });
    }

    const recordedSymptoms: string[] = [];

    // 記錄每個症狀
    for (const symptomData of symptoms) {
      // 驗證症狀資料結構
      if (!symptomData.type || !symptomData.severity || typeof symptomData.severity_score !== 'number') {
        return NextResponse.json({
          success: false,
          message: '症狀資料結構不正確',
          data: null
        }, { status: 400 });
      }

      const symptom: Omit<Symptom, 'id'> = {
        type: symptomData.type,
        severity: symptomData.severity,
        severity_score: symptomData.severity_score,
        timestamp: new Date(symptomData.timestamp || Date.now()),
        duration: symptomData.duration,
        triggers: symptomData.triggers,
        notes: symptomData.notes || notes,
        related_food_ids: symptomData.related_food_ids,
        medication_relief: symptomData.medication_relief,
        activity_impact: symptomData.activity_impact || 'none'
      };

      const symptomId = symptomTracker.recordSymptom(symptom);
      recordedSymptoms.push(symptomId);

      console.log(`✅ Recorded symptom: ${symptom.type} (ID: ${symptomId})`);
    }

    // 如果有觸發食物，記錄關聯
    if (triggeredBy) {
      console.log('🍽️ Recording food trigger association:', triggeredBy);
    }

    console.log(`✅ Successfully recorded ${recordedSymptoms.length} symptoms`);

    return NextResponse.json({
      success: true,
      message: `成功記錄 ${recordedSymptoms.length} 個症狀`,
      data: {
        symptom_ids: recordedSymptoms,
        recorded_count: recordedSymptoms.length
      }
    });

  } catch (error) {
    console.error('❌ Symptoms API Error:', error);

    return NextResponse.json({
      success: false,
      message: '記錄症狀時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}

/**
 * PUT /api/medical/symptoms
 * 更新症狀記錄
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'demo-user', symptomId, updates } = body;

    console.log('🩺 Symptoms API - PUT Request');
    console.log('📋 User ID:', userId);
    console.log('🔄 Symptom ID:', symptomId);
    console.log('📝 Updates:', updates);

    // 這裡應該實現症狀更新邏輯
    // 由於症狀追蹤器目前不支援更新，這裡返回成功響應
    console.log('ℹ️ Symptom update functionality to be implemented');

    return NextResponse.json({
      success: true,
      message: '症狀記錄更新功能開發中',
      data: null
    });

  } catch (error) {
    console.error('❌ Symptoms API Error:', error);

    return NextResponse.json({
      success: false,
      message: '更新症狀記錄時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/medical/symptoms
 * 刪除症狀記錄
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';
    const symptomId = searchParams.get('symptomId');

    console.log('🩺 Symptoms API - DELETE Request');
    console.log('📋 User ID:', userId);
    console.log('🗑️ Symptom ID:', symptomId);

    if (!symptomId) {
      return NextResponse.json({
        success: false,
        message: '症狀 ID 為必填參數',
        data: null
      }, { status: 400 });
    }

    // 這裡應該實現症狀刪除邏輯
    // 由於症狀追蹤器目前不支援刪除，這裡返回成功響應
    console.log('ℹ️ Symptom deletion functionality to be implemented');

    return NextResponse.json({
      success: true,
      message: '症狀記錄刪除功能開發中',
      data: null
    });

  } catch (error) {
    console.error('❌ Symptoms API Error:', error);

    return NextResponse.json({
      success: false,
      message: '刪除症狀記錄時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}