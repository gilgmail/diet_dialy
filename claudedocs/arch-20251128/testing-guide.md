# 測試指南 - Food Analysis Cache & Refresh Queue

本指南提供完整的測試流程，用於驗證食物分析快取和刷新佇列功能。

## 📋 準備工作

### 1. 確認 Migration 已執行

```bash
# 檢查資料表是否存在
psql "$DATABASE_URL" -c "\d food_analysis_cache"
psql "$DATABASE_URL" -c "\d food_analysis_refresh_queue"
```

### 2. 載入測試資料

```bash
# 方法 1: 使用腳本
./scripts/seed_test_data.sh

# 方法 2: 直接執行 SQL
psql "$DATABASE_URL" -f supabase/seed_test_data.sql

# 方法 3: 複製 SQL 內容到 Supabase Studio SQL Editor 執行
```

測試資料包含：
- ✅ 5 個測試食物 (TEST_白飯, TEST_雞胸肉, TEST_青花菜, TEST_香蕉, TEST_牛奶)
- ✅ 3 個快取記錄 (正常/過期/即將過期)
- ✅ 4 個佇列項目 (pending/in_progress/completed 狀態)

## 🧪 測試案例

### Test 1: 驗證測試資料載入

**目的**: 確認測試資料正確載入

**步驟**:
```sql
-- 查看測試食物
SELECT id, name, category FROM diet_daily_foods WHERE name LIKE 'TEST_%';

-- 查看快取狀態
SELECT
    food_name,
    CASE
        WHEN expires_at < NOW() THEN '過期'
        WHEN expires_at < NOW() + INTERVAL '7 days' THEN '即將過期'
        ELSE '正常'
    END AS status,
    EXTRACT(DAY FROM (NOW() - analyzed_at)) AS days_old
FROM food_analysis_cache
WHERE metadata->>'test_data' = 'true';

-- 查看刷新佇列
SELECT
    f.name,
    q.reason,
    q.status,
    q.priority
FROM food_analysis_refresh_queue q
JOIN diet_daily_foods f ON q.food_id = f.id
WHERE q.metadata->>'test_data' = 'true'
ORDER BY q.priority DESC;
```

**預期結果**:
- 5 個測試食物
- 3 個快取記錄 (TEST_白飯正常, TEST_雞胸肉過期, TEST_青花菜即將過期)
- 2 個缺失快取 (TEST_香蕉, TEST_牛奶)
- 4 個佇列項目

---

### Test 2: Weekly AI Analysis API 整合測試

**目的**: 驗證 API 能正確檢測缺失和過期的食物分析

**API Endpoint**:
```
POST https://gilko.redirectme.net/api/ai/weekly-ibd-analysis
```

**請求範例**:
```bash
curl -X POST https://gilko.redirectme.net/api/ai/weekly-ibd-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "e7c62e70-7e95-40e3-84c6-f27c84ede44e",
    "startDate": "2024-11-06",
    "endDate": "2024-11-12"
  }'
```

**預期回應結構**:
```json
{
  "success": true,
  "data": {
    "analysis": {
      "food_knowledge": {
        "missingFoods": [
          {
            "foodId": "...",
            "foodName": "TEST_香蕉",
            "reason": "no_cache"
          }
        ],
        "staleFoods": [
          {
            "foodId": "...",
            "foodName": "TEST_雞胸肉",
            "analyzedAt": "...",
            "daysOld": 35
          }
        ],
        "totalMissing": 2,
        "totalStale": 1
      }
    },
    "analysisStatus": {
      "foodKnowledge": {
        "cached": 3,
        "missing": 2,
        "stale": 1,
        "queuedForRefresh": 2
      }
    },
    "token_strategy": {
      "warnings": [
        "Found 2 foods without cached analysis",
        "Found 1 stale food analysis (>30 days)"
      ]
    }
  }
}
```

**驗證點**:
- ✅ `food_knowledge.missingFoods` 包含 TEST_香蕉 和 TEST_牛奶
- ✅ `food_knowledge.staleFoods` 包含 TEST_雞胸肉
- ✅ `analysisStatus.foodKnowledge` 統計正確
- ✅ `token_strategy.warnings` 包含快取警告

---

### Test 3: Food Knowledge API - 查詢狀態

**目的**: 驗證 Food Knowledge API 能查詢快取狀態

**API Endpoint**:
```
GET https://gilko.redirectme.net/api/food-knowledge/status?userId={userId}
```

**請求範例**:
```bash
curl "https://gilko.redirectme.net/api/food-knowledge/status?userId=e7c62e70-7e95-40e3-84c6-f27c84ede44e"
```

**預期回應**:
```json
{
  "success": true,
  "data": {
    "totalFoods": 100,
    "cachedAnalyses": 95,
    "missingAnalyses": 3,
    "staleAnalyses": 2,
    "queueStatus": {
      "pending": 2,
      "inProgress": 1,
      "completed": 10,
      "failed": 0
    },
    "recentlyUpdated": [
      {
        "foodName": "TEST_白飯",
        "updatedAt": "2024-11-11T...",
        "status": "completed"
      }
    ]
  }
}
```

**驗證點**:
- ✅ 統計數字正確
- ✅ `queueStatus` 顯示各狀態的項目數
- ✅ `recentlyUpdated` 列出最近更新的食物

---

### Test 4: Food Knowledge API - 手動刷新

**目的**: 驗證手動觸發刷新功能

**API Endpoint**:
```
POST https://gilko.redirectme.net/api/food-knowledge/refresh
```

**請求範例**:
```bash
curl -X POST https://gilko.redirectme.net/api/food-knowledge/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "e7c62e70-7e95-40e3-84c6-f27c84ede44e",
    "foodIds": [
      "22222222-2222-2222-2222-222222222222"
    ],
    "priority": 9
  }'
```

