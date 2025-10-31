import { MultiConditionScorer } from '@/lib/ai/multi-condition-scorer'

const USER_ID = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
const foodHistory = require('../../../data/user-food-history.json') as {
  entries: Array<{
    userId: string
    consumedAt: string
    foodData: { name_zh?: string }
  }>
}

describe('Composite food analysis for target user', () => {
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

  test('should contain at least one composite food entry', () => {
    const compositeEntries = recentEntries.filter(entry =>
      entry.foodData?.name_zh?.match(/[,，、]/)
    )
    expect(compositeEntries.length).toBeGreaterThan(0)
  })

  test('composite foods are analyzed as separate components', async () => {
    const compositeEntries = recentEntries.filter(entry =>
      entry.foodData?.name_zh?.match(/[,，、]/)
    )
    expect(compositeEntries.length).toBeGreaterThan(0)

    const scorer = new MultiConditionScorer()
    const results = await Promise.all(
      compositeEntries.map(entry =>
        scorer.scoreFoodForConditions(
          {
            name: entry.foodData?.name_zh || '',
            category: 'combo'
          },
          [
            { type: 'IBD', severity: 'moderate' },
            { type: 'IBS', severity: 'moderate' }
          ]
        )
      )
    )

    results.forEach(result => {
      expect(result.success).toBe(true)
      expect(result.general_analysis.reasoning[0]).toContain('組合食材')
      result.conditions.forEach(condition => {
        expect(condition.reasoning[0]).toContain('組合食材')
      })
    })
  })
})
