# 🐛 Bug 修正總結

## 問題描述

Weekly AI Analysis API 的 `foodKnowledge` 欄位始終為 `null`，快取偵測功能未正常運作。

## 根本原因

`shouldRefreshFoodAnalysis()` 函數使用固定的 `maxAgeDays` (90天) 判斷快取是否過期，
而沒有使用每個食物分析記錄自己的 `refresh_frequency_days` 欄位。

## 問題影響

### 測試案例
- **SEED_雞胸肉**：45天前更新，`refresh_frequency_days` = 30 天
  - ❌ **錯誤判斷**：45 < 90 → 被判定為 `fresh`
  - ✅ **正確判斷**：45 >= 30 → 應該是 `stale`

### 實際影響
1. 過期的食物分析不會被正確偵測
2. `foodKnowledge.staleFoods` 列表永遠是空的
3. 快取刷新警告不會觸發
4. 用戶看不到需要更新的食物分析

## 修正內容

### 修改檔案
[src/lib/supabase/food-analysis-cache.ts](src/lib/supabase/food-analysis-cache.ts:44-46)

### 修正前（錯誤）
```typescript
export function shouldRefreshFoodAnalysis(
  record: FoodAnalysisCache,
  options: FoodAnalysisLookupOptions = {}
): boolean {
  const targetVersion = options.targetVersion ?? DEFAULT_FOOD_ANALYSIS_VERSION
  const maxAgeDays = options.maxAgeDays ?? DEFAULT_FOOD_ANALYSIS_MAX_AGE_DAYS
  const now = options.now ?? new Date()
  const updatedAt = new Date(record.analysis_updated_at)
  const ageDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)

  // ... version and validity checks ...

  if (ageDays >= maxAgeDays) {  // ❌ 使用固定的 90 天
    return true
  }

  return false
}
```

### 修正後（正確）
```typescript
export function shouldRefreshFoodAnalysis(
  record: FoodAnalysisCache,
  options: FoodAnalysisLookupOptions = {}
): boolean {
  const targetVersion = options.targetVersion ?? DEFAULT_FOOD_ANALYSIS_VERSION
  const maxAgeDays = options.maxAgeDays ?? DEFAULT_FOOD_ANALYSIS_MAX_AGE_DAYS
  const now = options.now ?? new Date()
  const updatedAt = new Date(record.analysis_updated_at)
  const ageDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)

  // ... version and validity checks ...

  // Use record-specific refresh_frequency_days, fallback to maxAgeDays
  const refreshThreshold = record.refresh_frequency_days ?? maxAgeDays  // ✅ 使用各自的刷新週期
  if (ageDays >= refreshThreshold) {
    return true
  }

  return false
}
```

## 測試驗證

### 新增測試案例
[src/lib/supabase/__tests__/food-analysis-cache.test.ts](src/lib/supabase/__tests__/food-analysis-cache.test.ts:56-74)

```typescript
it('returns true when record exceeds its specific refresh_frequency_days', () => {
  const oldDate = new Date()
  oldDate.setDate(oldDate.getDate() - 45) // 45 days old
  const record = mockRecord({
    analysis_updated_at: oldDate.toISOString(),
    refresh_frequency_days: 30 // Should refresh after 30 days
  })
  expect(shouldRefreshFoodAnalysis(record)).toBe(true)  // ✅ Pass
})

it('returns false when record is within its specific refresh_frequency_days', () => {
  const recentDate = new Date()
  recentDate.setDate(recentDate.getDate() - 25) // 25 days old
  const record = mockRecord({
    analysis_updated_at: recentDate.toISOString(),
    refresh_frequency_days: 30 // Should NOT refresh yet (25 < 30)
  })
  expect(shouldRefreshFoodAnalysis(record)).toBe(false)  // ✅ Pass
})
```

### 測試結果
```bash
PASS src/lib/supabase/__tests__/food-analysis-cache.test.ts
  shouldRefreshFoodAnalysis
    ✓ returns false when version matches and record is fresh
    ✓ returns true when analysis version is outdated
    ✓ returns true when record is older than allowed threshold
    ✓ returns true when record exceeds its specific refresh_frequency_days
    ✓ returns false when record is within its specific refresh_frequency_days
  FoodAnalysisCacheService
    ✓ classifies fresh, stale, and missing analyses
    ✓ deduplicates IDs when incrementing usage
    ✓ enqueues refresh requests with deduplicated ids

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

✅ **所有測試通過 (8/8)**

## 預期修正效果

修正後，API 回應應該包含：

```json
{
  "analysisStatus": {
    "foodKnowledge": {
      "missingCount": 1,
      "staleCount": 1,
      "warnings": [
        "有 1 項食物尚未建立 AI 分析",
        "有 1 項食物的分析已超過建議的刷新時間"
      ],
      "items": [
        {
          "foodId": "aaaa...504",
          "foodName": "SEED_香蕉",
          "reason": "missing",
          "status": "pending"
        },
        {
          "foodId": "aaaa...502",
          "foodName": "SEED_雞胸肉",
          "reason": "stale",
          "status": "stale",
          "lastUpdatedAt": "45天前"
        }
      ]
    }
  }
}
```

## 下一步

### 需要重新部署
修正需要部署到生產環境才能測試實際效果。

### 驗證步驟
1. 部署修正後的程式碼
2. 重新執行 Weekly AI Analysis API 測試
3. 確認 `foodKnowledge` 欄位正確顯示
4. 驗證快取警告訊息出現

### 測試 API
```bash
curl -X POST https://gilko.redirectme.net/api/ai/weekly-ibd-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "153d4a58-8406-4304-b5b1-1fd9ee433aa6",
    "startDate": "2024-11-06",
    "endDate": "2024-11-12"
  }' | jq '.analysisStatus.foodKnowledge'
```

## Git Commit

```bash
git commit -m "fix: use refresh_frequency_days for cache staleness detection"
```

**Commit SHA:** `9b825e5`

## 相關檔案

- ✅ [src/lib/supabase/food-analysis-cache.ts](src/lib/supabase/food-analysis-cache.ts) - 核心邏輯修正
- ✅ [src/lib/supabase/__tests__/food-analysis-cache.test.ts](src/lib/supabase/__tests__/food-analysis-cache.test.ts) - 測試案例
- ✅ [TEST_RESULTS.md](TEST_RESULTS.md) - 測試結果文件
- ✅ [supabase/seed_test_data_v2.sql](supabase/seed_test_data_v2.sql) - 測試資料

## 總結

✅ **根本原因已找到並修正**
✅ **所有單元測試通過**
✅ **測試資料準備完成**
⏳ **等待部署後驗證實際效果**

修正後，快取偵測功能將正常運作，API 能夠正確識別：
- 缺失的食物分析（missing）
- 過期的食物分析（stale）
- 快取刷新警告訊息
