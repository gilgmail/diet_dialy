-- 檢查 health_metrics 表的所有 UNIQUE 約束
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'health_metrics'
  AND constraint_type = 'UNIQUE'
ORDER BY constraint_name;

-- 檢查約束的詳細資訊（包含欄位）
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

-- 檢查索引
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'health_metrics'
  AND indexname LIKE '%upsert%' OR indexname LIKE '%unique%' OR indexname LIKE '%user%'
ORDER BY indexname;


