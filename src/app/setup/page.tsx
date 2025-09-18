// Medical data setup page
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAuthButton } from '@/components/google/GoogleAuthButton';
import { MedicalDataSetup } from '@/components/google/MedicalDataSetup';
import { SyncStatus } from '@/components/google/SyncStatus';
import { MedicalConditionSelector } from '@/components/medical/MedicalConditionSelector';
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
    setCurrentStep(4);
  };

  const handleSetupError = (error: string) => {
    setSetupError(error);
  };

  const handleMedicalProfileComplete = (profile: Partial<MedicalProfile>) => {
    // 更新用戶配置文件
    setUserProfile(prev => ({
      ...prev!,
      ...profile,
      userId: user?.id || 'demo-user',
      id: user?.id || 'demo-user'
    }));
    setCurrentStep(3); // 前往醫療數據初始化步驟
  };

  const steps = [
    {
      number: 1,
      title: '連接Google帳戶',
      description: '安全地連接Google進行數據存儲認證',
      icon: Shield,
      completed: isAuthenticated
    },
    {
      number: 2,
      title: '設置醫療狀況',
      description: '選擇您的醫療狀況和過敏信息',
      icon: Users,
      completed: currentStep > 2
    },
    {
      number: 3,
      title: '初始化醫療數據',
      description: '為您的健康信息設置安全存儲',
      icon: Database,
      completed: currentStep > 3
    },
    {
      number: 4,
      title: '準備使用',
      description: '開始追蹤您的醫療數據',
      icon: CheckCircle,
      completed: currentStep >= 4
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
            設置您的醫療數據存儲
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            通過端到端加密將您的健康資訊安全存儲在您自己的Google帳戶中。
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
                  <span>安全認證</span>
                </CardTitle>
                <CardDescription>
                  連接您的Google帳戶，為您的醫療數據創建安全、加密的存儲。
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
                    <h3 className="font-medium text-gray-900">安全</h3>
                    <p className="text-xs text-gray-600">端到端加密</p>
                  </div>
                  <div className="text-center p-4">
                    <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-medium text-gray-900">私密</h3>
                    <p className="text-xs text-gray-600">您擁有數據</p>
                  </div>
                  <div className="text-center p-4">
                    <Database className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-medium text-gray-900">便捷</h3>
                    <p className="text-xs text-gray-600">隨時隨地訪問</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <MedicalConditionSelector
              onProfileComplete={handleMedicalProfileComplete}
              initialProfile={userProfile || undefined}
            />
          )}

          {currentStep === 3 && userProfile && (
            <MedicalDataSetup
              userProfile={userProfile}
              onSetupComplete={handleSetupComplete}
              onSetupError={handleSetupError}
            />
          )}

          {currentStep === 4 && (
            <Card className="max-w-2xl w-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>設置完成！</span>
                </CardTitle>
                <CardDescription>
                  您的安全醫療數據存儲已準備就緒。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sync Status */}
                <SyncStatus showDetails={true} />

                {/* Next Steps */}
                <div className="text-center space-y-4">
                  <h3 className="font-medium text-gray-900">接下來做什麼？</h3>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>開始記錄您的每日症狀</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>追蹤您的食物攝入和反應</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>監控藥物有效性</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>為您的醫療保健提供者生成報告</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => router.push('/dashboard' as any)}
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    前往控制板
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