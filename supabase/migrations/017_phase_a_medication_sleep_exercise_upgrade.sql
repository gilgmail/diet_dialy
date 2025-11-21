-- 017_phase_a_medication_sleep_exercise_upgrade.sql
-- Phase A: 藥物記錄升級、睡眠與運動整合、資料充足度儀表

-- ============================================================================
-- A1: 藥物記錄升級
-- ============================================================================

-- 1. 建立藥物變更歷史表，追蹤劑量、頻率、變更日期
CREATE TABLE IF NOT EXISTS medication_change_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    regimen_id UUID REFERENCES medication_regimens(id) ON DELETE SET NULL,
    
    -- 變更資訊
    change_date DATE NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('started', 'dose_changed', 'frequency_changed', 'stopped', 'paused', 'resumed')),
    
    -- 變更前後的值
    previous_dose TEXT,
    new_dose TEXT,
    previous_frequency TEXT, -- e.g., "every_7_days", "daily", "twice_daily"
    new_frequency TEXT,
    previous_interval_days INTEGER,
    new_interval_days INTEGER,
    
    -- 變更原因
    reason TEXT,
    changed_by TEXT DEFAULT 'user' CHECK (changed_by IN ('user', 'doctor', 'system')),
    notes TEXT,
    
    -- 關聯的症狀記錄（如果有）
    related_symptom_entry_id UUID REFERENCES daily_symptom_entries(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medication_change_history_user_date
    ON medication_change_history(user_id, change_date DESC);
CREATE INDEX IF NOT EXISTS idx_medication_change_history_regimen
    ON medication_change_history(regimen_id);

-- 2. 擴充 daily_symptom_entries.medications_taken JSONB 結構
-- 新的結構格式：
-- [
--   {
--     "regimen_id": "uuid",
--     "medication_name": "string",
--     "dose": "string",
--     "frequency": "string",
--     "taken_at": "timestamp",
--     "adherence_status": "taken|skipped|delayed|missed"
--   }
-- ]
-- 這個結構已經可以支援，但我們需要建立一個函數來同步 medication_administrations

-- 3. 建立函數：從 medication_administrations 同步到 daily_symptom_entries.medications_taken
CREATE OR REPLACE FUNCTION sync_medications_to_symptom_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_entry_date DATE;
    v_medication_data JSONB;
    v_existing_medications JSONB;
BEGIN
    -- 取得 user_id 和日期
    SELECT mr.user_id INTO v_user_id
    FROM medication_regimens mr
    WHERE mr.id = NEW.regimen_id;
    
    v_entry_date := DATE(NEW.taken_at);
    
    -- 建立藥物資料 JSONB
    v_medication_data := jsonb_build_object(
        'regimen_id', NEW.regimen_id::text,
        'medication_name', COALESCE(mr.custom_name, mc.name, '未知藥物'),
        'dose', NEW.dose,
        'frequency', mr.frequency_type,
        'taken_at', NEW.taken_at::text,
        'adherence_status', NEW.adherence_status,
        'route', COALESCE(NEW.route, mr.route)
    )
    FROM medication_regimens mr
    LEFT JOIN medication_catalog mc ON mr.medication_id = mc.id
    WHERE mr.id = NEW.regimen_id;
    
    -- 更新或插入 daily_symptom_entries
    INSERT INTO daily_symptom_entries (user_id, recorded_date, medications_taken, overall_health)
    VALUES (v_user_id, v_entry_date, jsonb_build_array(v_medication_data), 3)
    ON CONFLICT (user_id, recorded_date)
    DO UPDATE SET
        medications_taken = COALESCE(
            daily_symptom_entries.medications_taken,
            '[]'::jsonb
        ) || jsonb_build_array(v_medication_data),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器（僅在 medication_administrations 插入時觸發）
DROP TRIGGER IF EXISTS trigger_sync_medications_to_symptom ON medication_administrations;
CREATE TRIGGER trigger_sync_medications_to_symptom
    AFTER INSERT ON medication_administrations
    FOR EACH ROW
    EXECUTE FUNCTION sync_medications_to_symptom_entry();

-- ============================================================================
-- A2: 睡眠與運動時間記錄整合
-- ============================================================================

-- 1. 在 daily_symptom_entries 新增欄位（如果不存在）
DO $$ 
BEGIN
    -- 睡眠時數（分鐘）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_symptom_entries' 
        AND column_name = 'sleep_duration_minutes'
    ) THEN
        ALTER TABLE daily_symptom_entries 
        ADD COLUMN sleep_duration_minutes INTEGER CHECK (sleep_duration_minutes >= 0 AND sleep_duration_minutes <= 1440);
    END IF;
    
    -- 運動時數（分鐘）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_symptom_entries' 
        AND column_name = 'exercise_duration_minutes'
    ) THEN
        ALTER TABLE daily_symptom_entries 
        ADD COLUMN exercise_duration_minutes INTEGER CHECK (exercise_duration_minutes >= 0 AND exercise_duration_minutes <= 1440);
    END IF;
    
    -- 運動強度
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_symptom_entries' 
        AND column_name = 'exercise_intensity'
    ) THEN
        ALTER TABLE daily_symptom_entries 
        ADD COLUMN exercise_intensity TEXT CHECK (exercise_intensity IN ('low', 'moderate', 'high'));
    END IF;
