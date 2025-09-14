// Central type exports for Diet Daily medical application

export * from './medical';
export * from './nutrition';
export * from './user';

// Common utility types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// Local storage keys
export const LOCAL_STORAGE_KEYS = {
  USER_PREFERENCES: 'diet_daily_user_preferences',
  OFFLINE_DATA: 'diet_daily_offline_data',
  LAST_SYNC: 'diet_daily_last_sync',
  TEMP_FORM_DATA: 'diet_daily_temp_form',
  ACCESSIBILITY_SETTINGS: 'diet_daily_accessibility',
} as const;

// Application constants
export const APP_CONFIG = {
  APP_NAME: 'Diet Daily',
  APP_VERSION: '1.0.0',
  API_VERSION: 'v1',
  MAX_FOOD_ENTRIES_PER_DAY: 50,
  MAX_SYMPTOM_ENTRIES_PER_DAY: 20,
  SYNC_INTERVAL_MINUTES: 15,
  OFFLINE_STORAGE_DAYS: 30,
  MAX_PHOTO_SIZE_MB: 10,
  SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
  PASSWORD_MIN_LENGTH: 8,
  SESSION_TIMEOUT_MINUTES: 30,
  DATA_RETENTION_YEARS: 7,
} as const;

// Medical condition mappings for internationalization
export const CONDITION_LABELS = {
  ibd: {
    en: 'Inflammatory Bowel Disease',
    'zh-TW': '發炎性腸道疾病',
    'zh-HK': '發炎性腸道疾病'
  },
  chemotherapy: {
    en: 'Chemotherapy Treatment',
    'zh-TW': '化學治療',
    'zh-HK': '化學治療'
  },
  allergy: {
    en: 'Food Allergies',
    'zh-TW': '食物過敏',
    'zh-HK': '食物過敏'
  },
  ibs: {
    en: 'Irritable Bowel Syndrome',
    'zh-TW': '腸躁症',
    'zh-HK': '腸躁症'
  },
  crohns: {
    en: "Crohn's Disease",
    'zh-TW': '克隆氏症',
    'zh-HK': '克隆氏症'
  },
  uc: {
    en: 'Ulcerative Colitis',
    'zh-TW': '潰瘍性結腸炎',
    'zh-HK': '潰瘍性結腸炎'
  },
  celiac: {
    en: 'Celiac Disease',
    'zh-TW': '乳糜瀉',
    'zh-HK': '乳糜瀉'
  },
  other: {
    en: 'Other Condition',
    'zh-TW': '其他疾病',
    'zh-HK': '其他疾病'
  }
} as const;