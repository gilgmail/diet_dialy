'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || 'unknown_error'

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'access_denied':
        return '您取消了 Google 登入授權'
      case 'invalid_request':
        return '登入請求無效，請重試'
      case 'server_error':
        return '伺服器錯誤，請稍後再試'
      case 'temporarily_unavailable':
        return '服務暫時無法使用，請稍後再試'
      case 'unexpected_error':
        return '發生未預期的錯誤'
      default:
        return `登入過程發生錯誤: ${error}`
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              登入失敗
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {getErrorMessage(message)}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <Link
              href="/"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              返回首頁
            </Link>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              重新嘗試
            </button>
          </div>

          <div className="mt-6">
            <div className="text-xs text-gray-500">
              <p>如果問題持續發生，請檢查：</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>網路連線是否正常</li>
                <li>瀏覽器是否支援第三方 Cookie</li>
                <li>是否使用了廣告攔截器</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}