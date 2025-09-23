'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import {
  checkIBDSystemReadiness,
  performIBDSecurityChecks,
  validateIBDConfig,
  getIBDConfig
} from '@/lib/config/ibd-system-config'

interface SystemStatus {
  ready: boolean
  claudeAPI: boolean
  database: boolean
  configuration: boolean
  details: string[]
}

interface SecurityCheck {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
}

export default function SystemHealthDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([])
  const [configValidation, setConfigValidation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  useEffect(() => {
    performHealthCheck()
  }, [])

  const performHealthCheck = async () => {
    setLoading(true)
    try {
      // 並行執行所有檢查
      const [statusResult, securityResult, configResult] = await Promise.all([
        checkIBDSystemReadiness(),
        performIBDSecurityChecks(),
        validateIBDConfig()
      ])

      setSystemStatus(statusResult)
      setSecurityChecks(securityResult.checks)
      setConfigValidation(configResult)
      setLastCheck(new Date())
    } catch (error) {
      console.error('健康檢查失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: boolean | string) => {
    if (status === true || status === 'pass') {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    } else if (status === 'warning') {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusBadge = (status: boolean | string, label: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline"
    let className = ""

    if (status === true || status === 'pass') {
      variant = "default"
      className = "bg-green-100 text-green-800 hover:bg-green-200"
    } else if (status === 'warning') {
      variant = "secondary"
      className = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
    } else {
      variant = "destructive"
    }

    return (
      <Badge variant={variant} className={className}>
        {getStatusIcon(status)}
        <span className="ml-2">{label}</span>
      </Badge>
    )
  }

  const config = getIBDConfig()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>執行系統健康檢查...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      {/* 總體狀態 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🏥 IBD 評分系統健康狀態
              {systemStatus?.ready ?
                <CheckCircle className="h-5 w-5 text-green-500" /> :
                <XCircle className="h-5 w-5 text-red-500" />
              }
            </span>
            <Button onClick={performHealthCheck} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              重新檢查
            </Button>
          </CardTitle>
          {lastCheck && (
            <p className="text-sm text-gray-600">
              最後檢查時間: {lastCheck.toLocaleString('zh-TW')}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">
                {systemStatus?.ready ? '正常' : '異常'}
              </div>
              <p className="text-sm text-gray-600">系統狀態</p>
            </div>

            <div className="text-center">
              {getStatusBadge(systemStatus?.claudeAPI, 'Claude API')}
            </div>

            <div className="text-center">
              {getStatusBadge(systemStatus?.database, '資料庫')}
            </div>

            <div className="text-center">
              {getStatusBadge(systemStatus?.configuration, '配置')}
            </div>
          </div>

          {systemStatus?.details && systemStatus.details.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">詳細資訊:</h4>
              <ul className="text-sm space-y-1">
                {systemStatus.details.map((detail, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 配置驗證 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚙️ 配置驗證
            {configValidation?.isValid ?
              <CheckCircle className="h-5 w-5 text-green-500" /> :
              <XCircle className="h-5 w-5 text-red-500" />
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {configValidation?.errors && configValidation.errors.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-red-600 mb-2">配置錯誤:</h4>
              <ul className="space-y-1">
                {configValidation.errors.map((error: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle className="h-4 w-4" />
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {configValidation?.warnings && configValidation.warnings.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-yellow-600 mb-2">配置警告:</h4>
              <ul className="space-y-1">
                {configValidation.warnings.map((warning: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {configValidation?.isValid && (
            <div className="text-green-600 font-medium">
              ✅ 所有配置項目驗證通過
            </div>
          )}
        </CardContent>
      </Card>

      {/* 安全檢查 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🛡️ 安全檢查
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityChecks.map((check, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <div className="font-medium">{check.name}</div>
                    <div className="text-sm text-gray-600">{check.message}</div>
                  </div>
                </div>
                {getStatusBadge(check.status, check.status === 'pass' ? '通過' :
                                              check.status === 'warning' ? '警告' : '失敗')}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 系統配置概覽 */}
      <Card>
        <CardHeader>
          <CardTitle>📊 系統配置概覽</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">評分系統</h4>
              <ul className="text-sm space-y-1">
                <li>狀態: {config.scoring.enabled ? '✅ 啟用' : '❌ 停用'}</li>
                <li>備用模式: {config.scoring.fallbackMode ? '✅ 啟用' : '❌ 停用'}</li>
                <li>批次大小: {config.scoring.batchSize}</li>
                <li>快取時間: {config.scoring.cacheTTL}秒</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Claude API</h4>
              <ul className="text-sm space-y-1">
                <li>模型: {config.claude.model}</li>
                <li>最大 Token: {config.claude.maxTokens}</li>
                <li>溫度: {config.claude.temperature}</li>
                <li>API Key: {config.claude.apiKey ? '✅ 已設定' : '❌ 未設定'}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">反饋系統</h4>
              <ul className="text-sm space-y-1">
                <li>收集: {config.feedback.collectionEnabled ? '✅ 啟用' : '❌ 停用'}</li>
                <li>審核: {config.feedback.moderationEnabled ? '✅ 啟用' : '❌ 停用'}</li>
                <li>分析: {config.feedback.analyticsEnabled ? '✅ 啟用' : '❌ 停用'}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">安全配置</h4>
              <ul className="text-sm space-y-1">
                <li>速率限制: {config.security.rateLimitRequests}/小時</li>
                <li>管理員驗證: {config.security.adminVerificationRequired ? '✅ 啟用' : '❌ 停用'}</li>
                <li>數據加密: {config.security.encryptSensitiveData ? '✅ 啟用' : '❌ 停用'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}