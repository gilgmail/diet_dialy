-- RLS Policies 測試腳本
-- 用於驗證所有 RLS migrations 是否正確運作
-- 執行方式：在 Supabase SQL Editor 中執行此腳本

-- ============================================================================
-- PART 1: 檢查 RLS 啟用狀態
-- ============================================================================

SELECT
  '=== RLS Status Check ===' as section,
  '' as blank;

SELECT
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count,
  CASE
    WHEN NOT t.rowsecurity THEN '❌ RLS NOT ENABLED'
    WHEN COUNT(p.policyname) = 0 THEN '⚠️ NO POLICIES'
    ELSE '✅ OK'
  END as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename IN ('food_entries', 'diet_daily_users', 'diet_daily_foods')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- ============================================================================
-- PART 2: 檢查所有 Policies
-- ============================================================================

SELECT
  '' as blank,
  '=== Policies Detail ===' as section,
  '' as blank2;

SELECT
  tablename,
  policyname,
  cmd as operation,
  CASE
    WHEN qual IS NOT NULL THEN 'USING clause exists'
    ELSE 'No USING'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK exists'
    ELSE 'No WITH CHECK'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('food_entries', 'diet_daily_users', 'diet_daily_foods')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- PART 3: food_entries 詳細檢查
-- ============================================================================

SELECT
  '' as blank,
  '=== food_entries Policies ===' as section,
  '' as blank2;

SELECT
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'food_entries'
ORDER BY policyname;

-- 驗證要點：
-- ✅ 應該有至少 1 個 policy: "Users can manage own food entries"
-- ✅ 可能有 admin policy: "Admins can view all food entries for analysis"

-- ============================================================================
-- PART 4: diet_daily_users 詳細檢查
-- ============================================================================

SELECT
  '' as blank,
  '=== diet_daily_users Policies ===' as section,
  '' as blank2;

SELECT
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'diet_daily_users'
ORDER BY cmd, policyname;

-- 驗證要點：
-- ✅ 應該有 SELECT policy: "Users can view own profile"
-- ✅ 應該有 UPDATE policy: "Users can update own profile"
-- ✅ 應該有 INSERT policy: "Allow user registration"
-- ✅ 可能有 admin policies

-- ============================================================================
-- PART 5: diet_daily_foods 詳細檢查
-- ============================================================================

SELECT
  '' as blank,
  '=== diet_daily_foods Policies ===' as section,
  '' as blank2;

SELECT
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'diet_daily_foods'
ORDER BY cmd, policyname;

-- 驗證要點：
-- ✅ 應該有 SELECT policy: "All authenticated users can view foods"
-- ✅ 應該有 INSERT policy: "Only admins can insert foods"
-- ✅ 應該有 UPDATE policy: "Only admins can update foods"
-- ✅ 應該有 DELETE policy: "Only admins can delete foods"

-- ============================================================================
-- PART 6: 完整性驗證
-- ============================================================================

SELECT
  '' as blank,
  '=== Completeness Check ===' as section,
  '' as blank2;

-- 檢查三張關鍵表是否都有 RLS 保護
SELECT
  CASE
    WHEN (
      SELECT COUNT(*)
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('food_entries', 'diet_daily_users', 'diet_daily_foods')
        AND rowsecurity = true
    ) = 3 THEN '✅ All 3 critical tables have RLS enabled'
    ELSE '❌ Some tables missing RLS protection'
  END as rls_completeness;

-- 檢查 policies 總數
SELECT
  'Total policies on critical tables: ' ||
  COUNT(*) ||
  CASE
    WHEN COUNT(*) >= 8 THEN ' ✅ (sufficient)'
    ELSE ' ⚠️ (may need more)'
  END as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('food_entries', 'diet_daily_users', 'diet_daily_foods');

-- ============================================================================
-- PART 7: 安全測試建議
-- ============================================================================

SELECT
  '' as blank,
  '=== Security Testing Recommendations ===' as section,
  '' as blank2;

SELECT
  '⚠️ IMPORTANT: Manual testing required' as warning,
  'Please test the following scenarios:' as instruction;

SELECT
  '1. food_entries' as table_name,
  'Test data isolation - users should only see their own entries' as test_case;

SELECT
  '2. diet_daily_users' as table_name,
  'Test privilege escalation - users should NOT be able to set is_admin=true' as test_case;

SELECT
  '3. diet_daily_foods' as table_name,
  'Test write protection - non-admins should NOT be able to INSERT/UPDATE/DELETE' as test_case;

-- ============================================================================
-- PART 8: 預期結果摘要
-- ============================================================================

SELECT
  '' as blank,
  '=== Expected Results Summary ===' as section,
  '' as blank2;

SELECT
  'food_entries' as table_name,
  'RLS: Enabled' as rls_status,
  '≥1 policies' as expected_policies,
  'Users can only access their own food entries' as behavior;

SELECT
  'diet_daily_users' as table_name,
  'RLS: Enabled' as rls_status,
  '≥3 policies' as expected_policies,
  'Users can view/update own profile, cannot escalate privileges' as behavior;

SELECT
  'diet_daily_foods' as table_name,
  'RLS: Enabled' as rls_status,
  '≥4 policies' as expected_policies,
  'All users can read, only admins can write' as behavior;

-- ============================================================================
-- 執行完成
-- ============================================================================

SELECT
  '' as blank,
  '✅ RLS Policy Check Complete!' as completion,
  '' as blank2;

SELECT
  'Next Steps:' as next_steps,
  '1. Review the results above' as step1,
  '2. Verify all tables have RLS enabled' as step2,
  '3. Check policy counts match expectations' as step3,
  '4. Perform manual security testing' as step4,
  '5. Document any issues found' as step5;
