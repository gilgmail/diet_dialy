// Sync status indicator component
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useMedicalData } from '@/lib/google';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Database,
  CloudOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SyncStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncStatus({ 
  className = '', 
  showDetails = true 
}: SyncStatusProps) {
  const { syncStatus, syncNow, isAuthenticated } = useMedicalData();
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleManualSync = async () => {
    if (isManualSyncing || !syncStatus.isOnline || !isAuthenticated) return;
    
    setIsManualSyncing(true);
    try {
      await syncNow();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) {
      return <WifiOff className="w-4 h-4 text-red-500" />;
    }
    
    if (syncStatus.syncInProgress || isManualSyncing) {
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }
    
    if (syncStatus.error) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
    
    if (syncStatus.pendingChanges > 0) {
      return <Clock className="w-4 h-4 text-orange-500" />;
    }
    
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isAuthenticated) {
      return 'Not connected';
    }
    
    if (!syncStatus.isOnline) {
      return 'Offline';
    }
    
    if (syncStatus.syncInProgress || isManualSyncing) {
      return 'Syncing...';
    }
    
    if (syncStatus.error) {
      return 'Sync error';
    }
    
    if (syncStatus.pendingChanges > 0) {
      return `${syncStatus.pendingChanges} pending`;
    }
    
    if (syncStatus.lastSync) {
      return `Synced ${formatDistanceToNow(syncStatus.lastSync, { addSuffix: true })}`;
    }
    
    return 'Not synced';
  };

  const getStatusColor = () => {
    if (!isAuthenticated || !syncStatus.isOnline) {
      return 'text-red-600';
    }
    
    if (syncStatus.syncInProgress || isManualSyncing) {
      return 'text-blue-600';
    }
    
    if (syncStatus.error) {
      return 'text-yellow-600';
    }
    
    if (syncStatus.pendingChanges > 0) {
      return 'text-orange-600';
    }
    
    return 'text-green-600';
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {getStatusIcon()}
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
          <Database className="w-4 h-4" />
          <span>Data Sync Status</span>
        </h3>
        
        <Button
          onClick={handleManualSync}
          variant="outline"
          size="sm"
          disabled={!syncStatus.isOnline || !isAuthenticated || syncStatus.syncInProgress || isManualSyncing}
          className="flex items-center space-x-1"
        >
          <RefreshCw className={`w-3 h-3 ${(syncStatus.syncInProgress || isManualSyncing) ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </Button>
      </div>
      
      {/* Main Status */}
      <div className="flex items-center space-x-3 mb-3">
        {getStatusIcon()}
        <div className="flex-1">
          <div className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </div>
          {syncStatus.error && (
            <div className="text-xs text-red-500 mt-1">
              {syncStatus.error}
            </div>
          )}
        </div>
      </div>
      
      {/* Connection Status */}
      <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
        <div className="flex items-center space-x-2">
          {syncStatus.isOnline ? (
            <Wifi className="w-3 h-3 text-green-500" />
          ) : (
            <CloudOff className="w-3 h-3 text-red-500" />
          )}
          <span>
            {syncStatus.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Clock className="w-3 h-3" />
          <span>
            {syncStatus.lastSync ? (
              `Last: ${syncStatus.lastSync.toLocaleTimeString()}`
            ) : (
              'Never synced'
            )}
          </span>
        </div>
      </div>
      
      {/* Pending Changes */}
      {syncStatus.pendingChanges > 0 && (
        <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
          <div className="flex items-center space-x-2 text-orange-700">
            <AlertCircle className="w-3 h-3" />
            <span>
              {syncStatus.pendingChanges} items waiting to sync. 
              {syncStatus.isOnline ? 
                'Will sync automatically.' : 
                'Will sync when back online.'
              }
            </span>
          </div>
        </div>
      )}
      
      {/* Privacy Notice */}
      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        <div className="flex items-start space-x-2">
          <Database className="w-3 h-3 mt-0.5" />
          <span>
            Your medical data is stored securely in your Google account. 
            We never store your health information on our servers.
          </span>
        </div>
      </div>
    </div>
  );
}

export default SyncStatus;