// Google authentication button component
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGoogleAuth } from '@/lib/google';
import { Loader2, Shield, User, AlertCircle } from 'lucide-react';

interface GoogleAuthButtonProps {
  onAuthSuccess?: (user: any) => void;
  onAuthError?: (error: string) => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function GoogleAuthButton({
  onAuthSuccess,
  onAuthError,
  variant = 'default',
  size = 'default',
  className = ''
}: GoogleAuthButtonProps) {
  const {
    isAuthenticated,
    user,
    isLoading,
    error,
    signIn,
    signOut
  } = useGoogleAuth();
  
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    if (isSigningIn) return;
    
    setIsSigningIn(true);
    try {
      const authUrl = await signIn();
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (err) {
      console.error('Sign in failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      onAuthError?.(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      onAuthError?.(errorMessage);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="flex items-center space-x-2">
          {user.picture ? (
            <img 
              src={user.picture} 
              alt={user.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <User className="w-8 h-8 rounded-full bg-gray-100 p-1" />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs text-gray-500 flex items-center">
              <Shield className="w-3 h-3 mr-1" />
              Connected to Google
            </span>
          </div>
        </div>
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Sign Out'
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <Button
        onClick={handleSignIn}
        variant={variant}
        size={size}
        disabled={isLoading || isSigningIn}
        className="flex items-center space-x-2"
      >
        {(isLoading || isSigningIn) ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        <span>
          {(isLoading || isSigningIn) ? 'Connecting...' : 'Connect Google Account'}
        </span>
      </Button>
      
      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="text-xs text-gray-500 max-w-sm">
        <p className="flex items-center space-x-1">
          <Shield className="w-3 h-3" />
          <span>Your medical data stays in your Google account - we never store it on our servers.</span>
        </p>
      </div>
    </div>
  );
}

export default GoogleAuthButton;