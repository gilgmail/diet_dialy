'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseFoodItem } from '@/types/food';
import { FoodHistoryEntry } from '@/types/history';

interface ManualFoodEntryProps {
  onAddEntry: (entry: Omit<FoodHistoryEntry, 'id' | 'timestamp'>) => void;
  onError: (error: string) => void;
  className?: string;
}

interface FrequentFood extends DatabaseFoodItem {
  frequency: number;
  lastUsed: Date;
}

export default function ManualFoodEntry({
  onAddEntry,
  onError,
  className = ''
}: ManualFoodEntryProps): JSX.Element {
  const [foods, setFoods] = useState<DatabaseFoodItem[]>([]);
  const [frequentFoods, setFrequentFoods] = useState<FrequentFood[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFood, setSelectedFood] = useState<DatabaseFoodItem | null>(null);
  const [amount, setAmount] = useState<number>(100);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [filteredFoods, setFilteredFoods] = useState<DatabaseFoodItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 載入食物資料庫
  useEffect(() => {
    const loadFoods = async () => {
      try {
        const response = await fetch('/api/foods');
        const data = await response.json();
        if (data.success) {
          setFoods(data.foods);
        }
      } catch (error) {
        console.error('載入食物資料庫失敗:', error);
        onError('無法載入食物資料庫');
      }
    };

    loadFoods();
  }, [onError]);

  // 載入習慣食物
  useEffect(() => {
    const loadFrequentFoods = async () => {
      try {
        const response = await fetch('/api/history/frequent?userId=demo-user&limit=10');
        const data = await response.json();
        if (data.success) {
          setFrequentFoods(data.frequentFoods);
        }
      } catch (error) {
        console.log('載入習慣食物失敗:', error);
        // 不顯示錯誤，習慣食物是可選功能
      }
    };

    loadFrequentFoods();
  }, []);

  // 搜尋食物
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (term.length < 1) {
      setFilteredFoods([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = foods.filter(food =>
      food.name_zh.includes(term) ||
      food.name_en.toLowerCase().includes(term.toLowerCase()) ||
      food.category.includes(term)
    );

    setFilteredFoods(filtered.slice(0, 8)); // 限制顯示數量
    setShowSuggestions(true);
  }, [foods]);

  // 選擇食物
  const selectFood = (food: DatabaseFoodItem) => {
    setSelectedFood(food);
    setSearchTerm(food.name_zh);
    setShowSuggestions(false);
  };

  // 照片上傳處理
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + photos.length > 3) {
      onError('最多只能上傳 3 張照片');
      return;
    }
    setPhotos(prev => [...prev, ...files]);
  };

  // 移除照片
  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // 快速選擇習慣食物
  const selectFrequentFood = (food: FrequentFood) => {
    selectFood(food);
    // 習慣食物通常使用預設份量
    setAmount(100);
  };

  // 提交記錄
  const handleSubmit = async () => {
    if (!selectedFood) {
      onError('請選擇食物');
      return;
    }

    try {
      // 建立食物記錄
      const entry: Omit<FoodHistoryEntry, 'id' | 'timestamp'> = {
        userId: 'demo-user',
        food: selectedFood,
        amount_g: amount,
        photos: photos.map(photo => URL.createObjectURL(photo)), // 臨時 URL，實際應上傳至伺服器
        notes: notes.trim() || undefined,
        medicalScore: selectedFood.medical_scores?.IBD || {
          score: 3,
          urgency: 'low',
          advice: '一般建議量'
        }
      };

      await onAddEntry(entry);

      // 清空表單
      setSelectedFood(null);
      setSearchTerm('');
      setAmount(100);
      setPhotos([]);
      setNotes('');
      setShowSuggestions(false);

    } catch (error) {
      console.error('新增記錄失敗:', error);
      onError('新增記錄失敗，請重試');
    }
  };

  return (
    <div className={`bg-white rounded-lg border-2 border-gray-200 p-6 ${className}`}>
      <div className="space-y-6">
        {/* 標題 */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            ✍️ 手動精準記錄
          </h2>
          <p className="text-sm text-gray-600">
            搜尋選擇食物，確保記錄精準度
          </p>
        </div>

        {/* 習慣食物快速選擇 */}
        {frequentFoods.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">🍽️ 常吃食物 (快速選擇)</h3>
            <div className="grid grid-cols-2 gap-2">
              {frequentFoods.slice(0, 6).map((food) => (
                <button
                  key={food.id}
                  onClick={() => selectFrequentFood(food)}
                  className="flex items-center p-2 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-900">{food.name_zh}</div>
                    <div className="text-xs text-blue-600">用了 {food.frequency} 次</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 食物搜尋 */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔍 搜尋食物
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="輸入食物名稱搜尋..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          />

          {/* 搜尋建議 */}
          {showSuggestions && filteredFoods.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredFoods.map((food) => (
                <button
                  key={food.id}
                  onClick={() => selectFood(food)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">{food.name_zh}</div>
                  <div className="text-sm text-gray-600">{food.name_en} • {food.category}</div>
                  <div className="text-xs text-gray-500">
                    {food.calories_per_100g} 大卡/100g
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 已選食物顯示 */}
        {selectedFood && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-green-900">{selectedFood.name_zh}</h4>
                <p className="text-sm text-green-700">{selectedFood.name_en}</p>
                <p className="text-xs text-green-600">
                  {selectedFood.calories_per_100g} 大卡/100g • {selectedFood.category}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedFood(null);
                  setSearchTerm('');
                }}
                className="text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 份量設定 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ⚖️ 份量 (公克)
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min="1"
              max="2000"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
            <div className="flex space-x-2">
              {[50, 100, 150, 200].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  {preset}g
                </button>
              ))}
            </div>
          </div>
          {selectedFood && (
            <p className="text-sm text-gray-600 mt-2">
              約 {Math.round((selectedFood.calories_per_100g * amount) / 100)} 大卡
            </p>
          )}
        </div>

        {/* 照片上傳 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📸 照片記錄 (選填，最多3張)
          </label>

          {photos.length < 3 && (
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
              <div className="text-center">
                <div className="text-gray-500 mb-2">📷</div>
                <span className="text-sm text-gray-600">點擊上傳照片</span>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`照片 ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 備註 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📝 備註 (選填)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="特殊烹調方式、感受或其他注意事項..."
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {/* 提交按鈕 */}
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setSelectedFood(null);
              setSearchTerm('');
              setAmount(100);
              setPhotos([]);
              setNotes('');
              setShowSuggestions(false);
            }}
            className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
          >
            🗑️ 清空
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFood}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              selectedFood
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            ✅ 新增記錄
          </button>
        </div>
      </div>
    </div>
  );
}