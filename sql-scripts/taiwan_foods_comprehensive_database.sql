-- 台灣常見食物和食材綜合資料庫
-- 包含營養資訊與多疾病評分 (IBD, IBS, 癌症化療, 過敏)

-- 插入台灣常見食物資料
INSERT INTO diet_daily_foods (
    name, name_en, category, calories, protein, carbohydrates, fat, fiber, sugar, sodium,
    nutrition_data, condition_scores, food_properties, trigger_analysis,
    allergens, tags, taiwan_origin, verification_status, is_custom
) VALUES

-- ========== 主食類 ==========
('糙米飯', 'Brown Rice', '主食', 112, 2.3, 23, 0.9, 1.8, 0.4, 5,
'{"glycemic_index": 50, "manganese": 1.1, "magnesium": 44, "b_vitamins": "high"}',
'{"ibd": {"acute_phase": 2, "remission_phase": 4, "general_safety": 3}, "ibs": {"general_safety": 3, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 3, "nausea_friendly": 4, "nutrition_density": 4}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "mixed", "cooking_methods": ["steamed"], "texture": "firm", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"主食", "全穀物", "高纖維", "台灣常見"}', true, 'admin_approved', false),

('小米粥', 'Millet Porridge', '主食', 119, 3.5, 23, 1.2, 1.3, 1.7, 2,
'{"protein_quality": "complete", "iron": 0.6, "magnesium": 114, "gluten_free": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "very_low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 3, "nausea_friendly": 5, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "soluble", "cooking_methods": ["boiled"], "texture": "very_soft", "acidity": "neutral", "spice_level": "none", "fat_type": "unsaturated", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"主食", "原住民食材", "無麩質", "易消化"}', true, 'admin_approved', false),

('地瓜', 'Sweet Potato', '主食', 86, 1.6, 20, 0.1, 3, 4.2, 54,
'{"beta_carotene": 8509, "vitamin_c": 2.4, "potassium": 337, "antioxidants": "high"}',
'{"ibd": {"acute_phase": 3, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 3, "fodmap_level": "moderate", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 4, "nausea_friendly": 4, "nutrition_density": 4}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "mixed", "cooking_methods": ["steamed", "boiled", "roasted"], "texture": "soft", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": true, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"主食", "根莖類", "維生素A豐富", "抗氧化"}', true, 'admin_approved', false),

('芋頭', 'Taro Root', '主食', 112, 1.5, 27, 0.2, 4.1, 0.4, 11,
'{"potassium": 591, "vitamin_e": 2.4, "folate": 22, "resistant_starch": "present"}',
'{"ibd": {"acute_phase": 3, "remission_phase": 4, "general_safety": 3}, "ibs": {"general_safety": 3, "fodmap_level": "moderate", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 3, "nausea_friendly": 4, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 4, "allergen_free_confidence": 4}}',
'{"fiber_type": "mixed", "cooking_methods": ["steamed", "boiled"], "texture": "soft", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": true, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"主食", "根莖類", "傳統食材", "鉀含量高"}', true, 'admin_approved', false),

-- ========== 蛋白質類 ==========
('豆腐', 'Tofu', '蛋白質', 76, 8, 1.9, 4.8, 0.3, 0.7, 7,
'{"isoflavones": 20, "calcium": 350, "iron": 5.4, "complete_protein": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 4, "nausea_friendly": 4, "nutrition_density": 4}, "allergies": {"cross_contamination_risk": 3, "allergen_free_confidence": 3}}',
'{"fiber_type": "minimal", "cooking_methods": ["steamed", "boiled", "pan_fried"], "texture": "soft", "acidity": "neutral", "spice_level": "none", "fat_type": "unsaturated", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": true, "high_fodmap": false, "common_allergens": ["soy"], "artificial_additives": false}',
'{"soy"}', '{"蛋白質", "植物性", "高鈣", "異黃酮"}', true, 'admin_approved', false),

