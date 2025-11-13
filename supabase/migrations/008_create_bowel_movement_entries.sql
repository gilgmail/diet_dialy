-- Migration 008: Standalone bowel_movement_entries base table
-- 以獨立資料表方式記錄每一次大便，不再回填 daily_symptom_entries

CREATE TABLE IF NOT EXISTS bowel_movement_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- Temporal information
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    recorded_date DATE NOT NULL, -- For calendar-style queries

    -- Core tracking fields
    stool_type INTEGER NOT NULL CHECK (stool_type BETWEEN 1 AND 5),
    has_blood BOOLEAN NOT NULL DEFAULT FALSE,

    -- Optional metadata
    difficulty TEXT CHECK (difficulty IN ('normal', 'difficult', 'urgent')),
    duration_minutes INTEGER CHECK (duration_minutes > 0 AND duration_minutes <= 120),
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_bowel_movement_entries_user_date
ON bowel_movement_entries(user_id, recorded_date DESC);

CREATE INDEX IF NOT EXISTS idx_bowel_movement_entries_occurred_at
ON bowel_movement_entries(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_bowel_movement_entries_user_date_occurred
ON bowel_movement_entries(user_id, recorded_date, occurred_at DESC);

-- Enable RLS and scope all access to the owner
ALTER TABLE bowel_movement_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bowel movement entries" ON bowel_movement_entries;
DROP POLICY IF EXISTS "Users can insert own bowel movement entries" ON bowel_movement_entries;
DROP POLICY IF EXISTS "Users can update own bowel movement entries" ON bowel_movement_entries;
DROP POLICY IF EXISTS "Users can delete own bowel movement entries" ON bowel_movement_entries;

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

-- Documentation comments
COMMENT ON TABLE bowel_movement_entries IS '大便記錄表 - 每次大便獨立記錄，與 daily_symptom_entries 解耦';
COMMENT ON COLUMN bowel_movement_entries.recorded_date IS '記錄日期 (使用者時區) - 方便依日查詢';
COMMENT ON COLUMN bowel_movement_entries.occurred_at IS '實際發生時間 (timestamp with time zone)';
COMMENT ON COLUMN bowel_movement_entries.stool_type IS 'Bristol Stool Scale: 1=便秘/硬, 2=偏硬, 3=正常, 4=偏軟, 5=腹瀉/水狀';
COMMENT ON COLUMN bowel_movement_entries.has_blood IS '是否有血便 (true/false)';
COMMENT ON COLUMN bowel_movement_entries.difficulty IS '排便難度: normal=正常, difficult=困難, urgent=急迫';
COMMENT ON COLUMN bowel_movement_entries.duration_minutes IS '排便時間長度（分鐘）';
