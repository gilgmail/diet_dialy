-- Restore Proper RLS Policy
-- Date: 2025-09-30
-- Purpose: Restore secure auth.uid() based RLS policies after testing
-- ⚠️ Execute this AFTER testing is complete to restore security

-- Drop temporary permissive policies
DROP POLICY IF EXISTS "Users can insert own daily symptom entries" ON daily_symptom_entries;
DROP POLICY IF EXISTS "Users can view own daily symptom entries" ON daily_symptom_entries;
DROP POLICY IF EXISTS "Users can update own daily symptom entries" ON daily_symptom_entries;
DROP POLICY IF EXISTS "Users can delete own daily symptom entries" ON daily_symptom_entries;

-- Restore original secure policy
CREATE POLICY "Users can manage own daily symptom entries" ON daily_symptom_entries
    FOR ALL USING (user_id = auth.uid());

-- Remove temporary comment
COMMENT ON TABLE daily_symptom_entries IS 'Daily symptom entries with proper RLS security';