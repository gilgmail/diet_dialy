'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated, signInWithGoogle } = useSupabaseAuth()

  // 已登入用戶自動導向儀表板
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isLoading, isAuthenticated, router])

  // 載入中顯示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  // 已登入用戶在重導向前的過渡畫面
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">前往儀表板...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Diet Daily</h1>
              <p className="text-gray-600 mt-1">智能飲食追蹤與健康管理系統</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                v4.0.0 - Supabase 版本
              </div>
              {!isLoading && !isAuthenticated && (
                <div className="flex items-center space-x-3">
                  <Link
                    href="/onboarding"
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    data-testid="get-started-button"
                  >
                    🚀 開始使用
                  </Link>
                  <button
                    onClick={signInWithGoogle}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    🔐 登入
                  </button>
                </div>
              )}
              {isAuthenticated && user && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">歡迎，{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Welcome Message */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">開始管理您的健康飲食</h2>
          <p className="text-xl text-gray-600">簡單記錄，智能分析，掌握健康</p>
        </div>

        {/* Core Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Food Diary - Primary CTA */}
          <Link href="/food-diary" className="group">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-10 hover:shadow-2xl transition-all group-hover:scale-105 text-white">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <span className="text-5xl">🍽️</span>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-center">記錄飲食</h3>
              <p className="text-blue-100 text-center mb-4">記錄每一餐，追蹤您的飲食習慣</p>
              <div className="flex items-center justify-center text-white font-semibold">
                立即記錄 →
              </div>
            </div>
          </Link>

          {/* Symptom Diary */}
          <Link href="/symptoms" className="group">
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl shadow-lg p-10 hover:shadow-2xl transition-all group-hover:scale-105 text-white">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <span className="text-5xl">❤️</span>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-center">記錄症狀</h3>
              <p className="text-rose-100 text-center mb-4">追蹤健康狀態，記錄身體變化</p>
              <div className="flex items-center justify-center text-white font-semibold">
                記錄症狀 →
              </div>
            </div>
          </Link>

          {/* Dashboard/Insights */}
          <Link href="/dashboard" className="group">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-10 hover:shadow-2xl transition-all group-hover:scale-105 text-white">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <span className="text-5xl">💡</span>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-center">查看洞察</h3>
              <p className="text-emerald-100 text-center mb-4">了解您的健康趨勢與建議</p>
              <div className="flex items-center justify-center text-white font-semibold">
                查看分析 →
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}