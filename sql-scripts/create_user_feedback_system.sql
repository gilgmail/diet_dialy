-- 用戶反饋系統
-- 收集 IBD 評分準確性和用戶體驗反饋

-- 1. 用戶食物反饋表
CREATE TABLE IF NOT EXISTS user_food_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    food_id UUID REFERENCES diet_daily_foods(id) ON DELETE CASCADE,

    -- 評分相關反饋
    ai_predicted_score INTEGER CHECK (ai_predicted_score >= 0 AND ai_predicted_score <= 3),
    user_actual_experience INTEGER CHECK (user_actual_experience >= 0 AND user_actual_experience <= 3),
    score_accuracy_rating INTEGER CHECK (score_accuracy_rating >= 1 AND score_accuracy_rating <= 5),

    -- 症狀反饋
    symptoms_experienced JSONB DEFAULT '[]'::jsonb, -- ["bloating", "pain", "diarrhea"]
    symptom_severity INTEGER CHECK (symptom_severity >= 0 AND symptom_severity <= 10),
    symptom_onset_time INTEGER, -- 症狀出現時間（分鐘）
    symptom_duration INTEGER,   -- 症狀持續時間（小時）

    -- 食用情況
    portion_consumed DECIMAL(5,2), -- 實際食用份量 (g)
    preparation_method TEXT,
    consumed_with_other_foods BOOLEAN DEFAULT FALSE,
    other_foods_consumed TEXT,

    -- 個人狀況
    current_ibd_phase TEXT CHECK (current_ibd_phase IN ('remission', 'mild_active', 'moderate_active', 'severe_active')),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
    medication_changes BOOLEAN DEFAULT FALSE,

    -- 反饋詳情
    detailed_feedback TEXT,
    would_eat_again BOOLEAN,
    alternative_suggestions TEXT,

    -- 反饋品質
    feedback_completeness DECIMAL(3,2) GENERATED ALWAYS AS (
        CASE
            WHEN ai_predicted_score IS NOT NULL
                AND user_actual_experience IS NOT NULL
                AND score_accuracy_rating IS NOT NULL
                AND symptoms_experienced IS NOT NULL
                AND portion_consumed IS NOT NULL
            THEN 1.0
            ELSE 0.5
        END
    ) STORED,

    -- 時間戳記
    consumed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    feedback_submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 唯一約束：每個用戶對同一食物在特定時間的反饋
    UNIQUE(user_id, food_id, consumed_at)
);

-- 2. 評分改進建議表
CREATE TABLE IF NOT EXISTS scoring_improvement_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    food_id UUID REFERENCES diet_daily_foods(id) ON DELETE CASCADE,

    -- 改進建議
    current_score INTEGER CHECK (current_score >= 0 AND current_score <= 3),
    suggested_score INTEGER CHECK (suggested_score >= 0 AND suggested_score <= 3),
    improvement_reason TEXT NOT NULL,

    -- 建議來源
    suggestion_source TEXT CHECK (suggestion_source IN (
        'user_experience', 'medical_professional', 'research_update', 'peer_feedback'
    )),

    -- 支持證據
    supporting_evidence JSONB DEFAULT '{}'::jsonb,
    confidence_level DECIMAL(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1),

    -- 專業審核
    reviewed_by_expert BOOLEAN DEFAULT FALSE,
    expert_id UUID REFERENCES diet_daily_users(id),
    expert_notes TEXT,
    expert_decision TEXT CHECK (expert_decision IN ('accept', 'reject', 'modify', 'pending')),

    -- 實施狀態
    implementation_status TEXT CHECK (implementation_status IN (
        'pending', 'approved', 'implemented', 'rejected'
    )) DEFAULT 'pending',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    implemented_at TIMESTAMP WITH TIME ZONE
);

-- 3. 群體反饋統計表
CREATE TABLE IF NOT EXISTS crowd_feedback_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id UUID REFERENCES diet_daily_foods(id) ON DELETE CASCADE,

    -- 統計數據
    total_feedback_count INTEGER DEFAULT 0,
    avg_user_score DECIMAL(3,2),
    avg_accuracy_rating DECIMAL(3,2),
    common_symptoms JSONB DEFAULT '[]'::jsonb,

    -- 評分偏差分析
    score_overestimate_count INTEGER DEFAULT 0, -- AI 評分過高次數
    score_underestimate_count INTEGER DEFAULT 0, -- AI 評分過低次數
    score_accurate_count INTEGER DEFAULT 0,

    -- 建議調整
    suggested_score_adjustment DECIMAL(3,2),
    adjustment_confidence DECIMAL(3,2),

    -- 更新時間
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(food_id)
);

