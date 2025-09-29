'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { unifiedFoodEntriesService, type UnifiedFoodEntry } from '@/lib/unified-food-entries'
import { foodsService } from '@/lib/supabase/foods'
import { CustomFoodModal } from '@/components/food-diary/CustomFoodModal'
import { QuickAddCustomFood } from '@/components/food-diary/QuickAddCustomFood'
import { EnhancedFoodInput } from '@/components/food-diary/EnhancedFoodInput'
import type { FoodEntryInsert } from '@/types/supabase'

interface FoodSearchResult {
  id: string
  name: string
  category: string
  calories?: number
  medical_score?: number
}

interface SelectedFood {
  id: string
  name: string
  category: string
  amount: number
  unit: string
  notes: string
  customScore?: number
  calories?: number
  medical_score?: number
}

export default function FoodDiaryPage() {
  const { user, isAuthenticated, isLoading } = useSupabaseAuth()

  // 狀態管理
  const [todayEntries, setTodayEntries] = useState<UnifiedFoodEntry[]>([])
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [message, setMessage] = useState('')
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false)
  const [showQuickAddModal, setShowQuickAddModal] = useState(false)
  const [searchCategories, setSearchCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [prefilledFoodName, setPrefilledFoodName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleQuickAddCreated = async (newFood: any) => {
    setMessage('✅ 自訂食物已快速建立！')

    try {
      // 自動建立食物記錄
      const entryData: FoodEntryInsert = {
        user_id: user?.id || '',
        food_id: newFood.original_food_id, // 使用原始食物ID
        food_name: newFood.name,
        amount: 1, // 預設1份
        unit: '份',
        meal_type: mealType,
        consumed_at: new Date().toISOString(),
        calories: newFood.calories,
        is_custom_food: true,
        custom_food_source: 'user_created',
        food_category: newFood.category,
        sync_status: 'pending'
      }

      await unifiedFoodEntriesService.addFoodEntry(entryData)

      setMessage('✅ 自訂食物已建立並自動加入記錄！')

      // 重新載入今日記錄
      loadTodayEntries()

    } catch (error) {
      console.error('自動建立記錄失敗:', error)
      setMessage('✅ 自訂食物已建立，但自動加入記錄失敗')
    }

    setTimeout(() => setMessage(''), 3000)
  }

  // 處理增強輸入組件的食物選擇
  const handleEnhancedFoodSelected = async (food: SelectedFood) => {
    setIsSubmitting(true)
    try {
      const entryData: FoodEntryInsert = {
        user_id: user?.id || '',
        food_id: food.id.startsWith('custom_') ? null : food.id,
        food_name: food.name,
        amount: food.amount,
        unit: food.unit,
        meal_type: mealType,
        consumed_at: new Date().toISOString(),
        notes: food.notes,
        calories: food.calories,
        medical_score: food.customScore || food.medical_score,
        is_custom_food: food.id.startsWith('custom_'),
        custom_food_source: food.id.startsWith('custom_') ? 'user_created' : null,
        food_category: food.category,
        sync_status: 'pending'
      }

      const newEntry = await unifiedFoodEntriesService.addFoodEntry(entryData)

      setMessage('✅ 食物記錄已新增！')
      setTimeout(() => setMessage(''), 3000)

      // 重新載入今日記錄
      loadTodayEntries()

    } catch (error) {
      console.error('新增記錄失敗:', error)
      setMessage('❌ 新增失敗，請重試')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 處理創建自訂食物 (從EnhancedFoodInput傳遞食物名稱)
  const handleCreateCustomFoodFromInput = (foodName: string) => {
    setPrefilledFoodName(foodName) // 保存要預填的食物名稱
    setShowQuickAddModal(true)
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

              {/* 增強版食物輸入 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-lg font-medium text-gray-900">🔍 搜尋或新增食物</label>
                  <button
                    onClick={() => setShowCustomFoodModal(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    ➕ 詳細新增
                  </button>
                </div>

                <EnhancedFoodInput
                  onFoodSelected={handleEnhancedFoodSelected}
                  onCreateCustomFood={handleCreateCustomFoodFromInput}
                  placeholder="輸入食物名稱，支援 Tab 自動完成..."
                  defaultMealType={mealType}
                  categories={searchCategories}
                  userId={user?.id}
                />
              </div>

              {/* 當前餐次顯示 */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">當前餐次:</span>
                  <div className="flex space-x-1">
                    {[
                      { value: 'breakfast', label: '🌅 早餐' },
                      { value: 'lunch', label: '☀️ 午餐' },
                      { value: 'dinner', label: '🌙 晚餐' },
                      { value: 'snack', label: '🍪 點心' }
                    ].map((meal) => (
                      <button
                        key={meal.value}
                        onClick={() => setMealType(meal.value as any)}
                        className={`px-2 py-1 rounded text-xs transition-all ${
                          mealType === meal.value
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {meal.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
        onClose={() => {
          setShowQuickAddModal(false)
          setPrefilledFoodName('') // 清除預填名稱
        }}
        onFoodCreated={handleQuickAddCreated}
        userId={user?.id}
        prefilledName={prefilledFoodName}
      />
    </div>
  )
}