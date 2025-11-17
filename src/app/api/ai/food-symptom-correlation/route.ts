/**
 * API endpoint for comprehensive food-symptom correlation analysis
 * POST /api/ai/food-symptom-correlation
 */

import { NextRequest, NextResponse } from 'next/server';
import { FoodSymptomCorrelator, type CorrelationMatrix } from '@/lib/ai/food-symptom-correlator';
import { DailySymptomService } from '@/lib/supabase/daily-symptom-service';
import { createAdminClient } from '@/lib/supabase/server';

interface CorrelationRequest {
  user_id: string;
  analysis_options?: {
    analysis_window_months?: number;
    min_sample_size?: number;
    include_weak_correlations?: boolean;
    confidence_level?: number;
    time_windows?: number[];
  };
}

interface CorrelationResponse {
  success: boolean;
  message: string;
  data?: CorrelationMatrix;
  error?: string;
  metadata?: {
    processing_time_ms: number;
    cache_hit: boolean;
    analysis_quality: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<CorrelationResponse>> {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: CorrelationRequest = await request.json();

    if (!body.user_id) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required',
        error: 'MISSING_USER_ID'
      }, { status: 400 });
    }

    // Set default analysis options
    const analysisOptions = {
      analysis_window_months: 3,
      min_sample_size: 10,
      include_weak_correlations: false,
      confidence_level: 0.95,
      ...body.analysis_options
    };

    console.log(`🔬 Starting correlation analysis for user: ${body.user_id}`);
    console.log(`📊 Analysis options:`, analysisOptions);

    // Check for cached results first
    const cachedResult = await getCachedCorrelationResult(body.user_id, analysisOptions);
    if (cachedResult) {
      console.log(`⚡ Returning cached correlation result`);
      return NextResponse.json({
        success: true,
        message: 'Correlation analysis retrieved from cache',
        data: cachedResult,
        metadata: {
          processing_time_ms: Date.now() - startTime,
          cache_hit: true,
          analysis_quality: 'cached'
        }
      });
    }

    // Get symptom entries
    const symptomEntries = await DailySymptomService.getRecentEntries(
      body.user_id,
      analysisOptions.analysis_window_months * 30 // Approximate days
    );

    if (symptomEntries.length < analysisOptions.min_sample_size) {
      return NextResponse.json({
        success: false,
        message: `Insufficient symptom data. Need at least ${analysisOptions.min_sample_size} entries, found ${symptomEntries.length}`,
        error: 'INSUFFICIENT_SYMPTOM_DATA'
      }, { status: 400 });
    }

    // Get food entries from the database
    const foodEntries = await getFoodEntriesForUser(body.user_id, analysisOptions.analysis_window_months);

    if (foodEntries.length < analysisOptions.min_sample_size) {
      return NextResponse.json({
        success: false,
        message: `Insufficient food data. Need at least ${analysisOptions.min_sample_size} entries, found ${foodEntries.length}`,
        error: 'INSUFFICIENT_FOOD_DATA'
      }, { status: 400 });
    }

    console.log(`📈 Analyzing ${symptomEntries.length} symptom entries and ${foodEntries.length} food entries`);

    // Perform comprehensive correlation analysis
    const correlationMatrix = await FoodSymptomCorrelator.performComprehensiveAnalysis(
      body.user_id,
      symptomEntries,
      foodEntries,
      analysisOptions
    );

    // Cache the results
    await cacheCorrelationResult(body.user_id, correlationMatrix, analysisOptions);

    // Determine analysis quality
    const analysisQuality = determineOverallAnalysisQuality(correlationMatrix);

    console.log(`✅ Correlation analysis completed: ${correlationMatrix.food_insights.length} food insights generated`);

    return NextResponse.json({
      success: true,
      message: `Correlation analysis completed successfully. Found ${correlationMatrix.food_insights.length} food-symptom relationships.`,
      data: correlationMatrix,
      metadata: {
        processing_time_ms: Date.now() - startTime,
        cache_hit: false,
        analysis_quality: analysisQuality
      }
    });

  } catch (error) {
    console.error('❌ Error in correlation analysis:', error);

    return NextResponse.json({
      success: false,
      message: 'Internal server error during correlation analysis',
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        processing_time_ms: Date.now() - startTime,
        cache_hit: false,
        analysis_quality: 'error'
      }
    }, { status: 500 });
  }
}

/**
 * Get food entries for correlation analysis
 */
