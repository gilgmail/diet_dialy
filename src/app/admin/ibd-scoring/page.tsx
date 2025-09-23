'use client'

import { useState, useEffect } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { ibdScoringService } from '@/lib/supabase/ibd-scoring-service'
import { foodsService } from '@/lib/supabase/foods'
import { IBDScoreDisplay, IBDScoreBadge } from '@/components/food/IBDScoreDisplay'
import type { Food } from '@/types/supabase'
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  BarChart3,
  RefreshCw,
  Filter,
  Search,
  Play,
  Download
} from 'lucide-react'

interface ScoringStats {
  total_foods: number
  scored_foods: number
  unsuitable_foods: number
  cautious_foods: number
  moderate_foods: number
  recommended_foods: number
  average_score: number
  average_confidence: number
}

export default function IBDScoringAdminPage() {
  const { user, userProfile, isAuthenticated } = useSupabaseAuth()

  // 狀態管理
  const [stats, setStats] = useState<ScoringStats | null>(null)
  const [foods, setFoods] = useState<Food[]>([])
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  // 篩選和搜尋
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [scoreFilter, setScoreFilter] = useState<string>('all') // all, scored, unscored, 0, 1, 2, 3
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)

  // 載入狀態
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingFoods, setIsLoadingFoods] = useState(true)
  const [isBatchScoring, setIsBatchScoring] = useState(false)
  const [message, setMessage] = useState('')

  // 批次操作
  const [selectedFoodIds, setSelectedFoodIds] = useState<string[]>([])

  useEffect(() => {
    if (isAuthenticated && userProfile?.is_admin) {
      loadStats()
      loadCategories()
      loadFoods()
    }
  }, [isAuthenticated, userProfile])

  useEffect(() => {
    loadFoods()
  }, [searchTerm, selectedCategory, scoreFilter, currentPage])

  const loadStats = async () => {
    setIsLoadingStats(true)
    try {
      const data = await ibdScoringService.getIBDScoringStats()
      if (data) {
        setStats(data)
      }
    } catch (error) {
      console.error('載入統計失敗:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const loadCategories = async () => {
    try {
      const data = await foodsService.getFoodCategories()
      setCategories(data)
    } catch (error) {
      console.error('載入分類失敗:', error)
    }
  }

  const loadFoods = async () => {
    setIsLoadingFoods(true)
    try {
      const { data } = await foodsService.getFoodsPaginated(currentPage, pageSize, {
        search: searchTerm,
        category: selectedCategory || undefined,
        verification_status: 'admin_approved'
      })

      // 根據評分篩選
      let filteredFoods = data
      if (scoreFilter === 'scored') {
        filteredFoods = data.filter(food => food.condition_scores?.ibd_score !== null)
      } else if (scoreFilter === 'unscored') {
        filteredFoods = data.filter(food => !food.condition_scores?.ibd_score)
      } else if (['0', '1', '2', '3'].includes(scoreFilter)) {
        const targetScore = parseInt(scoreFilter)
        filteredFoods = data.filter(food => food.condition_scores?.ibd_score === targetScore)
      }

      setFoods(filteredFoods)
    } catch (error) {
      console.error('載入食物失敗:', error)
    } finally {
      setIsLoadingFoods(false)
    }
  }

  const handleBatchScore = async (category?: string) => {
    setIsBatchScoring(true)
    setMessage('')

    try {
      let result
      if (category) {
        result = await ibdScoringService.scoreFoodsByCategory(category)
        setMessage(`分類 "${category}" 批次評分完成：成功 ${result.success} 項，失敗 ${result.failed} 項`)
      } else if (selectedFoodIds.length > 0) {
        result = await ibdScoringService.batchScoreFoods(selectedFoodIds)
        setMessage(`批次評分完成：成功 ${result.success} 項，失敗 ${result.failed} 項`)
        setSelectedFoodIds([])
      }

      if (result) {
        await loadStats()
        await loadFoods()
      }
    } catch (error) {
      console.error('批次評分失敗:', error)
      setMessage('批次評分失敗，請重試')
    } finally {
      setIsBatchScoring(false)
    }
  }

  const handleFoodSelection = (foodId: string, selected: boolean) => {
    if (selected) {
      setSelectedFoodIds(prev => [...prev, foodId])
    } else {
      setSelectedFoodIds(prev => prev.filter(id => id !== foodId))
    }
  }

  const handleSelectAll = () => {
    const unselectedFoods = foods.filter(food => !selectedFoodIds.includes(food.id))
    if (unselectedFoods.length === 0) {
      setSelectedFoodIds([]) // 全部取消選擇
    } else {
      setSelectedFoodIds(foods.map(food => food.id)) // 全部選擇
    }
  }

  // 權限檢查
  if (!isAuthenticated || !userProfile?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h1>
          <p className="text-gray-600">只有管理員可以訪問 IBD 評分管理系統</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 標題 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">IBD 營養師評分系統</h1>
                <p className="text-gray-600">Claude AI 專業營養師評分管理</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => loadStats()}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重新載入
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 統計卡片 */}
        {isLoadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
                <div className="h-8 bg-gray-300 rounded mb-2"></div>
                <div className="h-6 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.scored_foods}</div>
                  <div className="text-sm text-gray-600">已評分 / {stats.total_foods}</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.unsuitable_foods}</div>
                  <div className="text-sm text-gray-600">不合適 (0分)</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.recommended_foods}</div>
                  <div className="text-sm text-gray-600">推薦 (3分)</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.average_score?.toFixed(1) || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">平均評分</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* 操作訊息 */}
        {message && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">{message}</p>
          </div>
        )}

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">評分控制</h2>

            {/* 搜尋和篩選 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">搜尋食物</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="輸入食物名稱..."
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">所有分類</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">評分狀態</label>
                <select
                  value={scoreFilter}
                  onChange={(e) => setScoreFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部</option>
                  <option value="unscored">未評分</option>
                  <option value="scored">已評分</option>
                  <option value="0">不合適 (0分)</option>
                  <option value="1">謹慎 (1分)</option>
                  <option value="2">適中 (2分)</option>
                  <option value="3">推薦 (3分)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => loadFoods()}
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  篩選
                </button>
              </div>
            </div>

            {/* 批次操作 */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleBatchScore(selectedCategory)}
                disabled={isBatchScoring || !selectedCategory}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                <Play className="w-4 h-4 mr-2" />
                {isBatchScoring ? '評分中...' : `評分整個分類`}
              </button>

              <button
                onClick={() => handleBatchScore()}
                disabled={isBatchScoring || selectedFoodIds.length === 0}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <Play className="w-4 h-4 mr-2" />
                {isBatchScoring ? '評分中...' : `評分選定項目 (${selectedFoodIds.length})`}
              </button>

              <button
                onClick={handleSelectAll}
                className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                {selectedFoodIds.length === foods.length ? '取消全選' : '全選'}
              </button>
            </div>
          </div>
        </div>

        {/* 食物列表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 食物清單 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">食物清單</h2>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoadingFoods ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">載入中...</p>
                </div>
              ) : foods.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-600">沒有找到食物</p>
                </div>
              ) : (
                <div className="divide-y">
                  {foods.map((food) => (
                    <div
                      key={food.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        selectedFood?.id === food.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedFood(food)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedFoodIds.includes(food.id)}
                            onChange={(e) => handleFoodSelection(food.id, e.target.checked)}
                            className="mt-1"
                          />
                          <div>
                            <h3 className="font-medium text-gray-900">{food.name}</h3>
                            <p className="text-sm text-gray-600">{food.category}</p>
                          </div>
                        </div>
                        <IBDScoreBadge food={food} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 食物詳情和評分 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">評分詳情</h2>
            </div>

            <div className="p-6">
              {selectedFood ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedFood.name}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><strong>分類:</strong> {selectedFood.category}</div>
                      <div><strong>熱量:</strong> {selectedFood.calories || 'N/A'} kcal</div>
                      <div><strong>蛋白質:</strong> {selectedFood.protein || 'N/A'}g</div>
                      <div><strong>碳水:</strong> {selectedFood.carbohydrates || 'N/A'}g</div>
                    </div>
                  </div>

                  <IBDScoreDisplay
                    food={selectedFood}
                    showDetails={true}
                    allowRescoring={true}
                    onScoreUpdate={(score) => {
                      loadStats()
                      loadFoods()
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">請選擇一個食物查看評分詳情</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}