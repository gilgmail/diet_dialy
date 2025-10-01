-- Correlation Analysis Cache Migration
-- Creates tables for caching correlation analysis results and food entries tracking

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Correlation Analysis Cache Table
-- Stores cached correlation analysis results to avoid expensive recomputation
CREATE TABLE correlation_analysis_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- Cached correlation data (JSON)
    correlation_data JSONB NOT NULL,

    -- Analysis options used for this cache entry
    analysis_options JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Cache management
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    hit_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Food History Entries Table (if not already exists)
-- Links food consumption to users with timing information
-- This table is referenced in the correlation analysis API
CREATE TABLE IF NOT EXISTS food_history_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES diet_daily_foods(id) ON DELETE CASCADE,

    -- Consumption details
    consumed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    portion_size TEXT DEFAULT 'medium' CHECK (portion_size IN ('small', 'medium', 'large', 'custom')),
    portion_amount DECIMAL(8,2),
    portion_unit TEXT,

    -- Context information
    meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
    location TEXT,
    notes TEXT,

    -- Photo and recognition data
    photo_url TEXT,
    recognition_confidence DECIMAL(3,2) CHECK (recognition_confidence >= 0 AND recognition_confidence <= 1),

    -- Medical and symptom tracking
    pre_meal_symptoms JSONB DEFAULT '[]'::jsonb,
    post_meal_symptoms JSONB DEFAULT '[]'::jsonb,

    -- Entry metadata
    entry_source TEXT DEFAULT 'manual' CHECK (entry_source IN ('manual', 'photo', 'import', 'api')),
    data_quality_score DECIMAL(3,2) DEFAULT 1.0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enhanced Food-Symptom Correlation Results Table
-- Stores detailed correlation analysis results
CREATE TABLE enhanced_correlation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES diet_daily_foods(id) ON DELETE CASCADE,

    -- Analysis metadata
    analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
    analysis_period_start DATE NOT NULL,
    analysis_period_end DATE NOT NULL,
    analysis_method TEXT DEFAULT 'statistical' CHECK (analysis_method IN ('statistical', 'ai_enhanced', 'hybrid')),

    -- Correlation results by time window
    time_window_results JSONB NOT NULL, -- Array of time window analyses

    -- Overall assessment
    overall_risk_level TEXT NOT NULL CHECK (overall_risk_level IN ('very_low', 'low', 'moderate', 'high', 'very_high')),
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    recommendation TEXT NOT NULL CHECK (recommendation IN ('safe', 'monitor', 'limit', 'avoid')),

    -- Symptom-specific impacts
    symptom_impacts JSONB NOT NULL,

    -- Statistical measures
    sample_size INTEGER NOT NULL,
    statistical_significance TEXT NOT NULL,
    effect_size TEXT NOT NULL,

    -- User validation and feedback
    user_confirmed BOOLEAN DEFAULT NULL,
    user_notes TEXT,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),

    -- Analysis quality assessment
    data_sufficiency TEXT NOT NULL CHECK (data_sufficiency IN ('insufficient', 'minimal', 'adequate', 'good', 'excellent')),
    bias_factors JSONB DEFAULT '[]'::jsonb,
    limitations JSONB DEFAULT '[]'::jsonb,

    -- Recommendations (denormalized for quick access)
    consumption_timing_advice JSONB DEFAULT '[]'::jsonb,
    portion_suggestions JSONB DEFAULT '[]'::jsonb,
    monitoring_advice JSONB DEFAULT '[]'::jsonb,
    alternative_foods JSONB DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, food_id, analysis_period_start, analysis_period_end)
);

