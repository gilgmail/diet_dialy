-- ============================================================
-- 測試用偽資料 V2 - Food Analysis Cache & Refresh Queue
-- ============================================================
-- 用途: 測試 Weekly AI Analysis + Food Knowledge Cache 功能
-- 符合實際的 schema 結構
-- 使用: psql "$DATABASE_URL" -f supabase/seed_test_data_v2.sql
-- ============================================================

-- 清理現有測試資料
DELETE FROM food_analysis_refresh_queue WHERE metadata->>'test_data' = 'true';
DELETE FROM food_analysis_cache WHERE analysis_notes LIKE '%[TEST_DATA]%';
DELETE FROM diet_daily_foods WHERE name LIKE 'TEST_%';

-- ============================================================
-- 1. 測試食物資料
-- ============================================================

INSERT INTO diet_daily_foods (id, name, category, description, created_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'TEST_白飯', '主食', '測試用白飯', NOW()),
    ('22222222-2222-2222-2222-222222222222', 'TEST_雞胸肉', '蛋白質', '測試用雞胸肉', NOW()),
    ('33333333-3333-3333-3333-333333333333', 'TEST_青花菜', '蔬菜', '測試用青花菜', NOW()),
    ('44444444-4444-4444-4444-444444444444', 'TEST_香蕉', '水果', '測試用香蕉', NOW()),
    ('55555555-5555-5555-5555-555555555555', 'TEST_牛奶', '乳製品', '測試用牛奶', NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. Food Analysis Cache - 符合實際 schema
-- ============================================================

-- 正常的快取 (2天前分析，90天有效期)
INSERT INTO food_analysis_cache (
    food_id,
    analysis_version,
    analysis_source,
    nutrition_profile,
    risk_profile,
    supportive_attributes,
    serving_guidelines,
    analysis_payload,
    analysis_notes,
    analysis_tokens,
    refresh_frequency_days,
    analysis_usage_count,
    analysis_updated_at,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',  -- TEST_白飯
    'v1.0',
    'ai',
    jsonb_build_object(
        'calories', 130,
        'protein', 2.7,
        'carbs', 28,
        'fat', 0.3,
        'fiber', 0.4
    ),
    jsonb_build_object(
        'ibd_risk_level', 'low',
        'fodmap_category', 'low',
        'trigger_potential', 'minimal'
    ),
    jsonb_build_array('提供能量', '易消化', '低脂肪'),
    jsonb_build_array(
        jsonb_build_object('serving', '1碗(200g)', 'recommendation', '適量食用')
    ),
    jsonb_build_object(
        'description', '白飯是主要碳水化合物來源',
        'benefits', jsonb_build_array('提供能量', '易消化'),
        'concerns', jsonb_build_array('高GI值'),
        'ibd_considerations', '適量食用，建議搭配蛋白質'
    ),
    '[TEST_DATA] 正常快取測試',
    jsonb_build_object('input_tokens', 100, 'output_tokens', 300),
    90,
    5,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
);

-- 過期的快取 (35天前分析，已超過 30 天閾值)
INSERT INTO food_analysis_cache (
    food_id,
    analysis_version,
    analysis_source,
    nutrition_profile,
    risk_profile,
    supportive_attributes,
    serving_guidelines,
    analysis_payload,
    analysis_notes,
    analysis_tokens,
    refresh_frequency_days,
    analysis_usage_count,
    analysis_updated_at,
    created_at,
    updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',  -- TEST_雞胸肉
    'v0.9',
    'ai',
    jsonb_build_object(
        'calories', 165,
        'protein', 31,
        'carbs', 0,
        'fat', 3.6,
        'fiber', 0
    ),
    jsonb_build_object(
        'ibd_risk_level', 'low',
        'fodmap_category', 'low',
        'trigger_potential', 'minimal'
    ),
    jsonb_build_array('優質蛋白質', '低脂肪', '易消化'),
    jsonb_build_array(
        jsonb_build_object('serving', '100g', 'recommendation', '建議蒸煮或水煮')
    ),
    jsonb_build_object(
        'description', '低脂高蛋白質來源',
        'benefits', jsonb_build_array('優質蛋白質', '低脂肪'),
        'concerns', jsonb_build_array('需充分煮熟'),
        'ibd_considerations', '建議蒸煮或水煮'
    ),
    '[TEST_DATA] 過期快取測試 - 35天前',
    jsonb_build_object('input_tokens', 120, 'output_tokens', 350),
    90,
    12,
    NOW() - INTERVAL '35 days',  -- 過期
    NOW() - INTERVAL '35 days',
    NOW() - INTERVAL '35 days'
);

-- 即將過期的快取 (25天前分析)
INSERT INTO food_analysis_cache (
    food_id,
    analysis_version,
    analysis_source,
    nutrition_profile,
    risk_profile,
    supportive_attributes,
    serving_guidelines,
    analysis_payload,
    analysis_notes,
    analysis_tokens,
    refresh_frequency_days,
    analysis_usage_count,
    analysis_updated_at,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',  -- TEST_青花菜
    'v1.0',
    'ai',
    jsonb_build_object(
        'calories', 55,
        'protein', 3.7,
        'carbs', 11,
        'fat', 0.6,
        'fiber', 3.8
    ),
    jsonb_build_object(
        'ibd_risk_level', 'medium',
        'fodmap_category', 'moderate',
        'trigger_potential', 'moderate'
    ),
    jsonb_build_array('高纖維', '抗氧化', '維生素C豐富'),
    jsonb_build_array(
        jsonb_build_object('serving', '1杯(150g)', 'recommendation', '建議煮熟食用，避免生食')
    ),
    jsonb_build_object(
        'description', '十字花科蔬菜，富含維生素C',
        'benefits', jsonb_build_array('高纖維', '抗氧化'),
        'concerns', jsonb_build_array('可能引起脹氣'),
        'ibd_considerations', '建議煮熟食用，避免生食'
    ),
    '[TEST_DATA] 即將過期快取測試 - 25天前',
    jsonb_build_object('input_tokens', 110, 'output_tokens', 320),
    90,
    8,
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days'
);

-- TEST_香蕉 和 TEST_牛奶 故意不插入快取，作為「缺失快取」測試案例

-- ============================================================
-- 3. Food Analysis Refresh Queue
-- ============================================================

-- Pending 狀態 - 缺失快取 (TEST_香蕉)
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
    8,
    'pending',
    0,
    NOW(),
    'v1.0',
    jsonb_build_object(
        'test_data', true,
        'detected_by', 'weekly_analysis',
        'detection_time', NOW()
    ),
    NOW(),
    NOW()
);

