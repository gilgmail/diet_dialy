import { NextRequest, NextResponse } from 'next/server';
import { foodDatabase } from '@/lib/food-database';

// PATCH /api/foods/[id]/validate - Validate food medically
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validatedFood = await foodDatabase.validateFood(params.id);

    return NextResponse.json({ food: validatedFood });
  } catch (error) {
    console.error('PATCH /api/foods/[id]/validate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '驗證食物失敗' },
      { status: 500 }
    );
  }
}