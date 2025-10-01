/**
 * 全局錯誤邊界組件
 * 醫療級錯誤處理和恢復系統
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/lib/logger';
import { AlertTriangle, RefreshCw, Home, FileText } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新狀態以觸發錯誤 UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 記錄錯誤到安全日誌系統
    logError('React Error Boundary caught error', {
      component: 'ErrorBoundary',
      context: this.props.context || 'Unknown',
      errorId: this.state.errorId || 'Unknown',
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack?.split('\n').slice(0, 5).join('\n'), // 限制堆疊深度
      componentStack: errorInfo.componentStack?.split('\n').slice(0, 3).join('\n')
    });

    this.setState({ errorInfo });

    // 調用外部錯誤處理器
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      });

      logError('Error boundary retry attempted', {
        component: 'ErrorBoundary',
        retryCount: this.retryCount,
        maxRetries: this.maxRetries
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  generateErrorReport = () => {
    const { error, errorInfo, errorId } = this.state;
    const report = {
      errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      },
      componentStack: errorInfo?.componentStack,
      context: this.props.context
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diet-daily-error-report-${errorId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定義的 fallback UI，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默認錯誤 UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  應用程序遇到錯誤
                </h1>
                <p className="text-sm text-gray-600">
                  {this.props.context ? `在 ${this.props.context} 中發生錯誤` : '發生了意外錯誤'}
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <div className="text-sm text-red-700">
                <p className="font-medium mb-1">錯誤詳情：</p>
                <p className="font-mono text-xs">
                  {this.state.error?.message || '未知錯誤'}
                </p>
                {this.state.errorId && (
                  <p className="font-mono text-xs mt-1 text-red-500">
                    錯誤 ID: {this.state.errorId}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {this.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>重試 ({this.maxRetries - this.retryCount} 次剩餘)</span>
                </button>
              )}

              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>返回首頁</span>
              </button>

              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>重新加載頁面</span>
              </button>

              <button
                onClick={this.generateErrorReport}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>下載錯誤報告</span>
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500 text-center">
              如果問題持續存在，請聯繫技術支援並提供錯誤報告
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 醫療專用錯誤邊界
export function MedicalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      context="Medical Data Processing"
      fallback={
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="text-sm font-medium text-red-800">
              醫療數據處理錯誤
            </h3>
          </div>
          <p className="text-sm text-red-700 mt-2">
            醫療數據處理遇到問題。為了您的安全，請重新整理頁面或聯繫技術支援。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
          >
            重新整理頁面
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// API 錯誤邊界
export function ApiErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      context="API Communication"
      fallback={
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h3 className="text-sm font-medium text-yellow-800">
              網絡連接錯誤
            </h3>
          </div>
          <p className="text-sm text-yellow-700 mt-2">
            無法連接到服務器。請檢查您的網絡連接並重試。
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}