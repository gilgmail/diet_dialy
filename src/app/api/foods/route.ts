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

    return NextResponse.json({ foods });
  } catch (error) {
    console.error('GET /api/foods error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '獲取食物失敗' },
      { status: 500 }
    );
  }
}

// POST /api/foods - Create new food
export async function POST(request: NextRequest) {
  try {
    const body: CreateFoodRequest = await request.json();

    // Basic validation
    if (!body.name_zh || !body.name_en || !body.category) {
      return NextResponse.json(
        { error: '必填欄位不能為空：中文名稱、英文名稱、分類' },
        { status: 400 }
      );
    }

    if (!body.medical_scores || !body.medical_scores.ibd_score) {
      return NextResponse.json(
        { error: '醫療評分資訊不完整' },
        { status: 400 }
      );
    }

    const newFood = await foodDatabase.createFood(body);

    return NextResponse.json({ food: newFood }, { status: 201 });
  } catch (error) {
    console.error('POST /api/foods error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '新增食物失敗' },
      { status: 500 }
    );
  }
}