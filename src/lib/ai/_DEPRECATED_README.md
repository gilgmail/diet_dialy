# 已整合的評分系統

## 整合完成的檔案

以下評分系統已經整合到統一的 `MultiConditionScorer`：

### 1. FoodScoringService (food-scoring-service.ts)
- **狀態**: 已整合
- **功能**: IBD 專用評分邏輯
- **遷移到**: `MultiConditionScorer` 的 IBD 條件分析
- **保留原因**: 包含詳細的營養分析邏輯，作為參考

### 2. IBDNutritionistScorer (ibd-nutritionist-scorer.ts)
- **狀態**: 已整合
- **功能**: 基於營養師經驗的 IBD 評分
- **遷移到**: `MultiConditionScorer` 的備用評分邏輯
- **保留原因**: 包含關鍵字匹配邏輯，用於 Claude API 失敗時的備用

### 3. RealClaudeIBDScorer (real-claude-ibd-scorer.ts)
- **狀態**: 已整合
- **功能**: Claude API 整合的專業 IBD 評分
- **遷移到**: `MultiConditionScorer` 的 Claude API 呼叫邏輯
- **保留原因**: 包含高品質的提示詞工程，作為參考

## API 整合

### 舊 API: /api/ai/nutrition-score
- **狀態**: 重新導向到 `/api/ai/multi-condition-score`
- **向下相容**: 是，自動轉換回應格式
- **建議**: 新開發請直接使用多條件 API

### 新 API: /api/ai/multi-condition-score
- **狀態**: 活躍使用
- **功能**: 支援 IBD、IBS、癌症化療、過敏原等多條件分析
- **優勢**: 統一介面、更好的性能、個人化分析

## 遷移指南

### 從舊 API 遷移到新 API

**舊格式**:
```javascript
const response = await fetch('/api/ai/nutrition-score', {
  method: 'POST',
  body: JSON.stringify({
    foodName: '蘋果',
    category: '水果',
    nutrition: { calories: 52, fiber: 2.4 }
  })
})
```

**新格式**:
```javascript
const response = await fetch('/api/ai/multi-condition-score', {
  method: 'POST',
  body: JSON.stringify({
    foodData: {
      name: '蘋果',
      category: '水果',
      calories: 52,
      fiber: 2.4
    },
    conditions: [
      { type: 'IBD' },
      { type: 'IBS' }
    ]
  })
})
```

### 從舊 Scorer 類別遷移

**舊方式**:
```typescript
import { RealClaudeIBDScorer } from '@/lib/ai/real-claude-ibd-scorer'
const scorer = new RealClaudeIBDScorer()
const result = await scorer.scoreFood(foodData)
```

**新方式**:
```typescript
import { MultiConditionScorer } from '@/lib/ai/multi-condition-scorer'
const scorer = new MultiConditionScorer()
const result = await scorer.scoreFoodForConditions(foodData, [{ type: 'IBD' }])
```

## 效益

1. **統一介面**: 一個 API 支援所有醫療條件
2. **更好的性能**: 減少重複的 Claude API 調用
3. **個人化**: 根據用戶醫療條件提供客製化分析
4. **可維護性**: 單一程式碼庫，更容易維護和擴展
5. **向下相容**: 舊 API 自動重新導向，不破壞現有功能

## 清理計劃

1. **Phase 1** (已完成): 整合到多條件評分系統
2. **Phase 2** (已完成): 舊 API 重新導向
3. **Phase 3** (未來): 移除舊檔案 (保留 6 個月觀察期)