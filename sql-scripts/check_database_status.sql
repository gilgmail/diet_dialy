-- 檢查 Supabase 食物資料庫狀態
-- 查詢資料庫中的食物資料筆數和分布情況

-- 1. 總食物筆數
SELECT COUNT(*) as total_foods
FROM diet_daily_foods;

-- 2. 按驗證狀態分組統計
SELECT
    verification_status,
    COUNT(*) as count
FROM diet_daily_foods
GROUP BY verification_status
ORDER BY count DESC;

-- 3. 按分類統計
SELECT
    category,
    COUNT(*) as count
FROM diet_daily_foods
GROUP BY category
ORDER BY count DESC;

-- 4. 台灣食物統計
SELECT
    CASE
        WHEN taiwan_origin = true THEN '台灣食物'
        ELSE '其他食物'
    END as origin_type,
    COUNT(*) as count
FROM diet_daily_foods
GROUP BY taiwan_origin
ORDER BY count DESC;

-- 5. 自訂食物統計
SELECT
    CASE
        WHEN is_custom = true THEN '自訂食物'
        ELSE '系統食物'
    END as food_type,
    COUNT(*) as count
FROM diet_daily_foods
GROUP BY is_custom
ORDER BY count DESC;

-- 6. 最近新增的食物 (前10筆)
SELECT
    name,
    category,
    verification_status,
    taiwan_origin,
    is_custom,
    created_at
FROM diet_daily_foods
ORDER BY created_at DESC
LIMIT 10;

-- 7. 檢查是否有空的必要欄位
SELECT
    'name 為空' as issue,
    COUNT(*) as count
FROM diet_daily_foods
WHERE name IS NULL OR name = ''
UNION ALL
SELECT
    'category 為空' as issue,
    COUNT(*) as count
FROM diet_daily_foods
WHERE category IS NULL OR category = ''
UNION ALL
SELECT
    'calories 為空' as issue,
    COUNT(*) as count
FROM diet_daily_foods
WHERE calories IS NULL;

-- 8. 檢查資料表結構
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'diet_daily_foods'
ORDER BY ordinal_position;