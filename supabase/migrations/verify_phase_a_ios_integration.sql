-- Phase A iOS App 整合驗證腳本
-- 驗證 API 端點和資料庫功能是否正常運作

-- ============================================================================
-- 1. 驗證 API 端點所需的資料庫功能
-- ============================================================================

-- 檢查 data_coverage_dashboard 視圖
SELECT 
    '=== data_coverage_dashboard 視圖檢查 ===' AS check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = 'data_coverage_dashboard'
        ) THEN '✅ 視圖存在'
        ELSE '❌ 視圖不存在'
    END AS view_status,
    COUNT(*) AS user_count
FROM data_coverage_dashboard;

-- 檢查 get_user_missing_data_alerts 函數
SELECT 
    '=== get_user_missing_data_alerts 函數檢查 ===' AS check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name = 'get_user_missing_data_alerts'
        ) THEN '✅ 函數存在'
        ELSE '❌ 函數不存在'
    END AS function_status;

-- ============================================================================
-- 2. 測試 API 端點功能（使用 kogil0231@gmail.com）
-- ============================================================================

-- 測試資料覆蓋率查詢
SELECT 
    '=== 測試資料覆蓋率查詢 ===' AS test_type,
    user_id,
    email,
    symptom_coverage_percent,
    food_coverage_percent,
    medication_coverage_percent,
    sleep_coverage_percent,
    exercise_coverage_percent,
    overall_data_status,
    missing_categories
FROM data_coverage_dashboard
WHERE email = 'kogil0231@gmail.com';

-- 測試缺漏提醒函數
SELECT 
    '=== 測試缺漏提醒函數 ===' AS test_type,
    category,
    missing_days,
    last_entry_date,
    recommendation
FROM get_user_missing_data_alerts(
    (SELECT id FROM diet_daily_users WHERE email = 'kogil0231@gmail.com' LIMIT 1),
    2
);

-- ============================================================================
-- 3. 驗證資料同步機制
-- ============================================================================

-- 檢查觸發器是否存在
SELECT 
    '=== 觸發器檢查 ===' AS check_type,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
    'trigger_sync_medications_to_symptom',
    'trigger_sync_sleep_to_symptom',
    'trigger_sync_activity_to_symptom'
)
ORDER BY trigger_name;

-- ============================================================================
-- 4. 驗證欄位存在
-- ============================================================================

SELECT 
    '=== daily_symptom_entries 欄位檢查 ===' AS check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'daily_symptom_entries'
AND column_name IN (
    'sleep_duration_minutes',
    'exercise_duration_minutes',
    'exercise_intensity'
)
ORDER BY column_name;

-- ============================================================================
-- 5. 整合測試：模擬 iOS app 查詢流程
-- ============================================================================

-- 模擬 GET /api/mobile/data-coverage?userId=xxx
DO $$
DECLARE
    v_user_id UUID;
    v_coverage RECORD;
    v_alerts RECORD[];
BEGIN
    -- 取得測試使用者
    SELECT id INTO v_user_id
    FROM diet_daily_users
    WHERE email = 'kogil0231@gmail.com'
    LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE '⚠️  找不到 kogil0231@gmail.com，跳過測試';
        RETURN;
    END IF;
    
    -- 測試資料覆蓋率查詢
    SELECT * INTO v_coverage
    FROM data_coverage_dashboard
    WHERE user_id = v_user_id;
    
    IF v_coverage IS NOT NULL THEN
        RAISE NOTICE '✅ 資料覆蓋率查詢成功';
        RAISE NOTICE '   症狀覆蓋率: %', v_coverage.symptom_coverage_percent;
        RAISE NOTICE '   整體狀態: %', v_coverage.overall_data_status;
    ELSE
        RAISE NOTICE '❌ 資料覆蓋率查詢失敗';
    END IF;
    
    -- 測試缺漏提醒
    SELECT ARRAY_AGG(ROW(category, missing_days, recommendation)::text) INTO v_alerts
    FROM get_user_missing_data_alerts(v_user_id, 2);
    
    IF v_alerts IS NOT NULL AND array_length(v_alerts, 1) > 0 THEN
        RAISE NOTICE '✅ 缺漏提醒查詢成功，共 % 項', array_length(v_alerts, 1);
    ELSE
        RAISE NOTICE '✅ 缺漏提醒查詢成功（無缺漏項目）';
    END IF;
END $$;

-- ============================================================================
-- 6. 驗證總結
-- ============================================================================

SELECT 
    '=== 驗證總結 ===' AS summary,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'data_coverage_dashboard') AS has_coverage_view,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'get_user_missing_data_alerts') AS has_alerts_function,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name LIKE 'trigger_sync_%') AS sync_triggers_count,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'daily_symptom_entries' 
     AND column_name IN ('sleep_duration_minutes', 'exercise_duration_minutes', 'exercise_intensity')) AS new_columns_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'data_coverage_dashboard') > 0
         AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'get_user_missing_data_alerts') > 0
         AND (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name LIKE 'trigger_sync_%') >= 3
        THEN '✅ Phase A 資料庫功能完整'
        ELSE '⚠️  部分功能缺失'
    END AS overall_status;

