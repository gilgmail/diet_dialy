-- 增強版食物資料庫 - IBD個人化評分系統
-- 在 Supabase SQL Editor 中執行此腳本

-- 啟用 UUID 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 增強食物資料庫表格結構
DROP TABLE IF EXISTS diet_daily_foods CASCADE;

CREATE TABLE diet_daily_foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_en TEXT,
    brand TEXT,
    category TEXT NOT NULL,

    -- 基本營養資訊 (每100g)
    calories DECIMAL(8,2),
    protein DECIMAL(8,2),
    carbohydrates DECIMAL(8,2),
    fat DECIMAL(8,2),
    fiber DECIMAL(8,2),
    sugar DECIMAL(8,2),
    sodium DECIMAL(8,2),

    -- 詳細營養成分
    nutrition_data JSONB DEFAULT '{}'::jsonb,

    -- IBD個人化評分系統 (0-4分)
    ibd_scores JSONB DEFAULT '{
        "acute_phase": 0,
        "remission_phase": 0,
        "general_safety": 0,
        "fiber_content": "unknown",
        "processing_level": "unknown",
        "trigger_risk": "unknown"
    }'::jsonb,

    -- 食物屬性分析
    food_properties JSONB DEFAULT '{
        "fiber_type": "unknown",
        "cooking_methods": [],
        "texture": "unknown",
        "acidity": "neutral",
        "spice_level": "none",
        "fat_type": "unknown",
        "preservation_method": "fresh"
    }'::jsonb,

    -- IBD觸發因子分析
    trigger_analysis JSONB DEFAULT '{
        "high_fiber": false,
        "high_fat": false,
        "high_sugar": false,
        "spicy": false,
        "acidic": false,
        "raw": false,
        "fried": false,
        "processed": false,
        "artificial_additives": false,
        "lactose": false,
        "gluten": false,
        "nuts_seeds": false
    }'::jsonb,

    -- 常見過敏原
    allergens JSONB DEFAULT '[]'::jsonb,

    -- 食物標籤和分類
    tags JSONB DEFAULT '[]'::jsonb,
    taiwan_origin BOOLEAN DEFAULT FALSE,

    -- 驗證狀態
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    verified_by UUID REFERENCES diet_daily_users(id),
    verification_notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,

    -- AI評分資訊
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    ai_confidence DECIMAL(3,2) DEFAULT 0.0,

    -- 建立者資訊
    created_by UUID REFERENCES diet_daily_users(id),
    is_custom BOOLEAN DEFAULT FALSE,

    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 創建IBD患者資料表
CREATE TABLE IF NOT EXISTS ibd_patient_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- IBD基本資訊
    ibd_type TEXT CHECK (ibd_type IN ('crohns', 'ulcerative_colitis', 'ibd_unspecified')),
    current_phase TEXT CHECK (current_phase IN ('acute', 'remission', 'mild_flare', 'moderate_flare', 'severe_flare')),
    diagnosis_date DATE,

    -- 個人觸發因子
    personal_triggers JSONB DEFAULT '[]'::jsonb,
    safe_foods JSONB DEFAULT '[]'::jsonb,
    avoided_foods JSONB DEFAULT '[]'::jsonb,

    -- 症狀敏感度
    symptom_sensitivity JSONB DEFAULT '{
        "abdominal_pain": 3,
        "diarrhea": 3,
        "bloating": 3,
        "fatigue": 3,
        "nausea": 3
    }'::jsonb,

    -- 營養限制
    dietary_restrictions JSONB DEFAULT '[]'::jsonb,
    fiber_tolerance TEXT DEFAULT 'moderate' CHECK (fiber_tolerance IN ('low', 'moderate', 'high')),

    -- 更新時間
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 建立索引
CREATE INDEX IF NOT EXISTS idx_foods_category ON diet_daily_foods(category);
CREATE INDEX IF NOT EXISTS idx_foods_verification ON diet_daily_foods(verification_status);
CREATE INDEX IF NOT EXISTS idx_foods_taiwan_origin ON diet_daily_foods(taiwan_origin);
CREATE INDEX IF NOT EXISTS idx_foods_ibd_scores ON diet_daily_foods USING GIN(ibd_scores);
CREATE INDEX IF NOT EXISTS idx_foods_trigger_analysis ON diet_daily_foods USING GIN(trigger_analysis);

