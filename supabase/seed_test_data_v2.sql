-- ============================================================
-- 測試用偽資料 v2 - Food Analysis Cache & Refresh Queue
-- ============================================================
-- 用途: 針對新版 food_analysis_cache / food_analysis_refresh_queue
--       快速建立測試資料，方便驗證 Weekly AI Analysis + Queue/Worker
-- 使用: psql "$DATABASE_URL" -f supabase/seed_test_data_v2.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 0. 清理既有測試資料（以 SEED_ 開頭的食物）
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
ON CONFLICT (id) DO NOTHING;

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
