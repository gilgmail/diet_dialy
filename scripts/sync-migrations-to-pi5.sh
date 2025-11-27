#!/bin/bash

# 同步 migrations 到 Pi5 Supabase

set -e

PI5_HOST="gilko@10.1.1.85"
LOCAL_MIGRATIONS_DIR="supabase/migrations"
PI5_MIGRATIONS_DIR="~/diet_dialy/supabase/migrations"

echo "🔄 同步 Migrations 到 Pi5"
echo "============================================================"

# 檢查本地 migrations 目錄
if [ ! -d "$LOCAL_MIGRATIONS_DIR" ]; then
    echo "❌ 本地 migrations 目錄不存在: $LOCAL_MIGRATIONS_DIR"
    exit 1
fi

LOCAL_MIGRATION_COUNT=$(ls -1 "$LOCAL_MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l)
echo "📋 本地 migrations 數量: $LOCAL_MIGRATION_COUNT"

if [ "$LOCAL_MIGRATION_COUNT" -eq 0 ]; then
    echo "⚠️  本地沒有 migration 文件"
    exit 1
fi

# 檢查 Pi5 上的 migrations
echo ""
echo "📋 檢查 Pi5 上的 migrations..."
PI5_MIGRATION_COUNT=$(ssh $PI5_HOST "cd ~/diet_dialy && ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l" || echo "0")
echo "   Pi5 現有 migrations: $PI5_MIGRATION_COUNT"

# 備份 Pi5 上的現有 migrations
echo ""
echo "📦 備份 Pi5 上的現有 migrations..."
ssh $PI5_HOST << 'EOF'
cd ~/diet_dialy
if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations/*.sql 2>/dev/null)" ]; then
    BACKUP_DIR="supabase/migrations/backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    cp supabase/migrations/*.sql "$BACKUP_DIR/" 2>/dev/null || true
    echo "✅ 已備份到: $BACKUP_DIR"
fi
EOF

# 同步 migrations
echo ""
echo "📤 同步 migrations 到 Pi5..."
rsync -avz --progress \
    "$LOCAL_MIGRATIONS_DIR/"*.sql \
    "$PI5_HOST:~/diet_dialy/supabase/migrations/"

echo ""
echo "✅ Migrations 已同步"

# 詢問是否立即套用
echo ""
read -p "是否立即套用 migrations 到 Pi5 Supabase? (y/N): " apply_now

if [[ "$apply_now" =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔄 套用 migrations..."
    ssh $PI5_HOST << 'EOF'
cd ~/diet_dialy

# 檢查 Supabase 是否運行
if ! supabase status >/dev/null 2>&1; then
    echo "⚠️  Supabase 未運行，正在啟動..."
    supabase start
fi

# 套用 migrations
echo "正在套用 migrations..."
supabase db reset

echo ""
echo "✅ Migrations 已套用"
supabase status
EOF
else
    echo ""
    echo "💡 稍後可以手動套用 migrations:"
    echo "   ssh $PI5_HOST"
    echo "   cd ~/diet_dialy"
    echo "   supabase db reset"
fi

echo ""
echo "============================================================"
echo "✅ 同步完成！"
echo "============================================================"
echo ""
echo "📝 注意事項:"
echo "   1. API Keys 不需要搬移（本地 Supabase 有自己的 keys）"
echo "   2. 資料庫結構已同步（migrations）"
echo "   3. 如果需要測試數據，可以運行 seed 腳本"
echo ""

