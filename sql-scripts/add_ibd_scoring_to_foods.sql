-- 為 Supabase 食物資料庫添加 IBD 評分功能
-- 支援 Claude AI 營養師評分系統

-- 1. 為現有食物表添加 IBD 評分欄位
ALTER TABLE diet_daily_foods
ADD COLUMN IF NOT EXISTS ibd_score INTEGER CHECK (ibd_score >= 0 AND ibd_score <= 3),
ADD COLUMN IF NOT EXISTS ibd_reasoning JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ibd_recommendations TEXT,
ADD COLUMN IF NOT EXISTS ibd_confidence DECIMAL(3,2) CHECK (ibd_confidence >= 0 AND ibd_confidence <= 1),
ADD COLUMN IF NOT EXISTS ibd_warning TEXT,
ADD COLUMN IF NOT EXISTS ibd_scored_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ibd_scorer_version TEXT DEFAULT 'v1.0';

-- 2. 建立 IBD 評分歷史記錄表
CREATE TABLE IF NOT EXISTS ibd_scoring_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id UUID NOT NULL REFERENCES diet_daily_foods(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 3),
    reasoning JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations TEXT,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    warning TEXT,
    scorer_version TEXT DEFAULT 'v1.0',
    scored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 評分輸入數據快照
    food_snapshot JSONB NOT NULL, -- 評分時的食物營養資訊

    -- 索引
    CONSTRAINT ibd_scoring_history_food_id_idx UNIQUE (food_id, scored_at)
);

-- 3. 建立 IBD 評分設定表
CREATE TABLE IF NOT EXISTS ibd_scoring_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_name TEXT UNIQUE NOT NULL,
    prompt_template TEXT NOT NULL,
    scoring_criteria JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 插入預設評分設定
INSERT INTO ibd_scoring_config (config_name, prompt_template, scoring_criteria, is_active)
VALUES (
    'default_ibd_nutritionist',
    '你是一位擁有 18 年豐富經驗的專業營養師，專精於 IBD（發炎性腸道疾病）患者的飲食管理。評分標準：0分不合適，1分謹慎，2分適中，3分推薦。',
    '{
        "score_0": {"label": "不合適", "description": "可能引發症狀或加重發炎", "criteria": ["高刺激性", "高纖維", "FODMAP高"]},
        "score_1": {"label": "謹慎", "description": "需要小心食用，可能有風險", "criteria": ["中等刺激", "需觀察反應"]},
        "score_2": {"label": "適中", "description": "一般情況下可以食用", "criteria": ["溫和食物", "適量安全"]},
        "score_3": {"label": "推薦", "description": "對IBD患者有益或安全性高", "criteria": ["抗發炎", "易消化", "營養豐富"]}
    }'::jsonb,
    true
) ON CONFLICT (config_name) DO NOTHING;

-- 5. 建立評分統計視圖
CREATE OR REPLACE VIEW ibd_scoring_stats AS
SELECT
    COUNT(*) as total_foods,
    COUNT(CASE WHEN ibd_score IS NOT NULL THEN 1 END) as scored_foods,
    COUNT(CASE WHEN ibd_score = 0 THEN 1 END) as unsuitable_foods,
    COUNT(CASE WHEN ibd_score = 1 THEN 1 END) as cautious_foods,
    COUNT(CASE WHEN ibd_score = 2 THEN 1 END) as moderate_foods,
    COUNT(CASE WHEN ibd_score = 3 THEN 1 END) as recommended_foods,
    ROUND(AVG(ibd_score), 2) as average_score,
    ROUND(AVG(ibd_confidence), 3) as average_confidence
FROM diet_daily_foods
WHERE verification_status = 'admin_approved';

-- 6. 建立評分索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_diet_daily_foods_ibd_score
ON diet_daily_foods(ibd_score)
WHERE ibd_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_diet_daily_foods_ibd_confidence
ON diet_daily_foods(ibd_confidence)
WHERE ibd_confidence IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_diet_daily_foods_category_ibd_score
ON diet_daily_foods(category, ibd_score)
WHERE ibd_score IS NOT NULL;

