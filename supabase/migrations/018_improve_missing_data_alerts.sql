-- 018_improve_missing_data_alerts.sql
-- 改進缺漏資料提醒邏輯：改為註冊後或本週的缺漏，減少壓力

-- 先刪除舊版本的函數（如果存在）
DROP FUNCTION IF EXISTS get_user_missing_data_alerts(UUID, INTEGER);

-- 創建新版本的函數：支援「註冊後或本週」的邏輯
CREATE OR REPLACE FUNCTION get_user_missing_data_alerts(
    p_user_id UUID,
    p_days_threshold INTEGER DEFAULT 1,
    p_use_week_only BOOLEAN DEFAULT true  -- 預設只檢查本週
)
RETURNS TABLE (
    category TEXT,
    missing_days INTEGER,
    last_entry_date DATE,
    recommendation TEXT
) AS $$
DECLARE
    v_user_created_at DATE;
    v_week_start DATE;
    v_check_start DATE;
BEGIN
    -- 取得使用者註冊日期
    SELECT DATE(created_at) INTO v_user_created_at
    FROM diet_daily_users
    WHERE id = p_user_id;
    
    -- 如果找不到使用者，返回空結果
    IF v_user_created_at IS NULL THEN
        RETURN;
    END IF;
    
    -- 計算本週開始日期（週一）
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
    -- 如果今天是週日，則往前推 6 天
    IF EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN
        v_week_start := v_week_start - INTERVAL '6 days';
    END IF;
    
    -- 決定檢查的起始日期：使用註冊日期或本週開始日期，取較晚者
    IF p_use_week_only THEN
        v_check_start := GREATEST(v_week_start, v_user_created_at);
    ELSE
        v_check_start := v_user_created_at;
    END IF;
    
    -- 只檢查從 v_check_start 到今天的日期範圍
    RETURN QUERY
    WITH date_range AS (
        SELECT generate_series(
            v_check_start,
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
            WHEN 'symptoms' THEN '記錄每日症狀，幫助追蹤健康變化 ✨'
            WHEN 'medications' THEN '更新用藥記錄，讓資料更完整 📝'
            WHEN 'sleep' THEN '記錄睡眠時間，了解睡眠與症狀的關聯 😴'
            WHEN 'exercise' THEN '記錄運動時間，活動量影響健康狀態 🏃'
            ELSE '補齊資料，讓分析更準確'
        END AS recommendation
    FROM missing_data md
    ORDER BY md.missing_days DESC;
END;
$$ LANGUAGE plpgsql;

-- 更新註解
COMMENT ON FUNCTION get_user_missing_data_alerts IS 
'取得使用者缺漏資料提醒。預設只檢查本週或註冊後的資料，減少壓力。';

