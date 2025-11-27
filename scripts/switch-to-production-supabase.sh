#!/bin/bash

# 切換回生產環境 Supabase

set -e

echo "🔄 切換回生產環境 Supabase"
echo "============================================================"

if [ ! -f .env.local ]; then
    echo "❌ .env.local 文件不存在"
    exit 1
fi

# 備份當前配置
cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 已備份當前配置"

# 檢查是否有生產環境的配置備份
PROD_BACKUP=$(ls -t .env.local.backup.* 2>/dev/null | grep -v "pi5\|gilko" | head -1)

if [ -n "$PROD_BACKUP" ]; then
    echo "📋 找到生產環境配置備份: $PROD_BACKUP"
    read -p "是否使用備份恢復? (y/N): " use_backup
    
    if [[ "$use_backup" =~ ^[Yy]$ ]]; then
        cp "$PROD_BACKUP" .env.local
        echo "✅ 已從備份恢復"
        exit 0
    fi
fi

# 提示用戶手動配置
echo ""
echo "📝 請手動更新 .env.local 中的 Supabase 配置："
echo ""
echo "從 Supabase Dashboard 獲取："
echo "  https://supabase.com/dashboard/project/lbjeyvvierxcnrytuvto/settings/api"
echo ""
echo "更新以下變數："
echo "  NEXT_PUBLIC_SUPABASE_URL=https://lbjeyvvierxcnrytuvto.supabase.co"
echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=<從 Dashboard 獲取>"
echo "  SUPABASE_SERVICE_ROLE_KEY=<從 Dashboard 獲取>"
echo ""
read -p "按 Enter 繼續，或 Ctrl+C 取消..."

# 檢查是否已更新
if grep -q "lbjeyvvierxcnrytuvto.supabase.co" .env.local; then
    echo "✅ 檢測到生產環境 URL"
else
    echo "⚠️  未檢測到生產環境 URL，請確認已正確更新"
fi

echo ""
echo "✅ 配置已更新"
echo ""
echo "💡 下一步:"
echo "   1. 運行: node scripts/check-env-config.js"
echo "   2. 運行: node scripts/test-realtime-sync.js <user_id>"
echo ""

