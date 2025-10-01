'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { foodEntriesService } from '@/lib/supabase/food-entries'
import { unifiedFoodEntriesService, type UnifiedFoodEntry } from '@/lib/unified-food-entries'
import type { FoodEntry } from '@/types/supabase'
import type { DailySymptomEntry } from '@/types/medical'

// 統一的時間軸記錄類型
type TimelineEntry = {
  id: string
  type: 'food' | 'symptom'
  date: string
  timestamp: Date
  data: FoodEntry | DailySymptomEntry
}

export default function HistoryPage() {
  const { user, isAuthenticated, isLoading } = useSupabaseAuth()
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [symptomEntries, setSymptomEntries] = useState<DailySymptomEntry[]>([])
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([])
  const [filteredTimeline, setFilteredTimeline] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState('month')
  const [recordType, setRecordType] = useState<'all' | 'food' | 'symptom'>('all')

  useEffect(() => {
    if (user) {
      loadEntries()
    }
  }, [user, dateRange])

  // 合併並篩選時間軸記錄
  useEffect(() => {
    // 建立統一時間軸
    const timeline: TimelineEntry[] = [
      ...entries.map(entry => ({
        id: entry.id,
        type: 'food' as const,
        date: entry.consumed_at.split('T')[0],
        timestamp: new Date(entry.consumed_at),
        data: entry
      })),
      ...symptomEntries.map(entry => ({
        id: entry.id,
        type: 'symptom' as const,
        date: entry.recorded_date,
        timestamp: new Date(entry.recorded_at),
        data: entry
      }))
    ]

    // 按時間排序
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    setTimelineEntries(timeline)
  }, [entries, symptomEntries])

  // 根據記錄類型和搜尋詞篩選
  useEffect(() => {
    let filtered = timelineEntries

    // 篩選記錄類型
    if (recordType !== 'all') {
      filtered = filtered.filter(entry => entry.type === recordType)
    }

    // 搜尋篩選
    if (searchTerm.trim()) {
      filtered = filtered.filter(entry => {
        if (entry.type === 'food') {
          const foodData = entry.data as FoodEntry
          return (
            foodData.food_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (foodData.notes && foodData.notes.toLowerCase().includes(searchTerm.toLowerCase()))
          )
        } else {
          const symptomData = entry.data as DailySymptomEntry
          return (
            symptomData.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            false
          )
        }
      })
    }

    setFilteredTimeline(filtered)
  }, [timelineEntries, recordType, searchTerm])

  const loadEntries = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange(dateRange)

      // 並行載入食物和症狀記錄
      const [foodResponse, symptomResponse] = await Promise.all([
        foodEntriesService.getUserFoodEntriesByDateRange(user.id, startDate, endDate),
        fetch(`/api/medical/daily-symptoms?userId=${user.id}&startDate=${startDate}&endDate=${endDate}`)
      ])

      setEntries(foodResponse)

      // 解析症狀記錄 API 響應
      if (symptomResponse.ok) {
        const { data } = await symptomResponse.json()
        setSymptomEntries(Array.isArray(data) ? data : (data ? [data] : []))
      } else {
        setSymptomEntries([])
      }
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
            <h1 className="text-2xl font-bold text-gray-900">📊 健康記錄追蹤</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-blue-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">食物記錄</h3>
            <p className="text-3xl font-bold text-blue-600">{entries.length}</p>
            <p className="text-sm text-gray-500">飲食追蹤</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-rose-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">症狀記錄</h3>
            <p className="text-3xl font-bold text-rose-600">{symptomEntries.length}</p>
            <p className="text-sm text-gray-500">健康追蹤</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-emerald-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">總記錄數</h3>
            <p className="text-3xl font-bold text-emerald-600">{timelineEntries.length}</p>
            <p className="text-sm text-gray-500">所有記錄</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 border-l-4 border-l-orange-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">平均醫療評分</h3>
            <p className="text-3xl font-bold text-orange-600">
              {entries.length > 0
                ? Math.round(entries.reduce((sum, entry) => sum + (entry.medical_score || 0), 0) / entries.length * 10) / 10
                : 0
              }
            </p>
            <p className="text-sm text-gray-500">健康指標</p>
          </div>
        </div>

        {/* 篩選控制 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">篩選選項</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 記錄類型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">記錄類型</label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value as 'all' | 'food' | 'symptom')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">📊 所有記錄</option>
                <option value="food">🍽️ 僅食物</option>
                <option value="symptom">❤️ 僅症狀</option>
              </select>
            </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-2">搜尋</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜尋食物名稱或備註..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>


        {/* 統一時間軸記錄列表 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              時間軸記錄 ({filteredTimeline.length} 筆)
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">🍽️ {entries.length} 食物</span>
              <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded">❤️ {symptomEntries.length} 症狀</span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">載入中...</p>
            </div>
          ) : filteredTimeline.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-4 block">📊</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">沒有記錄</h3>
              <p className="text-gray-600 mb-4">開始記錄您的飲食和健康狀況吧！</p>
              <div className="flex justify-center gap-3">
                <Link href="/food-diary" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                  記錄食物
                </Link>
                <Link href="/symptoms" className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg">
                  記錄症狀
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTimeline.map((entry) => (
                <div
                  key={entry.id}
                  className={`border rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                    entry.type === 'food'
                      ? 'border-blue-200 bg-blue-50/30'
                      : 'border-rose-200 bg-rose-50/30'
                  }`}
                >
                  {entry.type === 'food' ? (
                    // 食物記錄顯示
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">
                        🍽️
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">{(entry.data as FoodEntry).food_name}</h3>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">食物</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatDateTime((entry.data as FoodEntry).consumed_at)} •
                          {(entry.data as FoodEntry).meal_type === 'breakfast' ? ' 早餐' :
                           (entry.data as FoodEntry).meal_type === 'lunch' ? ' 午餐' :
                           (entry.data as FoodEntry).meal_type === 'dinner' ? ' 晚餐' : ' 點心'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>📏 {(entry.data as FoodEntry).quantity}{(entry.data as FoodEntry).unit}</span>
                          {(entry.data as FoodEntry).calories && (
                            <span>🔥 {Math.round((entry.data as FoodEntry).calories!)} 卡</span>
                          )}
                          {(entry.data as FoodEntry).medical_score && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${getMedicalScoreColor((entry.data as FoodEntry).medical_score)}`}>
                              醫療評分 {(entry.data as FoodEntry).medical_score}/5
                            </span>
                          )}
                        </div>
                        {(entry.data as FoodEntry).notes && (
                          <p className="text-sm text-gray-600 mt-2 italic">📝 {(entry.data as FoodEntry).notes}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    // 症狀記錄顯示
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center text-white text-lg">
                        ❤️
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">症狀記錄</h3>
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs rounded-full">症狀</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatDateTime((entry.data as DailySymptomEntry).recorded_at.toString())}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            (entry.data as DailySymptomEntry).overall_health >= 4 ? 'bg-green-100 text-green-700' :
                            (entry.data as DailySymptomEntry).overall_health >= 3 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            健康 {(entry.data as DailySymptomEntry).overall_health}/5
                          </span>
                          {(entry.data as DailySymptomEntry).abdominal_pain > 0 && (
                            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                              腹痛 {(entry.data as DailySymptomEntry).abdominal_pain}
                            </span>
                          )}
                          {(entry.data as DailySymptomEntry).diarrhea > 0 && (
                            <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                              腹瀉 {(entry.data as DailySymptomEntry).diarrhea}
                            </span>
                          )}
                          {(entry.data as DailySymptomEntry).bloody_stool > 0 && (
                            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                              血便 {(entry.data as DailySymptomEntry).bloody_stool}
                            </span>
                          )}
                          {(entry.data as DailySymptomEntry).bloating > 0 && (
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                              脹氣 {(entry.data as DailySymptomEntry).bloating}
                            </span>
                          )}
                        </div>
                        {(entry.data as DailySymptomEntry).notes && (
                          <p className="text-sm text-gray-600 mt-2 italic">📝 {(entry.data as DailySymptomEntry).notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}