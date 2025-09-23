-- 設定 gilko0725@gmail.com 為超級管理員
--
-- 執行方式：
-- 1. 登入 Supabase Dashboard
-- 2. 前往 SQL Editor
-- 3. 複製並執行以下 SQL 指令

-- 方法一：透過 email 設定管理員權限
UPDATE diet_daily_users
SET
    is_admin = true,
    updated_at = NOW()
WHERE email = 'gilko0725@gmail.com';

-- 驗證設定是否成功
SELECT
    id,
    email,
    name,
    is_admin,
    created_at,
    updated_at
FROM diet_daily_users
WHERE email = 'gilko0725@gmail.com';

-- 如果上述用戶不存在，可以檢查所有用戶
-- SELECT id, email, name, is_admin FROM diet_daily_users ORDER BY created_at DESC;

-- 備註：
-- 1. 確保 gilko0725@gmail.com 已經在系統中註冊
-- 2. 執行後該用戶將可存取所有管理員功能
-- 3. 包括：/admin 控制台、食物資料庫管理、食物審核等