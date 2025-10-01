'use client'

import { useState, useEffect } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { foodsService } from '@/lib/supabase/foods'
import { MultiConditionScorer } from '@/lib/ai/multi-condition-scorer'
import FilteredAIAnalysis from '@/components/ai/FilteredAIAnalysis'
import AdminAIAnalysis from '@/components/ai/AdminAIAnalysis'
import type { Food, FoodInsert, FoodUpdate } from '@/types/supabase'
import type { MultiConditionResult } from '@/lib/ai/multi-condition-scorer'
import Link from 'next/link'
import {
  Database,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  AlertCircle,
  Save,
  X,
  RefreshCw,
  Download,
  Upload,
  User,
  MapPin,
  Star
} from 'lucide-react'

type SortField = 'name' | 'category' | 'verification_status' | 'created_at'
type SortDirection = 'asc' | 'desc'

interface EditingFood extends Partial<Food> {
  isNew?: boolean
}

export default function FoodDatabasePage() {
  const { user, userProfile, isLoading: authLoading, isAuthenticated } = useSupabaseAuth()

  // State for foods data
  const [allFoods, setAllFoods] = useState<Food[]>([])
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State for filtering and searching
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // State for editing
  const [editingFood, setEditingFood] = useState<EditingFood | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showNewFoodForm, setShowNewFoodForm] = useState(false)
  const [operationLoading, setOperationLoading] = useState<string | null>(null)
  const [selectedFoodForScoring, setSelectedFoodForScoring] = useState<Food | null>(null)
  const [aiAnalysisResult, setAiAnalysisResult] = useState<MultiConditionResult | null>(null)
  const [dbStats, setDbStats] = useState<{
    total: number
    approved: number
    pending: number
    custom: number
    rejected: number
    taiwan: number
  } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  // AI 評分相關狀態
  const [isAIScoring, setIsAIScoring] = useState(false)

  // For admin page, we don't need medical access control
  const isAdmin = userProfile?.is_admin || false
  const userIsAdmin = isAdmin

  // Load all foods using enhanced Supabase integration
  useEffect(() => {
    const loadAllFoods = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Use the new getAllFoods method for better performance
        const allFoodsData = await foodsService.getAllFoods()
        setAllFoods(allFoodsData)
        setFilteredFoods(allFoodsData)

        // Load categories and stats in parallel
        const [foodCategories, stats] = await Promise.all([
          foodsService.getFoodCategories(),
          foodsService.getFoodsStats()
        ])

        setCategories(foodCategories)
        setDbStats(stats)
        console.log('📊 食物資料庫統計:', stats)
      } catch (error) {
        console.error('載入食物失敗:', error)
        setError('載入食物資料失敗，請稍後重試')
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated && isAdmin) {
      loadAllFoods()
    }
  }, [isAuthenticated, isAdmin])

  // Filter, search, and sort combined
  useEffect(() => {
    let filtered = allFoods

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(food => food.category === selectedCategory)
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(food => food.verification_status === selectedStatus)
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter(food =>
        food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (food.name_en && food.name_en.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (food.brand && food.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (food.verification_notes && food.verification_notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'category':
          aValue = a.category.toLowerCase()
          bValue = b.category.toLowerCase()
          break
        case 'verification_status':
          aValue = a.verification_status
          bValue = b.verification_status
          break
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredFoods(sorted)
  }, [allFoods, selectedCategory, selectedStatus, searchTerm, sortField, sortDirection])

  // 計算分頁資料
  const totalPages = Math.ceil(filteredFoods.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageFoods = filteredFoods.slice(startIndex, endIndex)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleEdit = (food: Food) => {
    setEditingFood({ ...food })
  }

  const handleSave = async () => {
    if (!editingFood) return

    try {
      setOperationLoading('save')

      if (editingFood.isNew) {
        // Create new food
        const newFood: FoodInsert = {
          name: editingFood.name!,
          name_en: editingFood.name_en,
          category: editingFood.category!,
          brand: editingFood.brand,
          calories: editingFood.calories,
          protein: editingFood.protein,
          fat: editingFood.fat,
          fiber: editingFood.fiber,
          sugar: editingFood.sugar,
          sodium: editingFood.sodium,
          verification_status: editingFood.verification_status || 'pending',
          verification_notes: editingFood.verification_notes,
          created_by: user?.id,
          is_custom: editingFood.is_custom || false
        }

        const created = await foodsService.createFood(newFood)
        if (created) {
          setAllFoods(prev => [created, ...prev])
        }
      } else {
        // Update existing food
        const updates: FoodUpdate = {
          name: editingFood.name,
          name_en: editingFood.name_en,
          category: editingFood.category,
          brand: editingFood.brand,
          calories: editingFood.calories,
          protein: editingFood.protein,
          fat: editingFood.fat,
          fiber: editingFood.fiber,
          sugar: editingFood.sugar,
          sodium: editingFood.sodium,
          verification_status: editingFood.verification_status,
          verification_notes: editingFood.verification_notes,
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        }

        const updated = await foodsService.updateFood(editingFood.id!, updates)
        if (updated) {
          setAllFoods(prev => prev.map(f => f.id === updated.id ? updated : f))
        }
      }

      setEditingFood(null)
      setShowNewFoodForm(false)
    } catch (error) {
      console.error('儲存失敗:', error)
      setError('儲存失敗，請稍後重試')
    } finally {
      setOperationLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setOperationLoading('delete')

      // 所有食物都使用硬刪除（完全移除）
      await foodsService.deleteFood(id, user?.id!)

      setAllFoods(prev => prev.filter(f => f.id !== id))
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('刪除失敗:', error)
      setError('刪除失敗，請稍後重試')
    } finally {
      setOperationLoading(null)
    }
  }


  // 增強版 AI 評分處理函數 - 支援多種醫療狀況
  const handleAIScoring = async (food: Food) => {
    try {
      setIsAIScoring(true)
      setAiAnalysisResult(null)

      // 構建食物資料
      const foodData = {
        name: food.name,
        category: food.category,
        calories: food.calories || undefined,
        protein: food.protein || undefined,
        carbohydrates: food.carbohydrates || undefined,
        fat: food.fat || undefined,
        fiber: food.fiber || undefined,
        sodium: food.sodium || undefined,
        sugar: food.sugar || undefined,
        brand: food.brand || undefined,
        ingredients: undefined, // TODO: 從食物描述或其他欄位提取
        preparation: undefined  // TODO: 從食物描述或其他欄位提取
      }

      console.log('🤖 開始多條件 AI 評分:', foodData)

      // 使用新的多條件 API
      const apiResponse = await fetch('/api/ai/multi-condition-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodName: food.name,
          category: food.category,
          nutrition: {
            calories: food.calories,
            protein: food.protein,
            carbohydrates: food.carbohydrates,
            fat: food.fat,
            fiber: food.fiber,
            sodium: food.sodium,
            sugar: food.sugar
          },
          brand: food.brand,
          ingredients: undefined, // TODO: 從食物描述或其他欄位提取
          preparation: undefined, // TODO: 從食物描述或其他欄位提取
          fullAnalysis: isAdmin // 管理員獲得完整分析
        })
      })

      if (!apiResponse.ok) {
        throw new Error(`多條件 API 請求失敗: ${apiResponse.status}`)
      }

      const analysisResult = await apiResponse.json()

      if (!analysisResult.success) {
        throw new Error(analysisResult.error || '多條件 AI 評分失敗')
      }

      console.log('✅ 多條件 AI 評分完成:', analysisResult)
      setAiAnalysisResult(analysisResult)

      if (analysisResult.success) {
        // 更新資料庫 - 保存完整的多條件分析結果
        const saveResponse = await fetch('/api/foods/save-demo-food', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: food.name,
            foodName: food.name,
            category: food.category,
            nutrition: {
              calories: food.calories,
              protein: food.protein,
              carbohydrates: food.carbohydrates,
              fat: food.fat,
              fiber: food.fiber,
              sodium: food.sodium,
              sugar: food.sugar
            },
            brand: food.brand,
            // 保存多條件分析結果到現有的 IBD 欄位（向後相容）
            ibd_score: analysisResult.overall_score,
            ibd_reasoning: analysisResult.general_analysis.reasoning,
            ibd_recommendations: analysisResult.general_analysis.recommendations,
            ibd_confidence: analysisResult.general_analysis.confidence,
            ibd_warning: null,
            ibd_scored_at: analysisResult.timestamp,
            ibd_scorer_version: 'v3.0-multi-condition-ai',
            // 擴展分析結果
            multi_condition_analysis: {
              overall_score: analysisResult.overall_score,
              conditions: analysisResult.conditions,
              allergen_analysis: analysisResult.allergen_analysis,
              general_analysis: analysisResult.general_analysis,
              timestamp: analysisResult.timestamp
            },
            scoring_method: analysisResult.general_analysis.method
          })
        })

        const saveResult = await saveResponse.json()

        if (saveResult.success) {
          // 更新本地狀態
          const updatedFood = {
            ...food,
            ibd_score: analysisResult.overall_score,
            ibd_reasoning: analysisResult.general_analysis.reasoning,
            ibd_recommendations: analysisResult.general_analysis.recommendations,
            ibd_confidence: analysisResult.general_analysis.confidence,
            ibd_scored_at: analysisResult.timestamp,
            ibd_scorer_version: 'v3.0-multi-condition-ai',
            ai_analysis: {
              multi_condition_analysis: analysisResult,
              scoring_method: analysisResult.general_analysis.method
            }
          }

          setAllFoods(prev => prev.map(f => f.id === food.id ? updatedFood : f))
          setSelectedFoodForScoring(updatedFood)

          const confidencePercent = (analysisResult.general_analysis.confidence * 100).toFixed(0)
          alert(`✅ 多條件 AI 評分完成！\n\n食物：${food.name}\n整體評分：${analysisResult.overall_score}/5\n信心度：${confidencePercent}%\n涵蓋條件：${analysisResult.conditions.length} 個\n評分已保存到資料庫`)
        } else {
          throw new Error(saveResult.error || '保存失敗')
        }
      } else {
        throw new Error('多條件 AI 評分失敗')
      }

    } catch (error) {
      console.error('多條件 AI 評分失敗:', error)
      alert(`❌ 多條件 AI 評分失敗：${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setIsAIScoring(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return '已驗證'
      case 'rejected': return '已拒絕'
      case 'pending': return '待審核'
      default: return '未知'
    }
  }

  // Auth checks
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h1>
          <p className="text-gray-600 mb-6">您需要管理員權限才能訪問食物資料庫管理</p>
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            返回管理後台
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入食物資料庫中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">載入失敗</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <Database className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">食物資料庫管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                共 {filteredFoods.length}/{allFoods.length} 項食物
              </div>
              <button
                onClick={() => {
                  setEditingFood({
                    isNew: true,
                    name: '',
                    category: '',
                    verification_status: 'pending'
                  })
                  setShowNewFoodForm(true)
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                新增食物
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Supabase Database Stats */}
        {dbStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Database className="w-8 h-8 text-blue-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">總計</p>
                  <p className="text-2xl font-bold text-gray-900">{dbStats.total}</p>
                  <p className="text-xs text-gray-400">已驗證: {dbStats.approved}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">待審核</p>
                  <p className="text-2xl font-bold text-gray-900">{dbStats.pending}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <User className="w-8 h-8 text-purple-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">自訂</p>
                  <p className="text-2xl font-bold text-gray-900">{dbStats.custom}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">已拒絕</p>
                  <p className="text-2xl font-bold text-gray-900">{dbStats.rejected}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <MapPin className="w-8 h-8 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">台灣食物</p>
                  <p className="text-2xl font-bold text-gray-900">{dbStats.taiwan}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI 推理分析系統入口 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">AI 推理分析系統</h3>
                <p className="text-sm text-gray-600">使用增強版 AI 進行專業營養分析和 IBD 適用性評估</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/admin/ibd-scoring"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors space-x-2"
              >
                <span>🔬</span>
                <span>AI 評分測試</span>
              </Link>
              <button
                onClick={() => window.open('/admin/ibd-scoring', '_blank')}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors space-x-2"
              >
                <span>📊</span>
                <span>IBD 評分管理</span>
              </button>
            </div>
          </div>

          {/* AI 分析統計 */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-600">AI 已評分食物</div>
              <div className="text-lg font-bold text-blue-600">
                {allFoods.filter(food => food.ibd_score !== null && food.ibd_score !== undefined).length}
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-600">高評分食物 (4-5分)</div>
              <div className="text-lg font-bold text-green-600">
                {allFoods.filter(food => food.ibd_score && food.ibd_score >= 4).length}
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="text-sm text-gray-600">需注意食物 (1-2分)</div>
              <div className="text-lg font-bold text-red-600">
                {allFoods.filter(food => food.ibd_score && food.ibd_score <= 2).length}
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜尋食物名稱、品牌..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有分類</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">所有狀態</option>
              <option value="admin_approved">已驗證</option>
              <option value="pending">待審核</option>
              <option value="rejected">已拒絕</option>
            </select>

            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
                setSelectedStatus('all')
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              清除篩選
            </button>

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重新載入
            </button>
          </div>
        </div>

        {/* Foods Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    編號
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 flex items-center space-x-1"
                    onClick={() => handleSort('name')}
                  >
                    <span>食物名稱</span>
                    {sortField === 'name' && (
                      <span className="text-blue-500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>分類</span>
                      {sortField === 'category' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI 推理分析
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('verification_status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>驗證狀態</span>
                      {sortField === 'verification_status' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>建立時間</span>
                      {sortField === 'created_at' && (
                        <span className="text-blue-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentPageFoods.map((food, index) => {
                  const displayIndex = startIndex + index + 1
                  return (
                      <tr key={food.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          #{displayIndex}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">{food.name}</div>
                            {food.name_en && <div className="text-xs text-gray-500">{food.name_en}</div>}
                            {food.brand && <div className="text-xs text-blue-600">{food.brand}</div>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {food.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {food.ibd_score !== null && food.ibd_score !== undefined ? (
                            <div className="space-y-2">
                              {/* IBD 評分顯示 */}
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-600">IBD 評分:</span>
                                <span className={`text-xs px-2 py-1 rounded font-medium ${
                                  food.ibd_score >= 4 ? 'bg-green-100 text-green-800' :
                                  food.ibd_score >= 3 ? 'bg-blue-100 text-blue-800' :
                                  food.ibd_score >= 2 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {food.ibd_score}/5
                                </span>
                              </div>

                              {/* 信心度顯示 */}
                              {food.ibd_confidence && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-600">信心度:</span>
                                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                    {(food.ibd_confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}

                              {/* AI 分析資料預覽 */}
                              {food.ai_analysis && typeof food.ai_analysis === 'object' && food.ai_analysis !== null && (
                                <div className="text-xs text-gray-500">
                                  {(food.ai_analysis as any).nutritional_highlights?.length > 0 && (
                                    <div>🌟 營養亮點: {(food.ai_analysis as any).nutritional_highlights.length} 項</div>
                                  )}
                                  {(food.ai_analysis as any).risk_factors?.length > 0 && (
                                    <div>🚨 風險因素: {(food.ai_analysis as any).risk_factors.length} 項</div>
                                  )}
                                </div>
                              )}

                              {/* 評分版本 */}
                              {food.ibd_scorer_version && (
                                <div className="text-xs text-gray-400">
                                  {food.ibd_scorer_version.includes('enhanced') ? '增強版 AI' : '基礎 AI'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => setSelectedFoodForScoring(food)}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              設定 AI 評分
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(food.verification_status)}
                            <span className="text-sm text-gray-900">
                              {getStatusText(food.verification_status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(food.created_at).toLocaleDateString('zh-TW')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setSelectedFoodForScoring(food)}
                              className="text-green-600 hover:text-green-900"
                              title="AI 推理分析"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(food)}
                              className="text-blue-600 hover:text-blue-900"
                              title="編輯"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(food.id)}
                              className="text-red-600 hover:text-red-900"
                              title="刪除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                })}
              </tbody>
            </table>
          </div>

          {filteredFoods.length === 0 && (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">找不到符合條件的食物</h3>
              <p className="text-gray-600">請嘗試調整搜尋條件或篩選器</p>
            </div>
          )}

          {/* Pagination */}
          {filteredFoods.length > 0 && totalPages > 1 && (
            <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-gray-700">
                  顯示第 {startIndex + 1} 到 {Math.min(endIndex, filteredFoods.length)} 項，共 {filteredFoods.length} 項
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一頁
                  </button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 7) {
                        pageNum = i + 1
                      } else if (currentPage <= 4) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 3) {
                        pageNum = totalPages - 6 + i
                      } else {
                        pageNum = currentPage - 3 + i
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm border rounded-md ${
                            currentPage === pageNum
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{filteredFoods.length}</div>
            <div className="text-sm text-gray-600">顯示食物數量</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">
              {allFoods.filter(f => f.verification_status === 'approved' || f.verification_status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600">已驗證食物</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {allFoods.filter(f => f.verification_status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">待審核食物</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-orange-600">
              {categories.length}
            </div>
            <div className="text-sm text-gray-600">分類數量</div>
          </div>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {editingFood && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingFood.isNew ? '新增食物' : '編輯食物'}
              </h2>
              <button
                onClick={() => {
                  setEditingFood(null)
                  setShowNewFoodForm(false)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    食物名稱 *
                  </label>
                  <input
                    type="text"
                    value={editingFood.name || ''}
                    onChange={(e) => setEditingFood(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    英文名稱
                  </label>
                  <input
                    type="text"
                    value={editingFood.name_en || ''}
                    onChange={(e) => setEditingFood(prev => prev ? { ...prev, name_en: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分類 *
                  </label>
                  <select
                    value={editingFood.category || ''}
                    onChange={(e) => setEditingFood(prev => prev ? { ...prev, category: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">選擇分類</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    品牌
                  </label>
                  <input
                    type="text"
                    value={editingFood.brand || ''}
                    onChange={(e) => setEditingFood(prev => prev ? { ...prev, brand: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    熱量 (kcal/100g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingFood.calories || ''}
                    onChange={(e) => setEditingFood(prev => prev ? { ...prev, calories: parseFloat(e.target.value) || undefined } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    蛋白質 (g/100g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingFood.protein || ''}
                    onChange={(e) => setEditingFood(prev => prev ? { ...prev, protein: parseFloat(e.target.value) || undefined } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    驗證狀態
                  </label>
                  <select
                    value={editingFood.verification_status || 'pending'}
                    onChange={(e) => setEditingFood(prev => prev ? { ...prev, verification_status: e.target.value as any } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">待審核</option>
                    <option value="admin_approved">已驗證</option>
                    <option value="rejected">已拒絕</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  驗證備註
                </label>
                <textarea
                  value={editingFood.verification_notes || ''}
                  onChange={(e) => setEditingFood(prev => prev ? { ...prev, verification_notes: e.target.value } : null)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* AI 推理分析區域 - 只對非新增食物顯示 */}
              {!editingFood.isNew && (
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🤖</span>
                    AI 推理分析預覽
                  </h3>

                  {/* 顯示當前食物的 AI 評分 */}
                  {editingFood.ibd_score !== null && editingFood.ibd_score !== undefined ? (
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">IBD 評分:</span>
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            editingFood.ibd_score >= 4 ? 'bg-green-100 text-green-800' :
                            editingFood.ibd_score >= 3 ? 'bg-blue-100 text-blue-800' :
                            editingFood.ibd_score >= 2 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {editingFood.ibd_score}/5
                          </span>
                        </div>
                        {editingFood.ibd_confidence && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">信心度:</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                              {(editingFood.ibd_confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => editingFood.id && handleAIScoring(editingFood as Food)}
                          disabled={isAIScoring || !editingFood.id}
                          className={`flex-1 px-3 py-2 rounded text-sm transition-colors flex items-center justify-center space-x-2 ${
                            isAIScoring || !editingFood.id
                              ? 'bg-gray-400 text-white cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {isAIScoring ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>重新評分中...</span>
                            </>
                          ) : (
                            <>
                              <span>🔄</span>
                              <span>重新 AI 評分</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => window.open(`/admin/ai-scoring-demo?food=${encodeURIComponent(editingFood.name || '')}`, '_blank')}
                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <span>🔬</span>
                          <span>詳細分析</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                      <p className="text-sm text-yellow-800 mb-3">此食物尚未進行 AI 評分</p>
                      <button
                        onClick={() => editingFood.id && handleAIScoring(editingFood as Food)}
                        disabled={isAIScoring || !editingFood.id}
                        className={`w-full px-3 py-2 rounded text-sm transition-colors flex items-center justify-center space-x-2 ${
                          isAIScoring || !editingFood.id
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isAIScoring ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>AI 評分中...</span>
                          </>
                        ) : (
                          <>
                            <span>🤖</span>
                            <span>開始 AI 評分</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 text-center">
                    更改食物資訊後，建議重新進行 AI 評分以獲得最準確的分析結果
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setEditingFood(null)
                    setShowNewFoodForm(false)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={operationLoading === 'save' || !editingFood.name || !editingFood.category}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {operationLoading === 'save' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      儲存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      儲存
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">確認刪除</h3>
              </div>
              <p className="text-gray-600 mb-6">
                您確定要永久刪除這個食物嗎？此操作將完全移除該食物記錄，無法復原。
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={operationLoading === 'delete'}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {operationLoading === 'delete' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      刪除中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      確認刪除
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Food Scoring Modal */}
      {selectedFoodForScoring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">🍽️</span>
                  食物完整資料檢視
                </h2>
                <p className="text-sm text-gray-600 mt-1">{selectedFoodForScoring.name}</p>
              </div>
              <button
                onClick={() => setSelectedFoodForScoring(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 基本食物資料 */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🍽️</span>
                  基本食物資料
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 w-20">中文名稱:</span>
                      <span className="text-sm text-gray-900">{selectedFoodForScoring.name}</span>
                    </div>
                    {selectedFoodForScoring.name_en && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700 w-20">英文名稱:</span>
                        <span className="text-sm text-gray-900">{selectedFoodForScoring.name_en}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 w-20">分類:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {selectedFoodForScoring.category}
                      </span>
                    </div>
                    {selectedFoodForScoring.brand && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700 w-20">品牌:</span>
                        <span className="text-sm text-gray-900">{selectedFoodForScoring.brand}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 w-20">驗證狀態:</span>
                      <div className="flex items-center space-x-1">
                        {selectedFoodForScoring.verification_status === 'approved' && (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700">已驗證</span>
                          </>
                        )}
                        {selectedFoodForScoring.verification_status === 'pending' && (
                          <>
                            <Clock className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm text-yellow-700">待審核</span>
                          </>
                        )}
                        {selectedFoodForScoring.verification_status === 'rejected' && (
                          <>
                            <XCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-700">已拒絕</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 w-20">建立時間:</span>
                      <span className="text-sm text-gray-900">
                        {new Date(selectedFoodForScoring.created_at).toLocaleString('zh-TW')}
                      </span>
                    </div>
                    {selectedFoodForScoring.updated_at && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700 w-20">更新時間:</span>
                        <span className="text-sm text-gray-900">
                          {new Date(selectedFoodForScoring.updated_at).toLocaleString('zh-TW')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 w-20">食物類型:</span>
                      <span className={`text-sm px-2 py-1 rounded ${selectedFoodForScoring.is_custom ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {selectedFoodForScoring.is_custom ? '自訂食物' : '系統食物'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 營養成分資料 */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🥗</span>
                  營養成分 (每100g)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedFoodForScoring.calories && (
                    <div className="bg-white p-3 rounded border text-center">
                      <div className="text-lg font-bold text-red-600">{selectedFoodForScoring.calories}</div>
                      <div className="text-xs text-gray-600">熱量 (kcal)</div>
                    </div>
                  )}
                  {selectedFoodForScoring.protein && (
                    <div className="bg-white p-3 rounded border text-center">
                      <div className="text-lg font-bold text-blue-600">{selectedFoodForScoring.protein}g</div>
                      <div className="text-xs text-gray-600">蛋白質</div>
                    </div>
                  )}
                  {selectedFoodForScoring.carbohydrates && (
                    <div className="bg-white p-3 rounded border text-center">
                      <div className="text-lg font-bold text-yellow-600">{selectedFoodForScoring.carbohydrates}g</div>
                      <div className="text-xs text-gray-600">碳水化合物</div>
                    </div>
                  )}
                  {selectedFoodForScoring.fat && (
                    <div className="bg-white p-3 rounded border text-center">
                      <div className="text-lg font-bold text-purple-600">{selectedFoodForScoring.fat}g</div>
                      <div className="text-xs text-gray-600">脂肪</div>
                    </div>
                  )}
                  {selectedFoodForScoring.fiber && (
                    <div className="bg-white p-3 rounded border text-center">
                      <div className="text-lg font-bold text-green-600">{selectedFoodForScoring.fiber}g</div>
                      <div className="text-xs text-gray-600">膳食纖維</div>
                    </div>
                  )}
                  {selectedFoodForScoring.sodium && (
                    <div className="bg-white p-3 rounded border text-center">
                      <div className="text-lg font-bold text-orange-600">{selectedFoodForScoring.sodium}mg</div>
                      <div className="text-xs text-gray-600">鈉</div>
                    </div>
                  )}
                  {selectedFoodForScoring.sugar && (
                    <div className="bg-white p-3 rounded border text-center">
                      <div className="text-lg font-bold text-pink-600">{selectedFoodForScoring.sugar}g</div>
                      <div className="text-xs text-gray-600">糖</div>
                    </div>
                  )}
                </div>
              </div>


              {/* AI 推理分析系統 - 增強版多條件分析 */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🤖</span>
                  增強版 AI 推理分析系統 - 多醫療條件評估
                </h3>

                {/* 顯示現有 AI 評分 */}
                {selectedFoodForScoring.ibd_score !== null && selectedFoodForScoring.ibd_score !== undefined ? (
                  <div className="space-y-4 mb-4">
                    <div className="bg-white p-4 rounded border">
                      <h4 className="font-medium text-gray-900 mb-3">當前 AI 評分</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">IBD 評分:</span>
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            selectedFoodForScoring.ibd_score >= 4 ? 'bg-green-100 text-green-800' :
                            selectedFoodForScoring.ibd_score >= 3 ? 'bg-blue-100 text-blue-800' :
                            selectedFoodForScoring.ibd_score >= 2 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {selectedFoodForScoring.ibd_score}/5
                          </span>
                        </div>
                        {selectedFoodForScoring.ibd_confidence && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">信心度:</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                              {(selectedFoodForScoring.ibd_confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {selectedFoodForScoring.ibd_scored_at && (
                        <div className="mt-2 text-xs text-gray-500">
                          評分時間: {new Date(selectedFoodForScoring.ibd_scored_at).toLocaleString('zh-TW')}
                          {selectedFoodForScoring.ibd_scorer_version && (
                            <span className="ml-2 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {selectedFoodForScoring.ibd_scorer_version.includes('enhanced') ? '增強版 AI' : '基礎 AI'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 詳細 AI 分析內容 */}
                    {selectedFoodForScoring.ibd_reasoning && Array.isArray(selectedFoodForScoring.ibd_reasoning) && selectedFoodForScoring.ibd_reasoning.length > 0 && (
                      <div className="bg-white p-4 rounded border mt-4">
                        <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                          <span className="mr-2">🧠</span>
                          AI 推理分析
                        </h5>
                        <div className="space-y-2">
                          {(selectedFoodForScoring.ibd_reasoning as string[]).map((reason, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <span className="text-blue-500 mt-1">•</span>
                              <span className="text-sm text-gray-700">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 營養亮點與風險因素 */}
                    {selectedFoodForScoring.ai_analysis && typeof selectedFoodForScoring.ai_analysis === 'object' && selectedFoodForScoring.ai_analysis !== null && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {(selectedFoodForScoring.ai_analysis as any).nutritional_highlights && Array.isArray((selectedFoodForScoring.ai_analysis as any).nutritional_highlights) && (selectedFoodForScoring.ai_analysis as any).nutritional_highlights.length > 0 && (
                          <div className="bg-green-50 p-3 rounded border">
                            <h6 className="font-medium text-green-800 mb-2 flex items-center">
                              <span className="mr-1">🌟</span>
                              營養亮點
                            </h6>
                            <div className="space-y-1">
                              {((selectedFoodForScoring.ai_analysis as any).nutritional_highlights as string[]).map((highlight, index) => (
                                <div key={index} className="text-sm text-green-700">
                                  • {highlight}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {(selectedFoodForScoring.ai_analysis as any).risk_factors && Array.isArray((selectedFoodForScoring.ai_analysis as any).risk_factors) && (selectedFoodForScoring.ai_analysis as any).risk_factors.length > 0 && (
                          <div className="bg-red-50 p-3 rounded border">
                            <h6 className="font-medium text-red-800 mb-2 flex items-center">
                              <span className="mr-1">🚨</span>
                              風險因素
                            </h6>
                            <div className="space-y-1">
                              {((selectedFoodForScoring.ai_analysis as any).risk_factors as string[]).map((risk, index) => (
                                <div key={index} className="text-sm text-red-700">
                                  • {risk}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 專業建議 */}
                    {selectedFoodForScoring.ibd_recommendations && (
                      <div className="bg-blue-50 p-4 rounded border mt-4">
                        <h5 className="font-medium text-blue-900 mb-3 flex items-center">
                          <span className="mr-2">💡</span>
                          專業建議
                        </h5>
                        <div className="text-sm text-blue-800 whitespace-pre-line">
                          {selectedFoodForScoring.ibd_recommendations}
                        </div>
                      </div>
                    )}

                    {/* 特別警示 */}
                    {selectedFoodForScoring.ibd_warning && (
                      <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mt-4">
                        <h5 className="font-medium text-yellow-900 mb-2 flex items-center">
                          <span className="mr-2">⚠️</span>
                          特別警示
                        </h5>
                        <div className="text-sm text-yellow-800">
                          {selectedFoodForScoring.ibd_warning}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded border border-dashed border-gray-300 text-center mb-4">
                    <p className="text-gray-500 text-sm">尚未進行 AI 評分</p>
                  </div>
                )}

                {/* AI 推理操作按鈕 */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleAIScoring(selectedFoodForScoring)}
                    disabled={isAIScoring}
                    className={`flex-1 px-4 py-2 rounded transition-colors flex items-center justify-center space-x-2 ${
                      isAIScoring
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isAIScoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>AI 評分中...</span>
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        <span>{selectedFoodForScoring.ibd_score ? '重新' : '開始'} AI 評分</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => window.open(`/admin/ai-scoring-demo?food=${encodeURIComponent(selectedFoodForScoring.name)}`, '_blank')}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>🔬</span>
                    <span>詳細 AI 分析</span>
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-2 text-center">
                  使用增強版 AI 進行多醫療條件營養分析：IBD、IBS、癌症化療、過敏原評估
                </p>
              </div>

              {/* 顯示最新的多條件 AI 分析結果 */}
              {aiAnalysisResult && (
                <div className="mt-6">
                  {userIsAdmin ? (
                    <AdminAIAnalysis
                      result={aiAnalysisResult}
                      showMetrics={true}
                      className="border border-purple-200 rounded-lg"
                    />
                  ) : (
                    <div className="border border-blue-200 rounded-lg p-4">
                      <h4 className="text-lg font-medium text-blue-800 mb-3">
                        🤖 AI 營養分析結果
                      </h4>
                      <FilteredAIAnalysis
                        result={{
                          success: true,
                          food_name: aiAnalysisResult.food_name,
                          overall_score: aiAnalysisResult.overall_score,
                          visible_conditions: aiAnalysisResult.conditions || [],
                          allergen_analysis: aiAnalysisResult.allergen_analysis,
                          general_analysis: aiAnalysisResult.general_analysis,
                          access_level: 'basic' as const
                        }}
                        showPermissionInfo={true}
                        className=""
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}