'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  Pill,
  AlertTriangle,
  Activity,
  Stethoscope,
  Plus,
  X,
  Info
} from 'lucide-react';
import type { MedicalCondition, MedicalProfile } from '@/types/medical';

interface MedicalConditionSelectorProps {
  onProfileComplete: (profile: Partial<MedicalProfile>) => void;
  initialProfile?: Partial<MedicalProfile>;
}

interface ConditionInfo {
  id: MedicalCondition;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const medicalConditions: ConditionInfo[] = [
  {
    id: 'ibd',
    name: '炎症性腸病 (IBD)',
    description: '包括克羅恩病和潰瘍性結腸炎',
    icon: Activity,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  {
    id: 'crohns',
    name: '克羅恩病',
    description: '慢性炎症性腸道疾病',
    icon: Heart,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  {
    id: 'uc',
    name: '潰瘍性結腸炎',
    description: '大腸慢性炎症疾病',
    icon: Activity,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  {
    id: 'chemotherapy',
    name: '化療治療',
    description: '正在接受或曾接受化療',
    icon: Pill,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'allergy',
    name: '食物/環境過敏',
    description: '對特定食物或環境因子過敏',
    icon: AlertTriangle,
    color: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  {
    id: 'ibs',
    name: '腸躁症 (IBS)',
    description: '腸道功能紊亂症候群',
    icon: Activity,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'celiac',
    name: '乳糜瀉',
    description: '對麩質過敏的自體免疫疾病',
    icon: Stethoscope,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    id: 'other',
    name: '其他狀況',
    description: '其他未列出的醫療狀況',
    icon: Heart,
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
];

export function MedicalConditionSelector({ onProfileComplete, initialProfile }: MedicalConditionSelectorProps) {
  const [selectedConditions, setSelectedConditions] = useState<MedicalCondition[]>(
    initialProfile?.conditions || []
  );
  const [allergies, setAllergies] = useState<string[]>(initialProfile?.allergies || []);
  const [newAllergy, setNewAllergy] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(
    initialProfile?.dietaryRestrictions || []
  );
  const [newRestriction, setNewRestriction] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const handleConditionToggle = (conditionId: MedicalCondition) => {
    setSelectedConditions(prev =>
      prev.includes(conditionId)
        ? prev.filter(id => id !== conditionId)
        : [...prev, conditionId]
    );
  };

  const handleAddAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies(prev => [...prev, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const handleRemoveAllergy = (allergy: string) => {
    setAllergies(prev => prev.filter(a => a !== allergy));
  };

  const handleAddRestriction = () => {
    if (newRestriction.trim() && !dietaryRestrictions.includes(newRestriction.trim())) {
      setDietaryRestrictions(prev => [...prev, newRestriction.trim()]);
      setNewRestriction('');
    }
  };

  const handleRemoveRestriction = (restriction: string) => {
    setDietaryRestrictions(prev => prev.filter(r => r !== restriction));
  };

  const handleNext = () => {
    if (currentStep === 1 && selectedConditions.length === 0) {
      alert('請至少選擇一個醫療狀況');
      return;
    }
    setCurrentStep(2);
  };

  const handleComplete = () => {
    const profile: Partial<MedicalProfile> = {
      conditions: selectedConditions,
      allergies,
      dietaryRestrictions,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onProfileComplete(profile);
  };

  if (currentStep === 1) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Stethoscope className="w-5 h-5" />
            <span>選擇您的醫療狀況</span>
          </CardTitle>
          <CardDescription>
            請選擇適用於您的醫療狀況，這將幫助我們為您提供個性化的飲食建議。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {medicalConditions.map((condition) => {
              const Icon = condition.icon;
              const isSelected = selectedConditions.includes(condition.id);

              return (
                <div
                  key={condition.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleConditionToggle(condition.id)}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-1"
                    />
                    <Icon className="w-5 h-5 mt-1 text-blue-600" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{condition.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{condition.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedConditions.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">已選擇的狀況：</h4>
              <div className="flex flex-wrap gap-2">
                {selectedConditions.map(conditionId => {
                  const condition = medicalConditions.find(c => c.id === conditionId);
                  return (
                    <Badge key={conditionId} variant="secondary" className="text-sm">
                      {condition?.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <div className="text-sm text-gray-500">
              步驟 1 / 2
            </div>
            <Button onClick={handleNext} disabled={selectedConditions.length === 0}>
              下一步：過敏與飲食限制
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5" />
          <span>過敏與飲食限制</span>
        </CardTitle>
        <CardDescription>
          請添加您的過敏原和飲食限制，以確保食物建議的安全性。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 過敏原 */}
        <div>
          <Label className="text-base font-medium">已知過敏原</Label>
          <p className="text-sm text-gray-600 mb-3">添加您對哪些食物或物質過敏</p>

          <div className="flex space-x-2 mb-3">
            <Input
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              placeholder="輸入過敏原（例如：花生、海鮮、蛋類）"
              onKeyPress={(e) => e.key === 'Enter' && handleAddAllergy()}
            />
            <Button onClick={handleAddAllergy} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {allergies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy, index) => (
                <Badge key={index} variant="destructive" className="text-sm">
                  {allergy}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => handleRemoveAllergy(allergy)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* 飲食限制 */}
        <div>
          <Label className="text-base font-medium">飲食限制</Label>
          <p className="text-sm text-gray-600 mb-3">添加您遵循的飲食限制或偏好</p>

          <div className="flex space-x-2 mb-3">
            <Input
              value={newRestriction}
              onChange={(e) => setNewRestriction(e.target.value)}
              placeholder="輸入飲食限制（例如：無麩質、低FODMAP、素食）"
              onKeyPress={(e) => e.key === 'Enter' && handleAddRestriction()}
            />
            <Button onClick={handleAddRestriction} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {dietaryRestrictions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dietaryRestrictions.map((restriction, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {restriction}
                  <X
                    className="w-3 h-3 ml-1 cursor-pointer"
                    onClick={() => handleRemoveRestriction(restriction)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* 額外備註 */}
        <div>
          <Label htmlFor="notes" className="text-base font-medium">額外備註 (可選)</Label>
          <p className="text-sm text-gray-600 mb-3">任何其他我們應該知道的醫療或飲食資訊</p>
          <Textarea
            id="notes"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="例如：對某些食物敏感但未確診過敏、正在服用的藥物、特殊飲食需求等..."
            rows={4}
          />
        </div>

        {/* 隱私提醒 */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-green-600 mt-0.5" />
            <div className="text-sm text-green-800">
              <h4 className="font-medium mb-1">隱私保護：</h4>
              <p>您的醫療資訊將通過端到端加密安全存儲在您的Google帳戶中，我們的服務器不會保留任何醫療數據。</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            上一步
          </Button>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              步驟 2 / 2
            </div>
            <Button onClick={handleComplete}>
              完成設定
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MedicalConditionSelector;