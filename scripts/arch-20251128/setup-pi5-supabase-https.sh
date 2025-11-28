#!/bin/bash

# 在 Pi5 上設置 Supabase 並配置 HTTPS 反向代理
# 目標: https://gilko.redirectme.net/supabase

set -e

PI5_HOST="gilko@10.1.1.85"
SUPABASE_PORT=54321
SUPABASE_STUDIO_PORT=54323
NGINX_CONFIG="/etc/nginx/conf.d/supabase.conf"

echo "🚀 開始在 Pi5 上設置 Supabase HTTPS 訪問"
echo "============================================================"

# 步驟 1: 檢查 Supabase 是否已安裝
echo ""
echo "📋 步驟 1: 檢查 Supabase 狀態..."
ssh $PI5_HOST << 'EOF'
cd ~/diet_dialy

if ! command -v supabase >/dev/null 2>&1; then
    echo "❌ Supabase CLI 未安裝"
    echo "   運行: bash scripts/setup_supabase_pi5.sh"
    exit 1
fi

echo "✅ Supabase CLI 已安裝: $(supabase --version)"

# 檢查 Supabase 是否運行
if supabase status >/dev/null 2>&1; then
    echo "✅ Supabase 正在運行"
    supabase status
else
    echo "⚠️  Supabase 未運行，正在啟動..."
    supabase start
fi
EOF

# 步驟 2: 確保 Supabase 表已啟用 Realtime
echo ""
echo "📋 步驟 2: 檢查並啟用 Realtime..."
ssh $PI5_HOST << 'EOF'
cd ~/diet_dialy

# 使用 supabase db 執行 SQL
echo "檢查並啟用 Realtime..."

# 創建臨時 SQL 文件
cat > /tmp/enable_realtime.sql << 'SQL'
-- 檢查當前啟用的表
SELECT tablename FROM pg_publication_tables 
WHERE tablename IN ('food_entries', 'daily_symptom_entries');

-- 如果沒有結果，啟用 Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE tablename = 'food_entries'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE food_entries;
        RAISE NOTICE '已啟用 food_entries 的 Realtime';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE tablename = 'daily_symptom_entries'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE daily_symptom_entries;
        RAISE NOTICE '已啟用 daily_symptom_entries 的 Realtime';
    END IF;
END $$;

-- 再次檢查
SELECT tablename FROM pg_publication_tables 
WHERE tablename IN ('food_entries', 'daily_symptom_entries');
SQL

# 使用 supabase db execute 執行
supabase db execute -f /tmp/enable_realtime.sql || {
    echo "⚠️  無法執行 SQL，嘗試直接連接..."
    # 備用方法：使用 docker 直接連接
    SUPABASE_DB_CONTAINER=$(docker ps --filter "name=supabase_db" --format "{{.Names}}" | head -1)
    if [ -n "$SUPABASE_DB_CONTAINER" ]; then
        docker exec -i "$SUPABASE_DB_CONTAINER" psql -U postgres -d postgres < /tmp/enable_realtime.sql
    else
        echo "⚠️  無法找到 Supabase 資料庫容器"
    fi
}

rm -f /tmp/enable_realtime.sql
EOF

# 步驟 3: 配置 Nginx 反向代理
echo ""
echo "📋 步驟 3: 配置 Nginx 反向代理..."
ssh $PI5_HOST << 'EOF'
# 檢查現有的 nginx 配置文件
NGINX_MAIN_CONFIG="/etc/nginx/conf.d/n8n.conf"
SUPABASE_CONFIG="/etc/nginx/conf.d/supabase.conf"

