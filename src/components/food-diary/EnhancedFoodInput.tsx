'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Plus, Search, Star, X } from 'lucide-react'
import { foodsService } from '@/lib/supabase/foods'

interface FoodSearchResult {
  id: string
  name: string
  category: string
  calories?: number
  medical_score?: number
}

interface SelectedFood extends FoodSearchResult {
  amount: number
  unit: string
  notes: string
  customScore?: number
  category?: string // 讓類別成為可選
}

interface EnhancedFoodInputProps {
  onFoodSelected: (food: SelectedFood) => void
  onCreateCustomFood: (foodName: string) => void
  placeholder?: string
  defaultMealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  categories?: string[]
  userId?: string // 添加用戶ID以搜索用戶自訂食物
}

export function EnhancedFoodInput({
  onFoodSelected,
  onCreateCustomFood,
  placeholder = "輸入食物名稱...",
  defaultMealType = 'breakfast',
  categories = [],
  userId
}: EnhancedFoodInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null)
  const [foodDetails, setFoodDetails] = useState({
    amount: '1',
    unit: '份',
    notes: '',
    customScore: '',
    category: ''
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const units = ['g', 'ml', '份', '杯', '匙', '個', '片', '塊']

  // 搜索食物的防抖函數
  const searchFoods = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    try {
      // 使用更全面的搜索，包含自訂食物和待審核食物
      const results = await foodsService.searchFoods(searchTerm, {
        includeCustom: true,     // 包含自訂食物
        includeUnverified: true, // 包含待審核食物
        limit: 20
      })

      const formattedResults = results.map(food => ({
        id: food.id,
        name: food.name,
        category: food.category,
        calories: food.calories || undefined,
        medical_score: food.condition_scores?.ibd?.general_safety || undefined
      }))
      setSearchResults(formattedResults)
      setSelectedIndex(-1)
    } catch (error) {
      console.error('搜索食物失敗:', error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // 輸入變化處理
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchFoods(inputValue)
      setIsDropdownOpen(inputValue.length >= 2)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [inputValue, searchFoods])

  // 鍵盤導航處理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        const nextIndex = selectedIndex < searchResults.length ? selectedIndex + 1 : searchResults.length
        setSelectedIndex(nextIndex)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(selectedIndex > -1 ? selectedIndex - 1 : -1)
        break
      case 'Tab':
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          selectFood(searchResults[selectedIndex])
        } else if (selectedIndex === searchResults.length) {
          // 創建自訂食物選項
          handleCreateCustomFood()
        }
        break
      case 'Escape':
        setIsDropdownOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  // 選擇食物
  const selectFood = (food: FoodSearchResult) => {
    setSelectedFood(food)
    setInputValue(food.name)
    setIsDropdownOpen(false)
    setSelectedIndex(-1)
  }

  // 創建自訂食物
  const handleCreateCustomFood = () => {
    if (inputValue.trim()) {
      onCreateCustomFood(inputValue.trim())
      setInputValue('')
      setIsDropdownOpen(false)
    }
  }

  // 提交食物記錄
  const handleSubmit = () => {
    if (!selectedFood && !inputValue.trim()) return

    const amount = parseFloat(foodDetails.amount)
    if (isNaN(amount) || amount <= 0) {
      alert('請輸入有效的份量')
      return
    }

    let food: SelectedFood

    if (selectedFood) {
      // 使用選擇的食物
      food = {
        ...selectedFood,
        amount,
        unit: foodDetails.unit,
        notes: foodDetails.notes,
        customScore: foodDetails.customScore ? parseFloat(foodDetails.customScore) : undefined,
        category: foodDetails.category || selectedFood.category
      }
    } else {
      // 創建新的自訂食物
      food = {
        id: `custom_${Date.now()}`,
        name: inputValue.trim(),
        category: foodDetails.category || '自訂食物',
        amount,
        unit: foodDetails.unit,
        notes: foodDetails.notes,
        customScore: foodDetails.customScore ? parseFloat(foodDetails.customScore) : undefined
      }
    }

    onFoodSelected(food)

    // 重置表單
    setInputValue('')
    setSelectedFood(null)
    setFoodDetails({
      amount: '1',
      unit: '份',
      notes: '',
      customScore: '',
      category: ''
    })
  }

  // 點擊外部關閉下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="space-y-4">
      {/* 食物搜索輸入框 */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.length >= 2 && setIsDropdownOpen(true)}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
        </div>

        {/* 下拉選項 */}
        {isDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-3 text-gray-500">
                搜索中...
              </div>
            )}

            {!isLoading && searchResults.length === 0 && inputValue.length >= 2 && (
              <div className="px-4 py-3 text-gray-500">
                找不到相關食物
              </div>
            )}

            {!isLoading && searchResults.map((food, index) => (
              <div
                key={food.id}
                onClick={() => selectFood(food)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                  selectedIndex === index ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">{food.name}</div>
                    <div className="text-sm text-gray-500">{food.category}</div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {food.calories && <div>{food.calories} 卡</div>}
                    {food.medical_score !== undefined && (
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-400" />
                        <span className="ml-1">{food.medical_score}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* 創建自訂食物選項 */}
            {!isLoading && inputValue.length >= 2 && (
              <div
                onClick={handleCreateCustomFood}
                className={`px-4 py-3 cursor-pointer border-t border-gray-200 hover:bg-green-50 ${
                  selectedIndex === searchResults.length ? 'bg-green-50' : ''
                }`}
              >
                <div className="flex items-center text-green-600">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>創建自訂食物「{inputValue}」</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 選中食物後的詳細資訊輸入 */}
      {(selectedFood || inputValue) && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="font-medium text-gray-900">
            {selectedFood ? `已選擇: ${selectedFood.name}` : `自訂食物: ${inputValue}`}
          </div>

          {/* 份量和單位 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                份量 *
              </label>
              <input
                type="number"
                value={foodDetails.amount}
                onChange={(e) => setFoodDetails(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="1"
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                單位
              </label>
              <select
                value={foodDetails.unit}
                onChange={(e) => setFoodDetails(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 類別選擇 (可選) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              類別 (可選)
            </label>
            <input
              type="text"
              value={foodDetails.category}
              onChange={(e) => setFoodDetails(prev => ({ ...prev, category: e.target.value }))}
              placeholder={selectedFood?.category || "輸入或選擇類別"}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {categories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.slice(0, 8).map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setFoodDetails(prev => ({ ...prev, category }))}
                    className="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-md"
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 個人評分 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              個人評分 (可選)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={foodDetails.customScore}
                onChange={(e) => setFoodDetails(prev => ({ ...prev, customScore: e.target.value }))}
                placeholder="1-5"
                min="1"
                max="5"
                step="0.1"
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-500">分 (1-5，5 = 最適合你)</span>
            </div>
          </div>

          {/* 備註 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備註 (可選)
            </label>
            <textarea
              value={foodDetails.notes}
              onChange={(e) => setFoodDetails(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="添加備註..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* 提交按鈕 */}
          <div className="flex space-x-3">
            <button
              onClick={handleSubmit}
              disabled={!foodDetails.amount}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              添加食物記錄
            </button>
            <button
              onClick={() => {
                setInputValue('')
                setSelectedFood(null)
                setFoodDetails({
                  amount: '1',
                  unit: '份',
                  notes: '',
                  customScore: '',
                  category: ''
                })
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              清除
            </button>
          </div>
        </div>
      )}
    </div>
  )
}