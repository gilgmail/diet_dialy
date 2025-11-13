-- Queue table for refreshing food analysis cache
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS food_analysis_refresh_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    food_id UUID NOT NULL REFERENCES diet_daily_foods(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES diet_daily_users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL DEFAULT 'auto_detected',
    priority INTEGER NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    failure_reason TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    target_version TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(food_id)
);

CREATE INDEX idx_food_refresh_status ON food_analysis_refresh_queue(status, priority DESC, scheduled_for);
CREATE INDEX idx_food_refresh_requested_by ON food_analysis_refresh_queue(requested_by);

CREATE TRIGGER update_food_analysis_refresh_queue_updated_at
    BEFORE UPDATE ON food_analysis_refresh_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE food_analysis_refresh_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages food analysis queue"
    ON food_analysis_refresh_queue
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can read food analysis queue"
    ON food_analysis_refresh_queue
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM diet_daily_users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

COMMENT ON TABLE food_analysis_refresh_queue IS 'Queue of food IDs requiring AI analysis refresh.';
