# iOS 每日測試流程完整指南

## 📱 Release Build 已安裝完成

您的 iPhone (Gil-Golden) 現在已安裝 Release 版本的 DietDailyMobile app。

### ✅ 當前狀態
- **Build 類型**: Release (獨立運行，不需要 Metro 開發服務器)
- **API URL**: `http://gilko.redirectme.net:3000` (已修正)
- **設備**: Gil-Golden (00008140-00146D6A2610801C)
- **簽名**: Apple Development: hogiboygoy@me.com

---

## 🔄 每日測試流程

### 方法一：快速更新測試（推薦）

當您只修改了 JavaScript 代碼（不涉及 native 變更）：

```bash
# 1. 進入專案目錄
cd /Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile

# 2. 執行快速 Release build（約 2-3 分鐘）
npx expo run:ios --device --configuration Release
```

**優點**:
- ✅ 自動編譯並安裝到 iPhone
- ✅ 包含最新的環境變數設定
- ✅ 獨立運行，無需開發服務器

### 方法二：完整重建（環境變數更改時）

當您修改了 `.env` 檔案或需要完全重建時：

```bash
# 1. 清理舊的 iOS build
rm -rf ios/

# 2. 重新生成 iOS 專案（載入最新 .env）
npx expo prebuild --platform ios --clean

# 3. 執行 Release build
npx expo run:ios --device --configuration Release
```

**何時需要**:
- 🔧 修改了 `.env` 中的 API URL 或其他環境變數
- 🔧 更新了 Expo SDK 版本
- 🔧 新增或移除 native dependencies
- 🔧 遇到編譯錯誤需要完全清理

---

## 🚀 一鍵部署腳本

### 自動化腳本：`deploy_to_iphone.sh`

```bash
#!/bin/bash

# iOS 每日測試部署腳本
# 用途：快速編譯並安裝 Release 版本到 iPhone

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
grep "EXPO_PUBLIC_API_URL" .env

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

    echo "🔨 重新生成 iOS 專案..."
    npx expo prebuild --platform ios --clean
fi

# 執行 Release build
echo ""
echo "🚀 開始 Release Build..."
echo "⏳ 預計需要 2-8 分鐘，請耐心等待..."
echo ""

npx expo run:ios --device --configuration Release

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "📱 請在 iPhone 上："
echo "   1. 如果是首次安裝，前往「設定 > 一般 > VPN與裝置管理」"
echo "   2. 信任開發者憑證：hogiboygoy@me.com"
echo "   3. 啟動 DietDailyMobile app"
echo "   4. 檢查 API 連線是否正常"
echo ""
```

### 建立並使用腳本

```bash
# 1. 建立腳本檔案
cat > /Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile/deploy_to_iphone.sh << 'EOF'
[上面的腳本內容]
EOF

# 2. 賦予執行權限
chmod +x /Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile/deploy_to_iphone.sh

# 3. 每日使用
./deploy_to_iphone.sh
```

---

## 📋 測試檢查清單

### 首次安裝後檢查
- [ ] iPhone 設定中信任開發者憑證
- [ ] App 可以正常啟動
- [ ] 可以登入/註冊
- [ ] API 連線正常（endpoint 包含 `:3000`）

### 每日測試重點
- [ ] **飲食記錄功能**
  - 新增飲食項目
  - 從資料庫選擇食物
  - 檢視飲食歷史

- [ ] **症狀記錄功能**
  - 記錄症狀
  - 症狀嚴重度評分

- [ ] **週間 AI 分析** (主要測試重點)
  - 進入儀表板
  - 觸發 AI 分析
  - 檢查 API logs: `http://gilko.redirectme.net:3000/api/ai/weekly-ibd-analysis`
  - 確認分析結果顯示
  - 檢查歷史報告載入

- [ ] **效能測試**
  - App 啟動速度
  - 頁面切換流暢度
  - API 回應時間

---

## 🔍 問題診斷

### 常見問題 1: API 連線失敗

**症狀**: `failed to load AI insights: network request failed`