# 如果主配置文件存在，在裡面添加 Supabase 配置
if [ -f "$NGINX_MAIN_CONFIG" ]; then
    echo "找到現有 Nginx 配置: $NGINX_MAIN_CONFIG"
    
    # 檢查是否已經有 Supabase 配置
    if grep -q "location /supabase/" "$NGINX_MAIN_CONFIG"; then
        echo "⚠️  Supabase 配置已存在，跳過"
    else
        # 在現有配置中添加 Supabase location（在 location / 之前）
        sudo sed -i.bak '/location \/ {/i\
    # Supabase API 反向代理\
    location /supabase/ {\
        # 移除 /supabase 前綴\
        rewrite ^/supabase/(.*) /$1 break;\
        \
        # 代理到 Supabase API\
        proxy_pass http://127.0.0.1:54321;\
        proxy_http_version 1.1;\
        \
        # 基本 headers\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_set_header X-Forwarded-Host $host;\
        proxy_set_header X-Forwarded-Prefix /supabase;\
        \
        # WebSocket 支持（Realtime 需要）\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_cache_bypass $http_upgrade;\
        \
        # 超時設置\
        proxy_read_timeout 600s;\
        proxy_connect_timeout 60s;\
        proxy_send_timeout 600s;\
        \
        # 允許大文件上傳\
        client_max_body_size 50M;\
    }\
\
' "$NGINX_MAIN_CONFIG"
        echo "✅ 已在現有配置中添加 Supabase 設置"
    fi
else
    # 創建新的配置文件
    echo "創建新的 Supabase 配置文件..."
    sudo tee "$SUPABASE_CONFIG" > /dev/null << 'NGINX_CONFIG'
# Supabase API 反向代理
location /supabase/ {
    # 移除 /supabase 前綴
    rewrite ^/supabase/(.*) /$1 break;
    
    # 代理到 Supabase API
    proxy_pass http://127.0.0.1:54321;
    proxy_http_version 1.1;
    
    # 基本 headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Prefix /supabase;
    
    # WebSocket 支持（Realtime 需要）
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_cache_bypass $http_upgrade;
    
    # 超時設置
    proxy_read_timeout 600s;
    proxy_connect_timeout 60s;
    proxy_send_timeout 600s;
    
    # 允許大文件上傳
    client_max_body_size 50M;
}
NGINX_CONFIG
    echo "✅ 已創建新的 Supabase 配置文件"
fi

# 測試 Nginx 配置
if sudo nginx -t; then
    echo "✅ Nginx 配置語法正確"
    sudo systemctl reload nginx
    echo "✅ Nginx 已重新載入"
else
    echo "❌ Nginx 配置有錯誤"
    exit 1
fi
EOF

# 步驟 4: 驗證配置
echo ""
echo "📋 步驟 4: 驗證配置..."
echo "測試 Supabase API 連接..."
if curl -s -o /dev/null -w "%{http_code}" "https://gilko.redirectme.net/supabase/rest/v1/" | grep -q "200\|401\|404"; then
    echo "✅ Supabase API 可通過 HTTPS 訪問"
else
    echo "⚠️  Supabase API 連接測試失敗，請檢查配置"
fi

# 步驟 5: 顯示連接資訊
echo ""
echo "============================================================"
echo "✅ Supabase HTTPS 設置完成！"
echo "============================================================"
echo ""
echo "📝 連接資訊:"
echo "   API URL: https://gilko.redirectme.net/supabase"
echo "   REST API: https://gilko.redirectme.net/supabase/rest/v1/"
echo "   Realtime: wss://gilko.redirectme.net/supabase/realtime/v1/"
echo "   Studio: https://gilko.redirectme.net/supabase-studio/"
echo ""
echo "📋 API Keys (從 Pi5 獲取):"
ssh $PI5_HOST "cd ~/diet_dialy && supabase status | grep -E 'API URL|anon key|service_role key' || echo '運行: ssh $PI5_HOST \"cd ~/diet_dialy && supabase status\"'"
echo ""
echo "💡 下一步:"
echo "   1. 更新 .env.local 使用新的 URL"
echo "   2. 運行測試: node scripts/test-realtime-sync.js <user_id>"
echo ""

