-- Remove legacy unique constraint to allow multiple symptom entries per day
-- Context:
-- - Mobile 端需要同一天可記錄多筆症狀。
-- - 現在仍有約束 daily_symptom_entries_user_date_unique，導致第二筆插入噴錯 23505。
-- - 先安全地移除殘留的唯一約束（兩個可能的名稱），再補上查詢用索引。

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'daily_symptom_entries_user_date_unique'
  ) THEN
    ALTER TABLE daily_symptom_entries
      DROP CONSTRAINT daily_symptom_entries_user_date_unique;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'daily_symptom_entries_user_id_recorded_date_key'
  ) THEN
    ALTER TABLE daily_symptom_entries
      DROP CONSTRAINT daily_symptom_entries_user_id_recorded_date_key;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_daily_symptom_entries_user_recorded_at
  ON daily_symptom_entries(user_id, recorded_at DESC);
