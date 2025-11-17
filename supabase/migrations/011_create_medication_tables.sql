-- 011_create_medication_tables.sql
-- Phase A: medication catalog, regimen, administration, and cycle tracking

CREATE TABLE IF NOT EXISTS medication_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    route TEXT NOT NULL CHECK (route IN ('oral', 'injection', 'other')),
    is_injection BOOLEAN NOT NULL DEFAULT FALSE,
    default_interval_days INTEGER CHECK (default_interval_days > 0),
    default_dosage TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_regimens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    medication_id UUID REFERENCES medication_catalog(id) ON DELETE SET NULL,
    custom_name TEXT,
    route TEXT CHECK (route IN ('oral', 'injection', 'other')),
    frequency_type TEXT NOT NULL CHECK (frequency_type IN ('every_n_days', 'prn', 'cron')),
    interval_days INTEGER CHECK (interval_days > 0),
    cycle_anchor_date DATE NOT NULL,
    symptom_trigger_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    default_dose TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medication_regimens_user_status
    ON medication_regimens(user_id, status);

CREATE TABLE IF NOT EXISTS medication_administrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    regimen_id UUID NOT NULL REFERENCES medication_regimens(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dose TEXT,
    route TEXT CHECK (route IN ('oral', 'injection', 'other')),
    symptom_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    symptom_notes TEXT,
    adherence_status TEXT NOT NULL DEFAULT 'taken' CHECK (adherence_status IN ('taken', 'skipped', 'delayed', 'missed')),
    captured_via TEXT NOT NULL DEFAULT 'manual' CHECK (captured_via IN ('manual', 'reminder', 'wearable', 'imported')),
    vitals_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    side_effects JSONB NOT NULL DEFAULT '[]'::jsonb,
    detail_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medication_admin_regimen_taken
    ON medication_administrations(regimen_id, taken_at DESC);

CREATE TABLE IF NOT EXISTS medication_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    regimen_id UUID NOT NULL REFERENCES medication_regimens(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL,
    cycle_start_date DATE NOT NULL,
    expected_next_date DATE,
    actual_next_date DATE,
    provider_notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'skipped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(regimen_id, cycle_number)
);

CREATE INDEX IF NOT EXISTS idx_medication_cycles_regimen_status
    ON medication_cycles(regimen_id, status);

-- RLS policies for user-owned tables
ALTER TABLE medication_regimens ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_administrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own medication regimens" ON medication_regimens;
DROP POLICY IF EXISTS "Users can modify own medication regimens" ON medication_regimens;
CREATE POLICY "Users can view own medication regimens"
ON medication_regimens FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users can modify own medication regimens"
ON medication_regimens FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own medication administrations" ON medication_administrations;
DROP POLICY IF EXISTS "Users can modify own medication administrations" ON medication_administrations;
CREATE POLICY "Users can view own medication administrations"
ON medication_administrations FOR SELECT
USING (auth.uid() IN (
    SELECT mr.user_id FROM medication_regimens mr WHERE mr.id = medication_administrations.regimen_id
));
CREATE POLICY "Users can modify own medication administrations"
ON medication_administrations FOR ALL
USING (auth.uid() IN (
    SELECT mr.user_id FROM medication_regimens mr WHERE mr.id = medication_administrations.regimen_id
))
WITH CHECK (auth.uid() IN (
    SELECT mr.user_id FROM medication_regimens mr WHERE mr.id = medication_administrations.regimen_id
));

DROP POLICY IF EXISTS "Users can view own medication cycles" ON medication_cycles;
DROP POLICY IF EXISTS "Users can modify own medication cycles" ON medication_cycles;
CREATE POLICY "Users can view own medication cycles"
ON medication_cycles FOR SELECT
USING (auth.uid() IN (
    SELECT mr.user_id FROM medication_regimens mr WHERE mr.id = medication_cycles.regimen_id
));
CREATE POLICY "Users can modify own medication cycles"
ON medication_cycles FOR ALL
USING (auth.uid() IN (
    SELECT mr.user_id FROM medication_regimens mr WHERE mr.id = medication_cycles.regimen_id
))
WITH CHECK (auth.uid() IN (
    SELECT mr.user_id FROM medication_regimens mr WHERE mr.id = medication_cycles.regimen_id
));

COMMENT ON TABLE medication_catalog IS '藥物字典，提供名稱、劑型與預設頻率';
COMMENT ON TABLE medication_regimens IS '使用者個人的療程設定';
COMMENT ON TABLE medication_administrations IS '每次實際施打/服藥紀錄';
COMMENT ON TABLE medication_cycles IS '長期療程的週期追蹤（例如 28/56 天針劑）';
