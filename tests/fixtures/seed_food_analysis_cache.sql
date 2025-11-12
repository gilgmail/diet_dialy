-- Seed fixture for food_analysis_cache tests
-- Inserts sample foods and their cached analyses covering fresh/stale/missing scenarios

INSERT INTO diet_daily_foods (id, name, category, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '奶茶', 'beverage', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', '白飯', 'grains', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', '泡菜', 'fermented', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO food_analysis_cache (
  food_id,
  analysis_version,
  analysis_source,
  nutrition_profile,
  risk_profile,
  supportive_attributes,
  serving_guidelines,
  analysis_payload,
  analysis_tokens,
  refresh_frequency_days,
  analysis_usage_count,
  analysis_updated_at,
  created_at,
  updated_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '2025.11.01',
    'ai',
    '{"calories":120,"carbs":18,"lactose":true}'::jsonb,
    '{"triggers":["乳糖","高糖"],"severity":"high"}'::jsonb,
    '[]'::jsonb,
    '[{"tip":"改用無乳糖奶或豆奶","max_ml":150}]'::jsonb,
    '{"summary":"高糖+乳糖，易誘發腹瀉"}'::jsonb,
    '{"input":1200,"output":450}'::jsonb,
    90,
    5,
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '2025.11.01',
    'ai',
    '{"calories":200,"carbs":44,"fiber":1}'::jsonb,
    '{"triggers":[],"severity":"low"}'::jsonb,
    '[{"benefit":"穩定碳水來源"}]'::jsonb,
    '[{"tip":"搭配低脂蛋白質","portion_g":150}]'::jsonb,
    '{"summary":"低刺激主食，可視為 supportive"}'::jsonb,
    '{"input":900,"output":300}'::jsonb,
    120,
    12,
    NOW() - INTERVAL '95 days',
    NOW() - INTERVAL '95 days',
    NOW() - INTERVAL '95 days'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '2024.08.01',
    'ai',
    '{"calories":40,"sodium":900}'::jsonb,
    '{"triggers":["高鹽","發酵辣椒"],"severity":"moderate"}'::jsonb,
    '[]'::jsonb,
    '[{"tip":"每次 30g 以內","frequency":"週 2 次"}]'::jsonb,
    '{"summary":"高鹽+辣椒，建議觀察"}'::jsonb,
    '{"input":1000,"output":400}'::jsonb,
    60,
    3,
    NOW() - INTERVAL '200 days',
    NOW() - INTERVAL '200 days',
    NOW() - INTERVAL '200 days'
  )
ON CONFLICT (food_id) DO NOTHING;
