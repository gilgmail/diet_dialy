-- ============================================================================
-- Reporting Indexes Migration
-- Created: 2025-12-17
-- Purpose: 優化報表查詢效能，支援 HealthKit 整合報表系統
-- ============================================================================

-- ============================================================================
-- 1. 排便記錄查詢優化
-- ============================================================================

-- 用戶 + 發生時間索引（用於時間序列查詢）
CREATE INDEX IF NOT EXISTS idx_bowel_movements_user_occurred
  ON bowel_movement_entries(user_id, occurred_at DESC);

-- 用戶 + 記錄日期 + 便便類型索引（用於 Bristol Scale 分佈統計）
CREATE INDEX IF NOT EXISTS idx_bowel_movements_user_date_type
  ON bowel_movement_entries(user_id, recorded_date, stool_type);

-- 用戶 + 血便標記索引（用於快速篩選血便事件）
CREATE INDEX IF NOT EXISTS idx_bowel_movements_user_blood
  ON bowel_movement_entries(user_id, has_blood)
  WHERE has_blood = TRUE;

-- ============================================================================
-- 2. HealthKit 多維度查詢優化
-- ============================================================================

-- 用戶 + 指標類型 + 記錄日期索引（用於特定類型健康指標的時間序列查詢）
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_type_date
  ON health_metrics(user_id, metric_type, recorded_date DESC);

-- 用戶 + 記錄日期 + 指標類型 + 數值索引（用於多維度聚合查詢）
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date_type_value
  ON health_metrics(user_id, recorded_date, metric_type, numeric_value);

-- 用戶 + 來源 + 同步狀態索引（用於同步狀態追蹤）
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_source_status
  ON health_metrics(user_id, source, sync_status);

-- 睡眠數據快速查詢索引
CREATE INDEX IF NOT EXISTS idx_health_metrics_sleep
  ON health_metrics(user_id, recorded_date DESC, numeric_value)
  WHERE metric_type = 'sleep_analysis';

-- 運動數據快速查詢索引
CREATE INDEX IF NOT EXISTS idx_health_metrics_workout
  ON health_metrics(user_id, recorded_date DESC, numeric_value)
  WHERE metric_type = 'workout';

-- 心率數據快速查詢索引
CREATE INDEX IF NOT EXISTS idx_health_metrics_heart_rate
  ON health_metrics(user_id, recorded_date DESC, numeric_value)
  WHERE metric_type = 'heart_rate';

-- ============================================================================
-- 3. 症狀-時間複合查詢優化
-- ============================================================================

-- 用戶 + 日期 + 症狀分數索引（用於症狀趨勢分析）
CREATE INDEX IF NOT EXISTS idx_symptoms_user_date_scores
  ON daily_symptom_entries(user_id, recorded_date DESC, abdominal_pain, diarrhea, bloating, bloody_stool);

-- 用戶 + 日期 + 整體健康索引（用於健康評分趨勢）
CREATE INDEX IF NOT EXISTS idx_symptoms_user_date_health
  ON daily_symptom_entries(user_id, recorded_date DESC, overall_health);

-- 用戶 + 日期 + HealthKit 指標索引（用於關聯分析）
CREATE INDEX IF NOT EXISTS idx_symptoms_user_date_healthkit
  ON daily_symptom_entries(user_id, recorded_date DESC, avg_heart_rate, daily_steps, active_calories, water_intake_ml);

-- ============================================================================
-- 4. 食物記錄時間查詢優化
-- ============================================================================

-- 用戶 + 進食時間索引（用於飲食時間序列查詢）
CREATE INDEX IF NOT EXISTS idx_food_entries_user_consumed
  ON food_entries(user_id, consumed_at DESC);

-- 用戶 + 進食時間 + 餐別索引（用於餐別統計）
CREATE INDEX IF NOT EXISTS idx_food_entries_user_consumed_meal
  ON food_entries(user_id, consumed_at DESC, meal_type);

-- 用戶 + 食物ID + 進食時間索引（用於特定食物追蹤）
CREATE INDEX IF NOT EXISTS idx_food_entries_user_food_consumed
  ON food_entries(user_id, food_id, consumed_at DESC);

-- ============================================================================
-- 5. 餐點紀錄查詢優化
-- ============================================================================

-- 用戶 + 記錄時間 + 餐別索引（用於餐點紀錄快速查詢）
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_logged_meal
  ON meal_logs(user_id, logged_at DESC, meal_type);

-- ============================================================================
-- 6. 睡眠紀錄查詢優化
-- ============================================================================

-- 用戶 + 開始時間索引（用於睡眠時間序列查詢）
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_start
  ON sleep_sessions(user_id, start_time DESC);

-- 用戶 + 開始時間 + 主要睡眠標記索引（用於區分主要睡眠和午睡）
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_start_main
  ON sleep_sessions(user_id, start_time DESC, is_main_sleep)
  WHERE is_main_sleep = TRUE;

-- ============================================================================
-- 7. 活動紀錄查詢優化
-- ============================================================================

-- 用戶 + 開始時間索引（用於活動時間序列查詢）
CREATE INDEX IF NOT EXISTS idx_activity_sessions_user_start
  ON activity_sessions(user_id, start_time DESC);

-- 用戶 + 開始時間 + 活動類型索引（用於特定類型活動統計）
CREATE INDEX IF NOT EXISTS idx_activity_sessions_user_start_type
  ON activity_sessions(user_id, start_time DESC, activity_type);

-- ============================================================================
-- 8. 建立索引統計資訊追蹤
-- ============================================================================

-- 建立一個視圖來監控索引使用情況（僅供管理員使用）
CREATE OR REPLACE VIEW reporting_index_usage AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (
    indexrelname LIKE 'idx_bowel_movements_%' OR
    indexrelname LIKE 'idx_health_metrics_%' OR
    indexrelname LIKE 'idx_symptoms_%' OR
    indexrelname LIKE 'idx_food_entries_%' OR
    indexrelname LIKE 'idx_meal_logs_%' OR
    indexrelname LIKE 'idx_sleep_sessions_%' OR
    indexrelname LIKE 'idx_activity_sessions_%'
  )
ORDER BY idx_scan DESC;

-- ============================================================================
-- 完成通知
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Reporting indexes migration completed successfully!';
  RAISE NOTICE 'ℹ️  Created indexes for:';
  RAISE NOTICE '   - Bowel movement entries (3 indexes)';
  RAISE NOTICE '   - Health metrics (7 indexes)';
  RAISE NOTICE '   - Daily symptom entries (3 indexes)';
  RAISE NOTICE '   - Food entries (3 indexes)';
  RAISE NOTICE '   - Meal logs (1 index)';
  RAISE NOTICE '   - Sleep sessions (2 indexes)';
  RAISE NOTICE '   - Activity sessions (2 indexes)';
  RAISE NOTICE 'ℹ️  Total: 21 new indexes created for reporting optimization';
END $$;
