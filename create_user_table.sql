-- 建立 diet_daily_users 資料表
CREATE TABLE IF NOT EXISTS diet_daily_users (
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

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_diet_daily_users_email ON diet_daily_users(email);
CREATE INDEX IF NOT EXISTS idx_diet_daily_users_google_id ON diet_daily_users(google_id);

-- 啟用 Row Level Security
ALTER TABLE diet_daily_users ENABLE ROW LEVEL SECURITY;

-- 用戶只能存取自己的資料
DROP POLICY IF EXISTS "Users can view own profile" ON diet_daily_users;
CREATE POLICY "Users can view own profile" ON diet_daily_users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON diet_daily_users;
CREATE POLICY "Users can update own profile" ON diet_daily_users
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON diet_daily_users;
CREATE POLICY "Users can insert own profile" ON diet_daily_users
    FOR INSERT WITH CHECK (auth.uid() = id);