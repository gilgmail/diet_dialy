-- Food Analysis Cache table to store reusable AI nutrition/risk assessments
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS food_analysis_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_id UUID NOT NULL REFERENCES diet_daily_foods(id) ON DELETE CASCADE,
    analysis_version TEXT NOT NULL,
    analysis_source TEXT NOT NULL DEFAULT 'ai'
        CHECK (analysis_source IN ('ai', 'manual', 'hybrid')),
    nutrition_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    risk_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    supportive_attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
    serving_guidelines JSONB NOT NULL DEFAULT '[]'::jsonb,
    analysis_payload JSONB NOT NULL,
    analysis_notes TEXT,
    analysis_tokens JSONB NOT NULL DEFAULT '{}'::jsonb,
    refresh_frequency_days INTEGER NOT NULL DEFAULT 90,
    analysis_usage_count INTEGER NOT NULL DEFAULT 0,
    analysis_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(food_id)
);

CREATE INDEX idx_food_analysis_updated_at ON food_analysis_cache(analysis_updated_at DESC);
CREATE INDEX idx_food_analysis_version ON food_analysis_cache(analysis_version);

CREATE TRIGGER update_food_analysis_cache_updated_at
    BEFORE UPDATE ON food_analysis_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE food_analysis_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages food analysis cache"
    ON food_analysis_cache
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can read food analysis cache"
    ON food_analysis_cache
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM diet_daily_users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

COMMENT ON TABLE food_analysis_cache IS 'Reusable AI-generated nutrition and risk analysis per diet_daily_foods row.';

CREATE OR REPLACE FUNCTION increment_food_analysis_usage(p_food_ids UUID[])
RETURNS VOID AS $$
BEGIN
    UPDATE food_analysis_cache
    SET analysis_usage_count = analysis_usage_count + 1,
        updated_at = NOW()
    WHERE food_id = ANY(p_food_ids);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION increment_food_analysis_usage(UUID[]) TO service_role;
