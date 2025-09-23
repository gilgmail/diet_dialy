-- 簡化版台灣食物資料庫導入
-- 包含 50 種最常見的台灣食物
-- 適合快速測試和初始設定

-- 插入基本台灣食物資料
INSERT INTO diet_daily_foods (
    name, name_en, category,
    calories, protein, carbohydrates, fat, fiber, sugar, sodium,
    verification_status, taiwan_origin, is_custom
) VALUES
-- 主食類
('白米飯', 'White Rice', '主食', 130, 2.7, 28, 0.3, 0.4, 0.1, 5, 'approved', true, false),
('糙米飯', 'Brown Rice', '主食', 111, 2.6, 23, 0.9, 1.8, 0.4, 5, 'approved', true, false),
('白麵條', 'White Noodles', '主食', 138, 4.6, 27.4, 0.9, 1.2, 0.7, 3, 'approved', true, false),
('米粉', 'Rice Vermicelli', '主食', 193, 3.4, 42.2, 0.7, 0.9, 0.2, 9, 'approved', true, false),
('饅頭', 'Steamed Bun', '主食', 233, 7.4, 47, 1.2, 1.8, 5.2, 328, 'approved', true, false),

-- 蔬菜類
('高麗菜', 'Cabbage', '蔬菜', 25, 1.3, 5.8, 0.1, 2.5, 3.2, 18, 'approved', true, false),
('青江菜', 'Bok Choy', '蔬菜', 13, 1.5, 2.2, 0.2, 1, 1.2, 65, 'approved', true, false),
('菠菜', 'Spinach', '蔬菜', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79, 'approved', true, false),
('地瓜葉', 'Sweet Potato Leaves', '蔬菜', 30, 3, 4.5, 0.3, 3.3, 0.9, 6, 'approved', true, false),
('空心菜', 'Water Spinach', '蔬菜', 19, 2.6, 2.8, 0.2, 2.1, 0.9, 113, 'approved', true, false),

-- 水果類
('蘋果', 'Apple', '水果', 52, 0.3, 13.8, 0.2, 2.4, 10.4, 1, 'approved', true, false),
('香蕉', 'Banana', '水果', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 1, 'approved', true, false),
('橘子', 'Orange', '水果', 47, 0.9, 11.8, 0.1, 2.4, 9.4, 0, 'approved', true, false),
('芭樂', 'Guava', '水果', 68, 2.6, 14.3, 0.9, 5.4, 8.9, 2, 'approved', true, false),
('木瓜', 'Papaya', '水果', 43, 0.5, 10.8, 0.3, 1.7, 7.8, 8, 'approved', true, false),

-- 蛋白質類
('雞胸肉', 'Chicken Breast', '肉類', 165, 31, 0, 3.6, 0, 0, 74, 'approved', true, false),
('豬里肌', 'Pork Tenderloin', '肉類', 143, 26.9, 0, 3.5, 0, 0, 58, 'approved', true, false),
('鮭魚', 'Salmon', '海鮮', 208, 25.4, 0, 12.4, 0, 0, 44, 'approved', true, false),
('虱目魚', 'Milkfish', '海鮮', 140, 20.2, 0, 6.7, 0, 0, 78, 'approved', true, false),
('雞蛋', 'Egg', '蛋類', 155, 12.6, 0.7, 10.6, 0, 0.4, 124, 'approved', true, false),

-- 豆類製品
('板豆腐', 'Firm Tofu', '豆製品', 70, 8.1, 1.9, 4.2, 0.4, 0.6, 7, 'approved', true, false),
('嫩豆腐', 'Silken Tofu', '豆製品', 55, 4.8, 2.3, 3.5, 0.2, 1.2, 9, 'approved', true, false),
('豆漿', 'Soy Milk', '豆製品', 54, 3.3, 4.6, 2.9, 0.6, 3.0, 3, 'approved', true, false),
('黃豆', 'Soybean', '豆類', 446, 36.5, 30.2, 19.9, 15.7, 7.3, 2, 'approved', true, false),

