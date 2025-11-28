# AI 食物知識庫手動處理器使用指南

## 問題背景

Weekly AI Analysis 會自動檢測 missing 和 stale 的食物分析，並將它們加入 `food_analysis_refresh_queue` 佇列。然而，Supabase Edge Function `refresh-food-analysis` 需要手動觸發才會處理這些佇列項目。

在設置自動定時任務（pg_cron）之前，我們提供了手動觸發機制讓用戶可以立即處理佇列。

## 系統架構

```
Weekly AI Analysis
    ↓ 檢測 missing/stale foods
    ↓
food_analysis_refresh_queue (status='pending')
    ↓ 需要手動觸發
    ↓
Supabase Edge Function (refresh-food-analysis)
    ↓ 處理佇列項目
    ↓
food_analysis_cache (更新/建立分析)
    ↓
food_analysis_refresh_queue (status='completed')
```

## iOS App 使用方式

### 步驟 1: 執行 Weekly AI Analysis

1. 開啟 Dashboard
2. 點擊「開始 AI 分析」
3. 等待分析完成

**結果**: 系統會自動將檢測到的 missing/stale foods 加入佇列

### 步驟 2: 查看佇列狀態

1. 點擊 Dashboard 的「前往設定」按鈕（如果有警告 banner）
2. 或直接進入「設定」頁面
3. 找到「AI 食物知識庫」section

**顯示內容**:
```
AI 食物知識庫                [立即處理] [🔄]
------------------------------------------------
缺資料 1 項，過期 2 項。

• SEED_香蕉                          [待建立]
• SEED_雞胸肉                        [需更新]
• SEED_青花菜                        [需更新]
```

### 步驟 3: 觸發處理器

1. 點擊「立即處理」按鈕
2. 確認對話框會顯示：「將立即處理 3 個待處理項目，這可能需要幾分鐘時間。」
3. 點擊「開始處理」

**處理過程**:
- 系統會呼叫 Supabase Edge Function
- Edge Function 從佇列取得 pending 項目（最多 5 個）
- 依序處理每個項目
- 更新 `food_analysis_cache`
- 標記佇列項目為 `completed`

### 步驟 4: 驗證結果

1. 處理完成後會顯示：「成功處理了 3 個項目。」
2. 點擊「確定」會自動重新載入佇列狀態
3. 已完成的項目會從列表中消失

## API 端點

### 1. 查詢佇列狀態

```http
GET /api/food-knowledge/status?userId={userId}
```

**Response**:
```json
{
  "success": true,
  "summary": {
    "pendingCount": 3,
    "inProgressCount": 0,
    "failedCount": 0,
    "completedCount": 0,
    "missingCount": 1,
    "staleCount": 2,
    "items": [
      {
        "queueId": "uuid",
        "foodId": "food-123",
        "foodName": "SEED_香蕉",
        "category": "fruit",
        "reason": "missing",
        "status": "pending",
        "priority": 9,
        "attempts": 0,
        "scheduledFor": "2025-11-13T14:00:00Z",
        "updatedAt": "2025-11-13T14:00:00Z",
        "completedAt": null
      }
    ]
  }
}
```

### 2. 加入佇列（手動刷新）

```http
POST /api/food-knowledge/refresh
Content-Type: application/json

{
  "userId": "user-id",
  "foodIds": ["food-123", "food-456"],
  "reason": "manual_request"
}
```

### 3. 觸發處理器（新增）

```http
POST {supabaseUrl}/functions/v1/refresh-food-analysis
Authorization: Bearer {anonKey}
Content-Type: application/json

{}
```

**Response**:
```json
{
  "success": true,
  "processed": 3,
  "results": [
    { "id": "queue-1", "status": "completed" },
    { "id": "queue-2", "status": "completed" },
    { "id": "queue-3", "status": "completed" }
  ]
}
```

## 技術實作細節

### iOS Service 方法

```typescript
// mobile/.../FoodKnowledgeService.ts
export class FoodKnowledgeService {
  // 查詢佇列狀態
  static async getStatus(userId: string): Promise<FoodKnowledgeStatusSummary | null>

  // 手動加入佇列
  static async requestRefresh(userId: string, foodIds: string[]): Promise<boolean>

  // 觸發處理器（新增）
  static async triggerProcessor(): Promise<{
    success: boolean
    processed?: number
    error?: string
  }>
}
```

