'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { userFeedbackService, type UserFoodFeedback } from '@/lib/supabase/user-feedback-service'
import { useAuth } from '@/hooks/useAuth'

interface IBDScoreFeedbackProps {
  foodId: string
  foodName: string
  aiPredictedScore: number
  onFeedbackSubmitted?: () => void
}

export default function IBDScoreFeedback({
  foodId,
  foodName,
  aiPredictedScore,
  onFeedbackSubmitted
}: IBDScoreFeedbackProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [feedback, setFeedback] = useState<Partial<UserFoodFeedback>>({
    ai_predicted_score: aiPredictedScore,
    symptoms_experienced: [],
    consumed_with_other_foods: false,
    medication_changes: false,
    would_eat_again: undefined
  })

  const symptomsOptions = [
    { id: 'bloating', label: '腹脹' },
    { id: 'abdominal_pain', label: '腹痛' },
    { id: 'diarrhea', label: '腹瀉' },
    { id: 'constipation', label: '便秘' },
    { id: 'gas', label: '脹氣' },
    { id: 'nausea', label: '噁心' },
    { id: 'fatigue', label: '疲勞' },
    { id: 'joint_pain', label: '關節痛' }
  ]

  const handleSymptomChange = (symptomId: string, checked: boolean) => {
    const currentSymptoms = feedback.symptoms_experienced || []
    if (checked) {
      setFeedback(prev => ({
        ...prev,
        symptoms_experienced: [...currentSymptoms, symptomId]
      }))
    } else {
      setFeedback(prev => ({
        ...prev,
        symptoms_experienced: currentSymptoms.filter(s => s !== symptomId)
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      alert('請先登入才能提交反饋')
      return
    }

    // 驗證必填欄位
    if (!feedback.user_actual_experience || !feedback.score_accuracy_rating) {
      alert('請填寫實際體驗評分和準確度評分')
      return
    }

    setIsSubmitting(true)

    try {
      const feedbackData: UserFoodFeedback = {
        user_id: user.id,
        food_id: foodId,
        ai_predicted_score: aiPredictedScore,
        user_actual_experience: feedback.user_actual_experience,
        score_accuracy_rating: feedback.score_accuracy_rating,
        symptoms_experienced: feedback.symptoms_experienced || [],
        symptom_severity: feedback.symptom_severity,
        symptom_onset_time: feedback.symptom_onset_time,
        symptom_duration: feedback.symptom_duration,
        portion_consumed: feedback.portion_consumed,
        preparation_method: feedback.preparation_method,
        consumed_with_other_foods: feedback.consumed_with_other_foods,
        other_foods_consumed: feedback.other_foods_consumed,
        current_ibd_phase: feedback.current_ibd_phase,
        stress_level: feedback.stress_level,
        sleep_quality: feedback.sleep_quality,
        medication_changes: feedback.medication_changes,
        detailed_feedback: feedback.detailed_feedback,
        would_eat_again: feedback.would_eat_again,
        alternative_suggestions: feedback.alternative_suggestions,
        consumed_at: new Date().toISOString()
      }

      const result = await userFeedbackService.submitFoodFeedback(feedbackData)

      if (result) {
        setSubmitted(true)
        onFeedbackSubmitted?.()
      } else {
        alert('提交失敗，請稍後再試')
      }
    } catch (error) {
      console.error('提交反饋錯誤:', error)
      alert('提交失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-green-600 text-lg font-semibold mb-2">
              感謝您的反饋！
            </div>
            <p className="text-gray-600">
              您的回饋將幫助我們改善 IBD 評分系統的準確性
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">
          📝 IBD 評分反饋 - {foodName}
        </CardTitle>
        <p className="text-sm text-gray-600">
          AI 預測評分：<span className="font-semibold">{aiPredictedScore}</span> 分
          <span className="ml-2 text-xs">
            (0=不合適 1=謹慎 2=適中 3=推薦)
          </span>
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 實際體驗評分 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              您的實際體驗評分 *
            </Label>
            <RadioGroup
              value={feedback.user_actual_experience?.toString() || ""}
              onValueChange={(value) => setFeedback(prev => ({
                ...prev,
                user_actual_experience: parseInt(value)
              }))}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0" id="exp-0" />
                <Label htmlFor="exp-0" className="text-sm">0 - 不合適</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="exp-1" />
                <Label htmlFor="exp-1" className="text-sm">1 - 謹慎</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="exp-2" />
                <Label htmlFor="exp-2" className="text-sm">2 - 適中</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3" id="exp-3" />
                <Label htmlFor="exp-3" className="text-sm">3 - 推薦</Label>
              </div>
            </RadioGroup>
          </div>

          {/* 評分準確度 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              AI 評分準確度 *
            </Label>
            <RadioGroup
              value={feedback.score_accuracy_rating?.toString() || ""}
              onValueChange={(value) => setFeedback(prev => ({
                ...prev,
                score_accuracy_rating: parseInt(value)
              }))}
              className="flex space-x-4"
            >
              {[1, 2, 3, 4, 5].map(rating => (
                <div key={rating} className="flex items-center space-x-2">
                  <RadioGroupItem value={rating.toString()} id={`acc-${rating}`} />
                  <Label htmlFor={`acc-${rating}`} className="text-sm">{rating}</Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-gray-500">
              1=非常不準確，3=普通，5=非常準確
            </p>
          </div>

          {/* 症狀體驗 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">食用後出現的症狀</Label>
            <div className="grid grid-cols-2 gap-2">
              {symptomsOptions.map(symptom => (
                <div key={symptom.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={symptom.id}
                    checked={feedback.symptoms_experienced?.includes(symptom.id) || false}
                    onCheckedChange={(checked) =>
                      handleSymptomChange(symptom.id, checked as boolean)
                    }
                  />
                  <Label htmlFor={symptom.id} className="text-sm">
                    {symptom.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* 症狀嚴重度 */}
          {feedback.symptoms_experienced && feedback.symptoms_experienced.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">症狀嚴重度 (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={feedback.symptom_severity || ''}
                onChange={(e) => setFeedback(prev => ({
                  ...prev,
                  symptom_severity: parseInt(e.target.value) || undefined
                }))}
                placeholder="0=無症狀，10=極嚴重"
              />
            </div>
          )}

          {/* 食用情況 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">食用份量 (克)</Label>
              <Input
                type="number"
                value={feedback.portion_consumed || ''}
                onChange={(e) => setFeedback(prev => ({
                  ...prev,
                  portion_consumed: parseFloat(e.target.value) || undefined
                }))}
                placeholder="例如：100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">製備方式</Label>
              <Input
                value={feedback.preparation_method || ''}
                onChange={(e) => setFeedback(prev => ({
                  ...prev,
                  preparation_method: e.target.value
                }))}
                placeholder="例如：水煮、清蒸、油炸"
              />
            </div>
          </div>

          {/* 個人狀況 */}
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">目前 IBD 狀態</Label>
              <RadioGroup
                value={feedback.current_ibd_phase || ""}
                onValueChange={(value) => setFeedback(prev => ({
                  ...prev,
                  current_ibd_phase: value as any
                }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="remission" id="phase-remission" />
                  <Label htmlFor="phase-remission" className="text-sm">緩解期</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mild_active" id="phase-mild" />
                  <Label htmlFor="phase-mild" className="text-sm">輕度活動期</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="moderate_active" id="phase-moderate" />
                  <Label htmlFor="phase-moderate" className="text-sm">中度活動期</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="severe_active" id="phase-severe" />
                  <Label htmlFor="phase-severe" className="text-sm">重度活動期</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="would-eat-again"
                checked={feedback.would_eat_again || false}
                onCheckedChange={(checked) => setFeedback(prev => ({
                  ...prev,
                  would_eat_again: checked as boolean
                }))}
              />
              <Label htmlFor="would-eat-again" className="text-sm">
                我願意再次食用這個食物
              </Label>
            </div>
          </div>

          {/* 詳細反饋 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">詳細反饋或建議</Label>
            <Textarea
              value={feedback.detailed_feedback || ''}
              onChange={(e) => setFeedback(prev => ({
                ...prev,
                detailed_feedback: e.target.value
              }))}
              placeholder="分享您的詳細體驗、建議或其他想法..."
              rows={3}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? '提交中...' : '提交反饋'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}