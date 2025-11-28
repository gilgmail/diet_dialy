# 🔴 Edge Function 缺少 AI 分析功能

## 問題摘要

Edge Function `refresh-food-analysis` **成功處理佇列項目但沒有產生真正的 AI 分析內容**。

### 當前行為
✅ 從佇列讀取待處理項目
✅ 從 `diet_daily_foods` 讀取食物基本資料
✅ 寫入 `food_analysis_cache` 表
✅ 更新佇列狀態為 `completed`
❌ **沒有呼叫任何 AI API 進行分析**

### 實際結果
建立的快取記錄內容是空殼：
- `nutrition_profile`: 只是複製食物表的營養數據
- `risk_profile`: 使用預設值或佇列中的舊資料
- `summary`: 只是簡單字串 "自動刷新：{食物名稱}"
- `supportive_attributes`: 空陣列
- `serving_guidelines`: 空陣列

---

## 根本原因分析

### 1. Edge Function 缺少 AI 分析邏輯

**檔案**: `supabase/functions/refresh-food-analysis/index.ts`

**問題代碼** (第 44-77 行):
```typescript
// ❌ 只複製營養數據，沒有 AI 分析
const nutritionProfile = {
  calories: food?.calories ?? null,
  protein: food?.protein ?? null,
  carbohydrates: food?.carbohydrates ?? null,
  fat: food?.fat ?? null,
  fiber: food?.fiber ?? null,
  sugar: food?.sugar ?? null,
  sodium: food?.sodium ?? null
}

// ❌ 使用預設或舊的風險資料
const riskProfile =
  (item.metadata && item.metadata.risk_profile) ||
  { triggers: [], severity: item.reason === 'missing' ? 'unknown' : 'moderate' }

// ❌ 只是簡單字串，不是真正的 AI 分析
const summary = item.metadata?.summary ?? `自動刷新：${food?.name ?? '未知食物'}`

// ❌ 直接寫入快取，沒有 AI 生成內容
await supabase
  .from('food_analysis_cache')
  .upsert({
    food_id: item.food_id,
    analysis_version: item.target_version ?? defaultVersion,
    analysis_source: 'hybrid',  // ⚠️ 誤導：標記為 hybrid 但實際沒有 AI
    nutrition_profile: nutritionProfile,
    risk_profile: riskProfile,
    supportive_attributes: item.metadata?.supportive_attributes ?? [],  // 空陣列
    serving_guidelines: item.metadata?.serving_guidelines ?? [],        // 空陣列
    analysis_payload: { summary },  // 無意義的 summary
    // ...
  })
```

### 2. 系統中沒有獨立的 AI 食物分析服務

檢查結果：
- ❌ `src/lib/ai/` 中沒有 `food-knowledge-generator.ts` 或類似檔案
- ❌ 沒有 `generateFoodAnalysis()` 或 `analyzeFoodWithAI()` 函數
- ✅ 有 `FoodScoringService` - 但這是基於規則的評分，不是 AI 生成知識
- ✅ 有 `multi-condition-scorer.ts` - 使用 Claude API 但用途是評分，不是生成食物知識

### 3. 缺少 AI 生成食物知識的基礎架構

需要但目前不存在的元件：
1. **AI Prompt Template** - 食物知識生成的 prompt
2. **AI Service** - 呼叫 Anthropic API 的服務
3. **Response Parser** - 解析 AI 回應並結構化資料
4. **Error Handling** - AI 呼叫失敗的處理邏輯
5. **Token Tracking** - 追蹤 AI 使用量

---

## 影響分析

### 使用者體驗
1. **iOS App 使用者點擊「立即處理」**
   - ✅ 看到「成功處理了 N 個項目」的訊息
   - ❌ 實際上沒有獲得任何有用的 AI 分析內容
   - ❌ Dashboard 仍然顯示警告（因為快取是空殼）

2. **Weekly AI Analysis**
   - 檢測到 missing/stale foods ✅
   - 加入佇列 ✅
   - Edge Function 處理佇列 ✅
   - **但產生的快取沒有實際價值** ❌

