-- 清理腳本 (如果需要重新開始)
DELETE FROM diet_daily_foods
WHERE taiwan_origin = true
  AND created_at > '2025-09-22';

-- 重置自動遞增ID (可選)
-- ALTER SEQUENCE diet_daily_foods_id_seq RESTART;
