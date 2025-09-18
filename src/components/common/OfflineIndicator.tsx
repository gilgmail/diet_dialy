'use client';

import React, { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 初始化網路狀態
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setIsVisible(true);
      // 顯示重新連線訊息3秒
      setTimeout(() => setIsVisible(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isVisible && isOnline) return null;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50
        transform transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : '-translate-y-full'}
      `}
    >
      <div
        className={`
          px-4 py-2 text-center text-sm font-medium
          ${isOnline
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
          }
        `}
      >
        {isOnline ? (
          <div className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            已重新連線到網路
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636L5.636 18.364m12.728 0L5.636 5.636" />
            </svg>
            目前離線模式 - 部分功能受限
          </div>
        )}
      </div>
    </div>
  );
}