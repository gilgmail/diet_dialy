// Simplified sync status component - Google Sheets functionality removed in Phase 1
'use client';

import React from 'react';

interface SyncStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function SyncStatus({ showDetails = false, className = '' }: SyncStatusProps) {
  // Phase 1: Simple status display without Google Sheets sync
  return (
    <div className={`p-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-sm text-green-700 font-medium">Local Storage Active</span>
      </div>
      {showDetails && (
        <p className="text-xs text-green-600 mt-2">
          Google Sheets sync removed in Phase 1 optimization.
          Data is stored locally with Supabase backup.
        </p>
      )}
    </div>
  );
}

export default SyncStatus;