'use client'

import { useState, useEffect } from 'react'
import { foodsService } from '@/lib/supabase/foods'
import type { FoodInsert } from '@/types/supabase'
import { Plus, X, AlertCircle, CheckCircle } from 'lucide-react'

interface QuickAddCustomFoodProps {
  isOpen: boolean
  onClose: () => void
  onFoodCreated: (food: any) => void
  userId?: string
  prefilledName?: string
}

export function QuickAddCustomFood({
  isOpen,
  onClose,
  onFoodCreated,
  userId,
  prefilledName = ''
}: QuickAddCustomFoodProps) {
  const [formData, setFormData] = useState({
    name: prefilledName,
    category: '',
    notes: '',
    ibdScore: '',
    otherScore: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'basic' | 'success'>('basic')

  // 當prefilledName變更時，更新表單名稱
  useEffect(() => {
    if (prefilledName) {
      setFormData(prev => ({
        ...prev,
        name: prefilledName
      }))
    }
  }, [prefilledName])

  const categories = [
    '穀類', '蛋白質', '蔬菜', '水果', '奶類', '油脂', '零食', '飲料',
    '調味料', '湯品', '甜點', '堅果', '豆類', '其他'
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
      // 構建醫療評分物件 - 使用標準格式
      const medicalScores: any = {}
      if (formData.ibdScore) {
        medicalScores.ibd_score = parseFloat(formData.ibdScore)
        medicalScores.user_provided = true
      }
      if (formData.otherScore) {
        medicalScores.other_condition_score = parseFloat(formData.otherScore)
        medicalScores.user_provided = true
      }
      // 設置預設的安全等級
      if (formData.ibdScore || formData.otherScore) {
        medicalScores.safety_level = 'pending_review'  // 用戶評分需要審核
      }

      const foodData: FoodInsert = {
        name: formData.name.trim(),
        category: formData.category,
        is_custom: true,
        created_by: userId,
        verification_status: 'pending',
        verification_notes: [
          formData.notes.trim() || '用戶自訂食物',
          formData.ibdScore ? `IBD評分: ${formData.ibdScore}/5` : '',
          formData.otherScore ? `其他評分: ${formData.otherScore}/5` : '',
          '待專業審核'
        ].filter(Boolean).join(' | '),
      }

      const newFood = await foodsService.createFood(foodData)

      if (!newFood) {
        throw new Error('建立食物失敗')
      }

      setStep('success')

      // 延遲一下再調用回調，讓用戶看到成功狀態
      setTimeout(() => {
        onFoodCreated({
          id: `custom_${newFood.id}`, // 使用 custom_ 前綴標識自訂食物
          name: newFood.name,
          category: newFood.category,
          is_custom: true,
          verification_status: 'pending',
          medical_scores: newFood.medical_scores,
          // 添加自訂食物標記
          custom_food_source: 'user_created',
          original_food_id: newFood.id
        })
        handleClose()
      }, 1500)

    } catch (error) {
      console.error('建立自訂食物失敗:', error)
      setError('建立食物失敗，請重試')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      category: '',
      notes: '',
      ibdScore: '',
      otherScore: ''
    })
    setError('')
    setStep('basic')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 表頭 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'basic' ? '快速新增自訂食物' : '新增成功！'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'basic' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* 食物名稱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                食物名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例：自製蒸蛋"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                autoFocus
              />
            </div>

            {/* 分類 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分類 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">請選擇分類</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* IBD評分（可選）*/}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IBD評分（可選）
              </label>
              <input
                type="number"
                value={formData.ibdScore}
                onChange={(e) => setFormData({ ...formData, ibdScore: e.target.value })}
                placeholder="1-5分，5為最適合IBD患者"
                min="1"
                max="5"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 其他醫療評分（可選）*/}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                其他醫療評分（可選）
              </label>
              <input
                type="number"
                value={formData.otherScore}
                onChange={(e) => setFormData({ ...formData, otherScore: e.target.value })}
                placeholder="1-5分，適用於其他疾病"
                min="1"
                max="5"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 備註 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                備註（可選）
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="任何補充說明..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* 提示資訊 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">溫馨提醒</p>
                  <p>您提供的醫療評分將由專業人員審核。評分範圍1-5分，5分為最適合。評分會影響後續的醫療建議，請謹慎填寫。</p>
                </div>
              </div>
            </div>

            {/* 錯誤訊息 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* 按鈕 */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim() || !formData.category}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>建立中...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>建立食物</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* 成功狀態 */
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">食物建立成功！</h3>
            <p className="text-sm text-gray-600 mb-4">
              「{formData.name}」已加入您的自訂食物清單
            </p>
            <p className="text-xs text-blue-600">
              正在自動選取該食物以便記錄...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}