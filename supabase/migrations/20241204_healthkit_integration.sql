-- ============================================================================
-- HealthKit Integration: 健康指標追蹤表
-- Created: 2024-12-04
-- Purpose: 整合 iOS HealthKit 數據，支援睡眠、運動、心率等健康因子同步
-- ============================================================================

-- 1. 建立 health_metrics 資料表（儲存所有從 HealthKit 同步的原始數據）
CREATE TABLE IF NOT EXISTS health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- 資料來源
    source TEXT NOT NULL DEFAULT 'healthkit' CHECK (source IN ('healthkit', 'manual', 'apple_watch', 'google_fit', 'fitbit', 'other')),
    source_identifier TEXT, -- HealthKit 的原始 UUID，用於避免重複導入

    -- 指標類型
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'sleep_analysis',      -- 睡眠分析
        'workout',             -- 運動/鍛鍊
        'heart_rate',          -- 心率
        'steps',               -- 步數
        'active_energy',       -- 活動消耗能量
        'resting_energy',      -- 靜息消耗能量
        'blood_pressure',      -- 血壓
        'blood_glucose',       -- 血糖
        'water_intake',        -- 飲水量
        'mindful_minutes',     -- 正念時間
        'respiratory_rate',    -- 呼吸頻率
        'body_temperature'     -- 體溫
    )),

    -- 時間範圍
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    recorded_date DATE NOT NULL,

    -- 數值資料
    numeric_value NUMERIC, -- 單一數值（如步數、心率 bpm、分鐘數）
    unit TEXT, -- 單位：'steps', 'bpm', 'kcal', 'minutes', 'mg/dL', 'mmHg'

    -- 結構化資料（JSON）- 儲存額外的詳細資訊
    detail_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- 範例 payload:
    -- 睡眠: {"stage": "deep|light|rem|awake", "quality_score": 4}
    -- 運動: {"workout_type": "running", "distance": 5000, "calories": 350}
    -- 心率: {"context": "resting|active|workout"}

    -- 元數據
    device_name TEXT,        -- 裝置名稱（如 "iPhone 15 Pro"）
    app_name TEXT,           -- 來源 app（如 "Apple Health", "Strava"）

    -- 同步狀態
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
    synced_at TIMESTAMPTZ,
    error_message TEXT,

    -- 時間戳記
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 避免重複導入：同一來源的相同資料只導入一次
    UNIQUE(source, source_identifier, start_time)
);

-- 建立索引以優化查詢效能
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date
    ON health_metrics(user_id, recorded_date DESC);

CREATE INDEX IF NOT EXISTS idx_health_metrics_type
    ON health_metrics(user_id, metric_type, recorded_date DESC);

CREATE INDEX IF NOT EXISTS idx_health_metrics_sync_status
    ON health_metrics(sync_status, user_id)
    WHERE sync_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_health_metrics_source
    ON health_metrics(user_id, source, created_at DESC);

-- 建立觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_health_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_health_metrics_updated_at ON health_metrics;
CREATE TRIGGER trigger_update_health_metrics_updated_at
    BEFORE UPDATE ON health_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_health_metrics_updated_at();

-- 建立觸發器：自動設定 recorded_date
CREATE OR REPLACE FUNCTION set_health_metrics_recorded_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.recorded_date := (NEW.start_time AT TIME ZONE 'UTC')::date;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TRIGGER IF EXISTS trigger_set_recorded_date ON health_metrics;
CREATE TRIGGER trigger_set_recorded_date
    BEFORE INSERT OR UPDATE ON health_metrics
    FOR EACH ROW
    EXECUTE FUNCTION set_health_metrics_recorded_date();

-- ============================================================================
-- 2. 擴充 daily_symptom_entries 新增 HealthKit 關聯欄位
-- ============================================================================