END $$;

-- 2. 建立函數：從 sleep_sessions 同步到 daily_symptom_entries
CREATE OR REPLACE FUNCTION sync_sleep_to_symptom_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_entry_date DATE;
    v_duration_minutes INTEGER;
BEGIN
    -- 只處理主要睡眠（is_main_sleep = true）
    IF NOT NEW.is_main_sleep THEN
        RETURN NEW;
    END IF;
    
    v_entry_date := DATE(COALESCE(NEW.start_time, NEW.created_at));
    v_duration_minutes := COALESCE(NEW.duration_minutes, NEW.planned_duration_minutes);
    
    -- 更新或插入 daily_symptom_entries
    INSERT INTO daily_symptom_entries (user_id, recorded_date, sleep_duration_minutes, sleep_quality, overall_health)
    VALUES (NEW.user_id, v_entry_date, v_duration_minutes, NEW.quality_score, 3)
    ON CONFLICT (user_id, recorded_date)
    DO UPDATE SET
        sleep_duration_minutes = COALESCE(
            EXCLUDED.sleep_duration_minutes,
            daily_symptom_entries.sleep_duration_minutes
        ),
        sleep_quality = COALESCE(
            EXCLUDED.sleep_quality,
            daily_symptom_entries.sleep_quality
        ),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_sync_sleep_to_symptom ON sleep_sessions;
CREATE TRIGGER trigger_sync_sleep_to_symptom
    AFTER INSERT OR UPDATE ON sleep_sessions
    FOR EACH ROW
    WHEN (NEW.is_main_sleep = true)
    EXECUTE FUNCTION sync_sleep_to_symptom_entry();

-- 3. 建立函數：從 activity_sessions 同步到 daily_symptom_entries
CREATE OR REPLACE FUNCTION sync_activity_to_symptom_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_entry_date DATE;
    v_total_duration INTEGER;
    v_max_intensity TEXT;
