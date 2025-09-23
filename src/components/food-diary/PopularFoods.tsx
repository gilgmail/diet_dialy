'use client'

import { useState, useEffect } from 'react'
import { foodsService } from '@/lib/supabase/foods'
import { foodEntriesService } from '@/lib/supabase/food-entries'

interface Food {
  id: string
  name: string
  category: string
  calories?: number
  medical_score?: number
}

interface PopularFoodsProps {
  userId: string
  onFoodSelect: (food: Food) => void
  className?: string
}

export function PopularFoods({ userId, onFoodSelect, className = '' }: PopularFoodsProps) {
  const [popularFoods, setPopularFoods] = useState<Food[]>([])
  const [recentFoods, setRecentFoods] = useState<Food[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'popular' | 'recent'>('popular')

  useEffect(() => {
    loadPopularAndRecentFoods()
  }, [userId])

  const loadPopularAndRecentFoods = async () => {
    try {
      setLoading(true)

      // 載入最近使用的食物 (最近7天)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 7)

      const recentEntries = await foodEntriesService.getUserFoodEntriesByDateRange(
        userId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      )

      // 統計食物使用頻率
      const foodFrequency: Record<string, { count: number; food: any; lastUsed: string }> = {}

      recentEntries.forEach(entry => {
        if (entry.food_id) {
          if (!foodFrequency[entry.food_id]) {
            foodFrequency[entry.food_id] = {
              count: 0,
              food: {
                id: entry.food_id,
                name: entry.food_name,
                category: entry.food_category || '未分類',
                calories: entry.calories,
                medical_score: entry.medical_score
              },
              lastUsed: entry.consumed_at
            }
          }
          foodFrequency[entry.food_id].count++

          // 更新最後使用時間
          if (entry.consumed_at > foodFrequency[entry.food_id].lastUsed) {
            foodFrequency[entry.food_id].lastUsed = entry.consumed_at
          }
        }
      })

      // 按使用頻率排序 (最常用的)
      const popularFoodsList = Object.values(foodFrequency)
        .filter(item => item.count >= 2) // 至少使用2次才算常用
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(item => item.food)

      // 按最近使用時間排序
      const recentFoodsList = Object.values(foodFrequency)
        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
        .slice(0, 8)
        .map(item => item.food)

      setPopularFoods(popularFoodsList)
      setRecentFoods(recentFoodsList)

      // 如果沒有常用食物，默認顯示最近的
      if (popularFoodsList.length === 0 && recentFoodsList.length > 0) {
        setActiveTab('recent')
      }

    } catch (error) {
      console.error('載入常用食物失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMedicalScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-600'
    if (score >= 8) return 'bg-green-100 text-green-800'
    if (score >= 6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getMedicalScoreText = (score?: number) => {
    if (!score) return '未評分'
    if (score >= 8) return '推薦'
    if (score >= 6) return '適中'
    return '謹慎'
  }

  const currentFoods = activeTab === 'popular' ? popularFoods : recentFoods
  const hasPopular = popularFoods.length > 0
  const hasRecent = recentFoods.length > 0

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!hasPopular && !hasRecent) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-3">🌟 常用食物</h3>
        <div className="text-center py-8 text-gray-500">
          <span className="text-3xl mb-2 block">🍽️</span>
          <p>開始記錄食物後，常用的食物會顯示在這裡</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${className}`}>
      {/* 標籤切換 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {hasPopular && (
            <button
              onClick={() => setActiveTab('popular')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'popular'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🌟 常用
            </button>
          )}
          {hasRecent && (
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'recent'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🕒 最近
            </button>
          )}
        </div>
        <button
          onClick={loadPopularAndRecentFoods}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          🔄 重新載入
        </button>
      </div>

      {/* 食物網格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {currentFoods.map((food) => (
          <button
            key={food.id}
            onClick={() => onFoodSelect(food)}
            className="text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-medium text-gray-900 text-sm">{food.name}</h4>
              <span className={`px-2 py-0.5 text-xs rounded-full ${getMedicalScoreColor(food.medical_score)}`}>
                {getMedicalScoreText(food.medical_score)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>{food.category}</span>
              {food.calories && (
                <span>{food.calories} cal/100g</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {currentFoods.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          {activeTab === 'popular' ? '尚無常用食物' : '尚無最近使用的食物'}
        </div>
      )}
    </div>
  )
}