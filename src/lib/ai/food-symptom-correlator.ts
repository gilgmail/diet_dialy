/**
 * Enhanced Food-Symptom Correlation Analysis Engine
 * Advanced statistical analysis with time windows, confidence intervals, and actionable insights
 */

import type {
  DailySymptomEntry,
  CoreSymptomScores,
  SymptomFoodCorrelation
} from '@/types/medical';

export interface CorrelationAnalysisResult {
  correlation_coefficient: number; // Pearson correlation (-1 to 1)
  p_value: number; // Statistical significance
  confidence_interval: [number, number]; // 95% confidence interval
  sample_size: number;
  effect_size: 'small' | 'medium' | 'large' | 'very_large';
  statistical_significance: 'not_significant' | 'marginally_significant' | 'significant' | 'highly_significant';
}

export interface TimeWindowAnalysis {
  time_window_hours: number;
  correlations: Record<keyof CoreSymptomScores, CorrelationAnalysisResult>;
  optimal_window: boolean; // True if this is the strongest correlation window
  lag_analysis: {
    peak_correlation_time: number; // Hours after consumption when correlation peaks
    correlation_duration: number; // How long the correlation lasts
  };
}

export interface FoodSymptomInsight {
  food_id: string;
  food_name: string;
  food_category: string;

  // Multi-window analysis
  time_windows: TimeWindowAnalysis[];
  overall_risk_assessment: {
    risk_level: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
    confidence_score: number; // 0-1
    recommendation: 'safe' | 'monitor' | 'limit' | 'avoid';
    reasoning: string[];
  };

  // Symptom-specific insights
  symptom_impacts: {
    [K in keyof CoreSymptomScores]: {
      correlation: number;
      confidence: number;
      clinical_significance: boolean;
      trend: 'improving' | 'stable' | 'worsening';
    };
  };

  // Actionable recommendations
  recommendations: {
    consumption_timing: string[];
    portion_suggestions: string[];
    monitoring_advice: string[];
    alternative_foods: string[];
  };

  // Statistical metadata
  analysis_quality: {
    data_sufficiency: 'insufficient' | 'minimal' | 'adequate' | 'good' | 'excellent';
    bias_assessment: string[];
    limitations: string[];
  };
}

export interface CorrelationMatrix {
  user_id: string;
  analysis_period: {
    start_date: Date;
    end_date: Date;
    total_days: number;
  };

  // Food insights ranked by risk
  food_insights: FoodSymptomInsight[];

  // Global patterns
  global_patterns: {
    most_problematic_foods: string[];
    safest_foods: string[];
    symptom_volatility: Record<keyof CoreSymptomScores, number>;
    weekly_patterns: Record<string, number>; // Day of week patterns
    seasonal_trends: Record<string, number>;
  };

  // Quality metrics
  analysis_metadata: {
    total_food_entries: number;
    total_symptom_entries: number;
    correlation_strength_distribution: Record<string, number>;
    confidence_distribution: Record<string, number>;
    recommendations_reliability: number;
  };
}

export class FoodSymptomCorrelator {
  private static readonly TIME_WINDOWS = [6, 12, 24, 48, 72]; // Hours
  private static readonly MIN_SAMPLE_SIZE = 10;
  private static readonly SIGNIFICANCE_LEVELS = {
    highly_significant: 0.01,
    significant: 0.05,
    marginally_significant: 0.1
  };

  /**
   * Perform comprehensive correlation analysis with multiple time windows
   */
  static async performComprehensiveAnalysis(
    userId: string,
    symptomEntries: DailySymptomEntry[],
    foodEntries: Array<{ id: string; name: string; category: string; consumed_at: Date }>,
    options: {
      analysisWindowMonths?: number;
      minSampleSize?: number;
      includeWeakCorrelations?: boolean;
      confidenceLevel?: number;
    } = {}
  ): Promise<CorrelationMatrix> {
    const {
      analysisWindowMonths = 3,
      minSampleSize = this.MIN_SAMPLE_SIZE,
      includeWeakCorrelations = false,
      confidenceLevel = 0.95
    } = options;

    // Filter data to analysis window
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - analysisWindowMonths);

    const filteredSymptomEntries = symptomEntries.filter(entry =>
      new Date(entry.recorded_date) >= startDate && new Date(entry.recorded_date) <= endDate
    );

    const filteredFoodEntries = foodEntries.filter(entry =>
      entry.consumed_at >= startDate && entry.consumed_at <= endDate
    );

