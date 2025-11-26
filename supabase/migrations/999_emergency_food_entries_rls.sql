-- 緊急修復：為 food_entries 啟用 Row Level Security
-- 創建時間: 2025-11-26
-- 優先級: CRITICAL
-- 問題: food_entries 表缺少 RLS 保護，導致嚴重的資料洩露風險

-- ============================================================================
-- STEP 1: 啟用 Row Level Security
-- ============================================================================

ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: 創建用戶存取 Policy
-- ============================================================================

-- 用戶只能存取自己的食物記錄
CREATE POLICY "Users can manage own food entries"
ON food_entries FOR ALL
USING (user_id = auth.uid());

-- ============================================================================
-- STEP 3: 創建 Admin Policy（可選，用於系統管理）
-- ============================================================================

-- Admin 可以查看所有食物記錄（僅用於分析和管理）
CREATE POLICY "Admins can view all food entries for analysis"
ON food_entries FOR SELECT
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
BEGIN
  -- 檢查 RLS 是否已啟用
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'food_entries';

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on food_entries table';
  END IF;

  -- 檢查 policy 數量
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'food_entries';

  IF policy_count < 1 THEN
    RAISE EXCEPTION 'No policies created for food_entries table';
  END IF;

  -- 輸出成功訊息
  RAISE NOTICE 'RLS successfully enabled on food_entries with % policies', policy_count;
END $$;

-- ============================================================================
-- STEP 5: 更新表註解
-- ============================================================================

COMMENT ON TABLE food_entries IS 'User food entries with RLS security (emergency fix applied 2025-11-26)';

-- ============================================================================
-- STEP 6: 驗證查詢（用於手動測試）
-- ============================================================================

-- 以下查詢可用於驗證 RLS 是否正確運作
-- 需要在 Supabase SQL Editor 中執行

/*
-- 檢查 RLS 狀態
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'food_entries';

-- 檢查 Policies
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
WHERE schemaname = 'public' AND tablename = 'food_entries';

-- 測試資料隔離（需要替換成實際的用戶 ID）
-- SELECT * FROM food_entries WHERE user_id = '<your-user-id>';
*/
