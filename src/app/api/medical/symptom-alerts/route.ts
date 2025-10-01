import { NextRequest, NextResponse } from 'next/server';
import { SymptomAlertService } from '@/lib/supabase/symptom-alert-service';
import type {
  SymptomAlert,
  SymptomAlertHistory,
  SymptomAlertResponse,
  SymptomAlertType,
  SymptomThreshold
} from '@/types/medical';

/**
 * GET /api/medical/symptom-alerts
 * 獲取症狀警報設定和歷史
 * Query params:
 * - userId: string (required)
 * - action: string ('alerts' | 'history', default: 'alerts')
 * - alertType: string (filter by alert type)
 * - isActive: boolean (filter by active status)
 * - limit: number (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action') || 'alerts';
    const alertType = searchParams.get('alertType') as SymptomAlertType;
    const isActive = searchParams.get('isActive');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('🚨 Symptom Alerts API - GET Request');
    console.log('📋 User ID:', userId);
    console.log('🎯 Action:', action);
    console.log('📊 Alert Type:', alertType);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      } as SymptomAlertResponse, { status: 400 });
    }

    if (action === 'history') {
      // Get alert history
      const history = await SymptomAlertService.getAlertHistory(userId, {
        alertType,
        limit
      });

      return NextResponse.json({
        success: true,
        message: `成功獲取 ${history.length} 筆警報歷史`,
        data: history
      } as SymptomAlertResponse);
    } else {
      // Get alerts
      const filters: any = {};
      if (alertType) filters.alertType = alertType;
      if (isActive !== null) filters.isActive = isActive === 'true';

      const alerts = await SymptomAlertService.getUserAlerts(userId, filters);

      return NextResponse.json({
        success: true,
        message: `成功獲取 ${alerts.length} 個警報設定`,
        data: alerts
      } as SymptomAlertResponse);
    }

  } catch (error) {
    console.error('❌ Symptom Alerts API Error:', error);
    return NextResponse.json({
      success: false,
      message: '獲取症狀警報時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as SymptomAlertResponse, { status: 500 });
  }
}

/**
 * POST /api/medical/symptom-alerts
 * 創建新的症狀警報
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...alertData } = body;

    console.log('🚨 Symptom Alerts API - POST Request');
    console.log('📋 User ID:', userId);
    console.log('📊 Alert Data:', alertData);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 為必填參數',
        data: null
      } as SymptomAlertResponse, { status: 400 });
    }

    // Validate required fields
    if (!alertData.alert_type || !alertData.alert_name) {
      return NextResponse.json({
        success: false,
        message: '警報類型和名稱為必填欄位',
        data: null
      } as SymptomAlertResponse, { status: 400 });
    }

    // Validate alert type
    const validAlertTypes: SymptomAlertType[] = [
      'symptom_deterioration',
      'symptom_improvement',
      'pattern_change',
      'missed_entry',
      'threshold_breach',
      'correlation_detected'
    ];

    if (!validAlertTypes.includes(alertData.alert_type)) {
      return NextResponse.json({
        success: false,
        message: '無效的警報類型',
        data: null
      } as SymptomAlertResponse, { status: 400 });
    }

    // Validate symptom thresholds
    if (!alertData.symptom_thresholds || !Array.isArray(alertData.symptom_thresholds)) {
      return NextResponse.json({
        success: false,
        message: '症狀閾值設定為必填欄位',
        data: null
      } as SymptomAlertResponse, { status: 400 });
    }

    // Prepare alert data
    const newAlert: Omit<SymptomAlert, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      alert_type: alertData.alert_type,
      alert_name: alertData.alert_name,
      description: alertData.description,

      // Thresholds
      symptom_thresholds: alertData.symptom_thresholds,
      severity_threshold: alertData.severity_threshold || 3,
      duration_threshold: alertData.duration_threshold || 1,

      // Conditions and delivery
      trigger_conditions: alertData.trigger_conditions || {},
      notification_frequency: alertData.notification_frequency || 'immediate',
      notification_channels: alertData.notification_channels || ['app'],

      // Status
      is_active: alertData.is_active !== false, // Default to true
      trigger_count: 0,

      // Escalation
      escalation_rules: alertData.escalation_rules || {}
    };

    const createdAlert = await SymptomAlertService.createAlert(newAlert);

    console.log('✅ Successfully created symptom alert:', createdAlert.id);

    return NextResponse.json({
      success: true,
      message: '成功創建症狀警報',
      data: [createdAlert]
    } as SymptomAlertResponse);

  } catch (error) {
    console.error('❌ Symptom Alerts API Error:', error);
    return NextResponse.json({
      success: false,
      message: '創建症狀警報時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as SymptomAlertResponse, { status: 500 });
  }
}

/**
 * PUT /api/medical/symptom-alerts
 * 更新症狀警報設定
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, alertId, ...updates } = body;

    console.log('🚨 Symptom Alerts API - PUT Request');
    console.log('📋 User ID:', userId);
    console.log('🔄 Alert ID:', alertId);
    console.log('📝 Updates:', updates);

    if (!userId || !alertId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 和警報 ID 為必填參數',
        data: null
      } as SymptomAlertResponse, { status: 400 });
    }

    const updatedAlert = await SymptomAlertService.updateAlert(alertId, userId, updates);

    if (!updatedAlert) {
      return NextResponse.json({
        success: false,
        message: '未找到要更新的警報設定',
        data: null
      } as SymptomAlertResponse, { status: 404 });
    }

    console.log('✅ Successfully updated symptom alert');

    return NextResponse.json({
      success: true,
      message: '成功更新症狀警報',
      data: [updatedAlert]
    } as SymptomAlertResponse);

  } catch (error) {
    console.error('❌ Symptom Alerts API Error:', error);
    return NextResponse.json({
      success: false,
      message: '更新症狀警報時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as SymptomAlertResponse, { status: 500 });
  }
}

/**
 * DELETE /api/medical/symptom-alerts
 * 刪除症狀警報
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const alertId = searchParams.get('alertId');

    console.log('🚨 Symptom Alerts API - DELETE Request');
    console.log('📋 User ID:', userId);
    console.log('🗑️ Alert ID:', alertId);

    if (!userId || !alertId) {
      return NextResponse.json({
        success: false,
        message: '用戶 ID 和警報 ID 為必填參數',
        data: null
      } as SymptomAlertResponse, { status: 400 });
    }

    const success = await SymptomAlertService.deleteAlert(alertId, userId);

    if (!success) {
      return NextResponse.json({
        success: false,
        message: '未找到要刪除的警報設定',
        data: null
      } as SymptomAlertResponse, { status: 404 });
    }

    console.log('✅ Successfully deleted symptom alert');

    return NextResponse.json({
      success: true,
      message: '成功刪除症狀警報',
      data: null
    } as SymptomAlertResponse);

  } catch (error) {
    console.error('❌ Symptom Alerts API Error:', error);
    return NextResponse.json({
      success: false,
      message: '刪除症狀警報時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤',
      data: null
    } as SymptomAlertResponse, { status: 500 });
  }
}