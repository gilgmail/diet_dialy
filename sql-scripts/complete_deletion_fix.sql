-- Complete fix for food deletion issue
-- Root cause: Missing DELETE policies and admin user setup

-- STEP 1: Add DELETE policies for diet_daily_foods table
-- This allows admins to delete foods and users to delete their own custom foods

CREATE POLICY "Admins can delete foods" ON diet_daily_foods
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM diet_daily_users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Users can delete own custom foods" ON diet_daily_foods
    FOR DELETE USING (created_by = auth.uid() AND is_custom = true);

-- STEP 2: Setup admin user (run after user has signed up)
-- This promotes gilko0725@gmail.com to admin status

-- Check if user exists in auth.users
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'gilko0725@gmail.com';

-- Add to diet_daily_users if they exist in auth but not in our table
INSERT INTO diet_daily_users (id, email, name, is_admin, created_at, updated_at)
SELECT
    au.id,
    au.email,
    'Gilko Admin',
    true,
    now(),
    now()
FROM auth.users au
WHERE au.email = 'gilko0725@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM diet_daily_users ddu
    WHERE ddu.id = au.id
);

-- Or update existing user to admin
UPDATE diet_daily_users
SET is_admin = true, updated_at = now()
WHERE email = 'gilko0725@gmail.com';

-- STEP 3: Verify the fix
-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, cmd, qual
FROM pg_policies
WHERE tablename = 'diet_daily_foods' AND cmd = 'DELETE';

-- Check admin user exists
SELECT ddu.id, ddu.email, ddu.is_admin, au.email_confirmed_at
FROM diet_daily_users ddu
JOIN auth.users au ON ddu.id = au.id
WHERE ddu.email = 'gilko0725@gmail.com';