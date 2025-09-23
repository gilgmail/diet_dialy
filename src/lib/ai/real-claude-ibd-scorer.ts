// 真實 Claude API IBD 營養師評分系統
// 整合 Anthropic Claude API 提供專業營養評分

import Anthropic from '@anthropic-ai/sdk'
import type { IBDFoodScore } from './ibd-nutritionist-scorer'

interface FoodNutrition {
  name: string
  category: string
  calories?: number
  protein?: number
  carbohydrates?: number
  fat?: number
  fiber?: number
  sodium?: number
  sugar?: number
  saturated_fat?: number
  ingredients?: string
  preparation?: string
  brand?: string
}

interface ClaudeAPIConfig {
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

export class RealClaudeIBDScorer {
  private anthropic: Anthropic
  private config: ClaudeAPIConfig

  constructor() {
    // 從環境變數載入 API 配置
    this.config = {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
      maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '1000'),
      temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.3')
    }

    if (!this.config.apiKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY 未設定，將使用備用評分邏輯')
    }

    this.anthropic = new Anthropic({
      apiKey: this.config.apiKey,
    })
  }

  // 主要評分方法
  async scoreFood(food: FoodNutrition): Promise<IBDFoodScore> {
    try {
      if (!this.config.apiKey) {
        return this.fallbackScoring(food)
      }

      const response = await this.callClaudeAPI(food)
      return this.parseClaudeResponse(response)
    } catch (error) {
      console.error('Claude API 評分失敗:', error)
      return this.fallbackScoring(food)
    }
  }

  // 構建專業營養師提示詞
  private buildNutritionistPrompt(food: FoodNutrition): string {
    const foodDescription = this.formatFoodDescription(food)

    return `你是一位擁有 18 年豐富經驗的專業營養師，專精於 IBD（發炎性腸道疾病，包括克隆氏病和潰瘍性結腸炎）患者的飲食管理。

你具備以下專業知識：
- IBD 病理生理學和營養需求
- FODMAP 理論和實際應用
- 抗發炎飲食原則
- 消化道友善食物特性
- 個人化營養策略

評分標準（0-3分制）：
- 0分：不合適 - 可能引發症狀惡化或加重腸道發炎
- 1分：謹慎 - 需要小心評估，可能因人而異，建議少量嘗試
- 2分：適中 - 一般情況下可以適量食用，風險相對較低
- 3分：推薦 - 對IBD患者友善，安全性高且有營養益處

評估考量因素：
1. 纖維含量與類型（不溶性纖維風險較高，可溶性纖維較友善）
2. FODMAP成分含量（低FODMAP食物較安全）
3. 加工程度（過度加工食品炎症風險較高）
4. 抗發炎特性（omega-3脂肪酸、抗氧化物質等）
5. 消化難易度（容易消化的食物風險較低）
6. 常見IBD觸發因子（辛辣、高脂、咖啡因、酒精等）
7. 營養密度（高營養密度但溫和的食物較佳）
8. 食用方式影響（烹飪方式、份量控制等）

請評估以下食物：

${foodDescription}

請以JSON格式回應，包含：
{
  "score": 0-3的整數評分,
  "reasoning": ["詳細評分理由1", "評分理由2", "評分理由3"],
  "recommendations": "具體的食用建議和注意事項",
  "confidence": 0-1的信心度數值,
  "warning": "如有特殊警告則填入，否則省略此欄位",
  "nutritional_highlights": ["營養亮點1", "亮點2"],
  "risk_factors": ["風險因子1", "因子2"],
  "preparation_tips": "烹飪或食用建議"
}

請確保回應專業、實用，符合IBD患者的實際需求，並基於最新的營養學研究和臨床經驗。`
  }

  // 格式化食物描述
  private formatFoodDescription(food: FoodNutrition): string {
    let description = `食物名稱: ${food.name}\n`
    description += `分類: ${food.category}\n`

    // 營養資訊
    if (food.calories) description += `熱量: ${food.calories} kcal/100g\n`
    if (food.protein) description += `蛋白質: ${food.protein}g/100g\n`
    if (food.carbohydrates) description += `碳水化合物: ${food.carbohydrates}g/100g\n`
    if (food.fat) description += `脂肪: ${food.fat}g/100g\n`
    if (food.fiber) description += `膳食纖維: ${food.fiber}g/100g\n`
    if (food.sodium) description += `鈉: ${food.sodium}mg/100g\n`
    if (food.sugar) description += `糖: ${food.sugar}g/100g\n`
    if (food.saturated_fat) description += `飽和脂肪: ${food.saturated_fat}g/100g\n`

    // 額外資訊
    if (food.brand) description += `品牌: ${food.brand}\n`
    if (food.ingredients) description += `主要成分: ${food.ingredients}\n`
    if (food.preparation) description += `製備方式: ${food.preparation}\n`

    return description
  }

  // 調用 Claude API
  private async callClaudeAPI(food: FoodNutrition): Promise<string> {
    const prompt = this.buildNutritionistPrompt(food)

    const response = await this.anthropic.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // 提取回應內容
    const content = response.content[0]
    if (content.type === 'text') {
      return content.text
    }

    throw new Error('Claude API 回應格式不正確')
  }

