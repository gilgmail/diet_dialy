-- kogil0231@gmail.com 資料覆蓋率詳細分析
-- 根據統計摘要：8 天記錄，日期範圍 2025-10-31 到 2025-11-18

-- ============================================================================
-- 1. 資料覆蓋率詳細分析
-- ============================================================================
SELECT 
    '=== 資料覆蓋率分析 ===' AS section,
    user_id,
    email,
    -- 症狀記錄
    symptom_entry_days AS symptom_days,
    total_days,
    ROUND(symptom_entry_days::numeric / total_days * 100, 1) || '%' AS symptom_coverage,
    -- 其他資料類型
    food_coverage_percent || '%' AS food_coverage,
    medication_coverage_percent || '%' AS medication_coverage,
    sleep_coverage_percent || '%' AS sleep_coverage,
    exercise_coverage_percent || '%' AS exercise_coverage,
    -- 狀態
    overall_data_status,
    -- 缺漏項目
    missing_categories,
    -- 建議
    CASE 
        WHEN symptom_coverage_percent < 60 THEN '建議提高症狀記錄頻率，目標：每天記錄'
        WHEN medication_coverage_percent < 60 THEN '建議記錄藥物使用情況'
        WHEN sleep_coverage_percent < 60 THEN '建議記錄睡眠時間'
        WHEN exercise_coverage_percent < 60 THEN '建議記錄運動時間'
        ELSE '資料充足，可進行 AI 分析'
    END AS recommendation
FROM data_coverage_dashboard
WHERE email = 'kogil0231@gmail.com';

-- ============================================================================
-- 2. 記錄日期分布分析
-- ============================================================================
WITH date_range AS (
    SELECT generate_series(
        '2025-10-31'::DATE,
        '2025-11-18'::DATE,
        '1 day'::interval
    )::DATE AS check_date
),
recorded_dates AS (
    SELECT DISTINCT recorded_date
    FROM daily_symptom_entries
    WHERE user_id = (SELECT id FROM diet_daily_users WHERE email = 'kogil0231@gmail.com' LIMIT 1)
    AND recorded_date BETWEEN '2025-10-31' AND '2025-11-18'
)
SELECT 
    '=== 記錄日期分布 ===' AS section,
    dr.check_date,
    CASE WHEN rd.recorded_date IS NOT NULL THEN '✅ 有記錄' ELSE '❌ 缺漏' END AS status,
    CASE 
        WHEN rd.recorded_date IS NOT NULL THEN 
            (SELECT 
                CASE 
                    WHEN sleep_duration_minutes IS NOT NULL THEN '睡眠✓'
                    ELSE ''
                END ||
                CASE 
                    WHEN exercise_duration_minutes IS NOT NULL THEN '運動✓'
                    ELSE ''
                END ||
                CASE 
                    WHEN medications_taken IS NOT NULL AND jsonb_array_length(medications_taken) > 0 THEN '藥物✓'
                    ELSE ''
                END
            FROM daily_symptom_entries
            WHERE user_id = (SELECT id FROM diet_daily_users WHERE email = 'kogil0231@gmail.com' LIMIT 1)
            AND recorded_date = dr.check_date
            LIMIT 1)
        ELSE ''
    END AS additional_data
FROM date_range dr
LEFT JOIN recorded_dates rd ON dr.check_date = rd.recorded_date
ORDER BY dr.check_date;

-- ============================================================================
-- 3. 缺漏天數統計
-- ============================================================================
WITH date_range AS (
    SELECT generate_series(
        '2025-10-31'::DATE,
        '2025-11-18'::DATE,
        '1 day'::interval
    )::DATE AS check_date
),
recorded_dates AS (
    SELECT DISTINCT recorded_date
    FROM daily_symptom_entries
    WHERE user_id = (SELECT id FROM diet_daily_users WHERE email = 'kogil0231@gmail.com' LIMIT 1)
    AND recorded_date BETWEEN '2025-10-31' AND '2025-11-18'
)
SELECT 
    '=== 缺漏分析 ===' AS section,
    COUNT(*) AS total_days,
    COUNT(rd.recorded_date) AS recorded_days,
    COUNT(*) - COUNT(rd.recorded_date) AS missing_days,
    ROUND(COUNT(rd.recorded_date)::numeric / COUNT(*) * 100, 1) || '%' AS coverage_rate,
    CASE 
        WHEN COUNT(rd.recorded_date)::numeric / COUNT(*) >= 0.6 THEN '✅ 充足'
        WHEN COUNT(rd.recorded_date)::numeric / COUNT(*) >= 0.4 THEN '⚠️ 部分'
        ELSE '❌ 不足'
    END AS status
