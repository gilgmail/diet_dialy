-- Fix for food deletion issue: Add missing DELETE policy for admins
-- Root cause: RLS is enabled but no DELETE policy exists, preventing all deletions

-- Add admin DELETE policy for diet_daily_foods table
CREATE POLICY "Admins can delete foods" ON diet_daily_foods
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM diet_daily_users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Optional: Also allow users to delete their own custom foods
CREATE POLICY "Users can delete own custom foods" ON diet_daily_foods
    FOR DELETE USING (created_by = auth.uid() AND is_custom = true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'diet_daily_foods' AND cmd = 'DELETE';