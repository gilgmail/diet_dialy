-- Daily Symptom Tracking Migration
-- Creates comprehensive tables for daily symptom tracking, patterns, and alerts
-- Integration with existing medical infrastructure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Daily Symptom Entries Table
-- Stores individual symptom records with severity scores
CREATE TABLE daily_symptom_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- Core symptom data based on required symptoms: 健康、腹痛、腹瀉、血便、脹氣
    overall_health INTEGER CHECK (overall_health >= 1 AND overall_health <= 5) NOT NULL,
    abdominal_pain INTEGER CHECK (abdominal_pain >= 0 AND abdominal_pain <= 5) DEFAULT 0,
    diarrhea INTEGER CHECK (diarrhea >= 0 AND diarrhea <= 5) DEFAULT 0,
    bloody_stool INTEGER CHECK (bloody_stool >= 0 AND bloody_stool <= 5) DEFAULT 0,
    bloating INTEGER CHECK (bloating >= 0 AND bloating <= 5) DEFAULT 0,

    -- Additional symptom tracking (following existing SymptomType pattern)
    additional_symptoms JSONB DEFAULT '[]'::jsonb, -- Array of {type, severity, notes}

    -- Temporal information
    recorded_date DATE NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Context and correlations
    mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 5),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
    sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),

    -- Food and medication correlation tracking
    related_food_entries UUID[], -- Array of food_entry IDs from same day
    medications_taken JSONB DEFAULT '[]'::jsonb,
    medication_adherence INTEGER CHECK (medication_adherence >= 1 AND medication_adherence <= 5),

    -- Environmental factors
    weather_conditions TEXT,
    activity_level TEXT CHECK (activity_level IN ('low', 'moderate', 'high')),

    -- User notes and observations
    notes TEXT,
    triggers_identified TEXT[],
    improvement_factors TEXT[],

    -- Data quality and validation
    entry_source TEXT DEFAULT 'manual' CHECK (entry_source IN ('manual', 'imported', 'migrated')),
    data_completeness_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: one entry per user per day
    UNIQUE(user_id, recorded_date)
);

-- 2. Symptom Pattern Analysis Table
-- Stores computed pattern analysis and trends
CREATE TABLE symptom_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- Analysis period
    analysis_period TEXT NOT NULL CHECK (analysis_period IN ('weekly', 'monthly', 'quarterly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Core symptom trends (1-week trends, 4-week trends, etc.)
    overall_health_trend JSONB NOT NULL, -- {average, trend_direction, stability}
    abdominal_pain_trend JSONB NOT NULL,
    diarrhea_trend JSONB NOT NULL,
    bloody_stool_trend JSONB NOT NULL,
    bloating_trend JSONB NOT NULL,

    -- Pattern insights
    symptom_frequency JSONB NOT NULL, -- Frequency of each symptom per period
    worst_days_pattern JSONB, -- Day-of-week patterns for worst symptoms
    best_days_pattern JSONB, -- Day-of-week patterns for best symptoms

    -- Correlation analysis
    food_correlations JSONB DEFAULT '{}'::jsonb, -- {food_id: correlation_strength}
    medication_effectiveness JSONB DEFAULT '{}'::jsonb,
    lifestyle_correlations JSONB DEFAULT '{}'::jsonb,

    -- Risk factors and triggers
    identified_triggers JSONB DEFAULT '[]'::jsonb,
    protective_factors JSONB DEFAULT '[]'::jsonb,

    -- Statistical measures
    overall_stability_score DECIMAL(3,2), -- 0.0 to 1.0 (1.0 = very stable)
    improvement_rate DECIMAL(3,2), -- -1.0 to 1.0 (-1.0 = getting worse, 1.0 = improving)

    -- Confidence metrics
    data_quality_score DECIMAL(3,2), -- Based on completeness and consistency
    analysis_confidence DECIMAL(3,2), -- AI/statistical confidence in patterns

    -- Analysis metadata
    analysis_method TEXT DEFAULT 'statistical' CHECK (analysis_method IN ('statistical', 'ai_enhanced', 'hybrid')),
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: one analysis per user per period
    UNIQUE(user_id, analysis_period, period_start, period_end)
);

-- 3. Symptom Alerts and Notifications Table
-- Manages alert thresholds and notifications
CREATE TABLE symptom_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- Alert configuration
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'symptom_deterioration', 'symptom_improvement', 'pattern_change',
        'missed_entry', 'threshold_breach', 'correlation_detected'
    )),
    alert_name TEXT NOT NULL,
    description TEXT,

    -- Threshold configuration
    symptom_thresholds JSONB NOT NULL, -- {symptom: {min, max, duration}}
    severity_threshold INTEGER CHECK (severity_threshold >= 1 AND severity_threshold <= 5),
    duration_threshold INTEGER DEFAULT 1, -- Days to trigger alert

    -- Alert conditions
    trigger_conditions JSONB NOT NULL, -- Complex conditions for triggering
    notification_frequency TEXT DEFAULT 'immediate' CHECK (
        notification_frequency IN ('immediate', 'daily', 'weekly', 'disabled')
    ),

    -- Alert status
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,

    -- Alert delivery preferences
    notification_channels JSONB DEFAULT '["app"]'::jsonb, -- app, email, sms
    escalation_rules JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Symptom Alert History Table
