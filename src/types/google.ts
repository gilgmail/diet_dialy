// Google integration types for medical data storage
import type { MedicalCondition } from './medical';

export interface GoogleConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

// Removed Google Sheets and Drive specific interfaces
// Keeping only OAuth-related types for user authentication

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  syncInProgress: boolean;
  error?: string;
}

export interface OfflineQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  resource: 'food_entry' | 'symptom' | 'medication' | 'photo';
  data: any;
  timestamp: Date;
  retryCount: number;
}

export interface GoogleAuthState {
  isAuthenticated: boolean;
  user: GoogleUserInfo | null;
  tokens: GoogleTokens | null;
  error: string | null;
  isLoading: boolean;
}