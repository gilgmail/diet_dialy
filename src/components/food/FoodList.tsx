'use client';

import React, { useState } from 'react';
import { DatabaseFoodItem, FoodCategory } from '@/types/food';
import { FOOD_CATEGORIES, IBD_SCORE_OPTIONS, CHEMO_SAFETY_OPTIONS, FODMAP_OPTIONS } from '@/types/food';

interface FoodListProps {
  foods: DatabaseFoodItem[];
  onEdit: (food: DatabaseFoodItem) => void;
  onDelete: (id: string) => void;
  onValidate?: (id: string) => void;
  loading?: boolean;
}

export default function FoodList({ foods, onEdit, onDelete, onValidate, loading = false }: FoodListProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showUnvalidatedOnly, setShowUnvalidatedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'created' | 'ibd_score'>('name');

  // Filter foods based on search and filters
  const filteredFoods = foods.filter(food => {
    const matchesSearch = searchQuery === '' ||
      food.name_zh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      food.name_en.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === '' || food.category === selectedCategory;

    const matchesValidation = !showUnvalidatedOnly || !food.medical_validated;

    return matchesSearch && matchesCategory && matchesValidation;
  });

  // Sort foods
  const sortedFoods = [...filteredFoods].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name_zh.localeCompare(b.name_zh);
      case 'category':
        return a.category.localeCompare(b.category);
      case 'created':
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      case 'ibd_score':
        return b.medical_scores.ibd_score - a.medical_scores.ibd_score;
      default:
        return 0;
    }
  });

  const getIBDScoreDisplay = (score: 1 | 2 | 3 | 4 | undefined | null) => {
    if (!score) return '未知';
    const option = IBD_SCORE_OPTIONS.find(opt => opt.value === score);
    return option ? `${option.emoji} ${score}` : score.toString();
  };

  const getChemoSafetyDisplay = (safety: 'safe' | 'caution' | 'avoid') => {
    const option = CHEMO_SAFETY_OPTIONS.find(opt => opt.value === safety);
    return option ? (
      <span className={`px-2 py-1 rounded-full text-xs ${option.bgColor} ${option.color}`}>
        {option.label}
      </span>
    ) : safety;
  };

  const getFODMAPDisplay = (level: 'low' | 'medium' | 'high') => {
    const option = FODMAP_OPTIONS.find(opt => opt.value === level);
    return option ? (
      <span className={`text-xs ${option.color}`}>
        {option.label}
      </span>
    ) : level;
  };

  const getCategoryDisplay = (category: FoodCategory) => {
    const cat = FOOD_CATEGORIES.find(c => c.id === category);
    return cat ? cat.name_zh : category;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              搜尋
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="搜尋食物名稱..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分類
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部分類</option>
              {FOOD_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name_zh}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              排序
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'category' | 'created' | 'ibd_score')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">名稱</option>
              <option value="category">分類</option>
              <option value="created">建立時間</option>
              <option value="ibd_score">IBD評分</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showUnvalidatedOnly}
                onChange={(e) => setShowUnvalidatedOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">僅顯示未驗證</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          顯示 {sortedFoods.length} / {foods.length} 項食物
        </p>
        {showUnvalidatedOnly && (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
            未驗證食物
          </span>
        )}
      </div>

      {/* Food Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedFoods.map(food => (
          <div
            key={food.id}
            className={`bg-white rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
              food.medical_validated ? 'border-gray-200' : 'border-yellow-300 bg-yellow-50'
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {food.name_zh}
                </h3>
                <p className="text-sm text-gray-600">{food.name_en}</p>
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs mt-1">
                  {getCategoryDisplay(food.category)}
                </span>
              </div>

              {!food.medical_validated && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                  未驗證
                </span>
              )}
            </div>

            {/* Medical Scores */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">IBD評分:</span>
                <span className="text-sm font-medium">
                  {getIBDScoreDisplay(food.medical_scores.ibd_score)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">化療安全:</span>
                {getChemoSafetyDisplay(food.medical_scores.chemo_safety)}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">FODMAP:</span>
                {getFODMAPDisplay(food.medical_scores.fodmap_level)}
              </div>
            </div>

            {/* Risk Factors */}
            {food.medical_scores.ibd_risk_factors && food.medical_scores.ibd_risk_factors.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-1">風險因子:</p>
                <div className="flex flex-wrap gap-1">
                  {food.medical_scores.ibd_risk_factors.slice(0, 3).map(factor => (
                    <span
                      key={factor}
                      className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs"
                    >
                      {factor}
                    </span>
                  ))}
                  {food.medical_scores.ibd_risk_factors.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{food.medical_scores.ibd_risk_factors.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Allergens */}
            {food.medical_scores.major_allergens && food.medical_scores.major_allergens.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-1">過敏原:</p>
                <div className="flex flex-wrap gap-1">
                  {food.medical_scores.major_allergens.slice(0, 3).map(allergen => (
                    <span
                      key={allergen}
                      className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs"
                    >
                      {allergen}
                    </span>
                  ))}
                  {food.medical_scores.major_allergens.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{food.medical_scores.major_allergens.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Availability */}
            <div className="mb-4">
              <div className="flex items-center space-x-3 text-xs text-gray-600">
                <span className={food.availability.taiwan ? 'text-green-600' : 'text-gray-400'}>
                  🇹🇼 {food.availability.taiwan ? '台灣' : '台灣 ✗'}
                </span>
                <span className={food.availability.hong_kong ? 'text-green-600' : 'text-gray-400'}>
                  🇭🇰 {food.availability.hong_kong ? '香港' : '香港 ✗'}
                </span>
                {food.availability.seasonal && (
                  <span className="text-blue-600">📅 {food.availability.seasonal}</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(food)}
                disabled={loading}
                className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 text-sm"
              >
                編輯
              </button>

              {onValidate && !food.medical_validated && (
                <button
                  onClick={() => onValidate(food.id)}
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 text-sm"
                >
                  驗證
                </button>
              )}

              <button
                onClick={() => onDelete(food.id)}
                disabled={loading}
                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 text-sm"
              >
                刪除
              </button>
            </div>

            {/* Created Date */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                建立時間: {new Date(food.created).toLocaleDateString('zh-TW')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sortedFoods.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🍽️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery || selectedCategory || showUnvalidatedOnly
              ? '找不到符合條件的食物'
              : '尚無食物資料'
            }
          </h3>
          <p className="text-gray-600">
            {searchQuery || selectedCategory || showUnvalidatedOnly
              ? '請嘗試調整搜尋條件或篩選器'
              : '開始新增您的第一個食物吧！'
            }
          </p>
        </div>
      )}
    </div>
  );
}