    // Group foods by unique food ID
    const uniqueFoods = this.getUniqueFoods(filteredFoodEntries);

    // Analyze each food
    const foodInsights: FoodSymptomInsight[] = [];

    for (const food of uniqueFoods) {
      const foodConsumptions = filteredFoodEntries.filter(entry => entry.id === food.id);

      if (foodConsumptions.length < minSampleSize) {
        continue; // Skip foods with insufficient data
      }

      const insight = await this.analyzeFoodSymptomRelationship(
        food,
        foodConsumptions,
        filteredSymptomEntries,
        { includeWeakCorrelations, confidenceLevel }
      );

      if (insight) {
        foodInsights.push(insight);
      }
    }

    // Sort by risk level and confidence
    foodInsights.sort((a, b) => {
      const riskOrder = { 'very_high': 5, 'high': 4, 'moderate': 3, 'low': 2, 'very_low': 1 };
      const aRisk = riskOrder[a.overall_risk_assessment.risk_level];
      const bRisk = riskOrder[b.overall_risk_assessment.risk_level];

      if (aRisk !== bRisk) return bRisk - aRisk;
      return b.overall_risk_assessment.confidence_score - a.overall_risk_assessment.confidence_score;
    });

    // Calculate global patterns
    const globalPatterns = this.calculateGlobalPatterns(foodInsights, filteredSymptomEntries);

