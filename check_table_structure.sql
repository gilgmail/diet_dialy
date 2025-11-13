-- 檢查 diet_daily_foods 表結構
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'diet_daily_foods'
ORDER BY ordinal_position;