-- 台式小吃
('滷肉飯', 'Braised Pork Rice', '台式料理', 285, 12.4, 38.7, 8.9, 1.2, 2.1, 825, 'approved', true, false),
('牛肉麵', 'Beef Noodle Soup', '台式料理', 420, 25.8, 45.2, 15.6, 2.8, 3.4, 1250, 'approved', true, false),
('雞肉飯', 'Chicken Rice', '台式料理', 312, 18.7, 42.1, 7.8, 1.5, 1.8, 680, 'approved', true, false),
('排骨便當', 'Pork Chop Bento', '台式料理', 650, 28.5, 65.4, 28.9, 3.2, 4.1, 1150, 'approved', true, false),
('蚵仔煎', 'Oyster Omelet', '夜市小吃', 230, 7.4, 38.3, 7.3, 1.8, 5.2, 650, 'approved', true, false),

-- 湯品類
('味噌湯', 'Miso Soup', '湯品', 84, 6, 7, 3.3, 1.2, 3.8, 902, 'approved', true, false),
('蛋花湯', 'Egg Drop Soup', '湯品', 73, 4.4, 4.7, 3.9, 0.2, 1.2, 849, 'approved', true, false),
('紫菜蛋花湯', 'Seaweed Egg Soup', '湯品', 56, 3.8, 3.2, 3.1, 0.8, 0.9, 623, 'approved', true, false),

-- 傳統點心
('紅豆湯', 'Red Bean Soup', '甜品', 128, 7.3, 23, 0.5, 7.4, 13.2, 6, 'approved', true, false),
('綠豆湯', 'Mung Bean Soup', '甜品', 105, 7.6, 18.1, 0.4, 7.6, 2.0, 2, 'approved', true, false),
('豆花', 'Tofu Pudding', '甜品', 88, 4.6, 12.8, 2.8, 0.3, 10.2, 8, 'approved', true, false),
('愛玉', 'Aiyu Jelly', '甜品', 41, 0.1, 10.6, 0.1, 1.8, 8.2, 3, 'approved', true, false),

-- 飲品類
('珍珠奶茶', 'Bubble Tea', '飲品', 231, 3.8, 45.2, 4.6, 0.8, 38.4, 87, 'approved', true, false),
('豆漿', 'Soy Milk', '飲品', 54, 3.3, 4.6, 2.9, 0.6, 3.0, 3, 'approved', true, false),
('青草茶', 'Herbal Tea', '飲品', 12, 0.1, 3.1, 0, 0.1, 2.8, 2, 'approved', true, false),
('冬瓜茶', 'Winter Melon Tea', '飲品', 68, 0.2, 17.1, 0.1, 0.3, 16.5, 5, 'approved', true, false),

-- 醃製品
('泡菜', 'Kimchi', '醃製品', 23, 2.0, 3.9, 0.5, 1.6, 2.4, 747, 'approved', true, false),
('酸菜', 'Pickled Mustard Green', '醃製品', 19, 1.5, 3.4, 0.2, 1.8, 1.8, 425, 'approved', true, false),

-- 堅果類
('花生', 'Peanuts', '堅果', 567, 25.8, 16.1, 49.2, 8.5, 4.7, 18, 'approved', true, false),
('核桃', 'Walnuts', '堅果', 654, 15.2, 13.7, 65.2, 6.7, 2.6, 2, 'approved', true, false),

-- 調味料
('醬油', 'Soy Sauce', '調味料', 8, 1.3, 0.8, 0, 0, 0.4, 5493, 'approved', true, false),
('蠔油', 'Oyster Sauce', '調味料', 51, 2.1, 12.2, 0.2, 0.1, 11.0, 3042, 'approved', true, false),

-- 零食類
('蝦餅', 'Shrimp Crackers', '零食', 516, 2.4, 60.1, 29.4, 0.9, 1.8, 1372, 'approved', true, false),
('鳳梨酥', 'Pineapple Cake', '糕點', 418, 5.2, 58.3, 18.6, 1.4, 35.2, 198, 'approved', true, false),
('太陽餅', 'Sun Cake', '糕點', 445, 6.8, 65.4, 17.2, 2.1, 28.9, 165, 'approved', true, false);

-- 驗證導入結果
SELECT COUNT(*) as imported_foods_count FROM diet_daily_foods WHERE taiwan_origin = true;