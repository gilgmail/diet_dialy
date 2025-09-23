-- 多疾病個人化食物資料庫 - Supabase實作
-- 執行於 Supabase SQL Editor

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 刪除現有表格(如果存在)
DROP TABLE IF EXISTS patient_profiles CASCADE;
DROP TABLE IF EXISTS medical_condition_configs CASCADE;
DROP TABLE IF EXISTS diet_daily_foods CASCADE;

-- 2. 建立多疾病食物資料庫表格
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

    -- 多疾病評分系統 (0-5分)
    condition_scores JSONB DEFAULT '{
        "ibd": {
            "acute_phase": 0,
            "remission_phase": 0,
            "general_safety": 0
        },
        "ibs": {
            "general_safety": 0,
            "fodmap_level": "unknown",
            "trigger_risk": "unknown"
        },
        "cancer_chemo": {
            "general_safety": 0,
            "immune_support": 0,
            "nausea_friendly": 0,
            "nutrition_density": 0
        },
        "allergies": {
            "cross_contamination_risk": 0,
            "allergen_free_confidence": 0
        }
    }'::jsonb,

    -- 食物屬性分析
    food_properties JSONB DEFAULT '{
        "fiber_type": "unknown",
        "cooking_methods": [],
        "texture": "unknown",
        "acidity": "neutral",
        "spice_level": "none",
        "fat_type": "unknown",
        "preservation_method": "fresh",
        "fodmap_content": {},
        "allergen_info": {},
        "immune_properties": []
    }'::jsonb,

    -- 通用觸發因子分析
    trigger_analysis JSONB DEFAULT '{
        "high_fiber": false,
        "high_fat": false,
        "high_sugar": false,
        "spicy": false,
        "acidic": false,
        "raw": false,
        "fried": false,
        "processed": false,
        "high_fodmap": false,
        "common_allergens": [],
        "artificial_additives": false,
        "histamine_rich": false,
        "tyramine_rich": false
    }'::jsonb,

    -- 其他屬性
    allergens TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    taiwan_origin BOOLEAN DEFAULT false,

    -- AI與驗證相關
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    ai_confidence_scores JSONB DEFAULT '{}'::jsonb,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'ai_approved', 'admin_approved', 'rejected')),
    verification_notes TEXT,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,

    -- 版本控制
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 建立疾病配置表格
CREATE TABLE medical_condition_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condition_code TEXT UNIQUE NOT NULL, -- 'ibd', 'ibs', 'cancer_chemo', 'allergies'
    condition_name TEXT NOT NULL,
    condition_name_zh TEXT NOT NULL,

    -- 評分準則配置
    scoring_criteria JSONB NOT NULL DEFAULT '{
        "score_ranges": {
            "0": "嚴重不適合",
            "1": "高風險",
            "2": "中等風險",
            "3": "基本安全",
            "4": "推薦",
            "5": "最佳選擇"
        },
        "phase_specific": false,
        "trigger_factors": [],
        "nutritional_priorities": []
    }'::jsonb,

    -- AI評分權重
    ai_scoring_weights JSONB NOT NULL DEFAULT '{}'::jsonb,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 建立多疾病患者檔案表格
CREATE TABLE patient_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,

    -- 疾病資訊
    medical_conditions JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['ibd', 'ibs']

    -- 疾病特定資料
    condition_details JSONB NOT NULL DEFAULT '{
        "ibd": {
            "type": null,
            "current_phase": null,
            "severity": null
        },
        "ibs": {
            "subtype": null,
            "severity": null
        },
        "cancer_chemo": {
            "cancer_type": null,
            "treatment_phase": null,
            "side_effects": []
        },
        "allergies": {
            "confirmed_allergens": [],
            "severity_levels": {}
        }
    }'::jsonb,

    -- 個人化設定
    personal_triggers TEXT[] DEFAULT '{}',
    safe_foods TEXT[] DEFAULT '{}',
    avoided_foods TEXT[] DEFAULT '{}',
    dietary_restrictions TEXT[] DEFAULT '{}',

    -- 症狀敏感度 (1-10)
    symptom_sensitivity JSONB DEFAULT '{
        "digestive": 5,
        "immune": 5,
        "energy": 5,
        "nausea": 5,
        "pain": 5
    }'::jsonb,

    -- 偏好設定
    preferences JSONB DEFAULT '{
        "fiber_tolerance": "moderate",
        "spice_tolerance": "moderate",
        "texture_preferences": [],
        "cultural_preferences": ["taiwanese"]
    }'::jsonb,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 建立索引以提升查詢效能
