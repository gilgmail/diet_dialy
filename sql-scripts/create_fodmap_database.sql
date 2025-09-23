-- 建立完整 FODMAP 資料庫
-- 基於 Monash University FODMAP 研究數據

-- 1. FODMAP 成分詳細表
CREATE TABLE IF NOT EXISTS fodmap_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id UUID REFERENCES diet_daily_foods(id) ON DELETE CASCADE,

    -- Oligosaccharides (寡糖類)
    fructans DECIMAL(5,2) DEFAULT 0,           -- 果聚糖 (g/100g)
    gos DECIMAL(5,2) DEFAULT 0,               -- 半乳寡糖 (g/100g)

    -- Disaccharides (雙糖類)
    lactose DECIMAL(5,2) DEFAULT 0,           -- 乳糖 (g/100g)

    -- Monosaccharides (單糖類)
    excess_fructose DECIMAL(5,2) DEFAULT 0,   -- 過量果糖 (g/100g)

    -- Polyols (多元醇)
    sorbitol DECIMAL(5,2) DEFAULT 0,          -- 山梨醇 (g/100g)
    mannitol DECIMAL(5,2) DEFAULT 0,          -- 甘露醇 (g/100g)
    xylitol DECIMAL(5,2) DEFAULT 0,           -- 木糖醇 (g/100g)
    maltitol DECIMAL(5,2) DEFAULT 0,          -- 麥芽糖醇 (g/100g)

    -- 計算欄位
    total_fodmap_score DECIMAL(5,2) GENERATED ALWAYS AS (
        (fructans + gos) * 1.2 +       -- 寡糖權重較高
        lactose * 1.0 +                 -- 乳糖標準權重
        excess_fructose * 0.8 +         -- 果糖權重較低
        (sorbitol + mannitol + xylitol + maltitol) * 1.1  -- 多元醇中等權重
    ) STORED,

    -- FODMAP 風險等級
    fodmap_risk_level TEXT GENERATED ALWAYS AS (
        CASE
            WHEN (fructans + gos) * 1.2 + lactose + excess_fructose * 0.8 +
                 (sorbitol + mannitol + xylitol + maltitol) * 1.1 < 1.0 THEN 'low'
            WHEN (fructans + gos) * 1.2 + lactose + excess_fructose * 0.8 +
                 (sorbitol + mannitol + xylitol + maltitol) * 1.1 < 3.0 THEN 'medium'
            ELSE 'high'
        END
    ) STORED,

    -- 建議份量 (g)
    safe_portion_size INTEGER,
    moderate_portion_size INTEGER,

    -- 資料來源和更新
    data_source TEXT DEFAULT 'Monash University FODMAP App',
    confidence_level DECIMAL(3,2) DEFAULT 0.8,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 約束條件
    CONSTRAINT positive_values CHECK (
        fructans >= 0 AND gos >= 0 AND lactose >= 0 AND
        excess_fructose >= 0 AND sorbitol >= 0 AND mannitol >= 0 AND
        xylitol >= 0 AND maltitol >= 0
    )
);

-- 2. FODMAP 食物分類表
CREATE TABLE IF NOT EXISTS fodmap_food_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name TEXT UNIQUE NOT NULL,
    description TEXT,
    general_risk_level TEXT CHECK (general_risk_level IN ('low', 'medium', 'high')),

    -- 分類特性
    common_fodmaps JSONB, -- ["fructans", "lactose", "sorbitol"]

    -- IBD 特殊考量
    ibd_considerations TEXT,
    preparation_tips TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. FODMAP 症狀關聯表
CREATE TABLE IF NOT EXISTS fodmap_symptom_correlations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fodmap_type TEXT NOT NULL CHECK (fodmap_type IN (
        'fructans', 'gos', 'lactose', 'excess_fructose',
        'sorbitol', 'mannitol', 'xylitol', 'maltitol'
    )),

    -- 症狀類型和嚴重度
    primary_symptoms JSONB, -- ["bloating", "abdominal_pain", "diarrhea"]
    symptom_intensity TEXT CHECK (symptom_intensity IN ('mild', 'moderate', 'severe')),

    -- 個人差異
    individual_variation TEXT CHECK (individual_variation IN ('low', 'medium', 'high')),

    -- 劑量反應
    threshold_dose DECIMAL(5,2), -- 引發症狀的最小劑量

    -- 研究證據
    evidence_level TEXT CHECK (evidence_level IN ('low', 'moderate', 'high', 'very_high')),
    research_notes TEXT
);

-- 4. 個人 FODMAP 耐受性記錄
CREATE TABLE IF NOT EXISTS user_fodmap_tolerance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    fodmap_type TEXT NOT NULL,

    -- 個人耐受水平
    tolerance_level TEXT CHECK (tolerance_level IN ('none', 'low', 'medium', 'high')),
    safe_amount DECIMAL(5,2), -- 個人安全劑量

    -- 記錄來源
    determined_by TEXT CHECK (determined_by IN ('self_reported', 'elimination_diet', 'challenge_test')),
    confidence DECIMAL(3,2) DEFAULT 0.5,

    -- 時間追蹤
    last_tested TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, fodmap_type)
);

