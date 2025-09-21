'use client';

import { useState, useEffect } from 'react';
import { useMedicalData } from '@/lib/google';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, FileSpreadsheet, Plus, Loader2 } from 'lucide-react';

export default function SheetsTestPage() {
  const {
    isAuthenticated,
    user,
    signIn,
    medicalService,
    recordFoodEntry,
    getAllFoodEntries,
    getFoodStatistics,
    getMedicalSpreadsheetUrl
  } = useMedicalData();

  const [isLoading, setIsLoading] = useState(false);
  const [foodEntries, setFoodEntries] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [testResult, setTestResult] = useState<string>('');

  // Initialize service when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      initializeService();
    }
  }, [isAuthenticated, user]);

  const initializeService = async () => {
    try {
      setIsLoading(true);
      setTestResult('🧹 清理舊有工作表...');

      // Clear any existing broken spreadsheet data
      localStorage.removeItem(`diet_daily_sheet_${user!.id}`);

      setTestResult('🚀 開始初始化服務...');
      const success = await medicalService.initialize(user!.id);
      if (success) {
        setTestResult('✅ 服務初始化成功');
        await loadData();
      } else {
        setTestResult('❌ 服務初始化失敗');
      }
    } catch (error) {
      console.error('初始化失敗:', error);
      setTestResult('❌ 初始化錯誤: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const entries = await getAllFoodEntries();
      const stats = await getFoodStatistics();
      setFoodEntries(entries);
      setStatistics(stats);
      setTestResult(prev => prev + '\n✅ 資料讀取成功');
    } catch (error) {
      console.error('載入資料失敗:', error);
      setTestResult(prev => prev + '\n❌ 載入資料失敗: ' + (error as Error).message);
    }
  };

  const addTestEntry = async () => {
    try {
      setIsLoading(true);
      const testEntry = {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
        foodName: '測試食品 - ' + new Date().toLocaleTimeString(),
        category: '測試',
        medicalScore: 7,
        notes: '這是一筆測試記錄',
        userId: user!.id
      };

      const success = await recordFoodEntry(testEntry);
      if (success) {
        setTestResult(prev => prev + '\n✅ 新增記錄成功');
        await loadData();
      } else {
        setTestResult(prev => prev + '\n❌ 新增記錄失敗');
      }
    } catch (error) {
      console.error('新增記錄失敗:', error);
      setTestResult(prev => prev + '\n❌ 新增記錄錯誤: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerMigration = async () => {
    try {
      setIsLoading(true);
      setTestResult(prev => prev + '\n🔍 開始搜尋其他飲食記錄檔案...');

      // Clear current spreadsheet data to force re-initialization with migration
      localStorage.removeItem(`diet_daily_sheet_${user!.id}`);

      setTestResult(prev => prev + '\n🔄 重新初始化服務以觸發檔案整合...');
      const success = await medicalService.initialize(user!.id);

      if (success) {
        setTestResult(prev => prev + '\n✅ 檔案整合完成！');
        await loadData();
      } else {
        setTestResult(prev => prev + '\n❌ 檔案整合失敗');
      }
    } catch (error) {
      console.error('檔案整合失敗:', error);
      setTestResult(prev => prev + '\n❌ 檔案整合錯誤: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('登入失敗:', error);
      setTestResult('❌ 登入失敗: ' + (error as Error).message);
    }
  };

  const spreadsheetUrl = getMedicalSpreadsheetUrl();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Google Sheets 測試</CardTitle>
            <p className="text-gray-600">請先登入以測試 Google Sheets 功能</p>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignIn} className="w-full">
              使用 Google 帳號登入
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6" />
              Google Sheets 長時間連線測試
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">用戶: {user?.email}</Badge>
              <Badge variant={isAuthenticated ? "default" : "destructive"}>
                {isAuthenticated ? "已連線" : "未連線"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle>測試控制</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={addTestEntry}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  新增測試記錄
                </Button>
                <Button
                  onClick={loadData}
                  disabled={isLoading}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              <Button
                onClick={triggerMigration}
                disabled={isLoading}
                variant="secondary"
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                整合其他飲食記錄檔案
              </Button>

              {spreadsheetUrl && (
                <Button
                  onClick={() => window.open(spreadsheetUrl, '_blank')}
                  variant="outline"
                  className="w-full"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  開啟 Google 工作表
                </Button>
              )}

              <div className="bg-gray-100 p-3 rounded text-sm">
                <strong>測試結果:</strong>
                <pre className="whitespace-pre-wrap mt-2">{testResult}</pre>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>統計資料</CardTitle>
            </CardHeader>
            <CardContent>
              {statistics ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {statistics.totalEntries}
                    </div>
                    <div className="text-sm text-gray-600">總記錄數</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {statistics.todayEntries}
                    </div>
                    <div className="text-sm text-gray-600">今日記錄</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {statistics.weekEntries}
                    </div>
                    <div className="text-sm text-gray-600">本週記錄</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {statistics.averageMedicalScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">平均分數</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">載入中...</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Food Entries */}
        <Card>
          <CardHeader>
            <CardTitle>最近的食物記錄</CardTitle>
          </CardHeader>
          <CardContent>
            {foodEntries.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {foodEntries.slice(0, 10).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{entry.foodName}</div>
                      <div className="text-sm text-gray-600">
                        {entry.date} {entry.time} • {entry.category}
                      </div>
                      {entry.notes && (
                        <div className="text-sm text-gray-500 mt-1">{entry.notes}</div>
                      )}
                    </div>
                    {entry.medicalScore && (
                      <Badge variant="outline">
                        分數: {entry.medicalScore}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500">尚無記錄</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}