'use client'

import { useState, useEffect } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import Link from 'next/link'

interface MedicalConditions {
  conditions: string[]
  allergies: string[]
  dietaryRestrictions: string[]
  medications: string[]
}

export default function SettingsPage() {
  const { user, userProfile, isLoading, isAuthenticated, signInWithGoogle, signOut, updateProfile } = useSupabaseAuth()
  const [medicalConditions, setMedicalConditions] = useState<MedicalConditions>({
    conditions: [],
    allergies: [],
    dietaryRestrictions: [],
    medications: []
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [authMessage, setAuthMessage] = useState('')

  // 檢查 URL 參數中的認證狀態
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const authSuccess = urlParams.get('auth_success')
    const authError = urlParams.get('auth_error')

    if (authSuccess) {
      setAuthMessage('✅ Google 登入成功！')
      // 清除 URL 參數
      window.history.replaceState({}, document.title, window.location.pathname)
      setTimeout(() => setAuthMessage(''), 5000)
    } else if (authError) {
      setAuthMessage(`❌ 登入失敗：${decodeURIComponent(authError)}`)
      window.history.replaceState({}, document.title, window.location.pathname)
      setTimeout(() => setAuthMessage(''), 8000)
    }
  }, [])

  // 載入用戶的醫療資訊
  useEffect(() => {
    if (userProfile) {
      setMedicalConditions({
        conditions: userProfile.medical_conditions || [],
        allergies: userProfile.allergies || [],
        dietaryRestrictions: userProfile.dietary_restrictions || [],
        medications: userProfile.medications || []
      })
    }
  }, [userProfile])

  // 常見醫療狀況選項
  const commonConditions = [
    '發炎性腸病 (IBD)',
    '克隆氏症',
    '潰瘍性結腸炎',
    '腸躁症 (IBS)',
    '糖尿病',
    '高血壓',
    '心臟病',
    '腎臟病',
    '肝病',
    '癌症治療中'
  ]

  // 常見過敏原
  const commonAllergens = [
    '牛奶',
    '雞蛋',
    '花生',
    '堅果',
    '大豆',
    '小麥',
    '魚類',
    '甲殼類',
    '芝麻',
    '其他'
  ]

  // 常見飲食限制
  const commonDietaryRestrictions = [
    '素食',
    '純素食',
    '低鈉飲食',
    '低糖飲食',
    '低脂飲食',
    '高纖飲食',
    '無麩質飲食',
    '低 FODMAP 飲食',
    '地中海飲食',
    '生酮飲食'
  ]

  const handleConditionToggle = (condition: string, category: keyof MedicalConditions) => {
    setMedicalConditions(prev => ({
      ...prev,
      [category]: prev[category].includes(condition)
        ? prev[category].filter(c => c !== condition)
        : [...prev[category], condition]
    }))
  }

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    setSaveMessage('')

    try {
      await updateProfile({
        medical_conditions: medicalConditions.conditions,
        allergies: medicalConditions.allergies,
        dietary_restrictions: medicalConditions.dietaryRestrictions,
        medications: medicalConditions.medications
      })

      setSaveMessage('✅ 設定已儲存成功！')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('儲存設定時發生錯誤:', error)
      setSaveMessage('❌ 儲存失敗，請重試')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              ← 返回首頁
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">設定</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 認證狀態區塊 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">🔐 帳戶認證</h2>
            {authMessage && (
              <div className={`text-sm font-medium px-3 py-1 rounded-lg ${
                authMessage.includes('成功')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {authMessage}
              </div>
            )}
          </div>

          {isLoading && !isAuthenticated && (
            <div className="text-center py-4">
              <p className="text-gray-600">載入中...</p>
            </div>
          )}

          {!isLoading && !isAuthenticated && (
            <div className="text-center py-8">
              <div className="mb-4">
                <span className="text-4xl mb-4 block">🔒</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">請先登入</h3>
                <p className="text-gray-600 mb-6">使用 Google 帳戶登入以管理您的設定</p>
              </div>
              <button
                onClick={signInWithGoogle}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
              >
                🔐 使用 Google 登入
              </button>
            </div>
          )}

          {isAuthenticated && user && (
            <div>
              <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-green-900">已登入</h3>
                  <p className="text-green-700">{user.email}</p>
                  {userProfile?.name && (
                    <p className="text-green-600 text-sm">{userProfile.name}</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={signOut}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  🚪 登出
                </button>
                {userProfile?.is_admin && (
                  <div className="px-3 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium">
                    🛡️ 管理員權限
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 醫療狀況設定 - 只有登入用戶可見 */}
        {isAuthenticated && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">🏥 醫療狀況設定</h2>
              {saveMessage && (
                <div className="text-sm font-medium text-green-600">
                  {saveMessage}
                </div>
              )}
            </div>

            <div className="space-y-8">
              {/* 醫療狀況 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">目前醫療狀況</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {commonConditions.map((condition) => (
                    <button
                      key={condition}
                      onClick={() => handleConditionToggle(condition, 'conditions')}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${
                        medicalConditions.conditions.includes(condition)
                          ? 'bg-blue-50 border-blue-200 text-blue-800'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{condition}</span>
                        {medicalConditions.conditions.includes(condition) && (
                          <span className="text-blue-500">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 過敏原 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">已知過敏原</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {commonAllergens.map((allergen) => (
                    <button
                      key={allergen}
                      onClick={() => handleConditionToggle(allergen, 'allergies')}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${
                        medicalConditions.allergies.includes(allergen)
                          ? 'bg-red-50 border-red-200 text-red-800'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{allergen}</span>
                        {medicalConditions.allergies.includes(allergen) && (
                          <span className="text-red-500">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 飲食限制 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">飲食限制偏好</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {commonDietaryRestrictions.map((restriction) => (
                    <button
                      key={restriction}
                      onClick={() => handleConditionToggle(restriction, 'dietaryRestrictions')}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${
                        medicalConditions.dietaryRestrictions.includes(restriction)
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{restriction}</span>
                        {medicalConditions.dietaryRestrictions.includes(restriction) && (
                          <span className="text-green-500">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 儲存按鈕 */}
              <div className="pt-4 border-t">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium"
                >
                  {isSaving ? '儲存中...' : '💾 儲存設定'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 系統資訊 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">ℹ️ 系統資訊</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 資料儲存：所有設定保存在 Supabase 資料庫</p>
            <p>• 資料安全：啟用 Row Level Security 保護個人資料</p>
            <p>• 認證方式：Google OAuth 2.0 安全登入</p>
            <p>• 版本：v4.0.0 - Supabase 架構</p>
          </div>
        </div>
      </div>
    </div>
  )
}