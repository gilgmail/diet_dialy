/**
 * Google Sheets 同步設置頁面
 * 允許用戶登入 Google 帳號並設置個人 Google Sheets 食物記錄
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoogleAuth } from '@/lib/google';
import { GoogleAuthButton } from '@/components/google/GoogleAuthButton';
import { Shield, FileText, Database, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function GoogleSyncPage() {
  const {
    isAuthenticated,
    user,
    isLoading,
    error,
    signIn,
    signOut,
    authenticatedRequest,
    completeAuth,
    updateAuthState
  } = useGoogleAuth();

  const [syncStatus, setSyncStatus] = useState<{
    isConnected: boolean;
    spreadsheetId?: string;
    lastSync?: string;
    isSyncing: boolean;
  }>({
    isConnected: false,
    isSyncing: false
  });

  // 處理 OAuth 回調 - 使用 sessionStorage 防止重複處理
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth_success');
    const authData = urlParams.get('auth_data');

    // 檢查是否有 OAuth 回調參數且尚未處理
    if (authSuccess === 'true' && authData && !sessionStorage.getItem('oauth_processed')) {
      console.log('🔄 處理 OAuth 回調...');

      // 立即標記為已處理，防止重複
      sessionStorage.setItem('oauth_processed', 'true');

      // 立即清理 URL，防止刷新時重複處理
      window.history.replaceState({}, '', window.location.pathname);

      try {
        const data = JSON.parse(authData);
        console.log('✅ Google 認證成功:', data.user?.email);

        if (data.access_token && data.user) {
          import('@/lib/google/auth-client').then(({ googleAuthClientService }) => {
            const tokens = {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_in: 3600
            };

            googleAuthClientService.setAuthData(tokens, data.user).then(() => {
              console.log('✅ 認證資料已保存');
              updateAuthState();

              // 3秒後清除標記，允許新的認證
              setTimeout(() => {
                sessionStorage.removeItem('oauth_processed');
              }, 3000);
            });
          });
        }
      } catch (error) {
        console.error('❌ OAuth 處理失敗:', error);
        sessionStorage.removeItem('oauth_processed');
      }
    }
  }, []); // 僅在組件掛載時執行

  // 監聽認證狀態變更
  useEffect(() => {
    console.log('🔍 認證狀態更新:', { isAuthenticated, user: user?.email, isLoading });
  }, [isAuthenticated, user, isLoading]);

  // 創建或連接 Google Sheets
  const handleCreateSpreadsheet = async () => {
    if (!isAuthenticated) {
      alert('請先登入 Google 帳號');
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      console.log('🔄 開始創建 Google Sheets...');

      // 創建 Google Sheets
      const response = await authenticatedRequest(
        'https://sheets.googleapis.com/v4/spreadsheets',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: {
              title: `Diet Daily - 飲食記錄 - ${new Date().toISOString().split('T')[0]}`,
              locale: 'zh_TW',
              timeZone: 'Asia/Taipei'
            },
            sheets: [
              {
                properties: {
                  title: '食物歷史',
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 15
                  }
                }
              },
              {
                properties: {
                  title: '症狀記錄',
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 10
                  }
                }
              },
              {
                properties: {
                  title: '醫療檔案',
                  gridProperties: {
                    rowCount: 100,
                    columnCount: 10
                  }
                }
              }
            ]
          })
        }
      );

      console.log('📊 Google Sheets API 響應狀態:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Google Sheets API 錯誤:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`創建 Google Sheets 失敗: HTTP ${response.status} - ${errorText}`);
      }

      const spreadsheetData = await response.json();
      console.log('✅ Google Sheets 創建成功:', spreadsheetData.spreadsheetId);

      // 設置標題行
      await setupSpreadsheetHeaders(spreadsheetData.spreadsheetId);

      setSyncStatus({
        isConnected: true,
        spreadsheetId: spreadsheetData.spreadsheetId,
        lastSync: new Date().toISOString(),
        isSyncing: false
      });

      alert(`✅ Google Sheets 創建成功！\\n試算表 ID: ${spreadsheetData.spreadsheetId}`);

    } catch (error) {
      console.error('創建 Google Sheets 失敗:', error);

      // 提供更詳細的錯誤資訊
      let errorMessage = '❌ 創建 Google Sheets 失敗';
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage += '\\n原因: 認證過期，請重新登入 Google 帳號';
        } else if (error.message.includes('403')) {
          errorMessage += '\\n原因: 權限不足，請檢查 Google Sheets API 是否已啟用';
        } else {
          errorMessage += `\\n錯誤: ${error.message}`;
        }
      }

      alert(errorMessage);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  // 設置試算表標題行
  const setupSpreadsheetHeaders = async (spreadsheetId: string) => {
    const updates = [
      {
        range: '食物歷史!A1:O1',
        values: [[
          '日期', '時間', '食物ID', '食物名稱', '食物類別',
          '份量', '單位', '醫療評分', '風險等級', '過敏警告',
          '症狀前', '症狀後', '嚴重度', '備註', '位置'
        ]]
      },
      {
        range: '症狀記錄!A1:J1',
        values: [[
          '日期', '時間', '症狀類型', '嚴重度', '評分',
          '持續時間', '觸發因子', '相關食物', '備註', '活動影響'
        ]]
      },
      {
        range: '醫療檔案!A1:J1',
        values: [[
          '更新日期', '主要條件', '次要條件', '已知過敏', '個人觸發因子',
          '當前階段', '乳糖不耐', '纖維敏感', 'IBS 亞型', 'FODMAP 耐受性'
        ]]
      }
    ];

    for (const update of updates) {
      await authenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${update.range}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: update.values
          })
        }
      );
    }
  };

  // 同步食物記錄到 Google Sheets
  const handleSyncFoodHistory = async () => {
    if (!syncStatus.spreadsheetId) {
      alert('請先創建 Google Sheets');
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      // 模擬從本地數據庫獲取食物記錄
      const foodHistory = [
        [
          new Date().toLocaleDateString('zh-TW'),
          new Date().toLocaleTimeString('zh-TW'),
          'apple',
          '蘋果',
          '水果',
          '150',
          '克',
          '8.5',
          '低風險',
          '無',
          '無',
          '無',
          '0',
          '健康選擇',
          '家中'
        ],
        [
          new Date(Date.now() - 3600000).toLocaleDateString('zh-TW'),
          new Date(Date.now() - 3600000).toLocaleTimeString('zh-TW'),
          'rice',
          '白米飯',
          '主食',
          '200',
          '克',
          '7.0',
          '中風險',
          '無',
          '無',
          '輕微脹氣',
          '2',
          '主食攝取',
          '餐廳'
        ]
      ];

      // 清除現有資料並插入新資料
      await authenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${syncStatus.spreadsheetId}/values/食物歷史!A2:O1000:clear`,
        { method: 'POST' }
      );

      // 插入新資料
      await authenticatedRequest(
        `https://sheets.googleapis.com/v4/spreadsheets/${syncStatus.spreadsheetId}/values/食物歷史!A2?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: foodHistory
          })
        }
      );

      setSyncStatus(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
        isSyncing: false
      }));

      alert(`✅ 成功同步 ${foodHistory.length} 筆食物記錄到 Google Sheets！`);

    } catch (error) {
      console.error('同步食物記錄失敗:', error);
      alert('❌ 同步失敗，請檢查網路連接和權限');
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Google Sheets 同步設置</h1>
        <p className="text-gray-600">
          連接您的 Google 帳號，將飲食記錄同步到個人 Google Sheets
        </p>
      </div>

      {/* 認證狀態調試區塊 */}
      <Card className="mb-6 bg-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            🔍 認證狀態調試
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">認證狀態:</span>
            <span className={isAuthenticated ? "text-green-600" : "text-red-600"}>
              {isAuthenticated ? "✅ 已認證" : "❌ 未認證"}
            </span>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <span className="font-medium">使用者:</span>
              <span className="text-blue-600">{user.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="font-medium">載入中:</span>
            <span>{isLoading ? "⏳ 是" : "✅ 否"}</span>
          </div>
          {error && (
            <div className="flex items-center gap-2">
              <span className="font-medium">錯誤:</span>
              <span className="text-red-600">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google 認證卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Google 帳號連接
          </CardTitle>
          <CardDescription>
            登入您的 Google 帳號以使用 Google Sheets 同步功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleAuthButton
            onAuthSuccess={(user) => {
              console.log('認證成功:', user);
            }}
            onAuthError={(error) => {
              console.error('認證失敗:', error);
            }}
          />
        </CardContent>
      </Card>

      {/* 同步設置卡片 */}
      {isAuthenticated && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Google Sheets 設置
            </CardTitle>
            <CardDescription>
              創建或連接您的個人 Google Sheets 來存儲飲食記錄
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!syncStatus.isConnected ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  點擊下方按鈕創建專屬的 Google Sheets 試算表
                </p>
                <Button
                  onClick={handleCreateSpreadsheet}
                  disabled={syncStatus.isSyncing}
                  className="w-full"
                >
                  {syncStatus.isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      創建中...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      創建 Google Sheets
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">已連接到 Google Sheets</span>
                </div>
                {syncStatus.spreadsheetId && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">試算表 ID:</p>
                    <p className="text-sm font-mono break-all">{syncStatus.spreadsheetId}</p>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${syncStatus.spreadsheetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      在 Google Sheets 中開啟 ↗
                    </a>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 同步操作卡片 */}
      {isAuthenticated && syncStatus.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              數據同步
            </CardTitle>
            <CardDescription>
              將您的飲食記錄同步到 Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {syncStatus.lastSync && (
              <div className="text-sm text-gray-600">
                最後同步時間: {new Date(syncStatus.lastSync).toLocaleString('zh-TW')}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={handleSyncFoodHistory}
                disabled={syncStatus.isSyncing}
                variant="outline"
              >
                {syncStatus.isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    同步中...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    同步食物記錄
                  </>
                )}
              </Button>

              <Button
                disabled={true}
                variant="outline"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                同步症狀記錄 (即將推出)
              </Button>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">數據安全說明</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 您的醫療資料僅存儲在您的個人 Google 帳號中</li>
                <li>• 我們不會將您的資料儲存在我們的伺服器上</li>
                <li>• 您可以隨時撤銷應用程式的 Google 帳號存取權限</li>
                <li>• 所有數據傳輸都經過加密保護</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}