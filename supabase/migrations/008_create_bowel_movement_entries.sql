-- Migration 008: Create bowel_movement_entries table for individual bowel movement tracking
-- 創建大便記錄表 - 每次大便獨立記錄

CREATE TABLE bowel_movement_entries (
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
CREATE INDEX idx_bowel_movement_entries_user_date
ON bowel_movement_entries(user_id, recorded_date DESC);

CREATE INDEX idx_bowel_movement_entries_occurred_at
ON bowel_movement_entries(user_id, occurred_at DESC);

-- Row Level Security
ALTER TABLE bowel_movement_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own entries
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
