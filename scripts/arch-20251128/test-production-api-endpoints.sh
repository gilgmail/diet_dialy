#!/bin/bash
# 測試生產環境 API 端點

set -e

API_BASE="https://gilko.redirectme.net"
USER_ID="${1:-}"

if [ -z "$USER_ID" ]; then
  echo "❌ 錯誤: 請提供 userId"
  echo "用法: ./scripts/test-production-api-endpoints.sh <userId>"
  exit 1
fi

echo "🧪 測試生產環境 API 端點"
echo "API Base: $API_BASE"
echo "User ID: $USER_ID"
echo ""

# 測試 1: 檢查 API 基礎路徑
echo "📡 測試 1: 檢查 API 基礎路徑"
BASE_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api" || echo "000")
if [ "$BASE_CHECK" = "404" ] || [ "$BASE_CHECK" = "000" ]; then
  echo "⚠️  API 基礎路徑無法訪問 (HTTP $BASE_CHECK)"
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
  echo "   ⚠️  請確認 Next.js 應用是否已重新部署"
elif [ "$COVERAGE_CHECK" = "000" ]; then
  echo "❌ 無法連接到伺服器"
  echo "   請確認伺服器是否正在運行"
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
  echo "   ⚠️  請確認 Next.js 應用是否已重新部署"
elif [ "$ALERTS_CHECK" = "000" ]; then
  echo "❌ 無法連接到伺服器"
  echo "   請確認伺服器是否正在運行"
elif [ "$ALERTS_CHECK" = "401" ] || [ "$ALERTS_CHECK" = "400" ]; then
  echo "✅ 端點存在 (HTTP $ALERTS_CHECK - 需要認證或參數)"
else
  echo "⚠️  端點回應異常 (HTTP $ALERTS_CHECK)"
fi
echo ""

# 測試 4: 檢查其他已知的 API 端點（確認伺服器正常）
echo "🔍 測試 4: 檢查其他 API 端點（確認伺服器正常）"
FOODS_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/api/foods" || echo "000")
if [ "$FOODS_CHECK" = "200" ]; then
  echo "✅ 伺服器正常運行 (Foods API: HTTP 200)"
else
  echo "⚠️  伺服器可能異常 (Foods API: HTTP $FOODS_CHECK)"
fi
echo ""

echo "✅ 測試完成"
echo ""
echo "💡 提示:"
echo "   如果看到 404 錯誤，請確認："
echo "   1. Next.js 應用是否已重新部署到 pi5"
echo "   2. 部署的應用是否包含新的 API 路由檔案"
echo "   3. Docker 容器是否已重新啟動"

