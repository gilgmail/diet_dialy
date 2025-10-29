'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { foodsService } from '@/lib/supabase/foods'
import FilteredAIAnalysis from '@/components/ai/FilteredAIAnalysis'
import { summarizeMultiConditionAnalysis } from '@/lib/ai/analysis-summary'
import type { Food } from '@/types/supabase'
import type { MultiConditionResult } from '@/lib/ai/multi-condition-scorer'
import type { FilteredAnalysisResult } from '@/lib/medical-access-control'
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
  const [selectedFoodForDetail, setSelectedFoodForDetail] = useState<Food | null>(null)

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
      // First try to get the actual IBD score from the food data
      if (food.ibd_score !== null && food.ibd_score !== undefined) {
        return food.ibd_score
      }

      // Fallback to medical_scores if available
      const scores = food.medical_scores as any
      if (scores && typeof scores === 'object') {
        return scores.ibd_score || 3 // 預設中等風險
      }
      return 3
    } catch {
      return 3
    }
  }

  interface AIAnalysisDisplay {
    highlights: string[]
    risks: string[]
    hasData: boolean
    multiCondition?: MultiConditionResult | null
  }

  const getAIAnalysisDisplay = (food: Food): AIAnalysisDisplay => {
    try {
      // Try to get AI analysis data from different possible sources
      const aiAnalysis = food.ai_analysis as any
      const medicalScores = food.medical_scores as any

      const highlights = new Set<string>()
      const risks = new Set<string>()

      const possibleMultiConditionSources = [
        aiAnalysis?.multi_condition_analysis,
        aiAnalysis?.multiConditionAnalysis,
        aiAnalysis?.detailed_reasoning?.multi_condition_analysis,
        aiAnalysis?.multi_condition_analysis?.multi_condition_analysis,
        aiAnalysis
      ]

      let multiCondition: MultiConditionResult | null = null
      for (const candidate of possibleMultiConditionSources) {
        if (
          candidate &&
          typeof candidate === 'object' &&
          Array.isArray((candidate as MultiConditionResult).conditions)
        ) {
          multiCondition = candidate as MultiConditionResult
          break
        }
      }

      // Check if we have AI analysis data with nutritional highlights and risk factors
      if (aiAnalysis && typeof aiAnalysis === 'object') {
        if (Array.isArray(aiAnalysis.nutritional_highlights)) {
          aiAnalysis.nutritional_highlights.forEach((item: string) => highlights.add(item))
        }
        if (Array.isArray(aiAnalysis.risk_factors)) {
          aiAnalysis.risk_factors.forEach((item: string) => risks.add(item))
        }
        if (Array.isArray(aiAnalysis?.detailed_reasoning?.nutritional_strengths)) {
          aiAnalysis.detailed_reasoning.nutritional_strengths.forEach((item: string) => highlights.add(item))
        }
        if (Array.isArray(aiAnalysis?.detailed_reasoning?.potential_risks)) {
          aiAnalysis.detailed_reasoning.potential_risks.forEach((item: string) => risks.add(item))
        }
      }

      if (multiCondition) {
        const summary = summarizeMultiConditionAnalysis(multiCondition)
        summary.highlights.forEach(item => highlights.add(item))
        summary.risks.forEach(item => risks.add(item))
      }

      // Fallback: Generate basic analysis from medical scores if no AI analysis
      if (highlights.size === 0 && risks.size === 0 && medicalScores && typeof medicalScores === 'object') {
        const ibdScore = medicalScores.ibd_score || 3
        const chenoSafety = medicalScores.chemo_safety || 'caution'
        const fodmapLevel = medicalScores.fodmap_level || 'medium'

        // Generate highlights based on positive scores
        if (ibdScore === 1) highlights.add('IBD友善食物')
        if (chenoSafety === 'safe') highlights.add('化療期安全')
        if (fodmapLevel === 'low') highlights.add('低FODMAP食物')

        // Generate risks based on negative scores
        if (ibdScore === 4) risks.add('IBD高風險')
        if (chenoSafety === 'avoid') risks.add('化療期應避免')
        if (fodmapLevel === 'high') risks.add('高FODMAP成分')
      }

      return {
        highlights: Array.from(highlights),
        risks: Array.from(risks),
        hasData: highlights.size > 0 || risks.size > 0 || !!multiCondition,
        multiCondition
      }
    } catch {
      return { highlights: [], risks: [], hasData: false, multiCondition: null }
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

  // 詳細 AI 分析彈窗組件
  const FoodDetailModal = () => {
    if (!selectedFoodForDetail) return null

    const analysis = getAIAnalysisDisplay(selectedFoodForDetail)
    const score = getMedicalScore(selectedFoodForDetail)
    const normalizedScore = Math.max(1, Math.min(5, Math.round(score))) as 1 | 2 | 3 | 4 | 5
    const multiConditionResult = analysis.multiCondition ?? null
    const filteredAnalysisResult: FilteredAnalysisResult | null = multiConditionResult ? {
      success: multiConditionResult.success !== false,
      food_name: multiConditionResult.food_name || selectedFoodForDetail.name,
      overall_score: multiConditionResult.overall_score ?? normalizedScore,
      visible_conditions: multiConditionResult.conditions || [],
      allergen_analysis: multiConditionResult.allergen_analysis,
      general_analysis: multiConditionResult.general_analysis,
      access_level: 'basic'
    } : null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedFoodForDetail.name}</h2>
              {selectedFoodForDetail.name_en && (
                <p className="text-sm text-gray-600">{selectedFoodForDetail.name_en}</p>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {selectedFoodForDetail.category}
                </span>
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  score >= 4 ? 'bg-green-100 text-green-800' :
                  score >= 3 ? 'bg-blue-100 text-blue-800' :
                  score >= 2 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  IBD評分: {score}/5
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedFoodForDetail(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">關閉</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-6">
            {/* AI Analysis Summary */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                <span className="mr-2">🤖</span>
                AI 推理分析
              </h3>

              {analysis.hasData ? (
                <div className="space-y-4">
                  {/* Nutritional Highlights */}
                  {analysis.highlights.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2 flex items-center">
                        <span className="mr-1">🌟</span>
                        營養亮點
                      </h4>
                      <div className="space-y-1">
                        {analysis.highlights.map((highlight, index) => (
                          <div key={index} className="text-sm text-green-700">
                            • {highlight}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Factors */}
                  {analysis.risks.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-medium text-red-800 mb-2 flex items-center">
                        <span className="mr-1">🚨</span>
                        風險因素
                      </h4>
                      <div className="space-y-1">
                        {analysis.risks.map((risk, index) => (
                          <div key={index} className="text-sm text-red-700">
                            • {risk}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredAnalysisResult && (
                    <div className="pt-2">
                      <FilteredAIAnalysis
                        result={filteredAnalysisResult}
                        showPermissionInfo={false}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-gray-600">此食物尚未進行 AI 分析</p>
                  <p className="text-sm text-gray-500 mt-1">評分基於基礎醫療數據</p>
                </div>
              )}
            </div>

            {/* Additional Information */}
            {selectedFoodForDetail.verification_notes && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">備註資訊</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">{selectedFoodForDetail.verification_notes}</p>
                </div>
              </div>
            )}

            {/* Food Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">食物詳細資料</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">分類:</span>
                    <span className="text-sm text-gray-900 ml-2">{selectedFoodForDetail.category}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">IBD評分:</span>
                    <span className="text-sm text-gray-900 ml-2">{score}/5</span>
                  </div>
                </div>
                {selectedFoodForDetail.brand && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">品牌:</span>
                    <span className="text-sm text-gray-900 ml-2">{selectedFoodForDetail.brand}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200">
            <button
              onClick={() => setSelectedFoodForDetail(null)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              關閉
            </button>
          </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    編號
                  </th>
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
                      <span>風險評分</span>
                      <SortIcon field="medical_score" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AI 推理分析
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFoods.map((food, index) => (
                  <tr
                    key={food.id}
                    className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
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
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600">IBD 評分:</span>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          getMedicalScore(food) >= 4 ? 'bg-green-100 text-green-800' :
                          getMedicalScore(food) >= 3 ? 'bg-blue-100 text-blue-800' :
                          getMedicalScore(food) >= 2 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {getMedicalScore(food)}/5
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 cursor-pointer hover:bg-gray-50 rounded p-2 -m-2 transition-colors"
                           onClick={() => setSelectedFoodForDetail(food)}
                           title="點擊查看詳細 AI 分析">
                        {(() => {
                          const analysis = getAIAnalysisDisplay(food)

                          if (!analysis.hasData) {
                            return (
                              <div className="text-gray-500 text-sm">
                                待AI分析
                                <div className="text-xs text-blue-600 mt-1">點擊查看詳細資料</div>
                              </div>
                            )
                          }

                          return (
                            <div className="space-y-1">
                              {analysis.highlights.length > 0 && (
                                <div className="text-xs">
                                  <span className="text-green-600">🌟 營養亮點: </span>
                                  <span className="text-gray-700">
                                    {analysis.highlights.slice(0, 2).join(', ')}
                                    {analysis.highlights.length > 2 && <span className="text-gray-500"> +{analysis.highlights.length - 2}項</span>}
                                  </span>
                                </div>
                              )}
                              {analysis.risks.length > 0 && (
                                <div className="text-xs">
                                  <span className="text-red-600">🚨 風險因素: </span>
                                  <span className="text-gray-700">
                                    {analysis.risks.slice(0, 2).join(', ')}
                                    {analysis.risks.length > 2 && <span className="text-gray-500"> +{analysis.risks.length - 2}項</span>}
                                  </span>
                                </div>
                              )}
                              <div className="text-xs text-blue-600 mt-1">點擊查看完整分析</div>
                            </div>
                          )
                        })()}
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
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{filteredFoods.length}</div>
            <div className="text-sm text-gray-600">顯示食物數量</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">{foods.length}</div>
            <div className="text-sm text-gray-600">總食物數量</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-orange-600">
              {new Set(filteredFoods.map(f => f.category)).size}
            </div>
            <div className="text-sm text-gray-600">分類數量</div>
          </div>
        </div>
      </div>

      {/* 詳細 AI 分析彈窗 */}
      <FoodDetailModal />
    </div>
  )
}
