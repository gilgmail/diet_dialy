'use client';

import React, { useState } from 'react';
import { MedicalCondition } from '@/types/medical';

interface MedicalConditionSelectorProps {
  onConditionSelect: (condition: MedicalCondition) => void;
  selectedCondition?: MedicalCondition;
}

const conditions = [
  {
    id: 'IBD' as MedicalCondition,
    name_zh: '發炎性腸道疾病',
    name_en: 'IBD',
    description: '克隆氏症或潰瘍性結腸炎',
    icon: '🔥',
    color: 'bg-red-50 border-red-200 text-red-800'
  },
  {
    id: '化療' as MedicalCondition,
    name_zh: '化療期間',
    name_en: 'Chemotherapy',
    description: '癌症化學治療中',
    icon: '💊',
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  {
    id: '過敏' as MedicalCondition,
    name_zh: '食物過敏',
    name_en: 'Food Allergies',
    description: '嚴重食物過敏反應',
    icon: '⚠️',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  },
  {
    id: 'IBS' as MedicalCondition,
    name_zh: '腸躁症',
    name_en: 'IBS',
    description: '大腸激躁症候群',
    icon: '🌀',
    color: 'bg-green-50 border-green-200 text-green-800'
  }
];

export default function MedicalConditionSelector({
  onConditionSelect,
  selectedCondition
}: MedicalConditionSelectorProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(!selectedCondition);

  const handleConditionSelect = (condition: MedicalCondition) => {
    onConditionSelect(condition);
    setIsExpanded(false);
  };

  if (!isExpanded && selectedCondition) {
    const selected = conditions.find(c => c.id === selectedCondition);
    return (
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4 mb-6">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between"
          aria-label="更改醫療狀況"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{selected?.icon}</span>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">{selected?.name_zh}</h3>
              <p className="text-sm text-gray-600">{selected?.description}</p>
            </div>
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
          請選擇您的醫療狀況
        </h2>
        <p className="text-sm text-gray-600">
          這將幫助我們為您提供個人化的飲食建議
        </p>
      </div>

      <div className="space-y-3">
        {conditions.map((condition) => (
          <button
            key={condition.id}
            onClick={() => handleConditionSelect(condition.id)}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              selectedCondition === condition.id
                ? condition.color + ' ring-2 ring-offset-2 ring-blue-500'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
            aria-pressed={selectedCondition === condition.id}
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
              {selectedCondition === condition.id && (
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      {selectedCondition && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ✅ 已選擇：{conditions.find(c => c.id === selectedCondition)?.name_zh}
          </p>
        </div>
      )}
    </div>
  );
}