-- Pending 狀態 - 過期快取 (TEST_雞胸肉)
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
    '22222222-2222-2222-2222-222222222222',  -- TEST_雞胸肉
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

-- In Progress 狀態 - 缺失快取 (TEST_牛奶)
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

-- Completed 狀態 - 已完成 (TEST_白飯)
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
-- 4. 驗證資料
-- ============================================================

-- 測試食物
SELECT '=== 測試食物 ===' AS section;
SELECT id, name, category FROM diet_daily_foods WHERE name LIKE 'TEST_%';

-- Food Analysis Cache
SELECT '=== Food Analysis Cache ===' AS section;
SELECT
    f.name AS food_name,
    c.analysis_version,
    c.risk_profile->>'ibd_risk_level' AS risk_level,
    CASE
        WHEN (NOW() - c.analysis_updated_at) > INTERVAL '30 days' THEN '❌ 已過期'
        WHEN (NOW() - c.analysis_updated_at) > INTERVAL '20 days' THEN '⚠️ 即將過期'
        ELSE '✅ 正常'
    END AS cache_status,
    ROUND(EXTRACT(EPOCH FROM (NOW() - c.analysis_updated_at)) / 86400) AS days_old,
    c.analysis_usage_count AS usage_count
FROM food_analysis_cache c
JOIN diet_daily_foods f ON c.food_id = f.id
WHERE c.analysis_notes LIKE '%[TEST_DATA]%'
ORDER BY c.analysis_updated_at DESC;

-- Missing Cache Foods
SELECT '=== Missing Cache Foods ===' AS section;
SELECT
    f.id,
    f.name
FROM diet_daily_foods f
LEFT JOIN food_analysis_cache c ON f.id = c.food_id
WHERE f.name LIKE 'TEST_%'
AND c.id IS NULL;

-- Refresh Queue
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

-- 測試資料摘要
SELECT '=== 測試資料摘要 ===' AS section;
SELECT
    (SELECT COUNT(*) FROM diet_daily_foods WHERE name LIKE 'TEST_%') AS test_foods,
    (SELECT COUNT(*) FROM food_analysis_cache WHERE analysis_notes LIKE '%[TEST_DATA]%') AS cached_analyses,
    (SELECT COUNT(*) FROM food_analysis_cache
     WHERE analysis_notes LIKE '%[TEST_DATA]%'
     AND (NOW() - analysis_updated_at) > INTERVAL '30 days') AS expired_caches,
    (SELECT COUNT(*) FROM food_analysis_refresh_queue WHERE metadata->>'test_data' = 'true') AS queue_items,
    (SELECT COUNT(*) FROM food_analysis_refresh_queue WHERE metadata->>'test_data' = 'true' AND status = 'pending') AS pending_items;

-- 完成訊息
SELECT '✅ 測試資料載入完成！' AS message;
SELECT '測試場景:' AS scenarios;
SELECT '1. TEST_白飯: 正常快取 (2天前分析)' AS scenario_1;
SELECT '2. TEST_雞胸肉: 過期快取 (35天前分析) + pending 刷新' AS scenario_2;
SELECT '3. TEST_青花菜: 即將過期 (25天前分析)' AS scenario_3;
SELECT '4. TEST_香蕉: 缺失快取 + pending 刷新' AS scenario_4;
SELECT '5. TEST_牛奶: 缺失快取 + in_progress 刷新' AS scenario_5;
