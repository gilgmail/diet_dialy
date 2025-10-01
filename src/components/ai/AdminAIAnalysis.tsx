/**
 * Admin-Level Comprehensive AI Analysis Component
 * Shows complete AI analysis for all medical conditions (admin only)
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Activity, TrendingUp, Users, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import type { MultiConditionResult } from '@/lib/ai/multi-condition-scorer'

interface AdminAIAnalysisProps {
  result: MultiConditionResult
  className?: string
  showMetrics?: boolean
}

export function AdminAIAnalysis({
  result,
  className = "",
  showMetrics = true
}: AdminAIAnalysisProps) {
  const [expandedConditions, setExpandedConditions] = useState<Set<string>>(new Set())
  const [selectedTab, setSelectedTab] = useState('overview')

  const toggleConditionExpanded = (conditionType: string) => {
    const newExpanded = new Set(expandedConditions)
    if (newExpanded.has(conditionType)) {
      newExpanded.delete(conditionType)
    } else {
      newExpanded.add(conditionType)
    }
    setExpandedConditions(newExpanded)
  }

  const getConditionIcon = (conditionType: string) => {
    const icons: Record<string, string> = {
      'IBD': '🔥',
      'IBS': '🌀',
      'CANCER_CHEMO': '🎗️',
      'ALLERGIES': '🚨'
    }
    return icons[conditionType] || '📊'
  }

  const getConditionName = (conditionType: string) => {
    const names: Record<string, string> = {
      'IBD': '炎症性腸病',
      'IBS': '腸躁症',
      'CANCER_CHEMO': '癌症化療',
      'ALLERGIES': '過敏原'
    }
    return names[conditionType] || conditionType
  }

  const getScoreDistribution = () => {
    const scores = result.conditions.map(c => c.score)
    const distribution = [1, 2, 3, 4, 5].map(score => ({
      score,
      count: scores.filter(s => s === score).length,
      percentage: (scores.filter(s => s === score).length / scores.length) * 100
    }))
    return distribution
  }

  const getRiskAssessment = () => {
    const highRiskConditions = result.conditions.filter(c => c.score <= 2)
    const lowRiskConditions = result.conditions.filter(c => c.score >= 4)

    return {
      highRisk: highRiskConditions.length,
      moderate: result.conditions.length - highRiskConditions.length - lowRiskConditions.length,
      lowRisk: lowRiskConditions.length,
      allergenRisk: result.allergen_analysis?.risk_level || 'low'
    }
  }

  if (!result.success) {
    return (
      <Alert className={`${className} border-red-200`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          AI分析失敗：分析過程中發生錯誤
        </AlertDescription>
      </Alert>
    )
  }

  const scoreDistribution = getScoreDistribution()
  const riskAssessment = getRiskAssessment()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Admin Header */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg text-purple-800">
                管理員完整AI分析 - {result.food_name}
              </CardTitle>
            </div>
            <Badge variant="default" className="bg-purple-600">
              完整權限檢視
            </Badge>
          </div>

          <div className="flex items-center gap-6 mt-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-purple-700">整體評分：</span>
              <Badge variant="outline" className="text-purple-800">
                {result.overall_score}/5
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-700">分析時間：</span>
              <span className="text-purple-600">
                {new Date(result.timestamp).toLocaleString('zh-TW')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-700">分析方法：</span>
              <span className="text-purple-600">
                {result.general_analysis.method === 'claude_api' ? 'Claude AI' : '本地分析'}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Analysis Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概覽</TabsTrigger>
          <TabsTrigger value="conditions">醫療狀況</TabsTrigger>
          <TabsTrigger value="allergens">過敏原</TabsTrigger>
          <TabsTrigger value="insights">深度洞察</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {showMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Score Distribution */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    評分分佈
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {scoreDistribution.map(({ score, count, percentage }) => (
                    <div key={score} className="flex items-center justify-between text-sm">
                      <span>{score}分</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{count}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Risk Assessment */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    風險評估
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">高風險</span>
                    <Badge variant="destructive" className="text-xs">{riskAssessment.highRisk}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-yellow-600">中度風險</span>
                    <Badge variant="secondary" className="text-xs">{riskAssessment.moderate}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">低風險</span>
                    <Badge variant="outline" className="text-xs">{riskAssessment.lowRisk}</Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>過敏原風險</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        riskAssessment.allergenRisk === 'critical' ? 'border-red-500 text-red-700' :
                        riskAssessment.allergenRisk === 'high' ? 'border-orange-500 text-orange-700' :
                        riskAssessment.allergenRisk === 'medium' ? 'border-yellow-500 text-yellow-700' :
                        'border-green-500 text-green-700'
                      }`}
                    >
                      {riskAssessment.allergenRisk}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Analysis Quality */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    分析品質
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>信心度</span>
                    <span className="font-medium">
                      {Math.round((result.general_analysis.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>涵蓋狀況</span>
                    <span className="font-medium">{result.conditions.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>過敏原檢測</span>
                    <span className="font-medium">
                      {result.allergen_analysis?.detected_allergens.length || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">快速摘要</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">主要風險：</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {result.conditions
                      .filter(c => c.score <= 2)
                      .map((c, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-red-500">⚠</span>
                          <span>{getConditionName(c.condition)} - {c.level}</span>
                        </li>
                      ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">推薦條件：</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {result.conditions
                      .filter(c => c.score >= 4)
                      .map((c, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-green-500">✓</span>
                          <span>{getConditionName(c.condition)} - {c.level}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conditions Tab */}
        <TabsContent value="conditions" className="space-y-4">
          {result.conditions.map((condition, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleConditionExpanded(condition.condition)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getConditionIcon(condition.condition)}</span>
                    <div>
                      <CardTitle className="text-base">
                        {getConditionName(condition.condition)}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        評分: {condition.score}/5 - {condition.level}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        condition.score <= 2 ? 'border-red-500 text-red-700' :
                        condition.score === 3 ? 'border-yellow-500 text-yellow-700' :
                        'border-green-500 text-green-700'
                      }
                    >
                      {condition.emoji} {condition.score}/5
                    </Badge>
                    {expandedConditions.has(condition.condition) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {expandedConditions.has(condition.condition) && (
                <CardContent className="border-t space-y-4">
                  {condition.reasoning && condition.reasoning.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">分析推理：</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {condition.reasoning.map((reason, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {condition.recommendations && condition.recommendations.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">專業建議：</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {condition.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">✓</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {condition.risk_factors && condition.risk_factors.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-red-700 mb-2">風險因素：</h5>
                      <ul className="text-sm text-red-600 space-y-1">
                        {condition.risk_factors.map((risk, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-500 mt-1">⚠</span>
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {condition.nutritional_highlights && condition.nutritional_highlights.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-green-700 mb-2">營養亮點：</h5>
                      <ul className="text-sm text-green-600 space-y-1">
                        {condition.nutritional_highlights.map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">★</span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {condition.warnings && condition.warnings.length > 0 && (
                    <Alert className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {condition.warnings.map((warning, idx) => (
                            <div key={idx}>{warning}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </TabsContent>

        {/* Allergens Tab */}
        <TabsContent value="allergens" className="space-y-4">
          {result.allergen_analysis ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  🚨 過敏原完整分析
                  <Badge
                    variant="outline"
                    className={
                      result.allergen_analysis.risk_level === 'critical' ? 'border-red-500 text-red-700' :
                      result.allergen_analysis.risk_level === 'high' ? 'border-orange-500 text-orange-700' :
                      result.allergen_analysis.risk_level === 'medium' ? 'border-yellow-500 text-yellow-700' :
                      'border-green-500 text-green-700'
                    }
                  >
                    風險等級: {result.allergen_analysis.risk_level}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.allergen_analysis.detected_allergens.length > 0 ? (
                  <>
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">檢測到的過敏原：</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {result.allergen_analysis.detected_allergens.map((allergen, idx) => (
                          <Badge key={idx} variant="destructive" className="justify-center">
                            {allergen}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {result.allergen_analysis.warnings.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-red-700 mb-2">警告與建議：</h5>
                        <div className="space-y-2">
                          {result.allergen_analysis.warnings.map((warning, idx) => (
                            <Alert key={idx} className="border-red-200 bg-red-50">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>{warning}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Alert className="border-green-200 bg-green-50">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      未檢測到常見過敏原。此食物對一般過敏患者來說相對安全。
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                此次分析未包含過敏原檢測。如需過敏原分析，請確保分析請求中包含過敏相關條件。
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">深度營養洞察</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.general_analysis.reasoning && result.general_analysis.reasoning.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">綜合分析要點：</h5>
                  <ul className="text-sm text-gray-600 space-y-2">
                    {result.general_analysis.reasoning.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.general_analysis.recommendations && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">整體營養建議：</h5>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">{result.general_analysis.recommendations}</p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h6 className="font-medium text-gray-700">技術資訊</h6>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex justify-between">
                      <span>分析引擎:</span>
                      <span className="font-medium">
                        {result.general_analysis.method === 'claude_api' ? 'Claude 3.5 Haiku' : '本地規則引擎'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>信心度:</span>
                      <span className="font-medium">
                        {Math.round((result.general_analysis.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>分析時間:</span>
                      <span className="font-medium">
                        {new Date(result.timestamp).toLocaleTimeString('zh-TW')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h6 className="font-medium text-gray-700">覆蓋範圍</h6>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex justify-between">
                      <span>醫療條件:</span>
                      <span className="font-medium">{result.conditions.length} 個</span>
                    </div>
                    <div className="flex justify-between">
                      <span>過敏原檢測:</span>
                      <span className="font-medium">
                        {result.allergen_analysis ? '已執行' : '未執行'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>總體評估:</span>
                      <span className="font-medium">完整分析</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AdminAIAnalysis