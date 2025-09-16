'use client';

import { useState, useEffect } from 'react';
import type {
  Symptom,
  SymptomType,
  SymptomSeverity,
  SymptomAnalysis
} from '@/types/medical';
import { symptomTracker } from '@/lib/medical/symptom-tracker';

interface SymptomTrackerProps {
  onSymptomRecorded?: (symptomId: string) => void;
}

export default function SymptomTracker({ onSymptomRecorded }: SymptomTrackerProps) {
  const [activeTab, setActiveTab] = useState<'record' | 'analysis' | 'trends'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Recording form state
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomType[]>([]);
  const [severity, setSeverity] = useState<SymptomSeverity>('mild');
  const [severityScore, setSeverityScore] = useState<number>(3);
  const [duration, setDuration] = useState<number>(30);
  const [notes, setNotes] = useState<string>('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [newTrigger, setNewTrigger] = useState<string>('');
  const [activityImpact, setActivityImpact] = useState<'none' | 'mild' | 'moderate' | 'severe'>('none');

  const symptomTypes: { type: SymptomType; label: string; category: string }[] = [
    // 消化系統
    { type: 'abdominal_pain', label: '腹痛', category: '消化系統' },
    { type: 'bloating', label: '腹脹', category: '消化系統' },
    { type: 'diarrhea', label: '腹瀉', category: '消化系統' },
    { type: 'constipation', label: '便秘', category: '消化系統' },
    { type: 'nausea', label: '噁心', category: '消化系統' },
    { type: 'vomiting', label: '嘔吐', category: '消化系統' },
    { type: 'heartburn', label: '胃灼熱', category: '消化系統' },
    { type: 'gas', label: '脹氣', category: '消化系統' },
    { type: 'cramping', label: '痙攣', category: '消化系統' },
    { type: 'urgency', label: '急迫感', category: '消化系統' },

    // 全身症狀
    { type: 'fatigue', label: '疲勞', category: '全身症狀' },
    { type: 'headache', label: '頭痛', category: '全身症狀' },
    { type: 'joint_pain', label: '關節痛', category: '全身症狀' },
    { type: 'fever', label: '發燒', category: '全身症狀' },
    { type: 'dehydration', label: '脫水', category: '全身症狀' },

    // 化療相關
    { type: 'mouth_sores', label: '口腔潰瘍', category: '化療相關' },
    { type: 'taste_changes', label: '味覺改變', category: '化療相關' },
    { type: 'swallowing_difficulty', label: '吞嚥困難', category: '化療相關' },
    { type: 'immune_suppression', label: '免疫力下降', category: '化療相關' },

    // 過敏相關
    { type: 'skin_reaction', label: '皮膚反應', category: '過敏相關' },
    { type: 'allergy_symptoms', label: '過敏症狀', category: '過敏相關' },

    // 其他
    { type: 'mood_changes', label: '情緒變化', category: '其他' },
    { type: 'sleep_issues', label: '睡眠問題', category: '其他' },
    { type: 'appetite_changes', label: '食慾變化', category: '其他' },
    { type: 'weight_changes', label: '體重變化', category: '其他' }
  ];

  const groupedSymptoms = symptomTypes.reduce((groups, symptom) => {
    if (!groups[symptom.category]) {
      groups[symptom.category] = [];
    }
    groups[symptom.category].push(symptom);
    return groups;
  }, {} as Record<string, typeof symptomTypes>);

  useEffect(() => {
    // Load analysis and stats when component mounts
    loadAnalysis();
    loadStats();
  }, []);

  const loadAnalysis = () => {
    try {
      const analysisResult = symptomTracker.analyzeSymptoms(30);
      setAnalysis(analysisResult);
    } catch (error) {
      console.error('Failed to load symptom analysis:', error);
    }
  };

  const loadStats = () => {
    try {
      const statsResult = symptomTracker.getSymptomStats(30);
      setStats(statsResult);
    } catch (error) {
      console.error('Failed to load symptom stats:', error);
    }
  };

  const handleSymptomToggle = (symptomType: SymptomType) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptomType)
        ? prev.filter(s => s !== symptomType)
        : [...prev, symptomType]
    );
  };

  const handleAddTrigger = () => {
    if (newTrigger.trim() && !triggers.includes(newTrigger.trim())) {
      setTriggers(prev => [...prev, newTrigger.trim()]);
      setNewTrigger('');
    }
  };

  const handleRemoveTrigger = (trigger: string) => {
    setTriggers(prev => prev.filter(t => t !== trigger));
  };

  const handleSubmitSymptoms = async () => {
    if (selectedSymptoms.length === 0) {
      alert('請選擇至少一個症狀');
      return;
    }

    setIsRecording(true);

    try {
      // Record each selected symptom
      for (const symptomType of selectedSymptoms) {
        const symptomData: Omit<Symptom, 'id'> = {
          type: symptomType,
          severity,
          severity_score: severityScore,
          timestamp: new Date(),
          duration,
          triggers: triggers.length > 0 ? triggers : undefined,
          notes: notes.trim() || undefined,
          activity_impact: activityImpact
        };

        const symptomId = symptomTracker.recordSymptom(symptomData);
        if (onSymptomRecorded) {
          onSymptomRecorded(symptomId);
        }
      }

      // Reset form
      setSelectedSymptoms([]);
      setSeverity('mild');
      setSeverityScore(3);
      setDuration(30);
      setNotes('');
      setTriggers([]);
      setActivityImpact('none');

      // Reload analysis
      loadAnalysis();
      loadStats();

      alert('症狀記錄已保存');
    } catch (error) {
      console.error('Failed to record symptoms:', error);
      alert('記錄症狀時發生錯誤');
    } finally {
      setIsRecording(false);
    }
  };

  const getSeverityColor = (level: SymptomSeverity | string) => {
    switch (level) {
      case 'mild': return 'text-green-600 bg-green-100';
      case 'moderate': return 'text-yellow-600 bg-yellow-100';
      case 'severe': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getImprovementColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'worsening': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">症狀追蹤</h2>
        <p className="text-gray-600">記錄和分析您的症狀，幫助識別觸發因子和趨勢</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { key: 'record', label: '記錄症狀', icon: '📝' },
          { key: 'analysis', label: '症狀分析', icon: '📊' },
          { key: 'trends', label: '趨勢圖表', icon: '📈' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Record Symptoms Tab */}
      {activeTab === 'record' && (
        <div className="space-y-6">
          {/* Symptom Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">選擇症狀</h3>
            {Object.entries(groupedSymptoms).map(([category, symptoms]) => (
              <div key={category} className="mb-6">
                <h4 className="text-md font-medium mb-3 text-gray-700">{category}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {symptoms.map(symptom => (
                    <label
                      key={symptom.type}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSymptoms.includes(symptom.type)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSymptoms.includes(symptom.type)}
                        onChange={() => handleSymptomToggle(symptom.type)}
                        className="mr-2"
                      />
                      <span className="text-sm">{symptom.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Severity and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">嚴重程度</label>
              <select
                value={severity}
                onChange={(e) => {
                  setSeverity(e.target.value as SymptomSeverity);
                  // Auto-set severity score based on level
                  switch (e.target.value) {
                    case 'mild': setSeverityScore(3); break;
                    case 'moderate': setSeverityScore(6); break;
                    case 'severe': setSeverityScore(9); break;
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="mild">輕微</option>
                <option value="moderate">中等</option>
                <option value="severe">嚴重</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">嚴重程度評分 (1-10)</label>
              <input
                type="range"
                min="1"
                max="10"
                value={severityScore}
                onChange={(e) => setSeverityScore(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-sm text-gray-600 mt-1">{severityScore}</div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">持續時間（分鐘）</label>
              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Activity Impact */}
          <div>
            <label className="block text-sm font-medium mb-2">對日常活動的影響</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'none', label: '無影響' },
                { value: 'mild', label: '輕微影響' },
                { value: 'moderate', label: '中等影響' },
                { value: 'severe', label: '嚴重影響' }
              ].map(impact => (
                <label
                  key={impact.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer ${
                    activityImpact === impact.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="activity_impact"
                    value={impact.value}
                    checked={activityImpact === impact.value}
                    onChange={(e) => setActivityImpact(e.target.value as any)}
                    className="mr-2"
                  />
                  <span className="text-sm">{impact.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Triggers */}
          <div>
            <label className="block text-sm font-medium mb-2">可能的觸發因子</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                placeholder="輸入觸發因子（如食物、活動等）"
                className="flex-1 p-3 border border-gray-300 rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTrigger()}
              />
              <button
                onClick={handleAddTrigger}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                新增
              </button>
            </div>

            {triggers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {triggers.map((trigger, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {trigger}
                    <button
                      onClick={() => handleRemoveTrigger(trigger)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">附加備註</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="記錄額外的症狀細節、情境或觀察..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSubmitSymptoms}
              disabled={selectedSymptoms.length === 0 || isRecording}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedSymptoms.length > 0 && !isRecording
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isRecording ? '記錄中...' : '記錄症狀'}
            </button>
          </div>
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analysis' && analysis && (
        <div className="space-y-6">
          {/* Summary Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total_entries}</div>
                <div className="text-sm text-gray-600">記錄天數</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.symptom_free_days}</div>
                <div className="text-sm text-gray-600">無症狀天數</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.total_symptoms}</div>
                <div className="text-sm text-gray-600">總症狀次數</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{stats.average_severity.toFixed(1)}</div>
                <div className="text-sm text-gray-600">平均嚴重度</div>
              </div>
            </div>
          )}

          {/* Weekly Trends */}
          <div>
            <h3 className="text-lg font-semibold mb-4">症狀趨勢（最近30天）</h3>
            <div className="space-y-3">
              {analysis.weekly_trends.map((trend, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {symptomTypes.find(s => s.type === trend.symptom_type)?.label || trend.symptom_type}
                      </h4>
                      <div className="text-sm text-gray-600 mt-1">
                        頻率：{(trend.frequency * 100).toFixed(1)}% |
                        平均嚴重度：{trend.average_severity.toFixed(1)}/10
                      </div>
                      {trend.common_triggers.length > 0 && (
                        <div className="text-sm text-gray-600 mt-1">
                          常見觸發：{trend.common_triggers.join(', ')}
                        </div>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getImprovementColor(trend.improvement_trend)}`}>
                      {trend.improvement_trend === 'improving' ? '改善中' :
                       trend.improvement_trend === 'worsening' ? '惡化中' : '穩定'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Food Correlations */}
          {analysis.food_correlations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">食物關聯性</h3>
              <div className="space-y-3">
                {analysis.food_correlations.map((correlation, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{correlation.food_name}</h4>
                        <div className="text-sm text-gray-600 mt-1">
                          關聯症狀：{correlation.symptom_types.map(type =>
                            symptomTypes.find(s => s.type === type)?.label || type
                          ).join(', ')}
                        </div>
                        <div className="text-sm text-gray-600">
                          發作時間：平均 {correlation.time_to_onset} 小時後
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded text-sm font-medium ${
                          correlation.confidence_level === 'high' ? 'bg-red-100 text-red-800' :
                          correlation.confidence_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {correlation.confidence_level === 'high' ? '高度相關' :
                           correlation.confidence_level === 'medium' ? '中度相關' : '低度相關'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {correlation.occurrences} 次
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">個人化建議</h3>
              <div className="bg-blue-50 p-4 rounded-lg">
                <ul className="space-y-2">
                  {analysis.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span className="text-gray-700">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Alert Conditions */}
          {analysis.alert_conditions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">注意事項</h3>
              <div className="space-y-3">
                {analysis.alert_conditions.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                      alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                      alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{alert.message}</div>
                    <div className="text-sm text-gray-600 mt-1">{alert.recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-lg font-semibold mb-2">症狀趨勢圖表</h3>
          <p className="text-gray-600 mb-4">此功能將在後續版本中實現</p>
          <p className="text-sm text-gray-500">
            將包括時間軸圖表、嚴重度變化、症狀頻率分析等視覺化功能
          </p>
        </div>
      )}
    </div>
  );
}