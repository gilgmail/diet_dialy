-- Diet Daily Supabase 數據庫 Schema
-- 建立日期: 2024年9月
-- 描述: 食物追蹤和醫療分析應用的完整數據庫結構

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 用戶資料表 (diet_daily_users)
CREATE TABLE diet_daily_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    google_id TEXT UNIQUE,
    name TEXT,
    avatar_url TEXT,

    -- 醫療資訊
    medical_conditions JSONB DEFAULT '[]'::jsonb,
    allergies JSONB DEFAULT '[]'::jsonb,
    dietary_restrictions JSONB DEFAULT '[]'::jsonb,
    medications JSONB DEFAULT '[]'::jsonb,

    -- 個人設定
    timezone TEXT DEFAULT 'Asia/Taipei',
    language TEXT DEFAULT 'zh-TW',
    preferences JSONB DEFAULT '{}'::jsonb,

    -- 管理員權限
    is_admin BOOLEAN DEFAULT FALSE,
    admin_permissions JSONB DEFAULT '[]'::jsonb,

    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 食物資料庫表 (diet_daily_foods)
CREATE TABLE diet_daily_foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_en TEXT,
    brand TEXT,
    category TEXT NOT NULL,

    -- 營養資訊 (每100g)
    calories DECIMAL(8,2),
    protein DECIMAL(8,2),
    carbohydrates DECIMAL(8,2),
    fat DECIMAL(8,2),
    fiber DECIMAL(8,2),
    sugar DECIMAL(8,2),
    sodium DECIMAL(8,2),

    -- 詳細營養成分
    nutrition_data JSONB DEFAULT '{}'::jsonb,

    -- 醫療風險評分
    medical_scores JSONB DEFAULT '{}'::jsonb,

    -- 常見過敏原
    allergens JSONB DEFAULT '[]'::jsonb,

    -- 食物標籤和屬性
    tags JSONB DEFAULT '[]'::jsonb,
    properties JSONB DEFAULT '{}'::jsonb,

    -- 驗證狀態
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    verified_by UUID REFERENCES diet_daily_users(id),
    verification_notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,

    -- 建立者資訊
    created_by UUID REFERENCES diet_daily_users(id),
    is_custom BOOLEAN DEFAULT FALSE,

    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 食物記錄表 (food_entries)
CREATE TABLE food_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    food_id UUID REFERENCES diet_daily_foods(id),

    -- 食物資訊
    food_name TEXT NOT NULL,
    food_category TEXT,
    amount DECIMAL(8,2) DEFAULT 100,
    unit TEXT DEFAULT 'g',

    -- 營養計算值
    calories DECIMAL(8,2),
    nutrition_data JSONB DEFAULT '{}'::jsonb,

    -- 醫療評分
    medical_score DECIMAL(3,1),
    medical_analysis JSONB DEFAULT '{}'::jsonb,

    -- 記錄時間
    consumed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),

    -- 症狀追蹤
    symptoms_before JSONB DEFAULT '[]'::jsonb,
    symptoms_after JSONB DEFAULT '[]'::jsonb,
    symptom_severity DECIMAL(2,1),

    -- 備註和照片
    notes TEXT,
    photo_url TEXT,
    location TEXT,

    -- 同步狀態
    sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'error')),

    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 醫療報告表 (medical_reports)
CREATE TABLE medical_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- 報告資訊
    title TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom')),
    date_range_start DATE NOT NULL,
    date_range_end DATE NOT NULL,

    -- 報告內容
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    analysis_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,

    -- 檔案資訊
    pdf_url TEXT,
    file_size INTEGER,

    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 症狀追蹤表 (symptom_tracking)
CREATE TABLE symptom_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,

    -- 症狀資訊
    symptom_type TEXT NOT NULL,
    severity DECIMAL(2,1) NOT NULL CHECK (severity >= 0 AND severity <= 10),
    description TEXT,

    -- 時間資訊
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER,

    -- 關聯食物記錄
    related_food_entry UUID REFERENCES food_entries(id),

    -- 額外資訊
    triggers JSONB DEFAULT '[]'::jsonb,
    medications_taken JSONB DEFAULT '[]'::jsonb,

    -- 時間戳記
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以優化查詢性能
CREATE INDEX idx_diet_daily_users_email ON diet_daily_users(email);
CREATE INDEX idx_diet_daily_users_google_id ON diet_daily_users(google_id);

CREATE INDEX idx_diet_daily_foods_category ON diet_daily_foods(category);
CREATE INDEX idx_diet_daily_foods_verification_status ON diet_daily_foods(verification_status);
CREATE INDEX idx_diet_daily_foods_created_by ON diet_daily_foods(created_by);

CREATE INDEX idx_food_entries_user_id ON food_entries(user_id);
CREATE INDEX idx_food_entries_consumed_at ON food_entries(consumed_at);
CREATE INDEX idx_food_entries_food_id ON food_entries(food_id);
CREATE INDEX idx_food_entries_sync_status ON food_entries(sync_status);

CREATE INDEX idx_medical_reports_user_id ON medical_reports(user_id);
CREATE INDEX idx_medical_reports_date_range ON medical_reports(date_range_start, date_range_end);

CREATE INDEX idx_symptom_tracking_user_id ON symptom_tracking(user_id);
CREATE INDEX idx_symptom_tracking_recorded_at ON symptom_tracking(recorded_at);

-- 建立更新時間戳記的觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON diet_daily_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foods_updated_at BEFORE UPDATE ON diet_daily_foods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_entries_updated_at BEFORE UPDATE ON food_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_reports_updated_at BEFORE UPDATE ON medical_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_symptom_tracking_updated_at BEFORE UPDATE ON symptom_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 行級安全性 (RLS) 政策
ALTER TABLE diet_daily_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_daily_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_tracking ENABLE ROW LEVEL SECURITY;

-- 用戶只能存取自己的資料
CREATE POLICY "Users can view own profile" ON diet_daily_users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON diet_daily_users
    FOR UPDATE USING (auth.uid() = id);

-- 食物資料庫的存取政策
CREATE POLICY "Anyone can view approved foods" ON diet_daily_foods
    FOR SELECT USING (verification_status = 'approved' OR created_by = auth.uid());

CREATE POLICY "Users can create custom foods" ON diet_daily_foods
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own custom foods" ON diet_daily_foods
    FOR UPDATE USING (created_by = auth.uid() AND is_custom = true);

-- 管理員可以驗證食物
CREATE POLICY "Admins can verify foods" ON diet_daily_foods
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM diet_daily_users
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- 食物記錄的存取政策
CREATE POLICY "Users can manage own food entries" ON food_entries
    FOR ALL USING (user_id = auth.uid());

-- 醫療報告的存取政策
CREATE POLICY "Users can manage own medical reports" ON medical_reports
    FOR ALL USING (user_id = auth.uid());

-- 症狀追蹤的存取政策
CREATE POLICY "Users can manage own symptom tracking" ON symptom_tracking
    FOR ALL USING (user_id = auth.uid());