/**
 * 全局錯誤處理鉤子
 * 提供統一的錯誤處理、報告和恢復機制
 */

'use client';

import { useCallback, useState } from 'react';
import { logError, logWarn, logMedical } from '@/lib/logger';

export interface ErrorDetails {
  message: string;
  code?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  context?: string;
  timestamp?: string;
}

export interface ErrorHandlerState {
  error: ErrorDetails | null;
  isLoading: boolean;
  retryCount: number;
}

interface UseErrorHandlerOptions {
  maxRetries?: number;
  onError?: (error: ErrorDetails) => void;
  autoRetry?: boolean;
  context?: string;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    maxRetries = 3,
    onError,
    autoRetry = false,
    context = 'Unknown'
  } = options;

  const [state, setState] = useState<ErrorHandlerState>({
    error: null,
    isLoading: false,
    retryCount: 0
  });

  // 清除錯誤狀態
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      retryCount: 0
    }));
  }, []);

  // 處理錯誤
  const handleError = useCallback((
    error: Error | string | ErrorDetails,
    additionalContext?: Record<string, any>
  ) => {
    let errorDetails: ErrorDetails;

    // 標準化錯誤格式
    if (typeof error === 'string') {
      errorDetails = {
        message: error,
        severity: 'medium',
        recoverable: true,
        context,
        timestamp: new Date().toISOString()
      };
    } else if (error instanceof Error) {
      errorDetails = {
        message: error.message,
        code: error.name,
        severity: determineSeverity(error),
        recoverable: isRecoverable(error),
        context,
        timestamp: new Date().toISOString()
      };
    } else {
      errorDetails = {
        ...error,
        context: error.context || context,
        timestamp: error.timestamp || new Date().toISOString()
      };
    }

    // 記錄錯誤
    const logContext = {
      component: 'useErrorHandler',
      context: errorDetails.context,
      severity: errorDetails.severity,
      recoverable: errorDetails.recoverable,
      retryCount: state.retryCount,
      ...additionalContext
    };

    if (errorDetails.severity === 'critical') {
      logError(errorDetails.message, logContext);
    } else if (errorDetails.severity === 'high') {
      logError(errorDetails.message, logContext);
    } else if (errorDetails.severity === 'medium') {
      logWarn(errorDetails.message, logContext);
    }

    // 醫療相關錯誤的特殊處理
    if (context.includes('Medical') || context.includes('medical')) {
      logMedical('Medical error occurred', logContext, 'error_handling');
    }

    // 更新狀態
    setState(prev => ({
      ...prev,
      error: errorDetails,
      isLoading: false
    }));

    // 調用外部錯誤處理器
    if (onError) {
      onError(errorDetails);
    }

    // 自動重試邏輯
    if (autoRetry && errorDetails.recoverable && state.retryCount < maxRetries) {
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          retryCount: prev.retryCount + 1
        }));
      }, 1000 * Math.pow(2, state.retryCount)); // 指數退避
    }
  }, [context, onError, autoRetry, maxRetries, state.retryCount]);

  // 重試函數
  const retry = useCallback((retryFunction?: () => Promise<void> | void) => {
    if (state.retryCount >= maxRetries) {
      handleError('已達到最大重試次數', { maxRetries, retryCount: state.retryCount });
      return;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      retryCount: prev.retryCount + 1
    }));

    if (retryFunction) {
      try {
        const result = retryFunction();
        if (result instanceof Promise) {
          result
            .then(() => clearError())
            .catch((error) => handleError(error));
        } else {
          clearError();
        }
      } catch (error) {
        handleError(error as Error);
      }
    } else {
      clearError();
    }
  }, [state.retryCount, maxRetries, handleError, clearError]);

  // 安全執行函數（包裝異步操作）
  const safeExecute = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage?: string
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await operation();
      setState(prev => ({ ...prev, isLoading: false }));
      return result;
    } catch (error) {
      const message = errorMessage || '操作執行失敗';
      handleError(error as Error, { originalMessage: message });
      return null;
    }
  }, [handleError]);

  // 醫療安全執行（醫療操作的特殊包裝）
  const medicalSafeExecute = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const result = await operation();
      logMedical(`Medical operation completed: ${operationName}`, {
        component: 'useErrorHandler',
        operation: operationName
      }, 'success');
      setState(prev => ({ ...prev, isLoading: false }));
      return result;
    } catch (error) {
      const errorDetails: ErrorDetails = {
        message: `醫療操作失敗: ${operationName}`,
        severity: 'high',
        recoverable: true,
        context: 'Medical Operation'
      };
      handleError(errorDetails, { operation: operationName });
      return null;
    }
  }, [handleError]);

  return {
    // 狀態
    error: state.error,
    isLoading: state.isLoading,
    retryCount: state.retryCount,
    canRetry: state.retryCount < maxRetries,

    // 方法
    handleError,
    clearError,
    retry,
    safeExecute,
    medicalSafeExecute
  };
}

// 輔助函數：確定錯誤嚴重程度
function determineSeverity(error: Error): ErrorDetails['severity'] {
  const message = error.message.toLowerCase();

  if (message.includes('medical') || message.includes('health') || message.includes('patient')) {
    return 'critical';
  }

  if (message.includes('network') || message.includes('fetch') || message.includes('api')) {
    return 'high';
  }

  if (message.includes('validation') || message.includes('format')) {
    return 'medium';
  }

  return 'low';
}

// 輔助函數：判斷錯誤是否可恢復
function isRecoverable(error: Error): boolean {
  const message = error.message.toLowerCase();

  // 不可恢復的錯誤
  if (message.includes('permission') || message.includes('unauthorized') ||
      message.includes('forbidden') || message.includes('authentication')) {
    return false;
  }

  // 網絡錯誤通常可以重試
  if (message.includes('network') || message.includes('fetch') ||
      message.includes('timeout') || message.includes('connection')) {
    return true;
  }

  // 默認為可恢復
  return true;
}