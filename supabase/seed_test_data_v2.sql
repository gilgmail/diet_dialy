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

-- 確保 diet_daily_users 也存在對應用戶
INSERT INTO diet_daily_users (
  id,
  email,
  google_id,
  name,
  avatar_url,
  medical_conditions,
  allergies,
  dietary_restrictions,
  medications,
  timezone,
  language,
  preferences,
  is_admin,
  admin_permissions,
  created_at,
  updated_at
) VALUES (
  '153d4a58-8406-4304-b5b1-1fd9ee433aa6',
  'qa_v2@dietdaily.test',
  NULL,
  'QA Seed User',
  NULL,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Asia/Taipei',
  'zh-TW',
  '{}'::jsonb,
  FALSE,
  '{}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = NOW();

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
) VALUES (
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
)
ON CONFLICT (food_id) DO UPDATE SET
  reason = EXCLUDED.reason,
  priority = EXCLUDED.priority,
  status = EXCLUDED.status,
  attempts = EXCLUDED.attempts,
  failure_reason = EXCLUDED.failure_reason,
  scheduled_for = EXCLUDED.scheduled_for,
  target_version = EXCLUDED.target_version,
  metadata = EXCLUDED.metadata,
  last_requested_at = EXCLUDED.last_requested_at,
  completed_at = EXCLUDED.completed_at,
  updated_at = NOW();

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
) VALUES (
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
)
ON CONFLICT (food_id) DO UPDATE SET
  reason = EXCLUDED.reason,
  priority = EXCLUDED.priority,
  status = EXCLUDED.status,
  attempts = EXCLUDED.attempts,
  failure_reason = EXCLUDED.failure_reason,
  scheduled_for = EXCLUDED.scheduled_for,
  target_version = EXCLUDED.target_version,
  metadata = EXCLUDED.metadata,
  last_requested_at = EXCLUDED.last_requested_at,
  completed_at = EXCLUDED.completed_at,
  updated_at = NOW();

-- ============================================================
-- 3.5 Phase A - 健康資料與提醒測試樣本
-- ============================================================

DELETE FROM reminder_logs
WHERE reminder_id IN (
  SELECT id FROM user_reminders
  WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
);

DELETE FROM user_reminders
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
   OR metadata->>'seed_v2' = 'true';

DELETE FROM healthkit_sleep_samples
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6';

DELETE FROM healthkit_workouts
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6';

DELETE FROM health_data_sources
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6';

DELETE FROM sleep_sessions
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6';

DELETE FROM activity_sessions
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6';

DELETE FROM daily_wellness_log
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6';

DELETE FROM medication_administrations
WHERE regimen_id IN (
  SELECT id FROM medication_regimens
  WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
);

DELETE FROM medication_cycles
WHERE regimen_id IN (
  SELECT id FROM medication_regimens
  WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6'
);

DELETE FROM medication_regimens
WHERE user_id = '153d4a58-8406-4304-b5b1-1fd9ee433aa6';

