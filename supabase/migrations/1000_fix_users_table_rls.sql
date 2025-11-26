-- 修復 diet_daily_users RLS
-- 創建時間: 2025-11-26
-- 優先級: HIGH
-- 問題: diet_daily_users 表缺少 RLS 保護，導致 email 洩露和權限提升風險

-- ============================================================================
-- STEP 1: 啟用 Row Level Security
-- ============================================================================

ALTER TABLE diet_daily_users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: 創建用戶 Profile 存取 Policy
-- ============================================================================

-- 用戶可以查看自己的 profile
CREATE POLICY "Users can view own profile"
ON diet_daily_users FOR SELECT
USING (id = auth.uid());

-- 用戶可以更新自己的 profile（但不能修改 is_admin）
CREATE POLICY "Users can update own profile"
ON diet_daily_users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  -- 防止用戶修改自己的 is_admin 狀態（權限提升攻擊）
  is_admin = (SELECT is_admin FROM diet_daily_users WHERE id = auth.uid())
);

-- ============================================================================
-- STEP 3: 創建 Admin Policy
-- ============================================================================

-- Admin 可以查看所有用戶的 profile（用於管理和分析）
CREATE POLICY "Admins can view all users"
ON diet_daily_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Admin 可以更新其他用戶的 profile（包括 is_admin）
CREATE POLICY "Admins can update all users"
ON diet_daily_users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- ============================================================================
-- STEP 4: 創建用戶註冊 Policy
-- ============================================================================

-- 允許新用戶註冊（INSERT）
-- 注意：新用戶的 is_admin 必須是 false
CREATE POLICY "Allow user registration"
ON diet_daily_users FOR INSERT
WITH CHECK (
  id = auth.uid() AND
  (is_admin = false OR is_admin IS NULL)
);

-- ============================================================================
-- STEP 5: 驗證 Policy 已正確創建
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- 檢查 RLS 是否已啟用
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'diet_daily_users';

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on diet_daily_users table';
  END IF;

  -- 檢查 policy 數量
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'diet_daily_users';

  IF policy_count < 3 THEN
    RAISE EXCEPTION 'Insufficient policies created for diet_daily_users table (expected >= 3, got %)', policy_count;
  END IF;

  -- 輸出成功訊息
  RAISE NOTICE 'RLS successfully enabled on diet_daily_users with % policies', policy_count;
END $$;

-- ============================================================================
-- STEP 6: 更新表註解
-- ============================================================================

COMMENT ON TABLE diet_daily_users IS 'User profiles with RLS security - prevents email leaks and privilege escalation (fixed 2025-11-26)';

-- ============================================================================
-- STEP 7: 安全測試查詢（用於手動驗證）
-- ============================================================================

/*
-- 檢查 RLS 狀態
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'diet_daily_users';

-- 檢查所有 Policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'diet_daily_users'
ORDER BY policyname;

-- 測試資料隔離（需要以不同用戶身份執行）
-- 以普通用戶身份：應該只看到自己的資料
-- SELECT * FROM diet_daily_users;

-- 測試權限提升攻擊防護
-- 嘗試將自己設為 admin：應該失敗
-- UPDATE diet_daily_users SET is_admin = true WHERE id = auth.uid();

-- 驗證 admin 可以看到所有用戶
-- 以 admin 身份：應該看到所有用戶
-- SELECT id, email, is_admin FROM diet_daily_users;
*/