### Edge Function 處理邏輯

```typescript
// supabase/functions/refresh-food-analysis/index.ts

1. 查詢 pending 項目（scheduled_for <= now, limit 5）
2. 依 priority 排序（高優先級先處理）
3. 對每個項目:
   a. 更新 status = 'in_progress'
   b. 從 diet_daily_foods 取得食物資訊
   c. 建立/更新 food_analysis_cache
   d. 更新 status = 'completed'
4. 返回處理結果
```

## 故障排除

### 問題 1: 「目前沒有待處理的項目」

**原因**:
- 佇列是空的
- 或所有項目已經是 'in_progress' 或 'completed'

**解決方法**:
1. 執行 Weekly AI Analysis 生成佇列項目
2. 或手動加入特定食物到佇列

### 問題 2: 處理失敗

**可能原因**:
- Supabase Edge Function 錯誤
- 網路連線問題
- 食物資料不存在

**查看錯誤詳情**:
```sql
SELECT * FROM food_analysis_refresh_queue
WHERE status = 'failed'
ORDER BY updated_at DESC;
```

### 問題 3: 處理速度慢

**原因**: 每次最多處理 5 個項目

**解決方法**:
- 多次點擊「立即處理」
- 或增加 Edge Function 的 `MAX_BATCH` 環境變數

## 監控查詢

### 查看佇列統計

```sql
SELECT
  status,
  reason,
  COUNT(*) as count
FROM food_analysis_refresh_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status, reason;
```

### 查看最近處理記錄

```sql
SELECT
  faq.food_id,
  df.name as food_name,
  faq.status,
  faq.reason,
  faq.attempts,
  faq.completed_at,
  EXTRACT(EPOCH FROM (faq.completed_at - faq.created_at)) as processing_time_seconds
FROM food_analysis_refresh_queue faq
LEFT JOIN diet_daily_foods df ON df.id = faq.food_id
WHERE faq.completed_at IS NOT NULL
ORDER BY faq.completed_at DESC
LIMIT 10;
```

## 未來改進

### Phase 1: 自動化處理（建議）

使用 pg_cron 設定定時任務：

```sql
-- 每 5 分鐘自動處理佇列
SELECT cron.schedule(
  'process-food-analysis-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_functions_url') || '/refresh-food-analysis',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  );
  $$
);
```

### Phase 2: 批次大小動態調整

根據佇列長度自動調整 MAX_BATCH：
- < 10 項目: 一次全處理
- 10-50 項目: 批次 10 個
- > 50 項目: 批次 20 個

### Phase 3: 進度通知

處理完成後發送 push notification：
```
✅ 食物知識庫更新完成
成功處理 3 個項目
```

## 測試驗證

### 測試案例 1: 正常流程

1. ✅ 執行 Weekly AI Analysis
2. ✅ 檢查佇列狀態（應該有 pending 項目）
3. ✅ 點擊「立即處理」
4. ✅ 等待完成訊息
5. ✅ 重新載入狀態（項目應該消失）
6. ✅ 查詢 food_analysis_cache（應該有新資料）

### 測試案例 2: 空佇列

1. ✅ 確保佇列是空的
2. ✅ 點擊「立即處理」
3. ✅ 應顯示「目前沒有待處理的項目」

### 測試案例 3: 大量項目

1. ✅ 加入 > 5 個項目到佇列
2. ✅ 點擊「立即處理」（處理前 5 個）
3. ✅ 再次點擊「立即處理」（處理剩餘項目）
4. ✅ 直到所有項目完成

## 相關檔案

- [系統設計文件](./food-knowledge-system-design.md)
- [Edge Function 原始碼](../supabase/functions/refresh-food-analysis/index.ts)
- [iOS Service](../mobile/react-native-starter-kit/DietDailyMobile/src/features/settings/services/FoodKnowledgeService.ts)
- [iOS Settings Screen](../mobile/react-native-starter-kit/DietDailyMobile/src/features/settings/screens/SettingsScreen.tsx)

## 總結

✅ **已實作功能**:
- 手動觸發處理器
- 即時佇列狀態顯示
- 清晰的 UI 回饋

⏳ **待實作功能**:
- 自動定時處理（pg_cron）
- 進度通知
- 批次大小優化

**建議**: 優先設置 pg_cron 自動處理，讓系統完全自動化運作。
