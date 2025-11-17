#!/bin/bash

# 直接觸發 Edge Function 處理佇列
# 這樣可以繞過 iOS App，直接測試後端

echo "🔧 直接觸發 Edge Function 處理佇列..."
echo ""

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg"

curl -X POST "https://lbjeyvvierxcnrytuvto.supabase.co/functions/v1/refresh-food-analysis" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'

echo ""
echo "✅ 完成！"
echo ""
echo "如果看到 'processed': 1 或更多，表示成功處理了佇列項目。"
echo "現在可以回到 iOS App 刷新狀態，應該會看到項目已完成。"
