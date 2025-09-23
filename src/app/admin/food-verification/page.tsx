'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { foodsService } from '@/lib/supabase/foods';
import type { Food } from '@/types/supabase';
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  AlertTriangle,
  User,
  Calendar,
  Star,
  Edit3,
  Database,
  Shield
} from 'lucide-react';

interface PendingFoodEntry extends Food {
  // Additional properties for admin review
  adminNotes?: string;
  suggestedMedicalScore?: number;
  userScore?: number;
  notes?: string;
  condition_scores?: any;
  description?: string;
  taiwan_origin?: boolean;
}

export default function FoodVerificationPage(): JSX.Element {
  const { user, userProfile, isLoading, isAuthenticated } = useSupabaseAuth()
  const [pendingFoods, setPendingFoods] = useState<PendingFoodEntry[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<PendingFoodEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedFood, setSelectedFood] = useState<PendingFoodEntry | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [suggestedMedicalScore, setSuggestedMedicalScore] = useState(5);
  const [isLoadingFoods, setIsLoadingFoods] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 載入待審核食物數據
  useEffect(() => {
    const loadPendingFoods = async () => {
      if (!isAuthenticated || !userProfile?.is_admin) {
        return
      }

      try {
        setIsLoadingFoods(true)
        setError(null)
        const foods = await foodsService.getPendingFoods()
        setPendingFoods(foods)
        setFilteredFoods(foods)
      } catch (error) {
        console.error('載入待審核食物失敗:', error)
        setError('載入待審核食物失敗，請稍後重試')
      } finally {
        setIsLoadingFoods(false)
      }
    }

    if (!isLoading) {
      loadPendingFoods()
    }
  }, [isAuthenticated, userProfile, isLoading])

  // 過濾和搜索
  useEffect(() => {
    let filtered = pendingFoods;

    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter(food => food.verification_status === 'pending');
      } else if (statusFilter === 'approved') {
        filtered = filtered.filter(food => food.verification_status === 'approved');
      } else if (statusFilter === 'rejected') {
        filtered = filtered.filter(food => food.verification_status === 'rejected');
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(food =>
        food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (food.created_by && food.created_by.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredFoods(filtered);
  }, [pendingFoods, statusFilter, searchTerm]);

  const handleApprove = async (foodId: string) => {
    if (!user?.id) return;

    try {
      await foodsService.verifyFood(
        foodId,
        'approved',
        user.id,
        adminNotes || `分類: ${suggestedCategory}, 建議評分: ${suggestedMedicalScore}`
      );

      // Update local state
      setPendingFoods(prev => prev.map(food =>
        food.id === foodId
          ? {
              ...food,
              verification_status: 'approved' as const,
              verified_by: user.id,
              verification_notes: adminNotes,
              category: suggestedCategory || food.category,
              verified_at: new Date().toISOString()
            }
          : food
      ));

      setSelectedFood(null);
      setAdminNotes('');
      setSuggestedCategory('');
      setSuggestedMedicalScore(5);
    } catch (error) {
      console.error('審核失敗:', error);
      setError('審核失敗，請重試');
    }
  };

  const handleReject = async (foodId: string) => {
    if (!user?.id) return;

    try {
      await foodsService.verifyFood(
        foodId,
        'rejected',
        user.id,
        adminNotes
      );

      // Update local state
      setPendingFoods(prev => prev.map(food =>
        food.id === foodId
          ? {
              ...food,
              verification_status: 'rejected' as const,
              verified_by: user.id,
              verification_notes: adminNotes,
              verified_at: new Date().toISOString()
            }
          : food
      ));

      setSelectedFood(null);
      setAdminNotes('');
    } catch (error) {
      console.error('拒絕失敗:', error);
      setError('拒絕失敗，請重試');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    if (score >= 4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (verification_status: string) => {
    switch (verification_status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusText = (verification_status: string) => {
    switch (verification_status) {
      case 'approved': return '已通過';
      case 'rejected': return '已拒絕';
      default: return '待審核';
    }
  };

  const getStatusIcon = (verification_status: string) => {
    switch (verification_status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
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
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">需要登入</h1>
          <p className="text-gray-600 mb-6">請先登入才能訪問管理員控制台</p>
          <Link
            href="/settings"
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            前往登入
          </Link>
        </div>
      </div>
    )
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
    )
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
                <Database className="w-6 h-6 text-purple-600" />
                <h1 className="text-2xl font-bold text-gray-900">食物驗證管理</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {pendingFoods.filter(f => f.verification_status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">待審核</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {pendingFoods.filter(f => f.verification_status === 'approved').length}
                  </div>
                  <div className="text-sm text-gray-600">已通過</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <XCircle className="w-8 h-8 text-red-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {pendingFoods.filter(f => f.verification_status === 'rejected').length}
                  </div>
                  <div className="text-sm text-gray-600">已拒絕</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Database className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {pendingFoods.length}
                  </div>
                  <div className="text-sm text-gray-600">總數量</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label>搜尋</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜尋食物名稱或用戶名稱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label>狀態篩選</Label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">全部</option>
                  <option value="pending">待審核</option>
                  <option value="approved">已通過</option>
                  <option value="rejected">已拒絕</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
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

        {/* Food List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">食物清單</h2>

            {isLoadingFoods ? (
              <Card>
                <CardContent className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">載入中...</p>
                </CardContent>
              </Card>
            ) : filteredFoods.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">沒有找到食物</h3>
                  <p className="text-gray-600">調整搜尋條件或狀態篩選</p>
                </CardContent>
              </Card>
            ) : (
              filteredFoods.map(food => (
                <Card
                  key={food.id}
                  className={`cursor-pointer transition-all ${
                    selectedFood?.id === food.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedFood(food)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{food.name}</h3>
                          <Badge className={`${getStatusColor(food.verification_status)}`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(food.verification_status)}
                              <span>{getStatusText(food.verification_status)}</span>
                            </div>
                          </Badge>
                        </div>

                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>提交者: {food.created_by || '未知用戶'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(food.created_at).toLocaleDateString('zh-TW')}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Star className="w-4 h-4" />
                            <span className={`font-medium ${getScoreColor(food.userScore)}`}>
                              用戶評分: {food.userScore.toFixed(1)}/10
                            </span>
                          </div>
                        </div>

                        {food.notes && (
                          <p className="mt-2 text-sm text-gray-700 line-clamp-2">{food.notes}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Detail Panel */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">詳細資訊</h2>

            {!selectedFood ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Edit3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">選擇食物進行審核</h3>
                  <p className="text-gray-600">點選左側食物項目查看詳細資訊並進行審核</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedFood.name}</span>
                    <Badge className={`${getStatusColor(selectedFood.verification_status)}`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(selectedFood.verification_status)}
                        <span>{getStatusText(selectedFood.verification_status)}</span>
                      </div>
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    由 {selectedFood.created_by || '未知用戶'} 於 {new Date(selectedFood.created_at).toLocaleDateString('zh-TW')} 提交
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Nutritional Information */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">營養資訊</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600">熱量 (kcal)</div>
                        <div className="text-lg font-semibold">{selectedFood.calories || 'N/A'}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600">蛋白質 (g)</div>
                        <div className="text-lg font-semibold">{selectedFood.protein || 'N/A'}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600">碳水化合物 (g)</div>
                        <div className="text-lg font-semibold">{selectedFood.carbohydrates || 'N/A'}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600">脂肪 (g)</div>
                        <div className="text-lg font-semibold">{selectedFood.fat || 'N/A'}</div>
                      </div>
                    </div>
                    {selectedFood.condition_scores && (
                      <div className="mt-3 p-3 bg-blue-50 rounded">
                        <div className="text-sm text-gray-600">醫療評分</div>
                        <div className="text-sm text-blue-800">
                          {JSON.stringify(selectedFood.condition_scores, null, 2)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Food Details */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">食物資訊</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>分類:</strong> {selectedFood.category || '未分類'}</div>
                      <div><strong>品牌:</strong> {selectedFood.brand || 'N/A'}</div>
                      <div><strong>來源:</strong> {selectedFood.taiwan_origin ? '台灣' : '其他'}</div>
                      <div><strong>自訂食物:</strong> {selectedFood.is_custom ? '是' : '否'}</div>
                      {selectedFood.description && (
                        <div><strong>描述:</strong> {selectedFood.description}</div>
                      )}
                    </div>
                  </div>

                  {/* Admin Review Section */}
                  {selectedFood.verification_status === 'pending' && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">管理員審核</h4>

                      <div className="space-y-4">
                        <div>
                          <Label>建議分類</Label>
                          <Input
                            value={suggestedCategory}
                            onChange={(e) => setSuggestedCategory(e.target.value)}
                            placeholder="例如：蛋白質、穀物、蔬菜"
                          />
                        </div>

                        <div>
                          <Label>建議醫療評分 (1-10)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={suggestedMedicalScore}
                            onChange={(e) => setSuggestedMedicalScore(parseFloat(e.target.value))}
                          />
                        </div>

                        <div>
                          <Label>管理員備註</Label>
                          <Textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="審核意見或修改建議..."
                            rows={3}
                          />
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleApprove(selectedFood.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            通過並加入資料庫
                          </Button>
                          <Button
                            onClick={() => handleReject(selectedFood.id)}
                            variant="destructive"
                            className="flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            拒絕
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show admin notes for reviewed items */}
                  {selectedFood.verification_status !== 'pending' && selectedFood.verification_notes && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-2">管理員備註</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {selectedFood.verification_notes}
                      </p>
                      {selectedFood.verified_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          審核時間: {new Date(selectedFood.verified_at).toLocaleString('zh-TW')}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}