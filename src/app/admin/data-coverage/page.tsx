'use client'

import { useState, useEffect } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { Database, AlertTriangle, CheckCircle, Clock, Users, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface DataCoverageUser {
  user_id: string
  email: string
  name: string | null
  period_start: string
  period_end: string
  symptom_entry_days: number
  total_days: number
  symptom_coverage_percent: number
  food_coverage_percent: number
  medication_coverage_percent: number
  sleep_coverage_percent: number
  exercise_coverage_percent: number
  overall_data_status: 'sufficient' | 'partial' | 'insufficient'
  missing_categories: string[]
  last_data_update: string | null
}

interface MissingDataAlert {
  category: string
  missing_days: number
  last_entry_date: string | null
  recommendation: string
}

export default function DataCoverageAdminPage() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useSupabaseAuth()
  const [users, setUsers] = useState<DataCoverageUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<MissingDataAlert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchDataCoverage()
    }
  }, [authLoading, isAdmin])

  const fetchDataCoverage = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/data-coverage')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const payload = await response.json()
      if (!payload.success || !payload.users) {
        throw new Error(payload.error || '無法取得資料')
      }
      setUsers(payload.users)
    } catch (err) {
      console.error('[DataCoverage] fetch error:', err)
      setError(err instanceof Error ? err.message : '無法載入資料')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserAlerts = async (userId: string) => {
    try {
      setAlertsLoading(true)
      const response = await fetch(`/api/admin/data-coverage/alerts?userId=${userId}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const payload = await response.json()
      if (!payload.success || !payload.alerts) {
        throw new Error(payload.error || '無法取得提醒')
      }
      setAlerts(payload.alerts)
    } catch (err) {
      console.error('[DataCoverage] alerts fetch error:', err)
      setAlerts([])
    } finally {
      setAlertsLoading(false)
    }
  }

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId)
    fetchUserAlerts(userId)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sufficient':
        return 'bg-green-100 text-green-800'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800'
      case 'insufficient':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sufficient':
        return '充足'
      case 'partial':
        return '部分'
      case 'insufficient':
        return '不足'
      default:
        return '未知'
    }
  }

  const getCoverageColor = (percent: number) => {
    if (percent >= 60) return 'text-green-600'
    if (percent >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      symptoms: '症狀',
      food: '飲食',
      medications: '藥物',
      sleep: '睡眠',
      exercise: '運動'
    }
    return labels[category] || category
  }

  // 統計資料
  const sufficientUsers = users.filter(u => u.overall_data_status === 'sufficient').length
  const partialUsers = users.filter(u => u.overall_data_status === 'partial').length
  const insufficientUsers = users.filter(u => u.overall_data_status === 'insufficient').length

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl rounded-lg border bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">需要登入</h1>
          <p className="text-gray-600">請登入管理員帳號以檢視資料充足度儀表。</p>
        </div>
      </div>
    )
  }

  if (!isAdmin && !authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl rounded-lg border bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">需要管理員權限</h1>
          <p className="text-gray-600">此頁面僅限管理員存取。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-gray-500">Admin / Phase A 資料充足度儀表</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            資料充足度儀表 (M0)
          </h1>
          <p className="text-gray-600">
            檢視使用者資料覆蓋率、缺漏項目，並提供補資料提醒。僅當資料充足度 ≥60% 時才啟用後續 AI 分析。
          </p>
        </header>

        {/* 統計摘要 */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              總使用者數
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{users.length}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle className="h-4 w-4 text-green-600" />
              資料充足
            </div>
            <p className="text-2xl font-semibold text-green-600 mt-1">{sufficientUsers}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4 text-yellow-600" />
              資料部分
            </div>
            <p className="text-2xl font-semibold text-yellow-600 mt-1">{partialUsers}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              資料不足
            </div>
            <p className="text-2xl font-semibold text-red-600 mt-1">{insufficientUsers}</p>
          </div>
        </section>

        {/* 錯誤訊息 */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 使用者列表 */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">使用者資料覆蓋率</h2>
            <button
              onClick={fetchDataCoverage}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? '載入中...' : '重新整理'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-500">載入中...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-500">尚無使用者資料</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="px-3 py-2">使用者</th>
                    <th className="px-3 py-2">症狀</th>
                    <th className="px-3 py-2">飲食</th>
                    <th className="px-3 py-2">藥物</th>
                    <th className="px-3 py-2">睡眠</th>
                    <th className="px-3 py-2">運動</th>
                    <th className="px-3 py-2">狀態</th>
                    <th className="px-3 py-2">缺漏項目</th>
                    <th className="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.user_id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900">
                          {user.name && user.name !== user.email ? (
                            <>
                              {user.name}
                              <span className="ml-2 text-xs font-normal text-gray-500">({user.email})</span>
                            </>
                          ) : (
                            user.email
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{user.user_id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className={`font-medium ${getCoverageColor(user.symptom_coverage_percent)}`}>
                          {user.symptom_coverage_percent.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.symptom_entry_days}/{user.total_days} 天
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className={`font-medium ${getCoverageColor(user.food_coverage_percent)}`}>
                          {user.food_coverage_percent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className={`font-medium ${getCoverageColor(user.medication_coverage_percent)}`}>
                          {user.medication_coverage_percent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className={`font-medium ${getCoverageColor(user.sleep_coverage_percent)}`}>
                          {user.sleep_coverage_percent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className={`font-medium ${getCoverageColor(user.exercise_coverage_percent)}`}>
                          {user.exercise_coverage_percent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(user.overall_data_status)}`}>
                          {getStatusLabel(user.overall_data_status)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {user.missing_categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.missing_categories.map((cat) => (
                              <span
                                key={cat}
                                className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800"
                              >
                                {getCategoryLabel(cat)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">無缺漏</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleUserSelect(user.user_id)}
                          className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                        >
                          查看提醒
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 缺漏提醒詳情 */}
        {selectedUserId && (
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">缺漏資料提醒</h2>
            {alertsLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-gray-500">載入中...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                此使用者目前沒有缺漏資料提醒（過去 30 天內缺漏少於 2 天）
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-yellow-200 bg-yellow-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-medium text-yellow-900">
                          {getCategoryLabel(alert.category)} 缺漏 {alert.missing_days} 天
                        </div>
                        <div className="mt-1 text-sm text-yellow-700">
                          {alert.recommendation}
                        </div>
                        {alert.last_entry_date && (
                          <div className="mt-1 text-xs text-yellow-600">
                            最後記錄日期：{new Date(alert.last_entry_date).toLocaleDateString('zh-TW')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 相關連結 */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">相關頁面</h2>
          <ul className="space-y-2 text-sm text-primary">
            <li>
              <Link href="/admin/food-knowledge" className="underline hover:text-primary/80">
                AI 食物知識庫管理
              </Link>
            </li>
            <li>
              <Link href="/admin" className="underline hover:text-primary/80">
                管理員首頁
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}

