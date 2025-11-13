-- ============================================================
-- 尋找有效的測試用戶 ID
-- ============================================================
-- 此腳本幫助您找到可用於測試的用戶 ID

-- 方法 1: 查詢您自己的用戶 ID（最推薦）
SELECT
  id,
  email,
  created_at,
  '✅ 您的用戶 ID' as note
FROM auth.users
WHERE email = '您的郵箱@example.com'  -- ← 請替換為您的實際郵箱
LIMIT 1;

-- 方法 2: 查看所有用戶（如果您是管理員）
SELECT
  id,
  email,
  created_at,
  CASE
    WHEN email LIKE '%@example.com%' THEN '⚠️  測試帳號'
    ELSE '👤 真實用戶'
  END as user_type
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 方法 3: 查看有飲食記錄的用戶（確保有真實數據）
SELECT DISTINCT
  u.id,
  u.email,
  COUNT(fe.id) as food_entries_count,
  '📊 有飲食記錄的用戶' as note
FROM auth.users u
JOIN food_entries fe ON fe.user_id = u.id
GROUP BY u.id, u.email
ORDER BY food_entries_count DESC
LIMIT 5;

-- ============================================================
-- 使用說明
-- ============================================================
-- 1. 執行上述任一查詢，找到您的用戶 ID
-- 2. 複製該 UUID (例如: e7c62e70-7e95-40e3-84c6-f27c84ede44e)
-- 3. 在 seed_test_data_v2.sql 中全局替換：
--    搜尋: e7c62e70-7e95-40e3-84c6-f27c84ede44e
--    替換: 您的用戶 ID
-- 4. 然後執行 seed_test_data_v2.sql
