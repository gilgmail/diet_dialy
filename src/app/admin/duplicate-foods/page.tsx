'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import {
  Shield,
  AlertTriangle,
  Database,
  Trash2,
  RefreshCw,
  CheckCircle,
  Copy,
  Calendar,
  Star,
  Zap,
  Target,
  RotateCcw
} from 'lucide-react';

interface DuplicateFood {
  name: string;
  duplicates: Array<{
    id: string;
    name: string;
    brand?: string;
    category: string;
    verification_status: string;
    created_at: string;
    calories?: number;
    protein?: number;
  }>;
}

interface DuplicateData {
  totalFoods: number;
  duplicateGroups: number;
  totalDuplicates: number;
  duplicates: DuplicateFood[];
}

export default function DuplicateFoodsPage(): JSX.Element {
  const { user, userProfile, isLoading, isAuthenticated } = useSupabaseAuth();
  const [duplicateData, setDuplicateData] = useState<DuplicateData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 載入重複食物數據
  const loadDuplicateData = async () => {
    setIsLoadingData(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/remove-duplicates');
      const result = await response.json();

      if (result.success) {
        setDuplicateData(result.data);
      } else {
        throw new Error(result.error || '載入重複食物數據失敗');
      }
    } catch (error) {
      console.error('載入重複食物數據失敗:', error);
      setError(error instanceof Error ? error.message : '載入失敗');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && userProfile?.is_admin) {
      loadDuplicateData();
    }
  }, [isAuthenticated, userProfile]);

  // 自動清理重複食物
  const handleAutoCleanup = async () => {
    if (!confirm('確定要自動清理所有重複食物嗎？系統會保留最佳版本並刪除其餘重複項目。此操作無法復原。')) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/admin/remove-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'auto_cleanup' }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(result.message);
        await loadDuplicateData(); // 重新載入數據
      } else {
        throw new Error(result.error || '自動清理失敗');
      }
    } catch (error) {
      console.error('自動清理失敗:', error);
      setError(error instanceof Error ? error.message : '自動清理失敗');
    } finally {
      setIsProcessing(false);
    }
  };

  // 刪除特定重複項目
  const handleDeleteSpecific = async (foodIds: string[], groupName: string) => {
    if (!confirm(`確定要刪除群組「${groupName}」中的 ${foodIds.length} 個重複項目嗎？`)) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/remove-duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove_duplicates',
          foodIds
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccessMessage(result.message);
        await loadDuplicateData(); // 重新載入數據
      } else {
        throw new Error(result.error || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除重複項目失敗:', error);
      setError(error instanceof Error ? error.message : '刪除失敗');
    } finally {
      setIsProcessing(false);
    }
  };

  // 獲取驗證狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'admin_approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  // 獲取驗證狀態文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'admin_approved': return '已通過';
      case 'rejected': return '已拒絕';
      default: return '待審核';
    }
  };

  // Check authentication and admin permissions
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
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
    );
  }

  if (!userProfile?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
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
                href="/admin"
                className="flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Shield className="w-5 h-5 mr-2" />
                管理員控制台
              </Link>
              <div className="flex items-center space-x-2">
                <Copy className="w-6 h-6 text-red-600" />
                <h1 className="text-2xl font-bold text-gray-900">重複食物管理</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={loadDuplicateData}
                disabled={isLoadingData}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} />
                重新掃描
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Summary Stats */}
        {duplicateData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Database className="w-8 h-8 text-blue-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {duplicateData.totalFoods}
                    </div>
                    <div className="text-sm text-gray-600">總食物數量</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Copy className="w-8 h-8 text-orange-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {duplicateData.duplicateGroups}
                    </div>
                    <div className="text-sm text-gray-600">重複群組</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Trash2 className="w-8 h-8 text-red-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {duplicateData.totalDuplicates}
                    </div>
                    <div className="text-sm text-gray-600">可刪除項目</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Target className="w-8 h-8 text-green-500 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {((duplicateData.totalFoods - duplicateData.totalDuplicates) / duplicateData.totalFoods * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">清理後剩餘</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Auto Cleanup Actions */}
        {duplicateData && duplicateData.totalDuplicates > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                自動清理
              </CardTitle>
              <CardDescription>
                系統會自動保留最佳版本（優先已驗證、營養資訊完整、建立時間較早的食物）並刪除其他重複項目
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    將自動刪除 <strong>{duplicateData.totalDuplicates}</strong> 個重複項目，
                    保留 <strong>{duplicateData.totalFoods - duplicateData.totalDuplicates}</strong> 個最佳版本
                  </p>
                </div>
                <Button
                  onClick={handleAutoCleanup}
                  disabled={isProcessing}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isProcessing ? (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                      清理中...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      自動清理重複項目
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-green-800">操作成功</h3>
                <p className="text-sm text-green-700 mt-1">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">錯誤</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoadingData ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">掃描重複食物中...</p>
            </CardContent>
          </Card>
        ) : duplicateData ? (
          // Duplicate Groups List
          duplicateData.duplicates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">沒有發現重複食物</h3>
                <p className="text-gray-600">所有食物都是唯一的，資料庫狀態良好！</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">重複食物群組</h2>

              {duplicateData.duplicates.map((group, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Copy className="w-5 h-5 mr-2 text-orange-500" />
                        {group.name}
                      </span>
                      <Badge variant="destructive">
                        {group.duplicates.length} 個重複項目
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {group.duplicates.map((food, foodIndex) => (
                        <div
                          key={food.id}
                          className={`p-3 rounded-lg border ${
                            foodIndex === 0
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium">{food.name}</span>
                                {foodIndex === 0 && (
                                  <Badge className="bg-green-100 text-green-700">
                                    <Star className="w-3 h-3 mr-1" />
                                    建議保留
                                  </Badge>
                                )}
                                <Badge className={getStatusColor(food.verification_status)}>
                                  {getStatusText(food.verification_status)}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 space-x-4">
                                <span>分類: {food.category}</span>
                                {food.brand && <span>品牌: {food.brand}</span>}
                                {food.calories && <span>熱量: {food.calories} kcal</span>}
                                {food.protein && <span>蛋白質: {food.protein}g</span>}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                建立於 {new Date(food.created_at).toLocaleDateString('zh-TW')}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-end">
                      <Button
                        onClick={() =>
                          handleDeleteSpecific(
                            group.duplicates.slice(1).map(f => f.id),
                            group.name
                          )
                        }
                        disabled={isProcessing || group.duplicates.length <= 1}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        刪除 {group.duplicates.length - 1} 個重複項目
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}