-- 台灣食物資料庫重複項目清理腳本
-- Taiwan Foods Database Duplicate Cleanup Script
-- Generated on: 2025-09-22
-- 針對已匯入的21批次資料進行重複清理

-- =============================================================================
-- 重要說明：
-- 1. 此腳本會刪除重複的食物項目，保留每個食物的第一筆記錄（最小ID）
-- 2. 執行前請確保已備份資料庫
-- 3. 建議先在測試環境執行
-- =============================================================================

-- 1. 檢查當前重複食物統計
SELECT
    name,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as duplicate_ids
FROM diet_daily_foods
WHERE taiwan_origin = true
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, name;

-- 2. 顯示重複食物的詳細信息
WITH duplicate_foods AS (
    SELECT
        name,
        id,
        category,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) as row_num
    FROM diet_daily_foods
    WHERE taiwan_origin = true
),
duplicates_detail AS (
    SELECT * FROM duplicate_foods WHERE name IN (
        SELECT name FROM duplicate_foods GROUP BY name HAVING COUNT(*) > 1
    )
)
SELECT
    name,
    id,
    category,
    created_at,
    row_num,
    CASE WHEN row_num = 1 THEN '保留' ELSE '刪除' END as action
FROM duplicates_detail
ORDER BY name, row_num;

-- 3. 創建備份表（執行清理前）
CREATE TABLE IF NOT EXISTS diet_daily_foods_backup_before_cleanup AS
SELECT * FROM diet_daily_foods WHERE taiwan_origin = true;

-- 4. 執行重複清理 - 刪除重複項目（保留最小ID）
-- 注意：這個操作不可逆，請確保已備份

-- 刪除街頭小吃類重複項目
DELETE FROM diet_daily_foods
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) as row_num
        FROM diet_daily_foods
        WHERE taiwan_origin = true
          AND name IN (
              '鐵蛋', '珍珠奶茶', '棺材板', '蚵仔煎', '鹽酥雞', '雞排', '臭豆腐'
          )
    ) ranked
    WHERE row_num > 1
);

-- 刪除傳統點心類重複項目
DELETE FROM diet_daily_foods
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) as row_num
        FROM diet_daily_foods
        WHERE taiwan_origin = true
          AND name IN (
              '太陽餅', '鳳梨酥', '芝麻糖', '牛軋糖', '花生糖'
          )
    ) ranked
    WHERE row_num > 1
);

-- 刪除台菜餐廳料理類重複項目
DELETE FROM diet_daily_foods
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) as row_num
        FROM diet_daily_foods
        WHERE taiwan_origin = true
          AND name IN (
              '雞肉飯', '蒸蛋', '虱目魚湯', '土魠魚羹', '口水雞', '牛肉麵',
              '糖醋排骨', '紅燒排骨', '白灼蝦', '椒鹽蝦', '瘦肉粥', '蚵仔粥',
              '滷蛋', '滷豆腐'
          )
    ) ranked
    WHERE row_num > 1
);

-- 刪除零食加工食品類重複項目
DELETE FROM diet_daily_foods
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) as row_num
        FROM diet_daily_foods
        WHERE taiwan_origin = true
          AND name IN (
              '科學麵', '王子麵', '統一麵', '維力炸醬麵', '魷魚絲', '泡麵', '意麵'
          )
    ) ranked
    WHERE row_num > 1
);

-- 刪除海鮮肉類重複項目
DELETE FROM diet_daily_foods
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) as row_num
        FROM diet_daily_foods
        WHERE taiwan_origin = true
          AND name IN (
              '石斑魚', '鮭魚', '蝦子', '螃蟹', '花蟹', '石蟹',
              '蛤蜊', '花枝', '魷魚', '山豬肉'
          )
    ) ranked
    WHERE row_num > 1
);

-- 刪除蔬菜類重複項目
DELETE FROM diet_daily_foods
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) as row_num
        FROM diet_daily_foods
        WHERE taiwan_origin = true
          AND name = '青花菜'
    ) ranked
    WHERE row_num > 1
);

-- 刪除醃製乾貨類重複項目
DELETE FROM diet_daily_foods
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) as row_num
        FROM diet_daily_foods
        WHERE taiwan_origin = true
          AND name IN (
              '紫菜', '皮蛋', '鹹鴨蛋', '海帶', '昆布', '海苔',
              '葡萄乾', '芒果乾', '鳳梨乾'
          )
    ) ranked
    WHERE row_num > 1
);

-- 5. 通用重複清理（處理可能遺漏的項目）
-- 這個查詢會找到並刪除所有剩餘的重複項目
DELETE FROM diet_daily_foods
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (PARTITION BY name ORDER BY id) as row_num
        FROM diet_daily_foods
        WHERE taiwan_origin = true
    ) ranked
    WHERE row_num > 1
);

-- 6. 清理後的驗證查詢
-- 檢查是否還有重複項目
SELECT
    name,
    COUNT(*) as count
FROM diet_daily_foods
WHERE taiwan_origin = true
GROUP BY name
HAVING COUNT(*) > 1;

-- 7. 清理後的統計報告
SELECT
    '清理完成統計' as report_type,
    COUNT(*) as total_taiwan_foods,
    COUNT(DISTINCT name) as unique_food_names,
    CASE
        WHEN COUNT(*) = COUNT(DISTINCT name) THEN '✅ 無重複'
        ELSE '⚠️ 仍有重複'
    END as duplicate_status
FROM diet_daily_foods
WHERE taiwan_origin = true;

-- 8. 按分類統計清理後的食物數量
SELECT
    category,
    COUNT(*) as food_count
FROM diet_daily_foods
WHERE taiwan_origin = true
GROUP BY category
ORDER BY food_count DESC;

-- 9. 被刪除項目的統計（與備份表比較）
SELECT
    '刪除項目統計' as report_type,
    (SELECT COUNT(*) FROM diet_daily_foods_backup_before_cleanup) as original_count,
    (SELECT COUNT(*) FROM diet_daily_foods WHERE taiwan_origin = true) as current_count,
    (SELECT COUNT(*) FROM diet_daily_foods_backup_before_cleanup) -
    (SELECT COUNT(*) FROM diet_daily_foods WHERE taiwan_origin = true) as deleted_count;

-- =============================================================================
-- 清理完成檢查清單：
-- =============================================================================
-- [ ] 1. 備份表已創建
-- [ ] 2. 重複項目已清理
-- [ ] 3. 驗證查詢顯示無重複
-- [ ] 4. 總數量符合預期（應為959個唯一食物）
-- [ ] 5. 各分類數量合理
--
-- 如需恢復，可使用備份表：
-- INSERT INTO diet_daily_foods
-- SELECT * FROM diet_daily_foods_backup_before_cleanup
-- WHERE id NOT IN (SELECT id FROM diet_daily_foods WHERE taiwan_origin = true);
-- =============================================================================

-- 完成時間戳記
SELECT
    'Taiwan Foods Database Cleanup Completed' as status,
    NOW() as completion_time,
    COUNT(*) as final_unique_foods
FROM diet_daily_foods
WHERE taiwan_origin = true;