-- 啟用 Realtime Publication for all tables

-- 為主要表啟用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE food_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_symptom_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE bowel_movement_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- 驗證設置
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries', 'users')
ORDER BY tablename;

