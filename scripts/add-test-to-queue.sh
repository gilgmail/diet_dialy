#!/bin/bash

# 直接通過 API 加入測試食物到佇列
# 然後立即觸發處理

echo "🧪 加入測試食物到佇列並處理"
echo "=============================="
echo ""

API_URL="http://gilko.redirectme.net:3000"

# 步驟 1: 加入測試食物到佇列
echo "📝 步驟 1: 加入測試食物到佇列..."

# 使用 API 加入一個已知的食物 ID 到佇列
# 你需要替換這個 food ID 為實際存在的食物
curl -s -X POST "${API_URL}/api/food-knowledge/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "foodIds": ["00000000-0000-0000-0000-000000000001"],
    "reason": "manual_request"
  }' | jq '.'

echo ""
echo "⏱️  等待 2 秒讓佇列更新..."
sleep 2
echo ""

# 步驟 2: 觸發處理
echo "🚀 步驟 2: 觸發 Edge Function 處理佇列..."
echo ""

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg"

curl -s -X POST "https://lbjeyvvierxcnrytuvto.supabase.co/functions/v1/refresh-food-analysis" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'

echo ""
echo "✅ 完成！"
echo ""
echo "如果看到 'processed': 1 或更多，表示成功！"
echo "如果仍然是 0，請查看 CHECK_QUEUE_NOW.md 進行診斷。"
