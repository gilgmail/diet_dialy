'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseFoodItem, CreateFoodRequest, UpdateFoodRequest } from '@/types/food';
import FoodEditor from '@/components/food/FoodEditor';
import FoodList from '@/components/food/FoodList';
import { FoodAPI } from '@/lib/food-api';

interface DatabaseStats {
  totalFoods: number;
  categoryCounts: Record<string, number>;
  validatedCount: number;
  recentlyAdded: DatabaseFoodItem[];
}

export default function DatabasePage(): JSX.Element {
  const [foods, setFoods] = useState<DatabaseFoodItem[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingFood, setEditingFood] = useState<DatabaseFoodItem | undefined>(undefined);
  const [operationLoading, setOperationLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [foodsData, statsData] = await Promise.all([
        FoodAPI.getAllFoods(),
        FoodAPI.getDatabaseStats()
      ]);

      setFoods(foodsData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFood = async (request: CreateFoodRequest) => {
    try {
      setOperationLoading(true);
      const newFood = await FoodAPI.createFood(request);
      setFoods(prev => [...prev, newFood]);
      setShowEditor(false);
      await loadData(); // Reload to update stats
    } catch (err) {
      console.error('Failed to create food:', err);
      setError(err instanceof Error ? err.message : '新增失敗');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleUpdateFood = async (request: UpdateFoodRequest) => {
    try {
      setOperationLoading(true);
      const updatedFood = await FoodAPI.updateFood(request);
      setFoods(prev => prev.map(food => food.id === updatedFood.id ? updatedFood : food));
      setShowEditor(false);
      setEditingFood(undefined);
      await loadData(); // Reload to update stats
    } catch (err) {
      console.error('Failed to update food:', err);
      setError(err instanceof Error ? err.message : '更新失敗');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteFood = async (id: string) => {
    if (!confirm('確定要刪除這個食物嗎？此操作無法復原。')) {
      return;
    }

    try {
      setOperationLoading(true);
      await FoodAPI.deleteFood(id);
      setFoods(prev => prev.filter(food => food.id !== id));
      await loadData(); // Reload to update stats
    } catch (err) {
      console.error('Failed to delete food:', err);
      setError(err instanceof Error ? err.message : '刪除失敗');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleValidateFood = async (id: string) => {
    try {
      setOperationLoading(true);
      const validatedFood = await FoodAPI.validateFood(id);
      setFoods(prev => prev.map(food => food.id === validatedFood.id ? validatedFood : food));
      await loadData(); // Reload to update stats
    } catch (err) {
      console.error('Failed to validate food:', err);
      setError(err instanceof Error ? err.message : '驗證失敗');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEditFood = (food: DatabaseFoodItem) => {
    setEditingFood(food);
    setShowEditor(true);
  };

  const handleCancelEdit = () => {
    setShowEditor(false);
    setEditingFood(undefined);
  };

  const handleSave = async (request: CreateFoodRequest | UpdateFoodRequest) => {
    if ('id' in request) {
      await handleUpdateFood(request as UpdateFoodRequest);
    } else {
      await handleCreateFood(request as CreateFoodRequest);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入食物資料庫中...</p>
        </div>
      </div>
    );
  }

  if (showEditor) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <FoodEditor
            food={editingFood}
            onSave={handleSave}
            onCancel={handleCancelEdit}
            loading={operationLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">食物資料庫管理</h1>
              <p className="text-gray-600 mt-1">管理台港醫療飲食資料庫</p>
            </div>
            <button
              onClick={() => setShowEditor(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              + 新增食物
            </button>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Dashboard */}
      {stats && (
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🍽️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFoods}</p>
                  <p className="text-sm text-gray-600">總食物數量</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">✅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.validatedCount}</p>
                  <p className="text-sm text-gray-600">已驗證食物</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">⏳</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFoods - stats.validatedCount}</p>
                  <p className="text-sm text-gray-600">待驗證食物</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">📊</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.categoryCounts).length}</p>
                  <p className="text-sm text-gray-600">食物分類</p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="mt-6 bg-white rounded-lg border-2 border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">分類統計</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(stats.categoryCounts).map(([category, count]) => (
                <div key={category} className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{count}</p>
                  <p className="text-sm text-gray-600">{category}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Added */}
          {stats.recentlyAdded.length > 0 && (
            <div className="mt-6 bg-white rounded-lg border-2 border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">最近新增</h3>
              <div className="space-y-3">
                {stats.recentlyAdded.map(food => (
                  <div key={food.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{food.name_zh}</p>
                      <p className="text-sm text-gray-600">{food.name_en} • {food.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(food.created).toLocaleDateString('zh-TW')}
                      </p>
                      {!food.medical_validated && (
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                          待驗證
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Food List */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <FoodList
          foods={foods}
          onEdit={handleEditFood}
          onDelete={handleDeleteFood}
          onValidate={handleValidateFood}
          loading={operationLoading}
        />
      </div>
    </div>
  );
}