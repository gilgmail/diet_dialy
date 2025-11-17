/**
 * Symptom Pattern Analyzer
 * Analyzes symptom patterns and trends for users
 */

import { createAdminClient } from './server';
import { DailySymptomService } from './daily-symptom-service';
import type {
  SymptomPatternAnalysis,
  SymptomTrendData,
  DailySymptomEntry,
  CoreSymptomScores
} from '@/types/medical';

export interface AnalysisOptions {
  analysisMethod?: 'statistical' | 'ai_enhanced' | 'hybrid';
  minDataPoints?: number;
  includeWeekendSeparately?: boolean;
  includeFoodCorrelations?: boolean;
  confidenceThreshold?: number;
}

export class SymptomPatternAnalyzer {
  /**
   * Get latest pattern analysis for user and period
   */
  static async getLatestPatternAnalysis(
    userId: string,
    period: 'weekly' | 'monthly' | 'quarterly'
  ): Promise<SymptomPatternAnalysis | null> {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('symptom_patterns')
        .select('*')
        .eq('user_id', userId)
        .eq('analysis_period', period)
        .order('computed_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No analysis found
        }
        console.error('Error fetching latest pattern analysis:', error);
        throw error;
      }

      return this.transformDatabasePattern(data);
    } catch (error) {
      console.error('Error in getLatestPatternAnalysis:', error);
      throw error;
    }
  }

  /**
   * Compute new pattern analysis
   */
  static async computePatternAnalysis(
    userId: string,
    period: 'weekly' | 'monthly' | 'quarterly',
    startDate: Date,
    endDate: Date,
    forceRecompute: boolean = false,
    options: AnalysisOptions = {}
  ): Promise<SymptomPatternAnalysis | null> {
    try {
      console.log(`🔬 Computing ${period} pattern analysis for user ${userId}`);

      // Check if analysis already exists
      if (!forceRecompute) {
        const existing = await this.getExistingAnalysis(userId, period, startDate, endDate);
        if (existing) {
          console.log('📊 Using existing pattern analysis');
          return existing;
        }
      }

      // Get symptom entries for the period
      const entries = await DailySymptomService.getEntriesByRange(
        userId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      console.log(`📈 Analyzing ${entries.length} symptom entries`);

      // Check minimum data requirement
      const minDataPoints = options.minDataPoints || 5;
      if (entries.length < minDataPoints) {
        console.log(`⚠️ Insufficient data: ${entries.length} < ${minDataPoints} required`);
        return null;
      }

      // Compute trend data for each core symptom
      const overallHealthTrend = this.computeSymptomTrend(entries, 'overall_health');
      const abdominalPainTrend = this.computeSymptomTrend(entries, 'abdominal_pain');
      const diarrheaTrend = this.computeSymptomTrend(entries, 'diarrhea');
      const bloodyStoolTrend = this.computeSymptomTrend(entries, 'bloody_stool');
      const bloatingTrend = this.computeSymptomTrend(entries, 'bloating');

      // Compute pattern insights
      const symptomFrequency = this.computeSymptomFrequency(entries);
      const worstDaysPattern = this.computeDayOfWeekPatterns(entries, 'worst');
      const bestDaysPattern = this.computeDayOfWeekPatterns(entries, 'best');

      // Compute correlations if requested
      let foodCorrelations = {};
      let medicationEffectiveness = {};
      const lifestyleCorrelations = this.computeLifestyleCorrelations(entries);

      if (options.includeFoodCorrelations) {
        foodCorrelations = await this.computeFoodCorrelations(entries);
      }

      // Identify triggers and protective factors
      const identifiedTriggers = this.identifyTriggers(entries);
      const protectiveFa = this.identifyProtectiveFactors(entries);

      // Compute statistical measures
      const overallStabilityScore = this.computeStabilityScore(entries);
      const improvementRate = this.computeImprovementRate(entries);

      // Assess data quality and confidence
      const dataQualityScore = this.assessDataQuality(entries);
      const analysisConfidence = this.computeAnalysisConfidence(entries, options);

      // Create pattern analysis object
      const analysis: Omit<SymptomPatternAnalysis, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        analysis_period: period,
        period_start: startDate,
        period_end: endDate,

        // Core symptom trends
        overall_health_trend: overallHealthTrend,
        abdominal_pain_trend: abdominalPainTrend,
        diarrhea_trend: diarrheaTrend,
        bloody_stool_trend: bloodyStoolTrend,
        bloating_trend: bloatingTrend,

        // Pattern insights
        symptom_frequency: symptomFrequency,
        worst_days_pattern: worstDaysPattern,
        best_days_pattern: bestDaysPattern,

        // Correlations
        food_correlations: foodCorrelations,
        medication_effectiveness: medicationEffectiveness,
        lifestyle_correlations: lifestyleCorrelations,

        // Risk factors
        identified_triggers: identifiedTriggers,
        protective_factors: protectiveFa,

        // Statistical measures
        overall_stability_score: overallStabilityScore,
        improvement_rate: improvementRate,

        // Confidence metrics
        data_quality_score: dataQualityScore,
        analysis_confidence: analysisConfidence,

        // Metadata
        analysis_method: options.analysisMethod || 'statistical',
        computed_at: new Date()
      };

      // Save to database
      const savedAnalysis = await this.savePatternAnalysis(analysis);

      console.log('✅ Successfully computed pattern analysis');
      return savedAnalysis;

    } catch (error) {
      console.error('Error in computePatternAnalysis:', error);
      throw error;
    }
  }

  /**
   * Delete pattern analysis
   */
  static async deletePatternAnalysis(analysisId: string, userId: string): Promise<boolean> {
    try {
      const admin = createAdminClient();
      const { error } = await admin
        .from('symptom_patterns')
        .delete()
        .eq('id', analysisId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting pattern analysis:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deletePatternAnalysis:', error);
      return false;
    }
  }

  /**
   * Delete all pattern analyses for a period
   */
  static async deletePatternAnalysesByPeriod(
    userId: string,
    period: 'weekly' | 'monthly' | 'quarterly'
  ): Promise<boolean> {
    try {
      const admin = createAdminClient();
      const { error} = await admin
        .from('symptom_patterns')
        .delete()
        .eq('user_id', userId)
        .eq('analysis_period', period);

      if (error) {
        console.error('Error deleting pattern analyses by period:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deletePatternAnalysesByPeriod:', error);
      return false;
    }
  }

  /**
   * Get period start date
   */
  static getPeriodStart(date: Date, period: 'weekly' | 'monthly' | 'quarterly'): Date {
    const start = new Date(date);

    switch (period) {
      case 'weekly':
        // Start of current week (Monday)
        const dayOfWeek = start.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start.setDate(start.getDate() - daysToMonday);
        break;

      case 'monthly':
        // Start of current month
        start.setDate(1);
        break;

      case 'quarterly':
        // Start of current quarter
        const month = start.getMonth();
        const quarterStartMonth = Math.floor(month / 3) * 3;
        start.setMonth(quarterStartMonth, 1);
        break;
    }

    start.setHours(0, 0, 0, 0);
    return start;
  }

  /**
   * Private methods for analysis computation
   */

  private static async getExistingAnalysis(
    userId: string,
    period: 'weekly' | 'monthly' | 'quarterly',
    startDate: Date,
    endDate: Date
  ): Promise<SymptomPatternAnalysis | null> {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from('symptom_patterns')
        .select('*')
        .eq('user_id', userId)
        .eq('analysis_period', period)
        .eq('period_start', startDate.toISOString().split('T')[0])
        .eq('period_end', endDate.toISOString().split('T')[0])
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return this.transformDatabasePattern(data);
    } catch (error) {
      return null;
    }
  }

  private static computeSymptomTrend(
    entries: DailySymptomEntry[],
    symptom: keyof CoreSymptomScores
  ): SymptomTrendData {
    if (entries.length === 0) {
      return {
        average: 0,
        trend_direction: 'stable',
        stability: 0,
        weekly_change: 0,
        monthly_change: 0
      };
    }

    // Sort by date ascending for trend calculation
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime()
    );

    const values = sortedEntries.map(entry => entry[symptom]);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Compute trend direction using linear regression
    const trendSlope = this.computeTrendSlope(values);
    let trendDirection: 'improving' | 'stable' | 'worsening' = 'stable';

    if (symptom === 'overall_health') {
      // For health, higher is better
      if (trendSlope > 0.1) trendDirection = 'improving';
      else if (trendSlope < -0.1) trendDirection = 'worsening';
    } else {
      // For symptoms, lower is better
      if (trendSlope < -0.1) trendDirection = 'improving';
      else if (trendSlope > 0.1) trendDirection = 'worsening';
    }

    // Compute stability (inverse of variance)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
    const stability = Math.max(0, 1 - (variance / 25)); // Normalize to 0-1

    // Compute changes
    const weeklyChange = this.computePeriodicChange(sortedEntries, symptom, 7);
    const monthlyChange = this.computePeriodicChange(sortedEntries, symptom, 30);

    return {
      average,
      trend_direction: trendDirection,
      stability,
      weekly_change: weeklyChange,
      monthly_change: monthlyChange
    };
  }

  private static computeTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private static computePeriodicChange(
    entries: DailySymptomEntry[],
    symptom: keyof CoreSymptomScores,
    days: number
  ): number {
    if (entries.length < days) return 0;

    const recent = entries.slice(-days);
    const previous = entries.slice(0, -days);

    if (previous.length === 0) return 0;

    const recentAvg = recent.reduce((sum, entry) => sum + entry[symptom], 0) / recent.length;
    const previousAvg = previous.reduce((sum, entry) => sum + entry[symptom], 0) / previous.length;

    return recentAvg - previousAvg;
  }

  private static computeSymptomFrequency(entries: DailySymptomEntry[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    const totalDays = entries.length;

    if (totalDays === 0) return frequency;

    // Count days with each symptom present (score > 0)
    const symptoms: (keyof CoreSymptomScores)[] = [
      'abdominal_pain', 'diarrhea', 'bloody_stool', 'bloating'
    ];

    for (const symptom of symptoms) {
      const daysWithSymptom = entries.filter(entry => entry[symptom] > 0).length;
      frequency[symptom] = daysWithSymptom / totalDays;
    }

    return frequency;
  }

  private static computeDayOfWeekPatterns(
    entries: DailySymptomEntry[],
    type: 'worst' | 'best'
  ): Record<string, number> {
    const patterns: Record<string, number> = {
      monday: 0, tuesday: 0, wednesday: 0, thursday: 0,
      friday: 0, saturday: 0, sunday: 0
    };

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    if (entries.length === 0) return patterns;

    // Calculate total symptom score for each entry
    const entriesWithTotalScore = entries.map(entry => ({
      ...entry,
      totalSymptomScore: entry.abdominal_pain + entry.diarrhea + entry.bloody_stool + entry.bloating,
      dayOfWeek: new Date(entry.recorded_date).getDay()
    }));

    // Determine threshold for worst/best days
    const totalScores = entriesWithTotalScore.map(e => e.totalSymptomScore);
    const avgScore = totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length;

    const targetEntries = type === 'worst'
      ? entriesWithTotalScore.filter(e => e.totalSymptomScore > avgScore)
      : entriesWithTotalScore.filter(e => e.totalSymptomScore <= avgScore);

    // Count occurrences by day of week
    for (const entry of targetEntries) {
      const dayName = dayNames[entry.dayOfWeek];
      patterns[dayName]++;
    }

    // Convert to percentages
    const total = targetEntries.length;
    if (total > 0) {
      for (const day in patterns) {
        patterns[day] = patterns[day] / total;
      }
    }

    return patterns;
  }

  private static computeLifestyleCorrelations(entries: DailySymptomEntry[]): Record<string, number> {
    const correlations: Record<string, number> = {};

    if (entries.length < 5) return correlations;

    // Compute correlations with contextual factors
    const contextFactors = ['mood_score', 'energy_level', 'sleep_quality', 'stress_level'] as const;

    for (const factor of contextFactors) {
      const factorValues = entries
        .filter(entry => entry[factor] !== undefined)
        .map(entry => entry[factor]!);

      if (factorValues.length < 3) continue;

      // Correlate with total symptom score
      const symptomScores = entries
        .filter(entry => entry[factor] !== undefined)
        .map(entry => entry.abdominal_pain + entry.diarrhea + entry.bloody_stool + entry.bloating);

      const correlation = this.computeCorrelation(factorValues, symptomScores);
      correlations[factor] = correlation;
    }

    return correlations;
  }

  private static computeCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private static async computeFoodCorrelations(entries: DailySymptomEntry[]): Promise<Record<string, number>> {
    // This would integrate with food entry data
    // For now, return empty object as placeholder
    return {};
  }

  private static identifyTriggers(entries: DailySymptomEntry[]): string[] {
    const triggers = new Set<string>();

    // Collect all triggers mentioned in entries
    for (const entry of entries) {
      for (const trigger of entry.triggers_identified) {
        triggers.add(trigger);
      }
    }

    // Filter to most frequently mentioned triggers
    const triggerCounts: Record<string, number> = {};
    for (const trigger of triggers) {
      triggerCounts[trigger] = entries.filter(entry =>
        entry.triggers_identified.includes(trigger)
      ).length;
    }

    // Return triggers mentioned in at least 20% of entries
    const threshold = Math.max(1, entries.length * 0.2);
    return Object.entries(triggerCounts)
      .filter(([_, count]) => count >= threshold)
      .map(([trigger]) => trigger);
  }

  private static identifyProtectiveFactors(entries: DailySymptomEntry[]): string[] {
    const factors = new Set<string>();

    // Collect all improvement factors
    for (const entry of entries) {
      for (const factor of entry.improvement_factors) {
        factors.add(factor);
      }
    }

    // Filter to most frequently mentioned factors
    const factorCounts: Record<string, number> = {};
    for (const factor of factors) {
      factorCounts[factor] = entries.filter(entry =>
        entry.improvement_factors.includes(factor)
      ).length;
    }

    // Return factors mentioned in at least 20% of entries
    const threshold = Math.max(1, entries.length * 0.2);
    return Object.entries(factorCounts)
      .filter(([_, count]) => count >= threshold)
      .map(([factor]) => factor);
  }

  private static computeStabilityScore(entries: DailySymptomEntry[]): number {
    if (entries.length < 2) return 0;

    // Compute daily changes in total symptom score
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime()
    );

    const dailyChanges: number[] = [];
    for (let i = 1; i < sortedEntries.length; i++) {
      const prevTotal = sortedEntries[i-1].abdominal_pain + sortedEntries[i-1].diarrhea +
                       sortedEntries[i-1].bloody_stool + sortedEntries[i-1].bloating;
      const currTotal = sortedEntries[i].abdominal_pain + sortedEntries[i].diarrhea +
                       sortedEntries[i].bloody_stool + sortedEntries[i].bloating;
      dailyChanges.push(Math.abs(currTotal - prevTotal));
    }

    // Stability = 1 - (average daily change / max possible change)
    const avgChange = dailyChanges.reduce((sum, change) => sum + change, 0) / dailyChanges.length;
    const maxPossibleChange = 20; // Max total symptom score
    return Math.max(0, 1 - (avgChange / maxPossibleChange));
  }

  private static computeImprovementRate(entries: DailySymptomEntry[]): number {
    if (entries.length < 2) return 0;

    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime()
    );

    // Compare first and last periods
    const periodSize = Math.max(1, Math.floor(entries.length / 3));
    const firstPeriod = sortedEntries.slice(0, periodSize);
    const lastPeriod = sortedEntries.slice(-periodSize);

    const firstAvgHealth = firstPeriod.reduce((sum, entry) => sum + entry.overall_health, 0) / firstPeriod.length;
    const lastAvgHealth = lastPeriod.reduce((sum, entry) => sum + entry.overall_health, 0) / lastPeriod.length;

    // Improvement rate: -1 (getting worse) to 1 (improving)
    const healthChange = (lastAvgHealth - firstAvgHealth) / 4; // Normalize to -1 to 1
    return Math.max(-1, Math.min(1, healthChange));
  }

  private static assessDataQuality(entries: DailySymptomEntry[]): number {
    if (entries.length === 0) return 0;

    let qualityScore = 0;
    let factors = 0;

    // Completeness of core data
    const coreCompleteEntries = entries.filter(entry =>
      entry.overall_health > 0 && // Has health score
      entry.data_completeness_score > 0.5
    ).length;
    qualityScore += (coreCompleteEntries / entries.length) * 0.4;
    factors += 0.4;

    // Consistency in reporting
    const avgDataCompleteness = entries.reduce((sum, entry) =>
      sum + entry.data_completeness_score, 0) / entries.length;
    qualityScore += avgDataCompleteness * 0.3;
    factors += 0.3;

    // Regularity of entries (no big gaps)
    const regularityScore = this.assessEntryRegularity(entries);
    qualityScore += regularityScore * 0.3;
    factors += 0.3;

    return factors > 0 ? qualityScore / factors : 0;
  }

  private static assessEntryRegularity(entries: DailySymptomEntry[]): number {
    if (entries.length < 2) return 1;

    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.recorded_date).getTime() - new Date(b.recorded_date).getTime()
    );

    // Calculate gaps between entries
    const gaps: number[] = [];
    for (let i = 1; i < sortedEntries.length; i++) {
      const prevDate = new Date(sortedEntries[i-1].recorded_date);
      const currDate = new Date(sortedEntries[i].recorded_date);
      const gapDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gapDays);
    }

    // Penalize large gaps
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const maxGap = Math.max(...gaps);

    // Good regularity = average gap close to 1 day, max gap not too large
    let regularityScore = 1;
    if (avgGap > 2) regularityScore -= (avgGap - 2) * 0.1;
    if (maxGap > 7) regularityScore -= (maxGap - 7) * 0.05;

    return Math.max(0, regularityScore);
  }

  private static computeAnalysisConfidence(
    entries: DailySymptomEntry[],
    options: AnalysisOptions
  ): number {
    let confidence = 0;

    // Sample size factor
    const sampleSizeFactor = Math.min(1, entries.length / 30); // Ideal: 30+ entries
    confidence += sampleSizeFactor * 0.4;

    // Data quality factor
    const dataQuality = this.assessDataQuality(entries);
    confidence += dataQuality * 0.3;

    // Time span factor
    const timeSpan = this.getTimeSpanDays(entries);
    const timeSpanFactor = Math.min(1, timeSpan / 30); // Ideal: 30+ days
    confidence += timeSpanFactor * 0.2;

    // Analysis method factor
    const methodFactor = options.analysisMethod === 'ai_enhanced' ? 1 :
                        options.analysisMethod === 'hybrid' ? 0.8 : 0.6;
    confidence += methodFactor * 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  private static getTimeSpanDays(entries: DailySymptomEntry[]): number {
    if (entries.length < 2) return 0;

    const dates = entries.map(entry => new Date(entry.recorded_date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);

    return (maxDate - minDate) / (1000 * 60 * 60 * 24);
  }

  private static async savePatternAnalysis(
    analysis: Omit<SymptomPatternAnalysis, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SymptomPatternAnalysis> {
    try {
      const admin = createAdminClient();
      const dbData = this.transformPatternForDatabase(analysis);

      const { data, error } = await admin
        .from('symptom_patterns')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('Error saving pattern analysis:', error);
        throw error;
      }

      return this.transformDatabasePattern(data);
    } catch (error) {
      console.error('Error in savePatternAnalysis:', error);
      throw error;
    }
  }

  private static transformPatternForDatabase(pattern: any): any {
    const dbPattern = { ...pattern };

    // Convert Date objects to ISO strings
    if (pattern.period_start instanceof Date) {
      dbPattern.period_start = pattern.period_start.toISOString().split('T')[0];
    }
    if (pattern.period_end instanceof Date) {
      dbPattern.period_end = pattern.period_end.toISOString().split('T')[0];
    }
    if (pattern.computed_at instanceof Date) {
      dbPattern.computed_at = pattern.computed_at.toISOString();
    }

    return dbPattern;
  }

  private static transformDatabasePattern(dbPattern: any): SymptomPatternAnalysis {
    return {
      id: dbPattern.id,
      user_id: dbPattern.user_id,
      analysis_period: dbPattern.analysis_period,
      period_start: new Date(dbPattern.period_start),
      period_end: new Date(dbPattern.period_end),

      // Trends
      overall_health_trend: dbPattern.overall_health_trend,
      abdominal_pain_trend: dbPattern.abdominal_pain_trend,
      diarrhea_trend: dbPattern.diarrhea_trend,
      bloody_stool_trend: dbPattern.bloody_stool_trend,
      bloating_trend: dbPattern.bloating_trend,

      // Patterns
      symptom_frequency: dbPattern.symptom_frequency,
      worst_days_pattern: dbPattern.worst_days_pattern,
      best_days_pattern: dbPattern.best_days_pattern,

      // Correlations
      food_correlations: dbPattern.food_correlations,
      medication_effectiveness: dbPattern.medication_effectiveness,
      lifestyle_correlations: dbPattern.lifestyle_correlations,

      // Factors
      identified_triggers: dbPattern.identified_triggers,
      protective_factors: dbPattern.protective_factors,

      // Statistics
      overall_stability_score: dbPattern.overall_stability_score,
      improvement_rate: dbPattern.improvement_rate,
      data_quality_score: dbPattern.data_quality_score,
      analysis_confidence: dbPattern.analysis_confidence,

      // Metadata
      analysis_method: dbPattern.analysis_method,
      computed_at: new Date(dbPattern.computed_at),
      created_at: new Date(dbPattern.created_at),
      updated_at: new Date(dbPattern.updated_at)
    };
  }
}