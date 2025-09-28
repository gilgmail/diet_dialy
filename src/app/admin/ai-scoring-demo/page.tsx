'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Brain, Play, CheckCircle, AlertTriangle, Clock, Shield, Save, Database } from 'lucide-react'

interface AIScoreResult {
  success: boolean
  score: {
    value: 1 | 2 | 3 | 4 | 5
    level: string
    emoji: string
  }
  analysis: {
    reasoning: string[]
    recommendations: string
    confidence: number
    warning?: string
    nutritional_highlights?: string[]
    risk_factors?: string[]
  }
  method: 'claude_api' | 'fallback'
  timestamp: string
}

export default function AIScoringDemoPage() {
  const searchParams = useSearchParams()
  const [selectedFood, setSelectedFood] = useState('')
  const [customFood, setCustomFood] = useState({
    foodName: '',
    category: '主食',
    nutrition: {
      calories: 100,
      protein: 3,
      carbohydrates: 20,
      fat: 1,
      fiber: 1
    },
    ingredients: '',
    preparation: ''
  })
  const [result, setResult] = useState<AIScoreResult | null>(null)
  const [isScoring, setIsScoring] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentFoodData, setCurrentFoodData] = useState<any>(null)

  // 從 URL 參數讀取食物名稱
  useEffect(() => {
    const foodFromUrl = searchParams.get('food')
    if (foodFromUrl) {
      setCustomFood(prev => ({
        ...prev,
        foodName: foodFromUrl
      }))
      console.log('🔗 從 URL 讀取食物名稱:', foodFromUrl)
    }
  }, [searchParams])

  // 預設測試食物
  const testFoods = [
    {
      name: '白米飯',
      data: {
        foodName: '白米飯',
        category: '主食',
        nutrition: { calories: 130, protein: 2.7, carbohydrates: 28, fat: 0.3, fiber: 0.4 },
        ingredients: '白米',
        preparation: '水煮'
      }
    },
    {
      name: '麻辣火鍋',
      data: {
        foodName: '麻辣火鍋',
        category: '湯品',
        nutrition: { calories: 450, protein: 20, carbohydrates: 15, fat: 35, fiber: 3 },
        ingredients: '辣椒、花椒、牛肉、蔬菜',
        preparation: '麻辣調味煮製'
      }
    },
    {
      name: '燕麥粥',
      data: {
        foodName: '燕麥粥',
        category: '主食',
        nutrition: { calories: 68, protein: 2.4, carbohydrates: 12, fat: 1.4, fiber: 1.7 },
        ingredients: '燕麥片、水',
        preparation: '水煮熬製'
      }
    },
    {
      name: '烤雞胸肉',
      data: {
        foodName: '烤雞胸肉',
        category: '肉類',
        nutrition: { calories: 165, protein: 31, carbohydrates: 0, fat: 3.6, fiber: 0 },
        ingredients: '雞胸肉',
        preparation: '烤製'
      }
    },
    {
      name: '咖哩雞',
      data: {
        foodName: '咖哩雞',
        category: '主菜',
        nutrition: { calories: 250, protein: 22, carbohydrates: 12, fat: 14, fiber: 2 },
        ingredients: '雞肉、咖哩粉、洋蔥、椰奶',
        preparation: '咖哩燉煮'
      }
    }
  ]

  const handleScore = async (foodData: any) => {
    setIsScoring(true)
    setResult(null)
    setCurrentFoodData(foodData) // 保存當前食物數據

    try {
      console.log('🤖 發送 AI 評分請求:', foodData)

      const response = await fetch('/api/ai/nutrition-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(foodData)
      })

      const data = await response.json()
      console.log('✅ AI 評分回應:', data)

      if (data.success) {
        setResult(data)
      } else {
        console.error('❌ AI 評分失敗:', data.error)
        alert('AI 評分失敗: ' + data.error)
      }

    } catch (error) {
      console.error('💥 API 請求失敗:', error)
      alert('API 請求失敗: ' + (error as Error).message)
    } finally {
      setIsScoring(false)
    }
  }

  const handleTestFood = (food: any) => {
    setSelectedFood(food.name)
    handleScore(food.data)
  }

  const handleCustomScore = () => {
    if (!customFood.foodName) {
      alert('請輸入食物名稱')
      return
    }
    setSelectedFood(customFood.foodName)
    handleScore(customFood)
  }

  const handleSaveToDatabase = async () => {
    if (!result || !currentFoodData) {
      alert('沒有評分結果可以保存')
      return
    }

    setIsSaving(true)

    try {
      // 創建食物記錄，包含完整的 AI 推理資料
      const foodRecord = {
        name: currentFoodData.foodName,
        name_en: '', // 可以為空
        category: currentFoodData.category,
        brand: '',
        calories: currentFoodData.nutrition?.calories || null,
        protein: currentFoodData.nutrition?.protein || null,
        carbohydrates: currentFoodData.nutrition?.carbohydrates || null,
        fat: currentFoodData.nutrition?.fat || null,
        fiber: currentFoodData.nutrition?.fiber || null,
        sodium: currentFoodData.nutrition?.sodium || null,
        sugar: currentFoodData.nutrition?.sugar || null,
        preparation: currentFoodData.preparation || '',
        // AI 評分結果 - 基本欄位
        ibd_score: result.score.value,
        ibd_reasoning: result.analysis.reasoning,
        ibd_recommendations: result.analysis.recommendations,
        ibd_confidence: result.analysis.confidence,
        ibd_warning: result.analysis.warning || null,
        ibd_scored_at: result.timestamp,
        ibd_scorer_version: 'v2.0-enhanced-ai-demo',
        // AI 推理詳細欄位
        nutritional_highlights: result.analysis.nutritional_highlights || [],
        risk_factors: result.analysis.risk_factors || [],
        scoring_method: result.method === 'claude_api' ? 'enhanced_ai' : 'fallback_system',
        verification_status: 'pending', // 標記為待審核
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('💾 準備保存食物到資料庫:', foodRecord)

      // 調用 Supabase API 保存
      const response = await fetch('/api/foods/save-demo-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(foodRecord)
      })

      const saveResult = await response.json()

      if (saveResult.success) {
        const confidencePercent = (result.analysis.confidence * 100).toFixed(0)
        const highlights = result.analysis.nutritional_highlights || []
        const risks = result.analysis.risk_factors || []
        const method = result.method === 'claude_api' ? '增強版 AI' : '備用系統'

        alert(`✅ 成功保存到資料庫！\n\n食物：${currentFoodData.foodName}\n評分：${result.score.value}/5 (${result.score.level})\n信心度：${confidencePercent}% AI 評估信心\n評分方式：${method}\n營養亮點：${highlights.length} 項\n風險因素：${risks.length} 項\n專業建議：已保存\n評分推理：${result.analysis.reasoning.length} 項\n資料庫 ID：${saveResult.id}`)
      } else {
        alert(`❌ 保存失敗：${saveResult.error}`)
      }

    } catch (error) {
      console.error('💥 保存失敗:', error)
      alert('保存到資料庫失敗：' + (error as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 標題 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">增強版 AI 評分系統測試</h1>
                <p className="text-gray-600">Claude AI 專業營養師評分 - 開發測試版</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 快速測試食物 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">快速測試食物</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {testFoods.map((food) => (
                <button
                  key={food.name}
                  onClick={() => handleTestFood(food)}
                  disabled={isScoring}
                  className="p-3 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 disabled:opacity-50 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">{food.name}</div>
                  <div className="text-xs text-gray-500">{food.data.category}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 自定義食物評分 */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">自定義食物評分</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">食物名稱</label>
                <input
                  type="text"
                  value={customFood.foodName}
                  onChange={(e) => setCustomFood(prev => ({...prev, foodName: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="例：蒸蛋"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分類</label>
                <select
                  value={customFood.category}
                  onChange={(e) => setCustomFood(prev => ({...prev, category: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="主食">主食</option>
                  <option value="蛋白質">蛋白質</option>
                  <option value="蔬菜">蔬菜</option>
                  <option value="水果">水果</option>
                  <option value="湯品">湯品</option>
                  <option value="零食">零食</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">熱量</label>
                <input
                  type="number"
                  value={customFood.nutrition.calories}
                  onChange={(e) => setCustomFood(prev => ({
                    ...prev,
                    nutrition: {...prev.nutrition, calories: parseInt(e.target.value) || 0}
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">蛋白質 (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={customFood.nutrition.protein}
                  onChange={(e) => setCustomFood(prev => ({
                    ...prev,
                    nutrition: {...prev.nutrition, protein: parseFloat(e.target.value) || 0}
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              onClick={handleCustomScore}
              disabled={isScoring || !customFood.foodName}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <Play className="w-4 h-4 mr-2" />
              {isScoring ? '評分中...' : 'AI 評分'}
            </button>
          </div>
        </div>

        {/* 評分結果 */}
        {result && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  📊 AI 評分結果：{selectedFood}
                </h2>
                <button
                  onClick={handleSaveToDatabase}
                  disabled={isSaving}
                  className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      存入資料庫
                    </>
                  )}
                </button>
              </div>

              {/* 評分概覽 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600">評分</span>
                    <span className="text-2xl font-bold text-blue-700">
                      {result.score.value}/5
                    </span>
                  </div>
                  <div className="text-lg font-medium text-blue-800 mt-1">
                    {result.score.emoji} {result.score.level}
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">信心度</span>
                    <span className="text-2xl font-bold text-green-700">
                      {(result.analysis.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-sm text-green-600 mt-1">AI 評估信心</div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-600">評分方式</span>
                    <Shield className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="text-sm font-medium text-purple-800 mt-1">
                    {result.method === 'claude_api' ? '增強版 AI' : '備用系統'}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">評分時間</span>
                    <Clock className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {new Date(result.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 詳細分析 */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">📝 評分推理</h3>
                  <div className="bg-gray-50 p-3 rounded">
                    {result.analysis.reasoning.map((reason, index) => (
                      <div key={index} className="text-sm text-gray-700 mb-1">
                        • {reason}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">💡 專業建議</h3>
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-sm text-blue-800">{result.analysis.recommendations}</div>
                  </div>
                </div>

                {result.analysis.nutritional_highlights && result.analysis.nutritional_highlights.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">🌟 營養亮點</h3>
                    <div className="bg-green-50 p-3 rounded">
                      {result.analysis.nutritional_highlights.map((highlight, index) => (
                        <div key={index} className="text-sm text-green-800 mb-1">
                          • {highlight}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.analysis.risk_factors && result.analysis.risk_factors.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">🚨 風險因素</h3>
                    <div className="bg-red-50 p-3 rounded">
                      {result.analysis.risk_factors.map((risk, index) => (
                        <div key={index} className="text-sm text-red-800 mb-1">
                          • {risk}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.analysis.warning && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">⚠️ 特別警告</h3>
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                      <div className="text-sm text-yellow-800">{result.analysis.warning}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 載入狀態 */}
        {isScoring && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">AI 正在分析 {selectedFood}...</p>
              <p className="text-sm text-gray-500 mt-1">使用增強版 Claude AI 進行專業營養評估</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}