('魚片(清蒸)', 'Steamed Fish Fillet', '蛋白質', 206, 22, 0, 12, 0, 0, 59,
'{"omega_3": 1.8, "vitamin_d": 388, "selenium": 36.5, "high_quality_protein": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 5, "general_safety": 5}, "ibs": {"general_safety": 5, "fodmap_level": "low", "trigger_risk": "very_low"}, "cancer_chemo": {"general_safety": 5, "immune_support": 5, "nausea_friendly": 4, "nutrition_density": 5}, "allergies": {"cross_contamination_risk": 3, "allergen_free_confidence": 3}}',
'{"fiber_type": "none", "cooking_methods": ["steamed"], "texture": "soft", "acidity": "neutral", "spice_level": "none", "fat_type": "omega_3", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": ["fish"], "artificial_additives": false}',
'{"fish"}', '{"蛋白質", "Omega-3", "低脂", "維生素D"}', true, 'admin_approved', false),

('蛤蠣湯', 'Clam Soup', '蛋白質', 148, 25.6, 5.1, 2, 0, 0.6, 1022,
'{"iron": 24, "vitamin_b12": 49.4, "zinc": 1.4, "taurine": "high"}',
'{"ibd": {"acute_phase": 3, "remission_phase": 4, "general_safety": 3}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 3, "immune_support": 4, "nausea_friendly": 3, "nutrition_density": 5}, "allergies": {"cross_contamination_risk": 2, "allergen_free_confidence": 2}}',
'{"fiber_type": "none", "cooking_methods": ["boiled"], "texture": "soft", "acidity": "neutral", "spice_level": "mild", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": ["shellfish"], "artificial_additives": false}',
'{"shellfish"}', '{"蛋白質", "海鮮", "高鐵", "維生素B12"}', true, 'admin_approved', false),

('虱目魚湯', 'Milkfish Soup', '蛋白質', 162, 20.1, 0, 8.4, 0, 0, 88,
'{"omega_3": 0.9, "calcium": 20, "phosphorus": 204, "local_favorite": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 4, "nausea_friendly": 4, "nutrition_density": 4}, "allergies": {"cross_contamination_risk": 3, "allergen_free_confidence": 3}}',
'{"fiber_type": "none", "cooking_methods": ["boiled"], "texture": "soft", "acidity": "neutral", "spice_level": "mild", "fat_type": "omega_3", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": ["fish"], "artificial_additives": false}',
'{"fish"}', '{"蛋白質", "台灣特色", "清湯", "溫和"}', true, 'admin_approved', false),

-- ========== 蔬菜類 ==========
('高麗菜', 'Cabbage', '蔬菜', 25, 1.3, 5.8, 0.1, 2.5, 3.2, 18,
'{"vitamin_c": 36.6, "vitamin_k": 76, "folate": 43, "glucosinolates": "present"}',
'{"ibd": {"acute_phase": 3, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 3, "fodmap_level": "moderate", "trigger_risk": "moderate"}, "cancer_chemo": {"general_safety": 4, "immune_support": 4, "nausea_friendly": 4, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "mixed", "cooking_methods": ["steamed", "boiled", "stir_fried"], "texture": "firm", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"蔬菜", "維生素C", "抗癌", "台灣常見"}', true, 'admin_approved', false),

('菠菜', 'Spinach', '蔬菜', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79,
'{"iron": 2.7, "folate": 194, "lutein": 12198, "vitamin_k": 483}',
'{"ibd": {"acute_phase": 2, "remission_phase": 3, "general_safety": 3}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 5, "nausea_friendly": 4, "nutrition_density": 5}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "mixed", "cooking_methods": ["steamed", "boiled", "stir_fried"], "texture": "soft", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"蔬菜", "高鐵", "葉酸豐富", "護眼"}', true, 'admin_approved', false),

('絲瓜', 'Loofah', '蔬菜', 20, 1.2, 4.9, 0.2, 1.1, 2.5, 2,
'{"vitamin_c": 18.5, "potassium": 139, "water_content": 94, "cooling_food": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 3, "nausea_friendly": 5, "nutrition_density": 2}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "soluble", "cooking_methods": ["steamed", "boiled", "soup"], "texture": "very_soft", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"蔬菜", "高水分", "清熱", "易消化"}', true, 'admin_approved', false),

