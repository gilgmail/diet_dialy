import path from 'path'
import { readFileSync } from 'fs'
import {
  DEFAULT_FOOD_ANALYSIS_MAX_AGE_DAYS,
  DEFAULT_FOOD_ANALYSIS_VERSION,
  FoodAnalysisCacheService,
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

describe('FoodAnalysisCacheService', () => {
  const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/food-analysis-cache.json')
  const fixtureRecords = JSON.parse(
    readFileSync(fixturePath, 'utf-8')
  ) as FoodAnalysisCache[]

  function createMockClient(data: FoodAnalysisCache[]) {
    const inFn = jest.fn().mockResolvedValue({ data, error: null })
    const selectFn = jest.fn().mockReturnValue({ in: inFn })
    const upsertFn = jest.fn().mockResolvedValue({ data: [], error: null })
    const fromFn = jest.fn((table: string) => {
      if (table === 'food_analysis_refresh_queue') {
        return { upsert: upsertFn }
      }
      return { select: selectFn }
    })
    const rpcFn = jest.fn().mockResolvedValue({ data: null, error: null })
    return {
      from: fromFn,
      rpc: rpcFn,
      __mocks: { upsertFn }
    } as any
  }

  it('classifies fresh, stale, and missing analyses', async () => {
    const mockClient = createMockClient(fixtureRecords)
    const service = new FoodAnalysisCacheService(mockClient)

    const now = new Date('2025-11-10T00:00:00.000Z')
    const result = await service.fetchAnalyses(
      [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '99999999-9999-9999-9999-999999999999'
      ],
      {
        targetVersion: DEFAULT_FOOD_ANALYSIS_VERSION,
        maxAgeDays: DEFAULT_FOOD_ANALYSIS_MAX_AGE_DAYS,
        now
      }
    )

    expect(result.fresh).toHaveLength(1)
    expect(result.fresh[0].food_id).toBe('11111111-1111-1111-1111-111111111111')
    expect(result.stale.map((item) => item.food_id)).toEqual(
      expect.arrayContaining([
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333'
      ])
    )
    expect(result.missing).toEqual(['99999999-9999-9999-9999-999999999999'])
  })

  it('deduplicates IDs when incrementing usage', async () => {
    const mockClient = createMockClient([])
    const service = new FoodAnalysisCacheService(mockClient)

    await service.incrementUsage([
      '11111111-1111-1111-1111-111111111111',
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222'
    ])

    expect(mockClient.rpc).toHaveBeenCalledWith('increment_food_analysis_usage', {
      p_food_ids: [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222'
      ]
    })
  })

  it('enqueues refresh requests with deduplicated ids', async () => {
    const mockClient = createMockClient([])
    const service = new FoodAnalysisCacheService(mockClient)

    await service.enqueueRefreshRequests({
      foodIds: [
        '11111111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222'
      ],
      requestedBy: 'user-abc',
      reason: 'missing'
    })

    const upsert = mockClient.__mocks.upsertFn as jest.Mock
    expect(upsert).toHaveBeenCalledTimes(1)
    const payload = upsert.mock.calls[0][0]
    expect(payload).toHaveLength(2)
    expect(payload[0]).toHaveProperty('requested_by', 'user-abc')
    expect(payload[0]).toHaveProperty('reason', 'missing')
  })
})