### 資料庫影響
- `food_analysis_refresh_queue` 狀態被標記為 `completed`
- `food_analysis_cache` 包含無用的記錄
- 浪費資料庫儲存空間

---

## 解決方案設計

### 方案 1: 在 Edge Function 中整合 AI 分析 (推薦)

**優點**:
- 集中處理邏輯
- 可以批次處理降低成本
- 容易監控和除錯

**實作步驟**:

1. **建立 AI 分析模組** (`supabase/functions/_shared/food-ai-analyzer.ts`)
```typescript
import Anthropic from '@anthropic-ai/sdk'

export interface FoodAnalysisInput {
  name: string
  category: string
  nutrition: {
    calories: number
    protein: number
    carbohydrates: number
    fat: number
    fiber: number
    sugar?: number
    sodium?: number
  }
}

export interface FoodAnalysisOutput {
  risk_profile: {
    triggers: string[]
    severity: 'low' | 'moderate' | 'high' | 'critical'
    explanation: string
  }
  supportive_attributes: string[]
  serving_guidelines: string[]
  summary: string
  tokens: { input: number; output: number }
}

export async function generateFoodAnalysis(
  food: FoodAnalysisInput
): Promise<FoodAnalysisOutput> {
  const anthropic = new Anthropic({
    apiKey: Deno.env.get('ANTHROPIC_API_KEY')
  })

  const prompt = buildFoodAnalysisPrompt(food)

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  })

  return parseFoodAnalysisResponse(response)
}

function buildFoodAnalysisPrompt(food: FoodAnalysisInput): string {
  return `作為 IBD（發炎性腸道疾病）營養專家，分析以下食物：

食物名稱：${food.name}
類別：${food.category}
營養成分（每 100g）：
- 熱量：${food.nutrition.calories} kcal
- 蛋白質：${food.nutrition.protein}g
- 碳水化合物：${food.nutrition.carbohydrates}g
- 脂肪：${food.nutrition.fat}g
- 纖維：${food.nutrition.fiber}g
${food.nutrition.sugar ? `- 糖：${food.nutrition.sugar}g` : ''}
${food.nutrition.sodium ? `- 鈉：${food.nutrition.sodium}mg` : ''}

請以 JSON 格式回應：
{
  "risk_profile": {
    "triggers": ["潛在觸發因素清單"],
    "severity": "low|moderate|high|critical",
    "explanation": "為什麼有這些風險的詳細說明"
  },
  "supportive_attributes": ["對 IBD 患者有益的特性"],
  "serving_guidelines": ["食用建議"],
  "summary": "簡短摘要（50-100字）"
}`
}
```

2. **更新 Edge Function** (`supabase/functions/refresh-food-analysis/index.ts`)
```typescript
import { generateFoodAnalysis } from './_shared/food-ai-analyzer.ts'

async function processQueueItem(item: any) {
  // ... 現有的狀態更新邏輯 ...

  try {
    const { data: food, error: foodError } = await supabase
      .from('diet_daily_foods')
      .select('*')
      .eq('id', item.food_id)
      .single()

    if (foodError) throw foodError

    // 🆕 呼叫 AI 分析
    const aiAnalysis = await generateFoodAnalysis({
      name: food.name,
      category: food.category ?? 'unknown',
      nutrition: {
        calories: food.calories ?? 0,
        protein: food.protein ?? 0,
        carbohydrates: food.carbohydrates ?? 0,
        fat: food.fat ?? 0,
        fiber: food.fiber ?? 0,
        sugar: food.sugar,
        sodium: food.sodium
      }
    })

    // 🆕 使用 AI 生成的分析結果
    await supabase
      .from('food_analysis_cache')
      .upsert({
        food_id: item.food_id,
        analysis_version: item.target_version ?? defaultVersion,
        analysis_source: 'ai_generated',  // 正確標記來源
        nutrition_profile: nutritionProfile,
        risk_profile: aiAnalysis.risk_profile,
        supportive_attributes: aiAnalysis.supportive_attributes,
        serving_guidelines: aiAnalysis.serving_guidelines,
        analysis_payload: {
          summary: aiAnalysis.summary,
          raw_response: aiAnalysis  // 保存完整回應供除錯
        },
        analysis_notes: `AI generated via queue worker (${item.reason})`,
        analysis_tokens: aiAnalysis.tokens,
        analysis_usage_count: 0,
        analysis_updated_at: now,
        created_at: item.created_at ?? now,
        updated_at: now
      })

    // ... 其餘邏輯 ...
  } catch (error) {
    // ... 錯誤處理 ...
  }
}
```

