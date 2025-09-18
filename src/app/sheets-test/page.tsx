/**
 * 簡單的 Google Sheets API 測試頁面
 * 用於測試剛從 OAuth 獲得的新鮮 access token
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SheetsTestPage() {
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  // 從各種來源提取 access token
  const extractTokenFromStorage = () => {
    if (typeof window !== 'undefined') {
      // 1. 嘗試從 URL 參數提取 (OAuth 回調後)
      const params = new URLSearchParams(window.location.search);
      const authData = params.get('auth_data');
      if (authData) {
        try {
          const data = JSON.parse(authData);
          if (data.access_token) {
            setAccessToken(data.access_token);
            // 同時保存到 localStorage 以便下次使用
            localStorage.setItem('google_access_token', data.access_token);
            localStorage.setItem('google_user_info', JSON.stringify(data.user));
            console.log('✅ 從 URL 提取到 token 並已保存到 localStorage');

            // 清理 URL 參數
            window.history.replaceState({}, '', window.location.pathname);
            return data.access_token;
          }
        } catch (error) {
          console.error('解析 auth_data 失敗:', error);
        }
      }

      // 2. 嘗試從 localStorage 提取
      try {
        const storedToken = localStorage.getItem('google_access_token');
        if (storedToken) {
          setAccessToken(storedToken);
          console.log('✅ 從 localStorage 提取到 token');
          return storedToken;
        }
      } catch (error) {
        console.error('讀取 localStorage 失敗:', error);
      }

      // 3. 嘗試從加密儲存提取 (從認證服務)
      try {
        import('@/lib/google/auth-client').then(({ googleAuthClientService }) => {
          const authState = googleAuthClientService.getAuthState();
          if (authState.isAuthenticated && authState.tokens?.access_token) {
            setAccessToken(authState.tokens.access_token);
            console.log('✅ 從認證服務提取到 token');
            return authState.tokens.access_token;
          }
        });
      } catch (error) {
        console.error('從認證服務提取失敗:', error);
      }
    }
    return null;
  };

  // 檢查 token 狀態
  const checkTokenStatus = async () => {
    if (!accessToken.trim()) {
      alert('❌ 沒有 access token');
      return;
    }

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken);
      const data = await response.json();

      if (response.ok) {
        const expiresIn = data.expires_in || 0;
        const scope = data.scope || '';
        alert(`✅ Token 有效\n過期時間: ${Math.round(expiresIn/60)} 分鐘\n權限範圍: ${scope.includes('spreadsheets') ? '✅' : '❌'} Sheets`);
      } else {
        alert(`❌ Token 無效: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`❌ 檢查失敗: ${error.message}`);
    }
  };

  // 測試 Google Sheets API
  const testSheetsAPI = async (token?: string) => {
    const tokenToUse = token || accessToken;
    if (!tokenToUse) {
      alert('請輸入 access token 或從 OAuth 回調中提取');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/sheets-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ access_token: tokenToUse })
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        console.log('✅ Sheets API 測試成功:', data);
      } else {
        console.error('❌ Sheets API 測試失敗:', data);
      }
    } catch (error) {
      console.error('❌ 測試請求失敗:', error);
      setResult({
        success: false,
        error: '測試請求失敗: ' + (error instanceof Error ? error.message : '未知錯誤')
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 組件載入時嘗試從各種來源提取 token
  useEffect(() => {
    extractTokenFromStorage();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Google Sheets API 測試</h1>
        <p className="text-gray-600">
          直接測試 Google Sheets API 權限和創建功能
        </p>
      </div>

      {/* Access Token 輸入區域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Access Token 測試</CardTitle>
          <CardDescription>
            輸入從 OAuth 獲得的 access token 來測試 Google Sheets API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Access Token:</label>
            <textarea
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="貼上 Google access token..."
              className="w-full h-24 p-2 border rounded-md text-xs font-mono"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={extractTokenFromStorage} variant="outline">
              提取已儲存的 Token
            </Button>
            <Button
              onClick={checkTokenStatus}
              variant="outline"
              disabled={!accessToken.trim()}
            >
              檢查 Token 狀態
            </Button>
            <Button
              onClick={() => {
                // 跳轉到 Google OAuth，但讓 callback 重定向到 sheets-test
                const authUrl = new URL('/api/auth/google', window.location.origin);
                // 在 state 中加入 sheets-test 標記
                const state = 'sheets-test-' + Math.random().toString(36).substr(2, 9);
                authUrl.searchParams.set('state', state);
                window.location.href = authUrl.toString();
              }}
              variant="secondary"
            >
              從 Google 重新認證
            </Button>
            <Button
              onClick={() => testSheetsAPI()}
              disabled={isLoading || !accessToken.trim()}
            >
              {isLoading ? '測試中...' : '測試 Google Sheets API'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 測試結果 */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
              {result.success ? '✅ 測試成功' : '❌ 測試失敗'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-2">
                <p className="text-green-700">{result.message}</p>
                {result.spreadsheetId && (
                  <p className="text-sm text-gray-600">
                    試算表 ID: <code className="bg-gray-100 px-1 rounded">{result.spreadsheetId}</code>
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  測試時間: {result.timestamp}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-red-700">
                  錯誤: {result.error}
                </p>
                {result.status && (
                  <p className="text-sm text-gray-600">
                    HTTP 狀態: {result.status}
                  </p>
                )}
              </div>
            )}

            <details className="mt-4">
              <summary className="text-sm cursor-pointer text-gray-600">
                查看完整響應
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* 使用說明 */}
      <Card className="mt-6 bg-blue-50">
        <CardContent className="pt-6">
          <h4 className="font-medium text-blue-900 mb-2">測試步驟</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>到 <a href="/google-sync" className="underline">Google Sync 頁面</a> 完成 OAuth 認證</li>
            <li>認證完成後，從瀏覽器開發者工具的網路標籤複製新的 access token</li>
            <li>回到此頁面，貼上 token 並點擊「測試 Google Sheets API」</li>
            <li>查看測試結果，確認 API 權限是否正常</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}