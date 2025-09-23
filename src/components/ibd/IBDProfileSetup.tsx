'use client'

import { useState, useEffect } from 'react'
import { EnhancedFoodsService, type IBDPatientProfileData } from '@/lib/supabase/enhanced-foods-service'
import { getIBDPhaseColor, getIBDPhaseText } from '@/lib/supabase/enhanced-foods-service'

interface IBDProfileSetupProps {
  userId: string
  onProfileSaved?: (profile: IBDPatientProfileData) => void
  isModal?: boolean
  onClose?: () => void
}

export function IBDProfileSetup({ userId, onProfileSaved, isModal = false, onClose }: IBDProfileSetupProps) {
  const [profile, setProfile] = useState<Partial<IBDPatientProfileData>>({
    user_id: userId,
    ibd_type: 'ibd_unspecified',
    current_phase: 'remission',
    personal_triggers: [],
    safe_foods: [],
    avoided_foods: [],
    symptom_sensitivity: {
      abdominal_pain: 3,
      diarrhea: 3,
      bloating: 3,
      fatigue: 3,
      nausea: 3
    },
    dietary_restrictions: [],
    fiber_tolerance: 'moderate'
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [newTrigger, setNewTrigger] = useState('')
  const [newSafeFood, setNewSafeFood] = useState('')
  const [newAvoidedFood, setNewAvoidedFood] = useState('')

  const ibdTypes = [
    { value: 'crohns', label: '克隆氏症 (Crohn\'s Disease)' },
    { value: 'ulcerative_colitis', label: '潰瘍性結腸炎 (Ulcerative Colitis)' },
    { value: 'ibd_unspecified', label: 'IBD未分類/不確定' }
  ]

  const phases = [
    { value: 'acute', label: '急性期' },
    { value: 'mild_flare', label: '輕度發作' },
    { value: 'moderate_flare', label: '中度發作' },
    { value: 'severe_flare', label: '重度發作' },
    { value: 'remission', label: '緩解期' }
  ]

  const fiberToleranceOptions = [
    { value: 'low', label: '低纖維耐受性' },
    { value: 'moderate', label: '中等纖維耐受性' },
    { value: 'high', label: '高纖維耐受性' }
  ]

  const commonTriggers = [
    '高纖維', '高脂', '高糖', '辛辣', '酸性', '生食',
    '油炸', '加工食品', '乳糖', '麩質', '堅果', '咖啡因', '酒精'
  ]

  const commonDietaryRestrictions = [
    '無麩質', '無乳糖', '低FODMAP', '素食', '純素',
    '無堅果', '低鈉', '低脂', '低糖'
  ]

  useEffect(() => {
    loadExistingProfile()
  }, [userId])

  const loadExistingProfile = async () => {
    try {
      setIsLoading(true)
      const existingProfile = await EnhancedFoodsService.getIBDPatientProfile(userId)
      if (existingProfile) {
        setProfile(existingProfile)
      }
    } catch (error) {
      console.error('載入IBD檔案失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile.ibd_type || !profile.current_phase) {
      setError('請填寫必要的基本資訊')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const savedProfile = await EnhancedFoodsService.upsertIBDPatientProfile(profile as IBDPatientProfileData)
      onProfileSaved?.(savedProfile)
      if (isModal && onClose) {
        onClose()
      }
    } catch (error) {
      console.error('保存IBD檔案失敗:', error)
      setError('保存失敗，請重試')
    } finally {
      setIsSaving(false)
    }
  }

  const addTrigger = () => {
    if (newTrigger.trim() && !profile.personal_triggers?.includes(newTrigger.trim())) {
      setProfile(prev => ({
        ...prev,
        personal_triggers: [...(prev.personal_triggers || []), newTrigger.trim()]
      }))
      setNewTrigger('')
    }
  }

  const removeTrigger = (trigger: string) => {
    setProfile(prev => ({
      ...prev,
      personal_triggers: prev.personal_triggers?.filter(t => t !== trigger) || []
    }))
  }

  const addSafeFood = () => {
    if (newSafeFood.trim() && !profile.safe_foods?.includes(newSafeFood.trim())) {
      setProfile(prev => ({
        ...prev,
        safe_foods: [...(prev.safe_foods || []), newSafeFood.trim()]
      }))
      setNewSafeFood('')
    }
  }

  const removeSafeFood = (food: string) => {
    setProfile(prev => ({
      ...prev,
      safe_foods: prev.safe_foods?.filter(f => f !== food) || []
    }))
  }

  const addAvoidedFood = () => {
    if (newAvoidedFood.trim() && !profile.avoided_foods?.includes(newAvoidedFood.trim())) {
      setProfile(prev => ({
        ...prev,
        avoided_foods: [...(prev.avoided_foods || []), newAvoidedFood.trim()]
      }))
      setNewAvoidedFood('')
    }
  }

  const removeAvoidedFood = (food: string) => {
    setProfile(prev => ({
      ...prev,
      avoided_foods: prev.avoided_foods?.filter(f => f !== food) || []
    }))
  }

  const toggleDietaryRestriction = (restriction: string) => {
    setProfile(prev => {
      const restrictions = prev.dietary_restrictions || []
      if (restrictions.includes(restriction)) {
        return {
          ...prev,
          dietary_restrictions: restrictions.filter(r => r !== restriction)
        }
      } else {
        return {
          ...prev,
          dietary_restrictions: [...restrictions, restriction]
        }
      }
    })
  }

  const updateSymptomSensitivity = (symptom: string, value: number) => {
    setProfile(prev => ({
      ...prev,
      symptom_sensitivity: {
        ...prev.symptom_sensitivity!,
        [symptom]: value
      }
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">載入中...</span>
      </div>
    )
  }

  const content = (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🩺 IBD患者檔案設定</h2>
        <p className="text-gray-600">幫助我們為您提供個人化的食物建議</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 基本資訊 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">基本資訊</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">IBD類型 *</label>
            <select
              value={profile.ibd_type}
              onChange={(e) => setProfile(prev => ({ ...prev, ibd_type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ibdTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">當前階段 *</label>
            <select
              value={profile.current_phase}
              onChange={(e) => setProfile(prev => ({ ...prev, current_phase: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {phases.map(phase => (
                <option key={phase.value} value={phase.value}>{phase.label}</option>
              ))}
            </select>
            {profile.current_phase && (
              <div className="mt-2">
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${getIBDPhaseColor(profile.current_phase)}`}>
                  {getIBDPhaseText(profile.current_phase)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">纖維耐受性</label>
            <select
              value={profile.fiber_tolerance}
              onChange={(e) => setProfile(prev => ({ ...prev, fiber_tolerance: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {fiberToleranceOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 個人觸發因子 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">個人觸發因子</h3>

        <div className="mb-4">
          <div className="flex flex-wrap gap-2 mb-2">
            {commonTriggers.map(trigger => (
              <button
                key={trigger}
                onClick={() => {
                  if (profile.personal_triggers?.includes(trigger)) {
                    removeTrigger(trigger)
                  } else {
                    setProfile(prev => ({
                      ...prev,
                      personal_triggers: [...(prev.personal_triggers || []), trigger]
                    }))
                  }
                }}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  profile.personal_triggers?.includes(trigger)
                    ? 'bg-red-100 border-red-300 text-red-800'
                    : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {trigger}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newTrigger}
            onChange={(e) => setNewTrigger(e.target.value)}
            placeholder="添加其他觸發因子..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && addTrigger()}
          />
          <button
            onClick={addTrigger}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            添加
          </button>
        </div>

        {profile.personal_triggers && profile.personal_triggers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.personal_triggers.map(trigger => (
              <span
                key={trigger}
                className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"
              >
                {trigger}
                <button
                  onClick={() => removeTrigger(trigger)}
                  className="ml-1 text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 安全食物清單 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">安全食物清單</h3>

        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newSafeFood}
            onChange={(e) => setNewSafeFood(e.target.value)}
            placeholder="添加對您安全的食物..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && addSafeFood()}
          />
          <button
            onClick={addSafeFood}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            添加
          </button>
        </div>

        {profile.safe_foods && profile.safe_foods.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.safe_foods.map(food => (
              <span
                key={food}
                className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
              >
                {food}
                <button
                  onClick={() => removeSafeFood(food)}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 症狀敏感度 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">症狀敏感度 (1-5分)</h3>

        <div className="space-y-3">
          {Object.entries(profile.symptom_sensitivity || {}).map(([symptom, value]) => (
            <div key={symptom} className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                {symptom === 'abdominal_pain' ? '腹痛' :
                 symptom === 'diarrhea' ? '腹瀉' :
                 symptom === 'bloating' ? '腹脹' :
                 symptom === 'fatigue' ? '疲勞' :
                 symptom === 'nausea' ? '噁心' : symptom}
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">1</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={value}
                  onChange={(e) => updateSymptomSensitivity(symptom, parseInt(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">5</span>
                <span className="w-8 text-center text-sm font-medium">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 飲食限制 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">飲食限制</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {commonDietaryRestrictions.map(restriction => (
            <label key={restriction} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={profile.dietary_restrictions?.includes(restriction) || false}
                onChange={() => toggleDietaryRestriction(restriction)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{restriction}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 保存按鈕 */}
      <div className="flex justify-end space-x-3">
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            取消
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {isSaving ? '保存中...' : '保存檔案'}
        </button>
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-50 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto bg-gray-50 p-6">
      {content}
    </div>
  )
}