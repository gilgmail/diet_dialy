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

interface PendingFoodEntry {
  id: string;
  foodName: string;
  userId: string;
  userName: string;
  userScore: number;
  scoringCriteria: {
    digestibility: number;
    allergyRisk: number;
    nutritionalValue: number;
    personalTolerance: number;
  };
  portion: string;
  notes: string;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  category?: string;
  suggestedMedicalScore?: number;
}

export default function FoodVerificationPage(): JSX.Element {
  const [pendingFoods, setPendingFoods] = useState<PendingFoodEntry[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<PendingFoodEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedFood, setSelectedFood] = useState<PendingFoodEntry | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState('');
  const [suggestedMedicalScore, setSuggestedMedicalScore] = useState(5);

  // 模擬待審核食物數據
  useEffect(() => {
    const mockPendingFoods: PendingFoodEntry[] = [
      {
        id: '1',
        foodName: '自製蒸蛋羹',
        userId: 'user1',
        userName: '張小明',
        userScore: 8.5,
        scoringCriteria: {
          digestibility: 9,
          allergyRisk: 7,
          nutritionalValue: 8,
          personalTolerance: 9
        },
        portion: '1小碗',
        notes: '用有機雞蛋製作，不添加調味料，質地軟嫩易消化',
        submittedAt: new Date('2024-01-15T10:30:00'),
        status: 'pending',
        category: '蛋白質'
      },
      {
        id: '2',
        foodName: '媽媽牌小米粥',
        userId: 'user2',
        userName: '李美華',
        userScore: 9.2,
        scoringCriteria: {
          digestibility: 10,
          allergyRisk: 9,
          nutritionalValue: 8,
          personalTolerance: 10
        },
        portion: '1大碗',
        notes: '煮得很爛，加了一點紅棗，對IBD症狀很溫和',
        submittedAt: new Date('2024-01-15T08:45:00'),
        status: 'pending',
        category: '穀物'
      },
      {
        id: '3',
        foodName: '特製低FODMAP沙拉',
        userId: 'user3',
        userName: '陳健康',
        userScore: 7.8,
        scoringCriteria: {
          digestibility: 8,
          allergyRisk: 8,
          nutritionalValue: 9,
          personalTolerance: 6
        },
        portion: '1份',
        notes: '只用生菜、胡蘿蔔絲、少許橄欖油，嚴格遵循低FODMAP原則',
        submittedAt: new Date('2024-01-14T19:20:00'),
        status: 'pending',
        category: '蔬菜'
      }
    ];

    setPendingFoods(mockPendingFoods);
    setFilteredFoods(mockPendingFoods);
  }, []);

  // 過濾和搜索
  useEffect(() => {
    let filtered = pendingFoods;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(food => food.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(food =>
        food.foodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        food.userName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFoods(filtered);
  }, [pendingFoods, statusFilter, searchTerm]);

  const handleApprove = (foodId: string) => {
    setPendingFoods(prev => prev.map(food =>
      food.id === foodId
        ? {
            ...food,
            status: 'approved' as const,
            adminNotes,
            category: suggestedCategory || food.category,
            suggestedMedicalScore
          }
        : food
    ));

    setSelectedFood(null);
    setAdminNotes('');
    setSuggestedCategory('');
    setSuggestedMedicalScore(5);
  };

  const handleReject = (foodId: string) => {
    setPendingFoods(prev => prev.map(food =>
      food.id === foodId
        ? {
            ...food,
            status: 'rejected' as const,
            adminNotes
          }
        : food
    ));

    setSelectedFood(null);
    setAdminNotes('');
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    if (score >= 4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return '已通過';
      case 'rejected': return '已拒絕';
      default: return '待審核';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

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
                    {pendingFoods.filter(f => f.status === 'pending').length}
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
                    {pendingFoods.filter(f => f.status === 'approved').length}
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
                    {pendingFoods.filter(f => f.status === 'rejected').length}
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

        {/* Food List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">食物清單</h2>

            {filteredFoods.length === 0 ? (
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
                          <h3 className="text-lg font-semibold text-gray-900">{food.foodName}</h3>
                          <Badge className={`${getStatusColor(food.status)}`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(food.status)}
                              <span>{getStatusText(food.status)}</span>
                            </div>
                          </Badge>
                        </div>

                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4" />
                            <span>提交者: {food.userName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>{food.submittedAt.toLocaleDateString('zh-TW')}</span>
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
                    <span>{selectedFood.foodName}</span>
                    <Badge className={`${getStatusColor(selectedFood.status)}`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(selectedFood.status)}
                        <span>{getStatusText(selectedFood.status)}</span>
                      </div>
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    由 {selectedFood.userName} 於 {selectedFood.submittedAt.toLocaleDateString('zh-TW')} 提交
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* User Scoring Breakdown */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">用戶評分詳細</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600">消化性</div>
                        <div className="text-lg font-semibold">{selectedFood.scoringCriteria.digestibility}/10</div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600">過敏風險</div>
                        <div className="text-lg font-semibold">{selectedFood.scoringCriteria.allergyRisk}/10</div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600">營養價值</div>
                        <div className="text-lg font-semibold">{selectedFood.scoringCriteria.nutritionalValue}/10</div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="text-sm text-gray-600">個人耐受性</div>
                        <div className="text-lg font-semibold">{selectedFood.scoringCriteria.personalTolerance}/10</div>
                      </div>
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 rounded">
                      <div className="text-sm text-gray-600">綜合評分</div>
                      <div className={`text-xl font-bold ${getScoreColor(selectedFood.userScore)}`}>
                        {selectedFood.userScore.toFixed(1)}/10
                      </div>
                    </div>
                  </div>

                  {/* Food Details */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">食物資訊</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>份量:</strong> {selectedFood.portion}</div>
                      <div><strong>分類:</strong> {selectedFood.category || '未分類'}</div>
                      {selectedFood.notes && (
                        <div><strong>用戶備註:</strong> {selectedFood.notes}</div>
                      )}
                    </div>
                  </div>

                  {/* Admin Review Section */}
                  {selectedFood.status === 'pending' && (
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
                  {selectedFood.status !== 'pending' && selectedFood.adminNotes && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-2">管理員備註</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {selectedFood.adminNotes}
                      </p>
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