BEGIN
    v_entry_date := DATE(COALESCE(NEW.start_time, NEW.created_at));
    
    -- 計算當日總運動時數和最高強度
    SELECT 
        COALESCE(SUM(COALESCE(duration_minutes, 0)), 0),
        MAX(intensity) FILTER (WHERE intensity IS NOT NULL)
    INTO v_total_duration, v_max_intensity
    FROM activity_sessions
    WHERE user_id = NEW.user_id
    AND DATE(COALESCE(start_time, created_at)) = v_entry_date;
    
    -- 更新或插入 daily_symptom_entries
    INSERT INTO daily_symptom_entries (user_id, recorded_date, exercise_duration_minutes, exercise_intensity, activity_level, overall_health)
    VALUES (NEW.user_id, v_entry_date, v_total_duration, v_max_intensity, 
            CASE v_max_intensity 
                WHEN 'high' THEN 'high'
                WHEN 'moderate' THEN 'moderate'
                ELSE 'low'
            END, 3)
    ON CONFLICT (user_id, recorded_date)
    DO UPDATE SET
        exercise_duration_minutes = EXCLUDED.exercise_duration_minutes,
        exercise_intensity = COALESCE(EXCLUDED.exercise_intensity, daily_symptom_entries.exercise_intensity),
        activity_level = COALESCE(EXCLUDED.activity_level, daily_symptom_entries.activity_level),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_sync_activity_to_symptom ON activity_sessions;
CREATE TRIGGER trigger_sync_activity_to_symptom
    AFTER INSERT OR UPDATE ON activity_sessions
    FOR EACH ROW
    EXECUTE FUNCTION sync_activity_to_symptom_entry();

-- ============================================================================
-- M0: 資料充足度儀表（Data Coverage Dashboard）
-- ============================================================================

-- 1. 建立資料充足度視圖
CREATE OR REPLACE VIEW data_coverage_dashboard AS
SELECT 
    u.id AS user_id,
    u.email,
    u.name,
    
    -- 日期範圍
    CURRENT_DATE - INTERVAL '30 days' AS period_start,
    CURRENT_DATE AS period_end,
    
    -- 症狀記錄覆蓋率
    COUNT(DISTINCT dse.recorded_date) AS symptom_entry_days,
    30.0 AS total_days,
    ROUND(COUNT(DISTINCT dse.recorded_date)::numeric / 30.0 * 100, 1) AS symptom_coverage_percent,
    
    -- 飲食記錄覆蓋率
    COUNT(DISTINCT DATE(fe.consumed_at)) AS food_entry_days,
    ROUND(COUNT(DISTINCT DATE(fe.consumed_at))::numeric / 30.0 * 100, 1) AS food_coverage_percent,
    
    -- 藥物記錄覆蓋率（有 medication_administrations 或 medications_taken 的日子）
    COUNT(DISTINCT DATE(ma.taken_at)) + 
    COUNT(DISTINCT CASE WHEN dse.medications_taken IS NOT NULL AND jsonb_array_length(dse.medications_taken) > 0 
                        THEN dse.recorded_date END) AS medication_entry_days,
    ROUND((COUNT(DISTINCT DATE(ma.taken_at)) + 
           COUNT(DISTINCT CASE WHEN dse.medications_taken IS NOT NULL AND jsonb_array_length(dse.medications_taken) > 0 
                               THEN dse.recorded_date END))::numeric / 30.0 * 100, 1) AS medication_coverage_percent,
    
    -- 睡眠記錄覆蓋率
    COUNT(DISTINCT DATE(ss.start_time)) + 
    COUNT(DISTINCT DATE(ss.created_at)) AS sleep_entry_days,
    ROUND((COUNT(DISTINCT DATE(ss.start_time)) + 
           COUNT(DISTINCT DATE(ss.created_at)))::numeric / 30.0 * 100, 1) AS sleep_coverage_percent,
    
    -- 運動記錄覆蓋率
    COUNT(DISTINCT DATE(as2.start_time)) + 
    COUNT(DISTINCT DATE(as2.created_at)) AS exercise_entry_days,
    ROUND((COUNT(DISTINCT DATE(as2.start_time)) + 
           COUNT(DISTINCT DATE(as2.created_at)))::numeric / 30.0 * 100, 1) AS exercise_coverage_percent,
    
    -- 綜合充足度分數（≥60% 為充足）
    CASE 
        WHEN COUNT(DISTINCT dse.recorded_date) >= 18 THEN 'sufficient'
        WHEN COUNT(DISTINCT dse.recorded_date) >= 12 THEN 'partial'
        ELSE 'insufficient'
    END AS overall_data_status,
    
    -- 缺漏項目
    ARRAY_REMOVE(ARRAY[
        CASE WHEN COUNT(DISTINCT dse.recorded_date) < 18 THEN 'symptoms' END,
        CASE WHEN COUNT(DISTINCT DATE(fe.consumed_at)) < 18 THEN 'food' END,
        CASE WHEN (COUNT(DISTINCT DATE(ma.taken_at)) + 
                   COUNT(DISTINCT CASE WHEN dse.medications_taken IS NOT NULL AND jsonb_array_length(dse.medications_taken) > 0 
                                       THEN dse.recorded_date END)) < 18 THEN 'medications' END,
        CASE WHEN (COUNT(DISTINCT DATE(ss.start_time)) + COUNT(DISTINCT DATE(ss.created_at))) < 18 THEN 'sleep' END,
        CASE WHEN (COUNT(DISTINCT DATE(as2.start_time)) + COUNT(DISTINCT DATE(as2.created_at))) < 18 THEN 'exercise' END
    ], NULL) AS missing_categories,
    
    -- 最後更新時間
    MAX(GREATEST(
        COALESCE(dse.updated_at, dse.created_at),
        COALESCE(fe.updated_at, fe.created_at),
        COALESCE(ma.created_at, '1970-01-01'::timestamptz),
        COALESCE(ss.created_at, '1970-01-01'::timestamptz),
        COALESCE(as2.created_at, '1970-01-01'::timestamptz)
    )) AS last_data_update

