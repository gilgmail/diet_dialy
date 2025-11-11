-- Migration 007: Add comprehensive bowel movement tracking fields
-- 添加完整的大便記錄欄位

-- Add has_blood field (boolean for simple yes/no tracking)
-- This complements the existing bloody_stool score field (0-5)
ALTER TABLE daily_symptom_entries
ADD COLUMN has_blood BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN daily_symptom_entries.has_blood IS '是否血便 - Simple boolean indicator for blood in stool';

-- Update existing records where bloody_stool > 0 to set has_blood = true
UPDATE daily_symptom_entries
SET has_blood = TRUE
WHERE bloody_stool > 0;

-- Create composite index for bowel movement queries
CREATE INDEX idx_daily_symptom_entries_bowel_movement_complete
ON daily_symptom_entries(user_id, recorded_date, bowel_movement_count, stool_type, has_blood)
WHERE bowel_movement_count IS NOT NULL;

COMMENT ON INDEX idx_daily_symptom_entries_bowel_movement_complete IS 'Comprehensive index for bowel movement tracking queries';

-- Add comments for existing columns for documentation
COMMENT ON COLUMN daily_symptom_entries.bowel_movement_count IS '大便次數 - Number of bowel movements (0-50)';
COMMENT ON COLUMN daily_symptom_entries.stool_type IS '大便形態 - Bristol Stool Scale (1=便秘/硬, 2=偏硬, 3=正常, 4=偏軟, 5=腹瀉/水狀)';
COMMENT ON COLUMN daily_symptom_entries.bloody_stool IS '血便嚴重度 - Blood in stool severity score (0-5, 0=無, 5=嚴重)';
