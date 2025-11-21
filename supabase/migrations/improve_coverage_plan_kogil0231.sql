-- kogil0231@gmail.com 資料覆蓋率改善計劃
-- 目前症狀記錄覆蓋率：26.7%，目標：60% 以上

-- ============================================================================
-- 1. 當前狀況分析
-- ============================================================================
SELECT 
    '=== 當前狀況 ===' AS section,
    symptom_entry_days AS 目前記錄天數,
    total_days AS 總天數,
    symptom_coverage_percent AS 目前覆蓋率,
    ROUND((total_days * 0.6)::numeric, 0) AS 目標記錄天數,
    ROUND((total_days * 0.6)::numeric, 0) - symptom_entry_days AS 還需補記天數,
    CASE 
        WHEN symptom_coverage_percent < 40 THEN '❌ 不足 - 需要大量補記'
        WHEN symptom_coverage_percent < 60 THEN '⚠️ 部分 - 需要補記'
        ELSE '✅ 充足'
    END AS 狀態
FROM data_coverage_dashboard
WHERE email = 'kogil0231@gmail.com';

-- ============================================================================
-- 2. 缺漏日期列表（優先補記）
-- ============================================================================
WITH date_range AS (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE,
        '1 day'::interval
    )::DATE AS check_date
),
recorded_dates AS (
    SELECT DISTINCT recorded_date
    FROM daily_symptom_entries
    WHERE user_id = (SELECT id FROM diet_daily_users WHERE email = 'kogil0231@gmail.com' LIMIT 1)
    AND recorded_date >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT 
    '=== 缺漏日期列表（建議優先補記） ===' AS section,
    dr.check_date AS 缺漏日期,
    TO_CHAR(dr.check_date, 'Day') AS 星期,
    CASE 
        WHEN dr.check_date >= CURRENT_DATE - INTERVAL '7 days' THEN '最近一週 - 優先補記'
        WHEN dr.check_date >= CURRENT_DATE - INTERVAL '14 days' THEN '最近兩週 - 建議補記'
        ELSE '較早日期 - 可選補記'
    END AS 優先級
FROM date_range dr
LEFT JOIN recorded_dates rd ON dr.check_date = rd.recorded_date
WHERE rd.recorded_date IS NULL
ORDER BY dr.check_date DESC;

-- ============================================================================
-- 3. 補記計劃（分階段）
-- ============================================================================
SELECT 
    '=== 補記計劃 ===' AS section,
    '階段 1：補記最近 7 天（' || 
    (SELECT COUNT(*) FROM generate_series(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, '1 day'::interval)::DATE AS d
     LEFT JOIN (SELECT DISTINCT recorded_date FROM daily_symptom_entries 
                WHERE user_id = (SELECT id FROM diet_daily_users WHERE email = 'kogil0231@gmail.com' LIMIT 1)
                AND recorded_date >= CURRENT_DATE - INTERVAL '7 days') rd ON d = rd.recorded_date
     WHERE rd.recorded_date IS NULL) || 
    ' 天）' AS 階段1,
    '階段 2：補記最近 14 天（' || 
    (SELECT COUNT(*) FROM generate_series(CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '7 days', '1 day'::interval)::DATE AS d
     LEFT JOIN (SELECT DISTINCT recorded_date FROM daily_symptom_entries 
                WHERE user_id = (SELECT id FROM diet_daily_users WHERE email = 'kogil0231@gmail.com' LIMIT 1)
                AND recorded_date BETWEEN CURRENT_DATE - INTERVAL '14 days' AND CURRENT_DATE - INTERVAL '7 days') rd ON d = rd.recorded_date
     WHERE rd.recorded_date IS NULL) || 
    ' 天）' AS 階段2,
    '階段 3：補記最近 30 天（' || 
    (SELECT COUNT(*) FROM generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '14 days', '1 day'::interval)::DATE AS d
     LEFT JOIN (SELECT DISTINCT recorded_date FROM daily_symptom_entries 
                WHERE user_id = (SELECT id FROM diet_daily_users WHERE email = 'kogil0231@gmail.com' LIMIT 1)
                AND recorded_date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE - INTERVAL '14 days') rd ON d = rd.recorded_date
     WHERE rd.recorded_date IS NULL) || 
    ' 天）' AS 階段3;

