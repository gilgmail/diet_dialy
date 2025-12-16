-- 檢查約束的詳細欄位資訊
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
  AND tc.constraint_name = 'health_metrics_user_source_unique'
ORDER BY kcu.ordinal_position;

