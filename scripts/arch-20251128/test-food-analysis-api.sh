#!/bin/bash

# 測試 AI 食物分析 API
# 使用方式: ./scripts/test-food-analysis-api.sh [API_URL]

API_URL="${1:-http://localhost:3000}"
ENDPOINT="${API_URL}/api/ai/analyze-food"

echo "🧪 Testing Food Analysis AI API"
echo "================================"
echo "Endpoint: $ENDPOINT"
echo ""

# 測試案例 1: 白米飯（低風險）
echo "📋 Test 1: 白米飯 (Low-risk food)"
echo "--------------------------------"

RESPONSE=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "food_id": "test-rice-001",
    "name": "白米飯",
    "category": "主食",
    "nutrition": {
      "calories": 130,
      "protein": 2.7,
      "carbohydrates": 28,
      "fat": 0.3,
      "fiber": 0.4,
      "sugar": 0.1,
      "sodium": 1
    }
  }')

echo "$RESPONSE" | jq '.'
echo ""

# 檢查是否成功
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "✅ Test 1 PASSED"

  # 提取關鍵資訊
  SEVERITY=$(echo "$RESPONSE" | jq -r '.analysis.risk_profile.severity')
  SUMMARY=$(echo "$RESPONSE" | jq -r '.analysis.summary')
  INPUT_TOKENS=$(echo "$RESPONSE" | jq -r '.analysis.analysis_tokens.input')
  OUTPUT_TOKENS=$(echo "$RESPONSE" | jq -r '.analysis.analysis_tokens.output')

  echo "   Severity: $SEVERITY"
  echo "   Summary: $SUMMARY"
  echo "   Tokens: ${INPUT_TOKENS} input + ${OUTPUT_TOKENS} output = $((INPUT_TOKENS + OUTPUT_TOKENS)) total"
else
  echo "❌ Test 1 FAILED"
  echo "$RESPONSE" | jq '.error'
fi

echo ""
echo "================================"
echo ""

# 測試案例 2: 辣椒（高風險）
echo "📋 Test 2: 辣椒 (High-risk food)"
echo "--------------------------------"

RESPONSE=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "food_id": "test-chili-001",
    "name": "辣椒",
    "category": "調味料",
    "nutrition": {
      "calories": 40,
      "protein": 1.9,
      "carbohydrates": 8.8,
      "fat": 0.4,
      "fiber": 1.5,
      "sugar": 5.3,
      "sodium": 9
    }
  }')

echo "$RESPONSE" | jq '.'
echo ""

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
  echo "✅ Test 2 PASSED"

  SEVERITY=$(echo "$RESPONSE" | jq -r '.analysis.risk_profile.severity')
  TRIGGERS=$(echo "$RESPONSE" | jq -r '.analysis.risk_profile.triggers | join(", ")')
  SUMMARY=$(echo "$RESPONSE" | jq -r '.analysis.summary')

  echo "   Severity: $SEVERITY"
  echo "   Triggers: $TRIGGERS"
  echo "   Summary: $SUMMARY"
else
  echo "❌ Test 2 FAILED"
  echo "$RESPONSE" | jq '.error'
fi

echo ""
echo "================================"
echo ""

# 測試案例 3: 缺少必要欄位（應該失敗）
echo "📋 Test 3: Missing required fields (should fail)"
echo "--------------------------------"

RESPONSE=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "food_id": "test-invalid"
  }')

echo "$RESPONSE" | jq '.'
echo ""

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
  echo "✅ Test 3 PASSED (correctly rejected invalid input)"
else
  echo "❌ Test 3 FAILED (should have rejected invalid input)"
fi

echo ""
echo "================================"
echo "🏁 Test suite completed"
