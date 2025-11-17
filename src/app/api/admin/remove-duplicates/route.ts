/**
 * 移除重複食物 API - 管理員工具
 * 檢測並刪除資料庫中的重複食物項目
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  createUnauthorizedResponse,
  getAuthenticatedUser,
} from '@/lib/supabase/server-auth'
import { createAdminClient } from '@/lib/supabase/server'

interface DuplicateFood {
  name: string
  duplicates: Array<{
    id: string
    name: string
    brand?: string
    category: string
    verification_status: string
    created_at: string
    calories?: number
    protein?: number
  }>
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return createUnauthorizedResponse('請先登入')
  }

  const admin = createAdminClient()
  const isAdmin = await userIsAdmin(user.id, admin)
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: '需要管理員權限' },
      { status: 403 }
    )
  }

  try {
    // 檢測重複食物
    const { data: allFoods, error } = await admin
      .from('diet_daily_foods')
      .select('id, name, brand, category, verification_status, created_at, calories, protein')
      .order('name')

    if (error) {
      throw error
    }

    // 分組找出重複項目
    const foodGroups = new Map<string, any[]>()

    allFoods?.forEach(food => {
      // 使用食物名稱作為key來分組（更強的正規化處理）
      const normalizedName = food.name
        .toLowerCase()
        .trim()
        .replace(/[\s\-_\.]+/g, '') // 移除所有空格、橫線、底線、點
        .replace(/[（）()]/g, '') // 移除括號
        .replace(/[，,]/g, '') // 移除逗號


      if (!foodGroups.has(normalizedName)) {
        foodGroups.set(normalizedName, [])
      }
      foodGroups.get(normalizedName)!.push(food)
    })

    // 找出有重複項目的群組
    const duplicates: DuplicateFood[] = []

    foodGroups.forEach((foods, normalizedName) => {
      if (foods.length > 1) {
        duplicates.push({
          name: foods[0].name, // 使用第一個項目的原始名稱
          duplicates: foods.sort((a, b) => {
            // 優先保留已驗證的食物
            if (a.verification_status === 'approved' && b.verification_status !== 'approved') {
              return -1
            }
            if (b.verification_status === 'approved' && a.verification_status !== 'approved') {
              return 1
            }
            // 其次保留較完整營養資訊的食物
            const aScore = (a.calories ? 1 : 0) + (a.protein ? 1 : 0)
            const bScore = (b.calories ? 1 : 0) + (b.protein ? 1 : 0)
            if (aScore !== bScore) {
              return bScore - aScore
            }
            // 最後按建立時間排序（保留較早的）
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        totalFoods: allFoods?.length || 0,
        duplicateGroups: duplicates.length,
        totalDuplicates: duplicates.reduce((sum, group) => sum + group.duplicates.length - 1, 0),
        duplicates
      }
    })

  } catch (error) {
    console.error('檢測重複食物失敗:', error)
    return NextResponse.json(
      {
        success: false,
        error: '檢測重複食物失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return createUnauthorizedResponse('請先登入')
  }

  const admin = createAdminClient()
  const isAdmin = await userIsAdmin(user.id, admin)
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: '需要管理員權限' },
      { status: 403 }
    )
  }

  try {
    const { action, foodIds, keepFoodId } = await request.json()

    if (action === 'remove_duplicates') {
      // 批量刪除重複食物
      if (!foodIds || !Array.isArray(foodIds) || foodIds.length === 0) {
        return NextResponse.json(
          { success: false, error: '請提供要刪除的食物 ID 列表' },
          { status: 400 }
        )
      }

      const { error } = await admin
        .from('diet_daily_foods')
        .delete()
        .in('id', foodIds)

      if (error) {
        throw error
      }

      return NextResponse.json({
        success: true,
        message: `成功刪除 ${foodIds.length} 個重複食物`,
        deletedCount: foodIds.length
      })

    } else if (action === 'auto_cleanup') {
      // 自動清理重複食物（保留最佳版本）
      // 重新獲取重複食物資料
      const { data: allFoods, error: fetchError } = await admin
        .from('diet_daily_foods')
        .select('id, name, brand, category, verification_status, created_at, calories, protein')
        .order('name')

      if (fetchError) {
        throw fetchError
      }

      // 分組找出重複項目
      const foodGroups = new Map<string, any[]>()

      allFoods?.forEach(food => {
        const normalizedName = food.name
          .toLowerCase()
          .trim()
          .replace(/[\s\-_\.]+/g, '') // 移除所有空格、橫線、底線、點
          .replace(/[（）()]/g, '') // 移除括號
          .replace(/[，,]/g, '') // 移除逗號
        if (!foodGroups.has(normalizedName)) {
          foodGroups.set(normalizedName, [])
        }
        foodGroups.get(normalizedName)!.push(food)
      })

      // 找出有重複項目的群組
      const duplicates: DuplicateFood[] = []
      foodGroups.forEach((foods, normalizedName) => {
        if (foods.length > 1) {
          duplicates.push({
            name: foods[0].name,
            duplicates: foods.sort((a, b) => {
              // 優先保留已驗證的食物
              if (a.verification_status === 'approved' && b.verification_status !== 'approved') {
                return -1
              }
              if (b.verification_status === 'approved' && a.verification_status !== 'approved') {
                return 1
              }
              // 其次保留較完整營養資訊的食物
              const aScore = (a.calories ? 1 : 0) + (a.protein ? 1 : 0)
              const bScore = (b.calories ? 1 : 0) + (b.protein ? 1 : 0)
              if (aScore !== bScore) {
                return bScore - aScore
              }
              // 最後按建立時間排序（保留較早的）
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            })
          })
        }
      })

      let deletedCount = 0
      const deletionResults = []

      // 對每個重複群組進行處理
      for (const duplicateGroup of duplicates) {
        const foods = duplicateGroup.duplicates

        if (foods.length > 1) {
          // 保留第一個（已排序的最佳版本），刪除其餘的
          const toKeep = foods[0]
          const toDelete = foods.slice(1)

          const deleteIds = toDelete.map(food => food.id)

          try {
            const { error } = await admin
              .from('diet_daily_foods')
              .delete()
              .in('id', deleteIds)

            if (error) {
              throw error
            }

            deletedCount += deleteIds.length
            deletionResults.push({
              group: duplicateGroup.name,
              kept: toKeep.id,
              deleted: deleteIds,
              keptReason: `${toKeep.verification_status} | 建立於 ${toKeep.created_at}`
            })

          } catch (error) {
            console.error(`刪除群組 ${duplicateGroup.name} 失敗:`, error)
            deletionResults.push({
              group: duplicateGroup.name,
              error: error instanceof Error ? error.message : '刪除失敗'
            })
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `自動清理完成，刪除了 ${deletedCount} 個重複食物`,
        deletedCount,
        results: deletionResults
      })

    } else {
      return NextResponse.json(
        { success: false, error: '不支援的操作' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('刪除重複食物失敗:', error)
    return NextResponse.json(
      {
        success: false,
        error: '刪除重複食物失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return createUnauthorizedResponse('請先登入')
  }

  const admin = createAdminClient()
  const isAdmin = await userIsAdmin(user.id, admin)
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, message: '需要管理員權限' },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const foodId = searchParams.get('id')

    if (!foodId) {
      return NextResponse.json(
        { success: false, error: '請提供要刪除的食物 ID' },
        { status: 400 }
      )
    }

    // 刪除單個食物
    const { error } = await admin
      .from('diet_daily_foods')
      .delete()
      .eq('id', foodId)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: '食物已成功刪除',
      deletedId: foodId
    })

  } catch (error) {
    console.error('刪除食物失敗:', error)
    return NextResponse.json(
      {
        success: false,
        error: '刪除食物失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}

async function userIsAdmin(userId: string, admin: ReturnType<typeof createAdminClient>) {
  const { data, error } = await admin
    .from('diet_daily_users')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[userIsAdmin] failed:', error)
    return false
  }

  return !!data?.is_admin
}