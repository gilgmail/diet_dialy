-- 食物資料庫表
-- 儲存常見食物的營養資訊供搜尋和自動完成使用

CREATE TABLE IF NOT EXISTS foods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  serving_size TEXT,
  calories INTEGER,
  protein DECIMAL(10, 2),
  carbohydrates DECIMAL(10, 2),
  fat DECIMAL(10, 2),
  fiber DECIMAL(10, 2),
  sugar DECIMAL(10, 2),
  sodium INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 創建索引以優化搜尋效能
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);

-- 新增 RLS 策略（食物資料庫公開可讀）
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Foods are viewable by everyone"
  ON foods FOR SELECT
  USING (true);

-- 只有管理員可以新增/修改食物資料
CREATE POLICY "Only admins can insert foods"
  ON foods FOR INSERT
  WITH CHECK (false); -- 暫時禁止一般用戶新增，未來可設置管理員角色

CREATE POLICY "Only admins can update foods"
  ON foods FOR UPDATE
  USING (false);

CREATE POLICY "Only admins can delete foods"
  ON foods FOR DELETE
  USING (false);

-- 插入常見台灣食物資料
INSERT INTO foods (name, category, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium) VALUES
  -- 主食類
  ('白飯', '主食', '1碗 (140g)', 130, 2.6, 28.7, 0.3, 0.4, 0, 1),
  ('糙米飯', '主食', '1碗 (140g)', 110, 2.8, 24.0, 1.0, 2.0, 0, 1),
  ('麵條', '主食', '1碗 (140g)', 140, 4.5, 28.0, 1.0, 1.2, 0, 200),
  ('吐司', '主食', '1片 (30g)', 80, 2.5, 14.0, 1.0, 0.8, 2.0, 150),
  ('地瓜', '主食', '1條 (100g)', 86, 1.6, 20.1, 0.1, 3.0, 4.2, 55),

  -- 蛋白質類
  ('雞胸肉', '蛋白質', '100g', 165, 31.0, 0, 3.6, 0, 0, 74),
  ('雞腿肉', '蛋白質', '100g', 209, 26.0, 0, 11.0, 0, 0, 90),
  ('豬里肌', '蛋白質', '100g', 143, 21.0, 0, 6.0, 0, 0, 62),
  ('牛肉', '蛋白質', '100g', 250, 26.0, 0, 15.0, 0, 0, 72),
  ('鮭魚', '蛋白質', '100g', 208, 20.0, 0, 13.0, 0, 0, 59),
  ('鯖魚', '蛋白質', '100g', 205, 19.0, 0, 14.0, 0, 0, 90),
  ('雞蛋', '蛋白質', '1顆 (50g)', 78, 6.3, 0.6, 5.3, 0, 0, 62),
  ('豆腐', '蛋白質', '1塊 (100g)', 76, 8.1, 1.9, 4.8, 0.3, 0, 7),
  ('豆漿', '蛋白質', '1杯 (240ml)', 80, 7.0, 4.0, 4.0, 1.0, 2.0, 90),

  -- 蔬菜類
  ('青菜', '蔬菜', '1碗 (100g)', 25, 2.5, 4.0, 0.3, 2.0, 1.0, 50),
  ('高麗菜', '蔬菜', '1碗 (100g)', 25, 1.3, 5.8, 0.1, 2.5, 3.2, 18),
  ('花椰菜', '蔬菜', '1碗 (100g)', 34, 2.8, 7.0, 0.4, 2.6, 1.5, 33),
  ('紅蘿蔔', '蔬菜', '1根 (60g)', 25, 0.6, 6.0, 0.1, 1.7, 2.9, 42),
  ('番茄', '蔬菜', '1顆 (100g)', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5),
  ('小黃瓜', '蔬菜', '1條 (100g)', 16, 0.7, 3.6, 0.1, 0.5, 1.7, 2),

  -- 水果類
  ('香蕉', '水果', '1根 (120g)', 105, 1.3, 27.0, 0.4, 3.1, 14.0, 1),
  ('蘋果', '水果', '1顆 (182g)', 95, 0.5, 25.0, 0.3, 4.4, 19.0, 2),
  ('芭樂', '水果', '1顆 (160g)', 68, 2.6, 14.3, 0.9, 8.9, 8.9, 2),
  ('橘子', '水果', '1顆 (131g)', 62, 1.2, 15.4, 0.2, 3.1, 12.0, 0),
  ('葡萄', '水果', '1串 (92g)', 62, 0.6, 16.0, 0.3, 0.8, 15.0, 2),
  ('西瓜', '水果', '1片 (280g)', 84, 1.7, 21.0, 0.4, 1.1, 17.0, 3),

  -- 乳製品
  ('牛奶', '乳製品', '1杯 (240ml)', 150, 8.0, 12.0, 8.0, 0, 12.0, 105),
  ('優格', '乳製品', '1杯 (200g)', 100, 10.0, 13.0, 2.5, 0, 9.0, 115),
  ('起司', '乳製品', '1片 (28g)', 113, 7.0, 0.4, 9.3, 0, 0.2, 177),

  -- 堅果類
  ('杏仁', '堅果', '1把 (28g)', 164, 6.0, 6.0, 14.0, 3.5, 1.2, 0),
  ('核桃', '堅果', '1把 (28g)', 185, 4.3, 3.9, 18.5, 1.9, 0.7, 1),
  ('腰果', '堅果', '1把 (28g)', 157, 5.2, 8.6, 12.4, 0.9, 1.7, 3),

  -- 點心/零食
  ('餅乾', '點心', '5片 (30g)', 130, 2.0, 18.0, 5.0, 0.5, 4.0, 120),
  ('蛋糕', '點心', '1片 (80g)', 290, 4.0, 37.0, 14.0, 0.8, 25.0, 220),
  ('麵包', '點心', '1片 (35g)', 95, 3.0, 17.0, 1.5, 1.0, 2.5, 150)
ON CONFLICT DO NOTHING;

-- 新增更新時間觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_foods_updated_at
    BEFORE UPDATE ON foods
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE foods IS '食物資料庫 - 儲存常見食物的營養資訊';
COMMENT ON COLUMN foods.name IS '食物名稱';
COMMENT ON COLUMN foods.category IS '食物分類：主食、蛋白質、蔬菜、水果、乳製品、堅果、點心';
COMMENT ON COLUMN foods.serving_size IS '標準份量';
COMMENT ON COLUMN foods.calories IS '熱量 (kcal)';
COMMENT ON COLUMN foods.protein IS '蛋白質 (g)';
COMMENT ON COLUMN foods.carbohydrates IS '碳水化合物 (g)';
COMMENT ON COLUMN foods.fat IS '脂肪 (g)';
COMMENT ON COLUMN foods.fiber IS '膳食纖維 (g)';
COMMENT ON COLUMN foods.sugar IS '糖 (g)';
COMMENT ON COLUMN foods.sodium IS '鈉 (mg)';
