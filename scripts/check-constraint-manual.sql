-- 手動檢查約束的 SQL 查詢
-- 在 Supabase Dashboard SQL Editor 中執行此查詢

-- 1. 檢查所有 UNIQUE 約束
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'health_metrics'
  AND constraint_type = 'UNIQUE'
ORDER BY constraint_name;

-- 2. 檢查約束的欄位
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    kcu.ordinal_position
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'health_metrics'
  AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name, kcu.ordinal_position;

-- 3. 如果看到舊約束，手動刪除它：
-- ALTER TABLE health_metrics DROP CONSTRAINT IF EXISTS health_metrics_source_source_identifier_start_time_key CASCADE;

-- 4. 如果沒有新約束，手動建立它：
-- ALTER TABLE health_metrics ADD CONSTRAINT health_metrics_user_source_unique UNIQUE(user_id, source, source_identifier, start_time);


