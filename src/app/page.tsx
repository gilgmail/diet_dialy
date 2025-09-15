'use client';

import React, { useState } from 'react';
import { MedicalCondition, ExtendedMedicalProfile } from '@/types/medical';
import { medicalScoringEngine, MedicalScore } from '@/lib/medical/scoring-engine';
import MedicalProfileSelector from '@/components/medical/MedicalProfileSelector';
import MedicalScoreCard from '@/components/medical/MedicalScoreCard';

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
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DD</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Diet Daily</h1>
                <p className="text-xs text-gray-600">智能飲食健康追蹤</p>
              </div>
            </div>
            <a
              href="/database"
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
            >
              📊 資料庫
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">

        {/* Medical Profile Selector */}
        <MedicalProfileSelector
          profile={medicalProfile}
          onProfileChange={setMedicalProfile}
        />

        {/* Demo Food Selector */}
        {medicalProfile.conditions.length > 0 && (
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              試試看食物評分 🍽️
            </h2>
            <div className="space-y-3">
              {demoFoods.map((food) => (
                <button
                  key={food.name}
                  onClick={() => setDemoFood(food.name)}
                  className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                    demoFood === food.name
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
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
        )}

        {/* Medical Score Card */}
        {medicalScore && (
          <MedicalScoreCard
            score={medicalScore}
            foodName={demoFood}
          />
        )}

        {/* Features Preview */}
        {medicalProfile.conditions.length === 0 && (
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Diet Daily 功能 ✨
            </h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">📸</span>
                <div>
                  <h3 className="font-medium text-gray-900">智能食物識別</h3>
                  <p className="text-sm text-gray-600">拍照即可識別台港美食，獲得個人化醫療建議</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🏥</span>
                <div>
                  <h3 className="font-medium text-gray-900">醫療級評分</h3>
                  <p className="text-sm text-gray-600">針對IBD、化療、過敏、IBS的專業飲食評估</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">📊</span>
                <div>
                  <h3 className="font-medium text-gray-900">醫生討論報告</h3>
                  <p className="text-sm text-gray-600">自動生成醫療報告，方便與醫生討論</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <h3 className="font-medium text-gray-900">隱私保護</h3>
                  <p className="text-sm text-gray-600">您的醫療數據完全由您掌控，儲存在您的Google雲端</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Week 1 Demo Badge */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="text-2xl">🚀</span>
            <span className="font-semibold">Week 1 Demo</span>
          </div>
          <p className="text-sm opacity-90">
            ✅ Next.js PWA 基礎建設<br/>
            ✅ AI 生成 209 項台港食物資料庫<br/>
            ✅ Google 整合 + 醫療級安全<br/>
            ✅ 醫療評分引擎 + UI 元件
          </p>
        </div>

        {/* Development Info */}
        <div className="bg-gray-100 rounded-lg p-4 text-center text-sm text-gray-600">
          <p>🔧 開發中：目前為 Week 1 功能展示</p>
          <p>📅 完整版預計 6 週後上線</p>
        </div>
      </main>
    </div>
  );
}