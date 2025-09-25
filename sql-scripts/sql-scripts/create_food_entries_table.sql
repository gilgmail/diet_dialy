-- Create food_entries table for diet diary synchronization
-- This table stores individual food consumption records for users

CREATE TABLE IF NOT EXISTS public.food_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    food_id UUID REFERENCES public.diet_daily_foods(id) ON DELETE SET NULL,
    food_name TEXT NOT NULL,
    food_category TEXT,
    amount DECIMAL(10,2) NOT NULL DEFAULT 1.0,
    unit TEXT NOT NULL DEFAULT 'serving',
    calories DECIMAL(8,2),
    nutrition_data JSONB DEFAULT '{}',
    medical_score DECIMAL(3,2),
    medical_analysis JSONB DEFAULT '{}',
    consumed_at TIMESTAMPTZ NOT NULL,
    meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    symptoms_before JSONB DEFAULT '{}',
    symptoms_after JSONB DEFAULT '{}',
    symptom_severity INTEGER CHECK (symptom_severity >= 0 AND symptom_severity <= 10),
    notes TEXT,
    photo_url TEXT,
    location TEXT,
    sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'error')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_food_entries_user_id ON public.food_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_consumed_at ON public.food_entries(consumed_at);
CREATE INDEX IF NOT EXISTS idx_food_entries_user_consumed ON public.food_entries(user_id, consumed_at);
CREATE INDEX IF NOT EXISTS idx_food_entries_meal_type ON public.food_entries(meal_type);
CREATE INDEX IF NOT EXISTS idx_food_entries_sync_status ON public.food_entries(sync_status);

-- Enable Row Level Security
ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own food entries
CREATE POLICY "Users can view own food entries" ON public.food_entries
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own food entries
CREATE POLICY "Users can insert own food entries" ON public.food_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own food entries
CREATE POLICY "Users can update own food entries" ON public.food_entries
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own food entries
CREATE POLICY "Users can delete own food entries" ON public.food_entries
    FOR DELETE USING (auth.uid() = user_id);

-- Admin users can view all food entries
CREATE POLICY "Admins can view all food entries" ON public.food_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.diet_daily_users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_food_entries_updated_at
    BEFORE UPDATE ON public.food_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get user food entries by date
CREATE OR REPLACE FUNCTION get_user_food_entries_by_date(
    p_user_id UUID,
    p_date DATE
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    food_id UUID,
    food_name TEXT,
    food_category TEXT,
    amount DECIMAL,
    unit TEXT,
    calories DECIMAL,
    nutrition_data JSONB,
    medical_score DECIMAL,
    medical_analysis JSONB,
    consumed_at TIMESTAMPTZ,
    meal_type TEXT,
    symptoms_before JSONB,
    symptoms_after JSONB,
    symptom_severity INTEGER,
    notes TEXT,
    photo_url TEXT,
    location TEXT,
    sync_status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT fe.id, fe.user_id, fe.food_id, fe.food_name, fe.food_category,
           fe.amount, fe.unit, fe.calories, fe.nutrition_data, fe.medical_score,
           fe.medical_analysis, fe.consumed_at, fe.meal_type, fe.symptoms_before,
           fe.symptoms_after, fe.symptom_severity, fe.notes, fe.photo_url,
           fe.location, fe.sync_status, fe.created_at, fe.updated_at
    FROM public.food_entries fe
    WHERE fe.user_id = p_user_id
      AND DATE(fe.consumed_at) = p_date
    ORDER BY fe.consumed_at DESC;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.food_entries TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_food_entries_by_date TO authenticated;

-- Comment on table
COMMENT ON TABLE public.food_entries IS 'Store individual food consumption records for diet tracking with offline sync support';