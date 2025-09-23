'use client'

import { useState, useEffect } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { foodsService } from '@/lib/supabase/foods'
import type { Food, FoodInsert, FoodUpdate } from '@/types/supabase'
import FoodScoreCard from '@/components/admin/FoodScoreCard'
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

  const isAdmin = userProfile?.is_admin || false

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
          medical_scores: editingFood.medical_scores,
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
          medical_scores: editingFood.medical_scores,
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

      const food = allFoods.find(f => f.id === id)

      // 提供軟刪除和硬刪除選項
      if (food?.is_custom) {
        // 自訂食物可以直接刪除
        await foodsService.deleteFood(id, user?.id!)
      } else {
        // 系統食物使用軟刪除 (標記為rejected)
        await foodsService.softDeleteFood(id, user?.id!, '管理員刪除')
      }

      setAllFoods(prev => prev.filter(f => f.id !== id))
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('刪除失敗:', error)
      setError('刪除失敗，請稍後重試')
    } finally {
      setOperationLoading(null)
    }
  }

  const handleScoreUpdate = async (foodId: string, scores: any, notes: string) => {
    try {
      setOperationLoading('score-update')

      const updatedFood = await foodsService.updateFoodScores(foodId, scores, notes, user?.id!)

      if (updatedFood) {
        // 更新本地狀態
        setAllFoods(prev => prev.map(f => f.id === updatedFood.id ? updatedFood : f))
        setSelectedFoodForScoring(null)
      }
    } catch (error) {
      console.error('更新評分失敗:', error)
      setError('更新評分失敗，請稍後重試')
    } finally {
      setOperationLoading(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'admin_approved':
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
      case 'admin_approved': return '已驗證'
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
                    醫療評分
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
                          {food.condition_scores ? (
                            <div className="space-y-1">
                              {Object.entries(food.condition_scores as any).slice(0, 2).map(([condition, score]: [string, any]) => (
                                <div key={condition} className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-600 capitalize">{condition}:</span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    score?.general_safety >= 4 ? 'bg-green-100 text-green-800' :
                                    score?.general_safety >= 2 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {score?.general_safety !== undefined ? score.general_safety : 'N/A'}
                                  </span>
                                </div>
                              ))}
                              {Object.keys(food.condition_scores).length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{Object.keys(food.condition_scores).length - 2} 更多
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => setSelectedFoodForScoring(food)}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              設定評分
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
                              title="醫療評分"
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
              {allFoods.filter(f => f.verification_status === 'admin_approved').length}
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
                您確定要刪除這個食物嗎？此操作無法復原。
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
              <h2 className="text-lg font-semibold text-gray-900">
                醫療評分系統 - {selectedFoodForScoring.name}
              </h2>
              <button
                onClick={() => setSelectedFoodForScoring(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <FoodScoreCard
                foodId={selectedFoodForScoring.id}
                foodName={selectedFoodForScoring.name}
                currentScores={selectedFoodForScoring.condition_scores}
                currentNotes={selectedFoodForScoring.verification_notes || ''}
                onScoreUpdate={handleScoreUpdate}
                isEditable={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}