-- Combined Migration: Complete Bowel Movement Tracking Setup
-- This migration combines 006, 007, and 008 for easy deployment
-- Execute this in Supabase SQL Editor

-- ============================================================
-- Part 1: Add stool_type to daily_symptom_entries (from 006)
-- ============================================================

-- Check if stool_type column exists before adding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_symptom_entries'
        AND column_name = 'stool_type'
    ) THEN
        ALTER TABLE daily_symptom_entries
        ADD COLUMN stool_type INTEGER DEFAULT 3 CHECK (stool_type >= 1 AND stool_type <= 5);

        COMMENT ON COLUMN daily_symptom_entries.stool_type IS 'Stool Type Scale (大便形態): 1=非常硬/便秘, 2=偏硬, 3=正常, 4=偏軟, 5=水狀/腹瀉. Default: 3 (正常)';
    END IF;
END $$;

-- ============================================================
-- Part 2: Add has_blood to daily_symptom_entries (from 007)
-- ============================================================

-- Check if has_blood column exists before adding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_symptom_entries'
        AND column_name = 'has_blood'
    ) THEN
        ALTER TABLE daily_symptom_entries
        ADD COLUMN has_blood BOOLEAN DEFAULT FALSE;

        COMMENT ON COLUMN daily_symptom_entries.has_blood IS '是否血便 - Simple boolean indicator for blood in stool';

        -- Update existing records where bloody_stool > 0 to set has_blood = true
        UPDATE daily_symptom_entries
        SET has_blood = TRUE
        WHERE bloody_stool > 0;
    END IF;
END $$;

-- Create composite index for bowel movement queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_daily_symptom_entries_bowel_movement_complete
ON daily_symptom_entries(user_id, recorded_date, bowel_movement_count, stool_type, has_blood)
WHERE bowel_movement_count IS NOT NULL;

COMMENT ON INDEX idx_daily_symptom_entries_bowel_movement_complete IS 'Comprehensive index for bowel movement tracking queries';

-- Ensure unique constraint exists for (user_id, recorded_date)
-- This is required for ON CONFLICT in the trigger function
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'daily_symptom_entries'::regclass
        AND contype = 'u'
        AND conkey = (
            SELECT ARRAY_AGG(attnum ORDER BY attnum)
            FROM pg_attribute
            WHERE attrelid = 'daily_symptom_entries'::regclass
            AND attname IN ('user_id', 'recorded_date')
        )
    ) THEN
        ALTER TABLE daily_symptom_entries
        ADD CONSTRAINT daily_symptom_entries_user_date_unique UNIQUE (user_id, recorded_date);
    END IF;
END $$;

-- Add comments for existing columns
COMMENT ON COLUMN daily_symptom_entries.bowel_movement_count IS '大便次數 - Number of bowel movements (0-50)';
COMMENT ON COLUMN daily_symptom_entries.stool_type IS '大便形態 - Bristol Stool Scale (1=便秘/硬, 2=偏硬, 3=正常, 4=偏軟, 5=腹瀉/水狀)';
COMMENT ON COLUMN daily_symptom_entries.bloody_stool IS '血便嚴重度 - Blood in stool severity score (0-5, 0=無, 5=嚴重)';

-- ============================================================
-- Part 3: Create bowel_movement_entries table (from 008)
-- ============================================================

-- Create table only if it doesn't exist
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

-- Row Level Security
ALTER TABLE bowel_movement_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running)
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
COMMENT ON TABLE bowel_movement_entries IS '大便記錄表 - 每次大便獨立記錄';
COMMENT ON COLUMN bowel_movement_entries.stool_type IS 'Bristol Stool Scale: 1=便秘/硬, 2=偏硬, 3=正常, 4=偏軟, 5=腹瀉/水狀';
COMMENT ON COLUMN bowel_movement_entries.has_blood IS '是否有血便';
COMMENT ON COLUMN bowel_movement_entries.difficulty IS '排便難度: normal=正常, difficult=困難, urgent=急迫';
COMMENT ON COLUMN bowel_movement_entries.duration_minutes IS '排便時間長度（分鐘）';

-- ============================================================
-- Part 4: Create trigger function and trigger
-- ============================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_update_daily_bowel_summary ON bowel_movement_entries;
DROP FUNCTION IF EXISTS update_daily_bowel_summary();

-- Function to automatically update daily summary in daily_symptom_entries
CREATE OR REPLACE FUNCTION update_daily_bowel_summary()
RETURNS TRIGGER AS $$
DECLARE
    v_date DATE;
    v_count INTEGER;
    v_has_blood BOOLEAN;
    v_max_severity INTEGER;
BEGIN
    -- Determine the date to update
    IF (TG_OP = 'DELETE') THEN
        v_date := OLD.recorded_date;
    ELSE
        v_date := NEW.recorded_date;
    END IF;

    -- Calculate daily statistics
    SELECT
        COUNT(*),
        BOOL_OR(has_blood),
        MAX(CASE
            WHEN stool_type = 1 THEN 5  -- Most severe: constipation
            WHEN stool_type = 5 THEN 5  -- Most severe: diarrhea
            WHEN stool_type = 2 THEN 3
            WHEN stool_type = 4 THEN 3
            ELSE 1  -- Normal
        END)
    INTO v_count, v_has_blood, v_max_severity
    FROM bowel_movement_entries
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND recorded_date = v_date;

    -- Update or insert into daily_symptom_entries
    INSERT INTO daily_symptom_entries (
        user_id,
        recorded_date,
        recorded_at,
        overall_health,
        abdominal_pain,
        diarrhea,
        bloody_stool,
        bloating,
        bowel_movement_count,
        stool_type,
        has_blood
    )
    VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        v_date,
        COALESCE(NEW.occurred_at, OLD.occurred_at, NOW()),
        3, -- default
        0, -- default
        CASE WHEN EXISTS (SELECT 1 FROM bowel_movement_entries WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND recorded_date = v_date AND stool_type = 5) THEN 3 ELSE 0 END,
        CASE WHEN v_has_blood THEN v_max_severity ELSE 0 END,
        0, -- default
        COALESCE(v_count, 0),
        3, -- default stool type
        COALESCE(v_has_blood, FALSE)
    )
    ON CONFLICT (user_id, recorded_date)
    DO UPDATE SET
        bowel_movement_count = COALESCE(v_count, 0),
        has_blood = COALESCE(v_has_blood, FALSE),
        bloody_stool = CASE WHEN COALESCE(v_has_blood, FALSE) THEN v_max_severity ELSE 0 END,
        diarrhea = CASE WHEN EXISTS (SELECT 1 FROM bowel_movement_entries WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) AND recorded_date = v_date AND stool_type = 5) THEN 3 ELSE 0 END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update daily summary
CREATE TRIGGER trigger_update_daily_bowel_summary
AFTER INSERT OR UPDATE OR DELETE ON bowel_movement_entries
FOR EACH ROW
EXECUTE FUNCTION update_daily_bowel_summary();

COMMENT ON FUNCTION update_daily_bowel_summary() IS '自動更新 daily_symptom_entries 的每日大便統計';

-- ============================================================
-- Migration Complete
-- ============================================================