-- 7. 建立評分更新觸發器
CREATE OR REPLACE FUNCTION update_ibd_scoring_history()
RETURNS TRIGGER AS $$
BEGIN
    -- 當 IBD 評分更新時，記錄到歷史表
    IF OLD.ibd_score IS DISTINCT FROM NEW.ibd_score OR
       OLD.ibd_reasoning IS DISTINCT FROM NEW.ibd_reasoning THEN

        INSERT INTO ibd_scoring_history (
            food_id, score, reasoning, recommendations,
            confidence, warning, scorer_version, food_snapshot
        ) VALUES (
            NEW.id, NEW.ibd_score, NEW.ibd_reasoning, NEW.ibd_recommendations,
            NEW.ibd_confidence, NEW.ibd_warning, NEW.ibd_scorer_version,
            jsonb_build_object(
                'name', NEW.name,
                'category', NEW.category,
                'calories', NEW.calories,
                'protein', NEW.protein,
                'carbohydrates', NEW.carbohydrates,
                'fat', NEW.fat,
                'fiber', NEW.fiber,
                'sodium', NEW.sodium
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_ibd_scoring_history ON diet_daily_foods;
CREATE TRIGGER trigger_ibd_scoring_history
    AFTER UPDATE ON diet_daily_foods
    FOR EACH ROW
    EXECUTE FUNCTION update_ibd_scoring_history();

-- 8. 建立便利查詢函數
CREATE OR REPLACE FUNCTION get_foods_by_ibd_score(target_score INTEGER)
RETURNS TABLE (
    id UUID,
    name TEXT,
    category TEXT,
    ibd_score INTEGER,
    ibd_confidence DECIMAL,
    ibd_recommendations TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id, f.name, f.category, f.ibd_score,
        f.ibd_confidence, f.ibd_recommendations
    FROM diet_daily_foods f
    WHERE f.ibd_score = target_score
    AND f.verification_status = 'admin_approved'
    ORDER BY f.ibd_confidence DESC, f.name;
END;
$$ LANGUAGE plpgsql;

-- 9. 建立批次評分用的預存程序
CREATE OR REPLACE FUNCTION batch_update_ibd_scores(
    food_scores JSONB -- [{"id": "uuid", "score": 0-3, "reasoning": [], "recommendations": "", "confidence": 0.8}]
)
RETURNS INTEGER AS $$
DECLARE
    food_record JSONB;
    updated_count INTEGER := 0;
BEGIN
    -- 遍歷所有評分數據
    FOR food_record IN SELECT jsonb_array_elements(food_scores)
    LOOP
        UPDATE diet_daily_foods
        SET
            ibd_score = (food_record->>'score')::INTEGER,
            ibd_reasoning = food_record->'reasoning',
            ibd_recommendations = food_record->>'recommendations',
            ibd_confidence = (food_record->>'confidence')::DECIMAL,
            ibd_warning = food_record->>'warning',
            ibd_scored_at = NOW(),
            ibd_scorer_version = COALESCE(food_record->>'scorer_version', 'v1.0')
        WHERE id = (food_record->>'id')::UUID;

        IF FOUND THEN
            updated_count := updated_count + 1;
        END IF;
    END LOOP;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 10. 建立 RLS 政策（如果需要）
-- 允許已認證用戶查看 IBD 評分
CREATE POLICY "Users can view IBD scores" ON diet_daily_foods
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- 只允許管理員更新 IBD 評分
CREATE POLICY "Only admins can update IBD scores" ON diet_daily_foods
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM diet_daily_users
            WHERE is_admin = true
        )
    );

-- 提交變更
COMMIT;

-- 顯示建立結果
SELECT 'IBD評分系統資料庫結構建立完成' as status;
SELECT * FROM ibd_scoring_stats;