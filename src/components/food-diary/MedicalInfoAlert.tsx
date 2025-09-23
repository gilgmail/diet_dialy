'use client'

import { useState } from 'react'
import { AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react'

interface MedicalInfoAlertProps {
  food: {
    id: string
    name: string
    is_custom?: boolean
    verification_status?: string
    medical_scores?: any
  }
}

export function MedicalInfoAlert({ food }: MedicalInfoAlertProps) {
  if (!food.is_custom) return null

  const hasCompleteMedicalInfo = food.medical_scores &&
    food.medical_scores.ibd_score !== undefined &&
    food.medical_scores.chemo_safety !== undefined &&
    food.medical_scores.fodmap_level !== undefined

  // 如果已經有完整醫療資訊，顯示簡化的狀態
  if (hasCompleteMedicalInfo) {
    const { ibd_score, chemo_safety, fodmap_level } = food.medical_scores

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm flex-1">
            <p className="font-medium text-green-800">醫療資訊已完整</p>
            <p className="text-green-700 mb-2">
              此自訂食物已具備完整的醫療評分資訊，可安全使用。
            </p>

            {/* 顯示醫療評分摘要 */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white rounded px-2 py-1">
                <span className="font-medium text-gray-600">IBD: </span>
                <span className={`${ibd_score >= 3 ? 'text-green-600' : ibd_score >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {ibd_score}/5
                </span>
              </div>
              <div className="bg-white rounded px-2 py-1">
                <span className="font-medium text-gray-600">化療: </span>
                <span className={`${chemo_safety === 'safe' ? 'text-green-600' : chemo_safety === 'caution' ? 'text-yellow-600' : 'text-red-600'}`}>
                  {chemo_safety === 'safe' ? '安全' : chemo_safety === 'caution' ? '謹慎' : '避免'}
                </span>
              </div>
              <div className="bg-white rounded px-2 py-1">
                <span className="font-medium text-gray-600">FODMAP: </span>
                <span className={`${fodmap_level === 'low' ? 'text-green-600' : fodmap_level === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                  {fodmap_level === 'low' ? '低' : fodmap_level === 'medium' ? '中' : '高'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 根據驗證狀態顯示不同的提醒
  const getAlertContent = () => {
    switch (food.verification_status) {
      case 'approved':
        return {
          icon: <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />,
          bgColor: 'bg-blue-50 border-blue-200',
          titleColor: 'text-blue-800',
          textColor: 'text-blue-700',
          title: '醫療資訊審核中',
          content: '此自訂食物已通過基本審核，醫療專業人員將為其補充完整的健康評分資訊。'
        }
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />,
          bgColor: 'bg-yellow-50 border-yellow-200',
          titleColor: 'text-yellow-800',
          textColor: 'text-yellow-700',
          title: '等待專業審核',
          content: '此自訂食物正在等待醫療專業人員審核並補充健康評分資訊。'
        }
      case 'rejected':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />,
          bgColor: 'bg-red-50 border-red-200',
          titleColor: 'text-red-800',
          textColor: 'text-red-700',
          title: '需要補充資訊',
          content: '此自訂食物需要補充更多資訊才能提供準確的健康評分。'
        }
      default:
        return {
          icon: <Info className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />,
          bgColor: 'bg-gray-50 border-gray-200',
          titleColor: 'text-gray-800',
          textColor: 'text-gray-700',
          title: '醫療資訊待補充',
          content: '此自訂食物將由醫療專業人員補充完整的健康評分資訊。'
        }
    }
  }

  const alert = getAlertContent()

  return (
    <div className={`${alert.bgColor} border rounded-lg p-3 mb-4`}>
      <div className="flex items-start space-x-2">
        {alert.icon}
        <div className="text-sm flex-1">
          <p className={`font-medium ${alert.titleColor} mb-1`}>{alert.title}</p>
          <p className={alert.textColor}>{alert.content}</p>

          {/* 說明文字 */}
          <div className="mt-2 text-xs text-gray-600">
            <p className="font-medium mb-1">醫療評分包含：</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>IBD (發炎性腸道疾病) 適宜性評分</li>
              <li>化療期間食用安全性評估</li>
              <li>FODMAP 含量等級分析</li>
              <li>常見過敏原風險評估</li>
            </ul>
          </div>

          {/* 提醒用戶可以繼續使用 */}
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              💡 您可以繼續記錄此食物的攝取，醫療評分將在稍後自動更新。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}