CREATE INDEX idx_diet_daily_foods_category ON diet_daily_foods(category);
CREATE INDEX idx_diet_daily_foods_name ON diet_daily_foods(name);
CREATE INDEX idx_diet_daily_foods_taiwan_origin ON diet_daily_foods(taiwan_origin);
CREATE INDEX idx_diet_daily_foods_verification_status ON diet_daily_foods(verification_status);
CREATE INDEX idx_diet_daily_foods_created_at ON diet_daily_foods(created_at);

-- JSONB 索引
CREATE INDEX idx_diet_daily_foods_condition_scores ON diet_daily_foods USING GIN (condition_scores);
CREATE INDEX idx_diet_daily_foods_food_properties ON diet_daily_foods USING GIN (food_properties);
CREATE INDEX idx_diet_daily_foods_trigger_analysis ON diet_daily_foods USING GIN (trigger_analysis);

-- 患者檔案索引
CREATE INDEX idx_patient_profiles_user_id ON patient_profiles(user_id);
CREATE INDEX idx_patient_profiles_medical_conditions ON patient_profiles USING GIN (medical_conditions);

-- 6. 插入疾病配置資料
INSERT INTO medical_condition_configs (condition_code, condition_name, condition_name_zh, scoring_criteria, ai_scoring_weights) VALUES
('ibd', 'Inflammatory Bowel Disease', '炎症性腸病', '{
    "score_ranges": {
        "0": "嚴重觸發因子，強烈建議避免",
        "1": "高風險，謹慎考慮",
        "2": "中等風險，適量食用",
        "3": "基本安全，日常食用",
        "4": "推薦食用，有益健康",
        "5": "最佳選擇，療癒性食物"
    },
    "phase_specific": true,
    "trigger_factors": ["high_fiber", "spicy", "fried", "raw", "high_fat"],
    "nutritional_priorities": ["easy_digestion", "anti_inflammatory", "low_residue"]
}', '{
    "fiber_content": 0.3,
    "cooking_method": 0.25,
    "processing_level": 0.2,
    "fat_content": 0.15,
    "spice_level": 0.1
}'),

('ibs', 'Irritable Bowel Syndrome', '腸躁症', '{
    "score_ranges": {
        "0": "高FODMAP或已知觸發因子",
        "1": "中高FODMAP，需謹慎",
        "2": "中等FODMAP，控制份量",
        "3": "低FODMAP，基本安全",
        "4": "極低FODMAP，推薦",
        "5": "腸道友善，症狀緩解"
    },
    "phase_specific": false,
    "trigger_factors": ["high_fodmap", "high_fat", "artificial_sweeteners", "caffeine"],
    "nutritional_priorities": ["fodmap_friendly", "digestive_comfort", "symptom_management"]
}', '{
    "fodmap_content": 0.4,
    "fat_content": 0.25,
    "fiber_type": 0.2,
    "artificial_additives": 0.15
}'),

