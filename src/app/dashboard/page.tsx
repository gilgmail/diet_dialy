// Dashboard page
'use client';

import { useMedicalData } from '@/lib/google';
import { SyncStatus } from '@/components/google/SyncStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Calendar, FileText, Camera } from 'lucide-react';

export default function DashboardPage() {
  const { isReady, user } = useMedicalData();

  if (!isReady) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your medical data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}
        </h1>
        <p className="text-gray-600">
          Track your symptoms, food intake, and medical progress.
        </p>
      </div>

      {/* Sync Status */}
      <div className="mb-8">
        <SyncStatus showDetails={true} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="text-center pb-3">
            <Activity className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <CardTitle className="text-lg">Log Symptoms</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="text-center text-sm">
              Record new symptoms and track severity
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="text-center pb-3">
            <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <CardTitle className="text-lg">Food Diary</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="text-center text-sm">
              Log meals and track reactions
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="text-center pb-3">
            <Camera className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <CardTitle className="text-lg">Photo Upload</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="text-center text-sm">
              Take photos of symptoms or medications
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="text-center pb-3">
            <FileText className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <CardTitle className="text-lg">Reports</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CardDescription className="text-center text-sm">
              Generate medical reports for your doctor
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your recent symptoms, food entries, and medical data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            Start logging your medical data to see activity here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}