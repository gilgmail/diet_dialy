/**
 * Hook for managing food-symptom correlation analysis
 */

import { useState, useCallback } from 'react';
import type { CorrelationMatrix } from '@/lib/ai/food-symptom-correlator';

interface AnalysisOptions {
  analysis_window_months?: number;
  min_sample_size?: number;
  include_weak_correlations?: boolean;
  confidence_level?: number;
}

interface UseCorrelationAnalysisReturn {
  correlationData: CorrelationMatrix | null;
  isLoading: boolean;
  error: string | null;
  isAnalyzing: boolean;
  performAnalysis: (userId: string, options?: AnalysisOptions) => Promise<CorrelationMatrix>;
  getCachedAnalysis: (userId: string) => Promise<CorrelationMatrix | null>;
  clearCache: () => void;
  retryAnalysis: () => void;
}

export const useCorrelationAnalysis = (): UseCorrelationAnalysisReturn => {
  const [correlationData, setCorrelationData] = useState<CorrelationMatrix | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisParams, setLastAnalysisParams] = useState<{
    userId: string;
    options?: AnalysisOptions;
  } | null>(null);

  const performAnalysis = useCallback(async (
    userId: string,
    options: AnalysisOptions = {}
  ): Promise<CorrelationMatrix> => {
    setIsAnalyzing(true);
    setError(null);
    setLastAnalysisParams({ userId, options });

    try {
      console.log('🔬 Starting correlation analysis for user:', userId);

      const response = await fetch('/api/ai/food-symptom-correlation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          analysis_options: options
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Analysis failed');
      }

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      console.log(`✅ Analysis completed in ${result.metadata?.processing_time_ms}ms`);
      console.log(`📊 Analysis quality: ${result.metadata?.analysis_quality}`);

      const correlationMatrix = result.data;
      setCorrelationData(correlationMatrix);

      return correlationMatrix;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Correlation analysis error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const getCachedAnalysis = useCallback(async (userId: string): Promise<CorrelationMatrix | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Checking for cached correlation analysis');

      const response = await fetch(`/api/ai/food-symptom-correlation?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (response.status === 404) {
        // No cached data found
        console.log('💾 No cached correlation analysis found');
        return null;
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to retrieve cached analysis');
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to retrieve cached analysis');
      }

      console.log(`⚡ Retrieved cached analysis from ${result.metadata?.cached_at}`);

      const correlationMatrix = result.data;
      setCorrelationData(correlationMatrix);

      return correlationMatrix;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.warn('⚠️ Cache retrieval error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retryAnalysis = useCallback(() => {
    if (lastAnalysisParams) {
      performAnalysis(lastAnalysisParams.userId, lastAnalysisParams.options);
    }
  }, [lastAnalysisParams, performAnalysis]);

  const clearCache = useCallback(() => {
    setCorrelationData(null);
    setError(null);
    setLastAnalysisParams(null);
  }, []);

  return {
    correlationData,
    isLoading,
    error,
    isAnalyzing,
    performAnalysis,
    getCachedAnalysis,
    clearCache,
    retryAnalysis
  };
};