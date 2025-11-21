-- 019_create_gamification_tables.sql
-- 遊戲化系統：連續記錄天數、成就、積分、等級

-- 1. 用戶連續記錄天數表
CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    
    -- 連續記錄資訊
    current_streak INTEGER DEFAULT 0, -- 當前連續天數
    longest_streak INTEGER DEFAULT 0, -- 最長連續天數
    last_record_date DATE, -- 最後記錄日期
    
    -- 里程碑達成記錄
    milestones_achieved INTEGER[] DEFAULT ARRAY[]::INTEGER[], -- [7, 14, 30, 60, 100]
    
    -- 時間戳記
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- 2. 成就定義表
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 成就資訊
    code TEXT NOT NULL UNIQUE, -- 成就代碼，如 'first_week', 'data_master'
    name TEXT NOT NULL, -- 成就名稱
    description TEXT, -- 成就描述
    icon TEXT, -- 圖示 emoji 或圖示名稱
    category TEXT NOT NULL CHECK (category IN ('recording', 'completeness', 'diversity', 'special')),
    
    -- 達成條件
    condition_type TEXT NOT NULL CHECK (condition_type IN ('days', 'entries', 'coverage', 'streak', 'custom')),
    condition_value INTEGER, -- 條件數值
    condition_metadata JSONB DEFAULT '{}'::jsonb, -- 額外條件資訊
    
    -- 獎勵
    points_reward INTEGER DEFAULT 0, -- 積分獎勵
    
    -- 排序和顯示
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 用戶成就記錄表
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
    
    -- 達成資訊
    achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    progress INTEGER DEFAULT 100, -- 進度百分比（用於部分完成的成就）
    
    -- 通知狀態
    is_notified BOOLEAN DEFAULT false, -- 是否已通知用戶
    
    UNIQUE(user_id, achievement_id)
);

-- 4. 用戶積分和等級表
CREATE TABLE IF NOT EXISTS user_gamification_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    
    -- 積分
    total_points INTEGER DEFAULT 0, -- 總積分
    points_this_week INTEGER DEFAULT 0, -- 本週積分
    points_this_month INTEGER DEFAULT 0, -- 本月積分
    
    -- 等級
    current_level INTEGER DEFAULT 1, -- 當前等級（1-10）
    level_name TEXT DEFAULT '新手', -- 等級名稱
    experience_points INTEGER DEFAULT 0, -- 經驗值
    
    -- 統計
    total_entries INTEGER DEFAULT 0, -- 總記錄數
    total_days_recorded INTEGER DEFAULT 0, -- 總記錄天數
    
    -- 時間戳記
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- 5. 積分記錄表（用於追蹤積分來源）
CREATE TABLE IF NOT EXISTS user_point_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    
    -- 交易資訊
    points INTEGER NOT NULL, -- 積分變化（正數為獲得，負數為使用）
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'entry_symptom', 'entry_food', 'entry_medication', 
        'entry_sleep', 'entry_exercise', 'complete_day',
        'streak_7', 'streak_30', 'achievement', 'milestone'
    )),
    reference_id UUID, -- 關聯的記錄 ID（如 entry_id, achievement_id）
    description TEXT, -- 描述
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_stats_user_id ON user_gamification_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_point_transactions_user_id ON user_point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_point_transactions_created_at ON user_point_transactions(created_at);

-- 6. 建立函數：更新連續記錄天數
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID, p_record_date DATE)
RETURNS INTEGER AS $$
DECLARE
    v_streak_record RECORD;
    v_new_streak INTEGER;
    v_milestones INTEGER[];
BEGIN
    -- 取得或創建 streak 記錄
    SELECT * INTO v_streak_record
    FROM user_streaks
    WHERE user_id = p_user_id;
    
    IF NOT FOUND THEN
        -- 創建新記錄
        INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_record_date)
        VALUES (p_user_id, 1, 1, p_record_date)
        RETURNING * INTO v_streak_record;
        RETURN 1;
    END IF;
    
    -- 檢查是否連續
    IF v_streak_record.last_record_date IS NULL THEN
        -- 第一次記錄
        v_new_streak := 1;
    ELSIF v_streak_record.last_record_date = p_record_date - INTERVAL '1 day' THEN
        -- 連續記錄
        v_new_streak := v_streak_record.current_streak + 1;
    ELSIF v_streak_record.last_record_date = p_record_date THEN
        -- 同一天，不增加 streak
        RETURN v_streak_record.current_streak;
    ELSE
        -- 斷掉，重新開始
        v_new_streak := 1;
    END IF;
    
    -- 更新最長連續天數
    IF v_new_streak > v_streak_record.longest_streak THEN
        v_streak_record.longest_streak := v_new_streak;
    END IF;
    
    -- 檢查里程碑
    v_milestones := v_streak_record.milestones_achieved;
    IF v_new_streak = 7 AND NOT (7 = ANY(v_milestones)) THEN
        v_milestones := array_append(v_milestones, 7);
    ELSIF v_new_streak = 14 AND NOT (14 = ANY(v_milestones)) THEN
        v_milestones := array_append(v_milestones, 14);
    ELSIF v_new_streak = 30 AND NOT (30 = ANY(v_milestones)) THEN
        v_milestones := array_append(v_milestones, 30);
    ELSIF v_new_streak = 60 AND NOT (60 = ANY(v_milestones)) THEN
        v_milestones := array_append(v_milestones, 60);
    ELSIF v_new_streak = 100 AND NOT (100 = ANY(v_milestones)) THEN
        v_milestones := array_append(v_milestones, 100);
    END IF;
    
    -- 更新記錄
    UPDATE user_streaks
    SET 
        current_streak = v_new_streak,
        longest_streak = v_streak_record.longest_streak,
        last_record_date = p_record_date,
        milestones_achieved = v_milestones,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN v_new_streak;
