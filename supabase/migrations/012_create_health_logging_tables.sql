-- 012_create_health_logging_tables.sql
-- Phase A: meal logs, sleep sessions, activity sessions, and wellness summaries

CREATE TABLE IF NOT EXISTS meal_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_symptom_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    photo_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    captured_via TEXT NOT NULL DEFAULT 'manual' CHECK (captured_via IN ('manual', 'ios_manual', 'wearable', 'import', 'auto')),
    analysis_status TEXT NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'completed', 'error')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_logged
    ON meal_logs(user_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS daily_wellness_log (
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    breakfast_time TIMESTAMPTZ,
    sleep_quality_score INTEGER,
    energy_level INTEGER,
    mood_score INTEGER,
    activity_minutes INTEGER,
    notes TEXT,
    captured_via TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id, log_date)
);

CREATE TABLE IF NOT EXISTS sleep_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'manual',
    source_record_id TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    planned_start_time TIME,
    planned_duration_minutes INTEGER,
    is_main_sleep BOOLEAN NOT NULL DEFAULT TRUE,
    quality_score INTEGER,
    capture_method TEXT NOT NULL DEFAULT 'manual',
    detail_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_start
    ON sleep_sessions(user_id, COALESCE(start_time, created_at) DESC);

CREATE TABLE IF NOT EXISTS activity_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_title TEXT,
    intensity TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    calories INTEGER,
    steps INTEGER,
    source TEXT NOT NULL DEFAULT 'manual',
    capture_method TEXT NOT NULL DEFAULT 'manual',
    notes TEXT,
    detail_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_sessions_user_start
    ON activity_sessions(user_id, COALESCE(start_time, created_at) DESC);

-- Enable RLS for user owned tables
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_wellness_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own meal logs" ON meal_logs;
DROP POLICY IF EXISTS "Users can modify own meal logs" ON meal_logs;
CREATE POLICY "Users can view own meal logs"
ON meal_logs FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own meal logs"
ON meal_logs FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own wellness log" ON daily_wellness_log;
DROP POLICY IF EXISTS "Users can modify own wellness log" ON daily_wellness_log;
CREATE POLICY "Users can view own wellness log"
ON daily_wellness_log FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own wellness log"
ON daily_wellness_log FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own sleep sessions" ON sleep_sessions;
DROP POLICY IF EXISTS "Users can modify own sleep sessions" ON sleep_sessions;
CREATE POLICY "Users can view own sleep sessions"
ON sleep_sessions FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own sleep sessions"
ON sleep_sessions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own activity sessions" ON activity_sessions;
DROP POLICY IF EXISTS "Users can modify own activity sessions" ON activity_sessions;
CREATE POLICY "Users can view own activity sessions"
ON activity_sessions FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own activity sessions"
ON activity_sessions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE meal_logs IS '餐點紀錄，一筆對應一餐，可包含多個食物項目';
COMMENT ON COLUMN meal_logs.items IS '食物項目清單 [{food_name, portion, unit}]';
COMMENT ON TABLE daily_wellness_log IS '每日彙總視圖/資料表，彙整早餐時間、精力等數值';
COMMENT ON TABLE sleep_sessions IS '睡眠紀錄，支援預計與實際時間';
COMMENT ON TABLE activity_sessions IS '運動/活動紀錄，僅在使用者填寫時產生';
