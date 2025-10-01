-- Migration 006: Add stool_type column for Stool Type tracking (1-5 scale)
-- 添加大便形態記錄欄位（1-5 分制）

-- Add stool_type column with default value of 3 (正常)
ALTER TABLE daily_symptom_entries
ADD COLUMN stool_type integer DEFAULT 3 CHECK (stool_type >= 1 AND stool_type <= 5);

-- Add comment for documentation
COMMENT ON COLUMN daily_symptom_entries.stool_type IS 'Stool Type Scale (大便形態): 1=非常硬/便秘, 2=偏硬, 3=正常, 4=偏軟, 5=水狀/腹瀉. Default: 3 (正常)';