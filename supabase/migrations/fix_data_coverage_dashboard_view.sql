-- 修正 data_coverage_dashboard 視圖
-- 問題：視圖缺少 GROUP BY，導致某些使用者無法顯示

-- 刪除舊視圖
DROP VIEW IF EXISTS data_coverage_dashboard;

-- 重新建立視圖（修正版）
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

-- 重新授權
GRANT SELECT ON data_coverage_dashboard TO authenticated;

-- 註解
COMMENT ON VIEW data_coverage_dashboard IS '資料充足度儀表，顯示過去 30 天各類資料的覆蓋率（修正版：包含所有使用者）';

-- 驗證：檢查 kogil0231@gmail.com 是否現在可以查詢到
SELECT 
    '驗證查詢' AS check_type,
    COUNT(*) AS total_users,
    COUNT(CASE WHEN email = 'kogil0231@gmail.com' THEN 1 END) AS kogil0231_found
FROM data_coverage_dashboard;

-- 詳細驗證：列出所有使用者
SELECT 
    '所有使用者列表' AS check_type,
    user_id,
    email,
    name,
    symptom_coverage_percent,
    overall_data_status
FROM data_coverage_dashboard
ORDER BY email;

