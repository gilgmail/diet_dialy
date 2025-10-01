'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SymptomSelect } from './SymptomSelect';
import { cn } from '@/lib/utils';
import type { CoreSymptomScores, DailySymptomEntry, BristolStoolType } from '@/types/medical';

interface QuickSymptomEntryProps {
  onSubmit: (scores: Partial<DailySymptomEntry>) => Promise<void>;
  initialValues?: Partial<CoreSymptomScores>;
  initialBowelCount?: number;
  initialStoolType?: BristolStoolType;
  isLoading?: boolean;
  className?: string;
}

const DEFAULT_SCORES: CoreSymptomScores = {
  overall_health: 3,  // 3 = 一般 (Fair)
  abdominal_pain: 1,  // 1 = 無 (None)
  diarrhea: 1,        // 1 = 無 (None)
  bloody_stool: 1,    // 1 = 無 (None)
  bloating: 1         // 1 = 無 (None)
};

export function QuickSymptomEntry({
  onSubmit,
  initialValues,
  initialBowelCount,
  initialStoolType,
  isLoading = false,
  className
}: QuickSymptomEntryProps): JSX.Element {
  const [scores, setScores] = useState<CoreSymptomScores>({
    ...DEFAULT_SCORES,
    ...initialValues
  });
  const [bowelMovementCount, setBowelMovementCount] = useState<number>(initialBowelCount || 1); // Default to 1
  const [stoolType, setStoolType] = useState<BristolStoolType>(initialStoolType || 3); // Default to 3 (正常)
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update scores, bowel count, and stool type when initialValues change (e.g., when switching dates)
  useEffect(() => {
    setScores({
      ...DEFAULT_SCORES,
      ...initialValues
    });
    setBowelMovementCount(initialBowelCount || 1);
    setStoolType(initialStoolType || 3); // Default to 3 (正常) if not provided
  }, [initialValues, initialBowelCount, initialStoolType]);

  const handleScoreChange = useCallback((symptom: keyof CoreSymptomScores, value: number) => {
    setScores(prev => ({
      ...prev,
      [symptom]: value
    }));
    // Clear error when user makes changes
    if (error) setError('');
  }, [error]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    setIsSubmitting(true);
    setError('');

    try {
      const entryData: Partial<DailySymptomEntry> = {
        ...scores,
        bowel_movement_count: bowelMovementCount,
        stool_type: stoolType,
        notes: notes.trim() || undefined,
        // recorded_date will be set by parent component based on selected date
        recorded_at: new Date(),
        entry_source: 'manual',
        data_completeness_score: 1.0, // Full core symptoms completed
        triggers_identified: [],
        improvement_factors: [],
        medications_taken: [],
        additional_symptoms: [],
        related_food_entries: []
      };

      await onSubmit(entryData);

      // Reset form after successful submission
      setScores(DEFAULT_SCORES);
      setBowelMovementCount(1); // Reset to default 1
      setStoolType(3); // Reset to default 3 (正常)
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失敗，請重試');
    } finally {
      setIsSubmitting(false);
    }
  }, [scores, notes, onSubmit]);

  // Calculate overall symptom burden for visual feedback
  const symptomBurden = (scores.abdominal_pain + scores.diarrhea + scores.bloody_stool + scores.bloating) / 4;
  
  const getBurdenColor = (burden: number): string => {
    if (burden === 0) return 'text-green-600';
    if (burden <= 1.5) return 'text-yellow-600';
    if (burden <= 3) return 'text-orange-600';
    return 'text-red-600';
  };

  const getBurdenText = (burden: number): string => {
    if (burden === 0) return '無症狀';
    if (burden <= 1.5) return '輕微症狀';
    if (burden <= 3) return '中等症狀';
    return '嚴重症狀';
  };

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="text-xl" role="img" aria-hidden="true">⚡</span>
          快速症狀記錄
          <span className="text-sm font-normal text-gray-600">Quick Symptom Entry</span>
        </CardTitle>
        
        {/* Symptom Burden Indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">當前症狀狀態:</span>
          <span className={cn('font-medium', getBurdenColor(symptomBurden))}>
            {getBurdenText(symptomBurden)}
          </span>
          <span className="text-gray-400">(平均: {symptomBurden.toFixed(1)}/5)</span>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Core Symptom Selects */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 border-b pb-2">
              核心症狀評分 (Core Symptoms)
            </h3>

            {(Object.keys(DEFAULT_SCORES) as Array<keyof CoreSymptomScores>).map((symptom) => (
              <SymptomSelect
                key={symptom}
                symptom={symptom}
                value={scores[symptom]}
                onChange={(value) => handleScoreChange(symptom, value)}
                disabled={isLoading || isSubmitting}
              />
            ))}
          </div>

          {/* Bowel Movement Count */}
          <div className="space-y-2">
            <Label htmlFor="bowel-movement-count" className="text-sm font-medium text-gray-900">
              💩 大便次數總計 (Bowel Movement Count)
            </Label>
            <input
              id="bowel-movement-count"
              type="number"
              min="0"
              max="50"
              value={bowelMovementCount}
              onChange={(e) => setBowelMovementCount(e.target.value ? parseInt(e.target.value, 10) : 1)}
              placeholder="今日大便次數（0-50）"
              disabled={isLoading || isSubmitting}
              className="w-full px-4 py-2 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              aria-describedby="bowel-movement-help"
            />
            <p id="bowel-movement-help" className="text-xs text-gray-500">
              記錄今日大便次數，有助於追蹤消化系統狀況
            </p>
          </div>

          {/* Stool Type (1-5 Scale) */}
          <div className="space-y-2">
            <Label htmlFor="stool-type" className="text-sm font-medium text-gray-900">
              🧻 大便形態 (Stool Type)
            </Label>
            <select
              id="stool-type"
              value={stoolType}
              onChange={(e) => setStoolType(parseInt(e.target.value) as BristolStoolType)}
              disabled={isLoading || isSubmitting}
              className="w-full px-4 py-2 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              aria-describedby="stool-type-help"
            >
              <option value="1">1 - 非常硬（便秘）</option>
              <option value="2">2 - 偏硬</option>
              <option value="3">3 - 正常</option>
              <option value="4">4 - 偏軟</option>
              <option value="5">5 - 水狀（腹瀉）</option>
            </select>
            <p id="stool-type-help" className="text-xs text-gray-500">
              大便形態：1=非常硬/便秘，3=正常，5=水狀/腹瀉
            </p>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="symptom-notes" className="text-sm font-medium text-gray-900">
              額外註記 (Additional Notes)
              <span className="text-gray-500 font-normal"> - 可選</span>
            </Label>
            <Textarea
              id="symptom-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="記錄任何額外的症狀、觸發因素或感受..."
              rows={3}
              maxLength={500}
              disabled={isLoading || isSubmitting}
              className="resize-none"
              aria-describedby="notes-help"
            />
            <p id="notes-help" className="text-xs text-gray-500">
              最多 500 字元 • 可描述觸發因素、症狀的時間或其他相關資訊
            </p>
          </div>

          {/* Quick Entry Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              📝 記錄小資訊
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 為達到最佳追蹤效果，建議每日同一時間記錄</li>
              <li>• 健康評分：1=非常差、3=一般、5=非常好</li>
              <li>• 症狀評分：0=無症狀、3=中等、5=極嚴重</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading || isSubmitting}
              loading={isSubmitting}
              loadingText="提交中..."
              variant="medical"
              size="lg"
              className="flex-1"
            >
              {isSubmitting ? 
                '提交中...' : 
                '儲存症狀記錄'
              }
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isLoading || isSubmitting}
              onClick={() => {
                setScores(DEFAULT_SCORES);
                setBowelMovementCount(1);
                setStoolType(3);
                setNotes('');
                setError('');
              }}
              className="px-6"
            >
              重設
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}