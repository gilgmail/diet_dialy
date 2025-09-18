// Client-side Google OAuth authentication
'use client';

import { useState, useEffect } from 'react';
import type { GoogleTokens, GoogleUserInfo, GoogleAuthState } from '@/types/google';
import { GOOGLE_CONFIG, SECURITY_CONFIG } from './config';
import { encryptData, decryptData } from './encryption';

class GoogleAuthClientService {
  private tokens: GoogleTokens | null = null;
  private userInfo: GoogleUserInfo | null = null;

  constructor() {
    // Load tokens from secure storage on initialization
    if (typeof window !== 'undefined') {
      this.loadTokensFromStorage();
    }
  }

  /**
   * Initialize Google OAuth flow
   * Returns authorization URL for user to complete authentication
   */
  async initializeAuth(): Promise<string> {
    const state = this.generateSecureState();
    const params = new URLSearchParams({
      client_id: GOOGLE_CONFIG.clientId,
      redirect_uri: GOOGLE_CONFIG.redirectUri,
      scope: GOOGLE_CONFIG.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: state
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Complete OAuth flow with authorization code
   * This would normally be done server-side, but for demo purposes we'll simulate it
   */
  async completeAuth(code: string, state: string): Promise<GoogleAuthState> {
    try {
      if (!this.validateState(state)) {
        throw new Error('Invalid state parameter - potential CSRF attack');
      }

      // In a real application, this token exchange should be done server-side
      // For demo purposes, we'll simulate a successful authentication
      const response = await fetch('/api/auth/google/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        throw new Error('Failed to exchange authorization code for tokens');
      }

      const data = await response.json();
      this.tokens = data.tokens;

      // Get user information
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.tokens.access_token}`
        }
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user information');
      }

      this.userInfo = await userInfoResponse.json() as GoogleUserInfo;

      // Securely store tokens
      await this.saveTokensToStorage();

      return {
        isAuthenticated: true,
        user: this.userInfo,
        tokens: this.tokens,
        error: null,
        isLoading: false
      };
    } catch (error) {
      console.error('Google authentication error:', error);
      return {
        isAuthenticated: false,
        user: null,
        tokens: null,
        error: error instanceof Error ? error.message : 'Authentication failed',
        isLoading: false
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.tokens?.refresh_token) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/auth/google/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: this.tokens.refresh_token })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }

      const data = await response.json();

      // Update tokens while preserving refresh token
      this.tokens = {
        ...this.tokens,
        access_token: data.access_token,
        expires_in: data.expires_in || this.tokens.expires_in
      };

      await this.saveTokensToStorage();
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.signOut();
      return false;
    }
  }

  /**
   * Check if current tokens are valid and not expired
   */
  isAuthenticated(): boolean {
    console.log('🔍 檢查認證狀態:', {
      hasTokens: !!this.tokens?.access_token,
      hasUserInfo: !!this.userInfo,
      userEmail: this.userInfo?.email
    });

    if (!this.tokens?.access_token || !this.userInfo) {
      console.log('❌ 認證失敗: 缺少 token 或用戶資訊');
      return false;
    }

    // Check if token is close to expiry
    const tokenExpiryTime = this.getTokenExpiryTime();
    const now = Date.now();
    const timeUntilExpiry = tokenExpiryTime - now;

    console.log('🕒 Token 過期檢查:', {
      expiryTime: new Date(tokenExpiryTime).toLocaleString(),
      now: new Date(now).toLocaleString(),
      timeUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60) + ' 分鐘',
      isValid: timeUntilExpiry > 0
    });

    // If token expires within threshold, attempt refresh
    if (timeUntilExpiry < SECURITY_CONFIG.REFRESH_THRESHOLD && timeUntilExpiry > 0) {
      this.refreshAccessToken();
    }

    const isValid = timeUntilExpiry > 0;
    console.log(`${isValid ? '✅' : '❌'} 認證狀態:`, isValid);
    return isValid;
  }

  /**
   * Get current authentication state
   */
  getAuthState(): GoogleAuthState {
    return {
      isAuthenticated: this.isAuthenticated(),
      user: this.userInfo,
      tokens: this.tokens,
      error: null,
      isLoading: false
    };
  }

  /**
   * Sign out user and clear stored data
   */
  async signOut(): Promise<void> {
    try {
      // Revoke tokens with Google
      if (this.tokens?.access_token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${this.tokens.access_token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      }
    } catch (error) {
      console.error('Error revoking tokens:', error);
    }

    // Clear local data
    this.tokens = null;
    this.userInfo = null;

    // Clear secure storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY);
      localStorage.removeItem(SECURITY_CONFIG.ENCRYPTION_KEY_STORAGE);
    }
  }

  /**
   * Get current user information
   */
  getCurrentUser(): GoogleUserInfo | null {
    return this.userInfo;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.tokens?.access_token || null;
  }

  /**
   * Manually set authentication data (for OAuth callback processing)
   */
  async setAuthData(tokens: GoogleTokens, userInfo: GoogleUserInfo): Promise<void> {
    // 添加時間戳記錄 token 發放時間
    this.tokens = {
      ...tokens,
      issued_at: Date.now() // 記錄發放時間
    };
    this.userInfo = userInfo;
    await this.saveTokensToStorage();
  }

  /**
   * Make authenticated request to Google APIs
   */
  async authenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.tokens?.access_token) {
      throw new Error('No access token available');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.tokens.access_token}`
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    // If unauthorized, try to refresh token
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed && this.tokens?.access_token) {
        // Retry with new token
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${this.tokens.access_token}`
          }
        });
      } else {
        throw new Error('Unable to refresh access token');
      }
    }

    return response;
  }

  // Private methods

  private async saveTokensToStorage(): Promise<void> {
    if (typeof window === 'undefined' || !this.tokens) return;

    try {
      const encryptedTokens = await encryptData(JSON.stringify({
        tokens: this.tokens,
        userInfo: this.userInfo,
        timestamp: Date.now()
      }));

      localStorage.setItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY, encryptedTokens);
    } catch (error) {
      console.error('Failed to save tokens securely:', error);
    }
  }

  private async loadTokensFromStorage(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const encryptedTokens = localStorage.getItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY);
      if (!encryptedTokens) return;

      const decryptedData = await decryptData(encryptedTokens);
      const { tokens, userInfo, timestamp } = JSON.parse(decryptedData);

      // Check if stored data is not too old
      if (Date.now() - timestamp > SECURITY_CONFIG.SESSION_TIMEOUT) {
        await this.signOut();
        return;
      }

      this.tokens = tokens;
      this.userInfo = userInfo;
    } catch (error) {
      console.error('Failed to load tokens from storage:', error);
      // Clear potentially corrupted data
      localStorage.removeItem(SECURITY_CONFIG.TOKEN_STORAGE_KEY);
    }
  }

  private getTokenExpiryTime(): number {
    if (!this.tokens?.expires_in) return 0;

    // 使用記錄的發放時間，如果沒有記錄則假設是現在發放的
    const issuedAt = (this.tokens as any).issued_at || Date.now();
    return issuedAt + (this.tokens.expires_in * 1000);
  }

  private generateSecureState(): string {
    const array = new Uint32Array(2);
    crypto.getRandomValues(array);
    const state = array.join('');

    // Store state for validation
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('google_auth_state', state);
    }

    return state;
  }

  private validateState(state: string): boolean {
    if (typeof window === 'undefined') return false;

    const storedState = sessionStorage.getItem('google_auth_state');
    sessionStorage.removeItem('google_auth_state');

    return storedState === state;
  }
}

// Export singleton instance
export const googleAuthClientService = new GoogleAuthClientService();

// React hook for Google authentication
export function useGoogleAuth() {
  const [authState, setAuthState] = useState<GoogleAuthState>({
    isAuthenticated: false,
    user: null,
    tokens: null,
    error: null,
    isLoading: true
  });

  useEffect(() => {
    // Initialize authentication state
    const initAuth = async () => {
      const state = googleAuthClientService.getAuthState();
      setAuthState({ ...state, isLoading: false });
    };

    initAuth();
  }, []);

  const signIn = async (): Promise<string> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      return await googleAuthClientService.initializeAuth();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign-in failed';
      setAuthState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw error;
    }
  };

  const completeAuth = async (code: string, state: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    const result = await googleAuthClientService.completeAuth(code, state);
    setAuthState(result);
    return result;
  };

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    await googleAuthClientService.signOut();
    setAuthState({
      isAuthenticated: false,
      user: null,
      tokens: null,
      error: null,
      isLoading: false
    });
  };

  const refreshAuth = async () => {
    const success = await googleAuthClientService.refreshAccessToken();
    if (success) {
      setAuthState(googleAuthClientService.getAuthState());
    }
    return success;
  };

  const updateAuthState = () => {
    const state = googleAuthClientService.getAuthState();
    setAuthState({ ...state, isLoading: false });
  };

  return {
    ...authState,
    signIn,
    completeAuth,
    signOut,
    refreshAuth,
    updateAuthState,
    authenticatedRequest: googleAuthClientService.authenticatedRequest.bind(googleAuthClientService)
  };
}

export { GoogleAuthClientService };