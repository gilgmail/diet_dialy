'use client'

import { useState, useEffect } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase/client'

export default function TestSupabasePage() {
  const { user, userProfile, isLoading, isAuthenticated, signInWithGoogle, signOut } = useSupabaseAuth()
  const [connectionStatus, setConnectionStatus] = useState<string>('測試中...')
  const [dbTables, setDbTables] = useState<string[]>([])

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      // 測試基本連線
      const { data, error } = await supabase
        .from('diet_daily_foods')
        .select('count(*)')
        .limit(1)

      if (error) {
        setConnectionStatus(`❌ 連線失敗: ${error.message}`)
      } else {
        setConnectionStatus('✅ Supabase 連線成功！')

        // 檢查資料表
        const tables = [
          'diet_daily_users',
          'diet_daily_foods',
          'food_entries',
          'medical_reports',
          'symptom_tracking'
        ]

        const tableResults = []
        for (const table of tables) {
          try {
            const { data, error } = await supabase
              .from(table)
              .select('count(*)')
              .limit(1)

            if (!error) {
              tableResults.push(`✅ ${table}`)
            } else {
              tableResults.push(`❌ ${table}: ${error.message}`)
            }
          } catch (err) {
            tableResults.push(`❌ ${table}: 測試失敗`)
          }
        }

        setDbTables(tableResults)
      }
    } catch (err) {
      setConnectionStatus(`❌ 連線錯誤: ${err instanceof Error ? err.message : '未知錯誤'}`)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('登入失敗:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('登出失敗:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🧪 Supabase 連線測試
          </h1>

          {/* 連線狀態 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">📡 連線狀態</h2>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-lg">{connectionStatus}</p>
            </div>
          </div>

          {/* 資料表檢查 */}
          {dbTables.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">📋 資料表檢查</h2>
              <div className="bg-gray-100 p-4 rounded-lg">
                {dbTables.map((table, index) => (
                  <p key={index} className="mb-1">{table}</p>
                ))}
              </div>
            </div>
          )}

          {/* 認證測試 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">🔐 認證測試</h2>
            <div className="bg-gray-100 p-4 rounded-lg">
              {isLoading && <p>🔄 認證狀態載入中...</p>}

              {!isLoading && !isAuthenticated && (
                <div>
                  <p className="mb-4">❌ 未登入</p>
                  <button
                    onClick={handleGoogleSignIn}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    🔐 使用 Google 登入
                  </button>
                </div>
              )}

              {!isLoading && isAuthenticated && (
                <div>
                  <p className="mb-2">✅ 已登入</p>
                  {user && (
                    <div className="mb-4">
                      <p><strong>用戶 ID:</strong> {user.id}</p>
                      <p><strong>Email:</strong> {user.email}</p>
                    </div>
                  )}
                  {userProfile && (
                    <div className="mb-4">
                      <p><strong>名稱:</strong> {userProfile.name || '未設定'}</p>
                      <p><strong>管理員:</strong> {userProfile.is_admin ? '是' : '否'}</p>
                    </div>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                  >
                    🚪 登出
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 環境變數檢查 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">⚙️ 環境變數檢查</h2>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p>
                <strong>Supabase URL:</strong> {
                  typeof window !== 'undefined' && window.location.origin
                    ? `✅ 設定完成`
                    : '❌ 未設定'
                }
              </p>
              <p>
                <strong>Supabase Anon Key:</strong> {
                  supabase.supabaseKey
                    ? `✅ ${supabase.supabaseKey.substring(0, 20)}...`
                    : '❌ 未設定'
                }
              </p>
            </div>
          </div>

          {/* 重新測試按鈕 */}
          <div className="flex space-x-4">
            <button
              onClick={testConnection}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              🔄 重新測試連線
            </button>

            <a
              href="/"
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded inline-block text-center"
            >
              🏠 返回首頁
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}