async function getFoodEntriesForUser(
  userId: string,
  analysisWindowMonths: number
): Promise<Array<{ id: string; name: string; category: string; consumed_at: Date }>> {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - analysisWindowMonths);

    // Query food entries - this assumes there's a food_entries table
    // You may need to adjust this based on your actual table structure
    const admin = createAdminClient()
    const { data: foodHistory, error } = await admin
      .from('food_history_entries') // Adjust table name as needed
      .select(`
        id,
        food_id,
        consumed_at,
        created_at,
        diet_daily_foods!inner (
          id,
          name,
          category
        )
      `)
      .eq('user_id', userId)
      .gte('consumed_at', startDate.toISOString())
      .lte('consumed_at', endDate.toISOString())
      .order('consumed_at', { ascending: false });

    if (error) {
      console.error('Error fetching food entries:', error);
      throw new Error(`Failed to fetch food entries: ${error.message}`);
    }

    // Transform the data to the expected format
    return (foodHistory || []).map(entry => ({
      id: entry.diet_daily_foods.id,
      name: entry.diet_daily_foods.name,
      category: entry.diet_daily_foods.category || 'Unknown',
      consumed_at: new Date(entry.consumed_at)
    }));

  } catch (error) {
    console.error('Error in getFoodEntriesForUser:', error);
    throw error;
  }
}

/**
 * Check for cached correlation results
 */
async function getCachedCorrelationResult(
  userId: string,
  analysisOptions: any
): Promise<CorrelationMatrix | null> {
  try {
    // Create a cache key based on user and options
    const cacheKey = createCacheKey(userId, analysisOptions);

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('correlation_analysis_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('Error checking cache:', error);
      return null;
    }

    if (data) {
      return JSON.parse(data.correlation_data);
    }

    return null;
  } catch (error) {
    console.warn('Error retrieving cached correlation result:', error);
    return null;
  }
}

/**
 * Cache correlation results
 */
async function cacheCorrelationResult(
  userId: string,
  correlationMatrix: CorrelationMatrix,
  analysisOptions: any
): Promise<void> {
  try {
    const cacheKey = createCacheKey(userId, analysisOptions);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 6); // Cache for 6 hours

    const admin = createAdminClient()
    const { error } = await admin
      .from('correlation_analysis_cache')
      .upsert({
        cache_key: cacheKey,
        user_id: userId,
        correlation_data: JSON.stringify(correlationMatrix),
        analysis_options: analysisOptions,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Error caching correlation result:', error);
    }
  } catch (error) {
    console.warn('Error in cacheCorrelationResult:', error);
  }
}

/**
 * Create cache key from user ID and analysis options
 */
function createCacheKey(userId: string, analysisOptions: any): string {
  const optionsHash = Buffer.from(JSON.stringify(analysisOptions)).toString('base64');
  return `correlation_${userId}_${optionsHash}`;
}

/**
 * Determine overall analysis quality
 */
function determineOverallAnalysisQuality(correlationMatrix: CorrelationMatrix): string {
  const { analysis_metadata, food_insights } = correlationMatrix;

  // Check data sufficiency
  const totalEntries = analysis_metadata.total_food_entries + analysis_metadata.total_symptom_entries;
  const hasGoodSampleSize = totalEntries >= 100;

  // Check reliability
  const reliabilityScore = analysis_metadata.recommendations_reliability;
  const hasReliableRecommendations = reliabilityScore >= 0.7;

  // Check correlation strength distribution
  const strongCorrelations = analysis_metadata.correlation_strength_distribution.strong || 0;
  const hasStrongCorrelations = strongCorrelations >= 3;

  if (hasGoodSampleSize && hasReliableRecommendations && hasStrongCorrelations) {
    return 'excellent';
  } else if ((hasGoodSampleSize && hasReliableRecommendations) || hasStrongCorrelations) {
    return 'good';
  } else if (hasGoodSampleSize || hasReliableRecommendations) {
    return 'adequate';
  } else {
    return 'limited';
  }
}

// Handle GET requests for retrieving cached results
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required',
        error: 'MISSING_USER_ID'
      }, { status: 400 });
    }

    // Get the most recent cached correlation analysis for this user
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('correlation_analysis_cache')
      .select('*')
      .eq('user_id', userId)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        message: 'No cached correlation analysis found',
        error: 'NO_CACHED_DATA'
      }, { status: 404 });
    }

    const correlationMatrix: CorrelationMatrix = JSON.parse(data.correlation_data);

    return NextResponse.json({
      success: true,
      message: 'Cached correlation analysis retrieved successfully',
      data: correlationMatrix,
      metadata: {
        processing_time_ms: 0,
        cache_hit: true,
        analysis_quality: 'cached',
        cached_at: data.created_at,
        expires_at: data.expires_at
      }
    });

  } catch (error) {
    console.error('Error retrieving cached correlation analysis:', error);

    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}