-- 完整的刪除功能修復方案
-- 解決 Row Level Security 阻擋 DELETE 操作的問題

-- PART 1: 確保資料庫結構正確 (以防 is_admin 欄位遺漏)
-- 如果欄位已存在，這些指令會安全地失敗，不會造成問題

-- 添加 is_admin 欄位 (如果不存在)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='diet_daily_users' AND column_name='is_admin') THEN
        ALTER TABLE diet_daily_users ADD COLUMN is_admin BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 添加 admin_permissions 欄位 (如果不存在)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='diet_daily_users' AND column_name='admin_permissions') THEN
        ALTER TABLE diet_daily_users ADD COLUMN admin_permissions JSONB DEFAULT '{}';
    END IF;
END $$;

-- PART 2: 創建 DELETE 策略
-- 允許管理員刪除食物記錄

DROP POLICY IF EXISTS "Admins can delete foods" ON diet_daily_foods;
CREATE POLICY "Admins can delete foods" ON diet_daily_foods
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM diet_daily_users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 允許用戶刪除自己的自定義食物
DROP POLICY IF EXISTS "Users can delete own custom foods" ON diet_daily_foods;
CREATE POLICY "Users can delete own custom foods" ON diet_daily_foods
    FOR DELETE USING (created_by = auth.uid() AND is_custom = true);

-- PART 3: 檢查目前的用戶狀況
SELECT
    'auth.users' as table_name,
    count(*) as user_count,
    string_agg(email, ', ') as emails
FROM auth.users
WHERE email = 'gilko0725@gmail.com';

SELECT
    'diet_daily_users' as table_name,
    count(*) as user_count,
    string_agg(email, ', ') as emails
FROM diet_daily_users
WHERE email = 'gilko0725@gmail.com';

-- PART 4: 如果用戶存在於 auth.users 但不在 diet_daily_users，則添加他們
-- 注意：這只有在用戶已經在 auth.users 中存在時才會執行

INSERT INTO diet_daily_users (id, email, name, is_admin, created_at, updated_at)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'Gilko Admin'),
    true,
    now(),
    now()
FROM auth.users au
WHERE au.email = 'gilko0725@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM diet_daily_users ddu
    WHERE ddu.id = au.id
);

-- PART 5: 如果用戶已經在 diet_daily_users 中，則更新為管理員
UPDATE diet_daily_users
SET
    is_admin = true,
    updated_at = now()
WHERE email = 'gilko0725@gmail.com';

-- PART 6: 驗證修復結果
-- 檢查策略是否創建成功
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'diet_daily_foods' AND cmd = 'DELETE';

-- 檢查管理員用戶是否設置成功
SELECT
    ddu.id,
    ddu.email,
    ddu.name,
    ddu.is_admin,
    ddu.created_at,
    au.email_confirmed_at,
    au.created_at as auth_created_at
FROM diet_daily_users ddu
LEFT JOIN auth.users au ON ddu.id = au.id
WHERE ddu.email = 'gilko0725@gmail.com';

-- PART 7: 顯示下一步操作
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'gilko0725@gmail.com')
        THEN '✅ 用戶存在於 auth.users，應該已經添加為管理員'
        ELSE '❌ 用戶不存在於 auth.users，需要先註冊'
    END as status,
    CASE
        WHEN EXISTS (SELECT 1 FROM diet_daily_users WHERE email = 'gilko0725@gmail.com' AND is_admin = true)
        THEN '✅ 管理員狀態已設置'
        ELSE '❌ 管理員狀態未設置'
    END as admin_status;