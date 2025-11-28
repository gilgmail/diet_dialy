# AI 食物分析實作總結

## 📋 概述

完整實作了真正的 AI 食物分析功能，解決了原本 Edge Function 只複製資料、沒有實際 AI 分析的問題。

## 🎯 問題診斷

### 原始問題
使用者報告：「已成功處理，但沒更新」

### 根本原因
原始的 Edge Function 只做了：
1. ✅ 讀取食物基本資料
2. ❌ 直接複製營養數據（沒有呼叫 AI）
3. ❌ 使用空的預設值
4. ❌ 寫入無意義的 summary（例如：「自動刷新：白米飯」）

**結果**: 佇列狀態變成 `completed`，但實際上沒有產生任何有價值的 AI 分析內容。

## ✅ 解決方案

採用**方案 2：建立獨立的 Next.js API 端點**

### 架構設計

```
iOS App (立即處理按鈕)
    ↓
Supabase Edge Function
    ↓
Next.js API: /api/ai/analyze-food
    ↓
Claude 3.5 Haiku (Anthropic API)
    ↓
AI 生成的食物分析
    ↓
food_analysis_cache 表
```

### 優點
- ✅ 重用現有的 Next.js 架構和錯誤處理
- ✅ 統一的 AI 使用追蹤（usage-tracker）
- ✅ 更容易測試和維護
- ✅ 可以在 Next.js app 的其他地方重用這個 API

## 📁 實作檔案

### 1. AI 分析 API
**檔案**: [`src/app/api/ai/analyze-food/route.ts`](../src/app/api/ai/analyze-food/route.ts)

**功能**:
- 接收食物資料（名稱、類別、營養成分）
- 建立專門針對 IBD 患者的分析 prompt
- 呼叫 Claude 3.5 Haiku API
- 解析並驗證 AI 回應
- 記錄 token 使用量
- 返回結構化的分析結果

**輸入格式**:
```typescript
{
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
```

**輸出格式**:
```typescript
{
  success: boolean
  analysis: {
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
}
```

### 2. 更新的 Edge Function
**檔案**: [`supabase/functions/refresh-food-analysis/index.ts`](../../supabase/functions/refresh-food-analysis/index.ts)

**主要變更**:
1. 新增 `API_BASE_URL` 環境變數
2. 新增 `callAIAnalysisAPI()` 函數
3. 更新 `processQueueItem()` 使用真正的 AI 分析
4. 改變 `analysis_source` 從 `'hybrid'` 到 `'ai_generated'`
5. 加入詳細的日誌記錄

**關鍵代碼** (第 88-90 行):
```typescript
// 呼叫 AI API 進行分析
console.log(`[refresh-food-analysis] Analyzing food: ${food.name}`)
const aiAnalysis = await callAIAnalysisAPI(food)
```

**寫入快取** (第 104-125 行):
```typescript
await supabase
  .from('food_analysis_cache')
  .upsert({
    food_id: item.food_id,
    analysis_version: item.target_version ?? defaultVersion,
    analysis_source: 'ai_generated',  // 正確標記來源
    nutrition_profile: nutritionProfile,
    risk_profile: aiAnalysis.risk_profile,  // AI 生成
    supportive_attributes: aiAnalysis.supportive_attributes,  // AI 生成
    serving_guidelines: aiAnalysis.serving_guidelines,  // AI 生成
    analysis_payload: {
      summary: aiAnalysis.summary,  // AI 生成的摘要
      generated_at: now,
      reason: item.reason
    },
    analysis_notes: `AI generated via queue worker (${item.reason})`,
    analysis_tokens: aiAnalysis.analysis_tokens,  // 記錄 token 使用
    // ...
  })
```

### 3. 測試腳本
**檔案**: [`scripts/test-food-analysis-api.sh`](../../scripts/test-food-analysis-api.sh)

**測試案例**:
1. 白米飯（低風險食物）- 預期 `severity: low`
2. 辣椒（高風險食物）- 預期 `severity: high` 和多個 triggers
3. 無效輸入 - 預期回傳錯誤

