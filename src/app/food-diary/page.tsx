'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { unifiedFoodEntriesService, type UnifiedFoodEntry } from '@/lib/unified-food-entries'
import { foodsService } from '@/lib/supabase/foods'
import { CustomFoodModal } from '@/components/food-diary/CustomFoodModal'
import { QuickAddCustomFood } from '@/components/food-diary/QuickAddCustomFood'
import { PopularFoods } from '@/components/food-diary/PopularFoods'
import type { FoodEntryInsert } from '@/types/supabase'

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
  const [todayEntries, setTodayEntries] = useState<UnifiedFoodEntry[]>([])
  const [foodSearch, setFoodSearch] = useState('')
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([])
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null)
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('g')
  const [notes, setNotes] = useState('')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false)
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [searchCategories, setSearchCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [syncStatus, setSyncStatus] = useState<any>(null)

  // 載入今日記錄和分類
  useEffect(() => {
    loadTodayEntries()
    loadFoodCategories()

    // 如果有用戶登入，設置用戶ID並嘗試同步
    if (user) {
      unifiedFoodEntriesService.setUserIdForUnsyncedEntries(user.id)
      syncEntries()
    }

    updateSyncStatus()
  }, [user])

  // 定期檢查同步狀態
  useEffect(() => {
    const interval = setInterval(updateSyncStatus, 5000) // 每5秒檢查一次
    return () => clearInterval(interval)
  }, [])

  // 搜尋食物資料庫
  useEffect(() => {
    if (foodSearch.length > 1) {
      searchFoods()
    } else {
      setSearchResults([])
    }
  }, [foodSearch, selectedCategory])

  const loadTodayEntries = async () => {
    try {
      const entries = await unifiedFoodEntriesService.getTodayEntries(user?.id)
      setTodayEntries(entries)
    } catch (error) {
      console.error('載入今日記錄失敗:', error)
    }
  }

  const syncEntries = async () => {
    if (!user) return

    try {
      const result = await unifiedFoodEntriesService.syncAllEntries(user.id)
      if (result.success > 0) {
        console.log(`Successfully synced ${result.success} entries`)
        loadTodayEntries() // 重新載入以顯示最新狀態
      }
    } catch (error) {
      console.error('同步記錄失敗:', error)
    }
  }

  const updateSyncStatus = () => {
    const status = unifiedFoodEntriesService.getSyncStatus()
    setSyncStatus(status)
  }

  const loadFoodCategories = async () => {
    try {
      const categories = await foodsService.getFoodCategories()
      setSearchCategories(categories)
    } catch (error) {
      console.error('載入食物分類失敗:', error)
    }
  }

  const searchFoods = async () => {
    try {
      let results = await foodsService.searchApprovedFoods(foodSearch)

      // 如果選擇了分類，進一步篩選
      if (selectedCategory) {
        results = results.filter(food => food.category === selectedCategory)
      }

      setSearchResults(results.map(food => ({
        id: food.id,
        name: food.name,
        category: food.category,
        calories: food.calories || undefined,
        medical_score: food.condition_scores?.ibd?.general_safety || undefined
      })))
    } catch (error) {
      console.error('搜尋食物失敗:', error)
      setSearchResults([])
    }
  }

  const handleCustomFoodCreated = (newFood: any) => {
    setMessage('✅ 自訂食物已建立！')
    setTimeout(() => setMessage(''), 3000)

    // 將新建立的食物設為選中狀態
    setSelectedFood({
      id: newFood.id,
      name: newFood.name,
      category: newFood.category,
      calories: newFood.calories,
      medical_score: newFood.condition_scores?.ibd?.general_safety
    })
    setFoodSearch(newFood.name)
  }

  const handleQuickAddCreated = (newFood: any) => {
    setMessage('✅ 自訂食物已快速建立！')
    setTimeout(() => setMessage(''), 3000)

    // 將新建立的食物設為選中狀態
    setSelectedFood({
      id: newFood.id,
      name: newFood.name,
      category: newFood.category,
      calories: newFood.calories,
      medical_score: newFood.medical_score
    })
    setFoodSearch(newFood.name)
    setSearchResults([]) // 清空搜尋結果
  }

  const handlePopularFoodSelect = (food: any) => {
    setSelectedFood(food)
    setFoodSearch(food.name)
    setSearchResults([])
  }

  const handleAddEntry = async () => {
    if (!selectedFood) {
      setMessage('⚠️ 請選擇食物')
      return
    }

    setIsSubmitting(true)

    try {
      const entryData: FoodEntryInsert = {
        user_id: user?.id, // 可以為空，稍後同步時設置
        food_id: selectedFood.id,
        food_name: selectedFood.name,
        amount: quantity ? parseFloat(quantity) : 100,
        unit: unit,
        meal_type: mealType,
        consumed_at: new Date().toISOString(),
        notes: notes || undefined,
        calories: selectedFood.calories ? (selectedFood.calories * (quantity ? parseFloat(quantity) : 100) / 100) : undefined,
        medical_score: selectedFood.medical_score
      }

      // 使用統一服務新增記錄（離線優先）
      await unifiedFoodEntriesService.addFoodEntry(entryData)

      // 重新載入記錄
      await loadTodayEntries()

      // 重置表單
      setSelectedFood(null)
      setQuantity('')
      setNotes('')
      setFoodSearch('')
      setSearchResults([])

      // 顯示成功訊息
      const syncMsg = user ? '✅ 食物記錄已新增！(正在同步...)' : '✅ 食物記錄已新增！(離線模式)'
      setMessage(syncMsg)

      // 更新同步狀態
      updateSyncStatus()

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
    if (score >= 4) return 'bg-green-100 text-green-800'
    if (score >= 3) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getMedicalScoreText = (score?: number) => {
    if (!score) return '未評分'
    if (score >= 4) return '推薦'
    if (score >= 3) return '適中'
    return '謹慎'
  }

  // 獲取完整的醫療評分資訊
  const getMedicalScoreInfo = (conditionScores: any) => {
    if (!conditionScores) return null

    const ibdScore = conditionScores.ibd?.general_safety
    const ibsScore = conditionScores.ibs?.general_safety
    const allergyScore = conditionScores.allergies?.allergen_free_confidence
    const chemoScore = conditionScores.cancer_chemo?.general_safety

    return {
      ibd: ibdScore,
      ibs: ibsScore,
      allergy: allergyScore,
      chemo: chemoScore,
      overall: ibdScore || ibsScore || allergyScore || chemoScore
    }
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

  // 離線模式提示 - 允許在未登入狀態下使用
  const renderOfflineMessage = () => {
    if (!isAuthenticated && syncStatus) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600">📱</span>
            <div>
              <h3 className="font-medium text-yellow-800">離線模式</h3>
              <p className="text-sm text-yellow-700">
                您可以新增食物記錄，資料會保存在本地。登入後可同步到雲端。
              </p>
              <Link
                href="/settings"
                className="text-sm text-yellow-800 underline hover:text-yellow-900"
              >
                點此登入以啟用雲端同步
              </Link>
            </div>
          </div>
        </div>
      )
    }
    return null
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
        {/* 離線模式提示 */}
        {renderOfflineMessage()}

        {/* 同步狀態顯示 */}
        {syncStatus && isAuthenticated && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`text-lg ${syncStatus.isOnline ? '🌐' : '📱'}`}>
                  {syncStatus.isOnline ? '🌐' : '📱'}
                </span>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {syncStatus.isOnline ? '在線模式' : '離線模式'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {syncStatus.unsyncedEntries > 0
                      ? `${syncStatus.unsyncedEntries} 個記錄待同步`
                      : '所有記錄已同步'
                    }
                    {syncStatus.syncInProgress && ' | 同步中...'}
                  </p>
                </div>
              </div>
              {syncStatus.unsyncedEntries > 0 && !syncStatus.syncInProgress && (
                <button
                  onClick={syncEntries}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg"
                >
                  立即同步
                </button>
              )}
            </div>
          </div>
        )}

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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">搜尋食物</label>
                  <button
                    onClick={() => setShowCustomFoodModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    ➕ 新增自訂食物
                  </button>
                </div>

                {/* 分類篩選 */}
                {searchCategories.length > 0 && (
                  <div className="mb-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">所有分類</option>
                      {searchCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    value={foodSearch}
                    onChange={(e) => setFoodSearch(e.target.value)}
                    placeholder="輸入食物名稱..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {foodSearch.length > 0 && (
                    <button
                      onClick={() => {
                        setFoodSearch('')
                        setSearchResults([])
                        setSelectedFood(null)
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

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
                              IBD {food.medical_score}/5
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 沒有搜尋結果時的選項 */}
                {foodSearch.length > 1 && searchResults.length === 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-2">找不到「{foodSearch}」，您可以：</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowQuickAddModal(true)}
                        className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-left flex items-center space-x-2"
                      >
                        <span>➕</span>
                        <span>快速新增自訂食物「{foodSearch}」</span>
                      </button>
                      <button
                        onClick={() => {
                          const customFood = {
                            id: `custom_${Date.now()}`,
                            name: foodSearch,
                            category: '自訂食物',
                            calories: undefined,
                            medical_score: undefined
                          }
                          setSelectedFood(customFood)
                          setSearchResults([])
                        }}
                        className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-left flex items-center space-x-2"
                      >
                        <span>⚡</span>
                        <span>臨時使用「{foodSearch}」（不儲存）</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 快速選擇常見食物 - 幫助測試 */}
                {searchCategories.length === 0 && foodSearch.length === 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-2">💡 快速選擇常見食物：</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['牛肉麵', '珍珠奶茶', '蚵仔煎', '鳳梨酥'].map(foodName => (
                        <button
                          key={foodName}
                          onClick={() => setFoodSearch(foodName)}
                          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-left"
                        >
                          {foodName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 選中的食物 */}
              {selectedFood && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-blue-900">{selectedFood.name}</p>
                        {selectedFood.id.startsWith('custom_') && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                            自訂
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-blue-700">{selectedFood.category}</p>
                      {selectedFood.id.startsWith('custom_') && (
                        <p className="text-xs text-orange-600 mt-1">
                          💡 此為自訂食物，提交後可由管理員或AI評估醫療建議
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedFood(null)}
                      className="text-blue-500 hover:text-blue-700 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* 份量和單位 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">份量 (可選，默認100g)</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100 (可選)"
                    min="1"
                    step="1"
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
                disabled={!selectedFood || isSubmitting}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-medium"
              >
                {isSubmitting ? '新增中...' : '➕ 新增記錄'}
              </button>
            </div>

            {/* 常用食物 */}
            {user && (
              <PopularFoods
                userId={user.id}
                onFoodSelect={handlePopularFoodSelect}
                className="mt-6"
              />
            )}
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
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4 relative">
                    {/* 同步狀態指示 */}
                    {!entry.synced && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                          {entry.sync_attempts > 0 ? '同步中' : '待同步'}
                        </span>
                      </div>
                    )}

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
                      <span>📏 {entry.amount}{entry.unit}</span>
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
                          IBD評分：{entry.medical_score}/5
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

      {/* 自訂食物模態框 */}
      {user && (
        <CustomFoodModal
          isOpen={showCustomFoodModal}
          onClose={() => setShowCustomFoodModal(false)}
          onFoodCreated={handleCustomFoodCreated}
          userId={user.id}
        />
      )}

      {/* 快速新增自訂食物模態框 */}
      <QuickAddCustomFood
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onFoodCreated={handleQuickAddCreated}
        userId={user?.id}
        prefilledName={foodSearch}
      />
    </div>
  )
}