import { NextRequest, NextResponse } from 'next/server';
import { foodDatabase } from '@/lib/food-database';
import { CreateFoodRequest } from '@/types/food';

// GET /api/foods - Get all foods or search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');

    let foods;

    if (query) {
      foods = await foodDatabase.searchFoods(query);
    } else if (category) {
      foods = await foodDatabase.getFoodsByCategory(category);
    } else {
      foods = await foodDatabase.getAllFoods();
    }

    return NextResponse.json({
      success: true,
      foods
    });
  } catch (error) {
    console.error('GET /api/foods error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '獲取食物失敗'
      },
      { status: 500 }
    );
  }
}

// POST /api/foods - Create new food
export async function POST(request: NextRequest) {
  try {
    const body: CreateFoodRequest = await request.json();

    console.log('🍽️ POST /api/foods 接收資料:', {
      name_zh: body.name_zh,
      name_en: body.name_en,
      category: body.category,
      hasMedicalScores: !!body.medical_scores,
      medicalScoresKeys: body.medical_scores ? Object.keys(body.medical_scores) : [],
      medicalScoresStructure: body.medical_scores
    });

    // Basic validation
    if (!body.name_zh || !body.name_en || !body.category) {
      console.log('❌ 基本欄位驗證失敗:', { name_zh: body.name_zh, name_en: body.name_en, category: body.category });
      return NextResponse.json(
        { error: '必填欄位不能為空：中文名稱、英文名稱、分類' },
        { status: 400 }
      );
    }

    if (!body.medical_scores) {
      console.log('❌ 缺少醫療評分資訊');
      return NextResponse.json(
        { error: '醫療評分資訊不完整' },
        { status: 400 }
      );
    }

    // 支援兩種格式的醫療評分結構
    const hasOldFormat = body.medical_scores.ibd_score !== undefined;
    const hasNewFormat = body.medical_scores.IBD !== undefined;

    console.log('🔍 醫療評分格式檢查:', { hasOldFormat, hasNewFormat });

    if (!hasOldFormat && !hasNewFormat) {
      console.log('❌ 醫療評分格式無效:', body.medical_scores);
      return NextResponse.json(
        { error: '醫療評分缺少IBD資訊' },
        { status: 400 }
      );
    }

    const newFood = await foodDatabase.createFood(body);

    return NextResponse.json({
      success: true,
      food: newFood
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/foods error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '新增食物失敗' },
      { status: 500 }
    );
  }
}