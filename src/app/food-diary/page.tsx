'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { foodEntriesService } from '@/lib/supabase/food-entries'
import { foodsService } from '@/lib/supabase/foods'
import type { FoodEntry, FoodEntryInsert } from '@/types/supabase'

interface FoodSearchResult {
  id: string
  name: string
  category: string
  calories?: number
  medical_score?: number
}

export default function FoodDiaryPage() {
  const { user, isAuthenticated, isLoading } = useSupabaseAuth()

  // 狀態管理
  const [todayEntries, setTodayEntries] = useState<FoodEntry[]>([])
  const [foodSearch, setFoodSearch] = useState('')
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([])
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null)
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('g')
  const [notes, setNotes] = useState('')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  // 載入今日記錄
  useEffect(() => {
    if (user) {
      loadTodayEntries()
    }
  }, [user])

  // 搜尋食物資料庫
  useEffect(() => {
    if (foodSearch.length > 1) {
      searchFoods()
    } else {
      setSearchResults([])
    }
  }, [foodSearch])

  const loadTodayEntries = async () => {
    if (!user) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const entries = await foodEntriesService.getUserFoodEntriesByDate(user.id, today)
      setTodayEntries(entries)
    } catch (error) {
      console.error('載入今日記錄失敗:', error)
    }
  }

  const searchFoods = async () => {
    try {
      const results = await foodsService.searchApprovedFoods(foodSearch)
      setSearchResults(results.map(food => ({
        id: food.id,
        name: food.name,
        category: food.category,
        calories: food.calories || undefined,
        medical_score: food.medical_score || undefined
      })))
    } catch (error) {
      console.error('搜尋食物失敗:', error)
      setSearchResults([])
    }
  }

  const handleAddEntry = async () => {
    if (!user || !selectedFood || !quantity) {
      setMessage('請填寫完整資訊')
      return
    }

    setIsSubmitting(true)

    try {
      const entryData: FoodEntryInsert = {
        user_id: user.id,
        food_id: selectedFood.id,
        food_name: selectedFood.name,
        quantity: parseFloat(quantity),
        unit: unit,
        meal_type: mealType,
        consumed_at: new Date().toISOString(),
        notes: notes || undefined,
        calories: selectedFood.calories ? (selectedFood.calories * parseFloat(quantity) / 100) : undefined,
        medical_score: selectedFood.medical_score
      }

      await foodEntriesService.createFoodEntry(entryData)

      // 重新載入記錄
      await loadTodayEntries()

      // 重置表單
      setSelectedFood(null)
      setQuantity('')
      setNotes('')
      setFoodSearch('')
      setMessage('✅ 食物記錄已新增！')

      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('新增記錄失敗:', error)
      setMessage('❌ 新增記錄失敗，請重試')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsSubmitting(false)
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

  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl mb-4 block">🔒</span>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">請先登入</h2>
          <p className="text-gray-600 mb-4">需要登入才能使用食物日記功能</p>
          <Link href="/settings" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
            前往登入
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              ← 返回首頁
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">🍽️ 食物日記</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側：新增記錄 */}
          <div className="space-y-6">
            {/* 新增食物記錄 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📝 新增食物記錄</h2>

              {message && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-800 text-sm">
                  {message}
                </div>
              )}

              {/* 搜尋食物 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">搜尋食物</label>
                <input
                  type="text"
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  placeholder="輸入食物名稱..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* 搜尋結果 */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {searchResults.map((food) => (
                      <button
                        key={food.id}
                        onClick={() => {
                          setSelectedFood(food)
                          setFoodSearch(food.name)
                          setSearchResults([])
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{food.name}</p>
                            <p className="text-sm text-gray-500">{food.category}</p>
                          </div>
                          {food.medical_score && (
                            <span className={`px-2 py-1 rounded-full text-xs ${getMedicalScoreColor(food.medical_score)}`}>
                              {getMedicalScoreText(food.medical_score)}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 選中的食物 */}
              {selectedFood && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900">{selectedFood.name}</p>
                      <p className="text-sm text-blue-700">{selectedFood.category}</p>
                    </div>
                    <button
                      onClick={() => setSelectedFood(null)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* 份量和單位 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">份量</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">單位</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="g">公克 (g)</option>
                    <option value="ml">毫升 (ml)</option>
                    <option value="份">份</option>
                    <option value="個">個</option>
                    <option value="碗">碗</option>
                    <option value="杯">杯</option>
                  </select>
                </div>
              </div>

              {/* 餐次 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">餐次</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'breakfast', label: '早餐' },
                    { value: 'lunch', label: '午餐' },
                    { value: 'dinner', label: '晚餐' },
                    { value: 'snack', label: '點心' }
                  ].map((meal) => (
                    <button
                      key={meal.value}
                      onClick={() => setMealType(meal.value as any)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        mealType === meal.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {meal.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 備註 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">備註 (選填)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="記錄心情、症狀或其他備註..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 新增按鈕 */}
              <button
                onClick={handleAddEntry}
                disabled={!selectedFood || !quantity || isSubmitting}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-medium"
              >
                {isSubmitting ? '新增中...' : '➕ 新增記錄'}
              </button>
            </div>
          </div>

          {/* 右側：今日記錄 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📅 今日記錄</h2>

            {todayEntries.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl mb-4 block">🍽️</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">還沒有記錄</h3>
                <p className="text-gray-600">開始記錄您今天的食物攝取吧！</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayEntries.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{entry.food_name}</h3>
                      <span className="text-sm text-gray-500">
                        {new Date(entry.consumed_at).toLocaleTimeString('zh-TW', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <span>📏 {entry.quantity}{entry.unit}</span>
                      <span>🍽️ {
                        entry.meal_type === 'breakfast' ? '早餐' :
                        entry.meal_type === 'lunch' ? '午餐' :
                        entry.meal_type === 'dinner' ? '晚餐' : '點心'
                      }</span>
                      {entry.calories && (
                        <span>🔥 {Math.round(entry.calories)} 卡</span>
                      )}
                    </div>

                    {entry.medical_score && (
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getMedicalScoreColor(entry.medical_score)}`}>
                          醫療評分：{entry.medical_score}/10
                        </span>
                      </div>
                    )}

                    {entry.notes && (
                      <p className="text-sm text-gray-600 italic">📝 {entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}