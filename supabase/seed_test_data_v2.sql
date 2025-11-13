-- ============================================================
-- 測試用偽資料 v2 - Food Analysis Cache & Refresh Queue
-- ============================================================
-- 用途: 針對新版 food_analysis_cache / food_analysis_refresh_queue
--       快速建立測試資料，方便驗證 Weekly AI Analysis + Queue/Worker
-- 使用: psql "$DATABASE_URL" -f supabase/seed_test_data_v2.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 0. 確認測試用戶 ID
-- ============================================================
-- 注意: 此腳本使用的測試用戶 ID 必須在 auth.users 表中存在
-- 測試用戶 UUID: 153d4a58-8406-4304-b5b1-1fd9ee433aa6
--
-- 如果此用戶 ID 不存在，請執行以下查詢找到一個存在的用戶 ID：
-- SELECT id FROM auth.users LIMIT 1;
--
-- 然後將下方所有 '153d4a58-8406-4304-b5b1-1fd9ee433aa6' 替換為該用戶 ID

-- 檢查用戶是否存在（僅用於驗證，不會中斷執行）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6') THEN
    RAISE NOTICE '⚠️  警告: 測試用戶 153d4a58-8406-4304-b5b1-1fd9ee433aa6 不存在於 auth.users';
    RAISE NOTICE '請先執行: SELECT id FROM auth.users LIMIT 1; 找到有效的用戶 ID';
    RAISE EXCEPTION '測試用戶不存在，請更新腳本中的用戶 ID';
  ELSE
    RAISE NOTICE '✅ 測試用戶已確認存在';
  END IF;
END $$;

-- ============================================================
-- 1. 清理既有測試資料（以 SEED_ 開頭的食物）
-- ============================================================
DELETE FROM food_analysis_refresh_queue
WHERE food_id IN (
  'aaaa1111-2222-3333-4444-555555555501',
  'aaaa1111-2222-3333-4444-555555555502',
  'aaaa1111-2222-3333-4444-555555555503',
  'aaaa1111-2222-3333-4444-555555555504'
);

DELETE FROM food_analysis_cache
WHERE food_id IN (
  'aaaa1111-2222-3333-4444-555555555501',
  'aaaa1111-2222-3333-4444-555555555502',
  'aaaa1111-2222-3333-4444-555555555503',
  'aaaa1111-2222-3333-4444-555555555504'
);

DELETE FROM food_entries
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
  AND food_name LIKE 'SEED_%';

DELETE FROM diet_daily_foods
WHERE name LIKE 'SEED_%';

-- ============================================================
-- 1. 建立測試食物
-- ============================================================
INSERT INTO diet_daily_foods (id, name, category, created_at, updated_at)
VALUES
  ('aaaa1111-2222-3333-4444-555555555501', 'SEED_白飯', 'staple', NOW(), NOW()),
  ('aaaa1111-2222-3333-4444-555555555502', 'SEED_雞胸肉', 'protein', NOW(), NOW()),
  ('aaaa1111-2222-3333-4444-555555555503', 'SEED_青花菜', 'vegetable', NOW(), NOW()),
  ('aaaa1111-2222-3333-4444-555555555504', 'SEED_香蕉', 'fruit', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  updated_at = EXCLUDED.updated_at;

-- ============================================================
-- 2. food_analysis_cache - 不同狀態
-- ============================================================
-- 新鮮資料（2 天前更新）
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
  'aaaa1111-2222-3333-4444-555555555501',
  '2025.11.01',
  'ai',
  jsonb_build_object('calories', 130, 'carbs', 28, 'fiber', 0.4, 'test_data', true),
  jsonb_build_object('severity', 'low', 'triggers', jsonb_build_array()),
  jsonb_build_array(jsonb_build_object('benefit', '穩定碳水來源')),
  jsonb_build_array(jsonb_build_object('tip', '搭配蛋白質', 'portion', '1碗(150g)')),
  jsonb_build_object('summary', '白飯屬於低風險主食。', 'test_seed', true),
  'Auto-generated seed (fresh cache)',
  jsonb_build_object('input', 800, 'output', 300),
  60,
  7,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
);

-- 過期資料（45 天前更新）
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
  'aaaa1111-2222-3333-4444-555555555502',
  '2025.08.15',
  'ai',
  jsonb_build_object('calories', 165, 'protein', 31, 'fat', 3.6, 'test_data', true),
  jsonb_build_object('severity', 'low', 'triggers', jsonb_build_array('高油脂烹調')),
  jsonb_build_array(jsonb_build_object('benefit', '低脂高蛋白')),
  jsonb_build_array(jsonb_build_object('tip', '建議蒸煮', 'frequency', '每日 1 份')),
  jsonb_build_object('summary', '雞胸肉分析已過期，需要刷新。', 'test_seed', true),
  'Auto-generated seed (expired cache)',
  jsonb_build_object('input', 950, 'output', 420),
  30,
  3,
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '45 days'
);

