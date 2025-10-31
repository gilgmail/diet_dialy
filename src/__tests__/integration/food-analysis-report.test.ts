import { MultiConditionScorer } from '@/lib/ai/multi-condition-scorer'

const foods = [
  {
    name: '雞肉飯, 炒青菜',
    category: 'combo',
    nutrition: {
      calories: 620,
      protein: 32,
      carbohydrates: 68,
      fat: 18,
      fiber: 6,
      sodium: 780
    }
  },
  {
    name: '燕麥粥、藍莓、堅果',
    category: 'breakfast',
    nutrition: {
      calories: 420,
      protein: 14,
      carbohydrates: 55,
      fat: 12,
      fiber: 8,
      sodium: 140
    }
  },
  {
    name: '蔬菜湯, 烤地瓜',
    category: 'dinner',
    nutrition: {
      calories: 280,
      protein: 6,
      carbohydrates: 52,
      fat: 4,
      fiber: 9,
      sodium: 420
    }
  },
  {
    name: '糙米飯',
    category: 'grain',
    nutrition: {
      calories: 216,
      protein: 5,
      carbohydrates: 45,
      fat: 2,
      fiber: 4,
      sodium: 10
    }
  },
  {
    name: '鮭魚壽司, 海藻味噌湯',
    category: 'lunch',
    nutrition: {
      calories: 540,
      protein: 28,
      carbohydrates: 62,
      fat: 14,
      fiber: 4,
      sodium: 900
    }
  },
  {
    name: '蘋果, 原味優格',
    category: 'snack',
    nutrition: {
      calories: 220,
      protein: 6,
      carbohydrates: 38,
      fat: 4,
      fiber: 5,
      sodium: 70
    }
  },
  {
    name: '蒸蛋, 菠菜',
    category: 'dinner',
    nutrition: {
      calories: 210,
      protein: 14,
      carbohydrates: 6,
      fat: 12,
      fiber: 3,
      sodium: 320
    }
  },
  {
    name: '牛肉麵',
    category: 'lunch',
    nutrition: {
      calories: 720,
      protein: 32,
      carbohydrates: 80,
      fat: 24,
      fiber: 5,
      sodium: 1600
    }
  },
  {
    name: '雞胸肉沙拉, 溫水波蛋',
    category: 'dinner',
    nutrition: {
      calories: 360,
      protein: 33,
      carbohydrates: 14,
      fat: 18,
      fiber: 5,
      sodium: 480
    }
  },
  {
    name: '地瓜粥, 蒸南瓜',
    category: 'breakfast',
    nutrition: {
      calories: 330,
      protein: 6,
      carbohydrates: 72,
      fat: 2,
      fiber: 8,
      sodium: 220
    }
  },
  {
    name: '雞肉粥, 蒸花椰菜',
    category: 'lunch',
    nutrition: {
      calories: 310,
      protein: 20,
      carbohydrates: 38,
      fat: 6,
      fiber: 5,
      sodium: 360
    }
  },
  {
    name: '香蕉, 花生醬',
    category: 'snack',
    nutrition: {
      calories: 280,
      protein: 8,
      carbohydrates: 36,
      fat: 12,
      fiber: 4,
      sodium: 120
    }
  },
  {
    name: '豆腐味噌湯, 海帶芽',
    category: 'dinner',
    nutrition: {
      calories: 180,
      protein: 12,
      carbohydrates: 12,
      fat: 6,
      fiber: 3,
      sodium: 680
    }
  },
  {
    name: '糙米飯, 小黃瓜',
    category: 'lunch',
    nutrition: {
      calories: 240,
      protein: 6,
      carbohydrates: 46,
      fat: 3,
      fiber: 5,
      sodium: 60
    }
  },
  {
    name: '金針菇牛肉捲',
    category: 'dinner',
    nutrition: {
      calories: 430,
      protein: 28,
      carbohydrates: 22,
      fat: 24,
      fiber: 4,
      sodium: 520
    }
  },
  {
    name: '溫豆花, 黑糖',
    category: 'dessert',
    nutrition: {
      calories: 260,
      protein: 10,
      carbohydrates: 38,
      fat: 6,
      fiber: 2,
      sodium: 90
    }
  },
  {
    name: '藜麥沙拉, 酪梨',
    category: 'lunch',
    nutrition: {
      calories: 410,
      protein: 14,
      carbohydrates: 46,
      fat: 18,
      fiber: 9,
      sodium: 280
    }
  },
  {
    name: '白吐司, 水煮蛋',
    category: 'breakfast',
    nutrition: {
      calories: 260,
      protein: 14,
      carbohydrates: 30,
      fat: 9,
      fiber: 2,
      sodium: 260
    }
  },
  {
    name: '雞湯, 白麵包',
    category: 'dinner',
    nutrition: {
      calories: 320,
      protein: 24,
      carbohydrates: 32,
      fat: 10,
      fiber: 2,
      sodium: 780
    }
  },
  {
    name: '火龍果, 優格',
    category: 'snack',
    nutrition: {
      calories: 210,
      protein: 7,
      carbohydrates: 34,
      fat: 5,
      fiber: 4,
      sodium: 80
    }
  }
]