-- Tracks when alerts are triggered and their outcomes
CREATE TABLE symptom_alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES symptom_alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- Alert trigger details
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trigger_symptom_entry UUID REFERENCES daily_symptom_entries(id),
    trigger_reason TEXT NOT NULL,
    trigger_data JSONB DEFAULT '{}'::jsonb, -- The data that triggered the alert

    -- Alert resolution
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_action TEXT, -- 'ignored', 'consulted_doctor', 'changed_medication', etc.
    resolution_notes TEXT,

    -- Notification delivery status
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_channels_used JSONB DEFAULT '[]'::jsonb,
    notification_delivery_status JSONB DEFAULT '{}'::jsonb,

    -- Effectiveness tracking
    was_helpful BOOLEAN, -- User feedback on alert usefulness
    user_feedback TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Symptom Food Correlations Table
-- Tracks specific correlations between foods and symptoms
CREATE TABLE symptom_food_correlations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    food_id UUID REFERENCES diet_daily_foods(id),

    -- Correlation strength and confidence
    correlation_type TEXT NOT NULL CHECK (correlation_type IN ('positive', 'negative', 'neutral')),
    correlation_strength DECIMAL(3,2) NOT NULL CHECK (correlation_strength >= -1.0 AND correlation_strength <= 1.0),
    confidence_level DECIMAL(3,2) NOT NULL CHECK (confidence_level >= 0.0 AND confidence_level <= 1.0),

    -- Symptom-specific correlations
    symptom_impacts JSONB NOT NULL, -- {symptom: impact_score}

    -- Statistical measures
    sample_size INTEGER NOT NULL, -- Number of data points used
    time_lag_hours INTEGER, -- Hours between food consumption and symptom impact

    -- Analysis period
    analysis_start_date DATE NOT NULL,
    analysis_end_date DATE NOT NULL,

    -- Food details (denormalized for performance)
    food_name TEXT NOT NULL,
    food_category TEXT,

    -- User validation
    user_confirmed BOOLEAN DEFAULT NULL, -- User can confirm/deny correlation
    user_notes TEXT,

    -- Analysis metadata
    analysis_method TEXT DEFAULT 'statistical',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(user_id, food_id, analysis_start_date, analysis_end_date)
);

-- Indexes for optimal query performance
CREATE INDEX idx_daily_symptom_entries_user_date ON daily_symptom_entries(user_id, recorded_date DESC);
CREATE INDEX idx_daily_symptom_entries_overall_health ON daily_symptom_entries(user_id, overall_health, recorded_date DESC);
CREATE INDEX idx_daily_symptom_entries_symptoms ON daily_symptom_entries(user_id, abdominal_pain, diarrhea, bloody_stool, bloating);
CREATE INDEX idx_daily_symptom_entries_created_at ON daily_symptom_entries(created_at DESC);

CREATE INDEX idx_symptom_patterns_user_period ON symptom_patterns(user_id, analysis_period, period_start DESC);
CREATE INDEX idx_symptom_patterns_computed_at ON symptom_patterns(computed_at DESC);

