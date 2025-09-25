'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { foodEntriesService } from '@/lib/supabase/food-entries'
import { unifiedFoodEntriesService, type UnifiedFoodEntry } from '@/lib/unified-food-entries'
import type { FoodEntry } from '@/types/supabase'

export default function HistoryPage() {
  const { user, isAuthenticated, isLoading } = useSupabaseAuth()
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<FoodEntry[]>([])
  const [todayEntries, setTodayEntries] = useState<UnifiedFoodEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState('month')
  const [showTodaySection, setShowTodaySection] = useState(true)

  useEffect(() => {
    if (user) {
      loadEntries()
      loadTodayEntries()
      // 設置用戶ID並嘗試同步
      unifiedFoodEntriesService.setUserIdForUnsyncedEntries(user.id)
      syncEntries()
    }
  }, [user, dateRange])

  // 定期更新今日記錄以保持同步
  useEffect(() => {
    if (user) {
      const interval = setInterval(loadTodayEntries, 10000) // 每10秒更新一次
      return () => clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    // Filter entries based on search term
    if (searchTerm.trim()) {
      const filtered = entries.filter(entry =>
        entry.food_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.notes && entry.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredEntries(filtered)
    } else {
      setFilteredEntries(entries)
    }
  }, [entries, searchTerm])

  const loadEntries = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange(dateRange)
      const data = await foodEntriesService.getUserFoodEntriesByDateRange(
        user.id,
        startDate,
        endDate
      )
      setEntries(data)
    } catch (error) {
      console.error('載入歷史記錄失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTodayEntries = async () => {
    if (!user) return

    try {
      const entries = await unifiedFoodEntriesService.getTodayEntries(user.id)
      setTodayEntries(entries)
    } catch (error) {
      console.error('載入今日記錄失敗:', error)
    }
  }

  const syncEntries = async () => {
    if (!user) return

    try {
      const result = await unifiedFoodEntriesService.syncAllEntries(user.id)
      if (result.success > 0) {
        console.log(`Successfully synced ${result.success} entries`)
        // 重新載入今日記錄和歷史記錄
        loadTodayEntries()
        loadEntries()
      }
    } catch (error) {
      console.error('同步記錄失敗:', error)
    }
  }

  const getDateRange = (range: string) => {
    const today = new Date()
    let startDate: string
    const endDate = today.toISOString().split('T')[0]

    switch (range) {
      case 'today':
        startDate = endDate
        break
      case 'week':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        startDate = weekAgo.toISOString().split('T')[0]
        break
      case 'month':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        startDate = monthAgo.toISOString().split('T')[0]
        break
      default:
        startDate = endDate
    }

    return { startDate, endDate }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMedicalScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-600'
    if (score >= 8) return 'bg-green-100 text-green-800'
    if (score >= 6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getMedicalScoreText = (score?: number) => {
    if (!score) return '未評分'
    if (score >= 8) return '推薦'
    if (score >= 6) return '適中'
    return '謹慎'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl mb-4 block">🔒</span>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">請先登入</h2>
          <p className="text-gray-600 mb-4">需要登入才能查看歷史記錄</p>
          <Link href="/settings" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
            前往登入
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              ← 返回首頁
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">📊 食物追蹤</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">今日記錄</h3>
            <p className="text-3xl font-bold text-green-600">{todayEntries.length}</p>
            <p className="text-sm text-gray-500">即時同步</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">總記錄數</h3>
            <p className="text-3xl font-bold text-blue-600">{entries.length}</p>
            <p className="text-sm text-gray-500">歷史記錄</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">平均醫療評分</h3>
            <p className="text-3xl font-bold text-orange-600">
              {entries.length > 0
                ? Math.round(entries.reduce((sum, entry) => sum + (entry.medical_score || 0), 0) / entries.length * 10) / 10
                : 0
              }
            </p>
            <p className="text-sm text-gray-500">健康指標</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">同步狀態</h3>
            <p className="text-3xl font-bold text-purple-600">
              {todayEntries.filter(entry => entry.isSynced).length}/{todayEntries.length}
            </p>
            <p className="text-sm text-gray-500">已同步記錄</p>
          </div>
        </div>

        {/* 篩選控制 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">篩選選項</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 時間範圍 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">時間範圍</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">今天</option>
                <option value="week">最近一週</option>
                <option value="month">最近一個月</option>
              </select>
            </div>

            {/* 搜尋 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">搜尋食物</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="輸入食物名稱或備註..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 今日記錄同步顯示 */}
        {showTodaySection && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">🍽️</span>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">今日飲食記錄</h2>
                  <p className="text-sm text-gray-600">與食物日記即時同步</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600 font-medium">即時同步</span>
                <button
                  onClick={syncEntries}
                  className="text-blue-600 hover:text-blue-700 text-sm px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  🔄 同步
                </button>
                <button
                  onClick={() => setShowTodaySection(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {todayEntries.length === 0 ? (
              <div className="text-center py-6 bg-white rounded-lg border border-gray-100">
                <span className="text-3xl mb-2 block">📝</span>
                <p className="text-gray-600 mb-3">今天還沒有飲食記錄</p>
                <Link
                  href="/food-diary"
                  className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <span className="mr-2">➕</span>
                  開始記錄今日飲食
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEntries.map((entry, index) => (
                  <div key={entry.id || `temp-${index}`} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-gray-900">{entry.food_name}</h3>
                          {!entry.isSynced && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              本地記錄
                            </span>
                          )}
                          {entry.isSynced && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              已同步
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>
                            🕐 {new Date(entry.consumed_at).toLocaleTimeString('zh-TW', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span>
                            {entry.meal_type === 'breakfast' ? '🌅 早餐' :
                             entry.meal_type === 'lunch' ? '☀️ 午餐' :
                             entry.meal_type === 'dinner' ? '🌙 晚餐' : '🍪 點心'}
                          </span>
                          <span>📏 {entry.quantity}{entry.unit}</span>
                          {entry.calories && <span>🔥 {Math.round(entry.calories)} 卡</span>}
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-gray-600 mt-2 italic">💭 {entry.notes}</p>
                        )}
                      </div>
                      {entry.medical_score && (
                        <div className="text-right ml-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${getMedicalScoreColor(entry.medical_score)}`}>
                            {entry.medical_score}/5
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                  <Link
                    href="/food-diary"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <span className="mr-1">➕</span>
                    繼續記錄更多食物
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 記錄列表 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            歷史記錄 ({filteredEntries.length} 筆記錄)
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">載入中...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">🍽️</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">沒有記錄</h3>
              <p className="text-gray-600 mb-4">開始記錄您的飲食吧！</p>
              <Link href="/food-diary" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                前往記錄
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{entry.food_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDateTime(entry.consumed_at)} •
                        {entry.meal_type === 'breakfast' ? ' 早餐' :
                         entry.meal_type === 'lunch' ? ' 午餐' :
                         entry.meal_type === 'dinner' ? ' 晚餐' : ' 點心'}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>📏 {entry.quantity}{entry.unit}</span>
                        {entry.calories && <span>🔥 {Math.round(entry.calories)} 卡</span>}
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">📝 {entry.notes}</p>
                      )}
                    </div>

                    {entry.medical_score && (
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs ${getMedicalScoreColor(entry.medical_score)}`}>
                          醫療評分：{entry.medical_score}/5
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{getMedicalScoreText(entry.medical_score)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}