-- Allow multiple symptom diary entries per day
-- Date: 2024-10-14
-- Context: Mobile app now supports creating several symptom notes within a single day.
--          Previous UNIQUE(user_id, recorded_date) constraint caused inserts to fail
--          once a user already had an entry for the same day (error surfaced as
--          「新增失敗，請稍後再試」 in the app).
--          This migration removes that uniqueness constraint and adds a supporting
--          index on (user_id, recorded_at DESC) to keep per-user queries efficient.

ALTER TABLE daily_symptom_entries
  DROP CONSTRAINT IF EXISTS daily_symptom_entries_user_id_recorded_date_key;

CREATE INDEX IF NOT EXISTS idx_daily_symptom_entries_user_recorded_at
  ON daily_symptom_entries(user_id, recorded_at DESC);
