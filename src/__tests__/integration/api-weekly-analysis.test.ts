/**
 * Integration-like test for the weekly analysis API.
 * We mock Supabase dependencies to run the handler against local data.
 */

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              summary: '資料量有限，以 fallback 規則提供建議。',
              foods_to_monitor: [],
              supportive_foods: [],
              symptom_trends: [],
              gut_health_recommendations: [],
              warning_signs: [],
              data_quality_notes: [],
              follow_up_actions: []
            })
          }
        ]
      })
    }
  })),
  AnthropicError: class AnthropicError extends Error {}
}))

jest.mock('@/lib/supabase/server', () => {
  const mockPreferences = { mobileSettings: { aiModelPreference: 'mock' } }

  const storage = {
    createBucket: jest.fn().mockResolvedValue({}),
    from: jest.fn(() => ({
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      download: jest.fn().mockResolvedValue({ data: { text: async () => '{}' }, error: null }),
      upload: jest.fn().mockResolvedValue({ data: {}, error: null })
    }))
  }

  const from = jest.fn((table: string) => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: table === 'diet_daily_users' ? { preferences: mockPreferences } : null,
      error: null
    })
  }))

  const adminClient = { from, storage }

  return {
    createAdminClient: jest.fn(() => adminClient),
    createClient: jest.fn(() => adminClient)
  }
})

const SYMPTOM_STORE_KEY = '__weeklyAnalysisTestSymptomEntries__'
;(globalThis as any)[SYMPTOM_STORE_KEY] = (globalThis as any)[SYMPTOM_STORE_KEY] || []
const symptomEntries: any[] = (globalThis as any)[SYMPTOM_STORE_KEY]

const userId = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
const startDate = '2025-02-17'
const endDate = '2025-02-23'

const foodEntries = [
  {
    id: 'entry-1',
    user_id: userId,
    food_name: '雞肉飯, 炒青菜',
    consumed_at: '2025-02-17T12:30:00.000Z',
    meal_type: 'lunch',
    notes: '外食便當，青菜較少油'
  },
  {
    id: 'entry-2',
    user_id: userId,
    food_name: '燕麥粥、藍莓、堅果',
    consumed_at: '2025-02-18T08:15:00.000Z',
    meal_type: 'breakfast',
    notes: '自煮早餐，堅果份量減半'
  },
  {
    id: 'entry-3',
    user_id: userId,
    food_name: '蔬菜湯, 烤地瓜',
    consumed_at: '2025-02-19T18:40:00.000Z',
    meal_type: 'dinner',
    notes: '清淡晚餐'
  },
  {
    id: 'entry-4',
    user_id: userId,
    food_name: '糙米飯',
    consumed_at: '2025-02-20T12:05:00.000Z',
    meal_type: 'lunch',
    notes: null
  }
]

symptomEntries.push(
  {
    id: 'sym-1',
    user_id: userId,
    recorded_date: '2025-02-17',
    recorded_at: '2025-02-17T21:00:00.000Z',
    overall_health: 4,
    abdominal_pain: 2,
    diarrhea: 1,
    bloody_stool: 1,
    bloating: 2,
    bowel_movement_count: 2,
    stool_type: 3,
    mood_score: 4,
    energy_level: 3,
    sleep_quality: 4,
    stress_level: 2,
    additional_symptoms: [],
    medications_taken: ['mesalazine'],
    medication_adherence: 5,
    weather_conditions: '晴',
    activity_level: 'moderate',
    notes: '狀態穩定',
    triggers_identified: [],
    improvement_factors: ['warm_water'],
    related_food_entries: ['entry-1'],
    entry_source: 'manual',
    data_completeness_score: 0.92,
    created_at: '2025-02-17T21:00:00.000Z',
    updated_at: '2025-02-17T21:00:00.000Z'
  },
  {
    id: 'sym-2',
    user_id: userId,
    recorded_date: '2025-02-18',
    recorded_at: '2025-02-18T21:15:00.000Z',
    overall_health: 3,
    abdominal_pain: 3,
    diarrhea: 2,
    bloody_stool: 1,
    bloating: 3,
    bowel_movement_count: 3,
    stool_type: 4,
    mood_score: 3,
    energy_level: 2,
    sleep_quality: 3,
    stress_level: 3,
    additional_symptoms: [
      { type: 'nausea', severity: 2 }
    ],
    medications_taken: ['mesalazine'],
    medication_adherence: 4,
    weather_conditions: '陰',
    activity_level: 'low',
    notes: '早餐後有輕微脹氣',
    triggers_identified: ['nuts'],
    improvement_factors: ['rest'],
    related_food_entries: ['entry-2'],
    entry_source: 'manual',
    data_completeness_score: 0.88,
    created_at: '2025-02-18T21:15:00.000Z',
    updated_at: '2025-02-18T21:15:00.000Z'
  },
  {
    id: 'sym-3',
    user_id: userId,
    recorded_date: '2025-02-20',
    recorded_at: '2025-02-20T22:00:00.000Z',
    overall_health: 5,
    abdominal_pain: 1,
    diarrhea: 1,
    bloody_stool: 1,
    bloating: 1,
    bowel_movement_count: 1,
    stool_type: 3,
    mood_score: 4,
    energy_level: 4,
    sleep_quality: 5,
    stress_level: 2,
    additional_symptoms: [],
    medications_taken: ['mesalazine'],
    medication_adherence: 5,
    weather_conditions: '晴',
    activity_level: 'moderate',
    notes: '腸道狀況良好',
    triggers_identified: [],
    improvement_factors: ['gentle_yoga'],
    related_food_entries: ['entry-4'],
    entry_source: 'manual',
    data_completeness_score: 0.95,
    created_at: '2025-02-20T22:00:00.000Z',
    updated_at: '2025-02-20T22:00:00.000Z'
  }
)

