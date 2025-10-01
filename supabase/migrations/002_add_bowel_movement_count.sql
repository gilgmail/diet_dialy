-- Migration: Add bowel movement count field
-- Date: 2025-09-30
-- Purpose: Add bowel_movement_count to track daily bowel movement frequency

-- Add bowel_movement_count column to daily_symptom_entries
ALTER TABLE daily_symptom_entries
ADD COLUMN bowel_movement_count INTEGER CHECK (bowel_movement_count >= 0 AND bowel_movement_count <= 50) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN daily_symptom_entries.bowel_movement_count IS '大便次數總計 - Daily bowel movement count (0-50, NULL if not recorded)';

-- Update existing entries to have NULL for bowel_movement_count (explicit for clarity)
-- No action needed as DEFAULT NULL handles this

-- Create index for bowel movement tracking queries
CREATE INDEX idx_daily_symptom_entries_bowel_movement
ON daily_symptom_entries(user_id, recorded_date)
WHERE bowel_movement_count IS NOT NULL;

COMMENT ON INDEX idx_daily_symptom_entries_bowel_movement IS 'Index for querying bowel movement patterns by user and date';