**預期回應**:
```json
{
  "success": true,
  "data": {
    "queued": 1,
    "queueIds": ["..."],
    "message": "1 foods queued for refresh"
  }
}
```

**驗證**:
```sql
-- 檢查佇列是否新增
SELECT * FROM food_analysis_refresh_queue
WHERE food_id = '22222222-2222-2222-2222-222222222222'
ORDER BY created_at DESC
LIMIT 1;
```

---

### Test 5: Mobile Dashboard - 食物知識庫 Banner

**目的**: 驗證 Dashboard 顯示快取狀態提醒

**測試步驟**:
1. 開啟 Expo 應用
2. 導航到 Dashboard
3. 確認顯示食物知識庫狀態 banner

**預期結果**:
```
⚠️ 食物知識庫狀態
發現 2 個食物缺少分析，1 個分析已過期
[前往設定管理]
```

**程式碼檢查點**:
```typescript
// DashboardScreen.tsx
const { foodKnowledgeStatus } = useDashboard();

// 應該顯示 banner 當:
foodKnowledgeStatus.missingCount > 0 || foodKnowledgeStatus.staleCount > 0
```

---

### Test 6: Mobile Settings - 食物知識庫管理

**目的**: 驗證 Settings 頁面的食物知識庫管理功能

**測試步驟**:
1. 開啟 Settings 頁面
2. 找到「AI 食物知識庫」區塊
3. 查看待更新食物列表
4. 點擊「立即刷新」按鈕

**預期結果**:
- ✅ 顯示統計資訊 (總數/已快取/待更新)
- ✅ 列出缺失和過期的食物
- ✅ 顯示佇列處理進度
- ✅ 刷新按鈕觸發 API 呼叫

**程式碼檢查點**:
```typescript
// SettingsScreen.tsx
const {
  foodKnowledgeStatus,
  refreshFoodKnowledge,
  isRefreshing
} = useFoodKnowledge();
```

---

### Test 7: Edge Function - Refresh Processing

**目的**: 驗證 Edge Function 處理刷新佇列

**前置條件**:
```sql
-- 確認有 pending 項目
SELECT COUNT(*) FROM food_analysis_refresh_queue
WHERE status = 'pending';
```

**測試步驟**:

```bash
# 1. 本地測試 (如果有設定)
supabase functions serve refresh-food-analysis

# 2. 呼叫 Function
curl -X POST http://127.0.0.1:54321/functions/v1/refresh-food-analysis \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# 3. 或在雲端測試
curl -X POST https://lbjeyvvierxcnrytuvto.supabase.co/functions/v1/refresh-food-analysis \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**驗證**:
```sql
-- 檢查佇列狀態變化
SELECT
    status,
    COUNT(*) as count
FROM food_analysis_refresh_queue
WHERE metadata->>'test_data' = 'true'
GROUP BY status;

-- 檢查快取是否更新
SELECT
    food_name,
    analyzed_at,
    expires_at
FROM food_analysis_cache
WHERE metadata->>'test_data' = 'true'
ORDER BY analyzed_at DESC;
```

---

### Test 8: 單元測試

**目的**: 執行現有單元測試

```bash
# 執行食物分析快取測試
npm test -- food-analysis-cache.test.ts

# 執行所有測試
npm test
```

**預期結果**:
- ✅ 所有測試通過
- ✅ 測試覆蓋率 > 80%

---

## 🧹 清理測試資料

測試完成後清理:

```sql
-- 刪除測試資料
DELETE FROM food_analysis_refresh_queue WHERE metadata->>'test_data' = 'true';
DELETE FROM food_analysis_cache WHERE metadata->>'test_data' = 'true';
DELETE FROM diet_daily_foods WHERE name LIKE 'TEST_%';

-- 驗證清理
SELECT COUNT(*) FROM diet_daily_foods WHERE name LIKE 'TEST_%';
```

或使用腳本:
```bash
./scripts/clean_test_data.sh  # (待創建)
```

---

## 📊 測試檢查表

- [ ] Test 1: 測試資料載入成功
- [ ] Test 2: Weekly AI Analysis API 回傳正確
- [ ] Test 3: Food Knowledge Status API 正常
- [ ] Test 4: Food Knowledge Refresh API 正常
- [ ] Test 5: Mobile Dashboard 顯示 banner
- [ ] Test 6: Mobile Settings 功能正常
- [ ] Test 7: Edge Function 處理佇列
- [ ] Test 8: 單元測試全部通過

---

## 🐛 常見問題

### Q1: 測試資料無法載入
**解決方案**:
```bash
# 檢查 DATABASE_URL
echo $DATABASE_URL

# 檢查網路連線
psql "$DATABASE_URL" -c "SELECT 1"

# 手動複製 SQL 到 Supabase Studio 執行
```

### Q2: API 沒有檢測到測試食物
**解決方案**:
```sql
-- 確認測試食物與用戶有關聯
SELECT * FROM food_entries
WHERE user_id = 'YOUR_USER_ID'
AND consumed_at BETWEEN '2024-11-06' AND '2024-11-12';

-- 如果沒有，需要創建食物記錄
```

### Q3: Mobile App 沒有顯示 banner
**解決方案**:
```bash
# 清除 Expo cache
expo start -c

# 檢查 hook 是否正確載入資料
# 在 DashboardScreen.tsx 加入 console.log
```

---

## 📚 相關文檔

- [Weekly AI Integration Tests](./weekly-ai-integration-tests.md)
- [Food Analysis Cache Improvements](./food-analysis-cache-improvements.md)
- [Food Analysis Cache Testing Guide](./food-analysis-cache-testing-guide.md)
- [Pi5 Supabase Setup](./pi5-supabase-setup.md)