-- ============================================================================
-- 4. 快速補記建議（最少資料即可）
-- ============================================================================
SELECT 
    '=== 快速補記建議 ===' AS section,
    '即使只記得基本資訊也可以補記：' AS 說明,
    '1. overall_health（整體健康）：1-5 分（必填）' AS 項目1,
    '2. 至少填寫一個核心症狀（腹痛/腹瀉/血便/脹氣）' AS 項目2,
    '3. 如果記得，可以補充：' AS 項目3,
    '   - mood_score（心情）' AS 項目3_1,
    '   - energy_level（精力）' AS 項目3_2,
    '   - sleep_quality（睡眠品質）' AS 項目3_3,
    '4. 不記得也沒關係，有基本記錄就能提高覆蓋率' AS 項目4;

-- ============================================================================
-- 5. 每日提醒設定建議
-- ============================================================================
SELECT 
    '=== 每日提醒設定 ===' AS section,
    '建議設定每日提醒時間：' AS 建議,
    '1. 晚上 8-9 點：回顧當天症狀' AS 時間1,
    '2. 睡前：補充睡眠和運動資料' AS 時間2,
    '3. 早上：補充前一天的資料（如果忘記）' AS 時間3,
    '目標：連續記錄 7 天，建立習慣' AS 目標;

-- ============================================================================
-- 6. 預期改善效果
-- ============================================================================
WITH current_stats AS (
    SELECT 
        symptom_entry_days,
        total_days,
        symptom_coverage_percent
    FROM data_coverage_dashboard
    WHERE email = 'kogil0231@gmail.com'
)
SELECT 
    '=== 預期改善效果 ===' AS section,
    '目前覆蓋率：' || (SELECT symptom_coverage_percent FROM current_stats) || '%' AS 現況,
    '如果補記最近 7 天缺漏：' || 
    ROUND(((SELECT symptom_entry_days FROM current_stats) + 
           (SELECT COUNT(*) FROM generate_series(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE, '1 day'::interval)::DATE AS d
            LEFT JOIN (SELECT DISTINCT recorded_date FROM daily_symptom_entries 
                       WHERE user_id = (SELECT id FROM diet_daily_users WHERE email = 'kogil0231@gmail.com' LIMIT 1)
                       AND recorded_date >= CURRENT_DATE - INTERVAL '7 days') rd ON d = rd.recorded_date
            WHERE rd.recorded_date IS NULL))::numeric / 
           (SELECT total_days FROM current_stats) * 100, 1) || '%' AS 補記7天後,
    '如果補記最近 14 天缺漏：' || 
    ROUND(((SELECT symptom_entry_days FROM current_stats) + 
           (SELECT COUNT(*) FROM generate_series(CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE, '1 day'::interval)::DATE AS d
            LEFT JOIN (SELECT DISTINCT recorded_date FROM daily_symptom_entries 
                       WHERE user_id = (SELECT id FROM diet_daily_users WHERE email = 'kogil0231@gmail.com' LIMIT 1)
                       AND recorded_date >= CURRENT_DATE - INTERVAL '14 days') rd ON d = rd.recorded_date
            WHERE rd.recorded_date IS NULL))::numeric / 
           (SELECT total_days FROM current_stats) * 100, 1) || '%' AS 補記14天後,
    '目標覆蓋率：60%' AS 目標,
    CASE 
        WHEN (SELECT symptom_coverage_percent FROM current_stats) < 60 THEN
            '還需補記約 ' || 
            ROUND((SELECT total_days FROM current_stats) * 0.6 - (SELECT symptom_entry_days FROM current_stats), 0) || 
            ' 天可達標'
        ELSE '✅ 已達標'
    END AS 達成目標;

-- ============================================================================
-- 7. 實用 SQL：生成補記清單（可直接複製使用）
-- ============================================================================
WITH missing_dates AS (
    SELECT d::DATE AS missing_date
    FROM generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day'::interval) AS d
    WHERE d::DATE NOT IN (
        SELECT DISTINCT recorded_date
        FROM daily_symptom_entries
        WHERE user_id = (SELECT id FROM diet_daily_users WHERE email = 'kogil0231@gmail.com' LIMIT 1)
        AND recorded_date >= CURRENT_DATE - INTERVAL '30 days'
    )
)
SELECT 
    '=== 補記清單（最近 7 天優先） ===' AS section,
    missing_date AS 日期,
    TO_CHAR(missing_date, 'YYYY-MM-DD') AS 日期格式,
    TO_CHAR(missing_date, 'Day') AS 星期,
    CASE 
        WHEN missing_date >= CURRENT_DATE - INTERVAL '7 days' THEN '高優先級'
        WHEN missing_date >= CURRENT_DATE - INTERVAL '14 days' THEN '中優先級'
        ELSE '低優先級'
    END AS 優先級
FROM missing_dates
ORDER BY missing_date DESC
LIMIT 10;

