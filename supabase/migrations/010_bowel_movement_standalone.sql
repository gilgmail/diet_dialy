-- Migration 010: Standalone Bowel Movement Tracking System
-- 獨立的大便記錄系統 - 不與症狀記錄混合

-- ============================================================
-- Part 1: Create standalone bowel_movement_entries table
-- ============================================================

CREATE TABLE IF NOT EXISTS bowel_movement_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- Temporal information
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    recorded_date DATE NOT NULL, -- For indexing and daily queries

    -- Bristol Stool Scale (1-5)
    stool_type INTEGER NOT NULL CHECK (stool_type >= 1 AND stool_type <= 5),

    -- Blood in stool indicator
    has_blood BOOLEAN NOT NULL DEFAULT FALSE,

    -- Optional difficulty indicator
    difficulty TEXT CHECK (difficulty IN ('normal', 'difficult', 'urgent')),

    -- Optional duration in minutes
    duration_minutes INTEGER CHECK (duration_minutes > 0 AND duration_minutes <= 120),

    -- Optional notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_bowel_movement_entries_user_date
ON bowel_movement_entries(user_id, recorded_date DESC);

CREATE INDEX IF NOT EXISTS idx_bowel_movement_entries_occurred_at
ON bowel_movement_entries(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_bowel_movement_entries_user_date_occurred
ON bowel_movement_entries(user_id, recorded_date, occurred_at DESC);

-- Row Level Security
ALTER TABLE bowel_movement_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own bowel movement entries" ON bowel_movement_entries;
DROP POLICY IF EXISTS "Users can insert own bowel movement entries" ON bowel_movement_entries;
DROP POLICY IF EXISTS "Users can update own bowel movement entries" ON bowel_movement_entries;
DROP POLICY IF EXISTS "Users can delete own bowel movement entries" ON bowel_movement_entries;

-- Create policies
CREATE POLICY "Users can view own bowel movement entries"
ON bowel_movement_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bowel movement entries"
ON bowel_movement_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bowel movement entries"
ON bowel_movement_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bowel movement entries"
ON bowel_movement_entries FOR DELETE
USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE bowel_movement_entries IS '大便記錄表 - 獨立記錄系統，不與症狀記錄混合';
COMMENT ON COLUMN bowel_movement_entries.stool_type IS 'Bristol Stool Scale: 1=便秘/硬, 2=偏硬, 3=正常, 4=偏軟, 5=腹瀉/水狀';
COMMENT ON COLUMN bowel_movement_entries.has_blood IS '是否有血便';
COMMENT ON COLUMN bowel_movement_entries.difficulty IS '排便難度: normal=正常, difficult=困難, urgent=急迫';
COMMENT ON COLUMN bowel_movement_entries.duration_minutes IS '排便時間長度（分鐘）';
COMMENT ON COLUMN bowel_movement_entries.recorded_date IS '記錄日期 - 用於快速查詢當日記錄';
COMMENT ON COLUMN bowel_movement_entries.occurred_at IS '實際發生時間 - 精確到分鐘';

-- ============================================================
-- Part 2: Helper functions for daily statistics
-- ============================================================

-- Function to get today's bowel movement count for a user
CREATE OR REPLACE FUNCTION get_today_bowel_movement_count(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM bowel_movement_entries
    WHERE user_id = p_user_id
    AND recorded_date = p_date;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_today_bowel_movement_count IS '取得指定日期的大便記錄次數';

-- Function to get last bowel movement time for a user
CREATE OR REPLACE FUNCTION get_last_bowel_movement_time(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
    SELECT occurred_at
    FROM bowel_movement_entries
    WHERE user_id = p_user_id
    AND recorded_date = p_date
    ORDER BY occurred_at DESC
    LIMIT 1;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_last_bowel_movement_time IS '取得指定日期最後一次大便記錄的時間';

-- Function to get daily bowel movement summary
CREATE OR REPLACE FUNCTION get_daily_bowel_summary(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    total_count INTEGER,
    last_time TIMESTAMP WITH TIME ZONE,
    has_blood_today BOOLEAN,
    has_diarrhea BOOLEAN,
    has_constipation BOOLEAN
) AS $$
    SELECT
        COUNT(*)::INTEGER as total_count,
        MAX(occurred_at) as last_time,
        BOOL_OR(has_blood) as has_blood_today,
        BOOL_OR(stool_type = 5) as has_diarrhea,
        BOOL_OR(stool_type = 1) as has_constipation
    FROM bowel_movement_entries
    WHERE user_id = p_user_id
    AND recorded_date = p_date;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_daily_bowel_summary IS '取得指定日期的大便記錄統計摘要';

-- ============================================================
-- Part 3: Clean up daily_symptom_entries (optional)
-- ============================================================

-- Note: These are commented out to preserve existing data
-- Uncomment if you want to remove the redundant columns

-- Remove diarrhea column (now tracked in bowel_movement_entries as stool_type=5)
-- ALTER TABLE daily_symptom_entries DROP COLUMN IF EXISTS diarrhea;

-- Remove bowel movement related columns (now in separate table)
-- ALTER TABLE daily_symptom_entries DROP COLUMN IF EXISTS bowel_movement_count;
-- ALTER TABLE daily_symptom_entries DROP COLUMN IF EXISTS stool_type;
-- ALTER TABLE daily_symptom_entries DROP COLUMN IF EXISTS has_blood;

-- Remove the auto-sync trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_daily_bowel_summary ON bowel_movement_entries;
DROP FUNCTION IF EXISTS update_daily_bowel_summary();

-- ============================================================
-- Migration Complete
-- ============================================================

-- Usage examples:
-- Get today's count: SELECT get_today_bowel_movement_count('user-uuid');
-- Get last time: SELECT get_last_bowel_movement_time('user-uuid');
-- Get summary: SELECT * FROM get_daily_bowel_summary('user-uuid');
