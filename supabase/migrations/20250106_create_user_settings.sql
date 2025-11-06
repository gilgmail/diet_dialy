-- Create user_settings table for storing user preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Timezone settings
    timezone TEXT NOT NULL DEFAULT 'Asia/Taipei',
    timezone_offset TEXT NOT NULL DEFAULT '+08:00',

    -- Health settings
    chronic_disease TEXT, -- 克隆氏症, 潰瘍性結腸炎, 腸躁症, 癌症治療中
    known_allergies TEXT[] DEFAULT '{}', -- 已知過敏原

    -- Notification settings
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    breakfast_time TEXT NOT NULL DEFAULT '08:00',
    lunch_time TEXT NOT NULL DEFAULT '12:30',
    dinner_time TEXT NOT NULL DEFAULT '18:30',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one settings record per user
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only read their own settings
CREATE POLICY "Users can view own settings"
    ON public.user_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings"
    ON public.user_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
    ON public.user_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete own settings"
    ON public.user_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER trigger_update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.user_settings IS 'User preferences and settings for DietDaily mobile app';
