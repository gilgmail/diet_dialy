-- RLS 狀態快速驗證腳本
-- 用於確認三張關鍵表的 RLS 和 Policies 狀態
-- 在 Supabase SQL Editor 執行此腳本

-- ============================================================================
-- 檢查 RLS 啟用狀態和 Policy 數量
-- ============================================================================

SELECT
  '=== RLS Status Summary ===' as section;

SELECT
  t.tablename,
  CASE
    WHEN t.rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status,
  COUNT(p.policyname) as policy_count,
  CASE
    WHEN NOT t.rowsecurity THEN '🚨 CRITICAL: Enable RLS immediately'
    WHEN COUNT(p.policyname) = 0 THEN '⚠️ WARNING: No policies defined'
    WHEN COUNT(p.policyname) >= 1 THEN '✅ OK'
  END as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename IN ('food_entries', 'diet_daily_users', 'diet_daily_foods')
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- ============================================================================
-- 詳細 Policy 列表
-- ============================================================================

SELECT
  '' as blank,
  '=== Policy Details ===' as section;

SELECT
  tablename,
  policyname,
  cmd as operation,
  permissive as permissive,
  CASE
    WHEN cmd = 'SELECT' THEN '🔍 Read'
    WHEN cmd = 'INSERT' THEN '➕ Create'
    WHEN cmd = 'UPDATE' THEN '✏️ Update'
    WHEN cmd = 'DELETE' THEN '🗑️ Delete'
    WHEN cmd = 'ALL' THEN '🔧 All Operations'
    ELSE cmd
  END as operation_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('food_entries', 'diet_daily_users', 'diet_daily_foods')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- 預期結果檢查
-- ============================================================================

SELECT
  '' as blank,
  '=== Expected vs Actual ===' as section;

-- food_entries 檢查
SELECT
  'food_entries' as table_name,
  CASE
    WHEN (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'food_entries')
    THEN '✅'
    ELSE '❌'
  END as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'food_entries') as actual_policies,
  '≥1' as expected_policies,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'food_entries') >= 1
    THEN '✅ Pass'
    ELSE '❌ Fail'
  END as status;

-- diet_daily_users 檢查
SELECT
  'diet_daily_users' as table_name,
  CASE
    WHEN (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'diet_daily_users')
    THEN '✅'
    ELSE '❌'
  END as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_daily_users') as actual_policies,
  '≥3' as expected_policies,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_daily_users') >= 3
    THEN '✅ Pass'
    ELSE '❌ Fail'
  END as status;

-- diet_daily_foods 檢查
SELECT
  'diet_daily_foods' as table_name,
  CASE
    WHEN (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'diet_daily_foods')
    THEN '✅'
    ELSE '❌'
  END as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_daily_foods') as actual_policies,
  '≥4' as expected_policies,
  CASE
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_daily_foods') >= 4
    THEN '✅ Pass'
    ELSE '❌ Fail'
  END as status;

-- ============================================================================
-- 總結
-- ============================================================================

SELECT
  '' as blank,
  '=== Summary ===' as section;

SELECT
  'Total tables checked:' as metric,
  '3' as value;

SELECT
  'Tables with RLS enabled:' as metric,
  (SELECT COUNT(*) FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename IN ('food_entries', 'diet_daily_users', 'diet_daily_foods')
     AND rowsecurity = true)::text as value;

SELECT
  'Total policies defined:' as metric,
  (SELECT COUNT(*) FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('food_entries', 'diet_daily_users', 'diet_daily_foods'))::text as value;

SELECT
  'Overall Status:' as metric,
  CASE
    WHEN (
      SELECT COUNT(*) FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('food_entries', 'diet_daily_users', 'diet_daily_foods')
        AND rowsecurity = true
    ) = 3
    AND (
      SELECT COUNT(*) FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('food_entries', 'diet_daily_users', 'diet_daily_foods')
    ) >= 8
    THEN '✅ All security measures in place'
    ELSE '⚠️ Action required - check details above'
  END as value;

-- ============================================================================
-- 執行說明
-- ============================================================================

SELECT
  '' as blank,
  '=== Next Steps ===' as section;

SELECT
  '1. Review the results above' as step,
  'Check if all three tables show ✅' as description
UNION ALL
SELECT
  '2. If any table shows ❌',
  'Run the corresponding migration file from supabase/migrations/'
UNION ALL
SELECT
  '3. If all show ✅',
  'Proceed to test Realtime Sync functionality'
UNION ALL
SELECT
  '4. Testing guide',
  'See claudedocs/REALTIME_SYNC_TESTING.md';
