-- AI Usage Events Tracking
-- Creates event log, summary view, alert settings, and RLS policies

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    feature TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'anthropic',
    model TEXT NOT NULL,
    operation TEXT NOT NULL DEFAULT 'messages.create',
    request_id TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ai_usage_events IS 'Tracks individual AI API invocations for auditing and cost monitoring';

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user ON public.ai_usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_feature ON public.ai_usage_events(feature, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their AI usage events"
    ON public.ai_usage_events
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all AI usage events"
    ON public.ai_usage_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.diet_daily_users
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "Users can insert their own AI usage events"
    ON public.ai_usage_events
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE VIEW public.ai_usage_daily_summary AS
SELECT
    user_id,
    DATE_TRUNC('day', created_at)::date AS usage_date,
    feature,
    COUNT(*) AS call_count,
    COALESCE(SUM(input_tokens), 0) AS total_input_tokens,
    COALESCE(SUM(output_tokens), 0) AS total_output_tokens,
    COALESCE(SUM(cost_usd), 0) AS total_cost_usd
FROM public.ai_usage_events
GROUP BY user_id, DATE_TRUNC('day', created_at)::date, feature;

GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT SELECT ON public.ai_usage_daily_summary TO authenticated;

COMMENT ON VIEW public.ai_usage_daily_summary IS 'Aggregated AI usage per user/day/feature';

-- Cost alert preferences per user
CREATE TABLE IF NOT EXISTS public.ai_usage_alert_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_cost_threshold NUMERIC(12,2) NOT NULL DEFAULT 50.00,
    alert_channels TEXT[] NOT NULL DEFAULT ARRAY['dashboard'],
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

COMMENT ON TABLE public.ai_usage_alert_settings IS 'User-defined monthly AI cost thresholds and notification channels';

CREATE INDEX IF NOT EXISTS idx_ai_usage_alert_settings_user ON public.ai_usage_alert_settings(user_id);

ALTER TABLE public.ai_usage_alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their AI alert settings"
    ON public.ai_usage_alert_settings
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view AI alert settings"
    ON public.ai_usage_alert_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.diet_daily_users
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE OR REPLACE FUNCTION public.update_ai_usage_alert_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_usage_alert_settings_updated_at
    BEFORE UPDATE ON public.ai_usage_alert_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ai_usage_alert_settings_updated_at();
