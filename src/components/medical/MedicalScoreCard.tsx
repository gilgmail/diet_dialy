'use client';

import React from 'react';
import { MedicalScore } from '@/lib/medical/scoring-engine';

interface MedicalScoreCardProps {
  score: MedicalScore;
  foodName: string;
  className?: string;
}

const scoreConfig = {
  1: {
    level: '差',
    emoji: '😞',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-500'
  },
  2: {
    level: '普通',
    emoji: '😐',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-500'
  },
  3: {
    level: '好',
    emoji: '😊',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-500'
  },
  4: {
    level: '完美',
    emoji: '😍',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-500'
  }
};

const urgencyConfig = {
  low: { icon: '💡', color: 'text-green-600', label: '一般' },
  medium: { icon: '⚠️', color: 'text-yellow-600', label: '注意' },
  high: { icon: '⚠️', color: 'text-orange-600', label: '小心' },
  critical: { icon: '🚨', color: 'text-red-600', label: '緊急' }
};

export default function MedicalScoreCard({
  score,
  foodName,
  className = ''
}: MedicalScoreCardProps): JSX.Element {
  const config = scoreConfig[score.score];
  const urgencyInfo = urgencyConfig[score.urgency];

  return (
    <div className={`rounded-lg border-2 p-6 ${config.bgColor} ${config.borderColor} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{config.emoji}</span>
          <div>
            <h3 className={`text-lg font-semibold ${config.textColor}`}>
              {config.level}
            </h3>
            <p className="text-sm text-gray-600">{foodName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={urgencyInfo.color}>{urgencyInfo.icon}</span>
          <span className={`text-sm font-medium ${urgencyInfo.color}`}>
            {urgencyInfo.label}
          </span>
        </div>
      </div>

      {/* Score Visual */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">醫療評分</span>
          <span className={`text-lg font-bold ${config.textColor}`}>
            {score.score}/4
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              score.score === 1 ? 'bg-red-500' :
              score.score === 2 ? 'bg-yellow-500' :
              score.score === 3 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${(score.score / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Medical Reason */}
      <div className="mb-4">
        <p className={`text-sm ${config.textColor} font-medium`}>
          {score.medicalReason}
        </p>
      </div>

      {/* Risk Factors */}
      {score.riskFactors.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            風險因子
          </h4>
          <ul className="space-y-1">
            {score.riskFactors.map((risk, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <span className="text-red-400 mr-2 mt-0.5">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {score.recommendations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <span className="text-blue-500 mr-2">💡</span>
            建議
          </h4>
          <ul className="space-y-1">
            {score.recommendations.map((recommendation, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <span className="text-blue-400 mr-2 mt-0.5">•</span>
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternatives */}
      {score.alternatives.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <span className="text-green-500 mr-2">🔄</span>
            建議替代食物
          </h4>
          <div className="flex flex-wrap gap-2">
            {score.alternatives.map((alternative, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
              >
                {alternative}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Alert for Critical Items */}
      {score.urgency === 'critical' && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-500 text-lg mr-2">🚨</span>
            <div>
              <p className="text-sm font-semibold text-red-800">緊急提醒</p>
              <p className="text-xs text-red-700">
                此食物對您的醫療狀況存在嚴重風險，請立即停止食用
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}