('蓮藕', 'Lotus Root', '蔬菜', 74, 2.6, 17, 0.1, 4.9, 0, 40,
'{"vitamin_c": 44, "potassium": 556, "tannic_acid": "present", "mucilage": "high"}',
'{"ibd": {"acute_phase": 3, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 3, "fodmap_level": "moderate", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 3, "nausea_friendly": 4, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "mixed", "cooking_methods": ["steamed", "boiled", "soup"], "texture": "crispy", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": true, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"蔬菜", "高纖維", "黏液豐富", "傳統食材"}', true, 'admin_approved', false),

-- ========== 水果類 ==========
('木瓜', 'Papaya', '水果', 43, 0.5, 11, 0.3, 1.7, 7.8, 8,
'{"vitamin_c": 60.9, "beta_carotene": 274, "papain": "high", "digestive_enzyme": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 4, "nausea_friendly": 4, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "soluble", "cooking_methods": ["raw"], "texture": "soft", "acidity": "mild", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": true, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"水果", "消化酵素", "維生素C", "熱帶水果"}', true, 'admin_approved', false),

('芭樂', 'Guava', '水果', 68, 2.6, 14, 1, 5.4, 8.9, 2,
'{"vitamin_c": 228, "lycopene": 5204, "pectin": "high", "antioxidants": "very_high"}',
'{"ibd": {"acute_phase": 2, "remission_phase": 3, "general_safety": 3}, "ibs": {"general_safety": 3, "fodmap_level": "moderate", "trigger_risk": "moderate"}, "cancer_chemo": {"general_safety": 4, "immune_support": 5, "nausea_friendly": 3, "nutrition_density": 4}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "mixed", "cooking_methods": ["raw"], "texture": "firm", "acidity": "mild", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": true, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": true, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"水果", "維生素C之王", "高纖維", "抗氧化"}', true, 'admin_approved', false),

('火龍果', 'Dragon Fruit', '水果', 60, 1.2, 13, 0.4, 3, 9.8, 39,
'{"vitamin_c": 20.5, "betalains": "high", "magnesium": 40, "prebiotics": "present"}',
'{"ibd": {"acute_phase": 3, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 4, "nausea_friendly": 4, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "mixed", "cooking_methods": ["raw"], "texture": "soft", "acidity": "mild", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": true, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": true, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"水果", "低糖", "益生元", "抗氧化"}', true, 'admin_approved', false),

-- ========== 湯品類 ==========
('四神湯', 'Si Shen Soup', '湯品', 65, 2.8, 12, 0.8, 2.1, 1.2, 15,
'{"traditional_medicine": true, "digestive_support": true, "薏仁": "present", "lotus_seeds": "present"}',
'{"ibd": {"acute_phase": 4, "remission_phase": 5, "general_safety": 5}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "very_low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 4, "nausea_friendly": 5, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 4, "allergen_free_confidence": 4}}',
'{"fiber_type": "mixed", "cooking_methods": ["boiled"], "texture": "soft", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"湯品", "中藥食療", "養胃", "傳統"}', true, 'admin_approved', false),

('蛤蜊雞湯', 'Clam Chicken Soup', '湯品', 89, 8.9, 2.1, 4.2, 0.3, 0.8, 245,
'{"protein_complete": true, "iron": 3.2, "zinc": 0.8, "warming_food": true}',
'{"ibd": {"acute_phase": 3, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 4, "nausea_friendly": 4, "nutrition_density": 4}, "allergies": {"cross_contamination_risk": 2, "allergen_free_confidence": 2}}',
'{"fiber_type": "minimal", "cooking_methods": ["boiled"], "texture": "soft", "acidity": "neutral", "spice_level": "mild", "fat_type": "mixed", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": ["shellfish"], "artificial_additives": false}',
'{"shellfish"}', '{"湯品", "雙重蛋白", "滋補", "台式經典"}', true, 'admin_approved', false),

