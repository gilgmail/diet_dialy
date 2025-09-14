// Google OAuth callback page
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGoogleAuth } from '@/lib/google';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeAuth } = useGoogleAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`Authentication failed: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authentication parameters');
        }

        // Complete the authentication process
        const result = await completeAuth(code, state);
        
        if (result.isAuthenticated) {
          setSuccess(true);
          // Redirect to setup or dashboard after a short delay
          setTimeout(() => {
            router.push('/setup' as any);
          }, 2000);
        } else {
          throw new Error(result.error || 'Authentication failed');
        }
      } catch (err) {
        console.error('Authentication callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, completeAuth, router]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Completing Authentication
          </h2>
          <p className="text-gray-600">
            Securely connecting your Google account...
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Successful!
          </h2>
          <p className="text-gray-600 mb-6">
            Your Google account has been securely connected. 
            Redirecting to setup your medical data storage...
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Redirecting...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-4">
            {error}
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/auth' as any)}
              className="w-full"
            >
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              Return to Home
            </Button>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <p className="font-medium mb-1">Common issues:</p>
            <ul className="space-y-1 text-left">
              <li>• Make sure to grant all requested permissions</li>
              <li>• Check that your Google account allows third-party apps</li>
              <li>• Ensure cookies are enabled in your browser</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return null;
}