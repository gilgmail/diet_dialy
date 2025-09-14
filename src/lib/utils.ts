import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import type { SymptomSeverity, MedicalCondition } from '@/types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Date formatting utilities for medical tracking
export function formatMedicalDate(date: Date): string {
  if (isToday(date)) {
    return `Today, ${format(date, 'HH:mm')}`;
  }

  if (isYesterday(date)) {
    return `Yesterday, ${format(date, 'HH:mm')}`;
  }

  const daysDiff = differenceInDays(new Date(), date);
  if (daysDiff <= 7) {
    return format(date, 'EEEE, HH:mm'); // Day of week
  }

  return format(date, 'MMM dd, HH:mm');
}

export function formatDateOnly(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatTimeOnly(date: Date): string {
  return format(date, 'HH:mm');
}

// Symptom severity utilities
export function getSymptomSeverityColor(severity: SymptomSeverity): string {
  switch (severity) {
    case 'mild':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'moderate':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'severe':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getSymptomSeverityScore(severity: SymptomSeverity): number {
  switch (severity) {
    case 'mild':
      return 1;
    case 'moderate':
      return 2;
    case 'severe':
      return 3;
    default:
      return 0;
  }
}

// Medical condition utilities
export function getMedicalConditionColor(condition: MedicalCondition): string {
  switch (condition) {
    case 'ibd':
    case 'crohns':
    case 'uc':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'chemotherapy':
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'allergy':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'ibs':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'celiac':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  // Basic phone validation - can be enhanced based on region
  const phoneRegex = /^\+?[\d\s\-\(\)]{8,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function isStrongPassword(password: string): {
  isStrong: boolean;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
} {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const isStrong = Object.values(requirements).every(Boolean);

  return { isStrong, requirements };
}

// Data formatting utilities
export function formatNutrientValue(value: number | undefined, unit: string): string {
  if (value === undefined || value === 0) return '—';

  if (value < 1) {
    return `${(value * 1000).toFixed(0)}m${unit}`;
  }

  return `${value.toFixed(1)}${unit}`;
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Error handling utilities
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

// Storage utilities
export function safeJSONParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function safeJSONStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

// Accessibility utilities
export function generateId(prefix = 'element'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatForScreenReader(text: string): string {
  return text
    .replace(/&/g, ' and ')
    .replace(/\//g, ' slash ')
    .replace(/@/g, ' at ')
    .replace(/#/g, ' hash ')
    .replace(/\$/g, ' dollar ')
    .replace(/%/g, ' percent ');
}

// Performance utilities
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Medical data analysis utilities
export function calculateSymptomTrend(
  symptoms: Array<{ severity: SymptomSeverity; timestamp: Date }>
): 'improving' | 'stable' | 'worsening' {
  if (symptoms.length < 2) return 'stable';

  const recent = symptoms.slice(-7); // Last 7 entries
  const older = symptoms.slice(-14, -7); // Previous 7 entries

  if (older.length === 0) return 'stable';

  const recentAvg = recent.reduce((acc, s) => acc + getSymptomSeverityScore(s.severity), 0) / recent.length;
  const olderAvg = older.reduce((acc, s) => acc + getSymptomSeverityScore(s.severity), 0) / older.length;

  const difference = recentAvg - olderAvg;

  if (difference < -0.2) return 'improving';
  if (difference > 0.2) return 'worsening';
  return 'stable';
}