CREATE INDEX idx_symptom_alerts_user_active ON symptom_alerts(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_symptom_alerts_type ON symptom_alerts(alert_type, is_active);

CREATE INDEX idx_symptom_alert_history_user_date ON symptom_alert_history(user_id, triggered_at DESC);
CREATE INDEX idx_symptom_alert_history_alert ON symptom_alert_history(alert_id, triggered_at DESC);

CREATE INDEX idx_symptom_food_correlations_user_strength ON symptom_food_correlations(user_id, correlation_strength DESC);
CREATE INDEX idx_symptom_food_correlations_food ON symptom_food_correlations(food_id, correlation_type);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_daily_symptom_entries_updated_at
    BEFORE UPDATE ON daily_symptom_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_symptom_patterns_updated_at
    BEFORE UPDATE ON symptom_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_symptom_alerts_updated_at
    BEFORE UPDATE ON symptom_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_symptom_alert_history_updated_at
    BEFORE UPDATE ON symptom_alert_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_symptom_food_correlations_updated_at
    BEFORE UPDATE ON symptom_food_correlations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE daily_symptom_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_food_correlations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can manage own daily symptom entries" ON daily_symptom_entries
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own symptom patterns" ON symptom_patterns
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert symptom patterns" ON symptom_patterns
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own symptom alerts" ON symptom_alerts
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view own alert history" ON symptom_alert_history
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert alert history" ON symptom_alert_history
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own food correlations" ON symptom_food_correlations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own food correlations" ON symptom_food_correlations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert food correlations" ON symptom_food_correlations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin policies for system management
CREATE POLICY "Admins can view all symptom data for analysis" ON daily_symptom_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM diet_daily_users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

CREATE POLICY "Admins can manage all pattern analysis" ON symptom_patterns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM diet_daily_users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Create views for common queries
CREATE VIEW user_symptom_summary AS
SELECT
    user_id,
    COUNT(*) AS total_entries,
    AVG(overall_health) AS avg_health_score,
    AVG(abdominal_pain) AS avg_abdominal_pain,
    AVG(diarrhea) AS avg_diarrhea,
    AVG(bloody_stool) AS avg_bloody_stool,
    AVG(bloating) AS avg_bloating,
    MAX(recorded_date) AS last_entry_date,
    MIN(recorded_date) AS first_entry_date
FROM daily_symptom_entries
GROUP BY user_id;

CREATE VIEW recent_symptom_trends AS
SELECT
    user_id,
    recorded_date,
    overall_health,
    abdominal_pain + diarrhea + bloody_stool + bloating AS total_symptom_score,
    LAG(overall_health, 1) OVER (PARTITION BY user_id ORDER BY recorded_date) AS prev_health,
    LAG(abdominal_pain + diarrhea + bloody_stool + bloating, 1) OVER (PARTITION BY user_id ORDER BY recorded_date) AS prev_symptoms
FROM daily_symptom_entries
WHERE recorded_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY user_id, recorded_date DESC;

-- Grant necessary permissions
GRANT ALL ON daily_symptom_entries TO authenticated;
GRANT ALL ON symptom_patterns TO authenticated;
GRANT ALL ON symptom_alerts TO authenticated;
GRANT SELECT ON symptom_alert_history TO authenticated;
GRANT SELECT ON symptom_food_correlations TO authenticated;
GRANT SELECT ON user_symptom_summary TO authenticated;
GRANT SELECT ON recent_symptom_trends TO authenticated;

-- Comment the tables for documentation
COMMENT ON TABLE daily_symptom_entries IS 'Daily symptom tracking entries with core symptoms: overall health, abdominal pain, diarrhea, bloody stool, bloating';
COMMENT ON TABLE symptom_patterns IS 'Computed pattern analysis and trends for user symptom data';
COMMENT ON TABLE symptom_alerts IS 'User-configurable alerts for symptom monitoring';
COMMENT ON TABLE symptom_alert_history IS 'History of triggered alerts and their resolutions';
COMMENT ON TABLE symptom_food_correlations IS 'Statistical correlations between foods and symptoms';