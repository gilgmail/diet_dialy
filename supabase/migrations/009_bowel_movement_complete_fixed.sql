-- Migration 009: Standalone bowel movement helpers & legacy cleanup
-- 1. 提供 SQL helper functions（count / last time / summary）
-- 2. 移除舊的 daily_symptom_entries 同步觸發器

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'bowel_movement_entries'
    ) THEN
        RAISE EXCEPTION 'bowel_movement_entries table missing. Run migration 008 first.';
    END IF;
END $$;

-- Helper: 今日紀錄次數
CREATE OR REPLACE FUNCTION get_today_bowel_movement_count(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
    FROM bowel_movement_entries
    WHERE user_id = p_user_id
      AND recorded_date = p_date;
$$;

COMMENT ON FUNCTION get_today_bowel_movement_count IS '取得指定使用者在特定日期的大便紀錄次數';

-- Helper: 最後一次紀錄時間
CREATE OR REPLACE FUNCTION get_last_bowel_movement_time(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE SQL
STABLE
AS $$
    SELECT occurred_at
    FROM bowel_movement_entries
    WHERE user_id = p_user_id
      AND recorded_date = p_date
    ORDER BY occurred_at DESC
    LIMIT 1;
$$;

COMMENT ON FUNCTION get_last_bowel_movement_time IS '取得指定日期最後一次大便紀錄時間';

-- Helper: 單日摘要
CREATE OR REPLACE FUNCTION get_daily_bowel_summary(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    total_count INTEGER,
    last_time TIMESTAMP WITH TIME ZONE,
    has_blood_today BOOLEAN,
    has_diarrhea BOOLEAN,
    has_constipation BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        COUNT(*)::INTEGER AS total_count,
        MAX(occurred_at)   AS last_time,
        BOOL_OR(has_blood) AS has_blood_today,
        BOOL_OR(stool_type = 5) AS has_diarrhea,
        BOOL_OR(stool_type = 1) AS has_constipation
    FROM bowel_movement_entries
    WHERE user_id = p_user_id
      AND recorded_date = p_date;
$$;

COMMENT ON FUNCTION get_daily_bowel_summary IS '取得指定日期的大便摘要（次數/最後時間/血便/腹瀉/便秘）';

-- Remove legacy trigger/function that tried to sync back to daily_symptom_entries
DROP TRIGGER IF EXISTS trigger_update_daily_bowel_summary ON bowel_movement_entries;
DROP FUNCTION IF EXISTS update_daily_bowel_summary();