FROM diet_daily_users u
LEFT JOIN daily_symptom_entries dse ON u.id = dse.user_id 
    AND dse.recorded_date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN food_entries fe ON u.id = fe.user_id 
    AND fe.consumed_at >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN medication_administrations ma ON u.id IN (
    SELECT mr.user_id FROM medication_regimens mr WHERE mr.id = ma.regimen_id
) AND ma.taken_at >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN sleep_sessions ss ON u.id = ss.user_id 
    AND (ss.start_time >= CURRENT_DATE - INTERVAL '30 days' OR ss.created_at >= CURRENT_DATE - INTERVAL '30 days')
LEFT JOIN activity_sessions as2 ON u.id = as2.user_id 
    AND (as2.start_time >= CURRENT_DATE - INTERVAL '30 days' OR as2.created_at >= CURRENT_DATE - INTERVAL '30 days')
GROUP BY u.id, u.email, u.name;

-- 2. 建立函數：取得使用者缺漏提醒
CREATE OR REPLACE FUNCTION get_user_missing_data_alerts(
    p_user_id UUID,
    p_days_threshold INTEGER DEFAULT 2
)
RETURNS TABLE (
    category TEXT,
    missing_days INTEGER,
    last_entry_date DATE,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH date_range AS (
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '30 days',
            CURRENT_DATE,
            '1 day'::interval
        )::DATE AS check_date
    ),
    missing_data AS (
        -- 症狀缺漏
        SELECT 
            'symptoms'::TEXT AS category,
            COUNT(*)::INTEGER AS missing_days,
            MAX(dse.recorded_date) AS last_entry_date
        FROM date_range dr
        LEFT JOIN daily_symptom_entries dse ON dse.user_id = p_user_id 
            AND dse.recorded_date = dr.check_date
        WHERE dse.recorded_date IS NULL
        HAVING COUNT(*) >= p_days_threshold
        
        UNION ALL
        
        -- 藥物缺漏
        SELECT 
            'medications'::TEXT AS category,
            COUNT(*)::INTEGER AS missing_days,
            MAX(COALESCE(DATE(ma.taken_at), dse.recorded_date)) AS last_entry_date
        FROM date_range dr
        LEFT JOIN medication_administrations ma ON ma.regimen_id IN (
            SELECT id FROM medication_regimens WHERE user_id = p_user_id AND status = 'active'
        ) AND DATE(ma.taken_at) = dr.check_date
        LEFT JOIN daily_symptom_entries dse ON dse.user_id = p_user_id 
            AND dse.recorded_date = dr.check_date
            AND dse.medications_taken IS NOT NULL 
            AND jsonb_array_length(dse.medications_taken) > 0
        WHERE ma.taken_at IS NULL AND (dse.medications_taken IS NULL OR jsonb_array_length(dse.medications_taken) = 0)
        HAVING COUNT(*) >= p_days_threshold
        
        UNION ALL
        
        -- 睡眠缺漏
        SELECT 
            'sleep'::TEXT AS category,
            COUNT(*)::INTEGER AS missing_days,
            MAX(COALESCE(DATE(ss.start_time), DATE(ss.created_at))) AS last_entry_date
        FROM date_range dr
        LEFT JOIN sleep_sessions ss ON ss.user_id = p_user_id 
            AND ss.is_main_sleep = true
            AND (DATE(ss.start_time) = dr.check_date OR DATE(ss.created_at) = dr.check_date)
        WHERE ss.id IS NULL
        HAVING COUNT(*) >= p_days_threshold
        
        UNION ALL
        
        -- 運動缺漏
        SELECT 
            'exercise'::TEXT AS category,
            COUNT(*)::INTEGER AS missing_days,
            MAX(COALESCE(DATE(as2.start_time), DATE(as2.created_at))) AS last_entry_date
        FROM date_range dr
        LEFT JOIN activity_sessions as2 ON as2.user_id = p_user_id 
            AND (DATE(as2.start_time) = dr.check_date OR DATE(as2.created_at) = dr.check_date)
        WHERE as2.id IS NULL
        HAVING COUNT(*) >= p_days_threshold
    )
    SELECT 
        md.category,
        md.missing_days,
        md.last_entry_date,
        CASE md.category
            WHEN 'symptoms' THEN '請記得記錄每日症狀，有助於追蹤健康狀況'
            WHEN 'medications' THEN '請更新用藥記錄，確保資料完整性'
            WHEN 'sleep' THEN '請記錄睡眠時間，睡眠品質與症狀相關'
            WHEN 'exercise' THEN '請記錄運動時間，活動量影響健康狀態'
            ELSE '請補齊資料'
        END AS recommendation
    FROM missing_data md;
