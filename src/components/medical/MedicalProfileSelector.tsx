'use client';

import React, { useState } from 'react';
import { MedicalCondition } from '@/types/medical';

interface MedicalProfile {
  conditions: MedicalCondition[];
  ibdPhase?: 'active_flare' | 'remission';
  allergies: string[];
}

interface MedicalProfileSelectorProps {
  onProfileChange: (profile: MedicalProfile) => void;
  profile?: MedicalProfile;
}

const conditions = [
  {
    id: 'ibd' as MedicalCondition,
    name_zh: '發炎性腸道疾病',
    name_en: 'IBD',
    description: '克隆氏症或潰瘍性結腸炎',
    icon: '🔥',
    color: 'bg-red-50 border-red-200 text-red-800',
    hasPhases: true
  },
  {
    id: 'chemotherapy' as MedicalCondition,
    name_zh: '化療期間',
    name_en: 'Chemotherapy',
    description: '癌症化學治療中',
    icon: '💊',
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  {
    id: 'allergy' as MedicalCondition,
    name_zh: '食物過敏',
    name_en: 'Food Allergies',
    description: '嚴重食物過敏反應',
    icon: '⚠️',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    hasAllergyInput: true
  },
  {
    id: 'ibs' as MedicalCondition,
    name_zh: '腸躁症',
    name_en: 'IBS',
    description: '大腸激躁症候群',
    icon: '🌀',
    color: 'bg-green-50 border-green-200 text-green-800'
  }
];

export default function MedicalProfileSelector({
  onProfileChange,
  profile = { conditions: [], allergies: [] }
}: MedicalProfileSelectorProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(profile.conditions.length === 0);
  const [newAllergy, setNewAllergy] = useState('');

  const handleConditionToggle = (conditionId: MedicalCondition) => {
    const newConditions = profile.conditions.includes(conditionId)
      ? profile.conditions.filter(c => c !== conditionId)
      : [...profile.conditions, conditionId];

    const newProfile = { ...profile, conditions: newConditions };

    // 如果取消選擇IBD，清除IBD階段
    if (!newConditions.includes('ibd')) {
      delete newProfile.ibdPhase;
    }

    onProfileChange(newProfile);
  };

  const handleIBDPhaseChange = (phase: 'active_flare' | 'remission') => {
    onProfileChange({ ...profile, ibdPhase: phase });
  };

  const handleAddAllergy = () => {
    if (newAllergy.trim() && !profile.allergies.includes(newAllergy.trim())) {
      onProfileChange({
        ...profile,
        allergies: [...profile.allergies, newAllergy.trim()]
      });
      setNewAllergy('');
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    onProfileChange({
      ...profile,
      allergies: profile.allergies.filter(a => a !== allergy)
    });
  };

  const isConditionSelected = (conditionId: MedicalCondition) =>
    profile.conditions.includes(conditionId);

  if (!isExpanded && profile.conditions.length > 0) {
    return (
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4 mb-6">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between"
          aria-label="更改醫療設定"
        >
          <div className="flex flex-col items-start space-y-2">
            <div className="flex items-center space-x-2">
              {profile.conditions.map(conditionId => {
                const condition = conditions.find(c => c.id === conditionId);
                return condition && (
                  <div key={conditionId} className="flex items-center space-x-1">
                    <span className="text-lg">{condition.icon}</span>
                    <span className="text-sm font-medium">{condition.name_zh}</span>
                  </div>
                );
              })}
            </div>
            {profile.conditions.includes('ibd') && profile.ibdPhase && (
              <span className="text-xs text-gray-600">
                {profile.ibdPhase === 'active_flare' ? '急性期' : '緩解期'}
              </span>
            )}
            {profile.allergies.length > 0 && (
              <span className="text-xs text-gray-600">
                過敏: {profile.allergies.join(', ')}
              </span>
            )}
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          請設定您的醫療狀況
        </h2>
        <p className="text-sm text-gray-600">
          可複選多個狀況，這將幫助我們為您提供更準確的飲食建議
        </p>
      </div>

      <div className="space-y-4">
        {conditions.map((condition) => (
          <div key={condition.id} className="space-y-2">
            {/* 主要狀況選擇 */}
            <button
              onClick={() => handleConditionToggle(condition.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isConditionSelected(condition.id)
                  ? condition.color + ' ring-2 ring-offset-2 ring-blue-500'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-4">
                <span className="text-2xl flex-shrink-0">{condition.icon}</span>
                <div className="flex-1 text-left">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold">{condition.name_zh}</h3>
                    <span className="text-sm opacity-75">({condition.name_en})</span>
                  </div>
                  <p className="text-sm opacity-80 mt-1">{condition.description}</p>
                </div>
                {isConditionSelected(condition.id) && (
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>

            {/* IBD階段選擇 */}
            {condition.hasPhases && isConditionSelected(condition.id) && (
              <div className="ml-8 p-3 bg-red-25 border border-red-100 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">目前疾病階段：</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="ibdPhase"
                      value="active_flare"
                      checked={profile.ibdPhase === 'active_flare'}
                      onChange={() => handleIBDPhaseChange('active_flare')}
                      className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">🔥 急性期 - 目前有明顯症狀，需低渣飲食</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="ibdPhase"
                      value="remission"
                      checked={profile.ibdPhase === 'remission'}
                      onChange={() => handleIBDPhaseChange('remission')}
                      className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">😊 緩解期 - 症狀穩定，可適度正常飲食</span>
                  </label>
                </div>
              </div>
            )}

            {/* 過敏食材輸入 */}
            {condition.hasAllergyInput && isConditionSelected(condition.id) && (
              <div className="ml-8 p-3 bg-yellow-25 border border-yellow-100 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">過敏食材：</h4>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newAllergy}
                      onChange={(e) => setNewAllergy(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddAllergy()}
                      placeholder="例如：花生、蝦子、牛奶"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                    />
                    <button
                      onClick={handleAddAllergy}
                      className="px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                    >
                      新增
                    </button>
                  </div>
                  {profile.allergies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {profile.allergies.map((allergy) => (
                        <span
                          key={allergy}
                          className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs"
                        >
                          {allergy}
                          <button
                            onClick={() => handleRemoveAllergy(allergy)}
                            className="ml-1 hover:text-yellow-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {profile.conditions.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ✅ 已選擇：{profile.conditions.map(id => conditions.find(c => c.id === id)?.name_zh).join('、')}
            {profile.conditions.includes('ibd') && profile.ibdPhase &&
              ` (${profile.ibdPhase === 'active_flare' ? '急性期' : '緩解期'})`
            }
            {profile.allergies.length > 0 && ` | 過敏: ${profile.allergies.join('、')}`}
          </p>
        </div>
      )}
    </div>
  );
}