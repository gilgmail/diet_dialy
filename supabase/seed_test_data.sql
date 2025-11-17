-- ============================================================
-- 測試用偽資料 - Food Analysis Cache & Refresh Queue
-- ============================================================
-- 用途: 測試 Weekly AI Analysis + Food Knowledge Cache 功能
-- 使用: psql "$DATABASE_URL" -f supabase/seed_test_data.sql
-- ============================================================

-- 清理現有測試資料
DELETE FROM food_analysis_refresh_queue WHERE metadata->>'test_data' = 'true';
DELETE FROM food_analysis_cache WHERE metadata->>'test_data' = 'true';
DELETE FROM diet_daily_foods WHERE name LIKE 'TEST_%';

-- 建立測試用戶 (供 Phase A 相關資料使用)
INSERT INTO diet_daily_users (
    id,
    email,
    google_id,
    name,
    avatar_url,
    is_admin,
    created_at,
    updated_at,
    medical_conditions,
    allergies,
    dietary_restrictions,
    medications,
    timezone,
    language,
    preferences,
    admin_permissions
)
VALUES (
    '00000000-1111-2222-3333-444444444444',
    'seed_user@dietdaily.test',
    NULL,
    'Seed QA User',
    NULL,
    FALSE,
    NOW(),
    NOW(),
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    'UTC',
    'zh-TW',
    '{}'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 1. 測試食物資料
-- ============================================================

-- 插入測試食物
INSERT INTO diet_daily_foods (id, name, category, description, created_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'TEST_白飯', '主食', '測試用白飯', NOW()),
    ('22222222-2222-2222-2222-222222222222', 'TEST_雞胸肉', '蛋白質', '測試用雞胸肉', NOW()),
    ('33333333-3333-3333-3333-333333333333', 'TEST_青花菜', '蔬菜', '測試用青花菜', NOW()),
    ('44444444-4444-4444-4444-444444444444', 'TEST_香蕉', '水果', '測試用香蕉', NOW()),
    ('55555555-5555-5555-5555-555555555555', 'TEST_牛奶', '乳製品', '測試用牛奶', NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. Food Analysis Cache - 不同狀態的快取資料
-- ============================================================

-- 正常的快取 (7天內)
INSERT INTO food_analysis_cache (
    food_id,
    food_name,
    analysis_version,
    analysis_data,
    nutritional_info,
    ibd_risk_level,
    fodmap_category,
    confidence_score,
    analyzed_at,
    expires_at,
    metadata,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'TEST_白飯',
    'v1.0',
    jsonb_build_object(
        'description', '白飯是主要碳水化合物來源',
        'benefits', jsonb_build_array('提供能量', '易消化'),
        'concerns', jsonb_build_array('高GI值'),
        'ibd_considerations', jsonb_build_object(
            'risk_level', 'low',
            'recommendations', '適量食用，建議搭配蛋白質'
        )
    ),
    jsonb_build_object(
        'calories', 130,
        'protein', 2.7,
        'carbs', 28,
        'fat', 0.3,
        'fiber', 0.4
    ),
    'low',
    'low',
    0.95,
    NOW() - INTERVAL '2 days',
    NOW() + INTERVAL '28 days',
    jsonb_build_object('test_data', true, 'source', 'seed_script'),
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
);

-- 過期的快取 (超過 30 天)
INSERT INTO food_analysis_cache (
    food_id,
    food_name,
    analysis_version,
    analysis_data,
    nutritional_info,
    ibd_risk_level,
    fodmap_category,
    confidence_score,
    analyzed_at,
    expires_at,
    metadata,
    created_at,
    updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    'TEST_雞胸肉',
    'v0.9',
    jsonb_build_object(
        'description', '低脂高蛋白質來源',
        'benefits', jsonb_build_array('優質蛋白質', '低脂肪'),
        'concerns', jsonb_build_array('需充分煮熟'),
        'ibd_considerations', jsonb_build_object(
            'risk_level', 'low',
            'recommendations', '建議蒸煮或水煮'
        )
    ),
    jsonb_build_object(
        'calories', 165,
        'protein', 31,
        'carbs', 0,
        'fat', 3.6,
        'fiber', 0
    ),
    'low',
    'low',
    0.88,
    NOW() - INTERVAL '35 days',  -- 過期
    NOW() - INTERVAL '5 days',   -- 已經過期 5 天
    jsonb_build_object('test_data', true, 'source', 'seed_script', 'stale', true),
    NOW() - INTERVAL '35 days',
    NOW() - INTERVAL '35 days'
);

-- 即將過期的快取 (25 天前分析)
INSERT INTO food_analysis_cache (
    food_id,
    food_name,
    analysis_version,
    analysis_data,
    nutritional_info,
    ibd_risk_level,
    fodmap_category,
    confidence_score,
    analyzed_at,
    expires_at,
    metadata,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    'TEST_青花菜',
    'v1.0',
    jsonb_build_object(
        'description', '十字花科蔬菜，富含維生素C',
        'benefits', jsonb_build_array('高纖維', '抗氧化'),
        'concerns', jsonb_build_array('可能引起脹氣'),
        'ibd_considerations', jsonb_build_object(
            'risk_level', 'medium',
            'recommendations', '建議煮熟食用，避免生食'
        )
    ),
    jsonb_build_object(
        'calories', 55,
        'protein', 3.7,
        'carbs', 11,
        'fat', 0.6,
        'fiber', 3.8
    ),
    'medium',
    'moderate',
    0.92,
    NOW() - INTERVAL '25 days',
    NOW() + INTERVAL '5 days',  -- 快過期
    jsonb_build_object('test_data', true, 'source', 'seed_script', 'near_expiry', true),
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days'
);

-- 缺失快取的食物 (TEST_香蕉 和 TEST_牛奶 沒有快取)

-- ============================================================
-- 3. Food Analysis Refresh Queue - 測試佇列項目
-- ============================================================

-- Pending 狀態 - 等待處理
INSERT INTO food_analysis_refresh_queue (
    id,
    food_id,
    requested_by,
    reason,
    priority,
    status,
    attempts,
    scheduled_for,
    target_version,
    metadata,
    created_at,
    updated_at
) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '44444444-4444-4444-4444-444444444444',  -- TEST_香蕉
    NULL,
    'missing_cache',
    8,  -- 高優先級
    'pending',
    0,
    NOW(),
    'v1.0',
    jsonb_build_object(
        'test_data', true,
        'detected_by', 'weekly_analysis',
        'user_requested', false
    ),
    NOW(),
    NOW()
);

-- Pending 狀態 - 過期快取需刷新
INSERT INTO food_analysis_refresh_queue (
    id,
    food_id,
    requested_by,
    reason,
    priority,
    status,
    attempts,
    scheduled_for,
    target_version,
    metadata,
    created_at,
    updated_at
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',  -- TEST_雞胸肉 (過期)
    NULL,
    'stale_cache',
    6,
    'pending',
    0,
    NOW() + INTERVAL '1 hour',
    'v1.0',
    jsonb_build_object(
        'test_data', true,
        'detected_by', 'weekly_analysis',
        'stale_since', NOW() - INTERVAL '5 days'
    ),
    NOW(),
    NOW()
);

-- In Progress 狀態 - 正在處理
INSERT INTO food_analysis_refresh_queue (
    id,
    food_id,
    requested_by,
    reason,
    priority,
    status,
    attempts,
    scheduled_for,
    target_version,
    metadata,
    created_at,
    updated_at
) VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '55555555-5555-5555-5555-555555555555',  -- TEST_牛奶
    NULL,
    'missing_cache',
    7,
    'in_progress',
    1,
    NOW() - INTERVAL '5 minutes',
    'v1.0',
    jsonb_build_object(
        'test_data', true,
        'started_at', NOW() - INTERVAL '5 minutes',
        'worker_id', 'test_worker_1'
    ),
    NOW() - INTERVAL '10 minutes',
    NOW() - INTERVAL '5 minutes'
);

