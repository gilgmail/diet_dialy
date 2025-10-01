'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SymptomSelect } from './SymptomSelect';
import { QuickSymptomEntry } from './QuickSymptomEntry';
import { cn, formatMedicalDate } from '@/lib/utils';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type {
  CoreSymptomScores,
  ContextualScores,
  DailySymptomEntry,
  AdditionalSymptom,
  SymptomType,
  BristolStoolType
} from '@/types/medical';

interface DailySymptomTrackerProps {
  onSubmit: (entry: Partial<DailySymptomEntry>) => Promise<void>;
  existingEntry?: DailySymptomEntry | null;
  isLoading?: boolean;
  className?: string;
  recordedDate?: string; // Format: YYYY-MM-DD
}

const DEFAULT_CORE_SCORES: CoreSymptomScores = {
  overall_health: 3,  // 3 = 一般 (Fair)
  abdominal_pain: 1,  // 1 = 無 (None)
  diarrhea: 1,        // 1 = 無 (None)
  bloody_stool: 1,    // 1 = 無 (None)
  bloating: 1         // 1 = 無 (None)
};

const DEFAULT_CONTEXTUAL_SCORES: ContextualScores = {
  mood_score: 3,
  energy_level: 3,
  sleep_quality: 3,
  stress_level: 3
};

const ADDITIONAL_SYMPTOMS: Array<{
  type: SymptomType;
  zh: string;
  en: string;
  icon: string;
}> = [
  { type: 'constipation', zh: '便秘', en: 'Constipation', icon: '😵' },
  { type: 'nausea', zh: '惡心', en: 'Nausea', icon: '🤢' },
  { type: 'vomiting', zh: '嘔吐', en: 'Vomiting', icon: '🤮' },
  { type: 'fatigue', zh: '疲勞', en: 'Fatigue', icon: '😫' },
  { type: 'headache', zh: '頭痛', en: 'Headache', icon: '🤕' },
  { type: 'joint_pain', zh: '關節痛', en: 'Joint Pain', icon: '🦴' },
  { type: 'fever', zh: '發燒', en: 'Fever', icon: '🤒' },
  { type: 'rash', zh: '皮疹', en: 'Rash', icon: '🪧' }
];

const COMMON_MEDICATIONS = [
  { zh: '止痛藥', en: 'Pain Relief' },
  { zh: '止瀉藩', en: 'Anti-diarrheal' },
  { zh: '益生菌', en: 'Probiotics' },
  { zh: '消炎藥', en: 'Anti-inflammatory' },
  { zh: '免疫抑制劑', en: 'Immunosuppressant' }
];

