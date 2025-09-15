'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseFoodItem } from '@/types/food';
import { FoodHistoryEntry, CreateHistoryEntryRequest } from '@/types/history';

interface QuickFoodEntryProps {
  onAddEntry: (entry: Omit<FoodHistoryEntry, 'id' | 'timestamp'>) => void;
  onError: (error: string) => void;
  className?: string;
}

interface FrequentFood extends DatabaseFoodItem {
  frequency: number;
  lastUsed: Date;
}

export default function QuickFoodEntry({
  onAddEntry,
  onError,
  className = ''
}: QuickFoodEntryProps): JSX.Element {
  const [foods, setFoods] = useState<DatabaseFoodItem[]>([]);
  const [frequentFoods, setFrequentFoods] = useState<FrequentFood[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFood, setSelectedFood] = useState<DatabaseFoodItem | null>(null);
  const [showOptional, setShowOptional] = useState(false);

  // 選填項目 - 預設100g
  const [amount, setAmount] = useState<number>(100);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState('');

  const [filteredFoods, setFilteredFoods] = useState<DatabaseFoodItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      }
    };
    loadFoods();
  }, []);

  // 載入習慣食物
  useEffect(() => {
    const loadFrequentFoods = async () => {
      try {
        const response = await fetch('/api/history/frequent?userId=demo-user&limit=8');
        const data = await response.json();
        if (data.success) {
          setFrequentFoods(data.frequentFoods);
        }
      } catch (error) {
        console.log('載入習慣食物失敗:', error);
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

    setFilteredFoods(filtered.slice(0, 6)); // 減少顯示數量
    setShowSuggestions(filtered.length > 0);
  }, [foods]);

  // 選擇食物
  const selectFood = (food: DatabaseFoodItem) => {
    setSelectedFood(food);
    setSearchTerm(food.name_zh);
    setShowSuggestions(false);
  };

  // 快速選擇習慣食物
  const selectFrequentFood = (food: FrequentFood) => {
    selectFood(food);
    setAmount(100); // 預設份量
  };

  // 照片上傳處理
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + photos.length > 2) { // 減少到最多2張
      onError('最多只能上傳 2 張照片');
      return;
    }
    setPhotos(prev => [...prev, ...files]);
  };

  // 移除照片
  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // AI分析並新增食材到資料庫
  const analyzeAndAddFood = async (foodName: string): Promise<DatabaseFoodItem | null> => {
    try {
      console.log('🧠 開始AI分析食材:', foodName);

      // 1. 呼叫AI分析API
      const analyzeResponse = await fetch('/api/food-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodName: foodName,
          category: 'protein', // 預設為蛋白質類別
          language: 'zh-TW'
        })
      });

      const analyzeData = await analyzeResponse.json();

      if (!analyzeData.success) {
        throw new Error(analyzeData.error || 'AI分析失敗');
      }

      console.log('✅ AI分析完成:', analyzeData.analyzedFood.name_zh);

      // 2. 將AI分析結果儲存到資料庫
      const saveResponse = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyzeData.analyzedFood)
      });

      const saveData = await saveResponse.json();

      if (!saveData.success) {
        throw new Error(saveData.error || '儲存食材失敗');
      }

      console.log('✅ 食材已儲存至資料庫:', saveData.food.name_zh);

      // 3. 重新載入食物資料庫以包含新食材
      const refreshResponse = await fetch('/api/foods');
      const refreshData = await refreshResponse.json();
      if (refreshData.success) {
        setFoods(refreshData.foods);
      }

      return saveData.food;
    } catch (error) {
      console.error('❌ AI分析和儲存失敗:', error);
      onError(`AI分析失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
      return null;
    }
  };

  // 快速提交（只需選擇食物或自動分析新食材）
  const quickSubmit = async () => {
    // 如果沒有選擇食物但有輸入搜尋詞，嘗試自動分析並新增
    if (!selectedFood && searchTerm.trim()) {
      const cleanSearchTerm = searchTerm.trim();

      // 確保不是空白且不在資料庫中
      const existingFood = foods.find(food =>
        food.name_zh === cleanSearchTerm ||
        food.name_en.toLowerCase() === cleanSearchTerm.toLowerCase()
      );

      if (existingFood) {
        // 如果找到了，自動選擇它
        setSelectedFood(existingFood);
        await submitEntry();
        return;
      }

      // 食材不存在，使用AI分析並新增
      console.log('🔍 食材不在資料庫中，啟動AI分析:', cleanSearchTerm);
      const analyzedFood = await analyzeAndAddFood(cleanSearchTerm);

      if (analyzedFood) {
        setSelectedFood(analyzedFood);
        await submitEntry();
      }
      return;
    }

    if (!selectedFood) {
      onError('請選擇食物或輸入食物名稱');
      return;
    }

    await submitEntry();
  };

  // 完整提交（包含選填項目）
  const fullSubmit = async () => {
    // 如果沒有選擇食物但有輸入搜尋詞，嘗試自動分析並新增
    if (!selectedFood && searchTerm.trim()) {
      const cleanSearchTerm = searchTerm.trim();

      // 確保不是空白且不在資料庫中
      const existingFood = foods.find(food =>
        food.name_zh === cleanSearchTerm ||
        food.name_en.toLowerCase() === cleanSearchTerm.toLowerCase()
      );

      if (existingFood) {
        // 如果找到了，自動選擇它
        setSelectedFood(existingFood);
        await submitEntry();
        return;
      }

      // 食材不存在，使用AI分析並新增
      console.log('🔍 食材不在資料庫中，啟動AI分析:', cleanSearchTerm);
      const analyzedFood = await analyzeAndAddFood(cleanSearchTerm);

      if (analyzedFood) {
        setSelectedFood(analyzedFood);
        await submitEntry();
      }
      return;
    }

    if (!selectedFood) {
      onError('請選擇食物或輸入食物名稱');
      return;
    }

    await submitEntry();
  };

  // 提交記錄
  const submitEntry = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const entry: CreateHistoryEntryRequest = {
        foodId: selectedFood!.id,
        portion: {
          amount: amount,
          unit: 'custom',
          customAmount: amount,
          customUnit: 'g'
        },
        notes: notes.trim() || undefined,
        tags: photos.length > 0 ? ['photo'] : undefined
      };

      // 直接呼叫歷史記錄API
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '記錄失敗');
      }

      console.log('✅ 食物記錄已新增:', data.entry.id);

      // 清空表單
      resetForm();
    } catch (error) {
      console.error('新增記錄失敗:', error);
      onError('新增記錄失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 清空表單
  const resetForm = () => {
    setSelectedFood(null);
    setSearchTerm('');
    setAmount(100);
    setPhotos([]);
    setNotes('');
    setShowSuggestions(false);
    setShowOptional(false);
  };

  return (
    <div className={`bg-white rounded-lg border-2 border-gray-200 p-4 ${className}`}>
      <div className="space-y-4">
        {/* 標題 */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            ⚡ 快速記錄
          </h2>
          <p className="text-sm text-gray-600">
            選擇或輸入食物名稱，系統會自動分析並新增不存在的食材
          </p>
        </div>

        {/* 習慣食物快速選擇 */}
        {frequentFoods.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">🍽️ 常吃食物</h3>
            <div className="grid grid-cols-2 gap-2">
              {frequentFoods.slice(0, 4).map((food) => (
                <button
                  key={food.id}
                  onClick={() => selectFrequentFood(food)}
                  className="flex items-center p-2 text-left bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-blue-900 truncate">
                      {food.name_zh}
                    </div>
                    <div className="text-xs text-blue-600">
                      {food.frequency} 次
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 食物搜尋 - 必填 */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔍 選擇食物 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="輸入食物名稱搜尋..."
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* 搜尋建議 */}
          {showSuggestions && filteredFoods.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {filteredFoods.map((food) => (
                <button
                  key={food.id}
                  onClick={() => selectFood(food)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">{food.name_zh}</div>
                  <div className="text-sm text-gray-600">{food.name_en}</div>
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
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-green-900">{selectedFood.name_zh}</h4>
                <p className="text-sm text-green-700">{selectedFood.name_en}</p>
              </div>
              <button
                onClick={resetForm}
                className="text-green-600 hover:text-green-800 text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 選填項目切換 */}
        {selectedFood && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowOptional(!showOptional)}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showOptional ? '🔼 隱藏選填項目' : '🔽 顯示選填項目 (份量、照片、備註)'}
            </button>
          </div>
        )}

        {/* 選填項目 */}
        {selectedFood && showOptional && (
          <div className="space-y-3 pt-3 border-t border-gray-200">
            {/* 份量設定 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ⚖️ 份量 (公克) - 選填
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  min="1"
                  max="1000"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex space-x-1">
                  {[50, 100, 150, 200].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      {preset}g
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                約 {Math.round((selectedFood.calories_per_100g * amount) / 100)} 大卡
              </p>
            </div>

            {/* 照片上傳 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📸 照片記錄 - 選填
              </label>

              {photos.length < 2 && (
                <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                  <div className="text-center">
                    <span className="text-xs text-gray-600">點擊上傳照片</span>
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
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`照片 ${index + 1}`}
                        className="w-full h-16 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full hover:bg-red-600"
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
                📝 備註 - 選填
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="特殊情況或感受..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>
        )}

        {/* 提交按鈕 */}
        {(selectedFood || searchTerm.trim()) && (
          <div className="space-y-2 pt-3 border-t border-gray-200">
            {/* 快速提交 */}
            <button
              onClick={quickSubmit}
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                isSubmitting
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isSubmitting ? '分析並記錄中...' : selectedFood ? '⚡ 快速記錄 (預設100g)' : '⚡ 快速記錄 (自動分析新食材)'}
            </button>

            {/* 完整提交 */}
            {showOptional && selectedFood && (
              <button
                onClick={fullSubmit}
                disabled={isSubmitting}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSubmitting
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isSubmitting ? '記錄中...' : `✅ 記錄 ${amount}g`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}