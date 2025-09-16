import { NextRequest, NextResponse } from 'next/server';
import type { ExtendedMedicalProfile } from '@/types/medical';

import fs from 'fs';
import path from 'path';

const MEDICAL_PROFILES_PATH = path.join(process.cwd(), 'data', 'medical-profiles.json');

// 醫療資料文件持久化存儲
let medicalProfiles: Record<string, ExtendedMedicalProfile> = {};

// 載入醫療資料
function loadMedicalProfiles(): Record<string, ExtendedMedicalProfile> {
  try {
    if (fs.existsSync(MEDICAL_PROFILES_PATH)) {
      const data = fs.readFileSync(MEDICAL_PROFILES_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('載入醫療資料錯誤:', error);
  }
  return {};
}

// 儲存醫療資料
function saveMedicalProfiles(profiles: Record<string, ExtendedMedicalProfile>): void {
  try {
    // 確保 data 目錄存在
    const dataDir = path.dirname(MEDICAL_PROFILES_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(MEDICAL_PROFILES_PATH, JSON.stringify(profiles, null, 2));
  } catch (error) {
    console.error('儲存醫療資料錯誤:', error);
  }
}

// 初始化載入醫療資料
medicalProfiles = loadMedicalProfiles();

/**
 * GET /api/medical/profile
 * 獲取用戶醫療資料
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';

    console.log('🏥 Medical Profile API - GET Request');
    console.log('📋 User ID:', userId);

    const profile = medicalProfiles[userId];

    if (!profile) {
      return NextResponse.json({
        success: false,
        message: '未找到醫療資料',
        data: null
      }, { status: 404 });
    }

    console.log('✅ Medical profile found:', profile.primary_condition);

    return NextResponse.json({
      success: true,
      message: '成功獲取醫療資料',
      data: profile
    });

  } catch (error) {
    console.error('❌ Medical Profile API Error:', error);

    return NextResponse.json({
      success: false,
      message: '獲取醫療資料時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}

/**
 * POST /api/medical/profile
 * 創建或更新用戶醫療資料
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'demo-user', ...profileData } = body;

    console.log('🏥 Medical Profile API - POST Request');
    console.log('📋 User ID:', userId);
    console.log('💊 Profile Data:', profileData);

    // 驗證必要欄位
    if (!profileData.primary_condition) {
      return NextResponse.json({
        success: false,
        message: '主要醫療條件為必填欄位',
        data: null
      }, { status: 400 });
    }

    // 建立完整的醫療資料
    const profile: ExtendedMedicalProfile = {
      id: `profile_${userId}_${Date.now()}`,
      userId,
      allergies: profileData.known_allergies || [],
      medications: [],
      dietaryRestrictions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      primary_condition: profileData.primary_condition,
      secondary_conditions: profileData.secondary_conditions || [],
      known_allergies: profileData.known_allergies || [],
      personal_triggers: profileData.personal_triggers || [],
      current_phase: profileData.current_phase || 'remission',
      current_side_effects: profileData.current_side_effects || [],
      lactose_intolerant: profileData.lactose_intolerant || false,
      fiber_sensitive: profileData.fiber_sensitive || false,
      chemo_treatment_type: profileData.chemo_treatment_type,
      chemo_cycle_day: profileData.chemo_cycle_day,
      allergy_severity_levels: profileData.allergy_severity_levels || {},
      ibs_subtype: profileData.ibs_subtype || 'ibs_m',
      fodmap_tolerance: profileData.fodmap_tolerance || {}
    };

    // 儲存醫療資料
    medicalProfiles[userId] = profile;
    saveMedicalProfiles(medicalProfiles);

    console.log('✅ Medical profile saved successfully');
    console.log('🎯 Primary condition:', profile.primary_condition);
    console.log('🔄 Secondary conditions:', profile.secondary_conditions);

    return NextResponse.json({
      success: true,
      message: '醫療資料已成功保存',
      data: profile
    });

  } catch (error) {
    console.error('❌ Medical Profile API Error:', error);

    return NextResponse.json({
      success: false,
      message: '保存醫療資料時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}

/**
 * PUT /api/medical/profile
 * 更新用戶醫療資料
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'demo-user', ...updates } = body;

    console.log('🏥 Medical Profile API - PUT Request');
    console.log('📋 User ID:', userId);
    console.log('🔄 Updates:', updates);

    const existingProfile = medicalProfiles[userId];

    if (!existingProfile) {
      return NextResponse.json({
        success: false,
        message: '未找到要更新的醫療資料',
        data: null
      }, { status: 404 });
    }

    // 更新醫療資料
    const updatedProfile: ExtendedMedicalProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date()
    };

    medicalProfiles[userId] = updatedProfile;
    saveMedicalProfiles(medicalProfiles);

    console.log('✅ Medical profile updated successfully');

    return NextResponse.json({
      success: true,
      message: '醫療資料已成功更新',
      data: updatedProfile
    });

  } catch (error) {
    console.error('❌ Medical Profile API Error:', error);

    return NextResponse.json({
      success: false,
      message: '更新醫療資料時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/medical/profile
 * 刪除用戶醫療資料
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo-user';

    console.log('🏥 Medical Profile API - DELETE Request');
    console.log('📋 User ID:', userId);

    if (!medicalProfiles[userId]) {
      return NextResponse.json({
        success: false,
        message: '未找到要刪除的醫療資料',
        data: null
      }, { status: 404 });
    }

    delete medicalProfiles[userId];
    saveMedicalProfiles(medicalProfiles);

    console.log('✅ Medical profile deleted successfully');

    return NextResponse.json({
      success: true,
      message: '醫療資料已成功刪除',
      data: null
    });

  } catch (error) {
    console.error('❌ Medical Profile API Error:', error);

    return NextResponse.json({
      success: false,
      message: '刪除醫療資料時發生錯誤',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}