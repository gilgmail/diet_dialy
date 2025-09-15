'use client';

import React, { useState } from 'react';
import { DatabaseFoodItem } from '@/types/food';
import { FoodHistoryEntry } from '@/types/history';

interface CustomFoodEntryProps {
  onAddEntry: (entry: Omit<FoodHistoryEntry, 'id' | 'timestamp'>) => void;
  onError: (error: string) => void;
  className?: string;
}

export default function CustomFoodEntry({
  onAddEntry,
  onError,
  className = ''
}: CustomFoodEntryProps): JSX.Element {
  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState('protein');
  const [amount, setAmount] = useState(100);
  const [useAI, setUseAI] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analyzedFood, setAnalyzedFood] = useState<DatabaseFoodItem | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);

  // 手動輸入的營養資訊
  const [manualNutrition, setManualNutrition] = useState({
    calories: 100,
    protein: 5,
    carbs: 10,
    fat: 2,
    fiber: 1
  });

  const categories = [
    { value: 'protein', label: '蛋白質' },
    { value: 'vegetable', label: '蔬菜' },
    { value: 'fruit', label: '水果' },
    { value: 'grain', label: '穀物' },
    { value: 'dairy', label: '乳製品' },
    { value: 'snack', label: '零食' },
    { value: 'condiment', label: '調料' },
    { value: 'main_dish', label: '主食' },
    { value: 'soup', label: '湯品' },
    { value: 'beverage', label: '飲料' },
    { value: 'dessert', label: '甜點' }
  ];

  // AI分析食材
  const analyzeFood = async () => {
    if (!foodName.trim()) {
      onError('請輸入食物名稱');
      return;
    }

    setIsAnalyzing(true);
    try {
      // 調用AI分析API
      const response = await fetch('/api/food-analyzer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodName: foodName.trim(),
          category: category,
          language: 'zh-TW'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalyzedFood(data.analyzedFood);
        console.log('✅ AI分析完成:', data.analyzedFood.name_zh);
      } else {
        throw new Error(data.error || 'AI分析失敗');
      }
    } catch (error) {
      console.error('AI分析失敗:', error);
      onError('AI分析失敗，請使用手動輸入或重試');
      setShowManualInput(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 創建手動食材
  const createManualFood = (): DatabaseFoodItem => {
    const id = `custom_${Date.now()}`;

    return {
      id: id,
      name_zh: foodName.trim(),
      name_en: foodName.trim(), // 暫時使用中文作為英文名
      category: category,
      calories_per_100g: manualNutrition.calories,
      protein_per_100g: manualNutrition.protein,
      carbs_per_100g: manualNutrition.carbs,
      fat_per_100g: manualNutrition.fat,
      fiber_per_100g: manualNutrition.fiber,
      medical_scores: {
        IBD: { score: 3, urgency: 'low', advice: '用戶自建食材，建議諮詢醫生' },
        Chemotherapy: { score: 3, urgency: 'low', advice: '用戶自建食材，建議諮詢醫生' },
        Food_Allergies: { score: 3, urgency: 'medium', advice: '請注意個人過敏史' },
        IBS: { score: 3, urgency: 'low', advice: '用戶自建食材，建議諮詢醫生' }
      },
      availability: {
        taiwan: true,
        hong_kong: true,
        seasonal: null
      },
      cooking_methods: ['煮', '蒸', '炒'],
      alternatives: [],
      created: new Date().toISOString(),
      medical_validated: false // 自建食材需要人工驗證
    };
  };

  // 提交記錄
  const submitEntry = async () => {
    if (!foodName.trim()) {
      onError('請輸入食物名稱');
      return;
    }

    setIsSubmitting(true);
    try {
      let foodData: DatabaseFoodItem;

      if (analyzedFood) {
        // 使用AI分析結果
        foodData = analyzedFood;
      } else {
        // 使用手動輸入
        foodData = createManualFood();
      }

      // 同時保存到資料庫並記錄到歷史
      await saveToDatabase(foodData);

      const entry: Omit<FoodHistoryEntry, 'id' | 'timestamp'> = {
        userId: 'demo-user',
        food: foodData,
        amount_g: amount,
        photos: [],
        notes: analyzedFood ? 'AI分析新增' : '手動新增',
        medicalScore: foodData.medical_scores.IBD || {
          score: 3,
          urgency: 'low',
          advice: '新增食材，請諮詢醫生'
        }
      };

      await onAddEntry(entry);

      // 清空表單
      resetForm();
    } catch (error) {
      console.error('新增食材失敗:', error);
      onError('新增食材失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 保存到資料庫
  const saveToDatabase = async (foodData: DatabaseFoodItem) => {
    try {
      const response = await fetch('/api/foods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name_zh: foodData.name_zh,
          name_en: foodData.name_en,
          category: foodData.category,
          medical_scores: foodData.medical_scores,
          availability: foodData.availability,
          cooking_methods: foodData.cooking_methods,
          alternatives: foodData.alternatives,
          calories_per_100g: foodData.calories_per_100g,
          protein_per_100g: foodData.protein_per_100g,
          carbs_per_100g: foodData.carbs_per_100g,
          fat_per_100g: foodData.fat_per_100g,
          fiber_per_100g: foodData.fiber_per_100g
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '保存食材失敗');
      }

      console.log('✅ 食材已保存到資料庫:', foodData.name_zh);
    } catch (error) {
      console.warn('保存到資料庫失敗，但仍可記錄:', error);
      // 即使保存失敗，仍可以記錄到歷史
    }
  };

  // 清空表單
  const resetForm = () => {
    setFoodName('');
    setCategory('protein');
    setAmount(100);
    setAnalyzedFood(null);
    setShowManualInput(false);
    setManualNutrition({
      calories: 100,
      protein: 5,
      carbs: 10,
      fat: 2,
      fiber: 1
    });
  };

  return (
    <div className={`bg-white rounded-lg border-2 border-gray-200 p-4 ${className}`}>
      <div className="space-y-4">
        {/* 標題 */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            🆕 新增食材
          </h2>
          <p className="text-sm text-gray-600">
            記錄不在資料庫的食物，AI協助分析營養成分
          </p>
        </div>

        {/* 食物名稱 - 必填 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🏷️ 食物名稱 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            placeholder="例如：蒸蛋、炒高麗菜、烤雞翅..."
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 類別選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📂 食物類別
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* AI分析選項 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="useAI"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="useAI" className="text-sm font-medium text-blue-900">
              🤖 使用AI分析營養成分 (推薦)
            </label>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            AI會自動分析食材的營養成分和醫療建議
          </p>
        </div>

        {/* AI分析按鈕 */}
        {useAI && !analyzedFood && (
          <button
            onClick={analyzeFood}
            disabled={isAnalyzing || !foodName.trim()}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
              isAnalyzing || !foodName.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isAnalyzing ? '🧠 AI分析中...' : '🔍 AI分析食材'}
          </button>
        )}

        {/* AI分析結果 */}
        {analyzedFood && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <h3 className="font-medium text-green-900 mb-2">✅ AI分析完成</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-green-700">熱量:</span>
                <span className="font-medium ml-1">{analyzedFood.calories_per_100g} 大卡</span>
              </div>
              <div>
                <span className="text-green-700">蛋白質:</span>
                <span className="font-medium ml-1">{analyzedFood.protein_per_100g}g</span>
              </div>
              <div>
                <span className="text-green-700">碳水:</span>
                <span className="font-medium ml-1">{analyzedFood.carbs_per_100g}g</span>
              </div>
              <div>
                <span className="text-green-700">脂肪:</span>
                <span className="font-medium ml-1">{analyzedFood.fat_per_100g}g</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-green-700 text-sm">醫療評分:</span>
              <span className="font-medium ml-1 text-sm">
                IBD {analyzedFood.medical_scores.IBD?.score}/4
              </span>
            </div>
          </div>
        )}

        {/* 手動輸入選項 */}
        {(!useAI || showManualInput) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <h3 className="font-medium text-yellow-900 mb-3">📝 手動輸入營養資訊 (每100g)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-yellow-700 mb-1">熱量 (大卡)</label>
                <input
                  type="number"
                  value={manualNutrition.calories}
                  onChange={(e) => setManualNutrition({...manualNutrition, calories: Number(e.target.value)})}
                  min="0"
                  max="900"
                  className="w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-xs text-yellow-700 mb-1">蛋白質 (g)</label>
                <input
                  type="number"
                  value={manualNutrition.protein}
                  onChange={(e) => setManualNutrition({...manualNutrition, protein: Number(e.target.value)})}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-xs text-yellow-700 mb-1">碳水化合物 (g)</label>
                <input
                  type="number"
                  value={manualNutrition.carbs}
                  onChange={(e) => setManualNutrition({...manualNutrition, carbs: Number(e.target.value)})}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-xs text-yellow-700 mb-1">脂肪 (g)</label>
                <input
                  type="number"
                  value={manualNutrition.fat}
                  onChange={(e) => setManualNutrition({...manualNutrition, fat: Number(e.target.value)})}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 份量設定 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ⚖️ 攝取份量 (公克)
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
          {(analyzedFood || (!useAI && manualNutrition.calories)) && (
            <p className="text-xs text-gray-600 mt-1">
              約 {Math.round(((analyzedFood?.calories_per_100g || manualNutrition.calories) * amount) / 100)} 大卡
            </p>
          )}
        </div>

        {/* 操作按鈕 */}
        <div className="flex space-x-3 pt-3 border-t border-gray-200">
          <button
            onClick={resetForm}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            🗑️ 清空
          </button>
          <button
            onClick={submitEntry}
            disabled={isSubmitting || !foodName.trim()}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
              isSubmitting || !foodName.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {isSubmitting ? '新增中...' : `🆕 新增 ${amount}g`}
          </button>
        </div>

        {/* 說明 */}
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
          <p className="mb-1">💡 <strong>使用說明：</strong></p>
          <p>• AI分析會自動提供營養成分和醫療建議</p>
          <p>• 新增的食材會自動保存到資料庫供日後使用</p>
          <p>• 所有新增食材都需要人工驗證以確保準確性</p>
        </div>
      </div>
    </div>
  );
}