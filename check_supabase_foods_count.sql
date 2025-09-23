-- 檢查 Supabase diet_daily_foods 表的資料筆數
-- 簡單快速查詢

-- 1. 總筆數
SELECT COUNT(*) as total_records
FROM diet_daily_foods;

-- 2. 按驗證狀態分組
SELECT
    verification_status,
    COUNT(*) as count
FROM diet_daily_foods
GROUP BY verification_status;

-- 3. 檢查資料是否適合做 food-database
SELECT
    'Total Records' as metric,
    COUNT(*) as value
FROM diet_daily_foods
UNION ALL
SELECT
    'Approved Records' as metric,
    COUNT(*) as value
FROM diet_daily_foods
WHERE verification_status = 'approved'
UNION ALL
SELECT
    'Has Name' as metric,
    COUNT(*) as value
FROM diet_daily_foods
WHERE name IS NOT NULL AND name != ''
UNION ALL
SELECT
    'Has Category' as metric,
    COUNT(*) as value
FROM diet_daily_foods
WHERE category IS NOT NULL AND category != ''
UNION ALL
SELECT
    'Has Nutrition Data' as metric,
    COUNT(*) as value
FROM diet_daily_foods
WHERE calories IS NOT NULL;

-- 4. 查看前幾筆資料樣本
SELECT
    name,
    category,
    calories,
    verification_status,
    created_at
FROM diet_daily_foods
ORDER BY created_at DESC
LIMIT 5;