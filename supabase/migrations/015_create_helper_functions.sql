-- 015_create_helper_functions.sql
-- Phase A: Helper functions for health data deduplication and wellness log

-- ===================================================================
-- 1. 健康資料去重函式：upsert_sleep_session
-- ===================================================================

CREATE OR REPLACE FUNCTION upsert_sleep_session(
    p_user_id UUID,
    p_source TEXT,
    p_source_record_id TEXT,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_duration_minutes INT,
    p_quality_score INT DEFAULT NULL,
    p_detail_payload JSONB DEFAULT '{}'::jsonb,
    p_planned_start_time TIME DEFAULT NULL,
    p_planned_duration_minutes INT DEFAULT NULL,
    p_is_main_sleep BOOLEAN DEFAULT TRUE
)
RETURNS UUID AS $$
DECLARE
    v_existing_id UUID;
    v_existing_source TEXT;
    v_result_id UUID;
    source_priority_map JSONB := '{"manual": 4, "healthkit": 3, "googlefit": 2, "wearable": 1}'::jsonb;
    v_new_priority INT;
    v_existing_priority INT;
BEGIN
    -- 1. 檢查是否有相同 source_record_id（同來源不可重複）
    IF p_source_record_id IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM sleep_sessions
        WHERE user_id = p_user_id
            AND source = p_source
            AND source_record_id = p_source_record_id;

        IF v_existing_id IS NOT NULL THEN
            -- 更新現有記錄
            UPDATE sleep_sessions SET
                start_time = p_start_time,
                end_time = p_end_time,
                duration_minutes = p_duration_minutes,
                quality_score = p_quality_score,
                detail_payload = p_detail_payload,
                planned_start_time = COALESCE(p_planned_start_time, planned_start_time),
                planned_duration_minutes = COALESCE(p_planned_duration_minutes, planned_duration_minutes)
            WHERE id = v_existing_id;

            RETURN v_existing_id;
        END IF;
    END IF;

    -- 2. 檢查時間重疊（±15分鐘）
    SELECT id, source INTO v_existing_id, v_existing_source
    FROM sleep_sessions
    WHERE user_id = p_user_id
        AND start_time IS NOT NULL
        AND start_time BETWEEN (p_start_time - INTERVAL '15 minutes')
                           AND (p_start_time + INTERVAL '15 minutes')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- 3. 比較優先級
        v_new_priority := (source_priority_map->>p_source)::INT;
        v_existing_priority := (source_priority_map->>v_existing_source)::INT;

        IF v_new_priority > v_existing_priority THEN
            -- 新資料優先級更高，覆蓋舊資料
            UPDATE sleep_sessions SET
                source = p_source,
                source_record_id = p_source_record_id,
                start_time = p_start_time,
                end_time = p_end_time,
                duration_minutes = p_duration_minutes,
                quality_score = p_quality_score,
                detail_payload = p_detail_payload
            WHERE id = v_existing_id;

            -- 記錄衝突（如果衝突表存在）
            IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'health_data_conflicts') THEN
                INSERT INTO health_data_conflicts (
                    user_id, data_type, conflict_time, existing_source, new_source,
                    resolution, existing_data, new_data
                ) VALUES (
                    p_user_id, 'sleep', p_start_time, v_existing_source, p_source,
                    'replaced',
                    jsonb_build_object('id', v_existing_id, 'source', v_existing_source),
                    jsonb_build_object('source', p_source, 'start_time', p_start_time)
                );
            END IF;

            RETURN v_existing_id;
        ELSE
            -- 舊資料優先級更高，忽略新資料
            IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'health_data_conflicts') THEN
                INSERT INTO health_data_conflicts (
                    user_id, data_type, conflict_time, existing_source, new_source,
                    resolution, existing_data, new_data
                ) VALUES (
                    p_user_id, 'sleep', p_start_time, v_existing_source, p_source,
                    'kept_existing',
                    jsonb_build_object('id', v_existing_id, 'source', v_existing_source),
                    jsonb_build_object('source', p_source, 'start_time', p_start_time)
                );
            END IF;

            RETURN v_existing_id;
        END IF;
    END IF;

    -- 4. 無重複，插入新記錄
    INSERT INTO sleep_sessions (
        user_id, source, source_record_id, start_time, end_time,
        duration_minutes, quality_score, detail_payload,
        planned_start_time, planned_duration_minutes, is_main_sleep
    ) VALUES (
        p_user_id, p_source, p_source_record_id, p_start_time, p_end_time,
        p_duration_minutes, p_quality_score, p_detail_payload,
        p_planned_start_time, p_planned_duration_minutes, p_is_main_sleep
    ) RETURNING id INTO v_result_id;

    RETURN v_result_id;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 2. 健康資料去重函式：upsert_activity_session
