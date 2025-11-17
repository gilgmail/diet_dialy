# 🔧 佇列無法處理問題診斷

## 問題症狀

- iOS App 顯示「SEED_香蕉 等待刷新 需更新」
- 「立即處理」按鈕無法點擊或點擊後沒有處理任何項目
- Edge Function 回傳 `"processed": 0`

## 可能原因

### 原因 1: 項目狀態不是 'pending'

Edge Function 只處理 `status='pending'` 的項目。如果項目狀態是其他值（例如 'in_progress', 'completed', 'failed'），就不會被處理。

**診斷方式**：
```sql
-- 檢查所有佇列項目的狀態
SELECT status, COUNT(*) FROM food_analysis_refresh_queue GROUP BY status;
```

**修復方式**：
```sql
-- 將卡住的項目重置為 pending
UPDATE food_analysis_refresh_queue
SET
  status = 'pending',
  attempts = 0,
  failure_reason = NULL,
  updated_at = NOW()
WHERE status IN ('in_progress', 'failed');
```

### 原因 2: scheduled_for 是未來時間

Edge Function 的查詢條件：`.lte('scheduled_for', now)`，表示只處理 `scheduled_for <= 當前時間` 的項目。

**診斷方式**：
```sql
-- 檢查排程時間
SELECT
  f.name,
  q.status,
  q.scheduled_for,
  q.scheduled_for > NOW() as "是否未來時間"
FROM food_analysis_refresh_queue q
JOIN diet_daily_foods f ON f.id = q.food_id
WHERE q.status = 'pending'
ORDER BY q.scheduled_for;
```

**修復方式**：
```sql
-- 將未來時間的項目改為現在
UPDATE food_analysis_refresh_queue
SET
  scheduled_for = NOW(),
  updated_at = NOW()
WHERE status = 'pending'
  AND scheduled_for > NOW();
```

### 原因 3: iOS App UI 狀態問題

按鈕被禁用的條件：
- `!knowledgeStatus` - 狀態未載入
- `knowledgeLoading` - 正在載入中

**修復方式**：
1. 完全關閉 iOS App
2. 重新開啟
3. 前往設定頁面

### 原因 4: 佇列實際上是空的

iOS App 顯示的可能是快取資料。

**診斷方式**：
```sql
-- 檢查是否有待處理項目
SELECT COUNT(*) as pending_count
FROM food_analysis_refresh_queue
WHERE status = 'pending'
  AND scheduled_for <= NOW();
```

## 完整診斷步驟

### 步驟 1: 檢查資料庫

登入 Supabase Dashboard → SQL Editor，執行：

```sql
-- 1. 查看所有佇列項目
SELECT
  f.name as 食物,
  q.status as 狀態,
  q.reason as 原因,
  q.scheduled_for as 排程時間,
  q.scheduled_for <= NOW() as 可處理,
  q.attempts as 嘗試次數,
  q.failure_reason as 失敗原因
FROM food_analysis_refresh_queue q
JOIN diet_daily_foods f ON f.id = q.food_id
ORDER BY q.scheduled_for;

-- 2. 統計狀態
SELECT
  status,
  COUNT(*) as 數量,
  SUM(CASE WHEN scheduled_for <= NOW() THEN 1 ELSE 0 END) as 可立即處理
FROM food_analysis_refresh_queue
GROUP BY status;
```

### 步驟 2: 修復佇列

如果發現問題，執行相應的修復 SQL：

