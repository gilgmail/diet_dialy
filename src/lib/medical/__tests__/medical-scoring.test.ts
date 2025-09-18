/**
 * Jest tests for Week 3 Medical Scoring System
 * Testing multi-condition medical scoring functionality
 */

import { validateMedicalScoringSystem } from './medical-scoring-validation';
import { medicalScoringEngine } from '../scoring-engine';
import { symptomTracker } from '../symptom-tracker';

describe('Medical Scoring System - Week 3', () => {
  describe('Multi-condition Medical Scoring Validation', () => {
    test('should validate all medical scoring systems', () => {
      const results = validateMedicalScoringSystem();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(6); // 6 test suites

      // Check that all suites have some tests
      results.forEach(suite => {
        expect(suite.totalTests).toBeGreaterThan(0);
        expect(suite.passedTests).toBeGreaterThanOrEqual(0);
        expect(suite.successRate).toBeGreaterThanOrEqual(0);
        expect(suite.successRate).toBeLessThanOrEqual(100);
      });
    });

    test('should have high success rate for medical scoring', () => {
      const results = validateMedicalScoringSystem();
      const totalTests = results.reduce((sum, suite) => sum + suite.totalTests, 0);
      const totalPassed = results.reduce((sum, suite) => sum + suite.passedTests, 0);
      const overallSuccessRate = (totalPassed / totalTests) * 100;

      // Expect at least 80% success rate
      expect(overallSuccessRate).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Medical Scoring Engine', () => {
    const mockProfile = {
      id: 'test-profile',
      userId: 'test-user',
      allergies: ['peanuts', 'shellfish'],
      medications: [],
      dietaryRestrictions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      primary_condition: 'ibd',
      secondary_conditions: ['allergies'],
      known_allergies: ['peanuts', 'shellfish'],
      personal_triggers: ['spicy_food', 'high_fiber'],
      current_phase: 'active',
      current_side_effects: [],
      lactose_intolerant: false,
      fiber_sensitive: true,
      allergy_severity_levels: {
        'peanuts': 'severe',
        'shellfish': 'moderate'
      },
      ibs_subtype: 'ibs_d',
      fodmap_tolerance: {
        'fructans': 'low',
        'galactans': 'moderate',
        'polyols': 'low'
      }
    };

    const mockFood = {
      id: 'test-food',
      name_en: 'Test Food',
      name_zh: '測試食物',
      category: 'test',
      medical_scores: {
        ibd_risk_factors: ['spicy'],
        major_allergens: ['peanuts'],
        chemo_considerations: [],
        fiber_content: 'high',
        lactose_level: 'none',
        fodmap_level: 'high',
        allergen_severity: {
          'peanuts': 'severe'
        }
      }
    };

    test('should calculate medical scores for food', () => {
      const result = medicalScoringEngine.scoreFood(mockFood, mockProfile);

      expect(result).toBeDefined();
      expect(result.medicalScore).toBeDefined();
      expect(typeof result.medicalScore.score).toBe('number');
      expect(result.medicalScore.score).toBeGreaterThanOrEqual(1);
      expect(result.medicalScore.score).toBeLessThanOrEqual(4);
    });

    test('should handle multiple conditions', () => {
      const multiConditionProfile = {
        ...mockProfile,
        secondary_conditions: ['chemotherapy', 'allergies', 'ibs']
      };

      const result = medicalScoringEngine.scoreFood(mockFood, multiConditionProfile);

      expect(result).toBeDefined();
      expect(result.medicalScore.score).toBeGreaterThan(1);
      expect(result.allergyWarnings).toBeDefined();
      expect(Array.isArray(result.allergyWarnings)).toBe(true);
    });
  });

  describe('Symptom Tracker', () => {
    test('should record symptoms', () => {
      const symptom = {
        type: 'abdominal_pain',
        severity: 'moderate',
        severity_score: 5,
        timestamp: new Date(),
        duration: 120,
        notes: 'Test symptom'
      };

      const symptomId = symptomTracker.recordSymptom(symptom);

      expect(symptomId).toBeDefined();
      expect(typeof symptomId).toBe('string');
      expect(symptomId.length).toBeGreaterThan(0);
    });

    test('should analyze symptoms', async () => {
      const analysis = await symptomTracker.analyzeSymptoms(30);

      expect(analysis).toBeDefined();
      expect(analysis.weekly_trends).toBeDefined();
      expect(Array.isArray(analysis.weekly_trends)).toBe(true);
      expect(analysis.food_correlations).toBeDefined();
      expect(Array.isArray(analysis.food_correlations)).toBe(true);
    });

    test('should get symptom statistics', () => {
      const stats = symptomTracker.getSymptomStats(7);

      expect(stats).toBeDefined();
      expect(stats.total_symptoms).toBeDefined();
      expect(typeof stats.total_symptoms).toBe('number');
    });
  });
});