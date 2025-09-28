-- Setup admin user for gilko0725@gmail.com
-- This script should be run in Supabase SQL Editor after the user has signed up

-- First, check if the user exists in auth.users
SELECT
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
WHERE email = 'gilko0725@gmail.com';

-- If user exists in auth.users but not in diet_daily_users, insert them
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

-- If user already exists in diet_daily_users, just update their admin status
UPDATE diet_daily_users
SET
    is_admin = true,
    updated_at = now()
WHERE email = 'gilko0725@gmail.com';

-- Verify the admin user was created/updated successfully
SELECT
    ddu.id,
    ddu.email,
    ddu.name,
    ddu.is_admin,
    ddu.created_at,
    au.email_confirmed_at
FROM diet_daily_users ddu
JOIN auth.users au ON ddu.id = au.id
WHERE ddu.email = 'gilko0725@gmail.com';