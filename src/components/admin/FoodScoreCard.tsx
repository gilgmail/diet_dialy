'use client'

import { useState } from 'react'
import { Star, Heart, Shield, Zap, AlertTriangle, CheckCircle, Edit3, Save, X } from 'lucide-react'

interface ScoreDetail {
  general_safety: number
  acute_phase?: number
  remission_phase?: number
  trigger_risk?: string
  allergen_free_confidence?: number
  immune_support?: number
  nausea_friendly?: number
  nutrition_density?: number
}

interface ConditionScores {
  ibd?: ScoreDetail
  ibs?: ScoreDetail
  allergies?: ScoreDetail
  cancer_chemo?: ScoreDetail
}

interface FoodScoreCardProps {
  foodId: string
  foodName: string
  currentScores?: ConditionScores
  currentNotes?: string
  onScoreUpdate: (foodId: string, scores: ConditionScores, notes: string) => Promise<void>
  isEditable?: boolean
}

const scoreLabels = {
  0: { text: '避免', color: 'bg-red-100 text-red-800', icon: '⚠️' },
  1: { text: '高風險', color: 'bg-red-100 text-red-800', icon: '❌' },
  2: { text: '中風險', color: 'bg-orange-100 text-orange-800', icon: '⚡' },
  3: { text: '低風險', color: 'bg-yellow-100 text-yellow-800', icon: '⚠️' },
  4: { text: '安全', color: 'bg-green-100 text-green-800', icon: '✅' },
  5: { text: '推薦', color: 'bg-green-100 text-green-800', icon: '⭐' }
}

export default function FoodScoreCard({
  foodId,
  foodName,
  currentScores,
  currentNotes,
  onScoreUpdate,
  isEditable = true
}: FoodScoreCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [scores, setScores] = useState<ConditionScores>(currentScores || {})
  const [notes, setNotes] = useState(currentNotes || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleScoreChange = (condition: keyof ConditionScores, field: string, value: number | string) => {
    setScores(prev => ({
      ...prev,
      [condition]: {
        ...prev[condition],
        [field]: value
      }
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onScoreUpdate(foodId, scores, notes)
      setIsEditing(false)
    } catch (error) {
      console.error('儲存評分失敗:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setScores(currentScores || {})
    setNotes(currentNotes || '')
    setIsEditing(false)
  }

  const renderScoreInput = (condition: keyof ConditionScores, field: string, label: string, max = 5) => {
    const value = scores[condition]?.[field as keyof ScoreDetail] as number || 0

    return (
      <div className="flex items-center justify-between py-2">
        <label className="text-sm text-gray-600">{label}</label>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <select
              value={value}
              onChange={(e) => handleScoreChange(condition, field, parseInt(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              {Array.from({ length: max + 1 }, (_, i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          ) : (
            <span className={`px-2 py-1 rounded text-xs font-medium ${scoreLabels[value as keyof typeof scoreLabels]?.color || 'bg-gray-100 text-gray-800'}`}>
              {scoreLabels[value as keyof typeof scoreLabels]?.icon} {value}
            </span>
          )}
        </div>
      </div>
    )
  }

  const renderConditionCard = (condition: keyof ConditionScores, title: string, icon: any, fields: Array<{key: string, label: string, max?: number}>) => {
    const IconComponent = icon

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <IconComponent className="w-5 h-5 text-blue-600" />
          <h4 className="font-medium text-gray-900">{title}</h4>
        </div>

        <div className="space-y-1">
          {fields.map(field =>
            renderScoreInput(condition, field.key, field.label, field.max)
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">醫療評分系統</h3>
          <p className="text-sm text-gray-600">{foodName}</p>
        </div>

        {isEditable && (
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit3 className="w-4 h-4 mr-1" />
                編輯評分
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  儲存
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Condition Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {renderConditionCard('ibd', '發炎性腸病 (IBD)', Heart, [
          { key: 'general_safety', label: '總體安全性' },
          { key: 'acute_phase', label: '急性期適合性' },
          { key: 'remission_phase', label: '緩解期適合性' }
        ])}

        {renderConditionCard('ibs', '腸躁症 (IBS)', Zap, [
          { key: 'general_safety', label: '總體安全性' },
          { key: 'trigger_risk', label: '觸發風險等級' }
        ])}

        {renderConditionCard('allergies', '過敏反應', Shield, [
          { key: 'allergen_free_confidence', label: '無過敏原信心度' },
          { key: 'cross_contamination_risk', label: '交叉污染風險' }
        ])}

        {renderConditionCard('cancer_chemo', '癌症化療', Star, [
          { key: 'general_safety', label: '總體安全性' },
          { key: 'immune_support', label: '免疫支持' },
          { key: 'nausea_friendly', label: '抗噁心友善性' },
          { key: 'nutrition_density', label: '營養密度' }
        ])}
      </div>

      {/* Notes Section */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">評分備註</h4>
        </div>

        {isEditing ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="請輸入評分理由、注意事項或其他相關資訊..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
          />
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            {notes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
            ) : (
              <p className="text-sm text-gray-400">尚無評分備註</p>
            )}
          </div>
        )}
      </div>

      {/* Score Legend */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2">評分說明</h5>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          {Object.entries(scoreLabels).map(([score, info]) => (
            <div key={score} className={`px-2 py-1 rounded text-center ${info.color}`}>
              {info.icon} {score} - {info.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}