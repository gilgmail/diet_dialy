import { NextRequest, NextResponse } from 'next/server';
import { foodHistoryDatabase } from '@/lib/food-history-database';
import { DatabaseFoodItem } from '@/types/food';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/supabase/server-auth';

interface FrequentFood extends DatabaseFoodItem {
  frequency: number;
  lastUsed: Date;
}

// GET /api/history/frequent - 取得用戶常吃的食物
export async function GET(request: NextRequest) {
  try {
    // ✅ SECURITY: Get authenticated user from session
    const authenticatedUser = await getAuthenticatedUser(request);
    if (!authenticatedUser) {
      return createUnauthorizedResponse('請先登入以查看常吃食物');
    }

    const { searchParams } = new URL(request.url);
    // ✅ SECURITY: Use authenticated user ID, ignore any userId from URL parameters
    const userId = authenticatedUser.id;
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('📊 取得常吃食物 (已驗證用戶):', { userId, limit });
    console.log('🔄 使用 queryHistory 方法取得歷史記錄');

    // 取得用戶的所有歷史記錄
    const allEntries = await foodHistoryDatabase.queryHistory({ userId });

    if (!allEntries || allEntries.length === 0) {
      return NextResponse.json({
        success: true,
        frequentFoods: []
      });
    }

    // 統計食物使用頻率
    const foodFrequency = new Map<string, {
      food: DatabaseFoodItem;
      count: number;
      lastUsed: Date;
    }>();

    allEntries.forEach(entry => {
      // 確保 entry 存在且有效
      if (!entry) {
        console.warn('⚠️ 跳過空的歷史記錄');
        return;
      }

      // 支援兩種資料結構: entry.food 或 entry.foodData
      const food = entry.food || entry.foodData;
      if (!food || !food.id) {
        console.warn('⚠️ 跳過無效的歷史記錄:', {
          entryId: entry.id,
          hasFood: !!entry.food,
          hasFoodData: !!entry.foodData,
          foodId: food?.id
        });
        return;
      }
      const foodId = food.id;
      const existing = foodFrequency.get(foodId);

      if (existing) {
        existing.count++;
        // 更新最後使用時間（保持最新的）
        const entryTime = new Date(entry.consumedAt || entry.timestamp || entry.createdAt);
        if (entryTime > existing.lastUsed) {
          existing.lastUsed = entryTime;
        }
      } else {
        foodFrequency.set(foodId, {
          food: food,
          count: 1,
          lastUsed: new Date(entry.consumedAt || entry.timestamp || entry.createdAt)
        });
      }
    });

    // 轉換為 FrequentFood 格式並排序
    const frequentFoods: FrequentFood[] = Array.from(foodFrequency.values())
      .map(item => ({
        ...item.food,
        frequency: item.count,
        lastUsed: item.lastUsed
      }))
      .sort((a, b) => {
        // 先按頻率排序，再按最後使用時間排序
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency;
        }
        return b.lastUsed.getTime() - a.lastUsed.getTime();
      })
      .slice(0, limit);

    console.log('✅ 常吃食物統計完成:', {
      totalUniqueFoods: foodFrequency.size,
      returnedCount: frequentFoods.length
    });

    return NextResponse.json({
      success: true,
      frequentFoods,
      stats: {
        totalEntries: allEntries.length,
        uniqueFoods: foodFrequency.size,
        averageFrequency: frequentFoods.length > 0
          ? Math.round(frequentFoods.reduce((sum, food) => sum + food.frequency, 0) / frequentFoods.length)
          : 0
      }
    });

  } catch (error) {
    console.error('❌ 取得常吃食物錯誤:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '取得常吃食物失敗'
      },
      { status: 500 }
    );
  }
}