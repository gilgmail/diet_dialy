-- 台灣食物資料庫清理腳本
-- Taiwan Foods Database Cleanup Script
-- Generated on: 2025-09-21T23:01:08.785Z

-- 1. 移除被標記為非台灣食物的項目
DELETE FROM diet_daily_foods
WHERE taiwan_origin = true
  AND verification_status = 'flagged_non_taiwan';

-- 2. 查看需要修正的食物
SELECT id, name, category, verification_notes
FROM diet_daily_foods
WHERE taiwan_origin = true
  AND verification_status = 'needs_correction'
ORDER BY category, name;

-- 3. 統計清理後的台灣食物數量
SELECT
  category,
  COUNT(*) as food_count,
  verification_status
FROM diet_daily_foods
WHERE taiwan_origin = true
GROUP BY category, verification_status
ORDER BY category, verification_status;

-- 4. 建議的名稱修正 (需要手動執行)

-- 修正: 樂事 → 洋芋片
UPDATE diet_daily_foods
SET name = '洋芋片',
    name_en = 'Taiwan 洋芋片',
    verification_status = 'admin_approved',
    verification_notes = '已修正: 樂事是美國品牌，改為通用台式洋芋片'
WHERE taiwan_origin = true
  AND name = '樂事';

-- 修正: 品客 → 薯片
UPDATE diet_daily_foods
SET name = '薯片',
    name_en = 'Taiwan 薯片',
    verification_status = 'admin_approved',
    verification_notes = '已修正: 品客是國際品牌，改為通用名稱'
WHERE taiwan_origin = true
  AND name = '品客';

-- 修正: 多力多滋 → 玉米片
UPDATE diet_daily_foods
SET name = '玉米片',
    name_en = 'Taiwan 玉米片',
    verification_status = 'admin_approved',
    verification_notes = '已修正: 多力多滋是墨西哥品牌，改為通用名稱'
WHERE taiwan_origin = true
  AND name = '多力多滋';

-- 修正: 奇多 → 起司球
UPDATE diet_daily_foods
SET name = '起司球',
    name_en = 'Taiwan 起司球',
    verification_status = 'admin_approved',
    verification_notes = '已修正: 奇多是美國品牌，改為通用名稱'
WHERE taiwan_origin = true
  AND name = '奇多';

-- 修正: 康師傅 → 泡麵
UPDATE diet_daily_foods
SET name = '泡麵',
    name_en = 'Taiwan 泡麵',
    verification_status = 'admin_approved',
    verification_notes = '已修正: 康師傅是品牌名，改為通用泡麵'
WHERE taiwan_origin = true
  AND name = '康師傅';

-- 修正: 咖啡 → 台式咖啡
UPDATE diet_daily_foods
SET name = '台式咖啡',
    name_en = 'Taiwan 台式咖啡',
    verification_status = 'admin_approved',
    verification_notes = '已修正: 加上台式特色以區別於國際咖啡'
WHERE taiwan_origin = true
  AND name = '咖啡';

-- 修正: 啤酒 → 台灣啤酒
UPDATE diet_daily_foods
SET name = '台灣啤酒',
    name_en = 'Taiwan 台灣啤酒',
    verification_status = 'admin_approved',
    verification_notes = '已修正: 指定為台灣在地啤酒'
WHERE taiwan_origin = true
  AND name = '啤酒';

-- 修正: 章魚燒 → 花枝燒
UPDATE diet_daily_foods
SET name = '花枝燒',
    name_en = 'Taiwan 花枝燒',
    verification_status = 'admin_approved',
    verification_notes = '已修正: 台灣夜市實際是花枝燒而非日式章魚燒'
WHERE taiwan_origin = true
  AND name = '章魚燒';

-- 修正: 鯛魚燒 → 雞蛋糕
UPDATE diet_daily_foods
SET name = '雞蛋糕',
    name_en = 'Taiwan 雞蛋糕',
    verification_status = 'admin_approved',
    verification_notes = '已修正: 台灣傳統是雞蛋糕而非日式鯛魚燒'
WHERE taiwan_origin = true
  AND name = '鯛魚燒';

-- 修正: 大陸妹 → 萵苣
UPDATE diet_daily_foods
SET name = '萵苣',
    name_en = 'Taiwan 萵苣',
    verification_status = 'admin_approved',
    verification_notes = '已修正: 正確蔬菜名稱為萵苣'
WHERE taiwan_origin = true
  AND name = '大陸妹';

-- 5. 更新真實性標記
ALTER TABLE diet_daily_foods
ADD COLUMN IF NOT EXISTS authenticity_verified BOOLEAN DEFAULT FALSE;

UPDATE diet_daily_foods
SET authenticity_verified = TRUE
WHERE taiwan_origin = true
  AND verification_status = 'admin_approved';
