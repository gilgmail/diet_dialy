'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { userFeedbackService } from '@/lib/supabase/user-feedback-service'

interface FeedbackMetrics {
  totalUsersWithFeedback: number
  avgFeedbackPerUser: number
  highQualityFeedbackRate: number
  totalImprovementSuggestions: number
  implementedSuggestions: number
}

interface FoodAccuracyData {
  food_id: string
  food_name: string
  current_score: number
  feedback_count: number
  avg_user_score: number
  accuracy_rate: number
  recommended_adjustment: number
  confidence_level: string
}

export default function FeedbackAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<FeedbackMetrics | null>(null)
  const [lowAccuracyFoods, setLowAccuracyFoods] = useState<FoodAccuracyData[]>([])
  const [needsImprovement, setNeedsImprovement] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // 並行載入多個數據源
      const [metricsData, accuracyData, improvementData] = await Promise.all([
        userFeedbackService.getFeedbackQualityReport(),
        userFeedbackService.analyzeFoodScoringAccuracy(),
        userFeedbackService.getFoodsNeedingImprovement()
      ])

      setMetrics(metricsData)
      setLowAccuracyFoods(accuracyData.filter(food =>
        food.accuracy_rate < 0.7 && food.feedback_count >= 5
      ))
      setNeedsImprovement(improvementData)
    } catch (error) {
      console.error('載入儀表板數據失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score === 0) return 'bg-red-500'
    if (score === 1) return 'bg-yellow-500'
    if (score === 2) return 'bg-blue-500'
    if (score === 3) return 'bg-green-500'
    return 'bg-gray-500'
  }

  const getConfidenceBadge = (level: string) => {
    const colors = {
      'high': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-orange-100 text-orange-800',
      'insufficient': 'bg-red-100 text-red-800'
    }
    return (
      <Badge className={colors[level as keyof typeof colors] || colors.insufficient}>
        {level === 'high' ? '高' :
         level === 'medium' ? '中' :
         level === 'low' ? '低' : '不足'}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-8 bg-gray-300 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 總體指標 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {metrics?.totalUsersWithFeedback || 0}
            </div>
            <p className="text-gray-600 text-sm">提供反饋的用戶</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {metrics?.avgFeedbackPerUser?.toFixed(1) || '0'}
            </div>
            <p className="text-gray-600 text-sm">平均每用戶反饋數</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {((metrics?.highQualityFeedbackRate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-gray-600 text-sm">高品質反饋率</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {metrics?.implementedSuggestions || 0}/{metrics?.totalImprovementSuggestions || 0}
            </div>
            <p className="text-gray-600 text-sm">已實施改進建議</p>
          </CardContent>
        </Card>
      </div>

      {/* 準確度較低的食物 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 評分準確度較低的食物
            <Badge variant="secondary">
              需要改進
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowAccuracyFoods.length === 0 ? (
            <p className="text-gray-600 text-center py-4">
              所有食物的評分準確度都很好！
            </p>
          ) : (
            <div className="space-y-4">
              {lowAccuracyFoods.map((food) => (
                <div
                  key={food.food_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{food.food_name}</h3>
                      {getConfidenceBadge(food.confidence_level)}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span>AI評分:</span>
                        <span className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center ${getScoreColor(food.current_score)}`}>
                          {food.current_score}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span>用戶平均:</span>
                        <span className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center ${getScoreColor(Math.round(food.avg_user_score))}`}>
                          {food.avg_user_score.toFixed(1)}
                        </span>
                      </div>

                      <div>
                        反饋數: {food.feedback_count}
                      </div>
                    </div>

                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span>準確率:</span>
                        <Progress
                          value={food.accuracy_rate * 100}
                          className="flex-1 max-w-32"
                        />
                        <span>{(food.accuracy_rate * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {food.recommended_adjustment !== 0 && (
                      <div className="text-sm">
                        <span className="text-gray-600">建議調整:</span>
                        <span className={`ml-1 font-medium ${
                          food.recommended_adjustment > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {food.recommended_adjustment > 0 ? '+' : ''}
                          {food.recommended_adjustment.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 需要改進的食物列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚠️ 優先改進食物
            <Badge variant="destructive">
              緊急
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {needsImprovement.length === 0 ? (
            <p className="text-gray-600 text-center py-4">
              沒有需要緊急改進的食物
            </p>
          ) : (
            <div className="space-y-3">
              {needsImprovement.slice(0, 10).map((food) => (
                <div
                  key={food.food_id}
                  className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50"
                >
                  <div>
                    <h4 className="font-medium">{food.food_name}</h4>
                    <div className="text-sm text-gray-600">
                      分類: {food.category} |
                      反饋數: {food.total_feedback_count} |
                      準確率: {(food.accuracy_rate * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-red-600 font-medium">
                      偏差: {food.score_deviation?.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作按鈕 */}
      <div className="flex gap-4">
        <Button onClick={loadDashboardData} variant="outline">
          🔄 重新載入數據
        </Button>

        <Button
          onClick={() => window.location.href = '/admin/food-verification'}
          variant="default"
        >
          📊 前往食物驗證
        </Button>
      </div>
    </div>
  )
}