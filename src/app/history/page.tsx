'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { foodEntriesService } from '@/lib/supabase/food-entries'
import type { FoodEntry } from '@/types/supabase'

export default function HistoryPage() {
  const { user, isAuthenticated, isLoading } = useSupabaseAuth()
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState('month')

  useEffect(() => {
    if (user) {
      loadEntries()
    }
  }, [user, dateRange])

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">總記錄數</h3>
            <p className="text-3xl font-bold text-blue-600">{entries.length}</p>
            <p className="text-sm text-gray-500">食物記錄</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">平均醫療評分</h3>
            <p className="text-3xl font-bold text-green-600">
              {entries.length > 0
                ? Math.round(entries.reduce((sum, entry) => sum + (entry.medical_score || 0), 0) / entries.length * 10) / 10
                : 0
              }
            </p>
            <p className="text-sm text-gray-500">健康指標</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">資料來源</h3>
            <p className="text-3xl font-bold text-purple-600">Supabase</p>
            <p className="text-sm text-gray-500">雲端資料庫</p>
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
                          醫療評分：{entry.medical_score}/10
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