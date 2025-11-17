#!/bin/bash

# 一鍵修復並處理佇列
# 此腳本會：
# 1. 顯示當前佇列狀態
# 2. 重置卡住的項目
# 3. 觸發處理
# 4. 顯示處理結果

echo "🔧 食物知識佇列診斷與修復工具"
echo "================================"
echo ""

# 需要你的 Supabase credentials
SUPABASE_URL="https://lbjeyvvierxcnrytuvto.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg"

echo "📊 步驟 1: 檢查當前佇列狀態"
echo "----------------------------"
echo ""
echo "請在 Supabase SQL Editor 執行以下查詢："
echo ""
cat << 'SQL'
SELECT
  f.name as 食物,
  q.status as 狀態,
  q.scheduled_for <= NOW() as 可處理,
  q.attempts as 嘗試次數
FROM food_analysis_refresh_queue q
JOIN diet_daily_foods f ON f.id = q.food_id
ORDER BY q.scheduled_for;
SQL
echo ""
read -p "按 Enter 繼續到修復步驟..."
echo ""

echo "🔨 步驟 2: 重置佇列項目"
echo "----------------------"
echo ""
echo "請在 Supabase SQL Editor 執行以下 SQL："
echo ""
cat << 'SQL'
UPDATE food_analysis_refresh_queue
SET
  status = 'pending',
  attempts = 0,
  failure_reason = NULL,
  scheduled_for = NOW(),
  updated_at = NOW()
WHERE status != 'completed';
SQL
echo ""
read -p "執行完成後，按 Enter 繼續..."
echo ""

echo "🚀 步驟 3: 觸發處理器"
echo "--------------------"
echo ""

RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/refresh-food-analysis" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "Edge Function 回應："
echo "$RESPONSE" | jq '.'
echo ""

# 解析回應
PROCESSED=$(echo "$RESPONSE" | jq -r '.processed // 0')

if [ "$PROCESSED" -gt 0 ]; then
  echo "✅ 成功處理了 $PROCESSED 個項目！"
  echo ""
  echo "📋 步驟 4: 驗證結果"
  echo "------------------"
  echo ""
  echo "請在 Supabase SQL Editor 執行以下查詢："
  echo ""
  cat << 'SQL'
SELECT
  f.name as 食物,
  q.status as 狀態,
  q.completed_at as 完成時間,
  c.risk_profile->>'severity' as 風險等級,
  c.analysis_tokens->'input' as 輸入Tokens,
  c.analysis_tokens->'output' as 輸出Tokens
FROM food_analysis_refresh_queue q
JOIN diet_daily_foods f ON f.id = q.food_id
LEFT JOIN food_analysis_cache c ON c.food_id = q.food_id
WHERE q.status = 'completed'
  AND q.completed_at > NOW() - INTERVAL '5 minutes'
ORDER BY q.completed_at DESC;
SQL
  echo ""
  echo "🎉 完成！現在可以回到 iOS App 刷新頁面查看結果。"
else
  echo "⚠️  沒有處理任何項目（processed: $PROCESSED）"
  echo ""
  echo "可能原因："
  echo "1. 佇列中沒有 status='pending' 的項目"
  echo "2. scheduled_for 是未來時間"
  echo "3. 佇列實際上是空的"
  echo ""
  echo "請檢查步驟 1 的查詢結果，確認佇列狀態。"
  echo ""
  echo "如果需要手動加入測試項目，請執行："
  echo ""
  cat << 'SQL'
-- 找一個測試食物（例如香蕉）
SELECT id, name FROM diet_daily_foods WHERE name LIKE '%香蕉%' LIMIT 1;

-- 加入佇列（使用上面找到的 ID）
INSERT INTO food_analysis_refresh_queue (
  food_id,
  reason,
  status,
  priority,
  scheduled_for
) VALUES (
  '你的食物ID',
  'manual_request',
  'pending',
  9,
  NOW()
)
ON CONFLICT (food_id) DO UPDATE SET
  status = 'pending',
  scheduled_for = NOW(),
  updated_at = NOW();
SQL
fi

echo ""
echo "================================"
echo "診斷工具執行完畢"