    return {
      user_id: userId,
      analysis_period: {
        start_date: startDate,
        end_date: endDate,
        total_days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      },
      food_insights: foodInsights,
      global_patterns: globalPatterns,
      analysis_metadata: {
        total_food_entries: filteredFoodEntries.length,
        total_symptom_entries: filteredSymptomEntries.length,
        correlation_strength_distribution: this.calculateCorrelationDistribution(foodInsights),
        confidence_distribution: this.calculateConfidenceDistribution(foodInsights),
        recommendations_reliability: this.calculateRecommendationsReliability(foodInsights)
      }
    };
  }

  /**
   * Analyze relationship between specific food and symptoms across multiple time windows
   */
  private static async analyzeFoodSymptomRelationship(
    food: { id: string; name: string; category: string },
    foodConsumptions: Array<{ consumed_at: Date }>,
    symptomEntries: DailySymptomEntry[],
    options: { includeWeakCorrelations: boolean; confidenceLevel: number }
  ): Promise<FoodSymptomInsight | null> {

    const timeWindowAnalyses: TimeWindowAnalysis[] = [];

    // Analyze each time window
    for (const windowHours of this.TIME_WINDOWS) {
      const windowAnalysis = this.analyzeTimeWindow(
        foodConsumptions,
        symptomEntries,
        windowHours,
        options.confidenceLevel
      );

      timeWindowAnalyses.push(windowAnalysis);
    }

    // Determine optimal window (strongest significant correlation)
    const optimalWindow = this.findOptimalTimeWindow(timeWindowAnalyses);
    if (optimalWindow !== null) {
      timeWindowAnalyses[optimalWindow].optimal_window = true;
    }

    // Calculate overall risk assessment
    const riskAssessment = this.calculateOverallRiskAssessment(timeWindowAnalyses, food);

    // Skip if no significant correlations found and weak correlations not included
    if (!options.includeWeakCorrelations && riskAssessment.risk_level === 'very_low') {
      return null;
    }

    // Generate symptom-specific insights
    const symptomImpacts = this.calculateSymptomImpacts(timeWindowAnalyses);

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskAssessment, symptomImpacts, food);

    // Assess analysis quality
    const analysisQuality = this.assessAnalysisQuality(foodConsumptions.length, timeWindowAnalyses);

    return {
      food_id: food.id,
      food_name: food.name,
      food_category: food.category,
      time_windows: timeWindowAnalyses,
      overall_risk_assessment: riskAssessment,
      symptom_impacts: symptomImpacts,
      recommendations,
      analysis_quality: analysisQuality
    };
  }

  /**
   * Analyze correlations within a specific time window
   */
  private static analyzeTimeWindow(
    foodConsumptions: Array<{ consumed_at: Date }>,
    symptomEntries: DailySymptomEntry[],
    windowHours: number,
    confidenceLevel: number
  ): TimeWindowAnalysis {

    const correlations: Record<keyof CoreSymptomScores, CorrelationAnalysisResult> = {} as any;

    const symptoms: (keyof CoreSymptomScores)[] = [
      'overall_health', 'abdominal_pain', 'diarrhea', 'bloody_stool', 'bloating'
    ];

    for (const symptom of symptoms) {
      correlations[symptom] = this.calculateCorrelationForSymptom(
        foodConsumptions,
        symptomEntries,
        symptom,
        windowHours,
        confidenceLevel
      );
    }

    // Calculate lag analysis
    const lagAnalysis = this.calculateLagAnalysis(foodConsumptions, symptomEntries, windowHours);

    return {
      time_window_hours: windowHours,
      correlations,
      optimal_window: false, // Will be set later
      lag_analysis: lagAnalysis
    };
  }

  /**
   * Calculate Pearson correlation with statistical significance for a specific symptom
   */
  private static calculateCorrelationForSymptom(
    foodConsumptions: Array<{ consumed_at: Date }>,
    symptomEntries: DailySymptomEntry[],
    symptom: keyof CoreSymptomScores,
    windowHours: number,
    confidenceLevel: number
  ): CorrelationAnalysisResult {

    // Create time series data
    const dataPoints: Array<{ hasFood: number; symptomValue: number }> = [];

    // For each symptom entry, check if food was consumed within the time window
    for (const entry of symptomEntries) {
      const entryDate = new Date(entry.recorded_date);

      // Check if any food consumption falls within the window before this symptom entry
      const hasRecentFood = foodConsumptions.some(consumption => {
        const timeDiff = entryDate.getTime() - consumption.consumed_at.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        return hoursDiff >= 0 && hoursDiff <= windowHours;
      });

      dataPoints.push({
        hasFood: hasRecentFood ? 1 : 0,
        symptomValue: entry[symptom]
      });
    }

    if (dataPoints.length < 3) {
      return this.createNullCorrelationResult(dataPoints.length);
    }

    // Calculate Pearson correlation
    const correlation = this.calculatePearsonCorrelation(
      dataPoints.map(d => d.hasFood),
      dataPoints.map(d => d.symptomValue)
    );

    // Calculate statistical significance (t-test)
    const { pValue, confidenceInterval } = this.calculateStatisticalSignificance(
      correlation,
      dataPoints.length,
      confidenceLevel
    );

    // Determine effect size
    const effectSize = this.categorizeEffectSize(Math.abs(correlation));

    // Determine statistical significance level
    const significance = this.categorizeSignificance(pValue);

    return {
      correlation_coefficient: correlation,
      p_value: pValue,
      confidence_interval: confidenceInterval,
      sample_size: dataPoints.length,
      effect_size: effectSize,
      statistical_significance: significance
    };
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private static calculatePearsonCorrelation(x: number[], y: number[]): number {
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

  /**
   * Calculate statistical significance and confidence intervals
   */
  private static calculateStatisticalSignificance(
    correlation: number,
    sampleSize: number,
    confidenceLevel: number
  ): { pValue: number; confidenceInterval: [number, number] } {

    if (sampleSize < 3) {
      return { pValue: 1, confidenceInterval: [0, 0] };
    }

    // Fisher's z-transformation for confidence interval
    const fisherZ = 0.5 * Math.log((1 + correlation) / (1 - correlation));
    const standardError = 1 / Math.sqrt(sampleSize - 3);

    // Z-score for confidence level
    const zScore = confidenceLevel === 0.95 ? 1.96 :
                   confidenceLevel === 0.99 ? 2.58 : 1.96;

    const lowerZ = fisherZ - zScore * standardError;
    const upperZ = fisherZ + zScore * standardError;

    // Transform back from Fisher's z
    const lowerBound = (Math.exp(2 * lowerZ) - 1) / (Math.exp(2 * lowerZ) + 1);
    const upperBound = (Math.exp(2 * upperZ) - 1) / (Math.exp(2 * upperZ) + 1);

    // Calculate p-value using t-distribution
    const tStatistic = correlation * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
    const degreesOfFreedom = sampleSize - 2;

    // Approximate p-value (simplified for this implementation)
    const pValue = degreesOfFreedom > 0 ?
      2 * (1 - this.tDistributionCDF(Math.abs(tStatistic), degreesOfFreedom)) : 1;

    return {
      pValue: Math.max(0, Math.min(1, pValue)),
      confidenceInterval: [lowerBound, upperBound]
    };
  }

  /**
   * Approximate t-distribution CDF (simplified)
   */
  private static tDistributionCDF(t: number, df: number): number {
    // Simplified approximation for t-distribution CDF
    if (df >= 30) {
      // Use normal approximation for large degrees of freedom
      return 0.5 * (1 + this.erf(t / Math.sqrt(2)));
    }

    // Simplified approximation for smaller df
    const x = df / (df + t * t);
    return 1 - 0.5 * Math.pow(x, df / 2);
  }

  /**
   * Error function approximation
   */
  private static erf(x: number): number {
    // Abramowitz and Stegun approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Helper functions for analysis
   */
  private static createNullCorrelationResult(sampleSize: number): CorrelationAnalysisResult {
    return {
      correlation_coefficient: 0,
      p_value: 1,
      confidence_interval: [0, 0],
      sample_size: sampleSize,
      effect_size: 'small',
      statistical_significance: 'not_significant'
    };
  }

  private static categorizeEffectSize(correlation: number): 'small' | 'medium' | 'large' | 'very_large' {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return 'very_large';
    if (abs >= 0.5) return 'large';
    if (abs >= 0.3) return 'medium';
    return 'small';
  }

  private static categorizeSignificance(pValue: number): 'not_significant' | 'marginally_significant' | 'significant' | 'highly_significant' {
    if (pValue <= this.SIGNIFICANCE_LEVELS.highly_significant) return 'highly_significant';
    if (pValue <= this.SIGNIFICANCE_LEVELS.significant) return 'significant';
    if (pValue <= this.SIGNIFICANCE_LEVELS.marginally_significant) return 'marginally_significant';
    return 'not_significant';
  }

  private static getUniqueFoods(foodEntries: Array<{ id: string; name: string; category: string }>): Array<{ id: string; name: string; category: string }> {
    const seen = new Set<string>();
    return foodEntries.filter(food => {
      if (seen.has(food.id)) return false;
      seen.add(food.id);
      return true;
    });
  }

  private static findOptimalTimeWindow(timeWindowAnalyses: TimeWindowAnalysis[]): number | null {
    let bestIndex = null;
    let bestScore = 0;

    timeWindowAnalyses.forEach((analysis, index) => {
      // Score based on significant correlations and effect sizes
      let score = 0;
      Object.values(analysis.correlations).forEach(corr => {
        if (corr.statistical_significance === 'highly_significant') score += 4;
        else if (corr.statistical_significance === 'significant') score += 3;
        else if (corr.statistical_significance === 'marginally_significant') score += 1;

        if (corr.effect_size === 'very_large') score += 3;
        else if (corr.effect_size === 'large') score += 2;
        else if (corr.effect_size === 'medium') score += 1;
      });

      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  private static calculateLagAnalysis(
    foodConsumptions: Array<{ consumed_at: Date }>,
    symptomEntries: DailySymptomEntry[],
    windowHours: number
  ): { peak_correlation_time: number; correlation_duration: number } {
    // Simplified lag analysis - in practice, this would be more sophisticated
    return {
      peak_correlation_time: windowHours / 2, // Assume peak at midpoint
      correlation_duration: windowHours * 0.8 // Assume correlation lasts most of the window
    };
  }

  private static calculateOverallRiskAssessment(
    timeWindowAnalyses: TimeWindowAnalysis[],
    food: { id: string; name: string; category: string }
  ): FoodSymptomInsight['overall_risk_assessment'] {
    // Calculate risk based on strongest correlations and statistical significance
    let maxRiskScore = 0;
    let totalConfidence = 0;
    let significantCorrelations = 0;
    const reasoning: string[] = [];

    timeWindowAnalyses.forEach(analysis => {
      Object.entries(analysis.correlations).forEach(([symptom, corr]) => {
        const riskContribution = Math.abs(corr.correlation_coefficient) *
          (corr.statistical_significance === 'highly_significant' ? 1.0 :
           corr.statistical_significance === 'significant' ? 0.8 :
           corr.statistical_significance === 'marginally_significant' ? 0.4 : 0.1);

        maxRiskScore = Math.max(maxRiskScore, riskContribution);

        if (corr.statistical_significance !== 'not_significant') {
          totalConfidence += 1 - corr.p_value;
          significantCorrelations++;

          if (corr.correlation_coefficient > 0.3) {
            reasoning.push(`Positive correlation with ${symptom} (r=${corr.correlation_coefficient.toFixed(2)}, p=${corr.p_value.toFixed(3)})`);
          }
        }
      });
    });

    const avgConfidence = significantCorrelations > 0 ? totalConfidence / significantCorrelations : 0;

    let riskLevel: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
    let recommendation: 'safe' | 'monitor' | 'limit' | 'avoid';

    if (maxRiskScore >= 0.7 && avgConfidence >= 0.8) {
      riskLevel = 'very_high';
      recommendation = 'avoid';
    } else if (maxRiskScore >= 0.5 && avgConfidence >= 0.6) {
      riskLevel = 'high';
      recommendation = 'limit';
    } else if (maxRiskScore >= 0.3 && avgConfidence >= 0.4) {
      riskLevel = 'moderate';
      recommendation = 'monitor';
    } else if (maxRiskScore >= 0.1) {
      riskLevel = 'low';
      recommendation = 'monitor';
    } else {
      riskLevel = 'very_low';
      recommendation = 'safe';
    }

    if (reasoning.length === 0) {
      reasoning.push('No significant correlations detected');
    }

    return {
      risk_level: riskLevel,
      confidence_score: avgConfidence,
      recommendation,
      reasoning
    };
  }

  private static calculateSymptomImpacts(
    timeWindowAnalyses: TimeWindowAnalysis[]
  ): FoodSymptomInsight['symptom_impacts'] {
    const symptoms: (keyof CoreSymptomScores)[] = [
      'overall_health', 'abdominal_pain', 'diarrhea', 'bloody_stool', 'bloating'
    ];

    const impacts: any = {};

    symptoms.forEach(symptom => {
      // Find the strongest correlation across all time windows for this symptom
      let bestCorrelation = 0;
      let bestConfidence = 0;
      let clinicallySignificant = false;

      timeWindowAnalyses.forEach(analysis => {
        const corr = analysis.correlations[symptom];
        if (Math.abs(corr.correlation_coefficient) > Math.abs(bestCorrelation)) {
          bestCorrelation = corr.correlation_coefficient;
          bestConfidence = 1 - corr.p_value;
          clinicallySignificant = corr.statistical_significance === 'significant' ||
                                 corr.statistical_significance === 'highly_significant';
        }
      });

      impacts[symptom] = {
        correlation: bestCorrelation,
        confidence: bestConfidence,
        clinical_significance: clinicallySignificant,
        trend: bestCorrelation > 0.1 ? 'worsening' :
               bestCorrelation < -0.1 ? 'improving' : 'stable'
      };
    });

    return impacts;
  }

  private static generateRecommendations(
    riskAssessment: FoodSymptomInsight['overall_risk_assessment'],
    symptomImpacts: FoodSymptomInsight['symptom_impacts'],
    food: { id: string; name: string; category: string }
  ): FoodSymptomInsight['recommendations'] {

    const recommendations: FoodSymptomInsight['recommendations'] = {
      consumption_timing: [],
      portion_suggestions: [],
      monitoring_advice: [],
      alternative_foods: []
    };

    // Generate recommendations based on risk level
    switch (riskAssessment.recommendation) {
      case 'avoid':
        recommendations.consumption_timing.push('Avoid consumption during symptom flares');
        recommendations.portion_suggestions.push('Consider complete elimination');
        recommendations.monitoring_advice.push('If consumed accidentally, monitor symptoms for 48-72 hours');
        break;

      case 'limit':
        recommendations.consumption_timing.push('Consume only during stable periods');
        recommendations.consumption_timing.push('Avoid within 2 hours of bedtime');
        recommendations.portion_suggestions.push('Limit to small portions');
        recommendations.portion_suggestions.push('Space consumption at least 48 hours apart');
        recommendations.monitoring_advice.push('Track symptoms for 24-48 hours after consumption');
        break;

      case 'monitor':
        recommendations.consumption_timing.push('Consume earlier in the day when possible');
        recommendations.portion_suggestions.push('Start with smaller portions');
        recommendations.monitoring_advice.push('Monitor symptoms for 12-24 hours after consumption');
        break;

      case 'safe':
        recommendations.consumption_timing.push('Can be consumed at any time');
        recommendations.monitoring_advice.push('Continue regular symptom tracking');
        break;
    }

    // Add specific monitoring advice based on symptom impacts
    Object.entries(symptomImpacts).forEach(([symptom, impact]) => {
      if (impact.clinical_significance && impact.correlation > 0.3) {
        recommendations.monitoring_advice.push(`Pay special attention to ${symptom} changes`);
      }
    });

    return recommendations;
  }

  private static assessAnalysisQuality(
    sampleSize: number,
    timeWindowAnalyses: TimeWindowAnalysis[]
  ): FoodSymptomInsight['analysis_quality'] {

    let dataSufficiency: 'insufficient' | 'minimal' | 'adequate' | 'good' | 'excellent';
    if (sampleSize >= 50) dataSufficiency = 'excellent';
    else if (sampleSize >= 30) dataSufficiency = 'good';
    else if (sampleSize >= 20) dataSufficiency = 'adequate';
    else if (sampleSize >= 10) dataSufficiency = 'minimal';
    else dataSufficiency = 'insufficient';

    const biasAssessment: string[] = [];
    const limitations: string[] = [];

    if (sampleSize < 20) {
      limitations.push('Small sample size may limit statistical power');
    }

    // Check for potential biases
    const hasSignificantCorrelations = timeWindowAnalyses.some(analysis =>
      Object.values(analysis.correlations).some(corr =>
        corr.statistical_significance === 'significant' ||
        corr.statistical_significance === 'highly_significant'
      )
    );

    if (!hasSignificantCorrelations) {
      biasAssessment.push('No statistically significant correlations detected');
    }

    return {
      data_sufficiency: dataSufficiency,
      bias_assessment: biasAssessment,
      limitations
    };
  }

  private static calculateGlobalPatterns(
    foodInsights: FoodSymptomInsight[],
    symptomEntries: DailySymptomEntry[]
  ): CorrelationMatrix['global_patterns'] {

    const mostProblematic = foodInsights
      .filter(insight => insight.overall_risk_assessment.risk_level === 'high' ||
                        insight.overall_risk_assessment.risk_level === 'very_high')
      .slice(0, 5)
      .map(insight => insight.food_name);

    const safest = foodInsights
      .filter(insight => insight.overall_risk_assessment.risk_level === 'very_low' ||
                        insight.overall_risk_assessment.risk_level === 'low')
      .slice(0, 5)
      .map(insight => insight.food_name);

    // Calculate symptom volatility (standard deviation of each symptom)
    const symptomVolatility: Record<keyof CoreSymptomScores, number> = {} as any;
    const symptoms: (keyof CoreSymptomScores)[] = [
      'overall_health', 'abdominal_pain', 'diarrhea', 'bloody_stool', 'bloating'
    ];

    symptoms.forEach(symptom => {
      const values = symptomEntries.map(entry => entry[symptom]);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      symptomVolatility[symptom] = Math.sqrt(variance);
    });

    // Calculate day-of-week patterns (simplified)
    const weeklyPatterns: Record<string, number> = {};
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    daysOfWeek.forEach((day, index) => {
      const dayEntries = symptomEntries.filter(entry =>
        new Date(entry.recorded_date).getDay() === index
      );
      if (dayEntries.length > 0) {
        const avgSeverity = dayEntries.reduce((sum, entry) =>
          sum + entry.abdominal_pain + entry.diarrhea + entry.bloody_stool + entry.bloating, 0
        ) / dayEntries.length;
        weeklyPatterns[day] = avgSeverity;
      }
    });

    return {
      most_problematic_foods: mostProblematic,
      safest_foods: safest,
      symptom_volatility: symptomVolatility,
      weekly_patterns: weeklyPatterns,
      seasonal_trends: {} // Would need more sophisticated analysis for seasonal trends
    };
  }

  private static calculateCorrelationDistribution(foodInsights: FoodSymptomInsight[]): Record<string, number> {
    const distribution = { 'strong': 0, 'moderate': 0, 'weak': 0, 'none': 0 };

    foodInsights.forEach(insight => {
      const maxCorrelation = Math.max(
        ...Object.values(insight.symptom_impacts).map(impact => Math.abs(impact.correlation))
      );

      if (maxCorrelation >= 0.7) distribution.strong++;
      else if (maxCorrelation >= 0.3) distribution.moderate++;
      else if (maxCorrelation >= 0.1) distribution.weak++;
      else distribution.none++;
    });

    return distribution;
  }

  private static calculateConfidenceDistribution(foodInsights: FoodSymptomInsight[]): Record<string, number> {
    const distribution = { 'high': 0, 'medium': 0, 'low': 0 };

    foodInsights.forEach(insight => {
      const confidence = insight.overall_risk_assessment.confidence_score;

      if (confidence >= 0.8) distribution.high++;
      else if (confidence >= 0.5) distribution.medium++;
      else distribution.low++;
    });

    return distribution;
  }

  private static calculateRecommendationsReliability(foodInsights: FoodSymptomInsight[]): number {
    if (foodInsights.length === 0) return 0;

    const reliableInsights = foodInsights.filter(insight =>
      insight.analysis_quality.data_sufficiency === 'good' ||
      insight.analysis_quality.data_sufficiency === 'excellent'
    );

    return reliableInsights.length / foodInsights.length;
  }
}