#!/bin/bash

# 修復 Pi5 Supabase 設置

set -e

PI5_HOST="gilko@10.1.1.85"

echo "🔧 修復 Pi5 Supabase 設置"
echo "============================================================"

ssh $PI5_HOST << 'EOF'
cd ~/diet_dialy

echo "📋 步驟 1: 停止 Supabase 服務..."
supabase stop 2>/dev/null || true

echo ""
echo "📋 步驟 2: 清理並重啟..."
# 等待一下確保完全停止
sleep 3

echo "啟動 Supabase..."
supabase start

echo ""
echo "📋 步驟 3: 等待服務就緒..."
sleep 10

echo ""
echo "📋 步驟 4: 重新套用 migrations..."
supabase db reset

echo ""
echo "📋 步驟 5: 檢查服務狀態..."
supabase status

echo ""
echo "📋 步驟 6: 驗證表結構..."
DB_CONTAINER=$(docker ps --filter "name=supabase_db" --format "{{.Names}}" | head -1)
if [ -n "$DB_CONTAINER" ]; then
    echo "檢查關鍵表..."
    docker exec "$DB_CONTAINER" psql -U postgres -d postgres -c "
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('food_entries', 'daily_symptom_entries', 'bowel_movement_entries')
    ORDER BY table_name;
    " || echo "無法查詢表結構"
fi
EOF

echo ""
echo "============================================================"
echo "✅ 修復完成！"
echo "============================================================"

