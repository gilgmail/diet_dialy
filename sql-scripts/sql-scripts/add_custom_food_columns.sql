-- 為 food_entries 表添加自訂食物支持欄位
-- 運行此腳本來支持自訂食物的同步功能

-- 1. 添加自訂食物標記欄位
ALTER TABLE food_entries
ADD COLUMN IF NOT EXISTS is_custom_food BOOLEAN DEFAULT false;

-- 2. 添加自訂食物來源欄位
ALTER TABLE food_entries
ADD COLUMN IF NOT EXISTS custom_food_source TEXT;

-- 3. 添加食物分類欄位（用於更好地組織自訂食物）
ALTER TABLE food_entries
ADD COLUMN IF NOT EXISTS food_category TEXT;

-- 4. 為自訂食物欄位添加索引（提升查詢效能）
CREATE INDEX IF NOT EXISTS idx_food_entries_is_custom_food
ON food_entries(is_custom_food);

CREATE INDEX IF NOT EXISTS idx_food_entries_custom_food_source
ON food_entries(custom_food_source);

CREATE INDEX IF NOT EXISTS idx_food_entries_food_category
ON food_entries(food_category);

-- 5. 為現有記錄設置預設值（假設現有記錄都不是自訂食物）
UPDATE food_entries
SET is_custom_food = false,
    custom_food_source = null,
    food_category = '一般食物'
WHERE is_custom_food IS NULL;

-- 6. 添加欄位註釋
COMMENT ON COLUMN food_entries.is_custom_food IS '標記是否為用戶自訂的食物';
COMMENT ON COLUMN food_entries.custom_food_source IS '自訂食物來源：user_created, imported, ai_generated 等';
COMMENT ON COLUMN food_entries.food_category IS '食物分類，用於更好地組織和篩選食物';

-- 7. 驗證欄位是否成功添加
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'food_entries'
  AND column_name IN ('is_custom_food', 'custom_food_source', 'food_category')
ORDER BY column_name;