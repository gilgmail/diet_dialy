'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MedicalCondition {
  id: string
  name: string
  description: string
}

interface UserProfile {
  age: string
  gender: string
  weight: string
  height: string
}

const MEDICAL_CONDITIONS: MedicalCondition[] = [
  { id: 'IBD', name: 'IBD (炎症性腸病)', description: '包括克羅恩病和潰瘍性結腸炎' },
  { id: 'IBS', name: 'IBS (腸易激綜合征)', description: '功能性胃腸疾病' },
  { id: 'Diabetes', name: '糖尿病', description: '血糖調節障礙' },
  { id: 'Hypertension', name: '高血壓', description: '血壓持續升高' },
  { id: 'HeartDisease', name: '心臟病', description: '心血管疾病' },
  { id: 'KidneyDisease', name: '腎臟疾病', description: '腎功能相關疾病' }
]

export default function MedicalSetupPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [allergies, setAllergies] = useState<string[]>([])
  const [newAllergy, setNewAllergy] = useState('')
  const [userProfile, setUserProfile] = useState<UserProfile>({
    age: '',
    gender: '',
    weight: '',
    height: ''
  })
  const [isCompleting, setIsCompleting] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  const router = useRouter()

  const handleConditionToggle = (conditionId: string) => {
    setSelectedConditions(prev =>
      prev.includes(conditionId)
        ? prev.filter(id => id !== conditionId)
        : [...prev, conditionId]
    )
  }

  const handleAddAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies(prev => [...prev, newAllergy.trim()])
      setNewAllergy('')
    }
  }

  const handleRemoveAllergy = (allergy: string) => {
    setAllergies(prev => prev.filter(a => a !== allergy))
  }

  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setUserProfile(prev => ({ ...prev, [field]: value }))
  }

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCompleteSetup = async () => {
    setIsCompleting(true)

    try {
      // Save medical profile data
      const profileData = {
        conditions: selectedConditions,
        allergies,
        profile: userProfile,
        setupCompleted: true
      }

      // Store in localStorage for now (in real app, save to Supabase)
      localStorage.setItem('medical-profile', JSON.stringify(profileData))

      await new Promise(resolve => setTimeout(resolve, 1500))
      setShowCompletion(true)

      setTimeout(() => {
        router.push('/tutorial')
      }, 2000)
    } catch (error) {
      console.error('Failed to save medical profile:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return selectedConditions.length > 0
      case 2:
        return true // Allergies are optional
      case 3:
        return userProfile.age && userProfile.gender && userProfile.weight && userProfile.height
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">醫療檔案設定</h1>
          <p className="text-gray-600">幫助我們為您提供個人化的飲食建議</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step < currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>醫療條件</span>
            <span>過敏原</span>
            <span>個人資料</span>
          </div>
        </div>

        {/* Setup Wizard */}
        <div className="bg-white shadow rounded-lg p-6" data-testid="medical-setup-wizard">
          {/* Step 1: Medical Conditions */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">選擇您的醫療條件</h2>
                <p className="text-gray-600 mb-6">選擇適用於您的醫療條件，這將幫助我們提供更準確的飲食建議。</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MEDICAL_CONDITIONS.map((condition) => (
                  <div key={condition.id} className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedConditions.includes(condition.id)}
                        onChange={() => handleConditionToggle(condition.id)}
                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        data-testid={`condition-${condition.id}`}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {condition.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {condition.description}
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleNextStep}
                  disabled={!canProceedToNextStep()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="next-step"
                >
                  下一步
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Allergies */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">設定過敏原</h2>
                <p className="text-gray-600 mb-6">添加您已知的食物過敏原，我們會在推薦食物時提醒您。</p>
              </div>

              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    placeholder="輸入過敏原 (如: 花生、牛奶)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    data-testid="allergy-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddAllergy()}
                  />
                  <button
                    onClick={handleAddAllergy}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium"
                    data-testid="add-allergy"
                  >
                    添加
                  </button>
                </div>

                {allergies.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">已添加的過敏原：</p>
                    <div className="flex flex-wrap gap-2">
                      {allergies.map((allergy) => (
                        <span
                          key={allergy}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                        >
                          {allergy}
                          <button
                            onClick={() => handleRemoveAllergy(allergy)}
                            className="ml-2 text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handlePrevStep}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium"
                >
                  上一步
                </button>
                <button
                  onClick={handleNextStep}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium"
                  data-testid="next-step"
                >
                  下一步
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Personal Profile */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">個人資料</h2>
                <p className="text-gray-600 mb-6">提供基本信息以計算個人化的營養需求。</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                    年齡
                  </label>
                  <input
                    type="number"
                    id="age"
                    value={userProfile.age}
                    onChange={(e) => handleProfileChange('age', e.target.value)}
                    placeholder="輸入年齡"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    data-testid="profile-age"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                    性別
                  </label>
                  <select
                    id="gender"
                    value={userProfile.gender}
                    onChange={(e) => handleProfileChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    data-testid="profile-gender"
                  >
                    <option value="">請選擇</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2">
                    體重 (公斤)
                  </label>
                  <input
                    type="number"
                    id="weight"
                    value={userProfile.weight}
                    onChange={(e) => handleProfileChange('weight', e.target.value)}
                    placeholder="輸入體重"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    data-testid="profile-weight"
                  />
                </div>

                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-2">
                    身高 (公分)
                  </label>
                  <input
                    type="number"
                    id="height"
                    value={userProfile.height}
                    onChange={(e) => handleProfileChange('height', e.target.value)}
                    placeholder="輸入身高"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    data-testid="profile-height"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={handlePrevStep}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-md font-medium"
                >
                  上一步
                </button>
                <button
                  onClick={handleCompleteSetup}
                  disabled={!canProceedToNextStep() || isCompleting}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="complete-setup"
                >
                  {isCompleting ? '儲存中...' : '完成設定'}
                </button>
              </div>
            </div>
          )}

          {/* Completion Message */}
          {showCompletion && (
            <div className="text-center py-8" data-testid="setup-completion">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">設定完成！</h3>
              <p className="text-gray-600 mb-4">
                您的醫療檔案已儲存，正在為您準備個人化的使用教學...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}