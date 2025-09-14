// Authentication page
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthButton } from '@/components/google/GoogleAuthButton';
import { useMedicalData } from '@/lib/google';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Database, Heart } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useMedicalData();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/setup' as any);
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleAuthSuccess = () => {
    router.push('/setup' as any);
  };

  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
    // Error is already displayed in the GoogleAuthButton component
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
      <div className="max-w-md w-full px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Heart className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Diet Daily</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Secure Medical Data Storage
          </h1>
          <p className="text-gray-600">
            Connect your Google account to create encrypted storage for your health information.
          </p>
        </div>

        {/* Authentication Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Secure Authentication</span>
            </CardTitle>
            <CardDescription>
              Your medical data will be stored in your own Google account with end-to-end encryption.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleAuthButton 
              onAuthSuccess={handleAuthSuccess}
              onAuthError={handleAuthError}
              size="lg"
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Security Features */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <Shield className="w-4 h-4 text-green-600" />
            <span>End-to-end encryption for all medical data</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <Database className="w-4 h-4 text-green-600" />
            <span>Data stored in your Google account, not our servers</span>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <Heart className="w-4 h-4 text-green-600" />
            <span>HIPAA-aware design for medical data protection</span>
          </div>
        </div>

        {/* Medical Disclaimer */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          <p className="font-medium mb-1">Medical Disclaimer:</p>
          <p>
            Diet Daily is a health management tool, not a substitute for professional medical care. 
            Always consult with qualified healthcare providers for medical decisions.
          </p>
        </div>
      </div>
    </div>
  );
}