CREATE INDEX IF NOT EXISTS idx_ibd_profiles_user_id ON ibd_patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ibd_profiles_phase ON ibd_patient_profiles(current_phase);

-- 4. 啟用RLS
ALTER TABLE diet_daily_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE ibd_patient_profiles ENABLE ROW LEVEL SECURITY;

-- 5. RLS政策
-- 食物資料庫政策
CREATE POLICY "Anyone can view approved foods" ON diet_daily_foods
    FOR SELECT USING (verification_status = 'approved' OR created_by = auth.uid());

CREATE POLICY "Users can create custom foods" ON diet_daily_foods
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own custom foods" ON diet_daily_foods
    FOR UPDATE USING (created_by = auth.uid() AND is_custom = true);

-- IBD患者資料政策
CREATE POLICY "Users can manage own IBD profile" ON ibd_patient_profiles
    FOR ALL USING (user_id = auth.uid());

-- 6. 插入台灣常見食物資料（IBD友善分級）
INSERT INTO diet_daily_foods (
    name, name_en, category, calories, protein, carbohydrates, fat, fiber,
    ibd_scores, food_properties, trigger_analysis, tags, taiwan_origin, verification_status
) VALUES
-- 主食類 (高度適合急性期)
('白粥', 'White Rice Porridge', '主食', 30, 0.6, 6.8, 0.1, 0.1,
 '{"acute_phase": 4, "remission_phase": 4, "general_safety": 4, "fiber_content": "very_low", "processing_level": "cooked", "trigger_risk": "very_low"}',
 '{"fiber_type": "minimal", "cooking_methods": ["boiled"], "texture": "soft", "acidity": "neutral", "fat_type": "minimal"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": false}',
 '["主食", "易消化", "低渣", "急性期適合"]', true, 'approved'),

('白米飯', 'White Rice', '主食', 130, 2.7, 28, 0.3, 0.4,
 '{"acute_phase": 4, "remission_phase": 4, "general_safety": 4, "fiber_content": "low", "processing_level": "cooked", "trigger_risk": "very_low"}',
 '{"fiber_type": "soluble", "cooking_methods": ["steamed"], "texture": "soft", "acidity": "neutral", "fat_type": "minimal"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": false}',
 '["主食", "溫和", "低纖維"]', true, 'approved'),

('白吐司', 'White Toast', '主食', 265, 9, 49, 3.2, 2.7,
 '{"acute_phase": 3, "remission_phase": 3, "general_safety": 3, "fiber_content": "low", "processing_level": "processed", "trigger_risk": "low"}',
 '{"fiber_type": "refined", "cooking_methods": ["baked"], "texture": "soft", "acidity": "neutral", "fat_type": "minimal"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": true, "gluten": true}',
 '["主食", "麵包", "含麩質"]', true, 'approved'),

-- 蛋白質類
('蒸蛋', 'Steamed Egg', '蛋白質', 155, 13, 1.1, 11, 0,
 '{"acute_phase": 4, "remission_phase": 4, "general_safety": 4, "fiber_content": "none", "processing_level": "cooked", "trigger_risk": "very_low"}',
 '{"cooking_methods": ["steamed"], "texture": "soft", "acidity": "neutral", "fat_type": "animal"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": false}',
 '["蛋白質", "易消化", "無纖維"]', true, 'approved'),

('雞胸肉(清蒸)', 'Steamed Chicken Breast', '蛋白質', 165, 31, 0, 3.6, 0,
 '{"acute_phase": 4, "remission_phase": 4, "general_safety": 4, "fiber_content": "none", "processing_level": "cooked", "trigger_risk": "very_low"}',
 '{"cooking_methods": ["steamed"], "texture": "tender", "acidity": "neutral", "fat_type": "lean"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": false}',
 '["蛋白質", "低脂", "優質蛋白"]', true, 'approved'),

('魚片(清蒸)', 'Steamed Fish Fillet', '蛋白質', 150, 25, 0, 5, 0,
 '{"acute_phase": 4, "remission_phase": 4, "general_safety": 4, "fiber_content": "none", "processing_level": "cooked", "trigger_risk": "very_low"}',
 '{"cooking_methods": ["steamed"], "texture": "flaky", "acidity": "neutral", "fat_type": "omega3"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": false}',
 '["蛋白質", "低脂", "Omega-3"]', true, 'approved'),

