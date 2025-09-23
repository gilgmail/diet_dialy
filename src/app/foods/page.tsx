'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { foodsService } from '@/lib/supabase/foods'
import type { Food } from '@/types/supabase'
import {
  Search,
  Filter,
  Database,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft
} from 'lucide-react'

type SortField = 'name' | 'category' | 'verification_status' | 'medical_score'
type SortDirection = 'asc' | 'desc'

export default function FoodsPage() {
  const [foods, setFoods] = useState<Food[]>([])
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // 載入食物數據
  useEffect(() => {
    const loadFoods = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 載入已驗證的食物
        const approvedFoods = await foodsService.getApprovedFoods()
        setFoods(approvedFoods)
        setFilteredFoods(approvedFoods)

        // 載入分類
        const foodCategories = await foodsService.getFoodCategories()
        setCategories(foodCategories)
      } catch (error) {
        console.error('載入食物失敗:', error)
        setError('載入食物資料失敗，請稍後重試')
      } finally {
        setIsLoading(false)
      }
    }

    loadFoods()
  }, [])

  // 過濾和搜索
  useEffect(() => {
    let filtered = foods

    // 分類篩選
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(food => food.category === selectedCategory)
    }

    // 驗證狀態篩選
    if (selectedVerificationStatus !== 'all') {
      filtered = filtered.filter(food => food.verification_status === selectedVerificationStatus)
    }

    // 搜尋
    if (searchTerm) {
      filtered = filtered.filter(food =>
        food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (food.verification_notes && food.verification_notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredFoods(filtered)
  }, [foods, selectedCategory, selectedVerificationStatus, searchTerm])

  // 排序
  useEffect(() => {
    const sorted = [...filteredFoods].sort((a, b) => {
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
        case 'medical_score':
          // 計算醫療總分
          aValue = getMedicalScore(a)
          bValue = getMedicalScore(b)
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    setFilteredFoods(sorted)
  }, [sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getMedicalScore = (food: Food): number => {
    try {
      const scores = food.medical_scores as any
      if (scores && typeof scores === 'object') {
        return scores.ibd_score || 3 // 預設中等風險
      }
      return 3
    } catch {
      return 3
    }
  }

  const getMedicalAdvice = (food: Food): string => {
    try {
      const scores = food.medical_scores as any
      if (scores && typeof scores === 'object') {
        const ibdScore = scores.ibd_score || 3
        const chenoSafety = scores.chemo_safety || 'caution'
        const fodmapLevel = scores.fodmap_level || 'medium'

        const advice = []

        if (ibdScore === 1) advice.push('IBD友善')
        else if (ibdScore === 4) advice.push('IBD高風險')
        else if (ibdScore === 3) advice.push('IBD中等風險')
        else advice.push('IBD低風險')

        if (chenoSafety === 'safe') advice.push('化療安全')
        else if (chenoSafety === 'avoid') advice.push('化療應避免')
        else advice.push('化療需謹慎')

        if (fodmapLevel === 'low') advice.push('低FODMAP')
        else if (fodmapLevel === 'high') advice.push('高FODMAP')
        else advice.push('中等FODMAP')

        return advice.join(' | ')
      }
      return '待評估'
    } catch {
      return '待評估'
    }
  }

  const getVerificationStatusIcon = (status: string) => {
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

  const getVerificationStatusText = (status: string) => {
    switch (status) {
      case 'approved': return '已驗證'
      case 'rejected': return '已拒絕'
      case 'pending': return '待審核'
      default: return '未知'
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />
    }
    return sortDirection === 'asc' ?
      <ChevronUp className="w-4 h-4 text-blue-600" /> :
      <ChevronDown className="w-4 h-4 text-blue-600" />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入食物資料中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
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
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <Database className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">台灣食物資料庫</h1>
            </div>
            <div className="text-sm text-gray-600">
              共 {filteredFoods.length} 項食物
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 篩選控制區 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 搜尋 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜尋食物名稱或備註..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 分類篩選 */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">所有分類</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            {/* 驗證狀態篩選 */}
            <select
              value={selectedVerificationStatus}
              onChange={(e) => setSelectedVerificationStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">所有狀態</option>
              <option value="approved">已驗證</option>
              <option value="pending">待審核</option>
              <option value="rejected">已拒絕</option>
            </select>

            {/* 清除篩選 */}
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
                setSelectedVerificationStatus('all')
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              清除篩選
            </button>
          </div>
        </div>

        {/* Excel 風格表格 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>食物名稱</span>
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>分類</span>
                      <SortIcon field="category" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('medical_score')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>醫療建議</span>
                      <SortIcon field="medical_score" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('verification_status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>驗證狀態</span>
                      <SortIcon field="verification_status" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    備註 (醫療建議原因)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFoods.map((food, index) => (
                  <tr
                    key={food.id}
                    className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">{food.name}</div>
                        {food.name_en && (
                          <div className="text-xs text-gray-500">{food.name_en}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {food.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {getMedicalAdvice(food)}
                      </div>
                      <div className="text-xs text-gray-500">
                        風險評分: {getMedicalScore(food)}/4
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getVerificationStatusIcon(food.verification_status)}
                        <span className="text-sm text-gray-900">
                          {getVerificationStatusText(food.verification_status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {food.verification_notes || '無備註'}
                      </div>
                    </td>
                  </tr>
                ))}
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
        </div>

        {/* 統計資訊 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{filteredFoods.length}</div>
            <div className="text-sm text-gray-600">顯示食物數量</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">
              {filteredFoods.filter(f => f.verification_status === 'approved').length}
            </div>
            <div className="text-sm text-gray-600">已驗證食物</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredFoods.filter(f => f.verification_status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">待審核食物</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-orange-600">
              {new Set(filteredFoods.map(f => f.category)).size}
            </div>
            <div className="text-sm text-gray-600">分類數量</div>
          </div>
        </div>
      </div>
    </div>
  )
}