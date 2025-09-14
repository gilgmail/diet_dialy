'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  Heart,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  Settings,
  Menu,
  X,
  User,
  Bell,
  Shield,
  Activity
} from 'lucide-react';
import type { MedicalCondition } from '@/types/medical';
import MedicalConditionSelector from './MedicalConditionSelector';
// import { FoodCamera } from './FoodCamera'; // Not implemented in Week 1
import MedicalScoreCard from './MedicalScoreCard';
// import { RiskFactorsList } from './RiskFactorsList'; // Not implemented in Week 1
// import { AlternativesGrid } from './AlternativesGrid'; // Not implemented in Week 1
import type { ScoringResult } from '@/lib/medical/scoring-engine';

interface HomePageProps {
  className?: string;
}

// Mock data for demo
const MOCK_SCORING_RESULT: ScoringResult = {
  medicalScore: {
    score: 2,
    level: '普通',
    emoji: '😐',
    riskFactors: ['高纖維含量可能刺激腸道', '調味料較重'],
    recommendations: ['選擇清淡烹調方式', '控制份量'],
    alternatives: ['白米粥', '蒸蛋', '清湯麵'],
    medicalReason: '此食物含有中等風險因子，IBD患者需謹慎食用',
    urgency: 'medium'
  },
  allergyWarnings: [],
  emergencyAlert: undefined
};

const MOCK_USER_PROFILE = {
  name: '張小明',
  medicalConditions: ['ibd', 'allergy'] as MedicalCondition[],
  setupComplete: true,
  todayScore: 3.2,
  weeklyTrend: '+0.3',
  riskAlerts: 2,
  totalMeals: 847
};

export function HomePage({ className = '' }: HomePageProps) {
  const [activeView, setActiveView] = useState<'dashboard' | 'setup' | 'camera' | 'analysis' | 'risks' | 'alternatives'>('dashboard');
  const [userConditions, setUserConditions] = useState<MedicalCondition[]>(MOCK_USER_PROFILE.medicalConditions);
  const [setupComplete, setSetupComplete] = useState(MOCK_USER_PROFILE.setupComplete);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastPhoto, setLastPhoto] = useState<{file: File, analysis: ScoringResult} | null>(null);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleConditionsChange = (conditions: MedicalCondition[]) => {
    setUserConditions(conditions);
    if (conditions.length > 0) {
      setSetupComplete(true);
      setActiveView('dashboard');
    }
  };

  const handlePhotoCapture = (photo: File, medicalContext: string) => {
    // Mock analysis - in real app would call API
    setLastPhoto({
      file: photo,
      analysis: MOCK_SCORING_RESULT
    });
    setActiveView('analysis');
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
  };

  const getMealTimeRecommendation = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 9) return '早餐時間 - 溫和易消化食物為佳';
    if (hour >= 11 && hour < 14) return '午餐時間 - 注意份量控制';
    if (hour >= 17 && hour < 20) return '晚餐時間 - 選擇清淡食物';
    return '非正餐時間 - 如需進食請選擇安全點心';
  };

  // Navigation items
  const navigationItems = [
    { id: 'dashboard', label: '主控台', icon: Activity },
    { id: 'camera', label: '拍攝分析', icon: Camera },
    { id: 'risks', label: '風險因子', icon: AlertTriangle },
    { id: 'alternatives', label: '替代食物', icon: Heart },
    { id: 'setup', label: '醫療設定', icon: Settings }
  ];

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Mobile Header */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between px-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                aria-label="打開選單"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h1 className="font-semibold">Diet Daily</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <User className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed left-0 top-0 bottom-0 w-80 bg-background border-r p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold">導航選單</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="關閉選單"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveView(item.id as any);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeView === item.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
          <div className="flex-1 flex flex-col min-h-0 border-r bg-muted/5">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4 mb-5">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-medical-primary rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold">Diet Daily</h1>
                    <p className="text-xs text-muted-foreground">醫療食物追蹤</p>
                  </div>
                </div>
              </div>

              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigationItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id as any)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeView === item.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* User Profile in Sidebar */}
            <div className="flex-shrink-0 px-4 py-4 border-t">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{MOCK_USER_PROFILE.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {userConditions.length} 個醫療狀況
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:pl-64">
          <main className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 overflow-auto">
              <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">

                {/* Setup Flow - Show if not complete */}
                {!setupComplete && activeView === 'dashboard' && (
                  <Card className="border-medical-primary/30 bg-medical-primary/5">
                    <CardHeader>
                      <CardTitle>歡迎使用 Diet Daily</CardTitle>
                      <CardDescription>
                        請先設定您的醫療狀況，我們將為您提供個人化的食物安全建議
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={() => setActiveView('setup')}>
                        開始設定醫療狀況
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Dashboard View */}
                {activeView === 'dashboard' && setupComplete && (
                  <div className="space-y-6">
                    {/* Welcome Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-bold">
                          {getGreeting()}，{MOCK_USER_PROFILE.name}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                          {getMealTimeRecommendation()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {currentTime.toLocaleString('zh-TW', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Badge>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">今日平均分</p>
                              <p className="text-lg font-bold">{MOCK_USER_PROFILE.todayScore}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <Target className="w-4 h-4 text-blue-500" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">週趨勢</p>
                              <p className="text-lg font-bold text-green-600">
                                {MOCK_USER_PROFILE.weeklyTrend}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">風險提醒</p>
                              <p className="text-lg font-bold">{MOCK_USER_PROFILE.riskAlerts}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-purple-500" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">總餐數</p>
                              <p className="text-lg font-bold">{MOCK_USER_PROFILE.totalMeals}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveView('camera')}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-medical-primary/10 rounded-lg flex items-center justify-center">
                              <Camera className="w-5 h-5 text-medical-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium">拍攝分析</h3>
                              <p className="text-xs text-muted-foreground">拍攝食物獲得醫療建議</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveView('risks')}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                              <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium">風險檢查</h3>
                              <p className="text-xs text-muted-foreground">查看個人風險因子</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveView('alternatives')}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <Heart className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium">安全食物</h3>
                              <p className="text-xs text-muted-foreground">探索替代選項</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Recent Analysis */}
                    {lastPhoto && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">最近分析</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <MedicalScoreCard
                            scoringResult={lastPhoto.analysis}
                            foodName="最近拍攝的食物"
                          />
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Setup View */}
                {activeView === 'setup' && (
                  <MedicalConditionSelector
                    selectedConditions={userConditions}
                    onConditionsChange={handleConditionsChange}
                  />
                )}

                {/* Camera View */}
                {activeView === 'camera' && (
                  <FoodCamera
                    medicalConditions={userConditions}
                    onPhotoCapture={handlePhotoCapture}
                  />
                )}

                {/* Analysis View */}
                {activeView === 'analysis' && lastPhoto && (
                  <MedicalScoreCard
                    scoringResult={lastPhoto.analysis}
                    foodName="拍攝的食物"
                  />
                )}

                {/* Risk Factors View */}
                {activeView === 'risks' && (
                  <RiskFactorsList medicalConditions={userConditions} />
                )}

                {/* Alternatives View */}
                {activeView === 'alternatives' && (
                  <AlternativesGrid medicalConditions={userConditions} />
                )}

              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Accessibility: Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {activeView === 'dashboard' && '主控台已載入'}
        {activeView === 'setup' && '醫療設定頁面已載入'}
        {activeView === 'camera' && '相機功能已載入'}
        {activeView === 'analysis' && '分析結果已載入'}
        {activeView === 'risks' && '風險因子清單已載入'}
        {activeView === 'alternatives' && '替代食物清單已載入'}
      </div>
    </div>
  );
}