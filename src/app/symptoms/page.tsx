'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DailySymptomTracker } from '@/components/symptoms/DailySymptomTracker';
import { DateCalendar } from '@/components/symptoms/DateCalendar';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DailySymptomEntry } from '@/types/medical';

export default function SymptomsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useSupabaseAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Helper to get local date string (YYYY-MM-DD)
  const getLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [todaysEntry, setTodaysEntry] = useState<DailySymptomEntry | null>(null);
  const [recordedDates, setRecordedDates] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin?redirect=/symptoms');
    }
  }, [authLoading, isAuthenticated, router]);

  // Load dates that have records (for indicator)
  useEffect(() => {
    const loadRecordedDates = async () => {
      if (!user?.id) return;

      try {
        // Get dates from the last 90 days
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const response = await fetch(
          `/api/medical/daily-symptoms?userId=${user.id}&datesOnly=true&startDate=${startDate}&endDate=${endDate}`
        );

        if (response.ok) {
          const data = await response.json();
          setRecordedDates(data.data || []);
        }
      } catch (err) {
        console.error('Failed to load recorded dates:', err);
      }
    };

    loadRecordedDates();
  }, [user?.id]);

  // Load entry for selected date
  useEffect(() => {
    const loadDateEntry = async () => {
      if (!user?.id) return;

      try {
        setIsLoading(true);

        const response = await fetch(`/api/medical/daily-symptoms?userId=${user.id}&date=${selectedDate}`);
        if (response.ok) {
          const data = await response.json();
          setTodaysEntry(data.data || null);
        }
      } catch (err) {
        console.error('Failed to load existing entry:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDateEntry();
  }, [user?.id, selectedDate]);

  const handleSubmit = async (entryData: Partial<DailySymptomEntry>) => {
    if (!user?.id) {
      setError('必須登入才能記錄症狀');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const method = todaysEntry ? 'PUT' : 'POST';
      const url = '/api/medical/daily-symptoms';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entryData,
          userId: user.id,
          entryId: todaysEntry?.id, // Include entryId for PUT requests
          recorded_date: selectedDate, // Use selected date instead of today
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || '提交失敗');
      }

      const result = await response.json();
      setTodaysEntry(result.data);
      setSuccess(todaysEntry ? '症狀記錄已更新！' : '症狀記錄已儲存！');

      // Always update recorded dates list to ensure consistency
      if (!recordedDates.includes(selectedDate)) {
        setRecordedDates(prev => [...prev, selectedDate].sort().reverse());
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失敗，請重試');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (authLoading || (!isAuthenticated && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-primary mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  // Show not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">需要登入</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              您需要登入才能記錄症狀
            </p>
            <Button
              onClick={() => router.push('/auth/signin?redirect=/symptoms')}
              variant="medical"
            >
              前往登入
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header Bar */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-medical-primary to-medical-primary/80 shadow-md">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">每日症狀記錄</h1>
                <p className="text-xs text-gray-500">追蹤健康狀況，分析症狀模式</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              儀表板
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Date Selector */}
          <div className="lg:col-span-1">

          {/* Date Selector with Calendar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-medical-primary/10">
                  <span className="text-base">📅</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">記錄日期</h3>
                  <p className="text-[10px] text-gray-500">點擊展開日曆選擇</p>
                </div>
              </div>
              {todaysEntry && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-medium text-green-700">
                    完整度 {Math.round((todaysEntry.data_completeness_score || 0) * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Selected Date Display - Clickable to toggle calendar */}
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full p-3 bg-gradient-to-r from-gray-50 to-white hover:from-medical-primary/5 hover:to-medical-primary/10 transition-all duration-200 border-b border-gray-100 group"
              aria-expanded={showCalendar}
              aria-label="切換日曆顯示"
            >
              <div className="flex items-center justify-between">
                <div className="text-left space-y-1">
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-medical-primary transition-colors">
                    {new Date(selectedDate).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long'
                    })}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {todaysEntry ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          已有記錄
                        </span>
                        <span className="text-[10px] text-gray-500">
                          • {new Date(todaysEntry.recorded_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        尚未記錄
                      </span>
                    )}
                  </div>
                </div>
                <div className={`text-sm transition-transform duration-200 ${showCalendar ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-medical-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Custom Calendar - Collapsible with Animation */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showCalendar ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-3 bg-gray-50/50">
                <DateCalendar
                  selectedDate={selectedDate}
                  recordedDates={recordedDates}
                  onDateSelect={(date) => {
                    setSelectedDate(date);
                    setShowCalendar(false);
                  }}
                  maxDate={getLocalDateString(new Date(new Date().getTime() + 24 * 60 * 60 * 1000))}
                />
              </div>
            </div>

            {/* Recorded Dates Indicator */}
            {recordedDates.length > 0 && (
              <div className="p-3 bg-gradient-to-b from-white to-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded bg-green-100">
                      <span className="text-xs">📊</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-800">最近更新</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium text-green-700 bg-green-100 rounded">
                      {recordedDates.length}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recordedDates.slice(0, 12).map(date => {
                    const dateObj = new Date(date + 'T00:00:00'); // Parse as local date
                    const isSelected = date === selectedDate;
                    const isToday = date === getLocalDateString();

                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={`
                          relative px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200
                          ${isSelected
                            ? 'bg-medical-primary text-white shadow-md scale-105 ring-2 ring-medical-primary/50'
                            : 'bg-white text-green-700 hover:bg-green-50 border border-green-200 hover:border-green-300 hover:shadow-sm'
                          }
                          ${isToday && !isSelected ? 'ring-2 ring-green-400/50' : ''}
                        `}
                        title={dateObj.toLocaleDateString('zh-TW', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] font-semibold">
                            {dateObj.getDate()}
                          </span>
                          <span className="text-[9px] opacity-75">
                            {dateObj.toLocaleDateString('zh-TW', { month: 'short' })}
                          </span>
                        </div>
                        {isToday && (
                          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-white"></div>
                        )}
                      </button>
                    );
                  })}
                  {recordedDates.length > 12 && (
                    <button
                      className="px-2.5 py-1.5 text-[10px] text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                      onClick={() => setShowCalendar(true)}
                    >
                      +{recordedDates.length - 12}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Right Column - Symptom Tracker */}
          <div className="lg:col-span-2">
            {/* Success Message */}
            {success && (
              <Alert className="mb-4 border-green-200 bg-green-50 shadow-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <AlertDescription className="text-green-800 font-medium">
                    {success}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="mb-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <AlertDescription>{error}</AlertDescription>
                </div>
              </Alert>
            )}

            {/* Symptom Tracker */}
            <DailySymptomTracker
              onSubmit={handleSubmit}
              existingEntry={todaysEntry}
              isLoading={isLoading}
              recordedDate={selectedDate}
            />
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-gray-900">快速導航</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => router.push('/history')}
              className="group flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-medical-primary hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50 hover:from-medical-primary/5 hover:to-medical-primary/10"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 group-hover:from-blue-200 group-hover:to-blue-100 transition-colors">
                <span className="text-2xl">📈</span>
              </div>
              <div className="text-center">
                <h3 className="text-xs font-semibold text-gray-900 group-hover:text-medical-primary transition-colors">症狀歷史</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">查看趨勢</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/food-diary')}
              className="group flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-medical-primary hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50 hover:from-medical-primary/5 hover:to-medical-primary/10"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-green-50 group-hover:from-green-200 group-hover:to-green-100 transition-colors">
                <span className="text-2xl">🍽️</span>
              </div>
              <div className="text-center">
                <h3 className="text-xs font-semibold text-gray-900 group-hover:text-medical-primary transition-colors">飲食記錄</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">記錄飲食</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/correlation-analysis')}
              className="group flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-medical-primary hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50 hover:from-medical-primary/5 hover:to-medical-primary/10"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 group-hover:from-purple-200 group-hover:to-purple-100 transition-colors">
                <span className="text-2xl">🧠</span>
              </div>
              <div className="text-center">
                <h3 className="text-xs font-semibold text-gray-900 group-hover:text-medical-primary transition-colors">關聯分析</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">AI 分析</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/reports')}
              className="group flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-medical-primary hover:shadow-md transition-all duration-200 bg-gradient-to-br from-white to-gray-50 hover:from-medical-primary/5 hover:to-medical-primary/10"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 group-hover:from-orange-200 group-hover:to-orange-100 transition-colors">
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-center">
                <h3 className="text-xs font-semibold text-gray-900 group-hover:text-medical-primary transition-colors">健康報告</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">生成報告</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}