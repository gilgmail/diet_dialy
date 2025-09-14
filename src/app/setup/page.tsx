// Medical data setup page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthButton } from '@/components/google/GoogleAuthButton';
import { MedicalDataSetup } from '@/components/google/MedicalDataSetup';
import { SyncStatus } from '@/components/google/SyncStatus';
import { useMedicalData } from '@/lib/google';
import type { MedicalProfile } from '@/types/medical';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Database, Users, ArrowRight, CheckCircle } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useMedicalData();
  const [currentStep, setCurrentStep] = useState(1);
  const [userProfile, setUserProfile] = useState<MedicalProfile | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Mock user profile for demo - in production, this would come from user registration
  useEffect(() => {
    // Create a demo medical profile
    const demoProfile: MedicalProfile = {
      id: user?.id || 'demo-user',
      userId: user?.id || 'demo-user',
      conditions: ['ibd', 'allergy'], // Demo conditions
      allergies: ['Gluten', 'Dairy', 'Nuts'],
      medications: [],
      dietaryRestrictions: ['Gluten-free', 'Low-FODMAP'],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setUserProfile(demoProfile);
  }, [user]);

  const handleAuthSuccess = () => {
    setCurrentStep(2);
  };

  const handleAuthError = (error: string) => {
    setSetupError(error);
  };

  const handleSetupComplete = () => {
    setCurrentStep(3);
  };

  const handleSetupError = (error: string) => {
    setSetupError(error);
  };

  const steps = [
    {
      number: 1,
      title: 'Connect Google Account',
      description: 'Securely authenticate with Google for data storage',
      icon: Shield,
      completed: isAuthenticated
    },
    {
      number: 2,
      title: 'Initialize Medical Data',
      description: 'Set up secure storage for your health information',
      icon: Database,
      completed: currentStep > 2
    },
    {
      number: 3,
      title: 'Ready to Use',
      description: 'Start tracking your medical data',
      icon: CheckCircle,
      completed: currentStep >= 3
    }
  ];

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Set Up Your Medical Data Storage
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Securely store your health information in your own Google account with 
            end-to-end encryption.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = step.completed;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted ? 'bg-green-600 border-green-600 text-white' :
                    isActive ? 'bg-blue-600 border-blue-600 text-white' :
                    'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className={`w-4 h-4 mx-4 ${
                      isCompleted ? 'text-green-600' : 'text-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="text-center mt-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {steps[currentStep - 1]?.title}
            </h2>
            <p className="text-gray-600">
              {steps[currentStep - 1]?.description}
            </p>
          </div>
        </div>

        {/* Error Display */}
        {setupError && (
          <Card className="max-w-2xl mx-auto mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-700">
                <span className="font-medium">Error:</span>
                <span>{setupError}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        <div className="flex justify-center">
          {currentStep === 1 && (
            <Card className="max-w-2xl w-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Secure Authentication</span>
                </CardTitle>
                <CardDescription>
                  Connect your Google account to create secure, encrypted storage for your medical data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <GoogleAuthButton 
                  onAuthSuccess={handleAuthSuccess}
                  onAuthError={handleAuthError}
                  size="lg"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-medium text-gray-900">Secure</h3>
                    <p className="text-xs text-gray-600">End-to-end encryption</p>
                  </div>
                  <div className="text-center p-4">
                    <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-medium text-gray-900">Private</h3>
                    <p className="text-xs text-gray-600">You own your data</p>
                  </div>
                  <div className="text-center p-4">
                    <Database className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-medium text-gray-900">Accessible</h3>
                    <p className="text-xs text-gray-600">Available anywhere</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && userProfile && (
            <MedicalDataSetup
              userProfile={userProfile}
              onSetupComplete={handleSetupComplete}
              onSetupError={handleSetupError}
            />
          )}

          {currentStep === 3 && (
            <Card className="max-w-2xl w-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>Setup Complete!</span>
                </CardTitle>
                <CardDescription>
                  Your secure medical data storage is ready to use.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sync Status */}
                <SyncStatus showDetails={true} />
                
                {/* Next Steps */}
                <div className="text-center space-y-4">
                  <h3 className="font-medium text-gray-900">What&apos;s Next?</h3>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Start logging your daily symptoms</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Track your food intake and reactions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Monitor medication effectiveness</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Generate reports for your healthcare provider</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => router.push('/dashboard' as any)}
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}