-- Completed 狀態 - 已完成
INSERT INTO food_analysis_refresh_queue (
    id,
    food_id,
    requested_by,
    reason,
    priority,
    status,
    attempts,
    scheduled_for,
    completed_at,
    target_version,
    metadata,
    created_at,
    updated_at
) VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',  -- TEST_白飯
    NULL,
    'routine_refresh',
    5,
    'completed',
    1,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days',
    'v1.0',
    jsonb_build_object(
        'test_data', true,
        'completed_successfully', true
    ),
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
);

-- ============================================================
-- 4. Phase A - 健康資料與提醒測試樣本
-- ============================================================

-- 假設測試用戶: 00000000-1111-2222-3333-444444444444
DELETE FROM reminder_logs
WHERE reminder_id IN (
    SELECT id FROM user_reminders
    WHERE user_id = '00000000-1111-2222-3333-444444444444'
);

DELETE FROM user_reminders
WHERE user_id = '00000000-1111-2222-3333-444444444444'
   OR metadata->>'test_seed' = 'true';

DELETE FROM healthkit_sleep_samples
WHERE user_id = '00000000-1111-2222-3333-444444444444';

DELETE FROM healthkit_workouts
WHERE user_id = '00000000-1111-2222-3333-444444444444';

DELETE FROM health_data_sources
WHERE user_id = '00000000-1111-2222-3333-444444444444';

