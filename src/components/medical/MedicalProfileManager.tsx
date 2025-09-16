'use client';

import { useState, useEffect } from 'react';
import type {
  MedicalCondition,
  ExtendedMedicalProfile,
  SymptomType
} from '@/types/medical';

interface MedicalProfileManagerProps {
  onProfileUpdate?: (profile: ExtendedMedicalProfile) => void;
  currentProfile?: ExtendedMedicalProfile;
}

export default function MedicalProfileManager({
  onProfileUpdate,
  currentProfile
}: MedicalProfileManagerProps) {
  const [profile, setProfile] = useState<Partial<ExtendedMedicalProfile>>({
    primary_condition: '',
    secondary_conditions: [],
    known_allergies: [],
    personal_triggers: [],
    current_phase: 'remission',
    current_side_effects: [],
    lactose_intolerant: false,
    fiber_sensitive: false,
    chemo_treatment_type: 'mild',
    chemo_cycle_day: 1,
    allergy_severity_levels: {},
    ibs_subtype: 'ibs_m',
    fodmap_tolerance: {},
    ...currentProfile
  });

  const [activeTab, setActiveTab] = useState<'conditions' | 'symptoms' | 'preferences'>('conditions');

  const medicalConditions: { value: MedicalCondition; label: string; description: string }[] = [
    { value: 'ibd', label: 'IBD (炎症性腸病)', description: '包括 Crohn 病和潰瘍性結腸炎' },
    { value: 'chemotherapy', label: '化療治療', description: '癌症化學療法期間' },
    { value: 'allergy', label: '食物過敏', description: '已知食物過敏反應' },
    { value: 'ibs', label: 'IBS (腸躁症)', description: '腸易激綜合症' },
    { value: 'crohns', label: 'Crohn 病', description: '克隆氏症' },
    { value: 'uc', label: '潰瘍性結腸炎', description: '潰瘍性結腸炎' },
    { value: 'celiac', label: '乳糜瀉', description: '麩質不耐症' }
  ];

  const commonAllergies = [
    '牛奶', '雞蛋', '花生', '堅果', '小麥', '大豆',
    '魚類', '甲殼類', '芝麻', '芥末', '水果'
  ];

  const commonSideEffects = [
    '噁心', '嘔吐', '口腔潰瘍', '味覺改變', '吞嚥困難',
    '腹瀉', '便秘', '食慾不振', '疲勞', '免疫力下降'
  ];

  const handleConditionChange = (condition: string, isPrimary: boolean = true) => {
    if (isPrimary) {
      setProfile(prev => ({ ...prev, primary_condition: condition }));
    } else {
      setProfile(prev => ({
        ...prev,
        secondary_conditions: prev.secondary_conditions?.includes(condition)
          ? prev.secondary_conditions.filter(c => c !== condition)
          : [...(prev.secondary_conditions || []), condition]
      }));
    }
  };

  const handleAllergyChange = (allergy: string) => {
    setProfile(prev => ({
      ...prev,
      known_allergies: prev.known_allergies?.includes(allergy)
        ? prev.known_allergies.filter(a => a !== allergy)
        : [...(prev.known_allergies || []), allergy]
    }));
  };

  const handleSideEffectChange = (sideEffect: string) => {
    setProfile(prev => ({
      ...prev,
      current_side_effects: prev.current_side_effects?.includes(sideEffect)
        ? prev.current_side_effects.filter(s => s !== sideEffect)
        : [...(prev.current_side_effects || []), sideEffect]
    }));
  };

  const handleSaveProfile = () => {
    if (onProfileUpdate && profile.primary_condition) {
      onProfileUpdate(profile as ExtendedMedicalProfile);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">醫療資料設定</h2>
        <p className="text-gray-600">設定您的醫療條件以獲得個人化的食物評分和建議</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { key: 'conditions', label: '醫療條件' },
          { key: 'symptoms', label: '症狀管理' },
          { key: 'preferences', label: '個人偏好' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Medical Conditions Tab */}
      {activeTab === 'conditions' && (
        <div className="space-y-6">
          {/* Primary Condition */}
          <div>
            <h3 className="text-lg font-semibold mb-3">主要醫療條件</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {medicalConditions.map(condition => (
                <label
                  key={condition.value}
                  className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                    profile.primary_condition === condition.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="primary_condition"
                    value={condition.value}
                    checked={profile.primary_condition === condition.value}
                    onChange={(e) => handleConditionChange(e.target.value, true)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{condition.label}</div>
                    <div className="text-sm text-gray-600">{condition.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Secondary Conditions */}
          <div>
            <h3 className="text-lg font-semibold mb-3">次要醫療條件（可多選）</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {medicalConditions
                .filter(c => c.value !== profile.primary_condition)
                .map(condition => (
                <label
                  key={condition.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    profile.secondary_conditions?.includes(condition.value)
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={profile.secondary_conditions?.includes(condition.value) || false}
                    onChange={() => handleConditionChange(condition.value, false)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">{condition.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Known Allergies */}
          <div>
            <h3 className="text-lg font-semibold mb-3">已知食物過敏</h3>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {commonAllergies.map(allergy => (
                <label
                  key={allergy}
                  className={`flex items-center p-2 border rounded cursor-pointer transition-colors ${
                    profile.known_allergies?.includes(allergy)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={profile.known_allergies?.includes(allergy) || false}
                    onChange={() => handleAllergyChange(allergy)}
                    className="mr-2"
                  />
                  <span className="text-sm">{allergy}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Symptoms Tab */}
      {activeTab === 'symptoms' && (
        <div className="space-y-6">
          {/* Current Phase (for IBD) */}
          {(profile.primary_condition === 'ibd' || profile.secondary_conditions?.includes('ibd')) && (
            <div>
              <h3 className="text-lg font-semibold mb-3">IBD 目前階段</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: 'remission', label: '緩解期', desc: '症狀穩定控制' },
                  { value: 'mild_symptoms', label: '輕微症狀', desc: '輕度不適' },
                  { value: 'active_flare', label: '急性期', desc: '症狀活躍' }
                ].map(phase => (
                  <label
                    key={phase.value}
                    className={`flex items-start p-4 border rounded-lg cursor-pointer ${
                      profile.current_phase === phase.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="current_phase"
                      value={phase.value}
                      checked={profile.current_phase === phase.value}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        current_phase: e.target.value as any
                      }))}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium">{phase.label}</div>
                      <div className="text-sm text-gray-600">{phase.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Current Side Effects (for Chemo) */}
          {(profile.primary_condition === 'chemotherapy' || profile.secondary_conditions?.includes('chemotherapy')) && (
            <div>
              <h3 className="text-lg font-semibold mb-3">目前副作用</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonSideEffects.map(effect => (
                  <label
                    key={effect}
                    className={`flex items-center p-3 border rounded cursor-pointer transition-colors ${
                      profile.current_side_effects?.includes(effect)
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={profile.current_side_effects?.includes(effect) || false}
                      onChange={() => handleSideEffectChange(effect)}
                      className="mr-2"
                    />
                    <span className="text-sm">{effect}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* IBS Subtype */}
          {(profile.primary_condition === 'ibs' || profile.secondary_conditions?.includes('ibs')) && (
            <div>
              <h3 className="text-lg font-semibold mb-3">IBS 亞型</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { value: 'ibs_d', label: 'IBS-D', desc: '腹瀉型' },
                  { value: 'ibs_c', label: 'IBS-C', desc: '便秘型' },
                  { value: 'ibs_m', label: 'IBS-M', desc: '混合型' },
                  { value: 'ibs_u', label: 'IBS-U', desc: '未分類型' }
                ].map(subtype => (
                  <label
                    key={subtype.value}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                      profile.ibs_subtype === subtype.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="ibs_subtype"
                      value={subtype.value}
                      checked={profile.ibs_subtype === subtype.value}
                      onChange={(e) => setProfile(prev => ({
                        ...prev,
                        ibs_subtype: e.target.value as any
                      }))}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">{subtype.label}</div>
                      <div className="text-sm text-gray-600">{subtype.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          {/* Dietary Sensitivities */}
          <div>
            <h3 className="text-lg font-semibold mb-3">飲食敏感性</h3>
            <div className="space-y-3">
              <label className="flex items-center p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={profile.lactose_intolerant || false}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    lactose_intolerant: e.target.checked
                  }))}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">乳糖不耐症</div>
                  <div className="text-sm text-gray-600">對乳糖敏感，影響乳製品消化</div>
                </div>
              </label>

              <label className="flex items-center p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={profile.fiber_sensitive || false}
                  onChange={(e) => setProfile(prev => ({
                    ...prev,
                    fiber_sensitive: e.target.checked
                  }))}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">纖維敏感</div>
                  <div className="text-sm text-gray-600">對高纖維食物敏感，容易引起腸道不適</div>
                </div>
              </label>
            </div>
          </div>

          {/* Personal Triggers */}
          <div>
            <h3 className="text-lg font-semibold mb-3">個人觸發食物</h3>
            <div className="mb-4">
              <input
                type="text"
                placeholder="輸入觸發食物名稱，按 Enter 新增"
                className="w-full p-3 border border-gray-300 rounded-lg"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const trigger = e.currentTarget.value.trim();
                    setProfile(prev => ({
                      ...prev,
                      personal_triggers: [...(prev.personal_triggers || []), trigger]
                    }));
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>

            {profile.personal_triggers && profile.personal_triggers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profile.personal_triggers.map((trigger, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                  >
                    {trigger}
                    <button
                      onClick={() => setProfile(prev => ({
                        ...prev,
                        personal_triggers: prev.personal_triggers?.filter((_, i) => i !== index)
                      }))}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Chemotherapy Details */}
          {(profile.primary_condition === 'chemotherapy' || profile.secondary_conditions?.includes('chemotherapy')) && (
            <div>
              <h3 className="text-lg font-semibold mb-3">化療詳情</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">治療強度</label>
                  <select
                    value={profile.chemo_treatment_type || 'mild'}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      chemo_treatment_type: e.target.value as any
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    <option value="mild">輕度</option>
                    <option value="moderate">中度</option>
                    <option value="intensive">強化</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">治療週期第幾天</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={profile.chemo_cycle_day || 1}
                    onChange={(e) => setProfile(prev => ({
                      ...prev,
                      chemo_cycle_day: parseInt(e.target.value) || 1
                    }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSaveProfile}
          disabled={!profile.primary_condition}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            profile.primary_condition
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          儲存醫療資料
        </button>
      </div>
    </div>
  );
}