3. **設定環境變數**
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

### 方案 2: 建立獨立的 Next.js API 端點

**優點**:
- 可重用現有的 Next.js AI 服務
- 統一錯誤處理和日誌記錄
- 更容易測試

**實作步驟**:

1. **建立 API 端點** (`src/app/api/ai/analyze-food/route.ts`)
2. **Edge Function 呼叫這個 API** 而不是直接呼叫 Anthropic

---

## 實作優先順序

### Phase 1: 修復核心功能 (最高優先)
- [ ] 建立 AI 食物分析模組
- [ ] 更新 Edge Function 整合 AI 分析
- [ ] 設定 ANTHROPIC_API_KEY
- [ ] 測試端對端流程

### Phase 2: 優化和監控
- [ ] 加入 token 使用追蹤
- [ ] 實作批次處理優化
- [ ] 建立監控 Dashboard
- [ ] 加入錯誤告警

### Phase 3: 進階功能
- [ ] 實作 chunked analysis (分批分析)
- [ ] Dashboard 模式切換
- [ ] 自動化排程 (pg_cron)

---

## 測試計劃

### 單元測試
```typescript
// supabase/functions/refresh-food-analysis/test.ts
Deno.test('generateFoodAnalysis returns valid structure', async () => {
  const result = await generateFoodAnalysis({
    name: '白米飯',
    category: '主食',
    nutrition: {
      calories: 130,
      protein: 2.7,
      carbohydrates: 28,
      fat: 0.3,
      fiber: 0.4
    }
  })

  assertEquals(typeof result.risk_profile, 'object')
  assertEquals(Array.isArray(result.supportive_attributes), true)
  assertEquals(Array.isArray(result.serving_guidelines), true)
  assertEquals(typeof result.summary, 'string')
})
```

### 整合測試
```bash
# 1. 加入測試項目到佇列
curl -X POST "http://localhost:54321/functions/v1/refresh-food-analysis" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -d '{"test_mode": true, "food_ids": ["test-food-1"]}'

# 2. 檢查快取是否包含有效的 AI 分析
psql -h localhost -p 54322 -U postgres -d postgres -c \
  "SELECT analysis_payload, risk_profile FROM food_analysis_cache WHERE food_id = 'test-food-1';"
```

---

## 預估成本

### AI Token 使用
- **每個食物分析**: ~1000 input tokens + ~500 output tokens
- **Claude 3.5 Haiku 成本**: $0.001 / 1M input tokens, $0.005 / 1M output tokens
- **每個食物**: ~$0.0000035 USD

### 處理 1000 個食物
- **總成本**: ~$0.0035 USD
- **處理時間**: ~5-10 分鐘（批次處理）

---

## 建議行動

**立即行動**:
1. ⚠️ **暫停使用現有的 Edge Function**（它會浪費資料庫空間）
2. 📋 **清理無效的快取記錄**
   ```sql
   DELETE FROM food_analysis_cache
   WHERE analysis_source = 'hybrid'
     AND analysis_payload->>'summary' LIKE '自動刷新：%';
   ```

**下一步**:
1. 實作 AI 分析模組（方案 1）
2. 部署並測試
3. 更新文件

**確認需求**:
- [ ] 確認 Anthropic API key 可用
- [ ] 確認預算允許 AI 呼叫
- [ ] 確認 prompt 內容符合需求
- [ ] 選擇實作方案（方案 1 或 2）
