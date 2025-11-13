-- 驗證測試資料是否正確載入

-- 1. 檢查測試食物
SELECT '=== 測試食物 ===' AS section;
SELECT id, name, category FROM diet_daily_foods WHERE name LIKE 'SEED_%' ORDER BY name;

-- 2. 檢查食物記錄
SELECT '=== 食物記錄 ===' AS section;
SELECT
  TO_CHAR(consumed_at, 'YYYY-MM-DD HH24:MI') as consumed_time,
  food_name,
  food_id
FROM food_entries
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
  AND food_name LIKE 'SEED_%'
ORDER BY consumed_at;

-- 3. 檢查快取狀態
SELECT '=== 快取狀態 ===' AS section;
SELECT
  f.name,
  c.analysis_version,
  EXTRACT(DAY FROM (NOW() - c.analysis_updated_at))::INT as days_old,
  c.refresh_frequency_days,
  CASE
    WHEN EXTRACT(DAY FROM (NOW() - c.analysis_updated_at)) > c.refresh_frequency_days THEN '❌ 過期'
    WHEN EXTRACT(DAY FROM (NOW() - c.analysis_updated_at)) > c.refresh_frequency_days * 0.8 THEN '⚠️ 即將過期'
    ELSE '✅ 正常'
  END as status
FROM food_analysis_cache c
JOIN diet_daily_foods f ON c.food_id = f.id
WHERE f.name LIKE 'SEED_%'
ORDER BY f.name;

-- 4. 檢查刷新佇列
SELECT '=== 刷新佇列 ===' AS section;
SELECT
  f.name,
  q.reason,
  q.status,
  q.priority
FROM food_analysis_refresh_queue q
JOIN diet_daily_foods f ON q.food_id = f.id
WHERE f.name LIKE 'SEED_%'
ORDER BY q.priority DESC, f.name;

-- 5. 檢查是否有無快取的食物
SELECT '=== 無快取的食物 ===' AS section;
SELECT
  f.id,
  f.name
FROM diet_daily_foods f
LEFT JOIN food_analysis_cache c ON f.id = c.food_id
WHERE f.name LIKE 'SEED_%'
  AND c.food_id IS NULL;

-- 6. 統計摘要
SELECT '=== 統計摘要 ===' AS section;
SELECT
  (SELECT COUNT(*) FROM diet_daily_foods WHERE name LIKE 'SEED_%') as total_test_foods,
  (SELECT COUNT(*) FROM food_entries WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6' AND food_name LIKE 'SEED_%') as total_food_entries,
  (SELECT COUNT(*) FROM food_analysis_cache WHERE food_id IN (SELECT id FROM diet_daily_foods WHERE name LIKE 'SEED_%')) as total_cached,
  (SELECT COUNT(*) FROM food_analysis_refresh_queue WHERE food_id IN (SELECT id FROM diet_daily_foods WHERE name LIKE 'SEED_%')) as total_queued;
