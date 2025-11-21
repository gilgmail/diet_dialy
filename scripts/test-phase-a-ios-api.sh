#!/bin/bash
# Phase A iOS API 端點測試腳本

set -e

API_BASE="${EXPO_PUBLIC_API_URL:-http://localhost:3000}"
USER_ID="${1:-}"

if [ -z "$USER_ID" ]; then
  echo "❌ 錯誤: 請提供 userId"
  echo "用法: ./scripts/test-phase-a-ios-api.sh <userId>"
  echo "範例: ./scripts/test-phase-a-ios-api.sh 153d4a58-8406-4304-b5b1-1fd9ee433aa6"
  exit 1
fi

echo "🧪 測試 Phase A iOS API 端點"
echo "API Base: $API_BASE"
echo "User ID: $USER_ID"
echo ""

# 測試 1: 資料覆蓋率 API
echo "📊 測試 1: GET /api/mobile/data-coverage"
COVERAGE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "${API_BASE}/api/mobile/data-coverage?userId=${USER_ID}" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$COVERAGE_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
COVERAGE_BODY=$(echo "$COVERAGE_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ HTTP 200 OK"
  echo "$COVERAGE_BODY" | jq '.' 2>/dev/null || echo "$COVERAGE_BODY"
  
  # 檢查回應結構
  SUCCESS=$(echo "$COVERAGE_BODY" | jq -r '.success' 2>/dev/null || echo "false")
  if [ "$SUCCESS" = "true" ]; then
    echo "✅ 回應格式正確"
    COVERAGE_PERCENT=$(echo "$COVERAGE_BODY" | jq -r '.coverage.symptom_coverage_percent' 2>/dev/null || echo "N/A")
    STATUS=$(echo "$COVERAGE_BODY" | jq -r '.coverage.overall_data_status' 2>/dev/null || echo "N/A")
    echo "   症狀覆蓋率: ${COVERAGE_PERCENT}%"
    echo "   整體狀態: ${STATUS}"
  else
    echo "⚠️  回應格式可能有問題"
  fi
else
  echo "❌ HTTP $HTTP_STATUS"
  echo "$COVERAGE_BODY"
fi

echo ""

# 測試 2: 缺漏提醒 API
echo "🔔 測試 2: GET /api/mobile/data-coverage/alerts"
ALERTS_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "${API_BASE}/api/mobile/data-coverage/alerts?userId=${USER_ID}&daysThreshold=2" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$ALERTS_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
ALERTS_BODY=$(echo "$ALERTS_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ HTTP 200 OK"
  echo "$ALERTS_BODY" | jq '.' 2>/dev/null || echo "$ALERTS_BODY"
  
  # 檢查回應結構
  SUCCESS=$(echo "$ALERTS_BODY" | jq -r '.success' 2>/dev/null || echo "false")
  if [ "$SUCCESS" = "true" ]; then
    echo "✅ 回應格式正確"
    ALERTS_COUNT=$(echo "$ALERTS_BODY" | jq '.alerts | length' 2>/dev/null || echo "0")
    echo "   缺漏提醒數量: ${ALERTS_COUNT}"
    
    if [ "$ALERTS_COUNT" -gt 0 ]; then
      echo "   缺漏項目:"
      echo "$ALERTS_BODY" | jq -r '.alerts[] | "     - \(.category): 缺漏 \(.missing_days) 天"' 2>/dev/null || echo "     (無法解析)"
    else
      echo "   ✅ 沒有缺漏項目"
    fi
  else
    echo "⚠️  回應格式可能有問題"
  fi
else
  echo "❌ HTTP $HTTP_STATUS"
  echo "$ALERTS_BODY"
fi

echo ""
echo "✅ 測試完成"