('cancer_chemo', 'Cancer Chemotherapy', '癌症化療', '{
    "score_ranges": {
        "0": "感染風險高，營養價值低",
        "1": "潛在風險，需注意安全",
        "2": "適度營養，謹慎食用",
        "3": "安全營養，易於吸收",
        "4": "高營養密度，免疫支持",
        "5": "最佳療養食物，抗癌營養"
    },
    "phase_specific": true,
    "trigger_factors": ["raw", "high_bacteria_risk", "difficult_digestion"],
    "nutritional_priorities": ["high_nutrition_density", "immune_support", "easy_digestion", "nausea_friendly"]
}', '{
    "nutrition_density": 0.3,
    "food_safety": 0.25,
    "digestibility": 0.2,
    "immune_support": 0.15,
    "nausea_impact": 0.1
}'),

('allergies', 'Food Allergies', '食物過敏', '{
    "score_ranges": {
        "0": "含過敏原或高交叉污染風險",
        "1": "潛在交叉污染風險",
        "2": "低交叉污染風險",
        "3": "無過敏原，安全加工",
        "4": "過敏友善，認證安全",
        "5": "完全無風險，治療級安全"
    },
    "phase_specific": false,
    "trigger_factors": ["contains_allergens", "cross_contamination_risk", "unlabeled_ingredients"],
    "nutritional_priorities": ["allergen_free", "safe_processing", "clear_labeling"]
}', '{
    "allergen_presence": 0.5,
    "cross_contamination": 0.3,
    "processing_safety": 0.2
}');

