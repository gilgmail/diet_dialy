// Simplified Google OAuth integration - Sheets functionality removed in Phase 1
'use client';

import { useState } from 'react';

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

export interface GoogleAuthState {
  isAuthenticated: boolean;
  user: GoogleUser | null;
  isLoading: boolean;
  error: string | null;
}

// Mock implementation for Phase 1 - preserves OAuth interface without Sheets
export function useGoogleAuth(): GoogleAuthState & {
  signIn: () => Promise<string | undefined>;
  signOut: () => Promise<void>;
} {
  const [authState, setAuthState] = useState<GoogleAuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null
  });

  const signIn = async (): Promise<string | undefined> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Mock authentication for Phase 1 -- resolve after short delay so UI loaders behave
      await new Promise<void>(resolve => {
        setTimeout(() => {
          setAuthState({
            isAuthenticated: true,
            user: {
              id: 'demo-user',
              email: 'user@example.com',
              name: 'Demo User',
              picture: null
            },
            isLoading: false,
            error: null
          });
          resolve();
        }, 1000);
      });

      // Real implementation would return a Google OAuth redirect URL here.
      return undefined;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }));

      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null
    });
  };

  return {
    ...authState,
    signIn,
    signOut
  };
}

// Simplified medical data hook - removes Sheets dependency
export function useMedicalData(): GoogleAuthState & {
  signIn: () => Promise<string | undefined>;
  signOut: () => Promise<void>;
  isReady: boolean;
} {
  const authState = useGoogleAuth();

  return {
    ...authState,
    isReady: authState.isAuthenticated // Simplified readiness check
  };
}
