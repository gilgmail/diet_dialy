import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { recordAIUsage } from '@/lib/ai/usage-tracker'

// 食物分析輸入
export interface FoodAnalysisInput {
  food_id: string
  name: string
  category: string | null
  nutrition: {
    calories: number | null
    protein: number | null
    carbohydrates: number | null
    fat: number | null
    fiber: number | null
    sugar?: number | null
    sodium?: number | null
  }
}

// 食物分析輸出
export interface FoodAnalysisOutput {
  food_id: string
  risk_profile: {
    triggers: string[]
    severity: 'low' | 'moderate' | 'high' | 'critical'
    explanation: string
  }
  supportive_attributes: string[]
  serving_guidelines: string[]
  summary: string
  analysis_tokens: {
    input: number
    output: number
  }
}

// 建立 AI prompt
function buildFoodAnalysisPrompt(food: FoodAnalysisInput): string {
  const nutritionInfo = Object.entries(food.nutrition)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => {
      const labels: Record<string, string> = {
        calories: '熱量',
        protein: '蛋白質',
        carbohydrates: '碳水化合物',
        fat: '脂肪',
        fiber: '纖維',
        sugar: '糖',
        sodium: '鈉'
      }
      const units: Record<string, string> = {
        calories: 'kcal',
        protein: 'g',
        carbohydrates: 'g',
        fat: 'g',
        fiber: 'g',
        sugar: 'g',
        sodium: 'mg'
      }
      return `- ${labels[key]}：${value}${units[key]}`
    })
    .join('\n')

  return `你是 IBD（發炎性腸道疾病，包含克隆氏症和潰瘍性結腸炎）營養專家。請分析以下食物對 IBD 患者的影響。

食物資訊：
- 名稱：${food.name}
- 類別：${food.category ?? '未分類'}
- 營養成分（每 100g）：
${nutritionInfo}

請以 JSON 格式回應，包含以下欄位：

{
  "risk_profile": {
    "triggers": ["可能的觸發因素清單，例如：高纖維、高脂肪、刺激性等"],
    "severity": "low|moderate|high|critical",
    "explanation": "為什麼有這些風險的詳細說明（2-3 句話）"
  },
  "supportive_attributes": ["對 IBD 患者有益的特性，例如：易消化、低纖維、富含 omega-3 等"],
  "serving_guidelines": ["具體的食用建議，例如：急性期避免、緩解期適量、建議烹調方式等"],
  "summary": "簡短總結這個食物對 IBD 患者的整體評估（50-80 字）"
}

注意事項：
1. severity 評級標準：
   - low: 大多數 IBD 患者可安全食用
   - moderate: 需注意食用方式或分量
   - high: 可能引發症狀，建議緩解期少量
   - critical: 高風險食物，急性期應避免

2. 考慮因素：
   - 纖維類型和含量（不溶性纖維較容易刺激）
   - 脂肪類型（飽和脂肪vs不飽和脂肪）
   - 刺激性（辛辣、酸度、咖啡因等）
   - 加工程度（越精緻通常越溫和）
   - 常見過敏原（乳糖、麩質等）

3. 回應必須是有效的 JSON 格式，不要包含其他文字。`
}

// 解析 AI 回應
function parseFoodAnalysisResponse(
  response: Anthropic.Message,
  foodId: string
): FoodAnalysisOutput {
  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Invalid response type from Claude')
  }

  // 提取 JSON（移除可能的 markdown code block）
  let jsonText = content.text.trim()
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '')
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```\s*/, '').replace(/```\s*$/, '')
  }

  try {
    const parsed = JSON.parse(jsonText)

    // 驗證必要欄位
    if (!parsed.risk_profile || !parsed.summary) {
      throw new Error('Missing required fields in AI response')
    }

    // 確保 severity 是有效值
    const validSeverities = ['low', 'moderate', 'high', 'critical']
    if (!validSeverities.includes(parsed.risk_profile.severity)) {
      parsed.risk_profile.severity = 'moderate'
    }

    // 確保陣列欄位存在
    if (!Array.isArray(parsed.risk_profile.triggers)) {
      parsed.risk_profile.triggers = []
    }
    if (!Array.isArray(parsed.supportive_attributes)) {
      parsed.supportive_attributes = []
    }
    if (!Array.isArray(parsed.serving_guidelines)) {
      parsed.serving_guidelines = []
    }

    return {
      food_id: foodId,
      risk_profile: parsed.risk_profile,
      supportive_attributes: parsed.supportive_attributes,
      serving_guidelines: parsed.serving_guidelines,
      summary: parsed.summary,
      analysis_tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens
      }
    }
  } catch (error) {
    console.error('[analyze-food] Failed to parse AI response:', error)
    console.error('[analyze-food] Raw response:', jsonText)
    throw new Error('Failed to parse AI response as JSON')
  }
}

// 生成 AI 分析
async function generateFoodAnalysis(food: FoodAnalysisInput): Promise<FoodAnalysisOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const anthropic = new Anthropic({ apiKey })
  const prompt = buildFoodAnalysisPrompt(food)

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    return parseFoodAnalysisResponse(response, food.food_id)
  } catch (error) {
    console.error('[analyze-food] Anthropic API error:', error)
    throw error
  }
}

// POST /api/ai/analyze-food
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FoodAnalysisInput

    // 驗證輸入
    if (!body.food_id || !body.name) {
      return NextResponse.json(
        { success: false, error: 'food_id and name are required' },
        { status: 400 }
      )
    }

    // 生成分析
    const startTime = Date.now()
    const analysis = await generateFoodAnalysis(body)
    const duration = Date.now() - startTime

    // 記錄 AI 使用
    try {
      await recordAIUsage({
        userId: 'system', // Edge Function 呼叫
        feature: 'food_knowledge_analysis',
        model: 'claude-3-5-haiku-20241022',
        inputTokens: analysis.analysis_tokens.input,
        outputTokens: analysis.analysis_tokens.output,
        totalTokens: analysis.analysis_tokens.input + analysis.analysis_tokens.output,
        success: true,
        metadata: {
          food_id: body.food_id,
          food_name: body.name,
          duration_ms: duration
        }
      })
    } catch (usageError) {
      console.warn('[analyze-food] Failed to record AI usage:', usageError)
      // 不阻斷主流程
    }

    console.log(
      `[analyze-food] Successfully analyzed food: ${body.name} (${analysis.analysis_tokens.input + analysis.analysis_tokens.output} tokens, ${duration}ms)`
    )

    return NextResponse.json({
      success: true,
      analysis
    })
  } catch (error) {
    console.error('[analyze-food] Error:', error)

    // 記錄失敗的使用
    try {
      await recordAIUsage({
        userId: 'system',
        feature: 'food_knowledge_analysis',
        model: 'claude-3-5-haiku-20241022',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        success: false,
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      })
    } catch (usageError) {
      console.warn('[analyze-food] Failed to record failed AI usage:', usageError)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze food'
      },
      { status: 500 }
    )
  }
}