-- 7. 建立AI評分函數
CREATE OR REPLACE FUNCTION calculate_multi_condition_score(
    p_nutrition JSONB,
    p_properties JSONB,
    p_conditions TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB := '{}';
    condition TEXT;
    base_score INTEGER;
    fiber_content DECIMAL;
    fat_content DECIMAL;
    config_row RECORD;
BEGIN
    -- 取得營養成分
    fiber_content := COALESCE((p_nutrition->>'fiber')::DECIMAL, 0);
    fat_content := COALESCE((p_nutrition->>'fat')::DECIMAL, 0);

    -- 為每個疾病條件計算評分
    FOREACH condition IN ARRAY p_conditions
    LOOP
        SELECT * INTO config_row FROM medical_condition_configs WHERE condition_code = condition;

        IF FOUND THEN
            base_score := 3; -- 基準分數

            CASE condition
                WHEN 'ibd' THEN
                    -- IBD 評分邏輯
                    IF fiber_content > 3 THEN base_score := base_score - 2; END IF;
                    IF fat_content > 15 THEN base_score := base_score - 1; END IF;
                    IF p_properties->>'spice_level' != 'none' THEN base_score := base_score - 1; END IF;
                    IF 'fried' = ANY(string_to_array(p_properties->>'cooking_methods', ',')) THEN base_score := base_score - 1; END IF;

                WHEN 'ibs' THEN
                    -- IBS 評分邏輯
                    IF p_properties->>'fodmap_level' = 'high' THEN base_score := base_score - 2; END IF;
                    IF fat_content > 15 THEN base_score := base_score - 1; END IF;

                WHEN 'cancer_chemo' THEN
                    -- 癌症化療評分邏輯
                    IF 'raw' = ANY(string_to_array(p_properties->>'cooking_methods', ',')) THEN base_score := base_score - 2; END IF;
                    IF (p_nutrition->>'calories')::DECIMAL > 200 THEN base_score := base_score + 1; END IF;

                WHEN 'allergies' THEN
                    -- 過敏評分邏輯 (需要具體過敏原資訊)
                    base_score := 3; -- 預設安全分數
            END CASE;

            -- 確保分數在 0-5 範圍內
            base_score := GREATEST(0, LEAST(5, base_score));

            result := result || jsonb_build_object(condition, jsonb_build_object(
                'general_safety', base_score,
                'calculated_at', NOW()
            ));
        END IF;
    END LOOP;

    RETURN result;
END;
$$;

-- 8. 插入台灣常見食物基礎資料
INSERT INTO diet_daily_foods (
    name, name_en, category, calories, protein, carbohydrates, fat, fiber, sugar, sodium,
    nutrition_data, condition_scores, food_properties, trigger_analysis,
    allergens, tags, taiwan_origin, verification_status, is_custom
) VALUES

-- 主食類
('白米飯', 'Steamed White Rice', '主食', 130, 2.7, 28, 0.3, 0.4, 0.1, 1,
'{"glycemic_index": 73, "manganese": 0.6, "selenium": 15.1}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "very_low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 2, "nausea_friendly": 5, "nutrition_density": 2}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "minimal", "cooking_methods": ["steamed"], "texture": "soft", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"主食", "易消化", "低纖維", "台灣常見"}', true, 'admin_approved', false),

('白粥', 'Rice Porridge', '主食', 85, 1.8, 19, 0.2, 0.3, 0.1, 2,
'{"water_content": 85, "easy_digestion": true}',
'{"ibd": {"acute_phase": 5, "remission_phase": 4, "general_safety": 5}, "ibs": {"general_safety": 5, "fodmap_level": "low", "trigger_risk": "very_low"}, "cancer_chemo": {"general_safety": 5, "immune_support": 2, "nausea_friendly": 5, "nutrition_density": 1}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "minimal", "cooking_methods": ["boiled"], "texture": "very_soft", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"主食", "極易消化", "病患食物", "台灣常見"}', true, 'admin_approved', false),

-- 蛋白質類
('蒸蛋', 'Steamed Egg', '蛋白質', 155, 13, 1.1, 11, 0, 0.7, 124,
'{"choline": 294, "vitamin_b12": 0.9, "complete_protein": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 3, "nausea_friendly": 4, "nutrition_density": 4}, "allergies": {"cross_contamination_risk": 2, "allergen_free_confidence": 2}}',
'{"fiber_type": "none", "cooking_methods": ["steamed"], "texture": "soft", "acidity": "neutral", "spice_level": "none", "fat_type": "mixed", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": ["eggs"], "artificial_additives": false}',
'{"eggs"}', '{"蛋白質", "優質蛋白", "易消化", "台灣常見"}', true, 'admin_approved', false),

('雞胸肉(清蒸)', 'Steamed Chicken Breast', '蛋白質', 165, 31, 0, 3.6, 0, 0, 74,
'{"vitamin_b6": 0.9, "niacin": 14.8, "phosphorus": 228, "lean_protein": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 4, "nausea_friendly": 3, "nutrition_density": 5}, "allergies": {"cross_contamination_risk": 4, "allergen_free_confidence": 4}}',
'{"fiber_type": "none", "cooking_methods": ["steamed"], "texture": "firm", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"蛋白質", "低脂", "高蛋白", "台灣常見"}', true, 'admin_approved', false),

-- 蔬菜類
('冬瓜湯', 'Winter Melon Soup', '蔬菜', 13, 0.4, 3, 0.2, 0.9, 2.2, 2,
'{"potassium": 78, "vitamin_c": 13, "water_content": 96}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 2, "nausea_friendly": 5, "nutrition_density": 2}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "soluble", "cooking_methods": ["boiled"], "texture": "very_soft", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"蔬菜", "低卡路里", "高水分", "台灣常見"}', true, 'admin_approved', false),

('蒸蛋白菜', 'Steamed Chinese Cabbage', '蔬菜', 16, 1.5, 3.2, 0.2, 1, 1.4, 9,
'{"vitamin_k": 76, "folate": 79, "vitamin_c": 45}',
'{"ibd": {"acute_phase": 3, "remission_phase": 4, "general_safety": 3}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 3, "nausea_friendly": 4, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "mixed", "cooking_methods": ["steamed"], "texture": "soft", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"蔬菜", "維生素豐富", "易消化", "台灣常見"}', true, 'admin_approved', false),

-- 水果類
('香蕉', 'Banana', '水果', 89, 1.1, 23, 0.3, 2.6, 12, 1,
'{"potassium": 358, "vitamin_b6": 0.4, "prebiotic_fiber": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 3, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 2, "nausea_friendly": 4, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 4, "allergen_free_confidence": 4}}',
'{"fiber_type": "mixed", "cooking_methods": ["raw"], "texture": "soft", "acidity": "mild", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": true, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"水果", "鉀含量高", "能量補充", "台灣常見"}', true, 'admin_approved', false),

-- 對比：高風險食物
('麻辣鍋', 'Spicy Hot Pot', 'taiwan_street_food', 280, 15, 8, 22, 2, 3, 1200,
'{"capsaicin": "high", "sodium_content": "very_high"}',
'{"ibd": {"acute_phase": 0, "remission_phase": 1, "general_safety": 0}, "ibs": {"general_safety": 1, "fodmap_level": "high", "trigger_risk": "very_high"}, "cancer_chemo": {"general_safety": 1, "immune_support": 1, "nausea_friendly": 0, "nutrition_density": 2}, "allergies": {"cross_contamination_risk": 2, "allergen_free_confidence": 2}}',
'{"fiber_type": "mixed", "cooking_methods": ["boiled", "spicy"], "texture": "mixed", "acidity": "high", "spice_level": "very_hot", "fat_type": "mixed", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": true, "high_sugar": false, "spicy": true, "acidic": true, "raw": false, "fried": false, "processed": true, "high_fodmap": true, "common_allergens": [], "artificial_additives": true}',
'{}', '{"台灣小吃", "辛辣", "高鈉", "刺激性"}', true, 'admin_approved', false);

-- 9. 建立 Row Level Security (RLS) 政策
ALTER TABLE diet_daily_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_condition_configs ENABLE ROW LEVEL SECURITY;

-- 食物資料庫讀取政策 (所有人可讀取已驗證的食物)
CREATE POLICY "食物資料庫公開讀取" ON diet_daily_foods
    FOR SELECT USING (verification_status IN ('admin_approved', 'ai_approved'));

-- 食物資料庫寫入政策 (僅登入用戶可新增自訂食物)
CREATE POLICY "登入用戶可新增自訂食物" ON diet_daily_foods
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND is_custom = true);

