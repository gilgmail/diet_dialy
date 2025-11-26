-- 修復 diet_daily_foods RLS
-- 創建時間: 2025-11-26
-- 優先級: MEDIUM
-- 問題: diet_daily_foods 表缺少 RLS 保護，允許任意用戶修改食物資料庫

-- ============================================================================
-- 說明
-- ============================================================================
-- diet_daily_foods 是共享的食物資料庫
-- - 所有已認證用戶應該可以「讀取」食物資料
-- - 只有 Admin 可以「新增/修改/刪除」食物資料
-- - 防止一般用戶污染食物資料庫

-- ============================================================================
-- STEP 1: 啟用 Row Level Security
-- ============================================================================

ALTER TABLE diet_daily_foods ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: 創建讀取 Policy（所有已認證用戶）
-- ============================================================================

-- 所有已認證用戶可以讀取食物資料庫
CREATE POLICY "All authenticated users can view foods"
ON diet_daily_foods FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 3: 創建寫入 Policies（僅 Admin）
-- ============================================================================

-- 只有 Admin 可以新增食物
CREATE POLICY "Only admins can insert foods"
ON diet_daily_foods FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 只有 Admin 可以更新食物
CREATE POLICY "Only admins can update foods"
ON diet_daily_foods FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 只有 Admin 可以刪除食物
CREATE POLICY "Only admins can delete foods"
ON diet_daily_foods FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM diet_daily_users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- ============================================================================
-- STEP 4: 驗證 Policy 已正確創建
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  rls_enabled BOOLEAN;
  select_policy_count INTEGER;
  write_policy_count INTEGER;
BEGIN
  -- 檢查 RLS 是否已啟用
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'diet_daily_foods';

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on diet_daily_foods table';
  END IF;

  -- 檢查總 policy 數量
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'diet_daily_foods';

  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Insufficient policies created for diet_daily_foods table (expected 4, got %)', policy_count;
  END IF;

  -- 檢查 SELECT policy（應該有 1 個）
  SELECT COUNT(*) INTO select_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'diet_daily_foods'
    AND cmd = 'SELECT';

  IF select_policy_count < 1 THEN
    RAISE EXCEPTION 'Missing SELECT policy for diet_daily_foods';
  END IF;

  -- 檢查寫入 policies（應該有 3 個：INSERT, UPDATE, DELETE）
  SELECT COUNT(*) INTO write_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'diet_daily_foods'
    AND cmd IN ('INSERT', 'UPDATE', 'DELETE');

  IF write_policy_count < 3 THEN
    RAISE EXCEPTION 'Missing write policies for diet_daily_foods (expected 3, got %)', write_policy_count;
  END IF;

  -- 輸出成功訊息
  RAISE NOTICE 'RLS successfully enabled on diet_daily_foods with % policies (% SELECT, % write)',
    policy_count, select_policy_count, write_policy_count;
END $$;

-- ============================================================================
-- STEP 5: 更新表註解
-- ============================================================================

COMMENT ON TABLE diet_daily_foods IS 'Shared food database with RLS security - all users can read, only admins can modify (fixed 2025-11-26)';

-- ============================================================================
-- STEP 6: 安全測試查詢（用於手動驗證）
-- ============================================================================

/*
-- 檢查 RLS 狀態
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'diet_daily_foods';

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
WHERE schemaname = 'public' AND tablename = 'diet_daily_foods'
ORDER BY cmd, policyname;

-- 測試讀取權限（以普通用戶身份）
-- 應該成功：所有用戶都可以讀取
-- SELECT * FROM diet_daily_foods LIMIT 10;

-- 測試寫入權限（以普通用戶身份）
-- 應該失敗：普通用戶不能新增食物
-- INSERT INTO diet_daily_foods (name, category) VALUES ('測試食物', '測試分類');

-- 測試修改權限（以普通用戶身份）
-- 應該失敗：普通用戶不能修改食物
-- UPDATE diet_daily_foods SET description = '測試' WHERE id = '<some-id>';

-- 測試刪除權限（以普通用戶身份）
-- 應該失敗：普通用戶不能刪除食物
-- DELETE FROM diet_daily_foods WHERE id = '<some-id>';

-- 測試 Admin 權限（以 admin 身份）
-- 應該全部成功：admin 可以執行所有操作
-- SELECT * FROM diet_daily_foods LIMIT 10;
-- INSERT INTO diet_daily_foods (name, category) VALUES ('Admin 測試食物', 'Admin 分類');
-- UPDATE diet_daily_foods SET description = 'Admin 修改' WHERE name = 'Admin 測試食物';
-- DELETE FROM diet_daily_foods WHERE name = 'Admin 測試食物';
*/
