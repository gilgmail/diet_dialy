'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MainNavigation(): JSX.Element {
  const pathname = usePathname();

  const navigationItems = [
    {
      href: '/',
      label: '首頁',
      icon: '🏠',
      description: '概覽與快速功能'
    },
    {
      href: '/symptoms',
      label: '症狀日記',
      icon: '📅',
      description: '每日症狀記錄'
    },
    {
      href: '/food-diary',
      label: '食物日記',
      icon: '🍽️',
      description: '每日飲食記錄'
    },
    {
      href: '/database',
      label: '食物資料庫',
      icon: '🗄️',
      description: '管理食物資料'
    },
    {
      href: '/history',
      label: '食物追蹤',
      icon: '📚',
      description: '記錄與識別'
    },
    {
      href: '/reports',
      label: '醫療報告',
      icon: '📊',
      description: '專業分析'
    },
    {
      href: '/admin/food-verification',
      label: '管理員驗證',
      icon: '🛡️',
      description: '食物審核管理'
    }
  ];

  const isActivePath = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">🍎</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Diet Daily</h1>
              <p className="text-xs text-gray-600">智能飲食追蹤助手</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActivePath(item.href)
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200">
          <div className="grid grid-cols-4 gap-1 p-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center p-3 rounded-lg text-xs transition-colors ${
                  isActivePath(item.href)
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg mb-1">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}