FROM date_range dr
LEFT JOIN recorded_dates rd ON dr.check_date = rd.recorded_date;

-- ============================================================================
-- 4. 連續缺漏分析
-- ============================================================================
WITH date_range AS (
    SELECT generate_series(
        '2025-10-31'::DATE,
        '2025-11-18'::DATE,
        '1 day'::interval
    )::DATE AS check_date
),
recorded_dates AS (
    SELECT DISTINCT recorded_date
    FROM daily_symptom_entries
    WHERE user_id = (SELECT id FROM diet_daily_users WHERE email = 'kogil0231@gmail.com' LIMIT 1)
    AND recorded_date BETWEEN '2025-10-31' AND '2025-11-18'
),
date_status AS (
    SELECT 
        dr.check_date,
        CASE WHEN rd.recorded_date IS NOT NULL THEN 1 ELSE 0 END AS has_record
    FROM date_range dr
    LEFT JOIN recorded_dates rd ON dr.check_date = rd.recorded_date
),
gaps AS (
    SELECT 
        check_date,
        has_record,
        check_date - LAG(check_date) OVER (ORDER BY check_date) AS days_since_last
    FROM date_status
)
SELECT 
    '=== 連續缺漏分析 ===' AS section,
    check_date,
    CASE 
        WHEN has_record = 0 AND days_since_last > 1 THEN '連續缺漏 ' || (days_since_last - 1) || ' 天'
        WHEN has_record = 0 THEN '缺漏'
        ELSE '有記錄'
    END AS gap_info
FROM gaps
WHERE has_record = 0 OR days_since_last > 1
ORDER BY check_date;

-- ============================================================================
-- 5. 改善建議
-- ============================================================================
SELECT 
    '=== 改善建議 ===' AS section,
    CASE 
        WHEN (SELECT symptom_coverage_percent FROM data_coverage_dashboard WHERE email = 'kogil0231@gmail.com') < 60 THEN
            '1. 提高症狀記錄頻率：目前覆蓋率 ' || 
            (SELECT symptom_coverage_percent FROM data_coverage_dashboard WHERE email = 'kogil0231@gmail.com') || 
            '%，建議達到 60% 以上'
        ELSE '✅ 症狀記錄覆蓋率已達標'
    END AS symptom_recommendation,
    CASE 
        WHEN (SELECT sleep_coverage_percent FROM data_coverage_dashboard WHERE email = 'kogil0231@gmail.com') < 60 THEN
            '2. 記錄睡眠時間：目前覆蓋率 ' || 
            (SELECT sleep_coverage_percent FROM data_coverage_dashboard WHERE email = 'kogil0231@gmail.com') || 
            '%，建議記錄每日睡眠時數'
        ELSE '✅ 睡眠記錄覆蓋率已達標'
    END AS sleep_recommendation,
    CASE 
        WHEN (SELECT exercise_coverage_percent FROM data_coverage_dashboard WHERE email = 'kogil0231@gmail.com') < 60 THEN
            '3. 記錄運動時間：目前覆蓋率 ' || 
            (SELECT exercise_coverage_percent FROM data_coverage_dashboard WHERE email = 'kogil0231@gmail.com') || 
            '%，建議記錄每日運動時數'
        ELSE '✅ 運動記錄覆蓋率已達標'
    END AS exercise_recommendation,
    CASE 
        WHEN (SELECT medication_coverage_percent FROM data_coverage_dashboard WHERE email = 'kogil0231@gmail.com') < 60 THEN
            '4. 記錄藥物使用：目前覆蓋率 ' || 
            (SELECT medication_coverage_percent FROM data_coverage_dashboard WHERE email = 'kogil0231@gmail.com') || 
            '%，如有用藥請記錄'
        ELSE '✅ 藥物記錄覆蓋率已達標'
    END AS medication_recommendation;