-- 4. 用戶反饋品質評估表
CREATE TABLE IF NOT EXISTS user_feedback_quality (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- 反饋品質指標
    total_feedback_submitted INTEGER DEFAULT 0,
    detailed_feedback_count INTEGER DEFAULT 0,
    consistent_feedback_rate DECIMAL(3,2) DEFAULT 0.5,

    -- 可信度評分
    credibility_score DECIMAL(3,2) DEFAULT 0.5,
    expert_verified BOOLEAN DEFAULT FALSE,

    -- 貢獻統計
    helpful_feedback_count INTEGER DEFAULT 0,
    feedback_implementation_count INTEGER DEFAULT 0,

    -- 獎勵系統
    feedback_points INTEGER DEFAULT 0,
    contribution_level TEXT CHECK (contribution_level IN (
        'bronze', 'silver', 'gold', 'platinum'
    )) DEFAULT 'bronze',

    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- 5. 建立觸發器：自動更新群體統計
CREATE OR REPLACE FUNCTION update_crowd_feedback_stats()
RETURNS TRIGGER AS $$
DECLARE
    food_record RECORD;
BEGIN
    -- 計算該食物的群體統計
    SELECT
        COUNT(*) as total_count,
        AVG(user_actual_experience) as avg_score,
        AVG(score_accuracy_rating) as avg_accuracy,
        COUNT(CASE WHEN ai_predicted_score > user_actual_experience THEN 1 END) as overestimate,
        COUNT(CASE WHEN ai_predicted_score < user_actual_experience THEN 1 END) as underestimate,
        COUNT(CASE WHEN ai_predicted_score = user_actual_experience THEN 1 END) as accurate
    INTO food_record
    FROM user_food_feedback
    WHERE food_id = COALESCE(NEW.food_id, OLD.food_id);

    -- 更新或插入統計記錄
    INSERT INTO crowd_feedback_stats (
        food_id, total_feedback_count, avg_user_score, avg_accuracy_rating,
        score_overestimate_count, score_underestimate_count, score_accurate_count,
        last_updated
    ) VALUES (
        COALESCE(NEW.food_id, OLD.food_id),
        food_record.total_count,
        food_record.avg_score,
        food_record.avg_accuracy,
        food_record.overestimate,
        food_record.underestimate,
        food_record.accurate,
        NOW()
    )
    ON CONFLICT (food_id) DO UPDATE SET
        total_feedback_count = food_record.total_count,
        avg_user_score = food_record.avg_score,
        avg_accuracy_rating = food_record.avg_accuracy,
        score_overestimate_count = food_record.overestimate,
        score_underestimate_count = food_record.underestimate,
        score_accurate_count = food_record.accurate,
        last_updated = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_update_crowd_feedback_stats ON user_food_feedback;
CREATE TRIGGER trigger_update_crowd_feedback_stats
    AFTER INSERT OR UPDATE OR DELETE ON user_food_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_crowd_feedback_stats();

-- 6. 建立觸發器：更新用戶反饋品質
CREATE OR REPLACE FUNCTION update_user_feedback_quality()
RETURNS TRIGGER AS $$
DECLARE
    quality_record RECORD;
BEGIN
    -- 計算用戶反饋品質指標
    SELECT
        COUNT(*) as total_feedback,
        COUNT(CASE WHEN detailed_feedback IS NOT NULL AND length(detailed_feedback) > 20 THEN 1 END) as detailed_count,
        AVG(feedback_completeness) as completeness_rate
    INTO quality_record
    FROM user_food_feedback
    WHERE user_id = NEW.user_id;

    -- 更新用戶反饋品質記錄
    INSERT INTO user_feedback_quality (
        user_id, total_feedback_submitted, detailed_feedback_count,
        consistent_feedback_rate, last_updated
    ) VALUES (
        NEW.user_id,
        quality_record.total_feedback,
        quality_record.detailed_count,
        quality_record.completeness_rate,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_feedback_submitted = quality_record.total_feedback,
        detailed_feedback_count = quality_record.detailed_count,
        consistent_feedback_rate = quality_record.completeness_rate,
        last_updated = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_update_user_feedback_quality ON user_food_feedback;
CREATE TRIGGER trigger_update_user_feedback_quality
    AFTER INSERT OR UPDATE ON user_food_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_user_feedback_quality();

-- 7. 建立索引提升查詢效能
CREATE INDEX IF NOT EXISTS idx_user_food_feedback_user_id ON user_food_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_food_feedback_food_id ON user_food_feedback(food_id);
CREATE INDEX IF NOT EXISTS idx_user_food_feedback_consumed_at ON user_food_feedback(consumed_at);
CREATE INDEX IF NOT EXISTS idx_user_food_feedback_accuracy ON user_food_feedback(score_accuracy_rating);

CREATE INDEX IF NOT EXISTS idx_scoring_improvement_suggestions_food_id ON scoring_improvement_suggestions(food_id);
CREATE INDEX IF NOT EXISTS idx_scoring_improvement_suggestions_status ON scoring_improvement_suggestions(implementation_status);

-- 8. 反饋分析視圖
CREATE OR REPLACE VIEW feedback_analysis_view AS
SELECT
    f.id as food_id,
    f.name as food_name,
    f.category,
    f.ibd_score as current_ai_score,
    cfs.total_feedback_count,
    cfs.avg_user_score,
    cfs.avg_accuracy_rating,
    cfs.score_overestimate_count,
    cfs.score_underestimate_count,
    cfs.score_accurate_count,
    CASE
        WHEN cfs.total_feedback_count > 0 THEN
            cfs.score_accurate_count::DECIMAL / cfs.total_feedback_count
        ELSE 0
    END as accuracy_rate,
    CASE
        WHEN cfs.avg_user_score IS NOT NULL AND f.ibd_score IS NOT NULL THEN
            ABS(cfs.avg_user_score - f.ibd_score)
        ELSE NULL
    END as score_deviation
FROM diet_daily_foods f
LEFT JOIN crowd_feedback_stats cfs ON f.id = cfs.food_id
WHERE f.verification_status = 'admin_approved';

-- 9. 反饋品質函數
CREATE OR REPLACE FUNCTION get_feedback_quality_report()
RETURNS TABLE (
    total_users_with_feedback INTEGER,
    avg_feedback_per_user DECIMAL,
    high_quality_feedback_rate DECIMAL,
    total_improvement_suggestions INTEGER,
    implemented_suggestions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT ufq.user_id)::INTEGER as total_users_with_feedback,
        ROUND(AVG(ufq.total_feedback_submitted), 2) as avg_feedback_per_user,
        ROUND(AVG(ufq.consistent_feedback_rate), 3) as high_quality_feedback_rate,
        (SELECT COUNT(*)::INTEGER FROM scoring_improvement_suggestions) as total_improvement_suggestions,
        (SELECT COUNT(*)::INTEGER FROM scoring_improvement_suggestions WHERE implementation_status = 'implemented') as implemented_suggestions
    FROM user_feedback_quality ufq
    WHERE ufq.total_feedback_submitted > 0;
END;
$$ LANGUAGE plpgsql;

-- 10. 食物評分準確性分析函數
CREATE OR REPLACE FUNCTION analyze_food_scoring_accuracy(p_food_id UUID DEFAULT NULL)
RETURNS TABLE (
    food_id UUID,
    food_name TEXT,
    current_score INTEGER,
    feedback_count INTEGER,
    avg_user_score DECIMAL,
    accuracy_rate DECIMAL,
    recommended_adjustment DECIMAL,
    confidence_level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fav.food_id,
        fav.food_name,
        fav.current_ai_score,
        fav.total_feedback_count,
        fav.avg_user_score,
        fav.accuracy_rate,
        CASE
            WHEN fav.total_feedback_count >= 10 AND fav.score_deviation > 0.5 THEN
                fav.avg_user_score - fav.current_ai_score
            ELSE 0
        END as recommended_adjustment,
        CASE
            WHEN fav.total_feedback_count >= 20 THEN 'high'
            WHEN fav.total_feedback_count >= 10 THEN 'medium'
            WHEN fav.total_feedback_count >= 5 THEN 'low'
            ELSE 'insufficient'
        END as confidence_level
    FROM feedback_analysis_view fav
    WHERE (p_food_id IS NULL OR fav.food_id = p_food_id)
    AND fav.total_feedback_count > 0
    ORDER BY fav.total_feedback_count DESC, fav.score_deviation DESC;
END;
$$ LANGUAGE plpgsql;

-- 提交變更
COMMIT;

-- 顯示建立結果
SELECT '用戶反饋系統建立完成' as status;
SELECT * FROM get_feedback_quality_report();