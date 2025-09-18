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
  Heart
} from 'lucide-react';
import { useMedicalData } from '@/lib/google';
import { SyncStatus } from '@/components/google/SyncStatus';

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
  const { isAuthenticated, user, recordFoodEntry, syncStatus } = useMedicalData();
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyLog, setDailyLog] = useState<DailyLog>({
    date: currentDate,
    entries: [],
    totalScore: 0,
    averageScore: 0
  });

  const [showAddFood, setShowAddFood] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
    if (food) {
      // 從資料庫選擇的食物
      setNewFoodEntry(prev => ({
        ...prev,
        foodName: food.name,
        customFood: false,
        userScore: food.score
      }));
    }

    const calculatedScore = calculateOverallScore(newFoodEntry.scoringCriteria);

    const entry: FoodEntry = {
      id: `${Date.now()}-${Math.random()}`,
      foodName: newFoodEntry.foodName,
      customFood: newFoodEntry.customFood,
      userScore: calculatedScore,
      portion: newFoodEntry.portion,
      time: newFoodEntry.time,
      notes: newFoodEntry.notes,
      symptoms: newFoodEntry.symptoms,
      verified: !newFoodEntry.customFood
    };

    // 同步到Google Sheets (如果已認證)
    if (isAuthenticated && recordFoodEntry) {
      try {
        const googleFoodEntry = {
          consumedAt: new Date(`${currentDate}T${newFoodEntry.time}`),
          foodId: food?.id || `custom-${Date.now()}`,
          foodData: {
            name_zh: newFoodEntry.foodName,
            name_en: newFoodEntry.foodName,
            category: food?.category || '自定義'
          },
          portion: {
            amount: parseFloat(newFoodEntry.portion) || 1,
            unit: '份',
            customUnit: newFoodEntry.portion
          },
          medicalScore: {
            score: calculatedScore,
            level: getMedicalRating(calculatedScore),
            scoringCriteria: newFoodEntry.scoringCriteria
          },
          allergyWarnings: newFoodEntry.symptoms,
          symptoms: {
            before: [],
            after: [],
            severity: null
          },
          notes: newFoodEntry.notes,
          location: ''
        };

        await recordFoodEntry(googleFoodEntry);
      } catch (error) {
        console.error('無法同步到Google Sheets:', error);
        // 繼續本地儲存，即使同步失敗
      }
    }

    setDailyLog(prev => {
      const newEntries = [...prev.entries, entry];
      const totalScore = newEntries.reduce((sum, e) => sum + (e.userScore || 0), 0);
      const averageScore = newEntries.length > 0 ? totalScore / newEntries.length : 0;

      return {
        ...prev,
        entries: newEntries,
        totalScore,
        averageScore
      };
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-center">需要登入</CardTitle>
            <CardDescription className="text-center">
              請先登入以使用食物日記功能
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/auth">
              <Button>前往登入</Button>
            </Link>
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
                  {syncStatus.pendingChanges > 0 ? (
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

        {/* Food Entries */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">今日食物記錄</h2>

          {dailyLog.entries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Utensils className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">還沒有食物記錄</h3>
                <p className="text-gray-600 mb-4">開始記錄您的每日飲食吧！</p>
                <Button onClick={() => setShowAddFood(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加第一個食物
                </Button>
              </CardContent>
            </Card>
          ) : (
            dailyLog.entries.map(entry => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">{entry.foodName}</h3>
                        {entry.customFood && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            自定義
                          </Badge>
                        )}
                        {!entry.verified && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            待驗證
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{entry.time}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Utensils className="w-4 h-4" />
                          <span>{entry.portion}</span>
                        </div>
                      </div>

                      {entry.notes && (
                        <p className="mt-2 text-sm text-gray-600">{entry.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(entry.userScore || 0)}`}>
                        <Star className="w-4 h-4 inline mr-1" />
                        {entry.userScore}/10
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