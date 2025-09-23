'use client'

import { useState, useEffect } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import Link from 'next/link'
import {
  Database,
  Users,
  Shield,
  Settings,
  BarChart3,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'

export default function AdminDashboard() {
  const { user, userProfile, isLoading, isAuthenticated } = useSupabaseAuth()
  const [stats, setStats] = useState({
    totalFoods: 971,
    pendingFoods: 3,
    totalUsers: 156,
    activeUsers: 89
  })

  // 檢查管理員權限
  const isAdmin = userProfile?.is_admin || false

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">需要登入</h1>
          <p className="text-gray-600 mb-6">請先登入才能訪問管理員控制台</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            返回首頁
          </Link>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h1>
          <p className="text-gray-600 mb-6">您需要管理員權限才能訪問此頁面</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            返回首頁
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">管理員控制台</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                歡迎，{userProfile?.name || user?.email}
              </div>
              <Link
                href="/"
                className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                返回首頁
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Database className="w-10 h-10 text-blue-500 mr-4" />
              <div>
                <p className="text-sm text-gray-600">食物總數</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalFoods}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Clock className="w-10 h-10 text-yellow-500 mr-4" />
              <div>
                <p className="text-sm text-gray-600">待審核食物</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingFoods}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Users className="w-10 h-10 text-green-500 mr-4" />
              <div>
                <p className="text-sm text-gray-600">總用戶數</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <CheckCircle className="w-10 h-10 text-purple-500 mr-4" />
              <div>
                <p className="text-sm text-gray-600">活躍用戶</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Food Database Management */}
          <Link href="/admin/food-database">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center mb-4">
                <Database className="w-8 h-8 text-blue-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">食物資料庫管理</h3>
              </div>
              <p className="text-gray-600 mb-4">完整管理食物資料庫：查看、編輯、新增、刪除和驗證食物</p>
              <div className="flex items-center text-sm text-blue-600">
                <span>進入管理 →</span>
              </div>
            </div>
          </Link>

          {/* Food Verification */}
          <Link href="/admin/food-verification">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">食物審核</h3>
              </div>
              <p className="text-gray-600 mb-4">專門審核用戶提交的待審核食物</p>
              <div className="flex items-center text-sm text-green-600">
                <span>進入審核 →</span>
              </div>
            </div>
          </Link>

          {/* User Management */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-50">
            <div className="flex items-center mb-4">
              <Users className="w-8 h-8 text-green-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">用戶管理</h3>
            </div>
            <p className="text-gray-600 mb-4">管理用戶帳戶，查看用戶活動和統計</p>
            <div className="flex items-center text-sm text-gray-400">
              <span>即將推出</span>
            </div>
          </div>

          {/* Analytics */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-50">
            <div className="flex items-center mb-4">
              <BarChart3 className="w-8 h-8 text-purple-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">數據分析</h3>
            </div>
            <p className="text-gray-600 mb-4">查看使用統計、食物評分趨勢和健康報告</p>
            <div className="flex items-center text-sm text-gray-400">
              <span>即將推出</span>
            </div>
          </div>

          {/* Reports */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-50">
            <div className="flex items-center mb-4">
              <FileText className="w-8 h-8 text-orange-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">報告系統</h3>
            </div>
            <p className="text-gray-600 mb-4">生成和管理醫療報告，導出數據</p>
            <div className="flex items-center text-sm text-gray-400">
              <span>即將推出</span>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-50">
            <div className="flex items-center mb-4">
              <Settings className="w-8 h-8 text-gray-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">系統設定</h3>
            </div>
            <p className="text-gray-600 mb-4">配置系統參數，管理備份和安全設定</p>
            <div className="flex items-center text-sm text-gray-400">
              <span>即將推出</span>
            </div>
          </div>

          {/* Database Tools */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 opacity-50">
            <div className="flex items-center mb-4">
              <Shield className="w-8 h-8 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">資料庫工具</h3>
            </div>
            <p className="text-gray-600 mb-4">資料庫維護、備份恢復和性能監控</p>
            <div className="flex items-center text-sm text-gray-400">
              <span>即將推出</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">最近活動</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mr-3" />
                <span className="text-gray-600">5分鐘前 - 用戶「張小明」提交自訂食物「自製蒸蛋羹」</span>
              </div>
              <div className="flex items-center text-sm">
                <Clock className="w-4 h-4 text-yellow-500 mr-3" />
                <span className="text-gray-600">10分鐘前 - 新用戶註冊：李美華</span>
              </div>
              <div className="flex items-center text-sm">
                <Database className="w-4 h-4 text-blue-500 mr-3" />
                <span className="text-gray-600">1小時前 - 系統自動同步台灣食物資料庫</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}