-- 4. Correlation Analysis Settings Table
-- User-specific analysis preferences and settings
CREATE TABLE correlation_analysis_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- Analysis preferences
    default_analysis_window_months INTEGER DEFAULT 3 CHECK (default_analysis_window_months >= 1 AND default_analysis_window_months <= 24),
    min_sample_size INTEGER DEFAULT 10 CHECK (min_sample_size >= 5 AND min_sample_size <= 100),
    confidence_level DECIMAL(3,2) DEFAULT 0.95 CHECK (confidence_level >= 0.80 AND confidence_level <= 0.99),
    include_weak_correlations BOOLEAN DEFAULT FALSE,

    -- Time window preferences
    preferred_time_windows INTEGER[] DEFAULT ARRAY[6,12,24,48,72],

    -- Notification preferences
    auto_analysis_enabled BOOLEAN DEFAULT TRUE,
    analysis_frequency_days INTEGER DEFAULT 7 CHECK (analysis_frequency_days >= 1 AND analysis_frequency_days <= 30),
    notification_threshold TEXT DEFAULT 'moderate' CHECK (notification_threshold IN ('low', 'moderate', 'high')),

    -- Display preferences
    show_statistical_details BOOLEAN DEFAULT FALSE,
    preferred_risk_visualization TEXT DEFAULT 'simple' CHECK (preferred_risk_visualization IN ('simple', 'detailed', 'scientific')),

    -- Data quality preferences
    require_minimum_confidence BOOLEAN DEFAULT TRUE,
    minimum_confidence_threshold DECIMAL(3,2) DEFAULT 0.60,
    exclude_insufficient_data BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(user_id)
);

-- Indexes for optimal performance
CREATE INDEX idx_correlation_cache_user_key ON correlation_analysis_cache(user_id, cache_key);
CREATE INDEX idx_correlation_cache_expires ON correlation_analysis_cache(expires_at);
CREATE INDEX idx_correlation_cache_user_created ON correlation_analysis_cache(user_id, created_at DESC);

CREATE INDEX idx_food_history_user_consumed ON food_history_entries(user_id, consumed_at DESC);
CREATE INDEX idx_food_history_food_consumed ON food_history_entries(food_id, consumed_at DESC);
CREATE INDEX idx_food_history_user_food ON food_history_entries(user_id, food_id);
CREATE INDEX idx_food_history_meal_type ON food_history_entries(user_id, meal_type, consumed_at DESC);

CREATE INDEX idx_enhanced_correlation_user_risk ON enhanced_correlation_results(user_id, overall_risk_level, confidence_score DESC);
CREATE INDEX idx_enhanced_correlation_food_analysis ON enhanced_correlation_results(food_id, analysis_date DESC);
CREATE INDEX idx_enhanced_correlation_user_period ON enhanced_correlation_results(user_id, analysis_period_start, analysis_period_end);

CREATE INDEX idx_correlation_settings_user ON correlation_analysis_settings(user_id);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_correlation_cache_updated_at
    BEFORE UPDATE ON correlation_analysis_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_history_updated_at
    BEFORE UPDATE ON food_history_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_correlation_updated_at
    BEFORE UPDATE ON enhanced_correlation_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_correlation_settings_updated_at
    BEFORE UPDATE ON correlation_analysis_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE correlation_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_history_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_correlation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE correlation_analysis_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can manage own correlation cache" ON correlation_analysis_cache
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own food history" ON food_history_entries
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own correlation results" ON enhanced_correlation_results
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert correlation results" ON enhanced_correlation_results
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own correlation results" ON enhanced_correlation_results
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can manage own analysis settings" ON correlation_analysis_settings
    FOR ALL USING (user_id = auth.uid());

