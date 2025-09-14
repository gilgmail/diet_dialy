// Google OAuth authentication service
import { OAuth2Client } from 'google-auth-library';
import { useState, useEffect } from 'react';
import type { GoogleTokens, GoogleUserInfo, GoogleAuthState } from '@/types/google';
import { GOOGLE_CONFIG, SECURITY_CONFIG } from './config';
import { encryptData, decryptData } from './encryption';

class GoogleAuthService {
  private oauth2Client: OAuth2Client;
  private tokens: GoogleTokens | null = null;
  private userInfo: GoogleUserInfo | null = null;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      GOOGLE_CONFIG.clientId,
      GOOGLE_CONFIG.clientSecret,
      GOOGLE_CONFIG.redirectUri
    );

    // Load tokens from secure storage on initialization
    this.loadTokensFromStorage();
  }

  /**
   * Initialize Google OAuth flow
   * Returns authorization URL for user to complete authentication
   */
  async initializeAuth(): Promise<string> {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_CONFIG.scopes,
      prompt: 'consent', // Force consent screen to get refresh token
      state: this.generateSecureState()
    });

    return authUrl;
  }

  /**
   * Complete OAuth flow with authorization code
   */
  async completeAuth(code: string, state: string): Promise<GoogleAuthState> {
    try {
      if (!this.validateState(state)) {
        throw new Error('Invalid state parameter - potential CSRF attack');
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('No access token received');
      }

      this.tokens = tokens as GoogleTokens;
      
      // Get user information
      this.oauth2Client.setCredentials(tokens);
      const userInfoResponse = await this.oauth2Client.request({
        url: 'https://www.googleapis.com/oauth2/v2/userinfo'
      });
      
      this.userInfo = userInfoResponse.data as GoogleUserInfo;
      
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

      this.oauth2Client.setCredentials({ refresh_token: this.tokens.refresh_token });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new Error('Failed to refresh access token');
      }

      // Update tokens while preserving refresh token
      this.tokens = {
        ...this.tokens,
        access_token: credentials.access_token,
        expires_in: credentials.expiry_date ? 
          Math.floor((credentials.expiry_date - Date.now()) / 1000) : 
          this.tokens.expires_in
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
    if (!this.tokens?.access_token || !this.userInfo) {
      return false;
    }

    // Check if token is close to expiry
    const tokenExpiryTime = this.getTokenExpiryTime();
    const now = Date.now();
    const timeUntilExpiry = tokenExpiryTime - now;

    // If token expires within threshold, attempt refresh
    if (timeUntilExpiry < SECURITY_CONFIG.REFRESH_THRESHOLD) {
      this.refreshAccessToken();
    }

    return timeUntilExpiry > 0;
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
   * Get OAuth2 client for Google APIs
   */
  getOAuth2Client() {
    if (!this.isAuthenticated() || !this.tokens) {
      throw new Error('User not authenticated');
    }

    this.oauth2Client.setCredentials(this.tokens);
    return this.oauth2Client;
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
    
    // Calculate expiry time based on token issue time
    const tokenIssueTime = Date.now() - (this.tokens.expires_in * 1000);
    return tokenIssueTime + (this.tokens.expires_in * 1000);
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
export const googleAuthService = new GoogleAuthService();

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
      const state = googleAuthService.getAuthState();
      setAuthState({ ...state, isLoading: false });
    };

    initAuth();
  }, []);

  const signIn = async (): Promise<string> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      return await googleAuthService.initializeAuth();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign-in failed';
      setAuthState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      throw error;
    }
  };

  const completeAuth = async (code: string, state: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    const result = await googleAuthService.completeAuth(code, state);
    setAuthState(result);
    return result;
  };

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    await googleAuthService.signOut();
    setAuthState({
      isAuthenticated: false,
      user: null,
      tokens: null,
      error: null,
      isLoading: false
    });
  };

  const refreshAuth = async () => {
    const success = await googleAuthService.refreshAccessToken();
    if (success) {
      setAuthState(googleAuthService.getAuthState());
    }
    return success;
  };

  return {
    ...authState,
    signIn,
    completeAuth,
    signOut,
    refreshAuth
  };
}

export { GoogleAuthService };