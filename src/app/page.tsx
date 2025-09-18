'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MedicalCondition, ExtendedMedicalProfile } from '@/types/medical';
import { medicalScoringEngine, MedicalScore } from '@/lib/medical/scoring-engine';
import MedicalProfileSelector from '@/components/medical/MedicalProfileSelector';
import MedicalScoreCard from '@/components/medical/MedicalScoreCard';
import MainNavigation from '@/components/navigation/MainNavigation';

interface MedicalProfile {
  conditions: MedicalCondition[];
  ibdPhase?: 'active_flare' | 'remission';
  allergies: string[];
}

export default function HomePage(): JSX.Element {
  const [medicalProfile, setMedicalProfile] = useState<MedicalProfile>({ conditions: [], allergies: [] });
  const [demoFood, setDemoFood] = useState<string>('牛肉麵');

  // Demo food items from our database
  const demoFoods = [
    { name: '牛肉麵', category: 'main_dish', risk_factors: ['高鈉', '麩質', '紅肉'], chemo_safety: 'caution', allergens: ['麩質'], fodmap: 'high' },
    { name: '白粥', category: 'grain', risk_factors: [], chemo_safety: 'safe', allergens: [], fodmap: 'low' },
    { name: '辣椒', category: 'condiment', risk_factors: ['辛辣食物'], chemo_safety: 'avoid', allergens: [], fodmap: 'low' },
    { name: '生魚片', category: 'protein', risk_factors: ['生食', '高脂肪食物'], chemo_safety: 'avoid', allergens: [], fodmap: 'low' },
    { name: '蒸蛋', category: 'protein', risk_factors: [], chemo_safety: 'safe', allergens: ['雞蛋'], fodmap: 'low' }
  ];

  const getMedicalScore = (): MedicalScore | null => {
    if (medicalProfile.conditions.length === 0) return null;

    const food = demoFoods.find(f => f.name === demoFood);
    if (!food) return null;

    const mockFoodItem = {
      id: '1',
      name_zh: food.name,
      name_en: food.name,
      category: food.category,
      medical_scores: {
        ibd_score: 3 as 1 | 2 | 3 | 4,
        ibd_risk_factors: food.risk_factors,
        chemo_safety: food.chemo_safety as 'safe' | 'caution' | 'avoid',
        major_allergens: food.allergens,
        fodmap_level: food.fodmap as 'low' | 'medium' | 'high'
      },
      availability: { taiwan: true, hong_kong: true },
      cooking_methods: [],
      alternatives: [],
      created: new Date().toISOString(),
      medical_validated: true
    };

    const mockProfile: ExtendedMedicalProfile = {
      id: '1',
      userId: '1',
      primary_condition: medicalProfile.conditions[0], // 使用第一個選中的狀況作為主要狀況
      current_phase: medicalProfile.ibdPhase || 'remission',
      known_allergies: medicalProfile.allergies,
      personal_triggers: [],
      current_side_effects: [],
      lactose_intolerant: false,
      fiber_sensitive: false,
      allergies: medicalProfile.allergies,
      medications: [],
      dietaryRestrictions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = medicalScoringEngine.scoreFood(mockFoodItem, mockProfile);
    return result.medicalScore;
  };

  const medicalScore = getMedicalScore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <MainNavigation />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Week 2 Feature Showcase */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Diet Daily Week 2</h1>
            <p className="text-gray-600">智能飲食追蹤與醫療分析系統</p>
            <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium mt-2">
              ✅ Week 2 功能已完成
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
            {/* Food Diary - NEW */}
            <Link href="/food-diary" className="group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group-hover:scale-105">
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">🍽️</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">食物日記</h3>
                <p className="text-sm text-gray-600 mb-3">每日飲食記錄，自訂評分與管理員驗證</p>
                <div className="flex items-center text-red-500 text-sm font-medium">
                  開始記錄 →
                </div>
              </div>
            </Link>

            {/* Smart Photo Recognition */}
            <Link href="/history" className="group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group-hover:scale-105">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">📸</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">智能食物識別</h3>
                <p className="text-sm text-gray-600 mb-3">拍照即可識別台港美食，自動匹配醫療評分</p>
                <div className="flex items-center text-blue-500 text-sm font-medium">
                  立即體驗 →
                </div>
              </div>
            </Link>

            {/* Food History Tracking */}
            <Link href="/history" className="group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group-hover:scale-105">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">📚</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">食物歷史追蹤</h3>
                <p className="text-sm text-gray-600 mb-3">完整記錄飲食習慣，智能分析健康趨勢</p>
                <div className="flex items-center text-green-500 text-sm font-medium">
                  查看記錄 →
                </div>
              </div>
            </Link>

            {/* Medical Reports */}
            <Link href="/reports" className="group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group-hover:scale-105">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">醫療分析報告</h3>
                <p className="text-sm text-gray-600 mb-3">專業醫療建議，協助醫生討論</p>
                <div className="flex items-center text-purple-500 text-sm font-medium">
                  生成報告 →
                </div>
              </div>
            </Link>

            {/* Food Database */}
            <Link href="/database" className="group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group-hover:scale-105">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">🗄️</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">食物資料庫</h3>
                <p className="text-sm text-gray-600 mb-3">209種台港美食，完整醫療評分</p>
                <div className="flex items-center text-orange-500 text-sm font-medium">
                  瀏覽資料庫 →
                </div>
              </div>
            </Link>

            {/* Admin Verification */}
            <Link href="/admin/food-verification" className="group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group-hover:scale-105">
                <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-white text-2xl">🛡️</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">管理員驗證</h3>
                <p className="text-sm text-gray-600 mb-3">審核用戶自訂食物，豐富資料庫</p>
                <div className="flex items-center text-indigo-500 text-sm font-medium">
                  進入管理 →
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Interactive Demo Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">互動式醫療評分 Demo</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Medical Profile */}
            <div>
              <MedicalProfileSelector
                profile={medicalProfile}
                onProfileChange={setMedicalProfile}
              />
            </div>

            {/* Right Column - Food Demo */}
            <div className="space-y-4">
              {medicalProfile.conditions.length > 0 ? (
                <>
                  {/* Demo Food Selector */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      試試看食物評分 🍽️
                    </h3>
                    <div className="space-y-2">
                      {demoFoods.map((food) => (
                        <button
                          key={food.name}
                          onClick={() => setDemoFood(food.name)}
                          className={`w-full p-3 rounded-lg border transition-all duration-200 text-left ${
                            demoFood === food.name
                              ? 'bg-blue-50 border-blue-200 text-blue-800'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{food.name}</span>
                            {demoFood === food.name && (
                              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Medical Score Card */}
                  {medicalScore && (
                    <MedicalScoreCard
                      score={medicalScore}
                      foodName={demoFood}
                    />
                  )}
                </>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <span className="text-4xl mb-4 block">🏥</span>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">選擇醫療狀況</h3>
                  <p className="text-gray-600">先選擇您的醫療狀況，即可體驗個人化食物評分功能</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Week 2 Achievement Badge */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl shadow-lg p-6 text-white text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <span className="text-3xl">🎉</span>
            <span className="text-xl font-bold">Week 2 完成!</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="text-left">
              <p className="font-medium mb-2">✅ 已完成功能:</p>
              <ul className="space-y-1 opacity-90">
                <li>• 📸 智能食物拍照識別</li>
                <li>• 📚 食物歷史追蹤系統</li>
                <li>• 📊 醫療分析報告生成</li>
                <li>• 🧭 統一導航體驗</li>
              </ul>
            </div>
            <div className="text-left">
              <p className="font-medium mb-2">🏗️ 技術架構:</p>
              <ul className="space-y-1 opacity-90">
                <li>• 209種食物醫療評分數據庫</li>
                <li>• RESTful API設計</li>
                <li>• 響應式UI組件</li>
                <li>• TypeScript + Next.js 14</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Next Steps Preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🚀 接下來的規劃</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl mb-2 block">🤖</span>
              <h3 className="font-medium text-gray-900 mb-1">Week 3</h3>
              <p className="text-sm text-gray-600">真實AI整合</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl mb-2 block">☁️</span>
              <h3 className="font-medium text-gray-900 mb-1">Week 4</h3>
              <p className="text-sm text-gray-600">雲端同步</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <span className="text-2xl mb-2 block">📱</span>
              <h3 className="font-medium text-gray-900 mb-1">Week 5-6</h3>
              <p className="text-sm text-gray-600">PWA優化</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}