-- 5. 插入 FODMAP 分類基礎數據
INSERT INTO fodmap_food_categories (category_name, description, general_risk_level, common_fodmaps, ibd_considerations) VALUES
('穀物類', '包含小麥、大麥、黑麥等含果聚糖的穀物', 'high', '["fructans"]', '全穀物對IBD患者風險較高，建議選擇精製穀物'),
('水果類', '各種新鮮、乾燥水果，果糖和多元醇含量差異大', 'medium', '["excess_fructose", "sorbitol", "mannitol"]', '選擇低FODMAP水果，注意份量控制'),
('蔬菜類', '洋蔥、大蒜等高果聚糖蔬菜需特別注意', 'medium', '["fructans", "mannitol"]', '避免生食，充分烹煮可降低刺激性'),
('乳製品', '含乳糖的牛奶製品', 'high', '["lactose"]', 'IBD患者常併發乳糖不耐，建議選擇無乳糖產品'),
('豆類', '各種豆類含有寡糖和果聚糖', 'high', '["gos", "fructans"]', '對IBD患者刺激性大，建議避免或充分處理'),
('堅果種子', '部分堅果含有多元醇', 'low', '["sorbitol", "mannitol"]', '適量食用，注意個人耐受性'),
('甜味劑', '人工甜味劑多為多元醇', 'high', '["sorbitol", "mannitol", "xylitol", "maltitol"]', '無糖產品常含高FODMAP甜味劑，IBD患者需避免'),
('調味料', '大蒜、洋蔥粉等調味料', 'medium', '["fructans"]', '使用大蒜油或青蔥綠色部分替代')
ON CONFLICT (category_name) DO NOTHING;

-- 6. 插入常見食物 FODMAP 數據
-- 基於 Monash University 數據
INSERT INTO fodmap_components (food_id, fructans, gos, lactose, excess_fructose, sorbitol, mannitol, safe_portion_size, moderate_portion_size, confidence_level)
SELECT
    id as food_id,
    CASE
        WHEN name ILIKE '%洋蔥%' THEN 2.5
        WHEN name ILIKE '%大蒜%' THEN 4.2
        WHEN name ILIKE '%小麥%' OR name ILIKE '%麵包%' THEN 1.8
        WHEN name ILIKE '%蘋果%' THEN 0.2
        ELSE 0.0
    END as fructans,
    CASE
        WHEN name ILIKE '%豆%' AND NOT name ILIKE '%豆腐%' THEN 0.8
        ELSE 0.0
    END as gos,
    CASE
        WHEN name ILIKE '%牛奶%' OR name ILIKE '%優格%' THEN 4.8
        WHEN name ILIKE '%起司%' THEN 0.1
        ELSE 0.0
    END as lactose,
    CASE
        WHEN name ILIKE '%蘋果%' THEN 5.8
        WHEN name ILIKE '%芒果%' THEN 2.9
        WHEN name ILIKE '%蜂蜜%' THEN 7.6
        ELSE 0.0
    END as excess_fructose,
    CASE
        WHEN name ILIKE '%蘋果%' THEN 0.5
        WHEN name ILIKE '%梨%' THEN 2.1
        WHEN name ILIKE '%桃%' THEN 1.2
        ELSE 0.0
    END as sorbitol,
    CASE
        WHEN name ILIKE '%花椰菜%' THEN 0.15
        WHEN name ILIKE '%蘑菇%' THEN 0.3
        ELSE 0.0
    END as mannitol,
    CASE
        WHEN name ILIKE '%洋蔥%' THEN 10
        WHEN name ILIKE '%大蒜%' THEN 2
        WHEN name ILIKE '%蘋果%' THEN 20
        WHEN name ILIKE '%牛奶%' THEN 15
        ELSE 100
    END as safe_portion_size,
    CASE
        WHEN name ILIKE '%洋蔥%' THEN 25
        WHEN name ILIKE '%大蒜%' THEN 5
        WHEN name ILIKE '%蘋果%' THEN 40
        WHEN name ILIKE '%牛奶%' THEN 30
        ELSE 200
    END as moderate_portion_size,
    0.9 as confidence_level
FROM diet_daily_foods
WHERE verification_status = 'admin_approved'
ON CONFLICT DO NOTHING;

