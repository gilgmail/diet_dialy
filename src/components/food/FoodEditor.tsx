'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseFoodItem, CreateFoodRequest, UpdateFoodRequest, FoodCategory } from '@/types/food';
import { FOOD_CATEGORIES, COMMON_IBD_RISK_FACTORS, COMMON_ALLERGENS, COMMON_COOKING_METHODS, CHEMO_SAFETY_OPTIONS, FODMAP_OPTIONS, IBD_SCORE_OPTIONS, PAIRED_IBD_RISK_FACTORS, PAIRED_ALLERGENS } from '@/types/food';

interface FoodEditorProps {
  food?: DatabaseFoodItem;
  onSave: (request: CreateFoodRequest | UpdateFoodRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function FoodEditor({ food, onSave, onCancel, loading = false }: FoodEditorProps): JSX.Element {
  const [formData, setFormData] = useState<CreateFoodRequest>({
    name_zh: '',
    name_en: '',
    category: 'main_dish' as FoodCategory,
    medical_scores: {
      ibd_score: 3 as 1 | 2 | 3 | 4,
      ibd_risk_factors: [],
      chemo_safety: 'safe' as 'safe' | 'caution' | 'avoid',
      major_allergens: [],
      fodmap_level: 'low' as 'low' | 'medium' | 'high'
    },
    availability: {
      taiwan: true,
      hong_kong: true,
      seasonal: ''
    },
    cooking_methods: [],
    alternatives: []
  });

  const [customRiskFactor, setCustomRiskFactor] = useState('');
  const [customAllergen, setCustomAllergen] = useState('');
  const [customCookingMethod, setCutomCookingMethod] = useState('');
  const [customAlternative, setCustomAlternative] = useState('');

  // Track original selections for color differentiation
  const [originalRiskFactors, setOriginalRiskFactors] = useState<string[]>([]);
  const [originalAllergens, setOriginalAllergens] = useState<string[]>([]);
  const [originalCookingMethods, setOriginalCookingMethods] = useState<string[]>([]);

  const isEditing = !!food;

  useEffect(() => {
    if (food) {
      setFormData({
        name_zh: food.name_zh,
        name_en: food.name_en,
        category: food.category,
        medical_scores: { ...food.medical_scores },
        availability: {
          taiwan: food.availability.taiwan,
          hong_kong: food.availability.hong_kong,
          seasonal: food.availability.seasonal || ''
        },
        cooking_methods: [...food.cooking_methods],
        alternatives: [...food.alternatives]
      });
      // Store original selections for color differentiation
      setOriginalRiskFactors([...food.medical_scores.ibd_risk_factors]);
      setOriginalAllergens([...food.medical_scores.major_allergens]);
      setOriginalCookingMethods([...food.cooking_methods]);
    }
  }, [food]);

  // Helper functions for determining selection state and colors
  const getRiskFactorButtonStyle = (factor: string) => {
    const isSelected = formData.medical_scores.ibd_risk_factors.includes(factor);
    const wasOriginallySelected = originalRiskFactors.includes(factor);

    if (!isSelected) {
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }

    if (wasOriginallySelected) {
      // Previously selected (darker color)
      return 'bg-red-200 text-red-900 cursor-not-allowed border-2 border-red-300';
    } else {
      // Newly selected (lighter color)
      return 'bg-red-100 text-red-800 cursor-not-allowed border-2 border-red-200';
    }
  };

  const getAllergenButtonStyle = (allergen: string) => {
    const isSelected = formData.medical_scores.major_allergens.includes(allergen);
    const wasOriginallySelected = originalAllergens.includes(allergen);

    if (!isSelected) {
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }

    if (wasOriginallySelected) {
      // Previously selected (darker color)
      return 'bg-yellow-200 text-yellow-900 cursor-not-allowed border-2 border-yellow-300';
    } else {
      // Newly selected (lighter color)
      return 'bg-yellow-100 text-yellow-800 cursor-not-allowed border-2 border-yellow-200';
    }
  };

  // Helper function to check if a factor/allergen matches either Chinese or English
  const isFactorSelected = (pairedItem: { zh: string; en: string }, selectedList: string[]) => {
    return selectedList.includes(pairedItem.zh) || selectedList.includes(pairedItem.en);
  };

  const addFactorFromPair = (pairedItem: { zh: string; en: string }, addFunction: (factor: string) => void) => {
    // Check if either Chinese or English version is already selected
    const currentFactors = formData.medical_scores.ibd_risk_factors;
    if (!currentFactors.includes(pairedItem.zh) && !currentFactors.includes(pairedItem.en)) {
      // Add the Chinese version by default
      addFunction(pairedItem.zh);
    }
  };

  const addAllergenFromPair = (pairedItem: { zh: string; en: string }, addFunction: (allergen: string) => void) => {
    // Check if either Chinese or English version is already selected
    const currentAllergens = formData.medical_scores.major_allergens;
    if (!currentAllergens.includes(pairedItem.zh) && !currentAllergens.includes(pairedItem.en)) {
      // Add the Chinese version by default
      addFunction(pairedItem.zh);
    }
  };

  // Helper function for cooking method button styles
  const getCookingMethodButtonStyle = (method: string) => {
    const isSelected = formData.cooking_methods.includes(method);
    const wasOriginallySelected = originalCookingMethods.includes(method);

    if (!isSelected) {
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }

    if (wasOriginallySelected) {
      // Previously selected (darker color)
      return 'bg-blue-200 text-blue-900 cursor-not-allowed border-2 border-blue-300';
    } else {
      // Newly selected (lighter color)
      return 'bg-blue-100 text-blue-800 cursor-not-allowed border-2 border-blue-200';
    }
  };

  // Helper function for selected cooking method display styles
  const getCookingMethodDisplayStyle = (method: string) => {
    const wasOriginallySelected = originalCookingMethods.includes(method);

    if (wasOriginallySelected) {
      // Previously selected (darker color)
      return 'bg-blue-200 text-blue-900 border-blue-300';
    } else {
      // Newly selected (lighter color)
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const request = isEditing ? {
      id: food!.id,
      ...formData,
      availability: {
        ...formData.availability,
        seasonal: formData.availability.seasonal || undefined
      }
    } as UpdateFoodRequest : {
      ...formData,
      availability: {
        ...formData.availability,
        seasonal: formData.availability.seasonal || undefined
      }
    } as CreateFoodRequest;

    await onSave(request);
  };

  const addRiskFactor = (factor: string) => {
    if (factor && !formData.medical_scores.ibd_risk_factors.includes(factor)) {
      setFormData(prev => ({
        ...prev,
        medical_scores: {
          ...prev.medical_scores,
          ibd_risk_factors: [...prev.medical_scores.ibd_risk_factors, factor]
        }
      }));
    }
  };

  const removeRiskFactor = (factor: string) => {
    setFormData(prev => ({
      ...prev,
      medical_scores: {
        ...prev.medical_scores,
        ibd_risk_factors: prev.medical_scores.ibd_risk_factors.filter(f => f !== factor)
      }
    }));
  };

  const addAllergen = (allergen: string) => {
    if (allergen && !formData.medical_scores.major_allergens.includes(allergen)) {
      setFormData(prev => ({
        ...prev,
        medical_scores: {
          ...prev.medical_scores,
          major_allergens: [...prev.medical_scores.major_allergens, allergen]
        }
      }));
    }
  };

  const removeAllergen = (allergen: string) => {
    setFormData(prev => ({
      ...prev,
      medical_scores: {
        ...prev.medical_scores,
        major_allergens: prev.medical_scores.major_allergens.filter(a => a !== allergen)
      }
    }));
  };

  const addCookingMethod = (method: string) => {
    if (method && !formData.cooking_methods.includes(method)) {
      setFormData(prev => ({
        ...prev,
        cooking_methods: [...prev.cooking_methods, method]
      }));
      setCutomCookingMethod('');
    }
  };

  const removeCookingMethod = (method: string) => {
    setFormData(prev => ({
      ...prev,
      cooking_methods: prev.cooking_methods.filter(m => m !== method)
    }));
  };

  const addAlternative = (alternative: string) => {
    if (alternative && !formData.alternatives.includes(alternative)) {
      setFormData(prev => ({
        ...prev,
        alternatives: [...prev.alternatives, alternative]
      }));
      setCustomAlternative('');
    }
  };

  const removeAlternative = (alternative: string) => {
    setFormData(prev => ({
      ...prev,
      alternatives: prev.alternatives.filter(a => a !== alternative)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto bg-blue-50 rounded-lg shadow-lg border-2 border-blue-200">
      <div className="px-6 py-4 border-b border-blue-300 bg-blue-100">
        <h2 className="text-xl font-semibold text-blue-900">
          {isEditing ? `編輯食物：${food?.name_zh}` : '新增食物'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-blue-50">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              中文名稱 *
            </label>
            <input
              type="text"
              value={formData.name_zh}
              onChange={(e) => setFormData(prev => ({ ...prev, name_zh: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="例如：牛肉麵"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              英文名稱 *
            </label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="例如：Beef Noodle Soup"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              食物分類 *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as FoodCategory }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              {FOOD_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name_zh} ({cat.name_en})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IBD 評分 *
            </label>
            <select
              value={formData.medical_scores.ibd_score}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                medical_scores: {
                  ...prev.medical_scores,
                  ibd_score: Number(e.target.value) as 1 | 2 | 3 | 4
                }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              {IBD_SCORE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.emoji} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Availability */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            地區可用性
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.availability.taiwan}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  availability: { ...prev.availability, taiwan: e.target.checked }
                }))}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">台灣</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.availability.hong_kong}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  availability: { ...prev.availability, hong_kong: e.target.checked }
                }))}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">香港</span>
            </label>

            <div>
              <input
                type="text"
                value={formData.availability.seasonal}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  availability: { ...prev.availability, seasonal: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="季節性 (選填)"
              />
            </div>
          </div>
        </div>

        {/* Medical Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              化療安全性
            </label>
            <select
              value={formData.medical_scores.chemo_safety}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                medical_scores: {
                  ...prev.medical_scores,
                  chemo_safety: e.target.value as 'safe' | 'caution' | 'avoid'
                }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CHEMO_SAFETY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              FODMAP 等級
            </label>
            <select
              value={formData.medical_scores.fodmap_level}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                medical_scores: {
                  ...prev.medical_scores,
                  fodmap_level: e.target.value as 'low' | 'medium' | 'high'
                }
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {FODMAP_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* IBD Risk Factors */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            IBD 風險因子
          </label>
          <p className="text-xs text-gray-600 mb-3">
            💡 中英對照顯示 • 深色：原有選擇 • 淺色：本次新增
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {PAIRED_IBD_RISK_FACTORS.map(pairedFactor => {
                const isSelected = isFactorSelected(pairedFactor, formData.medical_scores.ibd_risk_factors);
                return (
                  <button
                    key={`${pairedFactor.zh}-${pairedFactor.en}`}
                    type="button"
                    onClick={() => addFactorFromPair(pairedFactor, addRiskFactor)}
                    disabled={isSelected}
                    className={`px-3 py-2 rounded-md text-sm text-left ${getRiskFactorButtonStyle(pairedFactor.zh)}`}
                  >
                    <div className="font-medium">{pairedFactor.zh}</div>
                    <div className="text-xs opacity-75">{pairedFactor.en}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={customRiskFactor}
                onChange={(e) => setCustomRiskFactor(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="輸入風險因子（中文或英文），例如：高脂肪、high fat"
              />
              <button
                type="button"
                onClick={() => {
                  addRiskFactor(customRiskFactor);
                  setCustomRiskFactor('');
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                新增
              </button>
            </div>

            {formData.medical_scores.ibd_risk_factors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">已選擇的風險因子：</p>
                <div className="flex flex-wrap gap-2">
                  {formData.medical_scores.ibd_risk_factors.map(factor => (
                    <span
                      key={factor}
                      className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                    >
                      {factor}
                      <button
                        type="button"
                        onClick={() => removeRiskFactor(factor)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Major Allergens */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            主要過敏原
          </label>
          <p className="text-xs text-gray-600 mb-3">
            💡 中英對照顯示 • 深色：原有選擇 • 淺色：本次新增
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {PAIRED_ALLERGENS.map(pairedAllergen => {
                const isSelected = isFactorSelected(pairedAllergen, formData.medical_scores.major_allergens);
                return (
                  <button
                    key={`${pairedAllergen.zh}-${pairedAllergen.en}`}
                    type="button"
                    onClick={() => addAllergenFromPair(pairedAllergen, addAllergen)}
                    disabled={isSelected}
                    className={`px-3 py-2 rounded-md text-sm text-left ${getAllergenButtonStyle(pairedAllergen.zh)}`}
                  >
                    <div className="font-medium">{pairedAllergen.zh}</div>
                    <div className="text-xs opacity-75">{pairedAllergen.en}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={customAllergen}
                onChange={(e) => setCustomAllergen(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="輸入過敏原（中文或英文），例如：花生、peanuts"
              />
              <button
                type="button"
                onClick={() => {
                  addAllergen(customAllergen);
                  setCustomAllergen('');
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                新增
              </button>
            </div>

            {formData.medical_scores.major_allergens.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">已選擇的過敏原：</p>
                <div className="flex flex-wrap gap-2">
                  {formData.medical_scores.major_allergens.map(allergen => (
                    <span
                      key={allergen}
                      className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
                    >
                      {allergen}
                      <button
                        type="button"
                        onClick={() => removeAllergen(allergen)}
                        className="ml-1 hover:text-yellow-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cooking Methods */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            烹飪方式
          </label>
          <p className="text-xs text-gray-600 mb-3">
            💡 深色：原有選擇 • 淺色：本次新增
          </p>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {COMMON_COOKING_METHODS.map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => addCookingMethod(method)}
                  disabled={formData.cooking_methods.includes(method)}
                  className={`px-3 py-1 rounded-full text-sm ${getCookingMethodButtonStyle(method)}`}
                >
                  {method}
                </button>
              ))}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={customCookingMethod}
                onChange={(e) => setCutomCookingMethod(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="自定義烹飪方式"
              />
              <button
                type="button"
                onClick={() => addCookingMethod(customCookingMethod)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                新增
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.cooking_methods.map(method => (
                <span
                  key={method}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${getCookingMethodDisplayStyle(method)}`}
                >
                  {method}
                  <button
                    type="button"
                    onClick={() => removeCookingMethod(method)}
                    className="ml-1 hover:opacity-70"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Alternatives */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            替代食物
          </label>
          <div className="space-y-3">
            <div className="flex space-x-2">
              <input
                type="text"
                value={customAlternative}
                onChange={(e) => setCustomAlternative(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="例如：白粥、蒸蛋"
              />
              <button
                type="button"
                onClick={() => addAlternative(customAlternative)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                新增
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.alternatives.map(alternative => (
                <span
                  key={alternative}
                  className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {alternative}
                  <button
                    type="button"
                    onClick={() => removeAlternative(alternative)}
                    className="ml-1 hover:text-green-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '儲存中...' : (isEditing ? '更新食物' : '新增食物')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}