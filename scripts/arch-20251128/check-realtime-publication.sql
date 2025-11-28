-- 檢查 Realtime Publication 狀態

-- 1. 檢查是否存在 supabase_realtime publication
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 2. 檢查 food_entries 是否在 publication 中
SELECT 
    p.pubname,
    n.nspname AS schema,
    c.relname AS tablename,
    pt.puballtables
FROM pg_publication p
LEFT JOIN pg_publication_tables pt ON p.pubname = pt.pubname
LEFT JOIN pg_publication_rel pr ON p.oid = pr.prpubid
LEFT JOIN pg_class c ON pr.prrelid = c.oid
LEFT JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE p.pubname = 'supabase_realtime'
  AND (c.relname = 'food_entries' OR pt.puballtables = true);

-- 3. 列出所有在 publication 中的表
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;