  // 解析 Claude 回應
  private parseClaudeResponse(response: string): IBDFoodScore {
    try {
      // 嘗試提取 JSON 部分
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('回應中沒有找到 JSON 格式')
      }

      const parsed = JSON.parse(jsonMatch[0])

      // 驗證和標準化回應
      const score = this.validateScore(parsed.score)

      return {
        score,
        reasoning: Array.isArray(parsed.reasoning)
          ? parsed.reasoning.slice(0, 5)
          : ['Claude AI 營養師評估'],
        recommendations: parsed.recommendations || '請諮詢專業營養師獲得個人化建議',
        confidence: this.validateConfidence(parsed.confidence),
        warning: parsed.warning,
        // 新增的詳細資訊
        nutritional_highlights: parsed.nutritional_highlights || [],
        risk_factors: parsed.risk_factors || [],
        preparation_tips: parsed.preparation_tips
      }
    } catch (error) {
      console.error('解析 Claude 回應失敗:', error)
      throw new Error('Claude API 回應解析失敗')
    }
  }

  // 驗證評分範圍
  private validateScore(score: any): 0 | 1 | 2 | 3 {
    const numScore = Number(score)
    if ([0, 1, 2, 3].includes(numScore)) {
      return numScore as 0 | 1 | 2 | 3
    }
    return 1 // 預設為謹慎評分
  }

  // 驗證信心度範圍
  private validateConfidence(confidence: any): number {
    const numConfidence = Number(confidence)
    if (numConfidence >= 0 && numConfidence <= 1) {
      return numConfidence
    }
    return 0.5 // 預設中等信心度
  }

  // 備用評分邏輯（當 API 不可用時）
  private fallbackScoring(food: FoodNutrition): IBDFoodScore {
    const { name, category } = food
    const foodText = name.toLowerCase()

    // 高風險關鍵字 (0分)
    const highRiskKeywords = [
      '辣', '麻辣', '咖啡', '酒', '生菜', '堅果', '種子',
      '玉米', '豆', '全麥', '高纖', '油炸', '燒烤'
    ]

    // 中等風險關鍵字 (1分)
    const moderateRiskKeywords = [
      '牛奶', '乳製品', '奶', '起司', '優格',
      '蒜', '洋蔥', '番茄', '柑橘'
    ]

    // 推薦關鍵字 (3分)
    const recommendedKeywords = [
      '粥', '蒸', '魚', '雞胸', '雞蛋', '蛋',
      '白米', '香蕉', '胡蘿蔔', '南瓜'
    ]

    let score: 0 | 1 | 2 | 3 = 2
    let reasoning = ['基於營養師經驗的評估（備用模式）']
    let confidence = 0.6

    if (highRiskKeywords.some(keyword => foodText.includes(keyword))) {
      score = 0
      reasoning = [`含有IBD高風險成分，建議避免`]
      confidence = 0.8
    } else if (recommendedKeywords.some(keyword => foodText.includes(keyword))) {
      score = 3
      reasoning = [`屬於IBD患者友善食物`]
      confidence = 0.8
    } else if (moderateRiskKeywords.some(keyword => foodText.includes(keyword))) {
      score = 1
      reasoning = [`需要謹慎評估個人耐受性`]
      confidence = 0.7
    }

    return {
      score,
      reasoning,
      recommendations: this.getRecommendationByScore(score),
      confidence,
      warning: score === 0 ? '建議完全避免此食物' : undefined
    }
  }

  // 根據評分生成建議
  private getRecommendationByScore(score: number): string {
    switch (score) {
      case 0:
        return 'IBD患者應完全避免此食物，可能引發症狀惡化或加重腸道發炎反應。'
      case 1:
        return '需要謹慎評估個人耐受性，建議從極小份量開始嘗試，並密切觀察身體反應。'
      case 2:
        return '一般情況下可以適量食用，建議注意烹飪方式和食用份量，觀察個人反應。'
      case 3:
        return '推薦食用，對IBD患者相對安全且有營養益處，可作為日常飲食的一部分。'
      default:
        return '請諮詢專業營養師或胃腸科醫師獲得個人化建議。'
    }
  }

  // 批次評分功能
  async batchScore(foods: FoodNutrition[]): Promise<Map<string, IBDFoodScore>> {
    const results = new Map<string, IBDFoodScore>()

    // 並發控制，避免 API 限制
    const batchSize = 3
    const delay = 1000 // 1秒延遲

    for (let i = 0; i < foods.length; i += batchSize) {
      const batch = foods.slice(i, i + batchSize)

      const promises = batch.map(async (food) => {
        const score = await this.scoreFood(food)
        return { food: food.name, score }
      })

      const batchResults = await Promise.all(promises)

      batchResults.forEach(({ food, score }) => {
        results.set(food, score)
      })

      // 延遲避免 API 限制
      if (i + batchSize < foods.length) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return results
  }

  // 檢查 API 可用性
  async testConnection(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        return false
      }

      const testFood: FoodNutrition = {
        name: '白米飯',
        category: '穀物'
      }

      await this.scoreFood(testFood)
      return true
    } catch (error) {
      console.error('Claude API 連接測試失敗:', error)
      return false
    }
  }

  // 獲取 API 使用統計
  getAPIStats() {
    return {
      apiConfigured: !!this.config.apiKey,
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature
    }
  }
}

// 擴展 IBDFoodScore 接口
declare module './ibd-nutritionist-scorer' {
  interface IBDFoodScore {
    nutritional_highlights?: string[]
    risk_factors?: string[]
    preparation_tips?: string
  }
}

// 單例實例
export const realClaudeIBDScorer = new RealClaudeIBDScorer()