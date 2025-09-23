'use client'

import { useState, useEffect } from 'react'
import { EnhancedFoodsService, type EnhancedFood, type IBDPatientProfileData } from '@/lib/supabase/enhanced-foods-service'
import { getIBDScoreColor, getIBDScoreText, getIBDPhaseColor, getIBDPhaseText } from '@/lib/supabase/enhanced-foods-service'
import { getIBDFriendlinessText, getIBDRecommendationText } from '@/lib/ai/food-scoring-service'

interface IBDFoodSearchProps {
  userId: string
  onFoodSelect: (food: EnhancedFood) => void
  searchTerm: string
  onSearchChange: (term: string) => void
  className?: string
}

export function IBDFoodSearch({ userId, onFoodSelect, searchTerm, onSearchChange, className = '' }: IBDFoodSearchProps) {
  const [searchResults, setSearchResults] = useState<EnhancedFood[]>([])
  const [recommendedFoods, setRecommendedFoods] = useState<EnhancedFood[]>([])
  const [taiwanFoods, setTaiwanFoods] = useState<EnhancedFood[]>([])
  const [patientProfile, setPatientProfile] = useState<IBDPatientProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'search' | 'recommended' | 'taiwan'>('recommended')
  const [selectedPhase, setSelectedPhase] = useState<'acute' | 'remission'>('remission')

  useEffect(() => {
    loadPatientProfile()
    loadRecommendedFoods()
    loadTaiwanFoods()
  }, [userId])

  useEffect(() => {
    if (searchTerm.length > 1) {
      searchFoods()
      setActiveTab('search')
    } else {
      setSearchResults([])
      if (activeTab === 'search') {
        setActiveTab('recommended')
      }
    }
  }, [searchTerm, selectedPhase])

  const loadPatientProfile = async () => {
    try {
      const profile = await EnhancedFoodsService.getIBDPatientProfile(userId)
      setPatientProfile(profile)
      if (profile?.current_phase) {
        setSelectedPhase(profile.current_phase === 'acute' ? 'acute' : 'remission')
      }
    } catch (error) {
      console.error('載入患者檔案失敗:', error)
    }
  }

  const loadRecommendedFoods = async () => {
    try {
      const foods = await EnhancedFoodsService.getRecommendedFoodsForIBD(userId, selectedPhase, 8)
      setRecommendedFoods(foods)
    } catch (error) {
      console.error('載入推薦食物失敗:', error)
    }
  }

  const loadTaiwanFoods = async () => {
    try {
      const foods = await EnhancedFoodsService.getTaiwanCommonFoods()
      setTaiwanFoods(foods.slice(0, 12))
    } catch (error) {
      console.error('載入台灣食物失敗:', error)
    }
  }

  const searchFoods = async () => {
    if (!searchTerm.trim()) return

    setLoading(true)
    try {
      const foods = await EnhancedFoodsService.searchFoodsForIBD(searchTerm, selectedPhase, userId)
      setSearchResults(foods)
    } catch (error) {
      console.error('搜尋食物失敗:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const getFoodScore = (food: EnhancedFood): number => {
    return selectedPhase === 'acute' ?
      (food.ibd_scores?.acute_phase || 0) :
      (food.ibd_scores?.remission_phase || 0)
  }

  const getFoodWarnings = (food: EnhancedFood): string[] => {
    const warnings: string[] = []

    if (patientProfile) {
      // 檢查個人觸發因子
      const personalTriggers = patientProfile.personal_triggers.filter(trigger => {
        const triggerMap: Record<string, keyof typeof food.trigger_analysis> = {
          '高纖維': 'high_fiber',
          '高脂': 'high_fat',
          '高糖': 'high_sugar',
          '辛辣': 'spicy',
          '酸性': 'acidic',
          '生食': 'raw',
          '油炸': 'fried',
          '加工食品': 'processed',
          '乳糖': 'lactose',
          '麩質': 'gluten',
          '堅果': 'nuts_seeds',
          '咖啡因': 'caffeine',
          '酒精': 'alcohol'
        }
        const mappedTrigger = triggerMap[trigger]
        return mappedTrigger && food.trigger_analysis[mappedTrigger]
      })

      if (personalTriggers.length > 0) {
        warnings.push(`含個人觸發因子: ${personalTriggers.join('、')}`)
      }

      // 檢查避免的食物
      if (patientProfile.avoided_foods.some(avoided =>
          food.name.includes(avoided) || food.tags.includes(avoided))) {
        warnings.push('在您的避免清單中')
      }

      // 檢查纖維耐受性
      if (food.trigger_analysis.high_fiber && patientProfile.fiber_tolerance === 'low') {
        warnings.push('高纖維，您的耐受性較低')
      }
    }

    // 檢查當前階段適宜性
    const score = getFoodScore(food)
    if (selectedPhase === 'acute' && score < 2) {
      warnings.push('急性期不建議')
    }

    return warnings
  }

  const renderFoodCard = (food: EnhancedFood) => {
    const score = getFoodScore(food)
    const warnings = getFoodWarnings(food)
    const isWarning = warnings.length > 0
    const isSafe = patientProfile?.safe_foods.some(safe =>
      food.name.includes(safe) || food.tags.includes(safe))

    return (
      <button
        key={food.id}
        onClick={() => onFoodSelect(food)}
        className={`text-left p-3 border rounded-lg transition-all hover:shadow-md ${
          isWarning
            ? 'border-orange-200 bg-orange-50 hover:border-orange-300'
            : isSafe
            ? 'border-green-200 bg-green-50 hover:border-green-300'
            : 'border-gray-200 bg-white hover:border-blue-300'
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-medium text-gray-900 text-sm">{food.name}</h4>
            <p className="text-xs text-gray-500">{food.category}</p>
            {food.taiwan_origin && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                🇹🇼 台灣
              </span>
            )}
          </div>
          <div className="flex flex-col items-end space-y-1">
            <span className={`px-2 py-0.5 text-xs rounded-full ${getIBDScoreColor(score)}`}>
              {getIBDScoreText(score)}
            </span>
            {food.calories && (
              <span className="text-xs text-gray-500">{food.calories} cal</span>
            )}
          </div>
        </div>

        {/* 警告信息 */}
        {warnings.length > 0 && (
          <div className="mb-2">
            {warnings.map((warning, index) => (
              <div key={index} className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded mb-1">
                ⚠️ {warning}
              </div>
            ))}
          </div>
        )}

        {/* 安全標誌 */}
        {isSafe && (
          <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded mb-1">
            ✅ 您的安全食物
          </div>
        )}

        {/* 觸發因子標籤 */}
        {Object.entries(food.trigger_analysis).some(([_, value]) => value) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(food.trigger_analysis)
              .filter(([_, value]) => value)
              .slice(0, 3)
              .map(([key, _]) => {
                const triggerLabels: Record<string, string> = {
                  'high_fiber': '高纖',
                  'high_fat': '高脂',
                  'high_sugar': '高糖',
                  'spicy': '辛辣',
                  'raw': '生食',
                  'fried': '油炸',
                  'processed': '加工',
                  'lactose': '乳糖',
                  'gluten': '麩質'
                }
                const label = triggerLabels[key] || key
                return (
                  <span key={key} className="text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded">
                    {label}
                  </span>
                )
              })}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* 標頭 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">🍽️ IBD智能食物搜尋</h3>
          {patientProfile && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">當前階段:</span>
              <span className={`px-2 py-1 text-xs rounded-full ${getIBDPhaseColor(patientProfile.current_phase)}`}>
                {getIBDPhaseText(patientProfile.current_phase)}
              </span>
            </div>
          )}
        </div>

        {/* 階段選擇 */}
        <div className="flex space-x-2 mb-3">
          <button
            onClick={() => setSelectedPhase('acute')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              selectedPhase === 'acute'
                ? 'bg-red-100 text-red-800 border border-red-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            急性期建議
          </button>
          <button
            onClick={() => setSelectedPhase('remission')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              selectedPhase === 'remission'
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            緩解期建議
          </button>
        </div>

        {/* 搜尋框 */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜尋食物名稱..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>

      {/* 標籤切換 */}
      {searchTerm.length <= 1 && (
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('recommended')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'recommended'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🌟 個人化推薦
          </button>
          <button
            onClick={() => setActiveTab('taiwan')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'taiwan'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🇹🇼 台灣常見
          </button>
        </div>
      )}

      {/* 內容區域 */}
      <div className="p-4">
        {/* 搜尋結果 */}
        {searchTerm.length > 1 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              搜尋結果 ({searchResults.length})
            </h4>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResults.map(renderFoodCard)}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {loading ? '搜尋中...' : '未找到相關食物'}
              </div>
            )}
          </div>
        )}

        {/* 推薦食物 */}
        {searchTerm.length <= 1 && activeTab === 'recommended' && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              {selectedPhase === 'acute' ? '急性期推薦食物' : '緩解期推薦食物'}
            </h4>
            {recommendedFoods.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendedFoods.map(renderFoodCard)}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-2xl mb-2 block">🍽️</span>
                <p>暫無推薦食物</p>
                <p className="text-sm">請先設定IBD患者檔案</p>
              </div>
            )}
          </div>
        )}

        {/* 台灣常見食物 */}
        {searchTerm.length <= 1 && activeTab === 'taiwan' && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">台灣常見食物</h4>
            {taiwanFoods.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {taiwanFoods.map(renderFoodCard)}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">載入台灣食物中...</div>
            )}
          </div>
        )}
      </div>

      {/* 底部說明 */}
      <div className="px-4 pb-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <h5 className="text-sm font-medium text-blue-900 mb-1">IBD評分說明</h5>
          <div className="text-xs text-blue-800 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">4-3分</span>
              <span>非常適合 - 推薦食用</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">2分</span>
              <span>謹慎食用 - 少量嘗試</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full">1-0分</span>
              <span>建議避免 - 風險較高</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}