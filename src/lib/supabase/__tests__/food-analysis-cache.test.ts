import {
  DEFAULT_FOOD_ANALYSIS_MAX_AGE_DAYS,
  DEFAULT_FOOD_ANALYSIS_VERSION,
  shouldRefreshFoodAnalysis
} from '../food-analysis-cache'
import type { FoodAnalysisCache } from '@/types/supabase'

function mockRecord(overrides: Partial<FoodAnalysisCache> = {}): FoodAnalysisCache {
  return {
    id: 'test-id',
    food_id: 'food-123',
    analysis_version: DEFAULT_FOOD_ANALYSIS_VERSION,
    analysis_source: 'ai',
    nutrition_profile: {},
    risk_profile: {},
    supportive_attributes: [],
    serving_guidelines: [],
    analysis_payload: {},
    analysis_notes: null,
    analysis_tokens: {},
    refresh_frequency_days: 90,
    analysis_usage_count: 0,
    analysis_updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }
}

describe('shouldRefreshFoodAnalysis', () => {
  it('returns false when version matches and record is fresh', () => {
    const record = mockRecord()
    expect(
      shouldRefreshFoodAnalysis(record, {
        targetVersion: DEFAULT_FOOD_ANALYSIS_VERSION,
        maxAgeDays: DEFAULT_FOOD_ANALYSIS_MAX_AGE_DAYS
      })
    ).toBe(false)
  })

  it('returns true when analysis version is outdated', () => {
    const record = mockRecord({ analysis_version: '2024.01' })
    expect(shouldRefreshFoodAnalysis(record, { targetVersion: '2025.11' })).toBe(true)
  })

  it('returns true when record is older than allowed threshold', () => {
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - (DEFAULT_FOOD_ANALYSIS_MAX_AGE_DAYS + 5))
    const record = mockRecord({ analysis_updated_at: oldDate.toISOString() })
    expect(shouldRefreshFoodAnalysis(record)).toBe(true)
  })
})
