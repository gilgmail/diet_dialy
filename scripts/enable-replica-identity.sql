-- Enable full replica identity for tables to support DELETE events in Realtime
-- This ensures the 'old' record contains all columns, allowing filtering by user_id on DELETE

DO $$
BEGIN
    -- Set Replica Identity for food_entries
    EXECUTE 'ALTER TABLE food_entries REPLICA IDENTITY FULL';
    RAISE NOTICE 'Set REPLICA IDENTITY FULL for food_entries';

    -- Set Replica Identity for daily_symptom_entries
    EXECUTE 'ALTER TABLE daily_symptom_entries REPLICA IDENTITY FULL';
    RAISE NOTICE 'Set REPLICA IDENTITY FULL for daily_symptom_entries';
END $$;

