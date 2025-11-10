'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Activity, Bell, DollarSign, ShieldAlert } from 'lucide-react'

interface AIUsageCardProps {
  enabled: boolean
}

interface UsageSummary {
  period: {
    label: string
  }
  totals: {
    callCount: number
    costUsd: number
    inputTokens: number
    outputTokens: number
  }
  features: Array<{
    feature: string
    callCount: number
    costUsd: number
    lastUsedAt?: string
  }>
  recentEvents: Array<{
    feature: string
    costUsd: number
    createdAt: string
  }>
  alertSettings: {
    thresholdUsd: number
    channels: string[]
    lastTriggeredAt?: string | null
  }
  alertStatus: {
    exceeded: boolean
    monthlyCostUsd: number
  }
}

export function AIUsageCard({ enabled }: AIUsageCardProps) {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [allowedChannels, setAllowedChannels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [thresholdInput, setThresholdInput] = useState('')
  const [channelSelection, setChannelSelection] = useState<string[]>([])

  useEffect(() => {
    if (!enabled) return
    loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const loadSummary = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/ai/usage')
      if (!response.ok) {
        throw new Error('Failed to fetch usage summary')
      }
      const data = await response.json()
      setSummary(data.summary)
      setAllowedChannels(data.allowedChannels || [])
      setThresholdInput(String(data.summary.alertSettings.thresholdUsd ?? 0))
      setChannelSelection(data.summary.alertSettings.channels || [])
    } catch (err) {
      console.error(err)
      setError('無法載入 AI 使用資訊，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!thresholdInput) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        thresholdUsd: Number(thresholdInput),
        channels: channelSelection
      }
      const response = await fetch('/api/ai/usage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        throw new Error('Failed to update alert settings')
      }
      const data = await response.json()
      setSummary(data.summary)
      setChannelSelection(data.summary.alertSettings.channels || [])
      setThresholdInput(String(data.summary.alertSettings.thresholdUsd))
    } catch (err) {
      console.error(err)
      setError('更新提醒設定失敗')
    } finally {
      setSaving(false)
    }
  }

  const progress = useMemo(() => {
    if (!summary) return 0
    const value = summary.totals.costUsd
    const threshold = Number(summary.alertSettings.thresholdUsd || 1)
    return Math.min(100, Math.round((value / threshold) * 100))
  }, [summary])

  if (!enabled) {
    return null
  }

  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">AI 成本監控</CardTitle>
          <CardDescription>{summary?.period.label || '本月成本與使用量'}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={loadSummary} disabled={loading}>
          重新整理
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>載入失敗</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {summary?.alertStatus.exceeded && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-900">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>成本超過門檻</AlertTitle>
            <AlertDescription>
              本月成本已達 ${summary.alertSettings.thresholdUsd.toFixed(2)} USD，請確認是否需要暫停 AI 報告或調整門檻。
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatItem
            icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
            label="本月成本"
            value={`$${summary?.totals.costUsd.toFixed(2) ?? (loading ? '0.00' : '0.00')}`}
            helper={`門檻 $${summary?.alertSettings.thresholdUsd.toFixed(2) ?? '-'}`}
          />
          <StatItem
            icon={<Activity className="h-4 w-4 text-blue-500" />}
            label="API 呼叫次數"
            value={summary?.totals.callCount ?? (loading ? '—' : 0)}
            helper="含各項 AI 功能"
          />
          <StatItem
            icon={<Bell className="h-4 w-4 text-purple-500" />}
            label="提醒渠道"
            value={(summary?.alertSettings.channels || []).join(', ') || '未設定'}
            helper={summary?.alertSettings.lastTriggeredAt ? `上次提醒：${new Date(summary.alertSettings.lastTriggeredAt).toLocaleString()}` : '尚未觸發提醒'}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>成本進度</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100">
            <div
              className="h-3 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-700">主要功能成本</h4>
            <div className="space-y-3">
              {(summary?.features || []).slice(0, 4).map((feature) => (
                <div key={feature.feature} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{feature.feature}</p>
                    <p className="text-xs text-slate-500">
                      呼叫 {feature.callCount} 次
                      {feature.lastUsedAt && ` · ${new Date(feature.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <span className="font-semibold text-emerald-600">${feature.costUsd.toFixed(2)}</span>
                </div>
              ))}
              {(summary?.features || []).length === 0 && (
                <p className="text-sm text-slate-500">{loading ? '載入中...' : '尚無成本資料'}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h4 className="mb-2 text-sm font-semibold text-slate-700">提醒設定</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="threshold">月成本門檻 (USD)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={5}
                  max={1000}
                  step={1}
                  value={thresholdInput}
                  onChange={(event) => setThresholdInput(event.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block text-sm">提醒方式</Label>
                <div className="flex flex-wrap gap-3">
                  {allowedChannels.map((channel) => (
                    <label key={channel} className="flex items-center gap-2 text-sm text-slate-700">
                      <Checkbox
                        checked={channelSelection.includes(channel)}
                        onCheckedChange={(checked) => {
                          setChannelSelection((prev) =>
                            checked
                              ? [...prev, channel]
                              : prev.filter((item) => item !== channel)
                          )
                        }}
                      />
                      {channel === 'dashboard' ? '儀表板橫幅' : channel === 'email' ? 'Email' : '推播'}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving || loading}>
                  {saving ? '儲存中...' : '儲存設定'}
                </Button>
                <Button variant="outline" onClick={loadSummary} disabled={loading}>
                  重新整理
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-700">最近使用紀錄</h4>
          <div className="space-y-2 text-sm">
            {(summary?.recentEvents || []).map((event) => (
              <div key={`${event.feature}-${event.createdAt}`} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{event.feature}</p>
                  <p className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
                <span className="text-emerald-600">${event.costUsd.toFixed(4)}</span>
              </div>
            ))}
            {(summary?.recentEvents || []).length === 0 && (
              <p className="text-slate-500">{loading ? '載入中...' : '尚無使用紀錄'}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: string | number
  helper?: string
}

function StatItem({ icon, label, value, helper }: StatItemProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
      {helper && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
  )
}
