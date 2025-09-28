// Simplified Google OAuth integration - Sheets functionality removed in Phase 1
'use client';

import { useState, useEffect } from 'react';

export interface GoogleAuthState {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  error: string | null;
}

// Mock implementation for Phase 1 - preserves OAuth interface without Sheets
export function useGoogleAuth() {
  const [authState, setAuthState] = useState<GoogleAuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null
  });

  const signIn = async () => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Mock authentication for Phase 1
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
      }, 1000);
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }));
    }
  };

  const signOut = async () => {
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
export function useMedicalData() {
  const authState = useGoogleAuth();

  return {
    ...authState,
    isReady: authState.isAuthenticated // Simplified readiness check
  };
}