DO $$
BEGIN
    -- 平均心率（bpm）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_symptom_entries'
        AND column_name = 'avg_heart_rate'
    ) THEN
        ALTER TABLE daily_symptom_entries
        ADD COLUMN avg_heart_rate INTEGER CHECK (avg_heart_rate >= 30 AND avg_heart_rate <= 250);
    END IF;

    -- 每日步數
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_symptom_entries'
        AND column_name = 'daily_steps'
    ) THEN
        ALTER TABLE daily_symptom_entries
        ADD COLUMN daily_steps INTEGER CHECK (daily_steps >= 0);
    END IF;

    -- 活動消耗熱量（kcal）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_symptom_entries'
        AND column_name = 'active_calories'
    ) THEN
        ALTER TABLE daily_symptom_entries
        ADD COLUMN active_calories INTEGER CHECK (active_calories >= 0);
    END IF;

    -- 壓力分數（1-10，未來可從心率變異性推算）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_symptom_entries'
        AND column_name = 'stress_score'
    ) THEN
        ALTER TABLE daily_symptom_entries
        ADD COLUMN stress_score INTEGER CHECK (stress_score >= 1 AND stress_score <= 10);
    END IF;

    -- 水分攝取（ml）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_symptom_entries'
        AND column_name = 'water_intake_ml'
    ) THEN
        ALTER TABLE daily_symptom_entries
        ADD COLUMN water_intake_ml INTEGER CHECK (water_intake_ml >= 0);
    END IF;
END $$;

-- ============================================================================
-- 3. 建立自動同步觸發器：從 health_metrics 到 daily_symptom_entries
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_health_metrics_to_symptom_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_entry_date DATE;
    v_avg_heart_rate INTEGER;
    v_daily_steps INTEGER;
    v_active_calories INTEGER;
    v_water_intake INTEGER;
BEGIN
    -- 只處理已同步成功的數據
    IF NEW.sync_status != 'synced' THEN
        RETURN NEW;
    END IF;

    v_entry_date := DATE(NEW.start_time);

    -- 根據 metric_type 更新不同欄位
    CASE NEW.metric_type
        WHEN 'heart_rate' THEN
            -- 計算當日平均心率
            SELECT AVG(numeric_value)::INTEGER INTO v_avg_heart_rate
            FROM health_metrics
            WHERE user_id = NEW.user_id
            AND metric_type = 'heart_rate'
            AND recorded_date = v_entry_date
            AND sync_status = 'synced';

            INSERT INTO daily_symptom_entries (user_id, recorded_date, avg_heart_rate, overall_health)
            VALUES (NEW.user_id, v_entry_date, v_avg_heart_rate, 3)
            ON CONFLICT (user_id, recorded_date)
            DO UPDATE SET
                avg_heart_rate = EXCLUDED.avg_heart_rate,
                updated_at = NOW();

        WHEN 'steps' THEN
            -- 計算當日總步數
            SELECT SUM(numeric_value)::INTEGER INTO v_daily_steps
            FROM health_metrics
            WHERE user_id = NEW.user_id
            AND metric_type = 'steps'
            AND recorded_date = v_entry_date
            AND sync_status = 'synced';

            INSERT INTO daily_symptom_entries (user_id, recorded_date, daily_steps, overall_health)
            VALUES (NEW.user_id, v_entry_date, v_daily_steps, 3)
            ON CONFLICT (user_id, recorded_date)
            DO UPDATE SET
                daily_steps = EXCLUDED.daily_steps,
                updated_at = NOW();

        WHEN 'active_energy' THEN
            -- 計算當日活動消耗
            SELECT SUM(numeric_value)::INTEGER INTO v_active_calories
            FROM health_metrics
            WHERE user_id = NEW.user_id
            AND metric_type = 'active_energy'
            AND recorded_date = v_entry_date
            AND sync_status = 'synced';

            INSERT INTO daily_symptom_entries (user_id, recorded_date, active_calories, overall_health)
            VALUES (NEW.user_id, v_entry_date, v_active_calories, 3)
            ON CONFLICT (user_id, recorded_date)
            DO UPDATE SET
                active_calories = EXCLUDED.active_calories,
                updated_at = NOW();

        WHEN 'water_intake' THEN
            -- 計算當日飲水量
            SELECT SUM(numeric_value)::INTEGER INTO v_water_intake
            FROM health_metrics
            WHERE user_id = NEW.user_id
            AND metric_type = 'water_intake'
            AND recorded_date = v_entry_date
            AND sync_status = 'synced';

            INSERT INTO daily_symptom_entries (user_id, recorded_date, water_intake_ml, overall_health)
            VALUES (NEW.user_id, v_entry_date, v_water_intake, 3)
            ON CONFLICT (user_id, recorded_date)
            DO UPDATE SET
                water_intake_ml = EXCLUDED.water_intake_ml,
                updated_at = NOW();
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_sync_health_metrics ON health_metrics;
CREATE TRIGGER trigger_sync_health_metrics
    AFTER INSERT OR UPDATE ON health_metrics
    FOR EACH ROW
    WHEN (NEW.sync_status = 'synced')
    EXECUTE FUNCTION sync_health_metrics_to_symptom_entry();

