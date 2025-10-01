'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TutorialStep {
  id: number
  title: string
  content: string
  feature: string
  icon: string
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: '食物搜索功能',
    content: '使用智能搜索功能快速找到您想記錄的食物。我們的資料庫包含數千種食物，並會根據您的醫療條件提供個人化建議。',
    feature: 'food-search',
    icon: '🔍'
  },
  {
    id: 2,
    title: '醫療評分系統',
    content: '每種食物都會根據您的醫療條件獲得個人化評分。綠色表示推薦，黃色表示適中，紅色表示需要謹慎考慮。',
    feature: 'medical-scoring',
    icon: '⭐'
  },
  {
    id: 3,
    title: '症狀記錄功能',
    content: '記錄您的身體症狀，系統會分析食物與症狀的關聯性，幫助您識別可能的觸發食物。',
    feature: 'symptom-tracking',
    icon: '📝'
  },
  {
    id: 4,
    title: '完成！開始使用',
    content: '現在您已經準備好開始使用 Diet Daily！記住，持續記錄是獲得準確分析的關鍵。',
    feature: 'completion',
    icon: '🎉'
  }
]

export default function TutorialPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)
  const router = useRouter()

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = async () => {
    setIsCompleting(true)

    try {
      // Mark tutorial as completed
      localStorage.setItem('tutorial-completed', 'true')

      // Simulate completion process
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to complete tutorial:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleSkip = () => {
    localStorage.setItem('tutorial-completed', 'true')
    router.push('/dashboard')
  }

  const currentTutorialStep = TUTORIAL_STEPS[currentStep]
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1

  return (
    <div className="min-h-screen bg-gray-900 bg-opacity-95 flex items-center justify-center p-4">
      {/* Tutorial Overlay */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8" data-testid="tutorial-overlay">
        {/* Skip Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            跳過教學
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              步驟 {currentStep + 1} / {TUTORIAL_STEPS.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / TUTORIAL_STEPS.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Tutorial Content */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{currentTutorialStep.icon}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {currentTutorialStep.title}
          </h2>
          <p className="text-gray-600 leading-relaxed">
            {currentTutorialStep.content}
          </p>
        </div>

        {/* Feature Preview */}
        <div className="bg-gray-50 rounded-lg p-4 mb-8">
          <div className="text-sm text-gray-600 mb-2">功能預覽：</div>
          {currentTutorialStep.feature === 'food-search' && (
            <div className="flex items-center space-x-2 p-3 bg-white rounded border">
              <div className="w-4 h-4 text-gray-400">🔍</div>
              <input
                type="text"
                placeholder="搜索食物..."
                className="flex-1 text-sm bg-transparent outline-none"
                readOnly
              />
            </div>
          )}
          {currentTutorialStep.feature === 'medical-scoring' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="text-sm">白米飯</span>
                <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">推薦</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <span className="text-sm">全麥麵包</span>
                <span className="px-2 py-1 bg-yellow-500 text-white text-xs rounded">適中</span>
              </div>
            </div>
          )}
          {currentTutorialStep.feature === 'symptom-tracking' && (
            <div className="p-3 bg-white rounded border">
              <div className="text-sm text-gray-600 mb-2">今日症狀：</div>
              <div className="flex space-x-2">
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">腹痛</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">脹氣</span>
              </div>
            </div>
          )}
          {currentTutorialStep.feature === 'completion' && (
            <div className="text-center p-4">
              <div className="text-2xl mb-2">🎯</div>
              <div className="text-sm text-gray-600">準備好開始您的健康飲食之旅！</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            上一步
          </button>

          <div className="flex space-x-2">
            {TUTORIAL_STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStep ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {isLastStep ? (
            <button
              onClick={handleFinish}
              disabled={isCompleting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
              data-testid="tutorial-finish"
            >
              {isCompleting ? '完成中...' : '開始使用'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
              data-testid="tutorial-next"
            >
              下一步
            </button>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="text-blue-500 text-sm">💡</div>
            <div className="text-blue-800 text-sm">
              <strong>提示：</strong>
              {currentStep === 0 && '您可以隨時在設定中找到搜索幫助。'}
              {currentStep === 1 && '評分會根據您的醫療條件動態調整。'}
              {currentStep === 2 && '記錄症狀有助於發現飲食模式。'}
              {currentStep === 3 && '記住定期更新您的醫療資料以獲得最佳建議。'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}