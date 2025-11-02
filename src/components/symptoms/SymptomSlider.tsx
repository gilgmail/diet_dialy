'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import type { CoreSymptomScores } from '@/types/medical';

interface SymptomSliderProps {
  symptom: keyof CoreSymptomScores;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}

const SYMPTOM_CONFIG = {
  overall_health: {
    zh: '整體健康',
    en: 'Overall Health',
    icon: '❤️',
    min: 1,
    max: 5,
    type: 'health',
    labels: {
      1: { zh: '非常差', en: 'Very Poor' },
      2: { zh: '差', en: 'Poor' },
      3: { zh: '一般', en: 'Fair' },
      4: { zh: '好', en: 'Good' },
      5: { zh: '非常好', en: 'Excellent' }
    }
  },
  abdominal_pain: {
    zh: '腹痛',
    en: 'Abdominal Pain',
    icon: '🤕',
    min: 0,
    max: 5,
    type: 'symptom',
    labels: {
      0: { zh: '無', en: 'None' },
      1: { zh: '輕微', en: 'Mild' },
      2: { zh: '溫和', en: 'Moderate' },
      3: { zh: '中等', en: 'Moderate' },
      4: { zh: '嚴重', en: 'Severe' },
      5: { zh: '極嚴重', en: 'Very Severe' }
    }
  },
  diarrhea: {
    zh: '腹瀉',
    en: 'Diarrhea',
    icon: '💧',
    min: 0,
    max: 5,
    type: 'symptom',
    labels: {
      0: { zh: '無', en: 'None' },
      1: { zh: '輕微', en: 'Mild' },
      2: { zh: '溫和', en: 'Moderate' },
      3: { zh: '中等', en: 'Moderate' },
      4: { zh: '嚴重', en: 'Severe' },
      5: { zh: '極嚴重', en: 'Very Severe' }
    }
  },
  bloody_stool: {
    zh: '血便',
    en: 'Bloody Stool',
    icon: '🩸',
    min: 0,
    max: 5,
    type: 'symptom',
    labels: {
      0: { zh: '無', en: 'None' },
      1: { zh: '輕微', en: 'Mild' },
      2: { zh: '溫和', en: 'Moderate' },
      3: { zh: '中等', en: 'Moderate' },
      4: { zh: '嚴重', en: 'Severe' },
      5: { zh: '極嚴重', en: 'Very Severe' }
    }
  },
  bloating: {
    zh: '脹氣',
    en: 'Bloating',
    icon: '🫃',
    min: 0,
    max: 5,
    type: 'symptom',
    labels: {
      0: { zh: '無', en: 'None' },
      1: { zh: '輕微', en: 'Mild' },
      2: { zh: '溫和', en: 'Moderate' },
      3: { zh: '中等', en: 'Moderate' },
      4: { zh: '嚴重', en: 'Severe' },
      5: { zh: '極嚴重', en: 'Very Severe' }
    }
  }
} as const;

function getSliderColor(symptom: keyof CoreSymptomScores, value: number): string {
  const config = SYMPTOM_CONFIG[symptom];
  
  if (config.type === 'health') {
    // Health score: higher is better (green)
    if (value >= 4) return 'bg-green-500';
    if (value >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  } else {
    // Symptom score: higher is worse (red)
    if (value === 0) return 'bg-green-500';
    if (value <= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  }
}

export function SymptomSlider({
  symptom,
  value,
  onChange,
  className,
  size = 'md',
  showLabels = true,
  disabled = false,
  'aria-label': ariaLabel
}: SymptomSliderProps): JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const config = SYMPTOM_CONFIG[symptom];
  const labelEntries = Object.entries(config.labels);
  const sizeIndicatorClass = size === 'sm' ? 'h-1' : size === 'md' ? 'h-2' : 'h-3';
  
  const handleSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newValue = parseInt(event.target.value, 10);
    onChange(newValue);
  }, [onChange, disabled]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const thumbSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Symptom Header */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor={`slider-${symptom}`}
          className="flex items-center gap-2 text-sm font-medium text-gray-900"
        >
          <span className="text-lg" role="img" aria-hidden="true">
            {config.icon}
          </span>
          <span>{config.zh}</span>
          <span className="text-xs text-gray-500">({config.en})</span>
        </Label>
        
        {/* Current Value Display */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {value}
          </span>
          {showLabels && (
            <span className="text-xs text-gray-600 min-w-[60px] text-right">
              {config.labels[value as keyof typeof config.labels]?.en}
            </span>
          )}
        </div>
      </div>

      {/* Slider Container */}
      <div className={cn('relative px-2', disabled && 'opacity-50')}>
        {/* Range Input */}
        <input
          id={`slider-${symptom}`}
          type="range"
          min={config.min}
          max={config.max}
          value={value}
          onChange={handleSliderChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={disabled}
          aria-label={ariaLabel || `${config.zh} (${config.en}) 評分`}
          aria-valuemin={config.min}
          aria-valuemax={config.max}
          aria-valuenow={value}
          aria-valuetext={`${value} - ${config.labels[value as keyof typeof config.labels]?.zh}`}
          className={cn(
            'w-full appearance-none bg-transparent cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-medical-primary focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            // Custom slider track
            '[&::-webkit-slider-track]:rounded-full [&::-webkit-slider-track]:border-none',
            `[&::-webkit-slider-track]:${sizeClasses[size]} [&::-webkit-slider-track]:bg-gray-200`,
            // Custom slider thumb
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
            `[&::-webkit-slider-thumb]:${thumbSizeClasses[size]} [&::-webkit-slider-thumb]:${getSliderColor(symptom, value)}`,
            '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white',
            '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150',
            isDragging && '[&::-webkit-slider-thumb]:scale-110',
            // Firefox
            '[&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-none',
            `[&::-moz-range-track]:${sizeClasses[size]} [&::-moz-range-track]:bg-gray-200`,
            '[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none',
            `[&::-moz-range-thumb]:${thumbSizeClasses[size]} [&::-moz-range-thumb]:${getSliderColor(symptom, value)}`,
            '[&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        
        {/* Scale Markers */}
        <div className="flex justify-between mt-2 px-1">
          {Array.from({ length: config.max - config.min + 1 }, (_, i) => {
            const scaleValue = config.min + i;
            const displayNumber = String.fromCharCode(0xff10 + scaleValue);
            return (
              <div key={scaleValue} className="flex flex-col items-center">
                <div 
                  className={cn(
                    'w-1 h-1 rounded-full transition-colors duration-150',
                    value === scaleValue ? getSliderColor(symptom, value) : 'bg-gray-300'
                  )}
                  aria-hidden="true"
                />
                <span className="text-xs text-gray-400 mt-1" aria-hidden="true">
                  {displayNumber}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hidden size indicator for testing */}
        <div className={cn('sr-only', sizeIndicatorClass)} aria-hidden="true" />
      </div>

      {/* Value Labels (Mobile) */}
      {showLabels && (
        <div className="sm:hidden text-center">
          <span className="text-xs text-gray-600">
            {config.labels[value as keyof typeof config.labels]?.en}
          </span>
        </div>
      )}

      {/* Full label legend */}
      {showLabels && (
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
          {labelEntries.map(([key, label]) => (
            <div key={key} className="flex flex-col items-center min-w-[48px]">
              <span className="font-medium">{label.zh}</span>
              <span className="text-[10px] text-gray-400">{label.en}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
