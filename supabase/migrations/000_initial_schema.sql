-- 000_initial_schema.sql
-- 基礎 schema，創建必要的表和擴展

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 創建 diet_daily_users 表
CREATE TABLE IF NOT EXISTS diet_daily_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建 diet_daily_foods 表（食物主表）
CREATE TABLE IF NOT EXISTS diet_daily_foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建 food_entries 表（用戶食物記錄）
CREATE TABLE IF NOT EXISTS food_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    food_id UUID REFERENCES diet_daily_foods(id),
    food_name TEXT NOT NULL,
    portion_size TEXT,
    consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 創建通用 updated_at 觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_food_entries_user_id ON food_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_consumed_at ON food_entries(consumed_at);
CREATE INDEX IF NOT EXISTS idx_food_entries_food_id ON food_entries(food_id);
CREATE INDEX IF NOT EXISTS idx_diet_daily_foods_name ON diet_daily_foods(name);

-- 創建觸發器（使用 DROP IF EXISTS 避免重複）
DROP TRIGGER IF EXISTS update_users_updated_at ON diet_daily_users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON diet_daily_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_foods_updated_at ON diet_daily_foods;
CREATE TRIGGER update_foods_updated_at
    BEFORE UPDATE ON diet_daily_foods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_food_entries_updated_at ON food_entries;
CREATE TRIGGER update_food_entries_updated_at
    BEFORE UPDATE ON food_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
