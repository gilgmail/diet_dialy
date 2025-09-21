'use client'

import Link from 'next/link'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

export default function HomePage() {
  const { user, isLoading, isAuthenticated, signInWithGoogle } = useSupabaseAuth()

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
                <button
                  onClick={signInWithGoogle}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  🔐 登入
                </button>
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Settings Page */}
          <Link href="/settings" className="group">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group-hover:scale-105">
              <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-2xl">⚙️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">設定</h3>
              <p className="text-sm text-gray-600 mb-3">Google 登入、醫療狀況設定、個人偏好</p>
              <div className="flex items-center text-gray-500 text-sm font-medium">
                進入設定 →
              </div>
            </div>
          </Link>

          {/* Food Diary */}
          <Link href="/food-diary" className="group">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group-hover:scale-105">
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-2xl">🍽️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">食物日記</h3>
              <p className="text-sm text-gray-600 mb-3">記錄食物攝取，同步到 Supabase 資料庫</p>
              <div className="flex items-center text-red-500 text-sm font-medium">
                開始記錄 →
              </div>
            </div>
          </Link>

          {/* Food Database */}
          <Link href="/foods" className="group">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group-hover:scale-105">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-2xl">🗄️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">食物資料庫</h3>
              <p className="text-sm text-gray-600 mb-3">瀏覽 diet-daily-foods 資料庫，搜尋和篩選</p>
              <div className="flex items-center text-orange-500 text-sm font-medium">
                瀏覽資料庫 →
              </div>
            </div>
          </Link>

          {/* Food Tracking */}
          <Link href="/history" className="group">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group-hover:scale-105">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">食物追蹤</h3>
              <p className="text-sm text-gray-600 mb-3">查看個人食物記錄、統計分析和趨勢</p>
              <div className="flex items-center text-green-500 text-sm font-medium">
                查看記錄 →
              </div>
            </div>
          </Link>

          {/* Medical Reports */}
          <Link href="/reports" className="group">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group-hover:scale-105">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-2xl">📋</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">醫療報告</h3>
              <p className="text-sm text-gray-600 mb-3">生成 PDF 報告、基於 Supabase 數據分析</p>
              <div className="flex items-center text-purple-500 text-sm font-medium">
                生成報告 →
              </div>
            </div>
          </Link>

          {/* Admin Verification */}
          <Link href="/admin/verification" className="group">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group-hover:scale-105">
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-2xl">🛡️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">管理員驗證</h3>
              <p className="text-sm text-gray-600 mb-3">僅管理員可訪問，驗證待審核食物</p>
              <div className="flex items-center text-indigo-500 text-sm font-medium">
                進入管理 →
              </div>
            </div>
          </Link>
        </div>

        {/* Version Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 版本更新資訊</h2>

          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-blue-900">v4.0.0 - Supabase 架構遷移 (目前版本)</h3>
              <p className="text-sm text-gray-600 mt-1">2024年9月</p>
              <ul className="text-sm text-gray-700 mt-2 space-y-1">
                <li>• ✅ 完全遷移到 Supabase PostgreSQL 資料庫</li>
                <li>• ✅ 使用 Supabase Auth 進行 Google OAuth 認證</li>
                <li>• ✅ 實現 Row Level Security (RLS) 保護用戶數據</li>
                <li>• ✅ 移除 Google Sheets 依賴，提升性能和安全性</li>
                <li>• ✅ 建立完整的 TypeScript 類型定義</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-green-900">v3.0.0 - 生產就緒版本</h3>
              <p className="text-sm text-gray-600 mt-1">2024年8月</p>
              <ul className="text-sm text-gray-700 mt-2 space-y-1">
                <li>• 🔐 Google OAuth 2.0 安全認證</li>
                <li>• 🍽️ 每日食物記錄系統</li>
                <li>• 📊 4維度醫療評分系統</li>
                <li>• ☁️ Google Sheets 即時同步</li>
                <li>• 🛡️ 管理員驗證工作流</li>
              </ul>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">🏗️ 系統狀態</h3>
              <div className="space-y-1 text-sm opacity-90">
                <p>• 資料庫：Supabase PostgreSQL ✅</p>
                <p>• 認證：Supabase Auth ✅</p>
                <p>• 前端：Next.js 14 + TypeScript ✅</p>
                <p>• 安全性：Row Level Security 啟用 ✅</p>
              </div>
            </div>
            <div className="text-right">
              <Link
                href="/test-supabase"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                🧪 系統測試
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}