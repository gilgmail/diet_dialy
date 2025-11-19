-- seed_medication_catalog.sql
-- Phase A: Common IBD medications seed data

-- 清空現有資料（僅開發/測試環境使用）
-- TRUNCATE TABLE medication_catalog CASCADE;

-- ===================================================================
-- 生物製劑（Biologics）- 針劑
-- ===================================================================

INSERT INTO medication_catalog (id, name, route, is_injection, default_interval_days, default_dosage, notes)
VALUES
    (
        'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        'Humira (Adalimumab)',
        'injection',
        true,
        14,
        '40mg',
        '皮下注射，常見 IBD 生物製劑，每兩週一次'
    ),
    (
        'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        'Entyvio (Vedolizumab)',
        'injection',
        true,
        56,
        '300mg',
        '靜脈注射，腸道選擇性生物製劑，每 8 週一次'
    ),
    (
        'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
        'Remicade (Infliximab)',
        'injection',
        true,
        56,
        '5mg/kg',
        '靜脈注射，需在醫療機構施打，每 8 週一次'
    ),
    (
        'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
        'Stelara (Ustekinumab)',
        'injection',
        true,
        56,
        '90mg',
        '皮下注射，適用於克隆氏症與潰瘍性結腸炎，每 8 週一次'
    ),
    (
        'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
        'Skyrizi (Risankizumab)',
        'injection',
        true,
        56,
        '600mg',
        '靜脈或皮下注射，新型 IL-23 抑制劑，每 8 週一次'
    );

-- ===================================================================
-- 免疫調節劑（Immunomodulators）- 口服
-- ===================================================================

INSERT INTO medication_catalog (id, name, route, is_injection, default_interval_days, default_dosage, notes)
VALUES
    (
        'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
        'Imuran (Azathioprine)',
        'oral',
        false,
        1,
        '50-150mg',
        '每日口服，常見免疫抑制劑，需定期監測血液指標'
    ),
    (
        'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d',
        'Purinethol (6-MP)',
        'oral',
        false,
        1,
        '50-100mg',
        '每日口服，Azathioprine 的代謝產物'
    ),
    (
        'b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e',
        'Methotrexate',
        'oral',
        false,
        7,
        '15-25mg',
        '每週一次，用於克隆氏症維持治療'
    );

-- ===================================================================
-- 5-ASA（氨基水楊酸）- 口服
-- ===================================================================

INSERT INTO medication_catalog (id, name, route, is_injection, default_interval_days, default_dosage, notes)
VALUES
    (
        'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f',
        'Pentasa (Mesalamine)',
        'oral',
        false,
        1,
        '1000-4000mg',
        '每日口服，分次服用，輕度至中度 UC 維持治療'
    ),
    (
        'd0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a',
        'Asacol (Mesalamine)',
        'oral',
        false,
        1,
        '2400-4800mg',
        '每日口服，腸溶劑型，針對結腸釋放'
    ),
    (
        'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b',
        'Salofalk (Mesalamine)',
        'oral',
        false,
        1,
        '1500-3000mg',
        '每日口服，另有栓劑與灌腸劑型'
    );

-- ===================================================================
-- 類固醇（Corticosteroids）- 口服
-- ===================================================================

INSERT INTO medication_catalog (id, name, route, is_injection, default_interval_days, default_dosage, notes)
VALUES
    (
        'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c',
        'Prednisolone',
        'oral',
        false,
        1,
        '5-60mg',
        '每日口服，急性發作時使用，需逐步減量'
    ),
    (
        'a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d',
        'Budesonide (Entocort)',
        'oral',
        false,
        1,
        '9mg',
        '每日口服，腸道局部作用類固醇，副作用較輕'
    );

-- ===================================================================
-- 小分子藥物（Small Molecules）- 口服
-- ===================================================================

INSERT INTO medication_catalog (id, name, route, is_injection, default_interval_days, default_dosage, notes)
VALUES
    (
        'b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e',
        'Xeljanz (Tofacitinib)',
        'oral',
        false,
        1,
        '10mg',
        '每日口服兩次，JAK 抑制劑，用於中重度 UC'
    ),
    (
        'c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f',
        'Rinvoq (Upadacitinib)',
        'oral',
        false,
        1,
        '15-45mg',
        '每日口服一次，選擇性 JAK1 抑制劑'
    ),
    (
        'd6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a',
        'Zeposia (Ozanimod)',
        'oral',
        false,
        1,
        '0.92mg',
        '每日口服，S1P 受體調節劑，用於 UC'
    );

-- ===================================================================
-- 症狀緩解藥物（PRN - As Needed）
-- ===================================================================

INSERT INTO medication_catalog (id, name, route, is_injection, default_interval_days, default_dosage, notes)
VALUES
    (
        'e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9f0a1b',
        'Loperamide (Imodium)',
        'oral',
        false,
        NULL,
        '2-16mg',
        'PRN 使用，止瀉藥，症狀發作時服用'
    ),
    (
        'f8a9b0c1-d2e3-4f4a-5b6c-7d8e9f0a1b2c',
        'Diphenoxylate (Lomotil)',
        'oral',
        false,
        NULL,
        '5mg',
        'PRN 使用，止瀉藥，含 Atropine 防止濫用'
    );

-- ===================================================================
-- 輔助補充劑
-- ===================================================================

INSERT INTO medication_catalog (id, name, route, is_injection, default_interval_days, default_dosage, notes)
VALUES
    (
        'a9b0c1d2-e3f4-4a5b-6c7d-8e9f0a1b2c3d',
        'Vitamin D3',
        'oral',
        false,
        1,
        '1000-5000 IU',
        '每日補充，IBD 患者常見維生素 D 缺乏'
    ),
    (
        'b0c1d2e3-f4a5-4b6c-7d8e-9f0a1b2c3d4e',
        'Vitamin B12',
        'oral',
        false,
        1,
        '1000-2000 mcg',
        '每日補充或注射，迴腸切除患者需注意'
    ),
    (
        'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
        'Folic Acid',
        'oral',
        false,
        1,
        '1-5mg',
        '每日補充，服用 Methotrexate 者必須補充'
    ),
    (
        'd2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a',
        'Iron Supplement',
        'oral',
        false,
        1,
        '65-200mg',
        '每日補充，IBD 患者常見貧血'
    );

-- ===================================================================
-- 建立索引加速查詢
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_medication_catalog_route ON medication_catalog(route);
CREATE INDEX IF NOT EXISTS idx_medication_catalog_injection ON medication_catalog(is_injection);
CREATE INDEX IF NOT EXISTS idx_medication_catalog_name ON medication_catalog(name);

-- ===================================================================
-- 驗證資料
-- ===================================================================

DO $$
DECLARE
    med_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO med_count FROM medication_catalog;
    RAISE NOTICE '已插入 % 筆藥品資料到 medication_catalog', med_count;

    RAISE NOTICE '生物製劑（針劑）: %', (SELECT COUNT(*) FROM medication_catalog WHERE route = 'injection');
    RAISE NOTICE '口服藥物: %', (SELECT COUNT(*) FROM medication_catalog WHERE route = 'oral');
    RAISE NOTICE 'PRN 藥物: %', (SELECT COUNT(*) FROM medication_catalog WHERE default_interval_days IS NULL);
END$$;
