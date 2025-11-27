#!/bin/bash

# 切換到 Pi5 Supabase 配置腳本

echo "🔄 切換到 Pi5 Supabase..."

# 檢查 .env.local 是否存在
if [ ! -f .env.local ]; then
  echo "❌ .env.local 文件不存在"
  exit 1
fi

# 備份當前配置
cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 已備份當前配置"

# Pi5 Supabase 配置
PI5_URL="http://10.1.1.85:54321"
PI5_ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
PI5_SERVICE_KEY="sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"

# 更新配置
if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
  sed -i.bak "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${PI5_URL}|" .env.local
else
  echo "NEXT_PUBLIC_SUPABASE_URL=${PI5_URL}" >> .env.local
fi

if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local; then
  sed -i.bak "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=${PI5_ANON_KEY}|" .env.local
else
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${PI5_ANON_KEY}" >> .env.local
fi

if grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env.local; then
  sed -i.bak "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=${PI5_SERVICE_KEY}|" .env.local
else
  echo "SUPABASE_SERVICE_ROLE_KEY=${PI5_SERVICE_KEY}" >> .env.local
fi

# 註釋掉 TEST_ACCESS_TOKEN（Pi5 本地環境可能不需要）
if grep -q "^TEST_ACCESS_TOKEN=" .env.local; then
  sed -i.bak 's|^TEST_ACCESS_TOKEN=|# TEST_ACCESS_TOKEN=|' .env.local
fi

echo ""
echo "✅ 已切換到 Pi5 Supabase"
echo ""
echo "📝 下一步："
echo "   1. 確保 Pi5 Supabase 運行: ssh gilko@10.1.1.85 'cd ~/diet_dialy && supabase status'"
echo "   2. 運行測試: node scripts/test-realtime-sync.js <user_id>"
echo "   3. 查看日誌: ssh gilko@10.1.1.85 'docker compose -f ~/.supabase/docker-compose.yml logs realtime -f'"
echo ""