-- ============================================================================
-- 4. RLS (Row Level Security) 政策
-- ============================================================================

ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own health metrics" ON health_metrics;
DROP POLICY IF EXISTS "Users can modify own health metrics" ON health_metrics;

CREATE POLICY "Users can view own health metrics"
ON health_metrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can modify own health metrics"
ON health_metrics FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin 可以查看所有資料（用於系統維護和分析）
DROP POLICY IF EXISTS "Admins can view all health metrics" ON health_metrics;
CREATE POLICY "Admins can view all health metrics"
ON health_metrics FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM diet_daily_users
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- ============================================================================
-- 5. 輔助函數：取得使用者健康數據摘要
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_health_summary(
    p_user_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    metric_type TEXT,
    avg_value NUMERIC,
    min_value NUMERIC,
    max_value NUMERIC,
    total_records INTEGER,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        hm.metric_type,
        AVG(hm.numeric_value) AS avg_value,
        MIN(hm.numeric_value) AS min_value,
        MAX(hm.numeric_value) AS max_value,
        COUNT(*)::INTEGER AS total_records,
        MAX(hm.created_at) AS last_updated
    FROM health_metrics hm
    WHERE hm.user_id = p_user_id
    AND hm.recorded_date BETWEEN p_start_date AND p_end_date
    AND hm.sync_status = 'synced'
    GROUP BY hm.metric_type
    ORDER BY hm.metric_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. 註解
-- ============================================================================

COMMENT ON TABLE health_metrics IS 'HealthKit 同步的健康指標原始數據，支援多種來源（Apple Health, Google Fit, Fitbit等）';
COMMENT ON COLUMN health_metrics.metric_type IS '指標類型：睡眠、運動、心率、步數、活動消耗等';
COMMENT ON COLUMN health_metrics.detail_payload IS '詳細資料 JSON，依 metric_type 而異，例如睡眠階段、運動類型等';
COMMENT ON COLUMN health_metrics.source_identifier IS 'HealthKit UUID，用於避免重複導入相同數據';
COMMENT ON COLUMN health_metrics.sync_status IS '同步狀態：pending=待處理, synced=已同步, error=錯誤';

COMMENT ON COLUMN daily_symptom_entries.avg_heart_rate IS '當日平均心率（bpm），從 health_metrics 自動計算';
COMMENT ON COLUMN daily_symptom_entries.daily_steps IS '當日總步數，從 health_metrics 自動彙總';
COMMENT ON COLUMN daily_symptom_entries.active_calories IS '當日活動消耗熱量（kcal），從 health_metrics 自動彙總';
COMMENT ON COLUMN daily_symptom_entries.stress_score IS '壓力分數（1-10），未來可從心率變異性計算';
COMMENT ON COLUMN daily_symptom_entries.water_intake_ml IS '當日飲水量（ml），從 health_metrics 自動彙總';

COMMENT ON FUNCTION get_user_health_summary IS '取得使用者健康數據摘要（平均值、最小值、最大值、記錄數）';

-- ============================================================================
-- 完成！
-- ============================================================================

-- 驗證資料表建立
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'health_metrics') THEN
        RAISE NOTICE '✅ health_metrics table created successfully';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'daily_symptom_entries'
        AND column_name = 'avg_heart_rate'
    ) THEN
        RAISE NOTICE '✅ daily_symptom_entries extended with health columns';
    END IF;

    RAISE NOTICE '✅ HealthKit integration migration completed successfully!';
END $$;
