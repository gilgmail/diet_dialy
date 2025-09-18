/**
 * Google API 權限測試頁面
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPermissionsPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState('');

  const testPermissions = async () => {
    if (!accessToken.trim()) {
      alert('請輸入 access token');
      return;
    }

    setIsLoading(true);
    setTestResults(null);

    try {
      const response = await fetch('/api/test-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ access_token: accessToken })
      });

      const result = await response.json();
      setTestResults(result);

      if (result.success) {
        console.log('✅ 權限測試完成:', result);
      } else {
        console.error('❌ 權限測試失敗:', result);
      }
    } catch (error) {
      console.error('❌ 測試請求失敗:', error);
      setTestResults({
        success: false,
        error: '測試請求失敗'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const extractTokenFromURL = () => {
    // 從當前頁面的 localStorage 或者其他地方提取 token
    if (typeof window !== 'undefined') {
      // 嘗試從 localStorage 獲取
      const storedToken = localStorage.getItem('google_access_token');
      if (storedToken) {
        setAccessToken(storedToken);
        return;
      }

      // 嘗試從加密的 token 儲存中獲取
      const encryptedToken = localStorage.getItem('secure_google_tokens');
      if (encryptedToken) {
        alert('找到加密的 token，請手動解密後輸入');
        return;
      }

      alert('未找到儲存的 access token，請手動輸入');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Google API 權限測試</h1>
        <p className="text-gray-600">
          測試當前 Google access token 的 API 權限
        </p>
      </div>

      {/* Token 輸入區域 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Access Token 設定</CardTitle>
          <CardDescription>
            輸入您的 Google access token 進行權限測試
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Access Token:</label>
            <textarea
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="輸入 Google access token..."
              className="w-full h-24 p-2 border rounded-md text-xs font-mono"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={extractTokenFromURL} variant="outline">
              從儲存中提取
            </Button>
            <Button
              onClick={testPermissions}
              disabled={isLoading || !accessToken.trim()}
            >
              {isLoading ? '測試中...' : '測試權限'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 測試結果 */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle className={testResults.success ? 'text-green-600' : 'text-red-600'}>
              {testResults.success ? '✅ 測試結果' : '❌ 測試失敗'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.success ? (
              <div className="space-y-4">
                {/* 用戶資訊 */}
                {testResults.user_info && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">用戶資訊</h4>
                    <p className="text-sm text-green-700">
                      Email: {testResults.user_info.email}<br/>
                      Name: {testResults.user_info.name}
                    </p>
                  </div>
                )}

                {/* 權限摘要 */}
                {testResults.permissions_summary && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">權限狀態</h4>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>用戶資訊: {testResults.permissions_summary.user_info}</p>
                      <p>Google Sheets: {testResults.permissions_summary.sheets_create}</p>
                      <p>Google Drive: {testResults.permissions_summary.drive_access}</p>
                    </div>
                  </div>
                )}

                {/* Google Sheets API 結果 */}
                {testResults.sheets_api && (
                  <div className={`p-3 rounded-lg ${testResults.sheets_api.error ? 'bg-red-50' : 'bg-green-50'}`}>
                    <h4 className={`font-medium mb-2 ${testResults.sheets_api.error ? 'text-red-800' : 'text-green-800'}`}>
                      Google Sheets API
                    </h4>
                    {testResults.sheets_api.error ? (
                      <p className="text-sm text-red-700">
                        錯誤: {testResults.sheets_api.error}
                      </p>
                    ) : (
                      <p className="text-sm text-green-700">
                        成功創建測試試算表: {testResults.sheets_api.spreadsheetId}
                      </p>
                    )}
                  </div>
                )}

                {/* Google Drive API 結果 */}
                {testResults.drive_api && (
                  <div className={`p-3 rounded-lg ${testResults.drive_api.error ? 'bg-red-50' : 'bg-green-50'}`}>
                    <h4 className={`font-medium mb-2 ${testResults.drive_api.error ? 'text-red-800' : 'text-green-800'}`}>
                      Google Drive API
                    </h4>
                    {testResults.drive_api.error ? (
                      <p className="text-sm text-red-700">
                        錯誤: {testResults.drive_api.error}
                      </p>
                    ) : (
                      <p className="text-sm text-green-700">
                        Drive API 連接成功
                      </p>
                    )}
                  </div>
                )}

                {/* 原始結果 (調試用) */}
                <details className="mt-4">
                  <summary className="text-sm cursor-pointer text-gray-600">
                    查看完整測試結果 (調試用)
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(testResults, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-red-700">
                  錯誤: {testResults.error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 使用說明 */}
      <Card className="mt-6 bg-blue-50">
        <CardContent className="pt-6">
          <h4 className="font-medium text-blue-900 mb-2">使用說明</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>1. 先到 Google Sync 頁面完成 OAuth 認證</p>
            <p>2. 從瀏覽器開發者工具中複製 access token</p>
            <p>3. 貼上 token 並點擊"測試權限"</p>
            <p>4. 查看 API 權限測試結果</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}