-- 水果類 (根據成熟度和處理方式)
('香蕉(熟)', 'Ripe Banana', '水果', 89, 1.1, 23, 0.3, 2.6,
 '{"acute_phase": 4, "remission_phase": 4, "general_safety": 4, "fiber_content": "moderate", "processing_level": "fresh", "trigger_risk": "very_low"}',
 '{"fiber_type": "soluble", "texture": "soft", "acidity": "low", "preservation_method": "fresh"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": true, "fried": false, "processed": false}',
 '["水果", "高鉀", "易消化", "軟質"]', true, 'approved'),

('蘋果(去皮蒸煮)', 'Peeled Cooked Apple', '水果', 52, 0.3, 14, 0.2, 1.8,
 '{"acute_phase": 4, "remission_phase": 4, "general_safety": 4, "fiber_content": "low", "processing_level": "cooked", "trigger_risk": "very_low"}',
 '{"fiber_type": "soluble", "cooking_methods": ["steamed"], "texture": "soft", "acidity": "mild"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": false}',
 '["水果", "去皮", "煮熟", "低纖維"]', true, 'approved'),

-- 蔬菜類 (煮熟、去皮、低纖維)
('冬瓜(去皮煮)', 'Peeled Cooked Winter Melon', '蔬菜', 11, 0.6, 2.6, 0.1, 0.7,
 '{"acute_phase": 4, "remission_phase": 4, "general_safety": 4, "fiber_content": "very_low", "processing_level": "cooked", "trigger_risk": "very_low"}',
 '{"fiber_type": "minimal", "cooking_methods": ["boiled"], "texture": "very_soft", "acidity": "neutral"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": false}',
 '["蔬菜", "低纖維", "易消化", "去皮"]', true, 'approved'),

('胡蘿蔔(煮軟)', 'Well-Cooked Carrot', '蔬菜', 35, 0.9, 8.2, 0.2, 2.8,
 '{"acute_phase": 3, "remission_phase": 4, "general_safety": 4, "fiber_content": "moderate", "processing_level": "cooked", "trigger_risk": "low"}',
 '{"fiber_type": "mixed", "cooking_methods": ["boiled"], "texture": "soft", "acidity": "neutral"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": false}',
 '["蔬菜", "維生素A", "煮軟"]', true, 'approved'),

-- 需要謹慎的食物 (IBD緩解期可能適合，急性期避免)
('糙米', 'Brown Rice', '主食', 123, 2.6, 23, 0.9, 1.8,
 '{"acute_phase": 1, "remission_phase": 3, "general_safety": 2, "fiber_content": "high", "processing_level": "whole_grain", "trigger_risk": "moderate"}',
 '{"fiber_type": "insoluble", "cooking_methods": ["steamed"], "texture": "chewy", "acidity": "neutral"}',
 '{"high_fiber": true, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": false}',
 '["全穀物", "高纖維", "緩解期適合"]', true, 'approved'),

('生菜沙拉', 'Raw Lettuce Salad', '蔬菜', 15, 1.4, 2.9, 0.2, 1.3,
 '{"acute_phase": 0, "remission_phase": 2, "general_safety": 1, "fiber_content": "moderate", "processing_level": "raw", "trigger_risk": "high"}',
 '{"fiber_type": "insoluble", "texture": "crisp", "acidity": "neutral", "preservation_method": "fresh"}',
 '{"high_fiber": true, "high_fat": false, "spicy": false, "raw": true, "fried": false, "processed": false}',
 '["蔬菜", "生食", "高纖維", "急性期避免"]', true, 'approved'),

('油炸雞排', 'Fried Chicken Cutlet', '蛋白質', 320, 22, 15, 20, 0.5,
 '{"acute_phase": 0, "remission_phase": 1, "general_safety": 1, "fiber_content": "low", "processing_level": "fried", "trigger_risk": "very_high"}',
 '{"cooking_methods": ["deep_fried"], "texture": "crispy", "fat_type": "saturated", "preservation_method": "fresh"}',
 '{"high_fiber": false, "high_fat": true, "spicy": false, "raw": false, "fried": true, "processed": true}',
 '["蛋白質", "油炸", "高脂", "IBD避免"]', true, 'approved'),

