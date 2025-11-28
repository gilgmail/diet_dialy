#!/bin/bash

# 更新 .env.local 使用 Pi5 Supabase HTTPS URL

echo "🔄 更新 .env.local 使用 Pi5 Supabase HTTPS..."
echo "============================================================"

if [ ! -f .env.local ]; then
    echo "❌ .env.local 文件不存在"
    exit 1
fi

# 備份
cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 已備份當前配置"

# Pi5 Supabase HTTPS 配置
PI5_SUPABASE_URL="https://gilko.redirectme.net/supabase"
PI5_ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
PI5_SERVICE_KEY="sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"

# 更新配置
if grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
    sed -i.bak "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=${PI5_SUPABASE_URL}|" .env.local
else
    echo "NEXT_PUBLIC_SUPABASE_URL=${PI5_SUPABASE_URL}" >> .env.local
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

# 註釋掉 TEST_ACCESS_TOKEN（本地環境可能不需要）
if grep -q "^TEST_ACCESS_TOKEN=" .env.local; then
    sed -i.bak 's|^TEST_ACCESS_TOKEN=|# TEST_ACCESS_TOKEN=|' .env.local
fi

# 註釋掉 Service Role Key（使用 anon key 測試 Realtime）
if grep -q "^SUPABASE_SERVICE_ROLE_KEY=" .env.local && ! grep -q "^# SUPABASE_SERVICE_ROLE_KEY=" .env.local; then
    # 檢查是否已經註釋
    if ! grep -q "^# SUPABASE_SERVICE_ROLE_KEY=" .env.local; then
        echo ""
        echo "💡 提示: 要測試 Realtime，建議註釋掉 SUPABASE_SERVICE_ROLE_KEY"
        echo "   這樣腳本會使用 anon key（更適合 Realtime 測試）"
    fi
fi

echo ""
echo "✅ 已更新 .env.local"
echo ""
echo "📝 配置:"
echo "   NEXT_PUBLIC_SUPABASE_URL=${PI5_SUPABASE_URL}"
echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY=${PI5_ANON_KEY}"
echo ""
echo "💡 下一步:"
echo "   1. 運行配置檢查: node scripts/check-env-config.js"
echo "   2. 運行測試: node scripts/test-realtime-sync.js <user_id>"
echo ""