export function DailySymptomTracker({
  onSubmit,
  existingEntry,
  isLoading = false,
  className,
  recordedDate
}: DailySymptomTrackerProps): JSX.Element {
  const { user } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState('quick');
  const [coreScores, setCoreScores] = useState<CoreSymptomScores>(DEFAULT_CORE_SCORES);
  const [contextualScores, setContextualScores] = useState<ContextualScores>(DEFAULT_CONTEXTUAL_SCORES);
  const [bowelMovementCount, setBowelMovementCount] = useState<number>(1);
  const [stoolType, setStoolType] = useState<BristolStoolType>(3); // Default to 3 (正常)
  const [additionalSymptoms, setAdditionalSymptoms] = useState<AdditionalSymptom[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [customMedication, setCustomMedication] = useState('');
  const [notes, setNotes] = useState('');
  const [triggers, setTriggers] = useState('');
  const [improvements, setImprovements] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load existing entry data or reset to defaults when date changes
  useEffect(() => {
    if (existingEntry) {
      // Load existing entry
      setCoreScores({
        overall_health: existingEntry.overall_health,
        abdominal_pain: existingEntry.abdominal_pain,
        diarrhea: existingEntry.diarrhea,
        bloody_stool: existingEntry.bloody_stool,
        bloating: existingEntry.bloating
      });

      setContextualScores({
        mood_score: existingEntry.mood_score,
        energy_level: existingEntry.energy_level,
        sleep_quality: existingEntry.sleep_quality,
        stress_level: existingEntry.stress_level
      });

      setBowelMovementCount(existingEntry.bowel_movement_count || 1);
      setStoolType(existingEntry.stool_type || 3); // Default to 3 (正常) if not recorded
      setAdditionalSymptoms(existingEntry.additional_symptoms || []);
      setMedications(existingEntry.medications_taken || []);
      setNotes(existingEntry.notes || '');
      setTriggers(existingEntry.triggers_identified?.join(', ') || '');
      setImprovements(existingEntry.improvement_factors?.join(', ') || '');
    } else {
      // Reset to defaults when no entry exists for selected date
      setCoreScores(DEFAULT_CORE_SCORES);
      setContextualScores(DEFAULT_CONTEXTUAL_SCORES);
      setBowelMovementCount(1);
      setStoolType(3); // Default to 3 (正常)
      setAdditionalSymptoms([]);
      setMedications([]);
      setNotes('');
      setTriggers('');
      setImprovements('');
    }
  }, [existingEntry]);

  const handleCoreScoreChange = useCallback((symptom: keyof CoreSymptomScores, value: number) => {
    setCoreScores(prev => ({ ...prev, [symptom]: value }));
    if (error) setError('');
  }, [error]);

  const handleContextualScoreChange = useCallback((aspect: keyof ContextualScores, value: number) => {
    setContextualScores(prev => ({ ...prev, [aspect]: value }));
  }, []);

  const handleAdditionalSymptomChange = useCallback((symptomType: SymptomType, severity: number) => {
    setAdditionalSymptoms(prev => {
      const existing = prev.find(s => s.type === symptomType);
      if (severity === 0) {
        // Remove symptom if severity is 0
        return prev.filter(s => s.type !== symptomType);
      }
      
      if (existing) {
        // Update existing symptom
        return prev.map(s => 
          s.type === symptomType 
            ? { ...s, severity: severity as 0 | 1 | 2 | 3 | 4 | 5 }
            : s
        );
      } else {
        // Add new symptom
        return [...prev, {
          type: symptomType,
          severity: severity as 0 | 1 | 2 | 3 | 4 | 5
        }];
      }
    });
  }, []);

  const handleMedicationToggle = useCallback((medication: string) => {
    setMedications(prev => 
      prev.includes(medication)
        ? prev.filter(m => m !== medication)
        : [...prev, medication]
    );
  }, []);

  const handleAddCustomMedication = useCallback(() => {
    if (customMedication.trim() && !medications.includes(customMedication.trim())) {
      setMedications(prev => [...prev, customMedication.trim()]);
      setCustomMedication('');
    }
  }, [customMedication, medications]);

  const handleQuickSubmit = useCallback(async (quickData: Partial<DailySymptomEntry>) => {
    // Add recorded_date if not already present
    const dataWithDate = {
      ...quickData,
      recorded_date: quickData.recorded_date || recordedDate || new Date().toISOString().split('T')[0]
    };
    return handleSubmit(dataWithDate);
  }, [recordedDate]);

  const handleSubmit = useCallback(async (overrideData?: Partial<DailySymptomEntry>) => {
    setIsSubmitting(true);
    setError('');

    try {
      const entryData: Partial<DailySymptomEntry> = overrideData || {
        ...coreScores,
        ...contextualScores,
        additional_symptoms: additionalSymptoms,
        medications_taken: medications,
        notes: notes.trim() || undefined,
        triggers_identified: triggers.split(',').map(t => t.trim()).filter(Boolean),
        improvement_factors: improvements.split(',').map(f => f.trim()).filter(Boolean),
        recorded_date: recordedDate || new Date().toISOString().split('T')[0],
        recorded_at: new Date(),
        entry_source: 'manual',
        data_completeness_score: calculateCompletenessScore(),
        related_food_entries: []
      };

      await onSubmit(entryData);
      setLastSaved(new Date());
      
      // Don't reset form if it's an update to existing entry
      if (!existingEntry && !overrideData) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  }, [coreScores, contextualScores, additionalSymptoms, medications, notes, triggers, improvements, existingEntry, onSubmit, recordedDate]);

  const resetForm = useCallback(() => {
    setCoreScores(DEFAULT_CORE_SCORES);
    setContextualScores(DEFAULT_CONTEXTUAL_SCORES);
    setAdditionalSymptoms([]);
    setMedications([]);
    setCustomMedication('');
    setNotes('');
    setTriggers('');
    setImprovements('');
    setError('');
  }, []);

  const calculateCompletenessScore = useCallback((): number => {
    let completed = 0;
    let total = 0;
    
    // Core symptoms (weight: 0.6)
    total += 5;
    completed += Object.values(coreScores).filter(score => score !== undefined).length;
    
    // Contextual scores (weight: 0.2)
    total += 4;
    completed += Object.values(contextualScores).filter(score => score !== undefined).length;
    
    // Additional data (weight: 0.2)
    total += 2;
    if (notes.trim()) completed += 1;
    if (medications.length > 0 || triggers.trim() || improvements.trim()) completed += 1;
    
    return completed / total;
  }, [coreScores, contextualScores, notes, medications, triggers, improvements]);

  // Format date for display
  const displayDate = recordedDate ? new Date(recordedDate) : new Date();
  const isToday = recordedDate === new Date().toISOString().split('T')[0];
  const dateText = isToday ? '今日' : displayDate.toLocaleDateString('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });

  return (
    <div className={cn('w-full max-w-4xl mx-auto', className)}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📅 {dateText}症狀記錄
        </h1>
        <p className="text-gray-600">
          記錄您的健康狀態和症狀，幫助追蹤和管理您的健康
        </p>
        {lastSaved && (
          <p className="text-sm text-green-600 mt-1">
            ✓ 最後儲存: {formatMedicalDate(lastSaved)}
          </p>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick">
            ⚡ 快速記錄
          </TabsTrigger>
          <TabsTrigger value="detailed">
            📝 詳細記錄
          </TabsTrigger>
        </TabsList>

        {/* Quick Entry Tab */}
        <TabsContent value="quick">
          <QuickSymptomEntry
            onSubmit={handleQuickSubmit}
            initialValues={coreScores}
            initialBowelCount={bowelMovementCount}
            initialStoolType={stoolType}
            isLoading={isLoading || isSubmitting}
          />
        </TabsContent>

        {/* Detailed Entry Tab */}
        <TabsContent value="detailed" className="space-y-6">
          {/* Core Symptoms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎢 核心症狀評分
                <Badge variant="outline" className="text-xs">
                  必填
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(Object.keys(DEFAULT_CORE_SCORES) as Array<keyof CoreSymptomScores>).map((symptom) => (
                <SymptomSelect
                  key={symptom}
                  symptom={symptom}
                  value={coreScores[symptom]}
                  onChange={(value) => handleCoreScoreChange(symptom, value)}
                  disabled={isLoading || isSubmitting}
                />
              ))}
            </CardContent>
          </Card>

          {/* Contextual Factors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🌈 生活品質評分
                <Badge variant="secondary" className="text-xs">
                  可選
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mood */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  😊 心情狀態 (Mood)
                </Label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={contextualScores.mood_score || 3}
                  onChange={(e) => handleContextualScoreChange('mood_score', parseInt(e.target.value))}
                  className="w-full"
                  disabled={isLoading || isSubmitting}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>很差 (1)</span>
                  <span>一般 (3)</span>
                  <span>很好 (5)</span>
                </div>
              </div>

              {/* Energy Level */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  ⚡ 精力水平 (Energy Level)
                </Label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={contextualScores.energy_level || 3}
                  onChange={(e) => handleContextualScoreChange('energy_level', parseInt(e.target.value))}
                  className="w-full"
                  disabled={isLoading || isSubmitting}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>很低 (1)</span>
                  <span>一般 (3)</span>
                  <span>很高 (5)</span>
                </div>
              </div>

              {/* Sleep Quality */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  😴 睡眠品質 (Sleep Quality)
                </Label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={contextualScores.sleep_quality || 3}
                  onChange={(e) => handleContextualScoreChange('sleep_quality', parseInt(e.target.value))}
                  className="w-full"
                  disabled={isLoading || isSubmitting}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>很差 (1)</span>
                  <span>一般 (3)</span>
                  <span>很好 (5)</span>
                </div>
              </div>

              {/* Stress Level */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  😩 壓力水平 (Stress Level)
                </Label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={contextualScores.stress_level || 3}
                  onChange={(e) => handleContextualScoreChange('stress_level', parseInt(e.target.value))}
                  className="w-full"
                  disabled={isLoading || isSubmitting}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>很低 (1)</span>
                  <span>一般 (3)</span>
                  <span>很高 (5)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Symptoms */}
          <Card>
            <CardHeader>
              <CardTitle>🔍 其他症狀</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {ADDITIONAL_SYMPTOMS.map((symptom) => {
                  const currentSeverity = additionalSymptoms.find(s => s.type === symptom.type)?.severity || 0;
                  return (
                    <div key={symptom.type} className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs">
                        <span role="img" aria-hidden="true">{symptom.icon}</span>
                        {symptom.zh}
                      </Label>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        value={currentSeverity}
                        onChange={(e) => handleAdditionalSymptomChange(symptom.type, parseInt(e.target.value))}
                        className="w-full h-1"
                        disabled={isLoading || isSubmitting}
                      />
                      <div className="text-xs text-center text-gray-500">
                        {currentSeverity}/5
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Medications & Treatments */}
          <Card>
            <CardHeader>
              <CardTitle>💊 藥物與治療</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {COMMON_MEDICATIONS.map((med) => (
                  <div key={med.zh} className="flex items-center space-x-2">
                    <Checkbox
                      id={`med-${med.zh}`}
                      checked={medications.includes(med.zh)}
                      onCheckedChange={() => handleMedicationToggle(med.zh)}
                      disabled={isLoading || isSubmitting}
                    />
                    <Label htmlFor={`med-${med.zh}`} className="text-sm">
                      {med.zh}
                    </Label>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customMedication}
                  onChange={(e) => setCustomMedication(e.target.value)}
                  placeholder="其他藥物..."
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                  disabled={isLoading || isSubmitting}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomMedication()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomMedication}
                  disabled={!customMedication.trim() || isLoading || isSubmitting}
                >
                  新增
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Observations */}
          <Card>
            <CardHeader>
              <CardTitle>📝 詳細記錄與觀察</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="detailed-notes">症狀詳細描述</Label>
                <Textarea
                  id="detailed-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="描述今天的症狀、感受或任何特殊狀況..."
                  rows={3}
                  disabled={isLoading || isSubmitting}
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="triggers">可能的觸發因素</Label>
                  <Textarea
                    id="triggers"
                    value={triggers}
                    onChange={(e) => setTriggers(e.target.value)}
                    placeholder="例如：某種食物、壓力、睡眠不足..."
                    rows={2}
                    disabled={isLoading || isSubmitting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="improvements">改善因素</Label>
                  <Textarea
                    id="improvements"
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                    placeholder="例如：休息、藥物、特定食物..."
                    rows={2}
                    disabled={isLoading || isSubmitting}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Completeness Indicator */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                資料完整度
              </span>
              <span className="text-sm text-gray-600">
                {Math.round(calculateCompletenessScore() * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-medical-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${calculateCompletenessScore() * 100}%` }}
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isLoading || isSubmitting}
              loading={isSubmitting}
              loadingText="儲存中..."
              variant="medical"
              size="lg"
              className="flex-1"
            >
              {existingEntry ? '更新記錄' : '儲存記錄'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isLoading || isSubmitting}
              onClick={resetForm}
              className="px-8"
            >
              重設
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}