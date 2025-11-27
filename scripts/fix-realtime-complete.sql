-- ======================================================
-- Supabase Realtime 完整修復腳本
-- 請在 Supabase SQL Editor 中運行
-- ======================================================

-- 步驟 1: 檢查當前 REPLICA IDENTITY 設置
-- ======================================================
SELECT 
  n.nspname as schema,
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default (primary key)'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries', 'users')
ORDER BY c.relname;

-- 步驟 2: 設置 REPLICA IDENTITY 為 FULL
-- ======================================================
-- 這是 Realtime 正常工作的關鍵！
ALTER TABLE public.food_entries REPLICA IDENTITY FULL;
ALTER TABLE public.daily_symptom_entries REPLICA IDENTITY FULL;
ALTER TABLE public.bowel_movement_entries REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- 步驟 3: 檢查 Publication 狀態
-- ======================================================
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- 步驟 4: 添加表到 Publication（如果還沒有）
-- ======================================================
-- 如果上面的查詢沒有顯示這些表，取消註釋下面的命令

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.food_entries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_symptom_entries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.bowel_movement_entries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- 步驟 5: 驗證配置
-- ======================================================
SELECT 
  'REPLICA IDENTITY' as check_type,
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'f' THEN '✓ FULL (正確)'
    ELSE '✗ ' || CASE c.relreplident
      WHEN 'd' THEN 'DEFAULT (需要修復)'
      WHEN 'n' THEN 'NOTHING (需要修復)'
      WHEN 'i' THEN 'INDEX (需要修復)'
    END
  END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries', 'users')

UNION ALL

SELECT 
  'PUBLICATION' as check_type,
  t.table_name,
  CASE 
    WHEN pt.tablename IS NOT NULL THEN '✓ 已加入 (正確)'
    ELSE '✗ 未加入 (需要修復)'
  END as status
FROM information_schema.tables t
LEFT JOIN pg_publication_tables pt 
  ON pt.schemaname = t.table_schema 
  AND pt.tablename = t.table_name
  AND pt.pubname = 'supabase_realtime'
WHERE t.table_schema = 'public'
  AND t.table_name IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries', 'users')
ORDER BY check_type, table_name;

-- ======================================================
-- 預期結果：
-- 所有表的 REPLICA IDENTITY 應該是 "FULL"
-- 所有表都應該在 supabase_realtime publication 中
-- ======================================================

