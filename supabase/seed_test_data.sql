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
-- 4. 驗證資料
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
