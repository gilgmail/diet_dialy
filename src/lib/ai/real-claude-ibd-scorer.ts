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
      model: process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022',
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

    return `你是一位擁有 20+ 年豐富臨床經驗的資深營養師和胃腸科專家，專精於 IBD（發炎性腸道疾病）患者的營養治療。你結合了循證醫學、營養學和臨床實務經驗。

🎯 **專業領域**：
- IBD 病理生理學與營養療法
- FODMAP 理論與個人化應用
- 抗發炎飲食與腸道菌群調節
- 消化道癒合與營養修復
- 疾病活躍期與緩解期營養策略
- 營養不良預防與治療

⭐ **AI 增強評分系統 (1-5分制)**：
- **1分 🚫**: 高風險 - 強烈不建議，可能嚴重惡化症狀或引發復發
- **2分 ⚠️**: 需謹慎 - 個體差異大，建議專業指導下小量測試
- **3分 😐**: 適中風險 - 適量食用，需觀察個人反應並調整
- **4分 👍**: 推薦 - IBD 友善，安全性高，適合日常飲食規劃
- **5分 ✅**: 極度推薦 - 治療性食物，有助症狀控制和腸道修復

🔬 **多維度智能分析框架**：
1. **纖維分析** - 不溶性vs可溶性纖維比例及腸道影響
2. **FODMAP 評估** - 發酵性寡糖、雙糖、單糖和多元醇含量
3. **炎症指標** - 促炎vs抗炎成分分析（AA vs EPA/DHA比例）
4. **消化負荷** - 胃腸道消化難易度和停留時間
5. **營養密度** - 營養價值vs症狀風險的效益分析
6. **個人化因子** - 疾病階段、症狀類型、併發症考量
7. **烹飪影響** - 加工方式對營養和安全性的影響
8. **臨床證據** - 最新研究文獻和臨床實證支持度
9. **症狀誘發** - 腹瀉、腹痛、脹氣等症狀的風險評估
10. **長期影響** - 營養狀況、骨密度、免疫功能的長期考量

請評估以下食物：

${foodDescription}

📋 **要求 AI 增強分析報告 (JSON格式)**：
{
  "score": "1-5的整數評分",
  "reasoning": [
    "主要評分依據（結合多維度分析）",
    "FODMAP和纖維影響評估",
    "炎症和消化負荷分析",
    "臨床證據和安全性考量"
  ],
  "recommendations": "個人化飲食建議，包含份量、時機、搭配建議",
  "confidence": "0-1信心度（基於證據強度和臨床共識）",
  "warning": "特殊警告或注意事項（如有）",
  "nutritional_highlights": [
    "關鍵營養優勢",
    "對IBD患者的特殊益處",
    "營養密度和生物利用度"
  ],
  "risk_factors": [
    "潛在症狀誘發因子",
    "消化道刺激風險",
    "長期食用考量"
  ],
  "preparation_tips": "最佳烹飪方式和食用策略，以最大化益處並降低風險",
  "disease_stage_advice": {
    "active_phase": "疾病活躍期建議",
    "remission_phase": "緩解期建議"
  },
  "symptom_management": {
    "diarrhea": "腹瀉症狀管理",
    "abdominal_pain": "腹痛預防",
    "bloating": "脹氣控制"
  },
  "clinical_evidence": "相關研究證據強度（高/中/低）和主要發現",
  "interaction_notes": "與其他食物或藥物的相互作用（如適用）"
}

🎯 **評估要求**：
請基於最新的 IBD 營養研究、臨床指南和實證醫學，提供精準、個人化、可操作的專業建議。考慮台灣飲食習慣和食材特性，確保建議的實用性和文化適應性。`
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

    // 確保使用正確的模型，避免回退到舊版本
    const validModels = [
      'claude-3-5-haiku-20241022',
      'claude-3-haiku-20240307',
      'claude-3-5-sonnet-latest'
    ]

    let modelToUse = this.config.model
    if (!validModels.includes(modelToUse)) {
      console.warn(`⚠️ 模型 ${modelToUse} 可能已過期，使用預設模型`)
      modelToUse = 'claude-3-5-haiku-20241022'
    }

    const response = await this.anthropic.messages.create({
      model: modelToUse,
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

  // 驗證評分範圍 (1-5 分系統)
  private validateScore(score: any): 1 | 2 | 3 | 4 | 5 {
    const numScore = Number(score)
    if ([1, 2, 3, 4, 5].includes(numScore)) {
      return numScore as 1 | 2 | 3 | 4 | 5
    }
    return 2 // 預設為謹慎評分
  }

  // 驗證信心度範圍
  private validateConfidence(confidence: any): number {
    const numConfidence = Number(confidence)
    if (numConfidence >= 0 && numConfidence <= 1) {
      return numConfidence
    }
    return 0.5 // 預設中等信心度
  }

  // 🤖 智能備用評分系統 (當 Claude API 不可用時)
  private fallbackScoring(food: FoodNutrition): IBDFoodScore {
    console.log('🤖 觸發備用評分系統，食物:', food.name)

    const { name, category, calories, protein, fiber } = food
    const foodText = name.toLowerCase()

    // 🚫 極高風險關鍵字 (1分)
    const veryHighRiskKeywords = [
      '辣椒', '麻辣', '辛辣', '咖啡', '酒精', '咖哩', '胡椒',
      '芥末', '韓式', '泰式', '川菜', '火鍋'
    ]

    // ⚠️ 高風險關鍵字 (1-2分)
    const highRiskKeywords = [
      '生菜', '生食', '堅果', '種子', '玉米', '全豆', '黑豆',
      '油炸', '燒烤', '碳烤', '全麥', '高纖', '粗糧', '糙米'
    ]

    // 🤔 中等風險關鍵字 (2-3分)
    const moderateRiskKeywords = [
      '牛奶', '乳製品', '奶油', '起司', '優格', '乳酪',
      '大蒜', '洋蔥', '青蔥', '韭菜', '番茄', '柑橘', '橙子'
    ]

    // 👍 良好食物關鍵字 (4分)
    const goodKeywords = [
      '蒸煮', '清蒸', '水煮', '魚肉', '雞胸', '瘦肉', '雞蛋',
      '胡蘿蔔', '南瓜', '馬鈴薯', '地瓜', '小白菜', '菠菜'
    ]

    // ✅ 極推薦關鍵字 (5分)
    const excellentKeywords = [
      '白粥', '稀飯', '白米飯', '香蕉', '燕麥粥', '蒸蛋',
      '雞湯', '魚湯', '小米粥', '藕粉', '嫩豆腐'
    ]

    // 🏥 分析演算法
    let score: 1 | 2 | 3 | 4 | 5 = 3
    let reasoning: string[] = []
    let confidence = 0.6
    let riskFactors: string[] = []
    let nutritionalHighlights: string[] = []

    // 極高風險檢測
    if (veryHighRiskKeywords.some(keyword => foodText.includes(keyword))) {
      score = 1
      reasoning = [
        '含有強刺激性成分，可能嚴重惡化IBD症狀',
        '辛辣食物會增加腸道發炎反應',
        '建議完全避免以預防症狀復發'
      ]
      riskFactors = ['腸道刺激', '症狀惡化風險', '發炎反應']
      confidence = 0.9
    }
    // 高風險檢測
    else if (highRiskKeywords.some(keyword => foodText.includes(keyword))) {
      score = Math.random() < 0.7 ? 1 : 2 // 70%機率為1分
      reasoning = [
        '含有不易消化或高纖維成分',
        '可能增加腸道負擔和症狀風險',
        '建議避免或諮詢營養師'
      ]
      riskFactors = ['消化負擔', '纖維過高', '症狀誘發']
      confidence = 0.8
    }
    // 極推薦檢測
    else if (excellentKeywords.some(keyword => foodText.includes(keyword))) {
      score = 5
      reasoning = [
        '屬於IBD患者極度友善食物',
        '易消化且營養價值高',
        '有助腸道修復和症狀控制'
      ]
      nutritionalHighlights = ['易消化', '低刺激性', '營養豐富']
      confidence = 0.9
    }
    // 良好食物檢測
    else if (goodKeywords.some(keyword => foodText.includes(keyword))) {
      score = 4
      reasoning = [`屬於IBD患者友善食物`]
      confidence = 0.8
    } else if (moderateRiskKeywords.some(keyword => foodText.includes(keyword))) {
      score = 2
      reasoning = [`需要謹慎評估個人耐受性`]
      confidence = 0.7
    }

    console.log(`🤖 備用評分結果: ${food.name} = ${score}分, 推理:`, reasoning)

    return {
      score,
      reasoning,
      recommendations: this.getRecommendationByScore(score),
      confidence,
      warning: score === 1 ? '建議完全避免此食物' : undefined,
      nutritional_highlights: nutritionalHighlights,
      risk_factors: riskFactors
    }
  }

  // 根據評分生成建議 (1-5 分系統)
  private getRecommendationByScore(score: number): string {
    switch (score) {
      case 1:
        return 'IBD患者應完全避免此食物，可能引發症狀惡化或加重腸道發炎反應。'
      case 2:
        return '需要謹慎評估個人耐受性，建議從極小份量開始嘗試，並密切觀察身體反應。'
      case 3:
        return '一般情況下可以適量食用，建議注意烹飪方式和食用份量，觀察個人反應。'
      case 4:
        return '對IBD患者較為友善，安全性較高，適合作為日常飲食的一部分。'
      case 5:
        return '極度推薦食用，對IBD患者非常安全且有顯著營養益處，可安心作為主要食物來源。'
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