**檢查步驟**:
```bash
# 1. 查看 app logs 中的 endpoint
# 應該顯示: http://gilko.redirectme.net:3000/api/...
# 如果缺少 :3000，需要重新 prebuild

# 2. 測試 API 可達性
curl "http://gilko.redirectme.net:3000/api/health"

# 3. 如果 API URL 錯誤，執行完整重建
rm -rf ios/
npx expo prebuild --platform ios --clean
npx expo run:ios --device --configuration Release
```

### 常見問題 2: App 顯示 "no script URL provided"

**原因**: 安裝了 Debug 版本但沒有運行 Metro server

**解決方案**:
```bash
# 使用 Release 版本（不需要 Metro）
npx expo run:ios --device --configuration Release
```

### 常見問題 3: 簽名錯誤

**症狀**: `Signing for 'DietDailyMobile' requires a development team`

**解決方案**:
```bash
# 使用 expo run:ios（會自動處理簽名）
npx expo run:ios --device --configuration Release

# 或在 Xcode 中手動設定 Team
open ios/DietDailyMobile.xcworkspace
# 在 Xcode 中選擇 Signing & Capabilities > Team
```

---

## 📊 監控 Debug Logs

### 查看 API 後端 logs

```bash
# SSH 到 Raspberry Pi
ssh gilko@gilko.redirectme.net

# 查看 Docker logs
docker logs -f diet-daily --tail 100

# 搜尋特定 Request ID
docker logs diet-daily 2>&1 | grep "req_1234567890"
```

### API 測試腳本

```bash
# 手動測試週間分析 API
curl -X POST http://gilko.redirectme.net:3000/api/ai/weekly-ibd-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-user-id",
    "startDate": "2025-10-18",
    "endDate": "2025-10-24"
  }'
```

---

## 🔄 版本控制建議

### Git Workflow

```bash
# 每次更新前
git add .
git commit -m "feat: [描述更新內容]"
git push

# 每次成功測試後
git tag -a "v1.0.$(date +%Y%m%d)" -m "Daily build $(date +%Y-%m-%d)"
git push --tags
```

### Build 編號追蹤

在 `app.json` 中更新 build number:

```json
{
  "expo": {
    "ios": {
      "buildNumber": "1.0.20251024"
    }
  }
}
```

---

## 💡 最佳實踐

### 1. 每日測試時間規劃
- **早上**: 部署新版本（2-8 分鐘）
- **白天**: 實際使用測試（記錄飲食、症狀）
- **晚上**: 檢查 AI 分析功能

### 2. 測試數據準備
- 準備至少 3 天的飲食記錄
- 包含不同類型的食物
- 記錄相關症狀

### 3. 問題追蹤
- 發現問題立即記錄 Request ID
- 截圖錯誤訊息
- 查看對應的後端 logs

### 4. 效能基準
- App 啟動時間: < 3 秒
- AI 分析完成: < 30 秒
- API 回應時間: < 5 秒

---

## 📞 緊急情況處理

### App 完全無法啟動

```bash
# 1. 完全清理並重建
cd /Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile
rm -rf ios/ node_modules/
npm install
npx expo prebuild --platform ios --clean
npx expo run:ios --device --configuration Release

# 2. 如果仍然失敗，檢查 Xcode
open ios/DietDailyMobile.xcworkspace
# 在 Xcode 中直接 Build 並查看詳細錯誤
```

### API 後端問題

```bash
# 重啟 Docker 容器
ssh gilko@gilko.redirectme.net
docker restart diet-daily

# 檢查容器狀態
docker ps | grep diet-daily
```

---

## ✅ 總結

**每日標準流程**:
1. 連接 iPhone 到 Mac
2. 執行 `./deploy_to_iphone.sh`
3. 選擇快速 Build (選項 1)
4. 等待 2-3 分鐘
5. 在 iPhone 上測試功能
6. 記錄任何問題

**每週完整測試**:
- 執行選項 2 (完整重建)
- 測試所有功能模組
- 檢查效能指標
- 更新 Git tag

**持續改進**:
- 記錄測試結果
- 優化測試腳本
- 更新文檔
