-- 修復遊戲化系統表的 RLS Policies
-- 創建時間: 2025-11-26
-- 優先級: CRITICAL
-- 問題: 遊戲化表缺少 INSERT/UPDATE policies，導致新增食物記錄時失敗

-- ============================================================================
-- 問題說明
-- ============================================================================
-- 當用戶新增食物記錄時，系統會調用 add_user_points() 函數來增加積分
-- 但 user_gamification_stats 表只有 SELECT policy，沒有 INSERT/UPDATE policy
-- 導致錯誤：new row violates row-level security policy for table "user_gamification_stats"

-- ============================================================================
-- STEP 1: user_gamification_stats - 添加 INSERT/UPDATE Policies
-- ============================================================================

-- 用戶可以插入自己的遊戲化統計記錄（首次創建）
CREATE POLICY "Users can insert own gamification stats"
ON user_gamification_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 用戶可以更新自己的遊戲化統計記錄（積分累積）
CREATE POLICY "Users can update own gamification stats"
ON user_gamification_stats FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 2: user_streaks - 添加 INSERT/UPDATE Policies
-- ============================================================================

-- 用戶可以插入自己的連續記錄統計
CREATE POLICY "Users can insert own streaks"
ON user_streaks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 用戶可以更新自己的連續記錄統計
CREATE POLICY "Users can update own streaks"
ON user_streaks FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 3: user_point_transactions - 添加 INSERT Policy
-- ============================================================================

-- 用戶可以插入自己的積分交易記錄
CREATE POLICY "Users can insert own point transactions"
ON user_point_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 4: user_achievements - 添加 INSERT Policy
-- ============================================================================

-- 用戶可以插入自己的成就記錄（當達成成就時）
CREATE POLICY "Users can insert own achievements"
ON user_achievements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 5: 驗證 Policies 已正確創建
-- ============================================================================

DO $$
DECLARE
    stats_policies INTEGER;
    streaks_policies INTEGER;
    transactions_policies INTEGER;
    achievements_policies INTEGER;
BEGIN
    -- 檢查 user_gamification_stats policies
    SELECT COUNT(*) INTO stats_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_gamification_stats';

    IF stats_policies < 3 THEN
        RAISE EXCEPTION 'Insufficient policies for user_gamification_stats (expected >= 3, got %)', stats_policies;
    END IF;

    -- 檢查 user_streaks policies
    SELECT COUNT(*) INTO streaks_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_streaks';

    IF streaks_policies < 3 THEN
        RAISE EXCEPTION 'Insufficient policies for user_streaks (expected >= 3, got %)', streaks_policies;
    END IF;

    -- 檢查 user_point_transactions policies
    SELECT COUNT(*) INTO transactions_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_point_transactions';

    IF transactions_policies < 2 THEN
        RAISE EXCEPTION 'Insufficient policies for user_point_transactions (expected >= 2, got %)', transactions_policies;
    END IF;

    -- 檢查 user_achievements policies
    SELECT COUNT(*) INTO achievements_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_achievements';

    IF achievements_policies < 2 THEN
        RAISE EXCEPTION 'Insufficient policies for user_achievements (expected >= 2, got %)', achievements_policies;
    END IF;

    -- 輸出成功訊息
    RAISE NOTICE 'Gamification RLS policies successfully created:';
    RAISE NOTICE '  - user_gamification_stats: % policies', stats_policies;
    RAISE NOTICE '  - user_streaks: % policies', streaks_policies;
    RAISE NOTICE '  - user_point_transactions: % policies', transactions_policies;
    RAISE NOTICE '  - user_achievements: % policies', achievements_policies;
END $$;

-- ============================================================================
-- STEP 6: 更新表註解
-- ============================================================================

COMMENT ON TABLE user_gamification_stats IS 'User gamification statistics with RLS - users can manage own stats (fixed 2025-11-26)';
COMMENT ON TABLE user_streaks IS 'User streak tracking with RLS - users can manage own streaks (fixed 2025-11-26)';
COMMENT ON TABLE user_point_transactions IS 'User point transaction history with RLS - users can insert own transactions (fixed 2025-11-26)';
COMMENT ON TABLE user_achievements IS 'User achievement records with RLS - users can insert own achievements (fixed 2025-11-26)';

-- ============================================================================
-- STEP 7: 測試查詢（用於手動驗證）
-- ============================================================================

/*
-- 檢查所有遊戲化表的 RLS 狀態
SELECT
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'user_gamification_stats',
    'user_streaks',
    'user_point_transactions',
    'user_achievements'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- 檢查所有 Policies 詳細資訊
SELECT
    tablename,
    policyname,
    cmd as operation,
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
  AND tablename IN (
    'user_gamification_stats',
    'user_streaks',
    'user_point_transactions',
    'user_achievements'
  )
ORDER BY tablename, cmd, policyname;

-- 測試插入積分（以當前用戶身份）
-- 應該成功：
-- SELECT add_user_points(
--     auth.uid(),
--     10,
--     'entry_food',
--     NULL,
--     'Test food entry points'
-- );
*/