-- Admin policies for system management and analytics
CREATE POLICY "Admins can view all correlation data" ON correlation_analysis_cache
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM diet_daily_users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admins can view all food history" ON food_history_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM diet_daily_users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admins can manage correlation results" ON enhanced_correlation_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM diet_daily_users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Functions for cache management
CREATE OR REPLACE FUNCTION cleanup_expired_correlation_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM correlation_analysis_cache
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update cache hit count
CREATE OR REPLACE FUNCTION increment_cache_hit_count(cache_key_param TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE correlation_analysis_cache
    SET hit_count = hit_count + 1,
        updated_at = NOW()
    WHERE cache_key = cache_key_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's correlation analysis summary
CREATE OR REPLACE FUNCTION get_user_correlation_summary(user_id_param UUID)
RETURNS TABLE (
    total_foods_analyzed INTEGER,
    high_risk_foods INTEGER,
    moderate_risk_foods INTEGER,
    safe_foods INTEGER,
    average_confidence DECIMAL,
    last_analysis_date DATE,
    recommendations_pending INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_foods_analyzed,
        COUNT(CASE WHEN overall_risk_level IN ('high', 'very_high') THEN 1 END)::INTEGER as high_risk_foods,
        COUNT(CASE WHEN overall_risk_level = 'moderate' THEN 1 END)::INTEGER as moderate_risk_foods,
        COUNT(CASE WHEN overall_risk_level IN ('low', 'very_low') THEN 1 END)::INTEGER as safe_foods,
        AVG(confidence_score) as average_confidence,
        MAX(analysis_date) as last_analysis_date,
        COUNT(CASE WHEN user_confirmed IS NULL THEN 1 END)::INTEGER as recommendations_pending
    FROM enhanced_correlation_results
    WHERE enhanced_correlation_results.user_id = user_id_param
    AND analysis_date >= CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Views for common queries
CREATE VIEW user_correlation_overview AS
SELECT
    u.id as user_id,
    u.email,
    COUNT(ecr.id) as total_analyses,
    COUNT(CASE WHEN ecr.overall_risk_level IN ('high', 'very_high') THEN 1 END) as high_risk_foods,
    COUNT(CASE WHEN ecr.overall_risk_level = 'moderate' THEN 1 END) as moderate_risk_foods,
    COUNT(CASE WHEN ecr.overall_risk_level IN ('low', 'very_low') THEN 1 END) as safe_foods,
    AVG(ecr.confidence_score) as avg_confidence,
    MAX(ecr.analysis_date) as last_analysis_date,
    COUNT(cac.id) as cached_analyses
FROM diet_daily_users u
LEFT JOIN enhanced_correlation_results ecr ON u.id = ecr.user_id
LEFT JOIN correlation_analysis_cache cac ON u.id = cac.user_id AND cac.expires_at > NOW()
WHERE ecr.analysis_date >= CURRENT_DATE - INTERVAL '30 days' OR ecr.analysis_date IS NULL
GROUP BY u.id, u.email;

CREATE VIEW recent_correlation_activity AS
SELECT
    ecr.user_id,
    ecr.analysis_date,
    f.name as food_name,
    f.category as food_category,
    ecr.overall_risk_level,
    ecr.confidence_score,
    ecr.recommendation,
    ecr.user_confirmed,
    ecr.created_at
FROM enhanced_correlation_results ecr
JOIN diet_daily_foods f ON ecr.food_id = f.id
WHERE ecr.analysis_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY ecr.created_at DESC;

-- Grant necessary permissions
GRANT ALL ON correlation_analysis_cache TO authenticated;
GRANT ALL ON food_history_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON enhanced_correlation_results TO authenticated;
GRANT ALL ON correlation_analysis_settings TO authenticated;
GRANT SELECT ON user_correlation_overview TO authenticated;
GRANT SELECT ON recent_correlation_activity TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_expired_correlation_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION increment_cache_hit_count(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_correlation_summary(UUID) TO authenticated;

-- Comment the tables for documentation
COMMENT ON TABLE correlation_analysis_cache IS 'Cache for expensive correlation analysis computations with expiration management';
COMMENT ON TABLE food_history_entries IS 'Detailed food consumption history with timing and context for correlation analysis';
COMMENT ON TABLE enhanced_correlation_results IS 'Comprehensive correlation analysis results with statistical measures and recommendations';
COMMENT ON TABLE correlation_analysis_settings IS 'User-specific preferences for correlation analysis behavior and display';

-- Schedule automatic cache cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-correlation-cache', '0 2 * * *', 'SELECT cleanup_expired_correlation_cache();');