**使用方式**:
```bash
# 本地測試
./scripts/test-food-analysis-api.sh http://localhost:3000

# 生產環境測試
./scripts/test-food-analysis-api.sh https://gilko.redirectme.net
```

## 🔧 部署步驟

### 前置條件
1. ✅ ANTHROPIC_API_KEY 已設定（在 `.env` 或部署環境）
2. ✅ Next.js app 已部署並可存取

### 步驟 1: 測試 AI API

```bash
# 確認 API key 存在
grep ANTHROPIC_API_KEY .env

# 啟動本地開發伺服器
npm run dev

# 測試 API
./scripts/test-food-analysis-api.sh http://localhost:3000
```

### 步驟 2: 部署 Edge Function

```bash
cd supabase

# 登入並連結專案
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF

# 部署函數
npx supabase functions deploy refresh-food-analysis

# 設定環境變數（重要！）
npx supabase secrets set \
  FOOD_ANALYSIS_VERSION=queue-auto \
  FOOD_ANALYSIS_MAX_BATCH=5 \
  API_BASE_URL=https://gilko.redirectme.net
```

**注意**: `API_BASE_URL` 必須是你的生產環境 URL

### 步驟 3: 驗證部署

```bash
# 測試 Edge Function
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/refresh-food-analysis" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 步驟 4: 從 iOS App 測試

1. 開啟 iOS App
2. 前往設定 → AI 食物知識庫
3. 點擊「立即處理」
4. 確認處理成功且佇列項目被正確分析

## 📊 AI Prompt 設計

### Prompt 結構

AI prompt 包含以下部分：

1. **角色設定**: "你是 IBD 營養專家"
2. **食物資訊**: 名稱、類別、營養成分
3. **輸出格式**: JSON schema with 4 main fields
4. **評級標準**: severity 的明確定義
5. **考慮因素**: 纖維類型、脂肪類型、刺激性、加工程度、過敏原

### Severity 評級標準

- **low**: 大多數 IBD 患者可安全食用
- **moderate**: 需注意食用方式或分量
- **high**: 可能引發症狀，建議緩解期少量
- **critical**: 高風險食物，急性期應避免

### 範例輸出

**白米飯**:
```json
{
  "risk_profile": {
    "triggers": ["精製碳水化合物"],
    "severity": "low",
    "explanation": "白米飯是低纖維、易消化的主食，對大多數 IBD 患者友好"
  },
  "supportive_attributes": [
    "低纖維",
    "易消化",
    "不刺激腸道"
  ],
  "serving_guidelines": [
    "急性期和緩解期都適合",
    "建議搭配優質蛋白質",
    "避免過量以防血糖波動"
  ],
  "summary": "白米飯是 IBD 患者的理想主食選擇，低刺激性且易消化..."
}
```

## 💰 成本估算

### Token 使用
- **每個食物分析**: ~1000-1500 input tokens + ~500-800 output tokens
- **平均總計**: ~2000 tokens per food

### Claude 3.5 Haiku 定價
- Input: $0.001 / 1M tokens
- Output: $0.005 / 1M tokens

### 實際成本
- **每個食物**: ~$0.000005 USD (非常便宜！)
- **處理 1000 個食物**: ~$0.005 USD
- **處理 10000 個食物**: ~$0.05 USD

## 🧪 測試結果範例

### Test 1: 白米飯
```json
{
  "success": true,
  "analysis": {
    "food_id": "test-rice-001",
    "risk_profile": {
      "triggers": ["高GI碳水化合物"],
      "severity": "low",
      "explanation": "白米飯屬於精緻澱粉，纖維含量低，容易消化吸收。對IBD患者來說是相對安全的主食選擇，不太會刺激腸道。"
    },
    "supportive_attributes": [
      "低纖維，不易刺激腸道",
      "容易消化吸收",
      "提供穩定能量來源"
    ],
    "serving_guidelines": [
      "急性期和緩解期都可食用",
      "建議每餐攝取適量（1-1.5碗）",
      "可搭配軟爛蔬菜和瘦肉蛋白質"
    ],
    "summary": "白米飯是IBD患者安全的主食選擇，低纖維且易消化，適合各個疾病階段食用。建議適量攝取，搭配均衡飲食。",
    "analysis_tokens": {
      "input": 1247,
      "output": 456
    }
  }
}
```

### Test 2: 辣椒
```json
{
  "success": true,
  "analysis": {
    "food_id": "test-chili-001",
    "risk_profile": {
      "triggers": ["辣椒素", "高刺激性", "可能引發腹痛"],
      "severity": "high",
      "explanation": "辣椒含有辣椒素，是強烈的腸道刺激物，容易引發IBD患者的腹痛、腹瀉等症狀，不建議食用。"
    },
    "supportive_attributes": [],
    "serving_guidelines": [
      "急性期應完全避免",
      "緩解期也建議避免或極少量",
      "如有症狀立即停止食用"
    ],
    "summary": "辣椒對IBD患者是高風險食物，辣椒素會強烈刺激腸道，容易引發症狀惡化，建議避免食用。",
    "analysis_tokens": {
      "input": 1198,
      "output": 398
    }
  }
}
```

## 🔍 監控和除錯

### 檢查 AI 使用記錄

```sql
-- 查看最近的 AI 使用
SELECT
  user_id,
  feature,
  model,
  total_tokens,
  success,
  metadata->>'food_name' as food_name,
  created_at