-- 台灣特色食物
('地瓜(蒸)', 'Steamed Sweet Potato', '主食', 86, 1.6, 20, 0.1, 3,
 '{"acute_phase": 2, "remission_phase": 4, "general_safety": 3, "fiber_content": "moderate", "processing_level": "cooked", "trigger_risk": "low"}',
 '{"fiber_type": "mixed", "cooking_methods": ["steamed"], "texture": "soft", "acidity": "neutral"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": false}',
 '["根莖類", "維生素A", "膳食纖維"]', true, 'approved'),

('豆腐', 'Tofu', '蛋白質', 70, 8, 1.9, 4.2, 0.4,
 '{"acute_phase": 3, "remission_phase": 4, "general_safety": 4, "fiber_content": "low", "processing_level": "processed", "trigger_risk": "low"}',
 '{"texture": "soft", "acidity": "neutral", "fat_type": "plant", "preservation_method": "fresh"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": true}',
 '["植物蛋白", "豆製品", "軟質"]', true, 'approved'),

('白蘿蔔湯', 'White Radish Soup', '蔬菜', 18, 0.6, 4.1, 0.1, 1.6,
 '{"acute_phase": 4, "remission_phase": 4, "general_safety": 4, "fiber_content": "low", "processing_level": "cooked", "trigger_risk": "very_low"}',
 '{"fiber_type": "soluble", "cooking_methods": ["boiled"], "texture": "very_soft", "acidity": "neutral"}',
 '{"high_fiber": false, "high_fat": false, "spicy": false, "raw": false, "fried": false, "processed": false}',
 '["蔬菜", "湯品", "易消化", "低纖維"]', true, 'approved');

-- 7. 創建AI評分函數
CREATE OR REPLACE FUNCTION calculate_ibd_score(
    p_fiber_content TEXT,
    p_fat_content DECIMAL,
    p_processing_level TEXT,
    p_cooking_method TEXT,
    p_trigger_factors JSONB
) RETURNS JSONB AS $$
DECLARE
    acute_score INTEGER := 0;
    remission_score INTEGER := 0;
    safety_score INTEGER := 0;
BEGIN
    -- 基於纖維含量評分
    CASE p_fiber_content
        WHEN 'very_low' THEN acute_score := acute_score + 4; remission_score := remission_score + 4;
        WHEN 'low' THEN acute_score := acute_score + 3; remission_score := remission_score + 4;
        WHEN 'moderate' THEN acute_score := acute_score + 2; remission_score := remission_score + 3;
        WHEN 'high' THEN acute_score := acute_score + 1; remission_score := remission_score + 2;
        WHEN 'very_high' THEN acute_score := acute_score + 0; remission_score := remission_score + 1;
    END CASE;

    -- 基於脂肪含量評分
    IF p_fat_content < 3 THEN
        acute_score := acute_score + 0; remission_score := remission_score + 0;
    ELSIF p_fat_content < 10 THEN
        acute_score := GREATEST(acute_score - 1, 0); remission_score := GREATEST(remission_score - 1, 0);
    ELSE
        acute_score := GREATEST(acute_score - 2, 0); remission_score := GREATEST(remission_score - 2, 0);
    END IF;

    -- 基於加工程度評分
    CASE p_processing_level
        WHEN 'fresh' THEN safety_score := 4;
        WHEN 'cooked' THEN safety_score := 4;
        WHEN 'processed' THEN safety_score := 2;
        WHEN 'highly_processed' THEN safety_score := 1;
    END CASE;

    -- 確保分數在0-4範圍內
    acute_score := GREATEST(LEAST(acute_score, 4), 0);
    remission_score := GREATEST(LEAST(remission_score, 4), 0);
    safety_score := GREATEST(LEAST(safety_score, 4), 0);

    RETURN jsonb_build_object(
        'acute_phase', acute_score,
        'remission_phase', remission_score,
        'general_safety', safety_score,
        'calculated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- 8. 檢查插入結果
SELECT
    COUNT(*) as total_foods,
    COUNT(CASE WHEN verification_status = 'approved' THEN 1 END) as approved_foods,
    COUNT(CASE WHEN taiwan_origin = true THEN 1 END) as taiwan_foods
FROM diet_daily_foods;