END;
$$ LANGUAGE plpgsql;

-- 7. 建立函數：添加積分
CREATE OR REPLACE FUNCTION add_user_points(
    p_user_id UUID,
    p_points INTEGER,
    p_transaction_type TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_new_total INTEGER;
BEGIN
    -- 更新總積分
    INSERT INTO user_gamification_stats (user_id, total_points)
    VALUES (p_user_id, p_points)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_points = user_gamification_stats.total_points + p_points,
        updated_at = NOW();
    
    SELECT total_points INTO v_new_total
    FROM user_gamification_stats
    WHERE user_id = p_user_id;
    
    -- 記錄交易
    INSERT INTO user_point_transactions (
        user_id, points, transaction_type, reference_id, description
    )
    VALUES (p_user_id, p_points, p_transaction_type, p_reference_id, p_description);
    
    RETURN v_new_total;
END;
$$ LANGUAGE plpgsql;

-- 8. 初始化成就定義
INSERT INTO achievement_definitions (code, name, description, icon, category, condition_type, condition_value, points_reward, display_order) VALUES
-- 記錄類成就
('first_week', '新手記錄員', '連續記錄 7 天', '🥉', 'recording', 'streak', 7, 100, 1),
('first_month', '持續追蹤者', '連續記錄 30 天', '🥈', 'recording', 'streak', 30, 300, 2),
('hundred_days', '健康達人', '連續記錄 100 天', '🥇', 'recording', 'streak', 100, 1000, 3),

-- 完整度類成就
('coverage_60', '資料收集者', '單週覆蓋率達 60%', '📊', 'completeness', 'coverage', 60, 150, 4),
('coverage_80', '資料大師', '單週覆蓋率達 80%', '📈', 'completeness', 'coverage', 80, 300, 5),
('coverage_100', '完美記錄', '單週覆蓋率達 100%', '💎', 'completeness', 'coverage', 100, 500, 6),

-- 多樣性類成就
('food_50', '飲食記錄員', '記錄 50 筆飲食', '🍎', 'diversity', 'entries', 50, 100, 7),
('medication_30', '用藥追蹤者', '記錄 30 筆用藥', '💊', 'diversity', 'entries', 30, 100, 8),
('sleep_30', '睡眠觀察家', '記錄 30 筆睡眠', '😴', 'diversity', 'entries', 30, 100, 9),
('exercise_30', '運動愛好者', '記錄 30 筆運動', '🏃', 'diversity', 'entries', 30, 100, 10),

-- 特殊類成就
('perfect_week', '一週完美', '連續 7 天完整記錄', '⭐', 'special', 'streak', 7, 200, 11),
('perfect_month', '一月完美', '連續 30 天完整記錄', '🌟', 'special', 'streak', 30, 500, 12),
('ai_unlocker', 'AI 解鎖者', '達到 60% 覆蓋率解鎖 AI 分析', '✨', 'special', 'coverage', 60, 250, 13)
ON CONFLICT (code) DO NOTHING;

-- 9. 建立 RLS 政策
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_point_transactions ENABLE ROW LEVEL SECURITY;

-- 用戶只能查看自己的資料
CREATE POLICY "Users can view own streaks" ON user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own gamification stats" ON user_gamification_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own point transactions" ON user_point_transactions FOR SELECT USING (auth.uid() = user_id);

-- 系統可以更新（通過 service role）
-- 注意：實際應用中應該通過 Edge Functions 或 API 來更新，而不是直接開放

-- 10. 建立觸發器：自動更新 updated_at
CREATE TRIGGER update_user_streaks_updated_at
    BEFORE UPDATE ON user_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_gamification_stats_updated_at
    BEFORE UPDATE ON user_gamification_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

