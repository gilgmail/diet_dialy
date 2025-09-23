'use client'

import { useState, useEffect } from 'react'
import { ibdScoringService } from '@/lib/supabase/ibd-scoring-service'
import { ibdNutritionistScorer } from '@/lib/ai/ibd-nutritionist-scorer'
import type { Food } from '@/types/supabase'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Lightbulb,
  RefreshCw,
  TrendingUp,
  Info
} from 'lucide-react'

interface IBDScoreDisplayProps {
  food: Food
  showDetails?: boolean
  allowRescoring?: boolean
  onScoreUpdate?: (score: any) => void
}

interface IBDScore {
  score: 0 | 1 | 2 | 3
  reasoning: string[]
  recommendations: string
  confidence: number
  warning?: string
  scored_at?: string
}

export function IBDScoreDisplay({
  food,
  showDetails = true,
  allowRescoring = false,
  onScoreUpdate
}: IBDScoreDisplayProps) {
  const [ibdScore, setIbdScore] = useState<IBDScore | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRescoring, setIsRescoring] = useState(false)

  // 載入 IBD 評分
  useEffect(() => {
    loadIBDScore()
  }, [food.id])

  const loadIBDScore = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const scoredFood = await ibdScoringService.getFoodIBDScore(food.id)

      if (scoredFood?.ibd_score !== null && scoredFood?.ibd_score !== undefined) {
        setIbdScore({
          score: scoredFood.ibd_score as 0 | 1 | 2 | 3,
          reasoning: scoredFood.ibd_reasoning || [],
          recommendations: scoredFood.ibd_recommendations || '',
          confidence: scoredFood.ibd_confidence || 0,
          warning: scoredFood.ibd_warning,
          scored_at: scoredFood.ibd_scored_at
        })
      } else {
        // 如果沒有評分，自動進行評分
        await generateScore()
      }
    } catch (error) {
      console.error('載入 IBD 評分失敗:', error)
      setError('載入評分失敗')
    } finally {
      setIsLoading(false)
    }
  }

  const generateScore = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const score = await ibdScoringService.scoreFood(food.id)

      if (score) {
        setIbdScore(score)
        onScoreUpdate?.(score)
      } else {
        setError('評分生成失敗')
      }
    } catch (error) {
      console.error('生成 IBD 評分失敗:', error)
      setError('評分生成失敗')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRescore = async () => {
    setIsRescoring(true)

    try {
      const newScore = await ibdScoringService.rescoreFood(food.id)

      if (newScore) {
        setIbdScore(newScore)
        onScoreUpdate?.(newScore)
      }
    } catch (error) {
      console.error('重新評分失敗:', error)
      setError('重新評分失敗')
    } finally {
      setIsRescoring(false)
    }
  }

  const getScoreConfig = (score: number) => {
    const explanations = ibdNutritionistScorer.getScoreExplanation()
    return explanations[score as keyof typeof explanations]
  }

  const getScoreIcon = (score: number) => {
    switch (score) {
      case 0: return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 1: return <Shield className="w-5 h-5 text-orange-500" />
      case 2: return <Clock className="w-5 h-5 text-yellow-500" />
      case 3: return <CheckCircle className="w-5 h-5 text-green-500" />
      default: return <Info className="w-5 h-5 text-gray-500" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isLoading && !ibdScore) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 bg-gray-300 rounded"></div>
          <div className="h-4 bg-gray-300 rounded w-24"></div>
        </div>
        <div className="mt-2 h-3 bg-gray-300 rounded w-48"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
          <button
            onClick={loadIBDScore}
            className="text-red-600 hover:text-red-800 text-sm underline"
          >
            重試
          </button>
        </div>
      </div>
    )
  }

  if (!ibdScore) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-gray-500" />
            <span className="text-gray-600">尚未評分</span>
          </div>
          <button
            onClick={generateScore}
            disabled={isLoading}
            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '評分中...' : '開始評分'}
          </button>
        </div>
      </div>
    )
  }

  const scoreConfig = getScoreConfig(ibdScore.score)

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* 評分標題 */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getScoreIcon(ibdScore.score)}
            <div>
              <h3 className="font-semibold text-gray-900">IBD 營養師評分</h3>
              <p className="text-sm text-gray-600">專業營養師 AI 評估</p>
            </div>
          </div>
          {allowRescoring && (
            <button
              onClick={handleRescore}
              disabled={isRescoring}
              className="text-blue-600 hover:text-blue-800 p-1 rounded"
              title="重新評分"
            >
              <RefreshCw className={`w-4 h-4 ${isRescoring ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* 評分內容 */}
      <div className="p-4 space-y-4">
        {/* 評分數值 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span
                className="text-2xl font-bold"
                style={{ color: scoreConfig.color }}
              >
                {ibdScore.score}
              </span>
              <span className="text-gray-600">/3</span>
            </div>
            <div
              className="text-sm font-medium"
              style={{ color: scoreConfig.color }}
            >
              {scoreConfig.label}
            </div>
          </div>

          <div className="text-right">
            <div className={`text-sm ${getConfidenceColor(ibdScore.confidence)}`}>
              信心度: {Math.round(ibdScore.confidence * 100)}%
            </div>
            {ibdScore.scored_at && (
              <div className="text-xs text-gray-500 mt-1">
                {new Date(ibdScore.scored_at).toLocaleDateString('zh-TW')}
              </div>
            )}
          </div>
        </div>

        {/* 評分說明 */}
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: scoreConfig.color + '10' }}
        >
          <p className="text-sm text-gray-700">{scoreConfig.description}</p>
          <p className="text-sm font-medium mt-1" style={{ color: scoreConfig.color }}>
            {scoreConfig.advice}
          </p>
        </div>

        {/* 警告訊息 */}
        {ibdScore.warning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">{ibdScore.warning}</p>
            </div>
          </div>
        )}

        {showDetails && (
          <>
            {/* 評分理由 */}
            {ibdScore.reasoning.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-1" />
                  評分理由
                </h4>
                <ul className="space-y-1">
                  {ibdScore.reasoning.map((reason, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-gray-400 mr-2">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 營養師建議 */}
            {ibdScore.recommendations && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  營養師建議
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {ibdScore.recommendations}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 免責聲明 */}
      <div className="px-4 py-2 bg-gray-50 border-t">
        <p className="text-xs text-gray-500">
          * 此評分由 AI 營養師系統提供，僅供參考。請諮詢專業醫療人員獲得個人化建議。
        </p>
      </div>
    </div>
  )
}

// 簡化版本的評分顯示
export function IBDScoreBadge({ food }: { food: Food }) {
  const [score, setScore] = useState<number | null>(null)

  useEffect(() => {
    const loadScore = async () => {
      const scoredFood = await ibdScoringService.getFoodIBDScore(food.id)
      if (scoredFood?.ibd_score !== null && scoredFood?.ibd_score !== undefined) {
        setScore(scoredFood.ibd_score)
      }
    }
    loadScore()
  }, [food.id])

  if (score === null) return null

  const scoreConfig = ibdNutritionistScorer.getScoreExplanation()[score as keyof ReturnType<typeof ibdNutritionistScorer.getScoreExplanation>]

  return (
    <div
      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: scoreConfig.color + '20',
        color: scoreConfig.color
      }}
    >
      <span className="mr-1">{score}</span>
      <span>{scoreConfig.label}</span>
    </div>
  )
}