import { NextRequest, NextResponse } from 'next/server';
import { foodDatabase } from '@/lib/food-database';
import { UpdateFoodRequest } from '@/types/food';

// GET /api/foods/[id] - Get food by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const food = await foodDatabase.getFoodById(params.id);

    if (!food) {
      return NextResponse.json(
        { error: '找不到指定的食物' },
        { status: 404 }
      );
    }

    return NextResponse.json({ food });
  } catch (error) {
    console.error('GET /api/foods/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '獲取食物失敗' },
      { status: 500 }
    );
  }
}

// PUT /api/foods/[id] - Update food
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: Omit<UpdateFoodRequest, 'id'> = await request.json();
    const updateRequest: UpdateFoodRequest = {
      id: params.id,
      ...body
    };

    const updatedFood = await foodDatabase.updateFood(updateRequest);

    return NextResponse.json({ food: updatedFood });
  } catch (error) {
    console.error('PUT /api/foods/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新食物失敗' },
      { status: 500 }
    );
  }
}

// DELETE /api/foods/[id] - Delete food
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await foodDatabase.deleteFood(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/foods/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '刪除食物失敗' },
      { status: 500 }
    );
  }
}