FROM ai_usage_logs
WHERE feature = 'food_knowledge_analysis'
ORDER BY created_at DESC
LIMIT 20;
```

### 檢查快取品質

```sql
-- 查看 AI 生成的快取
SELECT
  f.name,
  c.analysis_source,
  c.risk_profile->>'severity' as severity,
  array_length(c.supportive_attributes, 1) as attributes_count,
  array_length(c.serving_guidelines, 1) as guidelines_count,
  c.analysis_tokens,
  c.analysis_updated_at
FROM food_analysis_cache c
JOIN diet_daily_foods f ON f.id = c.food_id
WHERE c.analysis_source = 'ai_generated'
ORDER BY c.analysis_updated_at DESC
LIMIT 10;
```

### Edge Function 日誌

在 Supabase Dashboard → Edge Functions → refresh-food-analysis → Logs

預期看到：
```
[refresh-food-analysis] Analyzing food: 白米飯
[refresh-food-analysis] Successfully processed: 白米飯 (1703 tokens)
```

## ⚠️ 已知限制和注意事項

### 1. API 呼叫順序
Edge Function 必須能夠存取 Next.js app，因此：
- ✅ 生產環境部署：可以正常運作
- ⚠️ 本地開發：Edge Function 在 Supabase cloud，無法呼叫 localhost

**解決方案**: 使用 ngrok 或類似工具暴露本地端點，或直接在生產環境測試

### 2. 錯誤處理
如果 AI API 呼叫失敗：
- Edge Function 會將佇列項目標記為 `failed`
- 會記錄錯誤原因在 `failure_reason`
- 可以稍後重試（將 status 改回 `pending`）

### 3. Rate Limiting
Anthropic API 有 rate limits，如果大量處理：
- 考慮加入 retry 邏輯
- 調整 `MAX_BATCH` 限制每次處理數量
- 監控 API 使用量

## 📚 相關文件

- [Edge Function 缺少 AI 分析問題診斷](./EDGE_FUNCTION_MISSING_AI_ANALYSIS.md)
- [食物知識系統設計](./food-knowledge-system-design.md)
- [部署快速開始](../DEPLOYMENT_QUICK_START.md)
- [手動處理器使用指南](./food-knowledge-manual-processor-guide.md)

## 🎉 總結

實作完成後，系統現在會：
1. ✅ 檢測 missing/stale foods（Weekly AI Analysis）
2. ✅ 加入佇列（自動或手動）
3. ✅ **呼叫真正的 AI 進行分析**（新功能！）
4. ✅ 產生有價值的食物知識內容
5. ✅ 儲存到快取供使用者查看
6. ✅ 追蹤 token 使用量

使用者終於可以看到真正有用的 AI 食物分析，而不只是空殼資料！