jest.mock('@/lib/supabase/food-entries', () => ({
  SupabaseFoodEntriesService: jest.fn().mockImplementation(() => ({
    getUserFoodEntriesByDateRange: (
      uid: string,
      start?: string,
      end?: string
    ) => {
      const startTime = start ? new Date(`${start}T00:00:00.000Z`).getTime() : -Infinity
      const endTime = end ? new Date(`${end}T23:59:59.999Z`).getTime() : Infinity

      return Promise.resolve(
        foodEntries.filter(entry => {
          return (
            entry.user_id === uid &&
            new Date(entry.consumed_at).getTime() >= startTime &&
            new Date(entry.consumed_at).getTime() <= endTime
          )
        })
      )
    }
  }))
}))

import { POST as weeklyAnalysis } from '@/app/api/ai/weekly-ibd-analysis/route'

jest.mock('@/lib/supabase/daily-symptom-service', () => ({
  DailySymptomService: {
    getEntriesByRange: jest.fn().mockImplementation((
      uid: string,
      start: string,
      end: string
    ) => {
      const store = (globalThis as any)['__weeklyAnalysisTestSymptomEntries__'] as any[]
      const startTime = new Date(`${start}T00:00:00.000Z`).getTime()
      const endTime = new Date(`${end}T23:59:59.999Z`).getTime()
      return Promise.resolve(
        store.filter(entry => {
          const ts = new Date(entry.recorded_at).getTime()
          return entry.user_id === uid && ts >= startTime && ts <= endTime
        })
      )
    }),
    getRecentEntries: jest.fn().mockImplementation(() =>
      Promise.resolve((globalThis as any)['__weeklyAnalysisTestSymptomEntries__'] as any[])
    )
  }
}))

describe('API /api/ai/weekly-ibd-analysis', () => {
  test('should generate a fallback weekly report from mocked data', async () => {
    const body = {
      userId,
      startDate,
      endDate,
      promptStyle: 'balanced',
      includePromptRecommendations: false
    }

    const request = new Request('http://localhost/api/ai/weekly-ibd-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const response = await weeklyAnalysis(request as any)
    expect(response.status).toBe(200)

    const data = await response.json()
    console.log('🧾 Weekly analysis response:', data)

    expect(data.success).toBe(true)
    const result = data.analysis
    expect(result.analysis.summary).toBeDefined()
    expect(typeof result.analysis.summary).toBe('string')
    expect(result.analysis.summary.length).toBeGreaterThan(0)
    expect(result.totals.food_entries).toBeGreaterThanOrEqual(3)

    console.log('📘 Weekly Analysis Summary:\n', result.analysis.summary)
    console.log('🍽️ Foods To Monitor:', result.analysis.foods_to_monitor)
    console.log('🌱 Supportive Foods:', result.analysis.supportive_foods)
  })
})
