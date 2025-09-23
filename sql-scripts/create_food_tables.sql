-- 創建食物日記必要的表格
-- 在 Supabase SQL Editor 中執行此腳本

-- 啟用 UUID 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 食物資料庫表 (diet_daily_foods)
CREATE TABLE IF NOT EXISTS diet_daily_foods (
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
CREATE TABLE IF NOT EXISTS food_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES diet_daily_users(id) ON DELETE CASCADE,
    food_id UUID REFERENCES diet_daily_foods(id),

    -- 食物資訊
    food_name TEXT NOT NULL,
    food_category TEXT,
    quantity DECIMAL(8,2) DEFAULT 100,
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

-- 建立索引以優化查詢性能
CREATE INDEX IF NOT EXISTS idx_diet_daily_foods_category ON diet_daily_foods(category);
CREATE INDEX IF NOT EXISTS idx_diet_daily_foods_verification_status ON diet_daily_foods(verification_status);
CREATE INDEX IF NOT EXISTS idx_diet_daily_foods_created_by ON diet_daily_foods(created_by);

CREATE INDEX IF NOT EXISTS idx_food_entries_user_id ON food_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_consumed_at ON food_entries(consumed_at);
CREATE INDEX IF NOT EXISTS idx_food_entries_food_id ON food_entries(food_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_sync_status ON food_entries(sync_status);

-- 建立更新時間戳記的觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 只建立尚未存在的觸發器
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'update_foods_updated_at'
    ) THEN
        CREATE TRIGGER update_foods_updated_at BEFORE UPDATE ON diet_daily_foods
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'update_food_entries_updated_at'
    ) THEN
        CREATE TRIGGER update_food_entries_updated_at BEFORE UPDATE ON food_entries
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 啟用行級安全性 (RLS)
ALTER TABLE diet_daily_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

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

-- 插入樣本食物資料
INSERT INTO diet_daily_foods (name, category, calories, protein, carbohydrates, fat, fiber, verification_status, medical_scores, allergens, tags) VALUES
('白米飯', '穀類', 130, 2.7, 28, 0.3, 0.4, 'approved', '{"ibd_score": 8, "safety_level": "safe"}', '[]', '["主食", "溫和"]'),
('香蕉', '水果', 89, 1.1, 23, 0.3, 2.6, 'approved', '{"ibd_score": 9, "safety_level": "safe"}', '[]', '["水果", "高鉀", "易消化"]'),
('蒸蛋', '蛋類', 155, 13, 1.1, 11, 0, 'approved', '{"ibd_score": 7, "safety_level": "safe"}', '["蛋"]', '["蛋白質", "易消化"]'),
('雞胸肉', '肉類', 165, 31, 0, 3.6, 0, 'approved', '{"ibd_score": 6, "safety_level": "safe"}', '[]', '["蛋白質", "低脂"]'),
('地瓜', '穀類', 86, 1.6, 20, 0.1, 3, 'approved', '{"ibd_score": 8, "safety_level": "safe"}', '[]', '["根莖類", "膳食纖維"]'),
('蘋果', '水果', 52, 0.3, 14, 0.2, 2.4, 'approved', '{"ibd_score": 8, "safety_level": "safe"}', '[]', '["水果", "維生素C"]'),
('白粥', '穀類', 30, 0.6, 6.8, 0.1, 0.1, 'approved', '{"ibd_score": 10, "safety_level": "safe"}', '[]', '["主食", "易消化", "溫和"]'),
('白吐司', '穀類', 265, 9, 49, 3.2, 2.7, 'approved', '{"ibd_score": 6, "safety_level": "caution"}', '["麩質", "小麥"]', '["主食", "麵包"])
ON CONFLICT (name) DO NOTHING;

-- 檢查插入結果
SELECT
    COUNT(*) as total_foods,
    COUNT(CASE WHEN verification_status = 'approved' THEN 1 END) as approved_foods
FROM diet_daily_foods;