```sql
-- 修復方案 A: 重置卡住的項目
UPDATE food_analysis_refresh_queue
SET
  status = 'pending',
  attempts = 0,
  failure_reason = NULL,
  scheduled_for = NOW(),
  updated_at = NOW()
WHERE status IN ('in_progress', 'failed')
  OR (status = 'pending' AND scheduled_for > NOW());

-- 修復方案 B: 如果 SEED_香蕉 不在佇列中，重新加入
-- 先找到香蕉的 ID
SELECT id, name FROM diet_daily_foods WHERE name LIKE '%香蕉%' LIMIT 5;

-- 然後加入佇列（使用找到的 ID）
INSERT INTO food_analysis_refresh_queue (
  food_id,
  requested_by,
  reason,
  status,
  priority,
  target_version,
  scheduled_for,
  last_requested_at
)
VALUES (
  '你找到的香蕉ID',
  NULL,
  'stale',
  'pending',
  5,
  'queue-auto',
  NOW(),
  NOW()
)
ON CONFLICT (food_id) DO UPDATE SET
  status = 'pending',
  scheduled_for = NOW(),
  updated_at = NOW();
```

### 步驟 3: 測試處理

執行測試腳本：

```bash
./scripts/trigger-processor-test.sh
```

**預期結果**：
```json
{
  "success": true,
  "processed": 1,
  "results": [
    {
      "id": "...",
      "status": "completed",
      "food_name": "SEED_香蕉",
      "tokens": 1050
    }
  ]
}
```

### 步驟 4: 驗證結果

再次查詢資料庫：

```sql
-- 檢查處理結果
SELECT
  f.name,
  q.status,
  q.completed_at,
  c.analysis_source,
  c.risk_profile->>'severity' as severity
FROM food_analysis_refresh_queue q
JOIN diet_daily_foods f ON f.id = q.food_id
LEFT JOIN food_analysis_cache c ON c.food_id = q.food_id
WHERE f.name LIKE '%香蕉%'
ORDER BY q.updated_at DESC;
```

**預期結果**：
- `status = 'completed'`
- `completed_at` 有值
- `analysis_source = 'ai_generated'`
- `severity` 有值（low/moderate/high/critical）

## 快速修復命令

如果你只想快速修復並測試，執行這個一鍵式命令：

```sql
-- 一鍵修復：重置所有佇列項目為可立即處理
UPDATE food_analysis_refresh_queue
SET
  status = 'pending',
  attempts = 0,
  failure_reason = NULL,
  scheduled_for = NOW(),
  updated_at = NOW()
WHERE status != 'completed';
```

然後執行：
```bash
./scripts/trigger-processor-test.sh
```

## 預防措施

為避免未來再次發生，可以：

1. **定期清理佇列**：
   ```sql
   -- 每週執行：清除已完成超過 7 天的項目
   DELETE FROM food_analysis_refresh_queue
   WHERE status = 'completed'
     AND completed_at < NOW() - INTERVAL '7 days';
   ```

2. **監控卡住的項目**：
   ```sql
   -- 查找卡在 in_progress 超過 10 分鐘的項目
   SELECT
     f.name,
     q.status,
     q.updated_at,
     NOW() - q.updated_at as 卡住時間
   FROM food_analysis_refresh_queue q
   JOIN diet_daily_foods f ON f.id = q.food_id
   WHERE status = 'in_progress'
     AND updated_at < NOW() - INTERVAL '10 minutes';
   ```

3. **設定 pg_cron 自動處理**（需要 Supabase Pro）：
   ```sql
   -- 每 5 分鐘自動觸發處理
   SELECT cron.schedule(
     'process-food-knowledge-queue',
     '*/5 * * * *',
     $$
     SELECT net.http_post(
       url := 'https://lbjeyvvierxcnrytuvto.supabase.co/functions/v1/refresh-food-analysis',
       headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
     );
     $$
   );
   ```

## 仍然無法解決？

檢查 Edge Function 日誌：
1. 前往 https://supabase.com/dashboard/project/lbjeyvvierxcnrytuvto/functions
2. 選擇 `refresh-food-analysis`
3. 查看 Logs

常見錯誤訊息：
- `AI API failed: 500` → 檢查 Next.js app 是否正常運作
- `ANTHROPIC_API_KEY is not configured` → 檢查環境變數
- `API_BASE_URL` 錯誤 → 檢查 Edge Function 環境變數設定