DELETE FROM medication_catalog
WHERE id IN (
  '91000000-0000-0000-0000-000000000001'
);

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
  '91000000-0000-0000-0000-000000000001',
  'SEED_V2 Budesonide',
  'oral',
  FALSE,
  28,
  '3mg capsule',
  'seed_v2',
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
  '91000000-0000-0000-0000-000000000101',
  '153d4a58-8406-4304-b5b1-1fd9ee433aa6',
  '91000000-0000-0000-0000-000000000001',
  'SEED V2 口服療程',
  'oral',
  'every_n_days',
  1,
  '2024-11-07',
  FALSE,
  '3mg',
  'active',
  'seed_v2 regimen',
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
  '91000000-0000-0000-0000-000000000301',
  '91000000-0000-0000-0000-000000000101',
  1,
  '2024-11-07',
  '2024-12-05',
  NULL,
  'seed_v2 cycle',
  'scheduled',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
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
  '91000000-0000-0000-0000-000000000201',
  '91000000-0000-0000-0000-000000000101',
  '2024-11-09 08:00:00+00',
  '2024-11-09 08:05:00+00',
  '3mg',
  'oral',
  FALSE,
  NULL,
  'taken',
  'manual',
  jsonb_build_object('test_seed', true),
  jsonb_build_array(),
  jsonb_build_object('notes', '早餐後服用', 'test_seed', true),
  'Seed V2 oral log',
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
  '153d4a58-8406-4304-b5b1-1fd9ee433aa6',
  '2024-11-09',
  '2024-11-09 07:30:00+00',
  5,
  4,
  3,
  45,
  'v2 daily summary',
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
  '91000000-0000-0000-0000-000000000501',
  '153d4a58-8406-4304-b5b1-1fd9ee433aa6',
  'manual',
  NULL,
  '2024-11-08 23:00:00+00',
  '2024-11-09 06:00:00+00',
  420,
  '22:45:00',
  450,
  TRUE,
  5,
  'ios_manual',
  jsonb_build_object('seed_v2', true),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time;

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
  '91000000-0000-0000-0000-000000000601',
  '153d4a58-8406-4304-b5b1-1fd9ee433aa6',
  'ride',
  'v2 cycling',
  'high',
  '2024-11-09 17:00:00+00',
  '2024-11-09 17:45:00+00',
  45,
  320,
  NULL,
  'manual',
  'ios_manual',
  '下班後騎車',
  jsonb_build_object('seed_v2', true),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  duration_minutes = EXCLUDED.duration_minutes,
  notes = EXCLUDED.notes;

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
  '91000000-0000-0000-0000-000000000701',
  '153d4a58-8406-4304-b5b1-1fd9ee433aa6',
  'meal_logs',
  NULL,
  'food',
  'V2 早餐提醒',
  'cron',
  NULL,
  '07:00:00',
  '08:00:00',
  'Asia/Taipei',
  10,
  10,
  'existing_entry',
  jsonb_build_object('cron', '0 7 * * *', 'seed_v2', true),
  'active',
  TRUE,
  NOW(),
  NOW()
),
(
  '91000000-0000-0000-0000-000000000702',
  '153d4a58-8406-4304-b5b1-1fd9ee433aa6',
  'medication_regimen',
  '91000000-0000-0000-0000-000000000101',
  'medication',
  'V2 口服提醒',
  'every_n_days',
  1,
  '08:00:00',
  '09:00:00',
  'Asia/Taipei',
  30,
  5,
  'manual_only',
  jsonb_build_object('seed_v2', true),
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
  '91000000-0000-0000-0000-000000000801',
  '91000000-0000-0000-0000-000000000701',
  'tapped',
  '2024-11-09 07:05:00+00',
  '2024-11-09 07:15:00+00',
  jsonb_build_object('seed_v2', true, 'auto_dismiss', true),
  NOW()
),
(
  '91000000-0000-0000-0000-000000000802',
  '91000000-0000-0000-0000-000000000702',
  'sent',
  '2024-11-09 07:55:00+00',
  NULL,
  jsonb_build_object('seed_v2', true),
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
  '91000000-0000-0000-0000-000000000901',
  '153d4a58-8406-4304-b5b1-1fd9ee433aa6',
  'google_fit',
  ARRAY['sleep', 'workout'],
  'syncing',
  NOW() - INTERVAL '2 hours',
  jsonb_build_object('page', 'seed_v2'),
  jsonb_build_object('seed_v2', true),
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
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
  '91000000-0000-0000-0000-000000001001',
  '153d4a58-8406-4304-b5b1-1fd9ee433aa6',
  'HKSampleV2-001',
  jsonb_build_object('summary', 'Seed V2 HK sleep', 'seed_v2', true),
  TRUE,
  '91000000-0000-0000-0000-000000000501',
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
  '91000000-0000-0000-0000-000000001101',
  '153d4a58-8406-4304-b5b1-1fd9ee433aa6',
  'HKWorkoutV2-001',
  jsonb_build_object('summary', 'Seed V2 workout', 'seed_v2', true),
  TRUE,
  '91000000-0000-0000-0000-000000000601',
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  payload = EXCLUDED.payload,
  activity_session_id = EXCLUDED.activity_session_id;

COMMIT;
