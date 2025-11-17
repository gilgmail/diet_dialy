-- 檢查食物知識刷新佇列狀態

-- 1. 所有佇列項目
SELECT
  q.id,
  f.name as 食物名稱,
  q.status as 狀態,
  q.reason as 原因,
  q.priority as 優先度,
  q.attempts as 嘗試次數,
  q.scheduled_for as 排程時間,
  q.updated_at as 更新時間,
  q.failure_reason as 失敗原因
FROM food_analysis_refresh_queue q
LEFT JOIN diet_daily_foods f ON f.id = q.food_id
ORDER BY q.priority DESC, q.scheduled_for ASC
LIMIT 20;

-- 2. 按狀態統計
SELECT
  status as 狀態,
  COUNT(*) as 數量
FROM food_analysis_refresh_queue
GROUP BY status
ORDER BY status;

-- 3. 檢查 SEED_香蕉 的狀態
SELECT
  q.*,
  f.name
FROM food_analysis_refresh_queue q
LEFT JOIN diet_daily_foods f ON f.id = q.food_id
WHERE f.name LIKE '%香蕉%'
  OR f.name LIKE '%SEED%'
  OR q.food_id IN (
    SELECT id FROM diet_daily_foods WHERE name LIKE '%香蕉%'
  );
