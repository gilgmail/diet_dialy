#!/bin/bash

# iOS 每日測試部署腳本
# 用途：快速編譯並安裝 Release 版本到 iPhone
# 作者：Claude Code
# 日期：2025-10-25

set -e  # 遇到錯誤立即停止

echo "=========================================="
echo "📱 iOS Release Build & Deploy"
echo "=========================================="

# 進入專案目錄
cd /Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile

# 檢查 iPhone 是否連接
echo ""
echo "🔍 檢查 iPhone 連接狀態..."
if ! xcrun devicectl list devices 2>/dev/null | grep -q "00008140-00146D6A2610801C"; then
    echo "❌ iPhone (Gil-Golden) 未連接"
    echo "請使用 USB 連接 iPhone 並信任此電腦"
    exit 1
fi
echo "✅ iPhone 已連接"

# 顯示當前 API URL 設定
echo ""
echo "🔧 當前 API 設定:"
grep "EXPO_PUBLIC_API_URL" .env || echo "警告：找不到 API URL 設定"

# 選擇 build 類型
echo ""
echo "選擇 Build 類型:"
echo "  1) 快速 Build (只更新 JavaScript，約 2-3 分鐘)"
echo "  2) 完整重建 (包含環境變數更新，約 5-8 分鐘)"
read -p "請選擇 [1/2]: " choice

if [ "$choice" = "2" ]; then
    echo ""
    echo "🧹 清理舊的 iOS build..."
    rm -rf ios/

    echo "🔨 重新生成 iOS 專案（載入最新 .env）..."
    npx expo prebuild --platform ios --clean
fi

# 執行 Release build
echo ""
echo "🚀 開始 Release Build..."
echo "⏳ 預計需要 2-8 分鐘，請耐心等待..."
echo ""

# 執行編譯並安裝
npx expo run:ios --device 00008140-00146D6A2610801C --configuration Release

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "📱 請在 iPhone 上："
echo "   1. 如果是首次安裝，前往「設定 > 一般 > VPN與裝置管理」"
echo "   2. 信任開發者憑證：hogiboygoy@me.com"
echo "   3. 啟動 DietDailyMobile app"
echo "   4. 檢查 console logs 確認 API endpoint 包含 :3000"
echo ""
echo "🔍 測試重點："
echo "   - 飲食記錄功能"
echo "   - 症狀記錄功能"
echo "   - 週間 AI 分析（儀表板）"
echo "   - API 連線狀態"
echo ""
echo "📊 查看後端 logs："
echo "   ssh gilko@gilko.redirectme.net"
echo "   docker logs -f diet-daily --tail 100"
echo ""
