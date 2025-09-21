'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/supabase/auth'

export default function TestAuthPage() {
  const [status, setStatus] = useState('初始化中...')
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const testAuth = async () => {
      try {
        addLog('🔍 開始測試認證服務...')

        // 測試 1: 獲取當前用戶
        addLog('📝 測試 1: 獲取當前用戶')
        const user = await authService.getCurrentUser()
        addLog(`結果: ${user ? `用戶 ${user.email}` : '無用戶'}`)

        if (user) {
          // 測試 2: 獲取用戶資料
          addLog('📝 測試 2: 獲取用戶資料')
          try {
            const profile = await authService.getUserProfile(user.id)
            addLog(`結果: ${profile ? '有用戶資料' : '無用戶資料'}`)
          } catch (profileError) {
            addLog(`❌ 用戶資料錯誤: ${profileError}`)
          }
        }

        addLog('✅ 認證測試完成')
        setStatus('測試完成')

      } catch (error) {
        addLog(`❌ 認證測試失敗: ${error}`)
        setStatus('測試失敗')
      }
    }

    testAuth()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">🧪 認證服務測試</h1>

        <div className="bg-white rounded-lg p-6 shadow">
          <div className="mb-4">
            <strong>狀態:</strong> {status}
          </div>

          <div className="space-y-2">
            <strong>日誌:</strong>
            {logs.map((log, index) => (
              <div key={index} className="font-mono text-sm bg-gray-100 p-2 rounded">
                {log}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              重新測試
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}