-- 食物資料庫更新政策 (用戶只能更新自己建立的自訂食物)
CREATE POLICY "用戶可更新自己的自訂食物" ON diet_daily_foods
    FOR UPDATE USING (auth.uid() = created_by AND is_custom = true);

-- 患者檔案政策 (用戶只能存取自己的檔案)
CREATE POLICY "用戶私人檔案存取" ON patient_profiles
    FOR ALL USING (auth.uid() = user_id);

-- 疾病配置讀取政策 (所有人可讀取)
CREATE POLICY "疾病配置公開讀取" ON medical_condition_configs
    FOR SELECT USING (is_active = true);

-- 10. 建立更新時間戳觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_diet_daily_foods_updated_at BEFORE UPDATE ON diet_daily_foods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_profiles_updated_at BEFORE UPDATE ON patient_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. 建立有用的視圖
CREATE VIEW taiwan_foods_summary AS
SELECT
    category,
    COUNT(*) as food_count,
    AVG((condition_scores->'ibd'->>'general_safety')::INTEGER) as avg_ibd_score,
    AVG((condition_scores->'ibs'->>'general_safety')::INTEGER) as avg_ibs_score
FROM diet_daily_foods
WHERE taiwan_origin = true
    AND verification_status = 'admin_approved'
GROUP BY category
ORDER BY food_count DESC;

CREATE VIEW high_safety_foods AS
SELECT
    name,
    category,
    condition_scores,
    taiwan_origin,
    tags
FROM diet_daily_foods
WHERE verification_status = 'admin_approved'
    AND (condition_scores->'ibd'->>'general_safety')::INTEGER >= 4
    AND (condition_scores->'ibs'->>'general_safety')::INTEGER >= 4
ORDER BY name;

-- 完成建立多疾病個人化食物資料庫
-- 總計：建立了3個主要資料表、8個索引、1個AI評分函數、7筆台灣食物範例資料、完整的RLS安全政策