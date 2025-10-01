'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import type { CoreSymptomScores } from '@/types/medical';

interface SymptomSelectProps {
  symptom: keyof CoreSymptomScores;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

const SYMPTOM_CONFIG = {
  overall_health: {
    zh: '整體健康',
    en: 'Overall Health',
    icon: '❤️',
    min: 0,
    max: 5,
    type: 'health' as const,
    labels: {
      0: { zh: '未填', en: 'Not Filled', color: 'text-gray-400' },
      1: { zh: '非常差', en: 'Very Poor', color: 'text-red-600' },
      2: { zh: '差', en: 'Poor', color: 'text-orange-600' },
      3: { zh: '一般', en: 'Fair', color: 'text-yellow-600' },
      4: { zh: '好', en: 'Good', color: 'text-green-600' },
      5: { zh: '非常好', en: 'Excellent', color: 'text-green-700' }
    }
  },
  abdominal_pain: {
    zh: '腹痛',
    en: 'Abdominal Pain',
    icon: '🤕',
    min: 0,
    max: 5,
    type: 'symptom' as const,
    labels: {
      0: { zh: '未填', en: 'Not Filled', color: 'text-gray-400' },
      1: { zh: '無', en: 'None', color: 'text-green-600' },
      2: { zh: '輕微', en: 'Mild', color: 'text-yellow-600' },
      3: { zh: '溫和', en: 'Moderate', color: 'text-orange-600' },
      4: { zh: '嚴重', en: 'Severe', color: 'text-red-600' },
      5: { zh: '極嚴重', en: 'Very Severe', color: 'text-red-700' }
    }
  },
  diarrhea: {
    zh: '腹瀉',
    en: 'Diarrhea',
    icon: '💧',
    min: 0,
    max: 5,
    type: 'symptom' as const,
    labels: {
      0: { zh: '未填', en: 'Not Filled', color: 'text-gray-400' },
      1: { zh: '無', en: 'None', color: 'text-green-600' },
      2: { zh: '輕微', en: 'Mild', color: 'text-yellow-600' },
      3: { zh: '溫和', en: 'Moderate', color: 'text-orange-600' },
      4: { zh: '嚴重', en: 'Severe', color: 'text-red-600' },
      5: { zh: '極嚴重', en: 'Very Severe', color: 'text-red-700' }
    }
  },
  bloody_stool: {
    zh: '血便',
    en: 'Bloody Stool',
    icon: '🩸',
    min: 0,
    max: 5,
    type: 'symptom' as const,
    labels: {
      0: { zh: '未填', en: 'Not Filled', color: 'text-gray-400' },
      1: { zh: '無', en: 'None', color: 'text-green-600' },
      2: { zh: '輕微', en: 'Mild', color: 'text-yellow-600' },
      3: { zh: '溫和', en: 'Moderate', color: 'text-orange-600' },
      4: { zh: '嚴重', en: 'Severe', color: 'text-red-600' },
      5: { zh: '極嚴重', en: 'Very Severe', color: 'text-red-700' }
    }
  },
  bloating: {
    zh: '脹氣',
    en: 'Bloating',
    icon: '🫃',
    min: 0,
    max: 5,
    type: 'symptom' as const,
    labels: {
      0: { zh: '未填', en: 'Not Filled', color: 'text-gray-400' },
      1: { zh: '無', en: 'None', color: 'text-green-600' },
      2: { zh: '輕微', en: 'Mild', color: 'text-yellow-600' },
      3: { zh: '溫和', en: 'Moderate', color: 'text-orange-600' },
      4: { zh: '嚴重', en: 'Severe', color: 'text-red-600' },
      5: { zh: '極嚴重', en: 'Very Severe', color: 'text-red-700' }
    }
  }
} as const;

function getSelectColor(symptom: keyof CoreSymptomScores, value: number): string {
  const config = SYMPTOM_CONFIG[symptom];

  // 0 = not filled (gray)
  if (value === 0) return 'border-gray-300 bg-gray-50';

  if (config.type === 'health') {
    // Health: 1=very poor, 5=excellent
    if (value >= 4) return 'border-green-500 bg-green-50';
    if (value >= 3) return 'border-yellow-500 bg-yellow-50';
    return 'border-red-500 bg-red-50';
  } else {
    // Symptom: 1=none, 5=very severe
    if (value === 1) return 'border-green-500 bg-green-50';
    if (value <= 3) return 'border-yellow-500 bg-yellow-50';
    return 'border-red-500 bg-red-50';
  }
}

export function SymptomSelect({
  symptom,
  value,
  onChange,
  className,
  disabled = false,
  'aria-label': ariaLabel
}: SymptomSelectProps): JSX.Element {
  const config = SYMPTOM_CONFIG[symptom];

  const handleSelectChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = parseInt(event.target.value, 10);
    onChange(newValue);
  }, [onChange]);

  // Generate options array
  const options = Array.from(
    { length: config.max - config.min + 1 },
    (_, i) => config.min + i
  );

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <Label
        htmlFor={`select-${symptom}`}
        className="flex items-center gap-2 text-sm font-medium text-gray-900"
      >
        <span className="text-xl" role="img" aria-hidden="true">
          {config.icon}
        </span>
        <span>{config.zh}</span>
        <span className="text-xs text-gray-500">({config.en})</span>
      </Label>

      {/* Select Dropdown */}
      <div className="relative">
        <select
          id={`select-${symptom}`}
          value={value}
          onChange={handleSelectChange}
          disabled={disabled}
          aria-label={ariaLabel || `${config.zh} (${config.en}) 評分`}
          className={cn(
            'w-full px-4 py-3 text-base font-medium rounded-lg border-2 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-medical-primary focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'appearance-none cursor-pointer',
            getSelectColor(symptom, value),
            config.labels[value as keyof typeof config.labels]?.color
          )}
        >
          {options.map((optionValue) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionValue} - {config.labels[optionValue as keyof typeof config.labels]?.zh} ({config.labels[optionValue as keyof typeof config.labels]?.en})
            </option>
          ))}
        </select>

        {/* Custom Dropdown Arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Visual Indicator */}
      <div className="flex items-center justify-between text-xs text-gray-600 px-1">
        <span>
          評分：<span className="font-semibold">{value}</span>
        </span>
        <span className={cn(
          'font-medium',
          config.labels[value as keyof typeof config.labels]?.color
        )}>
          {config.labels[value as keyof typeof config.labels]?.zh}
        </span>
      </div>
    </div>
  );
}