-- 013_create_reminders_and_health_sources.sql
-- Phase A: unified reminders plus health data source + staging tables

CREATE TABLE IF NOT EXISTS user_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('medication_regimen', 'meal_logs', 'sleep_sessions', 'activity_sessions', 'custom')),
    target_id UUID,
    reminder_category TEXT NOT NULL CHECK (reminder_category IN ('medication', 'food', 'sleep', 'activity')),
    title TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('cron', 'every_n_days', 'relative_cycle')),
    interval_days INTEGER,
    window_start TIME,
    window_end TIME,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    lead_time_minutes INTEGER,
    snooze_minutes INTEGER,
    auto_dismiss_rule TEXT DEFAULT 'manual_only' CHECK (auto_dismiss_rule IN ('existing_entry', 'manual_only', 'never')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    ios_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_reminders_user_category
    ON user_reminders(user_id, reminder_category, status);

CREATE TABLE IF NOT EXISTS reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reminder_id UUID NOT NULL REFERENCES user_reminders(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'tapped', 'dismissed', 'skipped')),
    deliver_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    handled_at TIMESTAMPTZ,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'revoked', 'error', 'syncing')),
    last_synced_at TIMESTAMPTZ,
    sync_cursor JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS healthkit_sleep_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    parsed BOOLEAN NOT NULL DEFAULT FALSE,
    sleep_session_id UUID REFERENCES sleep_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, source_id)
);

CREATE TABLE IF NOT EXISTS healthkit_workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    parsed BOOLEAN NOT NULL DEFAULT FALSE,
    activity_session_id UUID REFERENCES activity_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, source_id)
);

-- RLS policies
ALTER TABLE user_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthkit_sleep_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthkit_workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reminders" ON user_reminders;
DROP POLICY IF EXISTS "Users can modify own reminders" ON user_reminders;
CREATE POLICY "Users can view own reminders"
ON user_reminders FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own reminders"
ON user_reminders FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view reminder logs" ON reminder_logs;
DROP POLICY IF EXISTS "Users can insert reminder logs" ON reminder_logs;
CREATE POLICY "Users can view reminder logs"
ON reminder_logs FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM user_reminders WHERE id = reminder_logs.reminder_id
));
CREATE POLICY "Users can insert reminder logs"
ON reminder_logs FOR INSERT
WITH CHECK (auth.uid() IN (
    SELECT user_id FROM user_reminders WHERE id = reminder_logs.reminder_id
));

DROP POLICY IF EXISTS "Users can view own health sources" ON health_data_sources;
DROP POLICY IF EXISTS "Users can modify own health sources" ON health_data_sources;
CREATE POLICY "Users can view own health sources"
ON health_data_sources FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own health sources"
ON health_data_sources FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own healthkit sleep samples" ON healthkit_sleep_samples;
DROP POLICY IF EXISTS "Users can modify own healthkit sleep samples" ON healthkit_sleep_samples;
CREATE POLICY "Users can view own healthkit sleep samples"
ON healthkit_sleep_samples FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own healthkit sleep samples"
ON healthkit_sleep_samples FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own healthkit workouts" ON healthkit_workouts;
DROP POLICY IF EXISTS "Users can modify own healthkit workouts" ON healthkit_workouts;
CREATE POLICY "Users can view own healthkit workouts"
ON healthkit_workouts FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own healthkit workouts"
ON healthkit_workouts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_reminders IS '統一提醒設定，供 iOS/web 共用';
COMMENT ON TABLE reminder_logs IS '提醒送達與互動紀錄';
COMMENT ON TABLE health_data_sources IS '外部健康資料（HealthKit/Google Fit 等）授權狀態';
COMMENT ON TABLE healthkit_sleep_samples IS 'HealthKit 睡眠樣本 staging';
COMMENT ON TABLE healthkit_workouts IS 'HealthKit 運動樣本 staging';
