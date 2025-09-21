'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Star,
  AlertTriangle,
  CheckCircle,
  Home,
  Utensils,
  Camera,
  Heart,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useMedicalData } from '@/lib/google';
import { SyncStatus } from '@/components/google/SyncStatus';
import { offlineStorageManager } from '@/lib/offline-storage';

interface FoodEntry {
  id: string;
  foodName: string;
  customFood?: boolean;
  userScore?: number;
  portion: string;
  time: string;
  notes?: string;
  photoUrl?: string;
  symptoms?: string[];
  verified?: boolean;
}

interface DailyLog {
  date: string;
  entries: FoodEntry[];
  totalScore: number;
  averageScore: number;
}

export default function FoodDiaryPage(): JSX.Element {
  const { isAuthenticated, user, recordFoodEntry, syncStatus, isReady, medicalService } = useMedicalData();
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyLog, setDailyLog] = useState<DailyLog>({
    date: currentDate,
    entries: [],
    totalScore: 0,
    averageScore: 0
  });

  // 載入本地存儲的食物記錄
  useEffect(() => {
    const loadStoredEntries = () => {
      if (typeof window === 'undefined') return;
      try {
        const storedKey = `food_diary_${currentDate}`;
        const stored = localStorage.getItem(storedKey);
        if (stored) {
          const parsedEntries = JSON.parse(stored);
          const totalScore = parsedEntries.reduce((sum: number, e: FoodEntry) => sum + (e.userScore || 0), 0);
          const averageScore = parsedEntries.length > 0 ? totalScore / parsedEntries.length : 0;

          setDailyLog({
            date: currentDate,
            entries: parsedEntries,
            totalScore,
            averageScore
          });
        }
      } catch (error) {
        console.error('載入本地食物記錄失敗:', error);
      }
    };

    loadStoredEntries();
  }, [currentDate]);

  // 更新待同步記錄數量
  useEffect(() => {
    const updatePendingCount = () => {
      const count = offlineStorageManager.getPendingCount();
      setPendingCount(count);
    };

    updatePendingCount();

    // 每5秒更新一次計數
    const interval = setInterval(updatePendingCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // 載入所有記錄（本地 + 暫存）
  useEffect(() => {
    const loadAllRecords = () => {
      // 載入本地已同步的記錄
      const localEntries = dailyLog.entries.map(entry => ({
        ...entry,
        source: 'local',
        syncStatus: 'synced',
        tempId: null
      }));

      // 載入暫存的記錄
      const pendingEntries = offlineStorageManager.getPendingEntries()
        .filter(entry => entry.date === currentDate)
        .map(entry => ({
          id: entry.tempId,
          foodName: entry.foodName,
          customFood: true,
          userScore: entry.medicalScore || 0,
          portion: '1份',
          time: entry.time,
          notes: entry.notes || '',
          symptoms: [],
          verified: false,
          source: 'pending',
          syncStatus: entry.syncStatus,
          tempId: entry.tempId,
          category: entry.category,
          createdAt: entry.createdAt,
          errorMessage: entry.errorMessage
        }));

      const combined = [...localEntries, ...pendingEntries];
      setAllRecords(combined);
    };

    loadAllRecords();

    // 每5秒更新一次記錄列表
    const interval = setInterval(loadAllRecords, 5000);

    return () => clearInterval(interval);
  }, [dailyLog.entries, currentDate]);


  // 保存食物記錄到本地存儲
  const saveDailyLog = (dailyLog: DailyLog) => {
    if (typeof window === 'undefined') return;
    try {
      const storageKey = `food_diary_${currentDate}`;
      localStorage.setItem(storageKey, JSON.stringify(dailyLog.entries));
    } catch (error) {
      console.error('保存食物記錄失敗:', error);
    }
  };

  const [showAddFood, setShowAddFood] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSync, setIsSync] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [recordFilter, setRecordFilter] = useState<'all' | 'synced' | 'pending' | 'error'>('all');
  const [autoSync, setAutoSync] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // 載入客戶端設置 - 避免 hydration 錯誤
  useEffect(() => {
    try {
      const savedAutoSync = offlineStorageManager.getAutoSyncSetting();
      setAutoSync(savedAutoSync);

      // 檢查離線模式設置
      const offlineMode = localStorage.getItem('diet_daily_offline_mode');
      setShowAuthPrompt(!isAuthenticated && !offlineMode);
    } catch (error) {
      console.error('載入設置失敗:', error);
      setShowAuthPrompt(!isAuthenticated);
    }
  }, [isAuthenticated]);

  // 實時同步狀態檢查 - 必須在 autoSync 狀態聲明之後
  useEffect(() => {
    const checkSyncStatus = async () => {
      if (isAuthenticated && medicalService && medicalService.isReady()) {
        try {
          console.log('🔍 開始實時同步狀態檢查...');

          // 比較本地記錄與 Google Sheets 記錄
          await offlineStorageManager.compareSyncStatus(medicalService);

          // 如果啟用自動同步，執行自動同步
          if (autoSync) {
            await offlineStorageManager.performAutoSync(medicalService);
          }

          // 更新待同步數量
          setPendingCount(offlineStorageManager.getPendingCount());
        } catch (error) {
          console.error('❌ 實時同步狀態檢查失敗:', error);
        }
      }
    };

    // 初次檢查
    checkSyncStatus();

    // 每30秒檢查一次同步狀態
    const syncInterval = setInterval(checkSyncStatus, 30000);

    return () => clearInterval(syncInterval);
  }, [isAuthenticated, medicalService, autoSync]);

  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [newFoodEntry, setNewFoodEntry] = useState({
    foodName: '',
    customFood: false,
    userScore: 5,
    portion: '',
    time: new Date().toTimeString().slice(0, 5),
    notes: '',
    symptoms: [] as string[],
    // Enhanced scoring criteria
    scoringCriteria: {
      digestibility: 5,
      allergyRisk: 5,
      nutritionalValue: 5,
      personalTolerance: 5
    },
    medicalRating: 'neutral' as 'safe' | 'caution' | 'avoid' | 'neutral'
  });

  // 模擬食物數據庫搜尋
  const searchFoods = (term: string) => {
    const commonFoods = [
      { id: '1', name: '白米飯', score: 7, category: '穀物' },
      { id: '2', name: '雞胸肉', score: 8, category: '蛋白質' },
      { id: '3', name: '青花菜', score: 9, category: '蔬菜' },
      { id: '4', name: '香蕉', score: 6, category: '水果' },
      { id: '5', name: '牛奶', score: 4, category: '乳製品' },
      { id: '6', name: '麵包', score: 5, category: '穀物' },
      { id: '7', name: '鮭魚', score: 9, category: '蛋白質' },
      { id: '8', name: '菠菜', score: 8, category: '蔬菜' }
    ];

    return commonFoods.filter(food =>
      food.name.toLowerCase().includes(term.toLowerCase())
    );
  };

  const handleAddFood = async (food?: any) => {
    let foodData = newFoodEntry;

    if (food) {
      // 從資料庫選擇的食物 - 直接創建記錄
      foodData = {
        ...newFoodEntry,
        foodName: food.name,
        customFood: false,
        userScore: food.score,
        portion: '1份', // 設定預設份量
      };
    }

    // 檢查必要欄位
    if (!foodData.foodName || !foodData.portion) {
      alert('請填寫食物名稱和份量');
      return;
    }

    const calculatedScore = food ? food.score : calculateOverallScore(foodData.scoringCriteria);

    const entry: FoodEntry = {
      id: `${Date.now()}-${Math.random()}`,
      foodName: foodData.foodName,
      customFood: foodData.customFood,
      userScore: calculatedScore,
      portion: foodData.portion,
      time: foodData.time,
      notes: foodData.notes,
      symptoms: foodData.symptoms,
      verified: !foodData.customFood
    };

    // 暫存到離線存儲，等待手動同步
    console.log('📝 添加食物記錄到離線暫存...');

    const pendingFoodEntry = {
      date: currentDate,
      time: foodData.time,
      foodName: foodData.foodName,
      category: food?.category || '自定義',
      medicalScore: calculatedScore,
      notes: foodData.notes || '',
      userId: user?.id || 'demo-user'
    };

    try {
      const pendingEntry = offlineStorageManager.addPendingEntry(pendingFoodEntry);
      console.log('✅ 食物記錄已暫存:', pendingEntry.tempId);

      // 顯示暫存成功提示
      alert(`✅ 食物記錄已暫存！\n📝 記錄: ${foodData.foodName}\n⏳ 等待同步到 Google Sheets`);
    } catch (error) {
      console.error('❌ 暫存失敗:', error);
      alert('❌ 暫存失敗，請重試');
      return;
    }

    setDailyLog(prev => {
      const newEntries = [...prev.entries, entry];
      const totalScore = newEntries.reduce((sum, e) => sum + (e.userScore || 0), 0);
      const averageScore = newEntries.length > 0 ? totalScore / newEntries.length : 0;

      const updatedLog = {
        ...prev,
        entries: newEntries,
        totalScore,
        averageScore
      };

      // 立即保存到localStorage
      saveDailyLog(updatedLog);

      // 發送事件通知其他組件數據已更新
      window.dispatchEvent(new CustomEvent('food-diary-update', {
        detail: { date: currentDate, entries: newEntries }
      }));

      return updatedLog;
    });

    // 重置表單
    setNewFoodEntry({
      foodName: '',
      customFood: false,
      userScore: 5,
      portion: '',
      time: new Date().toTimeString().slice(0, 5),
      notes: '',
      symptoms: [],
      scoringCriteria: {
        digestibility: 5,
        allergyRisk: 5,
        nutritionalValue: 5,
        personalTolerance: 5
      },
      medicalRating: 'neutral' as 'safe' | 'caution' | 'avoid' | 'neutral'
    });
    setShowAddFood(false);
    setSearchTerm('');

    // 如果啟用自動同步且服務可用，自動同步
    if (autoSync && isAuthenticated && medicalService && medicalService.isReady()) {
      try {
        console.log('🔄 自動同步新添加的記錄...');
        setTimeout(async () => {
          await offlineStorageManager.performAutoSync(medicalService);
          setPendingCount(offlineStorageManager.getPendingCount());
        }, 1000); // 延遲1秒以確保記錄已保存
      } catch (error) {
        console.error('❌ 自動同步失敗:', error);
      }
    }
  };

  // 手動同步功能
  const handleManualSync = async () => {
    if (isSync) return; // 防止重複同步

    if (!medicalService.isReady()) {
      const userChoice = window.confirm(
        '⚠️ 需要 Google 認證才能同步\n\n點擊"確定"前往登入頁面\n點擊"取消"繼續使用離線模式'
      );

      if (userChoice) {
        window.location.href = '/google-sync';
      }
      return;
    }

    const pendingCount = offlineStorageManager.getPendingCount();
    if (pendingCount === 0) {
      alert('✅ 沒有待同步的記錄');
      return;
    }

    setIsSync(true);

    try {
      console.log(`🔄 開始同步 ${pendingCount} 筆暫存記錄...`);

      const result = await offlineStorageManager.syncPendingEntries(medicalService);

      const { success, failed } = result;

      if (failed > 0) {
        alert(`⚠️ 同步完成\n✅ 成功: ${success} 筆\n❌ 失敗: ${failed} 筆\n\n請檢查網路連線並重試失敗項目`);
      } else {
        alert(`🎉 同步成功！\n✅ 已同步 ${success} 筆記錄到 Google Sheets`);
      }

      // 更新待同步數量
      setPendingCount(offlineStorageManager.getPendingCount());

    } catch (error) {
      console.error('❌ 手動同步失敗:', error);
      alert('❌ 同步失敗，請檢查網路連線並重試');
    } finally {
      setIsSync(false);
    }
  };

  // 過濾記錄
  const getFilteredRecords = () => {
    if (recordFilter === 'all') return allRecords;
    if (recordFilter === 'synced') return allRecords.filter(record => record.syncStatus === 'synced');
    if (recordFilter === 'pending') return allRecords.filter(record =>
      record.syncStatus === 'pending' || record.syncStatus === 'syncing'
    );
    if (recordFilter === 'error') return allRecords.filter(record => record.syncStatus === 'error');
    return allRecords;
  };

  const getStatusBadge = (record: any) => {
    if (record.syncStatus === 'synced') {
      return <Badge className="bg-green-100 text-green-700">已同步</Badge>;
    }
    if (record.syncStatus === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-700">待同步</Badge>;
    }
    if (record.syncStatus === 'syncing') {
      return <Badge className="bg-blue-100 text-blue-700">同步中</Badge>;
    }
    if (record.syncStatus === 'error') {
      return <Badge className="bg-red-100 text-red-700">同步失敗</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700">未知</Badge>;
  };

  const handleCustomFood = () => {
    setNewFoodEntry(prev => ({
      ...prev,
      customFood: true
    }));
  };

  const searchResults = searchTerm.length > 0 ? searchFoods(searchTerm) : [];

  // 計算綜合評分
  const calculateOverallScore = (criteria: any) => {
    const { digestibility, allergyRisk, nutritionalValue, personalTolerance } = criteria;
    return Math.round((digestibility + allergyRisk + nutritionalValue + personalTolerance) / 4 * 10) / 10;
  };

  // 根據評分決定醫療評級
  const getMedicalRating = (score: number) => {
    if (score >= 8) return 'safe';
    if (score >= 6) return 'caution';
    if (score >= 4) return 'avoid';
    return 'avoid';
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    if (score >= 4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'safe': return 'text-green-600 bg-green-100';
      case 'caution': return 'text-yellow-600 bg-yellow-100';
      case 'avoid': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRatingText = (rating: string) => {
    switch (rating) {
      case 'safe': return '安全';
      case 'caution': return '謹慎';
      case 'avoid': return '避免';
      default: return '中性';
    }
  };


  if (showAuthPrompt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-center">需要登入</CardTitle>
            <CardDescription className="text-center">
              請先登入 Google 帳號以使用同步功能，或繼續使用離線模式
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <Link href="/google-sync">
              <Button className="w-full">
                前往 Google 登入
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                // 設置離線模式標記
                if (typeof window !== 'undefined') {
                  localStorage.setItem('diet_daily_offline_mode', 'true');
                  window.location.reload();
                }
              }}
            >
              繼續離線使用
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Home className="w-5 h-5 mr-2" />
                控制板
              </Link>
              <div className="flex items-center space-x-2">
                <Utensils className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">食物日記</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Sync Status for authenticated users */}
              {isAuthenticated && (
                <SyncStatus showDetails={false} className="mr-4" />
              )}

              {/* Manual Sync Button */}
              {isAuthenticated && pendingCount > 0 && (
                <Button
                  onClick={handleManualSync}
                  disabled={isSync}
                  variant="outline"
                  className="flex items-center space-x-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSync ? 'animate-spin' : ''}`} />
                  <span>{isSync ? '同步中...' : `同步 (${pendingCount})`}</span>
                </Button>
              )}

              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <Button onClick={() => setShowAddFood(true)} className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>添加食物</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Daily Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>{new Date(currentDate).toLocaleDateString('zh-TW', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}</span>
              </div>
              {/* Google Sheets sync info */}
              {isAuthenticated && syncStatus && (
                <div className="flex items-center space-x-2 text-sm">
                  {!isReady ? (
                    <span className="text-red-600">
                      ❌ 醫療數據服務未初始化
                    </span>
                  ) : syncStatus.pendingChanges > 0 ? (
                    <span className="text-orange-600">
                      📤 {syncStatus.pendingChanges} 項待同步
                    </span>
                  ) : (
                    <span className="text-green-600">
                      ✅ 已同步到Google Sheets
                    </span>
                  )}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{dailyLog.entries.length}</div>
                <div className="text-sm text-gray-600">已記錄食物</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {dailyLog.averageScore.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">平均評分</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {dailyLog.entries.filter(e => !e.verified).length}
                </div>
                <div className="text-sm text-gray-600">待管理員驗證</div>
              </div>
            </div>

            {/* Detailed sync status for authenticated users */}
            {isAuthenticated && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <SyncStatus showDetails={true} />

                {/* Offline Storage Status */}
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <WifiOff className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">離線暫存狀態</span>
                    </div>
                    <div className="text-sm text-yellow-700">
                      待同步: {pendingCount} 筆記錄
                    </div>
                  </div>

                  {pendingCount > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-yellow-600 mb-2">
                        ⏳ 記錄已暫存到本地，點擊「同步」按鈕可手動上傳到 Google Sheets
                      </div>
                      <Button
                        onClick={handleManualSync}
                        disabled={isSync}
                        size="sm"
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        <RefreshCw className={`w-3 h-3 mr-1 ${isSync ? 'animate-spin' : ''}`} />
                        {isSync ? '同步中...' : '立即同步'}
                      </Button>

                      {/* 自動同步設置 */}
                      <div className="mt-2 p-2 bg-gray-50 rounded border">
                        <label className="flex items-center space-x-2 text-xs">
                          <input
                            type="checkbox"
                            checked={autoSync}
                            onChange={(e) => {
                              const enabled = e.target.checked;
                              setAutoSync(enabled);
                              offlineStorageManager.setAutoSyncSetting(enabled);
                            }}
                            className="w-3 h-3"
                          />
                          <span className="text-gray-700">
                            {autoSync ? '🔄 自動同步已啟用' : '⏸️ 自動同步已停用'}
                          </span>
                        </label>
                        <div className="text-xs text-gray-500 mt-1">
                          {autoSync ? '新記錄將自動同步到 Google Sheets' : '記錄將暫存，需要手動同步'}
                        </div>
                      </div>
                    </div>
                  )}

                  {pendingCount === 0 && (
                    <div className="mt-2 text-xs text-green-600">
                      ✅ 所有記錄已同步
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Food Modal */}
        {showAddFood && (
          <Card className="mb-6 border-2 border-blue-200">
            <CardHeader>
              <CardTitle>添加食物記錄</CardTitle>
              <CardDescription>
                搜尋現有食物或自定義新食物
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Food */}
              <div>
                <Label>搜尋食物</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="搜尋食物名稱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={handleCustomFood}>
                    自定義食物
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <Label>搜尋結果</Label>
                  {searchResults.map(food => (
                    <div
                      key={food.id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => handleAddFood(food)}
                    >
                      <div>
                        <span className="font-medium">{food.name}</span>
                        <span className="text-sm text-gray-500 ml-2">({food.category})</span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(food.score)}`}>
                        評分: {food.score}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Food Form */}
              {(newFoodEntry.customFood || searchTerm.length > 0) && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>食物名稱</Label>
                      <Input
                        value={newFoodEntry.foodName}
                        onChange={(e) => setNewFoodEntry(prev => ({ ...prev, foodName: e.target.value }))}
                        placeholder="輸入食物名稱"
                      />
                    </div>
                    <div>
                      <Label>份量</Label>
                      <Input
                        value={newFoodEntry.portion}
                        onChange={(e) => setNewFoodEntry(prev => ({ ...prev, portion: e.target.value }))}
                        placeholder="例如：1碗、200g"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>時間</Label>
                      <Input
                        type="time"
                        value={newFoodEntry.time}
                        onChange={(e) => setNewFoodEntry(prev => ({ ...prev, time: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>綜合評分</Label>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-2 rounded-md text-sm font-medium ${getScoreColor(calculateOverallScore(newFoodEntry.scoringCriteria))}`}>
                          {calculateOverallScore(newFoodEntry.scoringCriteria).toFixed(1)}/10
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRatingColor(getMedicalRating(calculateOverallScore(newFoodEntry.scoringCriteria)))}`}>
                          {getRatingText(getMedicalRating(calculateOverallScore(newFoodEntry.scoringCriteria)))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Scoring Criteria */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold text-gray-900 mb-3">詳細評分標準</h4>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-sm">消化性 (1-10)</Label>
                          <span className="text-sm font-medium">{newFoodEntry.scoringCriteria.digestibility}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={newFoodEntry.scoringCriteria.digestibility}
                          onChange={(e) => setNewFoodEntry(prev => ({
                            ...prev,
                            scoringCriteria: {
                              ...prev.scoringCriteria,
                              digestibility: parseInt(e.target.value)
                            }
                          }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>難消化</span>
                          <span>易消化</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-sm">過敏風險 (1-10)</Label>
                          <span className="text-sm font-medium">{newFoodEntry.scoringCriteria.allergyRisk}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={newFoodEntry.scoringCriteria.allergyRisk}
                          onChange={(e) => setNewFoodEntry(prev => ({
                            ...prev,
                            scoringCriteria: {
                              ...prev.scoringCriteria,
                              allergyRisk: parseInt(e.target.value)
                            }
                          }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>高風險</span>
                          <span>低風險</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-sm">營養價值 (1-10)</Label>
                          <span className="text-sm font-medium">{newFoodEntry.scoringCriteria.nutritionalValue}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={newFoodEntry.scoringCriteria.nutritionalValue}
                          onChange={(e) => setNewFoodEntry(prev => ({
                            ...prev,
                            scoringCriteria: {
                              ...prev.scoringCriteria,
                              nutritionalValue: parseInt(e.target.value)
                            }
                          }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>營養少</span>
                          <span>營養豐富</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-sm">個人耐受性 (1-10)</Label>
                          <span className="text-sm font-medium">{newFoodEntry.scoringCriteria.personalTolerance}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={newFoodEntry.scoringCriteria.personalTolerance}
                          onChange={(e) => setNewFoodEntry(prev => ({
                            ...prev,
                            scoringCriteria: {
                              ...prev.scoringCriteria,
                              personalTolerance: parseInt(e.target.value)
                            }
                          }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>不耐受</span>
                          <span>完全耐受</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                      <strong>評分指南:</strong> 根據您的身體反應和醫療狀況來評分。評分會自動同步到Google Sheets供醫生參考。
                    </div>
                  </div>

                  <div>
                    <Label>備註 (可選)</Label>
                    <Textarea
                      value={newFoodEntry.notes}
                      onChange={(e) => setNewFoodEntry(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="任何相關備註..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowAddFood(false)}>
                      取消
                    </Button>
                    <Button
                      onClick={() => handleAddFood()}
                      disabled={!newFoodEntry.foodName || !newFoodEntry.portion}
                    >
                      添加食物
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Food Entries with Sync Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">今日食物記錄</h2>

            {/* Status Filter */}
            <div className="flex space-x-2">
              <Button
                variant={recordFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRecordFilter('all')}
              >
                全部 ({allRecords.length})
              </Button>
              <Button
                variant={recordFilter === 'synced' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRecordFilter('synced')}
                className="text-green-600"
              >
                已同步 ({allRecords.filter(r => r.syncStatus === 'synced').length})
              </Button>
              <Button
                variant={recordFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRecordFilter('pending')}
                className="text-yellow-600"
              >
                待同步 ({allRecords.filter(r => r.syncStatus === 'pending' || r.syncStatus === 'syncing').length})
              </Button>
              {allRecords.filter(r => r.syncStatus === 'error').length > 0 && (
                <Button
                  variant={recordFilter === 'error' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRecordFilter('error')}
                  className="text-red-600"
                >
                  失敗 ({allRecords.filter(r => r.syncStatus === 'error').length})
                </Button>
              )}
            </div>
          </div>

          {getFilteredRecords().length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Utensils className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {recordFilter === 'all' ? '還沒有食物記錄' : `沒有${recordFilter === 'synced' ? '已同步' : recordFilter === 'pending' ? '待同步' : '失敗'}的記錄`}
                </h3>
                <p className="text-gray-600 mb-4">開始記錄您的每日飲食吧！</p>
                <Button onClick={() => setShowAddFood(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加第一個食物
                </Button>
              </CardContent>
            </Card>
          ) : (
            getFilteredRecords().map(record => (
              <Card key={record.id} className={record.syncStatus === 'error' ? 'border-red-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{record.foodName}</h3>
                        {getStatusBadge(record)}
                        {record.source === 'pending' && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            暫存
                          </Badge>
                        )}
                        {record.customFood && (
                          <Badge variant="outline" className="text-purple-600 border-purple-200">
                            自定義
                          </Badge>
                        )}
                        {!record.verified && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            待驗證
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{record.time}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRatingColor(record.category)}`}>
                            {getRatingText(record.category)}
                          </span>
                        </div>
                        {record.source === 'pending' && record.createdAt && (
                          <div className="flex items-center space-x-1 text-gray-500">
                            <span>建立於: {new Date(record.createdAt).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>

                      {record.notes && (
                        <p className="mt-2 text-sm text-gray-600">{record.notes}</p>
                      )}

                      {record.syncStatus === 'error' && record.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">同步失敗:</span>
                            <span>{record.errorMessage}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(record.medicalScore || 0)}`}>
                        <Star className="w-4 h-4 inline mr-1" />
                        {record.medicalScore}/10
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}