END;
$$ LANGUAGE plpgsql;

-- 3. 建立 RLS 政策
ALTER TABLE medication_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own medication change history" ON medication_change_history;
DROP POLICY IF EXISTS "Users can modify own medication change history" ON medication_change_history;

CREATE POLICY "Users can view own medication change history"
ON medication_change_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can modify own medication change history"
ON medication_change_history FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin 可以查看所有資料
CREATE POLICY "Admins can view all medication change history"
ON medication_change_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM diet_daily_users
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- 4. 建立索引以優化查詢
CREATE INDEX IF NOT EXISTS idx_daily_symptom_entries_sleep_exercise
    ON daily_symptom_entries(user_id, recorded_date DESC)
    WHERE sleep_duration_minutes IS NOT NULL OR exercise_duration_minutes IS NOT NULL;

-- 5. 註解
COMMENT ON TABLE medication_change_history IS '藥物變更歷史，追蹤劑量、頻率、變更日期';
COMMENT ON COLUMN daily_symptom_entries.sleep_duration_minutes IS '睡眠時數（分鐘），從 sleep_sessions 同步';
COMMENT ON COLUMN daily_symptom_entries.exercise_duration_minutes IS '運動時數（分鐘），從 activity_sessions 同步';
COMMENT ON COLUMN daily_symptom_entries.exercise_intensity IS '運動強度：low/moderate/high';
COMMENT ON VIEW data_coverage_dashboard IS '資料充足度儀表，顯示過去 30 天各類資料的覆蓋率';
COMMENT ON FUNCTION get_user_missing_data_alerts IS '取得使用者缺漏資料提醒，預設缺漏 2 天以上才提醒';

