/**
 * Filtered AI Analysis Component
 * Displays AI analysis results based on user's medical conditions and permissions
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Shield, AlertTriangle, Info } from 'lucide-react'
import type { FilteredAnalysisResult } from '@/lib/medical-access-control'

interface FilteredAIAnalysisProps {
  result: FilteredAnalysisResult
  showPermissionInfo?: boolean
  className?: string
}

export function FilteredAIAnalysis({
  result,
  showPermissionInfo = true,
  className = ""
}: FilteredAIAnalysisProps) {
  if (!result.success) {
    return (
      <Alert className={`${className} border-red-200`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          AI分析失敗：{result.filtered_reason || '未知錯誤'}
        </AlertDescription>
      </Alert>
    )
  }

  const getAccessLevelBadge = () => {
    switch (result.access_level) {
      case 'admin':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">
          <Shield className="w-3 h-3 mr-1" />
          管理員完整檢視
        </Badge>
      case 'personalized':
        return <Badge variant="default" className="bg-green-100 text-green-800">
          <Info className="w-3 h-3 mr-1" />
          個人化分析
        </Badge>
      case 'basic':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <Info className="w-3 h-3 mr-1" />
          基本分析
        </Badge>
      case 'partial':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <Info className="w-3 h-3 mr-1" />
          個人化分析
        </Badge>
      case 'none':
        return <Badge variant="outline" className="bg-gray-100 text-gray-600">
          基本資訊
        </Badge>
      default:
        return null
    }
  }

  const getScoreDisplay = (score: number) => {
    const colors = {
      1: 'text-red-600 bg-red-50',
      2: 'text-orange-600 bg-orange-50',
      3: 'text-yellow-600 bg-yellow-50',
      4: 'text-green-600 bg-green-50',
      5: 'text-emerald-600 bg-emerald-50'
    }
    return colors[score as keyof typeof colors] || 'text-gray-600 bg-gray-50'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with access level */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{result.food_name} - AI營養分析</CardTitle>
            {showPermissionInfo && getAccessLevelBadge()}
          </div>

          {result.overall_score && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-gray-600">整體評分：</span>
              <div className={`px-3 py-1 rounded-full font-medium ${getScoreDisplay(result.overall_score)}`}>
                {result.overall_score}/5
              </div>
            </div>
          )}
        </CardHeader>

        {/* Enhanced access level information */}
        {showPermissionInfo && result.general_analysis?.filtered_note && (
          <CardContent className="pt-0">
            <Alert className={`${
              result.access_level === 'basic' ? 'border-blue-200 bg-blue-50' :
              result.access_level === 'personalized' ? 'border-green-200 bg-green-50' :
              'border-blue-200 bg-blue-50'
            }`}>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {result.general_analysis.filtered_note}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}

        {/* Legacy fallback for access level explanation */}
        {showPermissionInfo && result.access_level === 'none' && result.filtered_reason && (
          <CardContent className="pt-0">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4" />
              <AlertDescription>
                {result.filtered_reason}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Condition-specific Analysis */}
      {result.visible_conditions && result.visible_conditions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">醫療狀況分析</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.visible_conditions.map((condition, index) => (
              <div key={index} className={`border rounded-lg p-4 ${
                condition.is_personalized ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{condition.emoji}</span>
                  <h4 className="font-medium">{condition.condition}</h4>
                  <Badge variant="outline" className={getScoreDisplay(condition.score)}>
                    {condition.score}/5 - {condition.level}
                  </Badge>
                  {condition.is_personalized && (
                    <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                      個人化
                    </Badge>
                  )}
                </div>

                {condition.relevance_note && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-600">{condition.relevance_note}</p>
                  </div>
                )}

                {condition.reasoning && condition.reasoning.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">分析要點：</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {condition.reasoning.map((reason: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {condition.recommendations && condition.recommendations.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">建議：</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {condition.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-500 mt-1">✓</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {condition.risk_factors && condition.risk_factors.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-red-700 mb-2">風險因素：</h5>
                    <ul className="text-sm text-red-600 space-y-1">
                      {condition.risk_factors.map((risk: string, idx: number) => (
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
                      {condition.nutritional_highlights.map((highlight: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-500 mt-1">★</span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {condition.warnings && condition.warnings.length > 0 && (
                  <Alert className="mt-3 border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {condition.warnings.map((warning: string, idx: number) => (
                          <div key={idx}>{warning}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Allergen Analysis */}
      {result.allergen_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              🚨 過敏原分析
              <Badge
                variant="outline"
                className={
                  result.allergen_analysis.risk_level === 'critical' ? 'border-red-500 text-red-700' :
                  result.allergen_analysis.risk_level === 'high' ? 'border-orange-500 text-orange-700' :
                  result.allergen_analysis.risk_level === 'medium' ? 'border-yellow-500 text-yellow-700' :
                  'border-green-500 text-green-700'
                }
              >
                {result.allergen_analysis.risk_level === 'critical' ? '極高風險' :
                 result.allergen_analysis.risk_level === 'high' ? '高風險' :
                 result.allergen_analysis.risk_level === 'medium' ? '中度風險' : '低風險'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.allergen_analysis.detected_allergens.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">檢測到的過敏原：</h5>
                  <div className="flex flex-wrap gap-2">
                    {result.allergen_analysis.detected_allergens.map((allergen: string, idx: number) => (
                      <Badge key={idx} variant="destructive">{allergen}</Badge>
                    ))}
                  </div>
                </div>

                {result.allergen_analysis.warnings.length > 0 && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {result.allergen_analysis.warnings.map((warning: string, idx: number) => (
                          <div key={idx}>{warning}</div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <p className="text-sm text-green-600">未檢測到常見過敏原</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* General Analysis */}
      {result.general_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">綜合分析</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.general_analysis.reasoning && result.general_analysis.reasoning.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">關鍵要點：</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  {result.general_analysis.reasoning.map((reason: string, idx: number) => (
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
                <h5 className="text-sm font-medium text-gray-700 mb-2">整體建議：</h5>
                <p className="text-sm text-gray-600">{result.general_analysis.recommendations}</p>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                分析方法: {result.general_analysis.method === 'claude_api' ? 'Claude AI' : '本地分析'}
              </span>
              <span>
                信心度: {Math.round((result.general_analysis.confidence || 0) * 100)}%
              </span>
            </div>

            {result.general_analysis.filtered_note && (
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {result.general_analysis.filtered_note}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default FilteredAIAnalysis