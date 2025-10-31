/**
 * Integration test for the multi-condition score API when handling
 * composite foods (names containing commas or other delimiters).
 */

import { POST as scoreFood } from '@/app/api/ai/multi-condition-score/route'

const USER_ID = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
const foodHistory = require('../../../data/user-food-history.json') as {
  entries: Array<{
    userId: string
    consumedAt: string
    foodData?: { name_zh?: string }
  }>
}

const compositePattern = /[,，、;/]/

describe('API /api/ai/multi-condition-score - composite foods', () => {
  const userEntries = foodHistory.entries.filter(entry => entry.userId === USER_ID)

  const latestTimestamp = userEntries.reduce(
    (max, entry) => Math.max(max, new Date(entry.consumedAt).getTime()),
    0
  )

  const weekAgo = latestTimestamp ? latestTimestamp - 7 * 24 * 60 * 60 * 1000 : 0
  const recentEntries = userEntries.filter(entry => {
    const ts = new Date(entry.consumedAt).getTime()
    return ts >= weekAgo
  })

  const compositeEntries = recentEntries.filter(entry =>
    compositePattern.test(entry.foodData?.name_zh ?? '')
  )

  test('recent entries include composite foods', () => {
    expect(compositeEntries.length).toBeGreaterThan(0)
  })

  test.each(compositeEntries.map(entry => entry.foodData?.name_zh).filter(Boolean))(
    'composite food "%s" is analyzed with separated reasoning',
    async (foodName) => {
      const body = {
        foodName,
        category: 'combo',
        nutrition: {},
        fullAnalysis: true
      }

      const request = new Request('http://localhost/api/ai/multi-condition-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      const response = await scoreFood(request as any)
      expect(response.status).toBe(200)

      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.food_name).toBe(foodName)
      expect(data.general_analysis.reasoning[0]).toContain('組合食材')
      data.conditions.forEach((condition: any) => {
        expect(condition.reasoning[0]).toContain('組合食材')
      })
    }
  )
})
