#!/bin/bash

# 快速切換回生產環境 Supabase

set -e

echo "🔄 切換回生產環境 Supabase"
echo "============================================================"

if [ ! -f .env.local ]; then
    echo "❌ .env.local 文件不存在"
    exit 1
fi

# 備份
cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 已備份當前配置"

# 生產環境 Supabase 配置
PROD_URL="https://lbjeyvvierxcnrytuvto.supabase.co"

echo ""
echo "📝 請從 Supabase Dashboard 獲取 API Keys:"
echo "   https://supabase.com/dashboard/project/lbjeyvvierxcnrytuvto/settings/api"
echo ""
echo "然後手動更新 .env.local 中的："
echo "   NEXT_PUBLIC_SUPABASE_URL=$PROD_URL"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=<從 Dashboard 獲取>"
echo "   SUPABASE_SERVICE_ROLE_KEY=<從 Dashboard 獲取>"
echo ""

# 更新 URL（如果 keys 已存在，只更新 URL）
if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
    sed -i.bak "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${PROD_URL}|" .env.local
    echo "✅ 已更新 NEXT_PUBLIC_SUPABASE_URL"
else
    echo "NEXT_PUBLIC_SUPABASE_URL=${PROD_URL}" >> .env.local
    echo "✅ 已添加 NEXT_PUBLIC_SUPABASE_URL"
fi

echo ""
echo "⚠️  請手動更新 API Keys！"
echo ""
echo "💡 下一步:"
echo "   1. 從 Dashboard 獲取 API Keys"
echo "   2. 更新 .env.local 中的 ANON_KEY 和 SERVICE_ROLE_KEY"
echo "   3. 運行: node scripts/check-env-config.js"
echo "   4. 運行: node scripts/test-realtime-sync.js <user_id>"
echo ""

