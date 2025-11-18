'use client'

import { useState, useEffect, useMemo } from 'react'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { RefreshCw, Search, AlertTriangle, Database, Loader2, Eye } from 'lucide-react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

interface QueueItem {
  queueId: string
  foodId: string
  foodName: string
  category: string | null
  reason: string
  status: string
  priority: number
  attempts: number
  scheduledFor: string
  updatedAt: string
  completedAt: string | null
}

interface QueueSummary {
  pendingCount: number
  inProgressCount: number
  failedCount: number
  completedCount: number
  missingCount: number
  staleCount: number
  items: QueueItem[]
}

interface CacheItem {
  foodId: string
  foodName: string
  category: string | null
  analysisVersion?: string
  analysisSource?: string
  analysisUpdatedAt?: string
  usageCount: number
  severity?: string
  riskProfile?: Record<string, unknown> | null
  nutritionProfile?: Record<string, unknown> | null
  supportiveAttributes?: unknown
  servingGuidelines?: unknown
}

const severityOptions = [
  { label: '全部', value: 'all' },
  { label: '低風險', value: 'low' },
  { label: '中等風險', value: 'medium' },
  { label: '高風險', value: 'high' }
]

export default function FoodKnowledgeAdminPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useSupabaseAuth()
  const [userIdInput, setUserIdInput] = useState('')
  const [queueSummary, setQueueSummary] = useState<QueueSummary | null>(null)
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [cacheItems, setCacheItems] = useState<CacheItem[]>([])
  const [cacheLoading, setCacheLoading] = useState(false)
  const [cacheError, setCacheError] = useState<string | null>(null)
  const [cacheSearch, setCacheSearch] = useState('')
  const [cacheSeverity, setCacheSeverity] = useState('all')
  const [cacheCursor, setCacheCursor] = useState<string | null>(null)
  const [cacheHasMore, setCacheHasMore] = useState(false)
  const [selectedItem, setSelectedItem] = useState<CacheItem | null>(null)

  // Prefill userId with current user to make testing easier
  useEffect(() => {
    if (user?.id && !userIdInput) {
      setUserIdInput(user.id)
    }
  }, [user?.id, userIdInput])

  const fetchQueueStatus = async () => {
    if (!userIdInput) {
      setQueueError('請先輸入 userId')
      return
    }

    try {
      setQueueLoading(true)
      setQueueError(null)
      const response = await fetch(`/api/food-knowledge/status?userId=${userIdInput}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const payload = (await response.json()) as { success: boolean; summary?: QueueSummary; error?: string }
      if (!payload.success || !payload.summary) {
        throw new Error(payload.error || '未知錯誤')
      }
      setQueueSummary(payload.summary)
    } catch (error) {
      console.error('[FoodKnowledgeAdmin] queue fetch error:', error)
      setQueueError(error instanceof Error ? error.message : '無法讀取佇列資料')
      setQueueSummary(null)
    } finally {
      setQueueLoading(false)
    }
  }

  const triggerQueueProcessing = async () => {
    if (!queueSummary || queueSummary.items.length === 0) {
      return
    }
    const pendingFoodIds = queueSummary.items
      .filter((item) => item.status === 'pending' || item.status === 'failed')
      .map((item) => item.foodId)

    if (pendingFoodIds.length === 0) {
      alert('沒有 pending/failed 佇列可處理')
      return
    }

    try {
      setQueueLoading(true)
      const response = await fetch('/api/food-knowledge/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userIdInput || null, foodIds: pendingFoodIds, reason: 'manual_request' })
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const payload = await response.json()
      alert(`已送出刷新請求，共 ${payload?.count ?? 0} 項`)
      await fetchQueueStatus()
    } catch (error) {
      console.error('[FoodKnowledgeAdmin] trigger error:', error)
      alert(error instanceof Error ? error.message : '無法觸發刷新')
    } finally {
      setQueueLoading(false)
    }
  }

  const fetchCache = async (options: { append?: boolean; cursor?: string | null } = {}) => {
    try {
      if (!options.append) {
        setCacheLoading(true)
        setCacheError(null)
      }
      const params = new URLSearchParams({
        q: cacheSearch,
        severity: cacheSeverity,
        limit: '40'
      })
      if (options.cursor) {
        params.set('cursor', options.cursor)
      }

      const response = await fetch(`/api/admin/food-knowledge/cache?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const payload = (await response.json()) as {
        success: boolean
        items?: CacheItem[]
        nextCursor?: string | null
        error?: string
      }
      if (!payload.success || !payload.items) {
        throw new Error(payload.error || '無法取得快取資料')
      }
      setCacheItems((prev) => (options.append ? [...prev, ...payload.items!] : payload.items!))
      setCacheCursor(payload.nextCursor ?? null)
      setCacheHasMore(Boolean(payload.nextCursor))
    } catch (error) {
      console.error('[FoodKnowledgeAdmin] cache fetch error:', error)
      setCacheError(error instanceof Error ? error.message : '無法讀取快取資料')
      setCacheItems(options.append ? cacheItems : [])
    } finally {
      if (!options.append) {
        setCacheLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!authLoading) {
      fetchCache()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheSeverity])

  const handleCacheSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    fetchCache()
  }

  const severityLabel = (value?: string) => {
    if (!value) return '未知'
    const found = severityOptions.find((option) => option.value === value)
    return found ? found.label : value
  }

  const renderQueueSummary = () => {
    if (queueLoading) {
      return <p className="text-sm text-gray-500">讀取中...</p>
    }
    if (queueError) {
      return <p className="text-sm text-red-500">{queueError}</p>
    }
    if (!queueSummary) {
      return <p className="text-sm text-gray-500">尚未載入資料</p>
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">待處理</p>
          <p className="text-2xl font-semibold text-amber-600">{queueSummary.pendingCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">進行中</p>
          <p className="text-2xl font-semibold text-blue-600">{queueSummary.inProgressCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">已完成</p>
          <p className="text-2xl font-semibold text-green-600">{queueSummary.completedCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">失敗</p>
          <p className="text-2xl font-semibold text-red-500">{queueSummary.failedCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">缺資料</p>
          <p className="text-2xl font-semibold text-purple-600">{queueSummary.missingCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-gray-500">過期</p>
          <p className="text-2xl font-semibold text-orange-600">{queueSummary.staleCount}</p>
        </div>
      </div>
    )
  }

  const filteredQueueItems = useMemo(() => {
    if (!queueSummary?.items) return []
    return queueSummary.items.sort((a, b) => b.priority - a.priority)
  }, [queueSummary])

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl rounded-lg border bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">需要登入</h1>
          <p className="text-gray-600">請登入管理員帳號以檢視 AI 食物知識庫資料。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-gray-500">Admin / AI 食物知識庫</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            AI 食物知識庫管理
          </h1>
          <p className="text-gray-600">
            快速檢視快取狀態、刷新佇列，並手動觸發 Edge Function，協助調試/驗證開發版行為。
          </p>
        </header>

        {/* Queue Section */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">指定 userId</label>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="使用者 ID"
                value={userIdInput}
                onChange={(event) => setUserIdInput(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchQueueStatus}
                disabled={queueLoading}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {queueLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                載入佇列
              </button>
              <button
                onClick={triggerQueueProcessing}
                disabled={queueLoading || !queueSummary || queueSummary.items.length === 0}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />立即處理
              </button>
            </div>
          </div>

          <div className="mt-6">{renderQueueSummary()}</div>

          {filteredQueueItems.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="px-3 py-2">食物</th>
                    <th className="px-3 py-2">原因</th>
                    <th className="px-3 py-2">狀態</th>
                    <th className="px-3 py-2">優先順序</th>
                    <th className="px-3 py-2">嘗試次數</th>
                    <th className="px-3 py-2">更新時間</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueueItems.map((item) => (
                    <tr key={item.queueId} className="border-b">
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-900">{item.foodName}</div>
                        <div className="text-xs text-gray-500">{item.foodId}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {item.reason}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: item.status === 'pending' ? '#f97316' : item.status === 'failed' ? '#ef4444' : item.status === 'completed' ? '#22c55e' : '#3b82f6' }}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-3">{item.priority}</td>
                      <td className="px-3 py-3">{item.attempts}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {new Date(item.updatedAt).toLocaleString('zh-TW')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : queueSummary && queueSummary.items.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">沒有佇列資料。</p>
          ) : null}
        </section>

        {/* Cache Section */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <form onSubmit={handleCacheSearch} className="flex flex-1 flex-col gap-2 md:flex-row md:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">搜尋食物或 ID</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  placeholder="輸入關鍵字..."
                  value={cacheSearch}
                  onChange={(event) => setCacheSearch(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">風險等級</label>
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={cacheSeverity}
                  onChange={(event) => setCacheSeverity(event.target.value)}
                >
                  {severityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
              >
                <Search className="h-4 w-4" />搜尋
              </button>
            </form>
          </div>

          {cacheError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {cacheError}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="px-3 py-2">食物</th>
                  <th className="px-3 py-2">最新版本</th>
                  <th className="px-3 py-2">更新時間</th>
                  <th className="px-3 py-2">風險</th>
                  <th className="px-3 py-2">使用次數</th>
                  <th className="px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {cacheItems.map((item) => (
                  <tr key={item.foodId} className="border-b">
                    <td className="px-3 py-4">
                      <div className="font-medium text-gray-900">{item.foodName}</div>
                      <div className="text-xs text-gray-500">{item.foodId}</div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-gray-900">{item.analysisVersion ?? '-'}</div>
                      <div className="text-xs text-gray-500">{item.analysisSource ?? '未知來源'}</div>
                    </td>
                    <td className="px-3 py-4 text-xs text-gray-500">
                      {item.analysisUpdatedAt
                        ? new Date(item.analysisUpdatedAt).toLocaleString('zh-TW')
                        : '-'}
                    </td>
                    <td className="px-3 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        {severityLabel(item.severity)}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center">{item.usageCount}</td>
                    <td className="px-3 py-4">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        <Eye className="h-3 w-3" />
                        查看
                      </button>
                    </td>
                  </tr>
                ))}
                {cacheItems.length === 0 && !cacheLoading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500">
                      尚無資料。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {cacheLoading ? (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> 載入中…
            </div>
          ) : null}

          {cacheHasMore && !cacheLoading ? (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => fetchCache({ append: true, cursor: cacheCursor })}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" /> 載入更多
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">相關文件</h2>
          <p className="mt-2 text-sm text-gray-500">
            如需更深入的操作流程，請參考文件：
          </p>
          <ul className="mt-3 list-inside list-disc text-sm text-primary">
            <li>
              <Link href="/docs/food-knowledge-system-design" className="underline">
                AI 食物知識庫系統設計
              </Link>
            </li>
            <li>
              <Link href="/docs/weekly-ai-integration-tests" className="underline">
                Weekly AI Integration Tests
              </Link>
            </li>
          </ul>
        </section>
      </div>

      {/* Analysis Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
              <h3 className="text-lg font-semibold text-gray-900">
                AI 分析詳情 - {selectedItem.foodName}
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded p-1 hover:bg-gray-100"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-4 p-6">
              {/* Basic Info */}
              <div className="rounded-lg border bg-gray-50 p-4">
                <h4 className="mb-3 font-medium text-gray-900">基本資訊</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">食物名稱:</span>
                    <span className="ml-2 font-medium">{selectedItem.foodName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">分類:</span>
                    <span className="ml-2 font-medium">{selectedItem.category || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">分析版本:</span>
                    <span className="ml-2 font-medium">{selectedItem.analysisVersion || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">資料來源:</span>
                    <span className="ml-2 font-medium">{selectedItem.analysisSource || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">更新時間:</span>
                    <span className="ml-2 font-medium">
                      {selectedItem.analysisUpdatedAt
                        ? new Date(selectedItem.analysisUpdatedAt).toLocaleString('zh-TW')
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">使用次數:</span>
                    <span className="ml-2 font-medium">{selectedItem.usageCount}</span>
                  </div>
                </div>
              </div>

              {/* Risk Profile */}
              {selectedItem.riskProfile && (
                <div className="rounded-lg border bg-red-50 p-4">
                  <h4 className="mb-3 font-medium text-red-900">風險評估</h4>
                  <pre className="overflow-x-auto rounded bg-white p-3 text-xs">
                    {JSON.stringify(selectedItem.riskProfile as Record<string, unknown>, null, 2)}
                  </pre>
                </div>
              )}

              {/* Nutrition Profile */}
              {selectedItem.nutritionProfile && (
                <div className="rounded-lg border bg-green-50 p-4">
                  <h4 className="mb-3 font-medium text-green-900">營養分析</h4>
                  <pre className="overflow-x-auto rounded bg-white p-3 text-xs">
                    {JSON.stringify(selectedItem.nutritionProfile as Record<string, unknown>, null, 2)}
                  </pre>
                </div>
              )}

              {/* Supportive Attributes */}
              {selectedItem.supportiveAttributes && (
                <div className="rounded-lg border bg-blue-50 p-4">
                  <h4 className="mb-3 font-medium text-blue-900">支持性特徵</h4>
                  <pre className="overflow-x-auto rounded bg-white p-3 text-xs">
                    {JSON.stringify(selectedItem.supportiveAttributes as Record<string, unknown>, null, 2)}
                  </pre>
                </div>
              )}

              {/* Serving Guidelines */}
              {selectedItem.servingGuidelines && (
                <div className="rounded-lg border bg-yellow-50 p-4">
                  <h4 className="mb-3 font-medium text-yellow-900">食用建議</h4>
                  <pre className="overflow-x-auto rounded bg-white p-3 text-xs">
                    {JSON.stringify(selectedItem.servingGuidelines as Record<string, unknown>, null, 2)}
                  </pre>
                </div>
              )}

              {!selectedItem.riskProfile &&
                !selectedItem.nutritionProfile &&
                !selectedItem.supportiveAttributes &&
                !selectedItem.servingGuidelines && (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <p className="text-sm text-gray-500">此食物暫無詳細分析資料</p>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