-- ========== 傳統小吃類 ==========
('肉粥', 'Meat Porridge', 'taiwan_street_food', 118, 6.2, 18, 2.8, 0.5, 0.6, 156,
'{"protein_quality": "high", "easy_digestion": true, "comfort_food": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 3, "nausea_friendly": 5, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 4, "allergen_free_confidence": 4}}',
'{"fiber_type": "minimal", "cooking_methods": ["boiled"], "texture": "very_soft", "acidity": "neutral", "spice_level": "mild", "fat_type": "mixed", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"台灣小吃", "粥品", "溫和", "易消化"}', true, 'admin_approved', false),

('蒸蛋', 'Steamed Egg Custard', 'taiwan_street_food', 144, 12.8, 2.1, 9.8, 0, 1.2, 145,
'{"choline": 251, "lutein": 252, "complete_protein": true, "brain_food": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 3, "nausea_friendly": 4, "nutrition_density": 4}, "allergies": {"cross_contamination_risk": 2, "allergen_free_confidence": 2}}',
'{"fiber_type": "none", "cooking_methods": ["steamed"], "texture": "very_soft", "acidity": "neutral", "spice_level": "none", "fat_type": "mixed", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": ["eggs"], "artificial_additives": false}',
'{"eggs"}', '{"台灣小吃", "蛋製品", "嫩滑", "營養豐富"}', true, 'admin_approved', false),

-- ========== 海鮮類 ==========
('虱目魚肚', 'Milkfish Belly', '蛋白質', 211, 19.2, 0, 14.5, 0, 0, 67,
'{"omega_3": 1.2, "dha": 780, "collagen": "present", "local_delicacy": true}',
'{"ibd": {"acute_phase": 3, "remission_phase": 4, "general_safety": 3}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 3, "immune_support": 4, "nausea_friendly": 3, "nutrition_density": 4}, "allergies": {"cross_contamination_risk": 3, "allergen_free_confidence": 3}}',
'{"fiber_type": "none", "cooking_methods": ["steamed", "grilled"], "texture": "soft", "acidity": "neutral", "spice_level": "none", "fat_type": "omega_3", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": true, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": ["fish"], "artificial_additives": false}',
'{"fish"}', '{"蛋白質", "台灣特產", "DHA豐富", "膠原蛋白"}', true, 'admin_approved', false),

('吳郭魚', 'Tilapia', '蛋白質', 128, 26.2, 0, 2.7, 0, 0, 52,
'{"protein_efficiency": "high", "phosphorus": 204, "selenium": 41.8, "lean_protein": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "very_low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 4, "nausea_friendly": 4, "nutrition_density": 4}, "allergies": {"cross_contamination_risk": 3, "allergen_free_confidence": 3}}',
'{"fiber_type": "none", "cooking_methods": ["steamed", "boiled"], "texture": "soft", "acidity": "neutral", "spice_level": "none", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": ["fish"], "artificial_additives": false}',
'{"fish"}', '{"蛋白質", "低脂", "高蛋白", "淡水魚"}', true, 'admin_approved', false),

-- ========== 豆類製品 ==========
('豆花', 'Douhua (Tofu Pudding)', '蛋白質', 70, 6.2, 2.8, 3.7, 0.1, 2.1, 9,
'{"isoflavones": 15, "calcium": 250, "magnesium": 30, "digestible_protein": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 3, "nausea_friendly": 5, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 3, "allergen_free_confidence": 3}}',
'{"fiber_type": "minimal", "cooking_methods": ["steamed"], "texture": "very_soft", "acidity": "neutral", "spice_level": "none", "fat_type": "unsaturated", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": true, "high_fodmap": false, "common_allergens": ["soy"], "artificial_additives": false}',
'{"soy"}', '{"蛋白質", "豆製品", "嫩滑", "易消化"}', true, 'admin_approved', false),

