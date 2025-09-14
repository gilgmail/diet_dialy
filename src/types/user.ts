// User and authentication types for medical application

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phone?: string;
  language: 'en' | 'zh-TW' | 'zh-HK'; // English, Traditional Chinese (Taiwan), Traditional Chinese (Hong Kong)
  timezone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  accessibility: AccessibilitySettings;
  dataExport: DataExportSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  medicationReminders: boolean;
  symptomTracking: boolean;
  mealReminders: boolean;
  weeklyReports: boolean;
  appointmentReminders: boolean;
  dataBackupReminders: boolean;
  emergencyAlerts: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface PrivacySettings {
  shareDataWithProvider: boolean;
  shareDataForResearch: boolean;
  allowAnalytics: boolean;
  dataRetentionPeriod: number; // days
  requireBiometric: boolean;
  requirePinForAccess: boolean;
  autoLockTimeout: number; // minutes
}

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  voiceInput: boolean;
  hapticFeedback: boolean;
  colorBlindnessMode?: 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export interface DataExportSettings {
  includeSymptoms: boolean;
  includeFoodEntries: boolean;
  includeMedications: boolean;
  includeAnalytics: boolean;
  format: 'json' | 'csv' | 'pdf';
  encryptExport: boolean;
}

export interface UserSession {
  id: string;
  userId: string;
  deviceId: string;
  deviceName?: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: ActivityAction;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'profile_update'
  | 'password_change'
  | 'food_entry_create'
  | 'food_entry_update'
  | 'food_entry_delete'
  | 'symptom_log_create'
  | 'symptom_log_update'
  | 'medication_update'
  | 'report_generate'
  | 'data_export'
  | 'settings_update'
  | 'emergency_contact_used';