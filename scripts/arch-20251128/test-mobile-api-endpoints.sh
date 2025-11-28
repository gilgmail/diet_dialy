#!/bin/bash
# 測試 Mobile API 端點是否可訪問

set -e

API_BASE="${EXPO_PUBLIC_API_URL:-http://localhost:3000}"
USER_ID="${1:-}"

if [ -z "$USER_ID" ]; then
  echo "❌ 錯誤: 請提供 userId"
  echo "用法: ./scripts/test-mobile-api-endpoints.sh <userId>"
  exit 1
fi

echo "🧪 測試 Mobile API 端點"
echo "API Base: $API_BASE"
echo "User ID: $USER_ID"
echo ""

# 測試 1: 檢查 API 基礎路徑
echo "📡 測試 1: 檢查 API 基礎路徑"
BASE_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api" || echo "000")
if [ "$BASE_CHECK" = "404" ] || [ "$BASE_CHECK" = "000" ]; then
  echo "⚠️  API 基礎路徑無法訪問 (HTTP $BASE_CHECK)"
  echo "   請確認 Next.js 開發伺服器是否正在運行"
  echo "   預期 URL: $API_BASE"
else
  echo "✅ API 基礎路徑可訪問 (HTTP $BASE_CHECK)"
fi
echo ""

# 測試 2: 檢查資料覆蓋率端點（不需要認證，應該回傳 400 或 401）
echo "📊 測試 2: 檢查資料覆蓋率端點"
COVERAGE_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/mobile/data-coverage?userId=${USER_ID}" || echo "000")
if [ "$COVERAGE_CHECK" = "404" ]; then
  echo "❌ 端點不存在 (HTTP 404)"
  echo "   路徑: ${API_BASE}/api/mobile/data-coverage"
  echo "   請確認 Next.js 路由是否正確配置"
elif [ "$COVERAGE_CHECK" = "000" ]; then
  echo "❌ 無法連接到伺服器"
  echo "   請確認 Next.js 開發伺服器是否正在運行"
elif [ "$COVERAGE_CHECK" = "401" ] || [ "$COVERAGE_CHECK" = "400" ]; then
  echo "✅ 端點存在 (HTTP $COVERAGE_CHECK - 需要認證或參數)"
else
  echo "⚠️  端點回應異常 (HTTP $COVERAGE_CHECK)"
fi
echo ""

# 測試 3: 檢查缺漏提醒端點
echo "🔔 測試 3: 檢查缺漏提醒端點"
ALERTS_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/mobile/data-coverage/alerts?userId=${USER_ID}&daysThreshold=2" || echo "000")
if [ "$ALERTS_CHECK" = "404" ]; then
  echo "❌ 端點不存在 (HTTP 404)"
  echo "   路徑: ${API_BASE}/api/mobile/data-coverage/alerts"
  echo "   請確認 Next.js 路由是否正確配置"
elif [ "$ALERTS_CHECK" = "000" ]; then
  echo "❌ 無法連接到伺服器"
  echo "   請確認 Next.js 開發伺服器是否正在運行"
elif [ "$ALERTS_CHECK" = "401" ] || [ "$ALERTS_CHECK" = "400" ]; then
  echo "✅ 端點存在 (HTTP $ALERTS_CHECK - 需要認證或參數)"
else
  echo "⚠️  端點回應異常 (HTTP $ALERTS_CHECK)"
fi
echo ""

echo "✅ 測試完成"
echo ""
echo "💡 提示:"
echo "   如果看到 404 錯誤，請確認："
echo "   1. Next.js 開發伺服器是否正在運行 (npm run dev)"
echo "   2. API URL 配置是否正確 (EXPO_PUBLIC_API_URL)"
echo "   3. 路由檔案是否存在 (src/app/api/mobile/data-coverage/route.ts)"