('豆漿', 'Soy Milk', '蛋白質', 54, 3.3, 4.9, 1.8, 0.6, 4.2, 51,
'{"isoflavones": 9.6, "folate": 18, "plant_protein": true, "lactose_free": true}',
'{"ibd": {"acute_phase": 4, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 3, "nausea_friendly": 4, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 3, "allergen_free_confidence": 3}}',
'{"fiber_type": "minimal", "cooking_methods": ["processed"], "texture": "liquid", "acidity": "neutral", "spice_level": "none", "fat_type": "unsaturated", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": false, "fried": false, "processed": true, "high_fodmap": false, "common_allergens": ["soy"], "artificial_additives": false}',
'{"soy"}', '{"蛋白質", "植物奶", "無乳糖", "早餐常見"}', true, 'admin_approved', false),

-- ========== 調味與配菜 ==========
('薑絲', 'Ginger Strips', '調味料', 80, 1.8, 18, 0.8, 2, 1.7, 13,
'{"gingerol": "high", "anti_inflammatory": true, "digestive_aid": true, "warming": true}',
'{"ibd": {"acute_phase": 3, "remission_phase": 4, "general_safety": 4}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 4, "nausea_friendly": 5, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "minimal", "cooking_methods": ["raw", "steamed"], "texture": "crispy", "acidity": "neutral", "spice_level": "mild", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": true, "acidic": false, "raw": true, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"調味料", "抗炎", "助消化", "止吐"}', true, 'admin_approved', false),

('香菜', 'Cilantro', '調味料', 23, 2.1, 3.7, 0.5, 2.8, 0.9, 46,
'{"vitamin_k": 310, "vitamin_c": 27, "antioxidants": "moderate", "fresh_herb": true}',
'{"ibd": {"acute_phase": 3, "remission_phase": 4, "general_safety": 3}, "ibs": {"general_safety": 4, "fodmap_level": "low", "trigger_risk": "low"}, "cancer_chemo": {"general_safety": 4, "immune_support": 3, "nausea_friendly": 3, "nutrition_density": 3}, "allergies": {"cross_contamination_risk": 5, "allergen_free_confidence": 5}}',
'{"fiber_type": "mixed", "cooking_methods": ["raw"], "texture": "soft", "acidity": "neutral", "spice_level": "mild", "fat_type": "minimal", "preservation_method": "fresh"}',
'{"high_fiber": false, "high_fat": false, "high_sugar": false, "spicy": false, "acidic": false, "raw": true, "fried": false, "processed": false, "high_fodmap": false, "common_allergens": [], "artificial_additives": false}',
'{}', '{"調味料", "新鮮香草", "維生素K", "提味"}', true, 'admin_approved', false);

-- 查詢插入結果
SELECT
    category,
    COUNT(*) as food_count,
    AVG((condition_scores->'ibd'->>'general_safety')::INTEGER) as avg_ibd_score,
    AVG((condition_scores->'ibs'->>'general_safety')::INTEGER) as avg_ibs_score,
    AVG((condition_scores->'cancer_chemo'->>'general_safety')::INTEGER) as avg_chemo_score
FROM diet_daily_foods
WHERE taiwan_origin = true
    AND verification_status = 'admin_approved'
GROUP BY category
ORDER BY food_count DESC;

-- 統計報告
SELECT
    '台灣食物資料庫統計' as report_title,
    COUNT(*) as total_taiwan_foods,
    COUNT(DISTINCT category) as categories_count,
    AVG((condition_scores->'ibd'->>'general_safety')::INTEGER) as avg_ibd_safety,
    AVG((condition_scores->'ibs'->>'general_safety')::INTEGER) as avg_ibs_safety,
    AVG((condition_scores->'cancer_chemo'->>'general_safety')::INTEGER) as avg_chemo_safety,
    AVG((condition_scores->'allergies'->>'allergen_free_confidence')::INTEGER) as avg_allergy_safety
FROM diet_daily_foods
WHERE taiwan_origin = true
    AND verification_status = 'admin_approved';

-- 完成台灣常見食物和食材資料庫建置
-- 總計：新增23個台灣常見食物，涵蓋7大類別，完整的多疾病評分資料