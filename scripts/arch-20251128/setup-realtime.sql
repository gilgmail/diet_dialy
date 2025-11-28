-- Ensure tables are in the supabase_realtime publication
DO $$
BEGIN
  -- Check and add food_entries
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'food_entries') THEN
    RAISE NOTICE 'Adding food_entries to supabase_realtime publication';
    ALTER PUBLICATION supabase_realtime ADD TABLE food_entries;
  ELSE
    RAISE NOTICE 'food_entries is already in supabase_realtime publication';
  END IF;

  -- Check and add daily_symptom_entries
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'daily_symptom_entries') THEN
    RAISE NOTICE 'Adding daily_symptom_entries to supabase_realtime publication';
    ALTER PUBLICATION supabase_realtime ADD TABLE daily_symptom_entries;
  ELSE
    RAISE NOTICE 'daily_symptom_entries is already in supabase_realtime publication';
  END IF;
END $$;

-- Verify configuration
SELECT pubname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('food_entries', 'daily_symptom_entries');

-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('food_entries', 'daily_symptom_entries');

-- Insert a test record (Optional, just to verify write access)
-- INSERT INTO food_entries (user_id, food_name, meal_type, amount, unit, consumed_at)
-- VALUES ('22e990b6-a888-4beb-9ac6-c9a145731542', 'Realtime Setup Test', 'snack', 1, 'unit', NOW());