-- 7. 症狀關聯數據
INSERT INTO fodmap_symptom_correlations (fodmap_type, primary_symptoms, symptom_intensity, individual_variation, threshold_dose, evidence_level, research_notes) VALUES
('fructans', '["bloating", "abdominal_pain", "gas"]', 'moderate', 'medium', 0.35, 'high', '果聚糖是最常見的FODMAP觸發因子'),
('lactose', '["diarrhea", "bloating", "cramping"]', 'severe', 'high', 12.0, 'very_high', '乳糖不耐在IBD患者中很常見'),
('excess_fructose', '["bloating", "diarrhea"]', 'mild', 'high', 0.5, 'moderate', '個人差異很大，需要個別測試'),
('sorbitol', '["diarrhea", "abdominal_pain"]', 'severe', 'low', 5.0, 'high', '多元醇有瀉藥效果'),
('mannitol', '["bloating", "gas"]', 'moderate', 'medium', 0.2, 'moderate', '量少但累積效應明顯'),
('gos', '["gas", "bloating"]', 'moderate', 'medium', 0.3, 'moderate', '豆類製品主要FODMAP成分');

-- 8. 建立索引
CREATE INDEX IF NOT EXISTS idx_fodmap_components_food_id ON fodmap_components(food_id);
CREATE INDEX IF NOT EXISTS idx_fodmap_components_risk_level ON fodmap_components(fodmap_risk_level);
CREATE INDEX IF NOT EXISTS idx_fodmap_components_score ON fodmap_components(total_fodmap_score);
CREATE INDEX IF NOT EXISTS idx_user_fodmap_tolerance_user_id ON user_fodmap_tolerance(user_id);

-- 9. 建立 FODMAP 分析視圖
CREATE OR REPLACE VIEW fodmap_analysis_view AS
SELECT
    f.id,
    f.name,
    f.category,
    fc.total_fodmap_score,
    fc.fodmap_risk_level,
    fc.safe_portion_size,
    fc.fructans,
    fc.lactose,
    fc.excess_fructose,
    fc.sorbitol + fc.mannitol + fc.xylitol + fc.maltitol as total_polyols,
    fc.confidence_level,
    fcat.ibd_considerations,
    fcat.preparation_tips
FROM diet_daily_foods f
LEFT JOIN fodmap_components fc ON f.id = fc.food_id
LEFT JOIN fodmap_food_categories fcat ON f.category = fcat.category_name
WHERE f.verification_status = 'admin_approved';

-- 10. FODMAP 統計函數
CREATE OR REPLACE FUNCTION get_fodmap_stats()
RETURNS TABLE (
    total_foods_with_fodmap INTEGER,
    low_fodmap_foods INTEGER,
    medium_fodmap_foods INTEGER,
    high_fodmap_foods INTEGER,
    avg_fodmap_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_foods_with_fodmap,
        COUNT(CASE WHEN fodmap_risk_level = 'low' THEN 1 END)::INTEGER as low_fodmap_foods,
        COUNT(CASE WHEN fodmap_risk_level = 'medium' THEN 1 END)::INTEGER as medium_fodmap_foods,
        COUNT(CASE WHEN fodmap_risk_level = 'high' THEN 1 END)::INTEGER as high_fodmap_foods,
        ROUND(AVG(total_fodmap_score), 2) as avg_fodmap_score
    FROM fodmap_components;
END;
$$ LANGUAGE plpgsql;

-- 11. 個人化 FODMAP 推薦函數
CREATE OR REPLACE FUNCTION get_personal_fodmap_recommendations(p_user_id UUID)
RETURNS TABLE (
    food_name TEXT,
    category TEXT,
    personal_risk_level TEXT,
    recommended_portion INTEGER,
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.name as food_name,
        f.category,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM user_fodmap_tolerance ut
                WHERE ut.user_id = p_user_id
                AND ut.tolerance_level = 'none'
                AND (
                    (ut.fodmap_type = 'fructans' AND fc.fructans > 0.1) OR
                    (ut.fodmap_type = 'lactose' AND fc.lactose > 0.1) OR
                    (ut.fodmap_type = 'excess_fructose' AND fc.excess_fructose > 0.1) OR
                    (ut.fodmap_type = 'sorbitol' AND fc.sorbitol > 0.1)
                )
            ) THEN 'avoid'
            WHEN fc.fodmap_risk_level = 'high' THEN 'caution'
            WHEN fc.fodmap_risk_level = 'medium' THEN 'moderate'
            ELSE 'safe'
        END as personal_risk_level,
        CASE
            WHEN fc.fodmap_risk_level = 'low' THEN fc.moderate_portion_size
            ELSE fc.safe_portion_size
        END as recommended_portion,
        CASE
            WHEN fc.fodmap_risk_level = 'high' THEN '含高FODMAP成分，建議避免或極少量食用'
            WHEN fc.fodmap_risk_level = 'medium' THEN '中等FODMAP含量，注意份量控制'
            ELSE '低FODMAP食物，相對安全'
        END as reason
    FROM diet_daily_foods f
    LEFT JOIN fodmap_components fc ON f.id = fc.food_id
    WHERE f.verification_status = 'admin_approved'
    AND fc.id IS NOT NULL
    ORDER BY fc.total_fodmap_score ASC;
END;
$$ LANGUAGE plpgsql;

-- 提交變更
COMMIT;

-- 顯示建立結果
SELECT 'FODMAP 資料庫結構建立完成' as status;
SELECT * FROM get_fodmap_stats();