describe('Composite food nutrition analysis snapshot', () => {
  const scorer = new MultiConditionScorer()

  test('log nutrition and risk analysis for each food', async () => {
    const summaries: Array<{
      name: string
      overall: number
      conditions: Array<{
        condition: string
        score: number
        reasoning: string[]
        risks: string[]
        highlights: string[]
      }>
      allergen?: {
        detected?: string[]
        level?: string
      }
      recommendations?: string
    }> = []

    for (const food of foods) {
      const result = await scorer.scoreFoodForConditions(
        {
          name: food.name,
          category: food.category,
          calories: food.nutrition.calories,
          protein: food.nutrition.protein,
          carbohydrates: food.nutrition.carbohydrates,
          fat: food.nutrition.fat,
          fiber: food.nutrition.fiber,
          sodium: food.nutrition.sodium
        },
        [
          { type: 'IBD', severity: 'moderate' },
          { type: 'IBS', severity: 'moderate' },
          { type: 'CANCER_CHEMO', severity: 'moderate' },
          { type: 'ALLERGIES' }
        ]
      )

      console.log('──────────────')
      console.log(`🍽️ 食物：${result.food_name}`)
      console.log(`總體評分：${result.overall_score}/5`)
      result.conditions.forEach(condition => {
        console.log(`  • ${condition.condition} → ${condition.score}/5`)
        console.log(`    重點：${condition.reasoning.slice(0, 2).join('；')}`)
        if (condition.risk_factors.length > 0) {
          console.log(`    風險：${condition.risk_factors.join('；')}`)
        }
        if (condition.nutritional_highlights.length > 0) {
          console.log(`    營養亮點：${condition.nutritional_highlights.join('；')}`)
        }
      })
      if (result.general_analysis.recommendations) {
        console.log(`整體建議：${result.general_analysis.recommendations}`)
      }
      if (result.allergen_analysis && result.allergen_analysis.detected_allergens.length > 0) {
        console.log(`過敏風險：${result.allergen_analysis.detected_allergens.join('、')} (${result.allergen_analysis.risk_level})`)
      }

      summaries.push({
        name: result.food_name,
        overall: result.overall_score,
        conditions: result.conditions.map((condition) => ({
          condition: condition.condition,
          score: condition.score,
          reasoning: condition.reasoning.slice(0, 3),
          risks: condition.risk_factors,
          highlights: condition.nutritional_highlights
        })),
        allergen: result.allergen_analysis
          ? {
              detected: result.allergen_analysis.detected_allergens,
              level: result.allergen_analysis.risk_level
            }
          : undefined,
        recommendations: result.general_analysis.recommendations
      })
    }

    console.log('====== Summary JSON ======')
    console.log(JSON.stringify({ foods: summaries }, null, 2))

    expect(true).toBe(true)
  })
})