DELETE FROM sleep_sessions
WHERE user_id = '00000000-1111-2222-3333-444444444444';

DELETE FROM activity_sessions
WHERE user_id = '00000000-1111-2222-3333-444444444444';

DELETE FROM daily_wellness_log
WHERE user_id = '00000000-1111-2222-3333-444444444444';

DELETE FROM medication_administrations
WHERE regimen_id IN (
    SELECT id FROM medication_regimens
    WHERE user_id = '00000000-1111-2222-3333-444444444444'
);

DELETE FROM medication_cycles
WHERE regimen_id IN (
    SELECT id FROM medication_regimens
    WHERE user_id = '00000000-1111-2222-3333-444444444444'
);

DELETE FROM medication_regimens
WHERE user_id = '00000000-1111-2222-3333-444444444444';

DELETE FROM medication_catalog
WHERE name LIKE 'SEED_%';

INSERT INTO medication_catalog (
    id,
    name,
    route,
    is_injection,
    default_interval_days,
    default_dosage,
    notes,
    created_at,
    updated_at
) VALUES (
    '90000000-0000-0000-0000-000000000001',
    'SEED_Ustekinumab',
    'injection',
    TRUE,
    56,
    '90mg / injection',
    'seed_data',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    notes = EXCLUDED.notes,
    updated_at = NOW();

INSERT INTO medication_regimens (
    id,
    user_id,
    medication_id,
    custom_name,
    route,
    frequency_type,
    interval_days,
    cycle_anchor_date,
    symptom_trigger_allowed,
    default_dose,
    status,
    notes,
    created_at,
    updated_at
) VALUES (
    '90000000-0000-0000-0000-000000000101',
    '00000000-1111-2222-3333-444444444444',
    '90000000-0000-0000-0000-000000000001',
    'SEED 每 56 天針劑',
    'injection',
    'every_n_days',
    56,
    '2024-09-01',
    TRUE,
    '90mg',
    'active',
    'seed_data_regimen',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = NOW();

INSERT INTO medication_cycles (
    id,
    regimen_id,
    cycle_number,
    cycle_start_date,
    expected_next_date,
    actual_next_date,
    provider_notes,
    status,
    created_at,
    updated_at
) VALUES (
    '90000000-0000-0000-0000-000000000301',
    '90000000-0000-0000-0000-000000000101',
    3,
    '2024-11-01',
    '2024-12-27',
    NULL,
    'seed cycle tracking',
    'scheduled',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    cycle_start_date = EXCLUDED.cycle_start_date,
    expected_next_date = EXCLUDED.expected_next_date,
    updated_at = NOW();

INSERT INTO medication_administrations (
    id,
    regimen_id,
    scheduled_at,
    taken_at,
    dose,
    route,
    symptom_triggered,
    symptom_notes,
    adherence_status,
    captured_via,
    vitals_snapshot,
    side_effects,
    detail_payload,
    notes,
    created_at
) VALUES (
    '90000000-0000-0000-0000-000000000201',
    '90000000-0000-0000-0000-000000000101',
    '2024-11-01 09:00:00+00',
    '2024-11-01 09:30:00+00',
    '90mg',
    'injection',
    FALSE,
    NULL,
    'taken',
    'manual',
    jsonb_build_object('blood_pressure', '118/76', 'test_data', true),
    jsonb_build_array(jsonb_build_object('type', 'mild_pain', 'score', 2)),
    jsonb_build_object('injection_site', 'left_arm', 'test_data', true),
    'Seed injection log',
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    taken_at = EXCLUDED.taken_at,
    detail_payload = EXCLUDED.detail_payload;

INSERT INTO daily_wellness_log (
    user_id,
    log_date,
    breakfast_time,
    sleep_quality_score,
    energy_level,
    mood_score,
    activity_minutes,
    notes,
    captured_via,
    created_at,
    updated_at
) VALUES (
    '00000000-1111-2222-3333-444444444444',
    '2024-11-09',
    '2024-11-09 07:45:00+00',
    4,
    3,
    4,
    30,
    'Seed wellness summary',
    'manual',
    NOW(),
    NOW()
) ON CONFLICT (user_id, log_date) DO UPDATE SET
    breakfast_time = EXCLUDED.breakfast_time,
    sleep_quality_score = EXCLUDED.sleep_quality_score,
    activity_minutes = EXCLUDED.activity_minutes,
    notes = EXCLUDED.notes,
    updated_at = NOW();

INSERT INTO sleep_sessions (
    id,
    user_id,
    source,
    source_record_id,
    start_time,
    end_time,
    duration_minutes,
    planned_start_time,
    planned_duration_minutes,
    is_main_sleep,
    quality_score,
    capture_method,
    detail_payload,
    created_at
) VALUES (
    '90000000-0000-0000-0000-000000000501',
    '00000000-1111-2222-3333-444444444444',
    'manual',
    NULL,
    '2024-11-08 22:30:00+00',
    '2024-11-09 06:30:00+00',
    480,
    '22:30:00',
    480,
    TRUE,
    4,
    'ios_manual',
    jsonb_build_object('test_data', true, 'notes', '預計 vs 實際吻合'),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    duration_minutes = EXCLUDED.duration_minutes;

INSERT INTO activity_sessions (
    id,
    user_id,
    activity_type,
    activity_title,
    intensity,
    start_time,
    end_time,
    duration_minutes,
    calories,
    steps,
    source,
    capture_method,
    notes,
    detail_payload,
    created_at
) VALUES (
    '90000000-0000-0000-0000-000000000601',
    '00000000-1111-2222-3333-444444444444',
    'walk',
    'Seed 30min walk',
    'moderate',
    '2024-11-09 07:30:00+00',
    '2024-11-09 08:00:00+00',
    30,
    120,
    3200,
    'manual',
    'ios_manual',
    '早餐前散步',
    jsonb_build_object('test_data', true),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    duration_minutes = EXCLUDED.duration_minutes,
    notes = EXCLUDED.notes,
    detail_payload = EXCLUDED.detail_payload;

INSERT INTO user_reminders (
    id,
    user_id,
    target_type,
    target_id,
    reminder_category,
    title,
    schedule_type,
    interval_days,
    window_start,
    window_end,
    timezone,
    lead_time_minutes,
    snooze_minutes,
    auto_dismiss_rule,
    metadata,
    status,
    ios_visible,
    created_at,
    updated_at
) VALUES
(
    '90000000-0000-0000-0000-000000000701',
    '00000000-1111-2222-3333-444444444444',
    'meal_logs',
    NULL,
    'food',
    'Seed 早餐提醒',
    'cron',
    NULL,
    '07:30:00',
    '08:30:00',
    'Asia/Taipei',
    15,
    10,
    'existing_entry',
    jsonb_build_object('cron', '0 7 * * *', 'test_seed', true),
    'active',
    TRUE,
    NOW(),
    NOW()
),
(
    '90000000-0000-0000-0000-000000000702',
    '00000000-1111-2222-3333-444444444444',
    'medication_regimen',
    '90000000-0000-0000-0000-000000000101',
    'medication',
    'Seed 56天針劑提醒',
    'relative_cycle',
    56,
    '09:00:00',
    '12:00:00',
    'Asia/Taipei',
    1440,
    60,
    'manual_only',
    jsonb_build_object('days_before', 3, 'test_seed', true),
    'active',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

INSERT INTO reminder_logs (
    id,
    reminder_id,
    status,
    deliver_at,
    handled_at,
    context,
    created_at
) VALUES
(
    '90000000-0000-0000-0000-000000000801',
    '90000000-0000-0000-0000-000000000701',
    'delivered',
    '2024-11-09 07:35:00+00',
    '2024-11-09 07:50:00+00',
    jsonb_build_object('test_seed', true, 'auto_dismiss', true),
    NOW()
),
(
    '90000000-0000-0000-0000-000000000802',
    '90000000-0000-0000-0000-000000000702',
    'sent',
    '2024-11-01 08:00:00+00',
    NULL,
    jsonb_build_object('test_seed', true),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    handled_at = EXCLUDED.handled_at,
    context = EXCLUDED.context;

INSERT INTO health_data_sources (
    id,
    user_id,
    provider,
    scopes,
    status,
    last_synced_at,
    sync_cursor,
    error_payload,
    created_at,
    updated_at
) VALUES (
    '90000000-0000-0000-0000-000000000901',
    '00000000-1111-2222-3333-444444444444',
    'apple_healthkit',
    ARRAY['sleep', 'workout'],
    'connected',
    NOW() - INTERVAL '1 day',
    jsonb_build_object('last_anchor', 'seed_001'),
    jsonb_build_object('test_seed', true),
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    last_synced_at = EXCLUDED.last_synced_at,
    sync_cursor = EXCLUDED.sync_cursor,
    updated_at = NOW();

INSERT INTO healthkit_sleep_samples (
    id,
    user_id,
    source_id,
    payload,
    parsed,
    sleep_session_id,
    created_at
) VALUES (
    '90000000-0000-0000-0000-000000001001',
    '00000000-1111-2222-3333-444444444444',
    'HKSampleSeed001',
    jsonb_build_object('summary', 'Sample HK sleep', 'test_seed', true),
    TRUE,
    '90000000-0000-0000-0000-000000000501',
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    payload = EXCLUDED.payload,
    sleep_session_id = EXCLUDED.sleep_session_id;

INSERT INTO healthkit_workouts (
    id,
    user_id,
    source_id,
    payload,
    parsed,
    activity_session_id,
    created_at
) VALUES (
    '90000000-0000-0000-0000-000000001101',
    '00000000-1111-2222-3333-444444444444',
    'HKWorkoutSeed001',
    jsonb_build_object('summary', 'Sample HK workout', 'test_seed', true),
    TRUE,
    '90000000-0000-0000-0000-000000000601',
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    payload = EXCLUDED.payload,
    activity_session_id = EXCLUDED.activity_session_id;

-- ============================================================
-- 5. 驗證資料
-- ============================================================

-- 顯示測試食物
SELECT '=== 測試食物 ===' AS section;
SELECT id, name, category FROM diet_daily_foods WHERE name LIKE 'TEST_%';

-- 顯示快取狀態
SELECT '=== Food Analysis Cache ===' AS section;
SELECT
    food_name,
    analysis_version,
    ibd_risk_level,
    CASE
        WHEN expires_at < NOW() THEN '❌ 已過期'
        WHEN expires_at < NOW() + INTERVAL '7 days' THEN '⚠️ 即將過期'
        ELSE '✅ 正常'
    END AS cache_status,
    ROUND(EXTRACT(EPOCH FROM (NOW() - analyzed_at)) / 86400) AS days_old,
    ROUND(EXTRACT(EPOCH FROM (expires_at - NOW())) / 86400) AS days_until_expiry
FROM food_analysis_cache
WHERE metadata->>'test_data' = 'true'
ORDER BY analyzed_at DESC;

-- 顯示刷新佇列
SELECT '=== Refresh Queue ===' AS section;
SELECT
    f.name AS food_name,
    q.reason,
    q.priority,
    q.status,
    q.attempts,
    CASE
        WHEN q.scheduled_for > NOW() THEN '⏰ 排程中'
        WHEN q.status = 'pending' THEN '⏳ 待處理'
        WHEN q.status = 'in_progress' THEN '🔄 處理中'
        WHEN q.status = 'completed' THEN '✅ 完成'
        ELSE '❌ 失敗'
    END AS queue_status
FROM food_analysis_refresh_queue q
JOIN diet_daily_foods f ON q.food_id = f.id
WHERE q.metadata->>'test_data' = 'true'
ORDER BY q.priority DESC, q.scheduled_for;

-- 顯示摘要
SELECT '=== 測試資料摘要 ===' AS section;
SELECT
    (SELECT COUNT(*) FROM diet_daily_foods WHERE name LIKE 'TEST_%') AS test_foods,
    (SELECT COUNT(*) FROM food_analysis_cache WHERE metadata->>'test_data' = 'true') AS cached_analyses,
    (SELECT COUNT(*) FROM food_analysis_cache WHERE metadata->>'test_data' = 'true' AND expires_at < NOW()) AS expired_caches,
    (SELECT COUNT(*) FROM food_analysis_refresh_queue WHERE metadata->>'test_data' = 'true') AS queue_items,
    (SELECT COUNT(*) FROM food_analysis_refresh_queue WHERE metadata->>'test_data' = 'true' AND status = 'pending') AS pending_items;
