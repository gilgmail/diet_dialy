'use client'

import { useState } from 'react'
import { foodsService } from '@/lib/supabase/foods'
import type { FoodInsert } from '@/types/supabase'

interface CustomFoodModalProps {
  isOpen: boolean
  onClose: () => void
  onFoodCreated: (food: any) => void
  userId: string
}

export function CustomFoodModal({ isOpen, onClose, onFoodCreated, userId }: CustomFoodModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    calories: '',
    protein: '',
    carbohydrates: '',
    fat: '',
    fiber: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const categories = [
    '穀類', '蛋白質', '蔬菜', '水果', '奶類', '油脂', '零食', '飲料', '調味料', '其他'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.category) {
      setError('請填寫食物名稱和分類')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const foodData: FoodInsert = {
        name: formData.name.trim(),
        category: formData.category,
        brand: formData.brand.trim() || undefined,
        calories: formData.calories ? parseFloat(formData.calories) : undefined,
        protein: formData.protein ? parseFloat(formData.protein) : undefined,
        carbohydrates: formData.carbohydrates ? parseFloat(formData.carbohydrates) : undefined,
        fat: formData.fat ? parseFloat(formData.fat) : undefined,
        fiber: formData.fiber ? parseFloat(formData.fiber) : undefined,
        created_by: userId,
        is_custom: true,
        verification_status: 'approved', // 自訂食物直接通過
        medical_scores: { ibd_score: 5, safety_level: 'unknown' }, // 預設分數
        allergens: [],
        tags: ['自訂食物'],
        nutrition_data: {
          notes: formData.notes.trim() || undefined
        }
      }

      const newFood = await foodsService.createCustomFood(foodData)
      if (newFood) {
        onFoodCreated(newFood)
        onClose()
        // 重置表單
        setFormData({
          name: '',
          category: '',
          brand: '',
          calories: '',
          protein: '',
          carbohydrates: '',
          fat: '',
          fiber: '',
          notes: ''
        })
      }
    } catch (error) {
      console.error('創建自訂食物失敗:', error)
      setError('創建失敗，請重試')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">🍎 新增自訂食物</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 基本資訊 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  食物名稱 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例：自製雞胸肉沙拉"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分類 *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選擇分類</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  品牌
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="例：自製、某品牌"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  卡路里 (每100g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.calories}
                  onChange={(e) => setFormData(prev => ({ ...prev, calories: e.target.value }))}
                  placeholder="例：150"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 營養成分 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">營養成分 (每100g)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    蛋白質 (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.protein}
                    onChange={(e) => setFormData(prev => ({ ...prev, protein: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    碳水化合物 (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.carbohydrates}
                    onChange={(e) => setFormData(prev => ({ ...prev, carbohydrates: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    脂肪 (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.fat}
                    onChange={(e) => setFormData(prev => ({ ...prev, fat: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    膳食纖維 (g)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.fiber}
                    onChange={(e) => setFormData(prev => ({ ...prev, fiber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 備註 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備註
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="例：製作方式、特殊成分等..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 按鈕 */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? '創建中...' : '創建食物'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}