-- 即將過期（25 天前更新）
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
  'aaaa1111-2222-3333-4444-555555555503',
  '2025.09.30',
  'ai',
  jsonb_build_object('calories', 55, 'fiber', 3.8, 'test_data', true),
  jsonb_build_object('severity', 'medium', 'triggers', jsonb_build_array('易脹氣')),
  jsonb_build_array(jsonb_build_object('benefit', '抗氧化'), jsonb_build_object('benefit', '高纖')),
  jsonb_build_array(jsonb_build_object('tip', '建議熱食', 'portion', '半碗')),
  jsonb_build_object('summary', '青花菜資料即將過期，建議列入刷新佇列。', 'test_seed', true),
  'Auto-generated seed (near expiry cache)',
  jsonb_build_object('input', 780, 'output', 350),
  30,
  4,
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '25 days'
);

-- 無快取 (香蕉) -> 透過 queue 測試 missing

-- ============================================================
-- 2.5 建立測試用的 food_entries（給測試用戶）
-- ============================================================
-- 測試用戶: 153d4a58-8406-4304-b5b1-1fd9ee433aa6
-- 測試日期範圍: 2024-11-06 到 2024-11-12
DELETE FROM food_entries
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
  AND consumed_at BETWEEN '2024-11-06' AND '2024-11-13'
  AND food_name LIKE 'SEED_%';

INSERT INTO food_entries (user_id, food_id, food_name, consumed_at, created_at)
VALUES
  -- 2024-11-07 早餐：白飯 + 雞胸肉
  ('153d4a58-8406-4304-b5b1-1fd9ee433aa6', 'aaaa1111-2222-3333-4444-555555555501', 'SEED_白飯', '2024-11-07 07:30:00+00', NOW()),
  ('153d4a58-8406-4304-b5b1-1fd9ee433aa6', 'aaaa1111-2222-3333-4444-555555555502', 'SEED_雞胸肉', '2024-11-07 07:30:00+00', NOW()),

  -- 2024-11-07 午餐：白飯 + 青花菜
  ('153d4a58-8406-4304-b5b1-1fd9ee433aa6', 'aaaa1111-2222-3333-4444-555555555501', 'SEED_白飯', '2024-11-07 12:00:00+00', NOW()),
  ('153d4a58-8406-4304-b5b1-1fd9ee433aa6', 'aaaa1111-2222-3333-4444-555555555503', 'SEED_青花菜', '2024-11-07 12:00:00+00', NOW()),

  -- 2024-11-08 早餐：香蕉 (missing cache test)
  ('153d4a58-8406-4304-b5b1-1fd9ee433aa6', 'aaaa1111-2222-3333-4444-555555555504', 'SEED_香蕉', '2024-11-08 08:00:00+00', NOW()),

  -- 2024-11-09 午餐：白飯 + 雞胸肉 + 青花菜
  ('153d4a58-8406-4304-b5b1-1fd9ee433aa6', 'aaaa1111-2222-3333-4444-555555555501', 'SEED_白飯', '2024-11-09 12:30:00+00', NOW()),
  ('153d4a58-8406-4304-b5b1-1fd9ee433aa6', 'aaaa1111-2222-3333-4444-555555555502', 'SEED_雞胸肉', '2024-11-09 12:30:00+00', NOW()),
  ('153d4a58-8406-4304-b5b1-1fd9ee433aa6', 'aaaa1111-2222-3333-4444-555555555503', 'SEED_青花菜', '2024-11-09 12:30:00+00', NOW()),

  -- 2024-11-10 晚餐：雞胸肉
  ('153d4a58-8406-4304-b5b1-1fd9ee433aa6', 'aaaa1111-2222-3333-4444-555555555502', 'SEED_雞胸肉', '2024-11-10 18:00:00+00', NOW());

-- ============================================================
-- 3. food_analysis_refresh_queue - 建議刷新項目
-- ============================================================
INSERT INTO food_analysis_refresh_queue (
  id,
  food_id,
  requested_by,
  reason,
  priority,
  status,
  attempts,
  failure_reason,
  scheduled_for,
  target_version,
  metadata,
  last_requested_at,
  completed_at,
  created_at,
  updated_at
) VALUES
  (
    '99999999-0000-0000-0000-000000000001',
    'aaaa1111-2222-3333-4444-555555555504', -- 香蕉：missing cache
    NULL,
    'missing',
    9,
    'pending',
    0,
    NULL,
    NOW(),
    '2025.11.01',
    jsonb_build_object('source', 'seed_script', 'test_data', true),
    NOW(),
    NULL,
    NOW(),
    NOW()
  ),
  (
    '99999999-0000-0000-0000-000000000002',
    'aaaa1111-2222-3333-4444-555555555502', -- 雞胸肉：stale cache
    NULL,
    'stale',
    7,
    'pending',
    1,
    NULL,
    NOW() - INTERVAL '1 day',
    '2025.11.01',
    jsonb_build_object('source', 'seed_script', 'test_data', true),
    NOW() - INTERVAL '1 day',
    NULL,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  );

COMMIT;
