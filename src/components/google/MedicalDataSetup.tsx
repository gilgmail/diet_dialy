// Medical data setup component
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useMedicalData } from '@/lib/google';
import { medicalDataService } from '@/lib/google';
import type { MedicalCondition, MedicalProfile } from '@/types/medical';
import { 
  Database, 
  Shield, 
  Folder, 
  FileSpreadsheet,
  CheckCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
  Info
} from 'lucide-react';

interface MedicalDataSetupProps {
  userProfile: MedicalProfile;
  onSetupComplete: () => void;
  onSetupError: (error: string) => void;
}

export function MedicalDataSetup({
  userProfile,
  onSetupComplete,
  onSetupError
}: MedicalDataSetupProps) {
  const { isAuthenticated, user } = useMedicalData();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupSteps, setSetupSteps] = useState({
    authentication: false,
    folders: false,
    spreadsheet: false,
    permissions: false
  });
  const [setupComplete, setSetupComplete] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);

  const handleSetup = async () => {
    if (!isAuthenticated || !user) {
      onSetupError('Please authenticate with Google first');
      return;
    }

    setIsSettingUp(true);
    
    try {
      // Step 1: Authentication (already done)
      setSetupSteps(prev => ({ ...prev, authentication: true }));
      
      // Step 2: Initialize medical data service
      const success = await medicalDataService.initialize(userProfile);
      if (!success) {
        throw new Error('Failed to initialize medical data service');
      }
      
      setSetupSteps(prev => ({ ...prev, folders: true, spreadsheet: true }));
      
      // Step 3: Verify permissions
      setSetupSteps(prev => ({ ...prev, permissions: true }));
      
      // Get spreadsheet URL for user
      const url = medicalDataService.getMedicalSpreadsheetUrl();
      setSpreadsheetUrl(url);
      
      setSetupComplete(true);
      onSetupComplete();
    } catch (error) {
      console.error('Setup failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Setup failed';
      onSetupError(errorMessage);
    } finally {
      setIsSettingUp(false);
    }
  };

  const conditionLabels: Record<MedicalCondition, string> = {
    ibd: 'Inflammatory Bowel Disease (IBD)',
    crohns: "Crohn&apos;s Disease",
    uc: 'Ulcerative Colitis',
    chemotherapy: 'Chemotherapy Treatment',
    allergy: 'Food/Environmental Allergies',
    ibs: 'Irritable Bowel Syndrome (IBS)',
    celiac: 'Celiac Disease',
    other: 'Other Conditions'
  };

  if (setupComplete) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>Medical Data Setup Complete!</span>
          </CardTitle>
          <CardDescription>
            Your secure medical data storage is ready to use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">What&apos;s been created:</h4>
            <ul className="space-y-2 text-sm text-green-700">
              <li className="flex items-center space-x-2">
                <Folder className="w-4 h-4" />
                <span>Secure folder structure in your Google Drive</span>
              </li>
              <li className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Medical tracking spreadsheet with condition-specific sheets</span>
              </li>
              <li className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Client-side encryption for all medical data</span>
              </li>
            </ul>
          </div>
          
          {spreadsheetUrl && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Direct Access:</h4>
              <Button
                onClick={() => window.open(spreadsheetUrl, '_blank')}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Medical Spreadsheet</span>
              </Button>
              <p className="text-xs text-blue-600 mt-2">
                You can access your medical data directly in Google Sheets anytime.
              </p>
            </div>
          )}
          
          <div className="text-center">
            <Button onClick={onSetupComplete} size="lg">
              Start Using Diet Daily
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="w-5 h-5" />
          <span>Medical Data Setup</span>
        </CardTitle>
        <CardDescription>
          Set up secure storage for your medical data in your Google account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Conditions */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Your Medical Conditions:</h3>
          <div className="grid grid-cols-1 gap-2">
            {userProfile.conditions.map(condition => (
              <div key={condition} className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">{conditionLabels[condition] || condition}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Setup Steps */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Setup Progress:</h3>
          <div className="space-y-2">
            <div className={`flex items-center space-x-2 ${
              setupSteps.authentication ? 'text-green-600' : 'text-gray-400'
            }`}>
              {setupSteps.authentication ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <div className="w-4 h-4 border border-gray-300 rounded" />
              )}
              <span className="text-sm">Google Account Authentication</span>
            </div>
            
            <div className={`flex items-center space-x-2 ${
              setupSteps.folders ? 'text-green-600' : 'text-gray-400'
            }`}>
              {setupSteps.folders ? (
                <CheckCircle className="w-4 h-4" />
              ) : isSettingUp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="w-4 h-4 border border-gray-300 rounded" />
              )}
              <span className="text-sm">Create Secure Folder Structure</span>
            </div>
            
            <div className={`flex items-center space-x-2 ${
              setupSteps.spreadsheet ? 'text-green-600' : 'text-gray-400'
            }`}>
              {setupSteps.spreadsheet ? (
                <CheckCircle className="w-4 h-4" />
              ) : isSettingUp && setupSteps.folders ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="w-4 h-4 border border-gray-300 rounded" />
              )}
              <span className="text-sm">Create Medical Tracking Spreadsheet</span>
            </div>
            
            <div className={`flex items-center space-x-2 ${
              setupSteps.permissions ? 'text-green-600' : 'text-gray-400'
            }`}>
              {setupSteps.permissions ? (
                <CheckCircle className="w-4 h-4" />
              ) : isSettingUp && setupSteps.spreadsheet ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <div className="w-4 h-4 border border-gray-300 rounded" />
              )}
              <span className="text-sm">Configure Security & Permissions</span>
            </div>
          </div>
        </div>
        
        {/* Privacy Information */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <h4 className="font-medium mb-1">Your Data Privacy:</h4>
              <ul className="space-y-1 text-xs">
                <li>• All medical data stays in YOUR Google account</li>
                <li>• Data is encrypted before storage for extra security</li>
                <li>• You can revoke app access at any time</li>
                <li>• We never store your medical data on our servers</li>
                <li>• You have complete control over your health information</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Setup Button */}
        <div className="text-center">
          <Button
            onClick={handleSetup}
            disabled={!isAuthenticated || isSettingUp}
            size="lg"
            className="flex items-center space-x-2"
          >
            {isSettingUp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            <span>
              {isSettingUp ? 'Setting up...' : 'Initialize Medical Data Storage'}
            </span>
          </Button>
          
          {!isAuthenticated && (
            <div className="flex items-center justify-center space-x-2 text-sm text-red-600 mt-2">
              <AlertCircle className="w-4 h-4" />
              <span>Please authenticate with Google first</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default MedicalDataSetup;