-- ===================================================================

CREATE OR REPLACE FUNCTION upsert_activity_session(
    p_user_id UUID,
    p_source TEXT,
    p_source_record_id TEXT DEFAULT NULL,
    p_activity_type TEXT DEFAULT 'other',
    p_activity_title TEXT DEFAULT NULL,
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL,
    p_duration_minutes INT DEFAULT NULL,
    p_intensity TEXT DEFAULT NULL,
    p_calories INT DEFAULT NULL,
    p_steps INT DEFAULT NULL,
    p_detail_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_existing_id UUID;
    v_existing_source TEXT;
    v_result_id UUID;
    source_priority_map JSONB := '{"manual": 4, "healthkit": 3, "googlefit": 2, "wearable": 1}'::jsonb;
    v_new_priority INT;
    v_existing_priority INT;
BEGIN
    -- 1. 檢查是否有相同 source_record_id
    IF p_source_record_id IS NOT NULL THEN
        SELECT id INTO v_existing_id
        FROM activity_sessions
        WHERE user_id = p_user_id
            AND source = p_source
            AND source_record_id = p_source_record_id;

        IF v_existing_id IS NOT NULL THEN
            UPDATE activity_sessions SET
                activity_type = COALESCE(p_activity_type, activity_type),
                activity_title = COALESCE(p_activity_title, activity_title),
                start_time = COALESCE(p_start_time, start_time),
                end_time = COALESCE(p_end_time, end_time),
                duration_minutes = COALESCE(p_duration_minutes, duration_minutes),
                intensity = COALESCE(p_intensity, intensity),
                calories = COALESCE(p_calories, calories),
                steps = COALESCE(p_steps, steps),
                detail_payload = p_detail_payload
            WHERE id = v_existing_id;

            RETURN v_existing_id;
        END IF;
    END IF;

    -- 2. 檢查時間重疊（±10分鐘）
    IF p_start_time IS NOT NULL THEN
        SELECT id, source INTO v_existing_id, v_existing_source
        FROM activity_sessions
        WHERE user_id = p_user_id
            AND start_time IS NOT NULL
            AND start_time BETWEEN (p_start_time - INTERVAL '10 minutes')
                               AND (p_start_time + INTERVAL '10 minutes')
        ORDER BY created_at DESC
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            v_new_priority := (source_priority_map->>p_source)::INT;
            v_existing_priority := (source_priority_map->>v_existing_source)::INT;

            IF v_new_priority > v_existing_priority THEN
                UPDATE activity_sessions SET
                    source = p_source,
                    source_record_id = p_source_record_id,
                    activity_type = p_activity_type,
                    start_time = p_start_time,
                    end_time = p_end_time,
                    duration_minutes = p_duration_minutes,
                    detail_payload = p_detail_payload
                WHERE id = v_existing_id;

                RETURN v_existing_id;
            ELSE
                RETURN v_existing_id;
            END IF;
        END IF;
    END IF;

    -- 3. 無重複，插入新記錄
    INSERT INTO activity_sessions (
        user_id, source, source_record_id, activity_type, activity_title,
        start_time, end_time, duration_minutes, intensity,
        calories, steps, detail_payload
    ) VALUES (
        p_user_id, p_source, p_source_record_id, p_activity_type, p_activity_title,
        p_start_time, p_end_time, p_duration_minutes, p_intensity,
        p_calories, p_steps, p_detail_payload
    ) RETURNING id INTO v_result_id;

    RETURN v_result_id;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 3. 健康資料衝突記錄表
-- ===================================================================

CREATE TABLE IF NOT EXISTS health_data_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL CHECK (data_type IN ('sleep', 'activity')),
    conflict_time TIMESTAMPTZ NOT NULL,
    existing_source TEXT NOT NULL,
    new_source TEXT NOT NULL,
    resolution TEXT NOT NULL CHECK (resolution IN ('kept_existing', 'replaced', 'ignored')),
    existing_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_conflicts_user_time
    ON health_data_conflicts(user_id, conflict_time DESC);

COMMENT ON TABLE health_data_conflicts IS '健康資料衝突記錄（用於分析與除錯多來源資料）';

-- ===================================================================
-- 4. 計算下次提醒時間函式
-- ===================================================================

-- relative_cycle 模式（針劑療程）
CREATE OR REPLACE FUNCTION calculate_next_cycle_reminder(
    p_regimen_id UUID,
    p_reminder_id UUID
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_expected_date DATE;
    v_window_start TIME;
    v_timezone TEXT;
    v_lead_time_minutes INT;
    v_cycle_offset_days INT;
    v_reminder_datetime TIMESTAMPTZ;
BEGIN
    -- 取得最新週期的預期日期
    SELECT expected_next_date INTO v_expected_date
    FROM medication_cycles
    WHERE regimen_id = p_regimen_id
        AND status = 'scheduled'
    ORDER BY cycle_number DESC
    LIMIT 1;

    -- 若無週期資料，返回 NULL
    IF v_expected_date IS NULL THEN
        RETURN NULL;
    END IF;

    -- 取得提醒設定
    SELECT
        window_start,
        timezone,
        COALESCE(lead_time_minutes, 0),
        COALESCE((metadata->>'cycle_offset_days')::INT, 0)
    INTO
        v_window_start,
        v_timezone,
        v_lead_time_minutes,
        v_cycle_offset_days
    FROM user_reminders
    WHERE id = p_reminder_id;

    -- 組合日期與時間，轉換時區
    v_reminder_datetime := (v_expected_date || ' ' || v_window_start)::TIMESTAMP AT TIME ZONE v_timezone;

    -- 減去提前提醒時間與週期偏移
    v_reminder_datetime := v_reminder_datetime
        - (v_lead_time_minutes || ' minutes')::INTERVAL
        - (v_cycle_offset_days || ' days')::INTERVAL;

    RETURN v_reminder_datetime;
END;
$$ LANGUAGE plpgsql;

-- every_n_days 模式（口服藥）
CREATE OR REPLACE FUNCTION calculate_next_daily_reminder(
    p_regimen_id UUID,
    p_reminder_id UUID
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_last_taken TIMESTAMPTZ;
    v_cycle_anchor_date DATE;
    v_interval_days INT;
    v_window_start TIME;
    v_timezone TEXT;
    v_next_date DATE;
    v_reminder_datetime TIMESTAMPTZ;
BEGIN
    -- 取得上次用藥時間
    SELECT taken_at INTO v_last_taken
    FROM medication_administrations
    WHERE regimen_id = p_regimen_id
    ORDER BY taken_at DESC
    LIMIT 1;

    -- 若無用藥記錄，使用療程開始日期
    IF v_last_taken IS NULL THEN
        SELECT cycle_anchor_date INTO v_cycle_anchor_date
        FROM medication_regimens
        WHERE id = p_regimen_id;

        v_last_taken := v_cycle_anchor_date::TIMESTAMPTZ;
    END IF;

    -- 取得提醒設定
    SELECT interval_days, window_start, timezone
    INTO v_interval_days, v_window_start, v_timezone
    FROM user_reminders
    WHERE id = p_reminder_id;

    -- 計算下次日期
    v_next_date := (v_last_taken + (v_interval_days || ' days')::INTERVAL)::DATE;

    -- 組合時間並轉換時區
    v_reminder_datetime := (v_next_date || ' ' || v_window_start)::TIMESTAMP AT TIME ZONE v_timezone;

    RETURN v_reminder_datetime;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 5. Materialized View: daily_wellness_summary (可選)
-- ===================================================================

-- 注意：daily_wellness_log 已在 012 migration 建立為普通表
-- 這裡提供一個 refresh 函式，可定期更新彙總資料

CREATE OR REPLACE FUNCTION refresh_daily_wellness_for_user(
    p_user_id UUID,
    p_date DATE
)
RETURNS VOID AS $$
DECLARE
    v_user_timezone TEXT;
BEGIN
    -- 取得使用者時區
    SELECT COALESCE(timezone, 'UTC') INTO v_user_timezone
    FROM diet_daily_users
    WHERE id = p_user_id;

    -- Upsert daily_wellness_log
    INSERT INTO daily_wellness_log (
        user_id,
        log_date,
        breakfast_time,
        sleep_quality_score,
        activity_minutes,
        captured_via,
        updated_at
    )
    SELECT
        p_user_id,
        p_date,
        MIN(CASE WHEN ml.meal_type = 'breakfast' THEN ml.logged_at END),
        AVG(ss.quality_score)::INT,
        SUM(act.duration_minutes)::INT,
        'auto',
        NOW()
    FROM diet_daily_users u
    LEFT JOIN meal_logs ml ON ml.user_id = u.id
        AND DATE(ml.logged_at AT TIME ZONE v_user_timezone) = p_date
    LEFT JOIN sleep_sessions ss ON ss.user_id = u.id
        AND DATE(COALESCE(ss.start_time, ss.created_at) AT TIME ZONE v_user_timezone) = p_date
    LEFT JOIN activity_sessions act ON act.user_id = u.id
        AND DATE(COALESCE(act.start_time, act.created_at) AT TIME ZONE v_user_timezone) = p_date
    WHERE u.id = p_user_id
    GROUP BY u.id

    ON CONFLICT (user_id, log_date)
    DO UPDATE SET
        breakfast_time = EXCLUDED.breakfast_time,
        sleep_quality_score = EXCLUDED.sleep_quality_score,
        activity_minutes = EXCLUDED.activity_minutes,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 6. 時區轉換 helper 函式
-- ===================================================================

-- 將 UTC 時間轉為使用者本地時間
CREATE OR REPLACE FUNCTION to_user_timezone(
    p_user_id UUID,
    p_utc_time TIMESTAMPTZ
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_timezone TEXT;
BEGIN
    SELECT COALESCE(timezone, 'UTC') INTO v_timezone
    FROM diet_daily_users
    WHERE id = p_user_id;

    RETURN p_utc_time AT TIME ZONE v_timezone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 將使用者本地時間轉為 UTC
CREATE OR REPLACE FUNCTION from_user_timezone(
    p_user_id UUID,
    p_local_time TIMESTAMP,
    p_timezone TEXT DEFAULT NULL
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_timezone TEXT;
BEGIN
    v_timezone := COALESCE(
        p_timezone,
        (SELECT timezone FROM diet_daily_users WHERE id = p_user_id),
        'UTC'
    );

    RETURN p_local_time AT TIME ZONE v_timezone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===================================================================
-- Comments
-- ===================================================================

COMMENT ON FUNCTION upsert_sleep_session IS '去重並插入/更新睡眠記錄，優先順序：manual > healthkit > googlefit > wearable';
COMMENT ON FUNCTION upsert_activity_session IS '去重並插入/更新運動記錄';
COMMENT ON FUNCTION calculate_next_cycle_reminder IS '計算下次針劑提醒時間（relative_cycle 模式）';
COMMENT ON FUNCTION calculate_next_daily_reminder IS '計算下次口服藥提醒時間（every_n_days 模式）';
COMMENT ON FUNCTION refresh_daily_wellness_for_user IS '更新指定使用者特定日期的每日彙總資料';
COMMENT ON FUNCTION to_user_timezone IS '將 UTC 時間轉換為使用者本地時區';
COMMENT ON FUNCTION from_user_timezone IS '將使用者本地時間轉換為 UTC';
