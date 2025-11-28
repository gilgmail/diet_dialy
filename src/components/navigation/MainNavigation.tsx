'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export default function MainNavigation(): JSX.Element {
  const pathname = usePathname();
  const { userProfile } = useSupabaseAuth();
  
  // 檢查是否為管理員
  const isAdmin = userProfile?.is_admin || false;

  // 基本導航項目
  const baseNavigationItems = [
    {
      href: '/dashboard',
      label: '儀表板',
      icon: '📊',
      description: '今日概覽與洞察'
    },
    {
      href: '/food-diary',
      label: '記錄飲食',
      icon: '🍽️',
      description: '每日飲食記錄'
    },
    {
      href: '/symptoms',
      label: '記錄症狀',
      icon: '❤️',
      description: '每日症狀記錄'
    },
    {
      href: '/history',
      label: '歷史記錄',
      icon: '📚',
      description: '查看記錄與趨勢'
    },
    {
      href: '/correlation-analysis',
      label: '關聯分析',
      icon: '🧠',
      description: 'AI 智能分析'
    },
    {
      href: '/reports',
      label: '醫療報告',
      icon: '📋',
      description: '生成 PDF 報告'
    },
    {
      href: '/foods',
      label: '食物庫',
      icon: '🗄️',
      description: '食物資料庫'
    },
    {
      href: '/settings',
      label: '設定',
      icon: '⚙️',
      description: '個人設定'
    }
  ];

  // 管理員專用導航項目
  const adminNavigationItem = {
    href: '/admin',
    label: '管理員',
    icon: '🛡️',
    description: 'AI 花費與系統管理',
    isAdmin: true
  };

  // 根據管理員權限動態生成導航項目
  const navigationItems = useMemo(() => {
    if (isAdmin) {
      return [...baseNavigationItems, adminNavigationItem];
    }
    return baseNavigationItems;
  }, [isAdmin]);

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
            {navigationItems.map((item) => {
              const isAdminItem = 'isAdmin' in item && item.isAdmin;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActivePath(item.href)
                      ? isAdminItem
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                        : 'bg-blue-500 text-white'
                      : isAdminItem
                      ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-orange-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
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
            {navigationItems.map((item) => {
              const isAdminItem = 'isAdmin' in item && item.isAdmin;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center p-3 rounded-lg text-xs transition-colors ${
                    isActivePath(item.href)
                      ? isAdminItem
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                        : 'bg-blue-500 text-white'
                      : isAdminItem
                      ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-orange-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg mb-1">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}