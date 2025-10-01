-- Adds AI 補充營養評估欄位到 diet_daily_foods 表
ALTER TABLE diet_daily_foods
ADD COLUMN IF NOT EXISTS ai_nutrient_gaps JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN diet_daily_foods.ai_nutrient_gaps IS 'AI 針對營養缺口與補充建議的結構化結果';
