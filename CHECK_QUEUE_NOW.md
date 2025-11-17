# 🔍 立即檢查佇列狀態

## 問題

Edge Function 回傳 `"processed": 0`，表示沒有處理任何項目。

## 需要你做的事

### 步驟 1: 檢查佇列實際狀態

前往 **Supabase Dashboard** → **SQL Editor**

執行這個查詢：

```sql
-- 查看所有佇列項目的詳細狀態
SELECT
  f.name as 食物名稱,
  q.status as 狀態,
  q.scheduled_for as 排程時間,
  NOW() as 現在時間,
  q.scheduled_for <= NOW() as 可立即處理,
  q.attempts as 嘗試次數,
  q.failure_reason as 失敗原因
FROM food_analysis_refresh_queue q
JOIN diet_daily_foods f ON f.id = q.food_id
ORDER BY q.scheduled_for DESC
LIMIT 20;
```

**請告訴我這個查詢的結果！** 特別是：
- SEED_香蕉的 `狀態` 是什麼？
- `可立即處理` 是 true 還是 false？

---

## 可能的情況

### 情況 A: status 不是 'pending'

如果 SEED_香蕉的狀態是 `'in_progress'`、`'failed'` 或 `'completed'`，需要重置：

```sql
UPDATE food_analysis_refresh_queue
SET
  status = 'pending',
  attempts = 0,
  failure_reason = NULL,
  scheduled_for = NOW(),
  updated_at = NOW()
WHERE food_id IN (
  SELECT id FROM diet_daily_foods WHERE name LIKE '%香蕉%'
);
```

### 情況 B: scheduled_for 是未來時間

如果 `可立即處理` 顯示 `false`，需要更新時間：

```sql
UPDATE food_analysis_refresh_queue
SET
  scheduled_for = NOW(),
  updated_at = NOW()
WHERE food_id IN (
  SELECT id FROM diet_daily_foods WHERE name LIKE '%香蕉%'
);
```

### 情況 C: 佇列實際上是空的

如果查詢沒有回傳任何結果，表示 SEED_香蕉不在佇列中。

檢查是否存在：
```sql
SELECT COUNT(*) as 佇列項目數量
FROM food_analysis_refresh_queue;
```

---

## 快速修復（不管是哪種情況）

執行這個「一鍵重置」SQL：

```sql
-- 重置所有非完成狀態的項目
UPDATE food_analysis_refresh_queue
SET
  status = 'pending',
  attempts = 0,
  failure_reason = NULL,
  scheduled_for = NOW(),
  updated_at = NOW()
WHERE status IN ('pending', 'in_progress', 'failed')
  OR scheduled_for > NOW();
```

然後再次執行：
```bash
./scripts/trigger-processor-test.sh
```

---

## 如果還是 processed: 0

那表示佇列真的是空的。手動加入一個測試項目：

```sql
-- 1. 找到香蕉的 ID
SELECT id, name
FROM diet_daily_foods
WHERE name LIKE '%香蕉%'
  OR name LIKE '%SEED%'
LIMIT 5;

-- 2. 加入佇列（用上面找到的 ID 替換）
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
  '你找到的香蕉ID',  -- 替換這裡
  NULL,
  'manual_request',
  'pending',
  9,
  'queue-auto',
  NOW(),
  NOW()
)
ON CONFLICT (food_id)
DO UPDATE SET
  status = 'pending',
  scheduled_for = NOW(),
  updated_at = NOW();

-- 3. 確認加入成功
SELECT
  f.name,
  q.status,
  q.scheduled_for <= NOW() as 可處理
FROM food_analysis_refresh_queue q
JOIN diet_daily_foods f ON f.id = q.food_id
WHERE f.name LIKE '%香蕉%';
```

---

## 等你的回報

請執行第一個查詢，然後告訴我結果，我就能精準告訴你下一步該做什麼！ 🎯
