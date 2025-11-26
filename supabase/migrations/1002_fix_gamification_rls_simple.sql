-- 修復遊戲化系統 RLS - 簡化版（無驗證邏輯）
-- 創建時間: 2025-11-26
-- 使用 IF NOT EXISTS 避免重複創建

-- ============================================================================
-- user_gamification_stats policies
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'user_gamification_stats'
        AND policyname = 'Users can insert own gamification stats'
    ) THEN
        CREATE POLICY "Users can insert own gamification stats"
        ON user_gamification_stats FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'user_gamification_stats'
        AND policyname = 'Users can update own gamification stats'
    ) THEN
        CREATE POLICY "Users can update own gamification stats"
        ON user_gamification_stats FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- user_streaks policies
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'user_streaks'
        AND policyname = 'Users can insert own streaks'
    ) THEN
        CREATE POLICY "Users can insert own streaks"
        ON user_streaks FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'user_streaks'
        AND policyname = 'Users can update own streaks'
    ) THEN
        CREATE POLICY "Users can update own streaks"
        ON user_streaks FOR UPDATE
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- user_point_transactions policies
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'user_point_transactions'
        AND policyname = 'Users can insert own point transactions'
    ) THEN
        CREATE POLICY "Users can insert own point transactions"
        ON user_point_transactions FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- user_achievements policies
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'user_achievements'
        AND policyname = 'Users can insert own achievements'
    ) THEN
        CREATE POLICY "Users can insert own achievements"
        ON user_achievements FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================================
-- 驗證結果（這不會卡住）
-- ============================================================================

SELECT
    '✅ Migration complete' as status,
    'Check results below' as message;

-- 顯示所有 policies
SELECT
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_gamification_stats',
    'user_streaks',
    'user_point_transactions',
    'user_achievements'
  )
GROUP BY tablename
ORDER BY tablename;
