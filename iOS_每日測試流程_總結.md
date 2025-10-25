# iOS 每日測試流程 - 完整總結報告

**建立日期**: 2025-10-25
**專案**: DietDailyMobile
**目標**: 建立 iOS Release build 並設置每日測試流程

---

## 📋 執行摘要

### 完成項目
- ✅ 成功編譯 iOS Release build
- ✅ 自動安裝到 iPhone (Gil-Golden)
- ✅ 修正 API URL 環境變數問題
- ✅ 建立完整測試流程文檔
- ✅ 建立自動化部署腳本
- ✅ 提供問題診斷指南

### 核心問題與解決方案
**問題**: Mobile app 顯示 "failed to load AI insights: network request failed"
**根本原因**: 環境變數 `EXPO_PUBLIC_API_URL` 未正確載入，app 使用 `http://gilko.redirectme.net` (缺少 `:3000`)
**解決方案**: 執行 `npx expo prebuild --clean` 重新生成 iOS 專案以載入最新環境變數

---

## 🔧 技術細節

### 1. Release Build vs Debug Build

| 特性 | Debug Build | Release Build |
|------|-------------|---------------|
| Metro Server | ✅ 需要運行 | ❌ 不需要 |
| 啟動方式 | 連接到 Metro | 獨立運行 |
| 適用場景 | 開發時即時更新 | 測試/正式環境 |
| 編譯時間 | 快速 (~1 分鐘) | 較長 (~5-8 分鐘) |
| 效能 | 較慢（含 debug 工具） | 優化後（production） |

### 2. 環境變數處理

**Expo 環境變數特性**:
- 所有 `EXPO_PUBLIC_*` 變數會在 **build time** 編譯進 native code
- 修改 `.env` 後必須重新執行 `prebuild` 才會生效
- 環境變數不會在 runtime 動態讀取

**當前設定** (.env):
```bash
EXPO_PUBLIC_SUPABASE_URL=https://lbjeyvvierxcnrytuvto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_API_URL=http://gilko.redirectme.net:3000
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_REQUIRE_DATABASE_FOOD=false
```

**關鍵點**: API URL 必須包含 `:3000` port，否則會連到 nginx (port 80) 導致 301 重定向

### 3. Build 流程

#### 快速 Build (只更新 JavaScript)
```bash
npx expo run:ios --device --configuration Release
```
- 耗時: 2-3 分鐘
- 適用: 只修改 JS/React 代碼
- 保留現有 native 設定

#### 完整重建 (含環境變數更新)
```bash
rm -rf ios/
npx expo prebuild --platform ios --clean
npx expo run:ios --device --configuration Release
```
- 耗時: 5-8 分鐘
- 適用: 修改 `.env`、更新 dependencies、遇到編譯錯誤
- 完全重新生成 iOS 專案

---

## 📱 每日測試流程

### 自動化腳本使用

**位置**: `/Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile/deploy_to_iphone.sh`

**使用方法**:
```bash
cd /Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile
./deploy_to_iphone.sh
```

**腳本功能**:
1. 自動檢查 iPhone (Gil-Golden) 是否連接
2. 顯示當前 API URL 設定
3. 提供兩種 build 選項：
   - 選項 1: 快速 Build (2-3 分鐘)
   - 選項 2: 完整重建 (5-8 分鐘)
4. 自動編譯並安裝到 iPhone
5. 提供測試指引和後續步驟

### 測試檢查清單

#### 首次安裝檢查
- [ ] iPhone 設定 > 一般 > VPN與裝置管理 > 信任開發者憑證
- [ ] App 可以正常啟動
- [ ] 登入/註冊功能正常
- [ ] Console logs 顯示正確的 API endpoint (包含 `:3000`)

#### 每日功能測試
**飲食記錄**:
- [ ] 新增飲食項目
- [ ] 從資料庫選擇食物
- [ ] 檢視飲食歷史
- [ ] 編輯/刪除記錄

**症狀記錄**:
- [ ] 記錄症狀
- [ ] 設定嚴重度
- [ ] 檢視症狀歷史

**週間 AI 分析** (重點測試):
- [ ] 進入儀表板
- [ ] 觸發 AI 分析
- [ ] 確認 API 請求成功（查看 console logs）
- [ ] 分析結果正確顯示
- [ ] 歷史報告載入正常

**效能測試**:
- [ ] App 啟動時間 < 3 秒
- [ ] 頁面切換流暢
- [ ] API 回應時間 < 5 秒
- [ ] AI 分析完成 < 30 秒

---

## 🔍 問題診斷指南

### 問題 1: API 連線失敗

**症狀**:
```
failed to load AI insights: network request failed
JSON Parse error: Unexpected character: <
```

**診斷步驟**:
```bash
# 1. 查看 app console logs 中的 endpoint
# 正確: http://gilko.redirectme.net:3000/api/...
# 錯誤: http://gilko.redirectme.net/api/... (缺少 :3000)

# 2. 如果缺少 :3000，需要重新 prebuild
cd /Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile
rm -rf ios/
npx expo prebuild --platform ios --clean
npx expo run:ios --device --configuration Release

# 3. 測試 API 可達性
curl "http://gilko.redirectme.net:3000/api/health"
```

### 問題 2: "no script URL provided"

**原因**: 安裝了 Debug build 但沒有運行 Metro server

**解決方案**:
```bash
# 方案 A: 使用 Release build (推薦)
npx expo run:ios --device --configuration Release

# 方案 B: 啟動 Metro server for Debug build
npx expo start --dev-client
```

### 問題 3: 簽名錯誤

**症狀**: `Signing for 'DietDailyMobile' requires a development team`

**解決方案**:
```bash
# 使用 expo run:ios（自動處理簽名）
npx expo run:ios --device --configuration Release

# 或在 Xcode 中手動設定 Team
open ios/DietDailyMobile.xcworkspace
# Xcode > Signing & Capabilities > Team > 選擇 hogiboygoy@me.com
```

### 問題 4: Build 失敗

**完全清理重建**:
```bash
cd /Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile

# 清理所有編譯產物
rm -rf ios/ node_modules/ .expo/

# 重新安裝 dependencies
npm install

# 重新生成 iOS 專案
npx expo prebuild --platform ios --clean

# 重新編譯
npx expo run:ios --device --configuration Release
```

---

## 📊 監控與調試

### 後端 API Logs

**查看即時 logs**:
```bash
ssh gilko@gilko.redirectme.net
docker logs -f diet-daily --tail 100
```

**搜尋特定 Request ID**:
```bash
docker logs diet-daily 2>&1 | grep "req_1234567890"
```

**查看週間分析 logs**:
```bash
docker logs diet-daily 2>&1 | grep "週間 AI 分析"
```

### 手動測試 API

```bash
# 測試週間分析 endpoint
curl -X POST http://gilko.redirectme.net:3000/api/ai/weekly-ibd-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "e7c62e70-7e95-40e3-84c6-f27c84ede44e",
    "startDate": "2025-10-18",
    "endDate": "2025-10-24"
  }'

# 測試健康檢查
curl http://gilko.redirectme.net:3000/api/health

# 測試內網連線（從 Mac）
curl http://10.1.1.85:3000/api/health
```

### Debug Logs 說明

我們已在後端建立完整的 debug logging 系統：

**API Route Level** (`/src/app/api/ai/weekly-ibd-analysis/route.ts`):
- Request ID 追蹤
- 請求參數記錄
- 執行時間測量
- API 回應狀態

**Analysis Agent Level** (`/src/lib/ai/weekly-ibd-analysis.ts`):
- 分析流程標記
- 資料查詢結果
- Claude API 呼叫追蹤
- 錯誤詳情記錄

**Log 格式範例**:
```
========== [req_1730123456_abc123] 週間 AI 分析請求開始 ==========
[req_1730123456_abc123] 收到請求參數: {userId: "e7c62e70...", startDate: "2025-10-18", ...}
[req_1730123456_abc123] 🤖 開始執行 AI 分析...
[req_1730123456_abc123] ✅ AI 分析完成 (耗時 15.23s)
[req_1730123456_abc123] 📚 取得歷史報告...
[req_1730123456_abc123] 找到 5 份歷史報告
```

---

## 🎯 最佳實踐

### 每日測試時間規劃

**早上 (09:00-09:10)**:
- 連接 iPhone
- 執行 `./deploy_to_iphone.sh` (選項 1)
- 等待 2-3 分鐘完成安裝

**白天 (實際使用)**:
- 記錄真實的飲食數據
- 記錄症狀（如有）
- 累積至少 3 天數據以測試 AI 分析

**晚上 (20:00-20:30)**:
- 測試週間 AI 分析功能
- 檢查 API logs
- 記錄任何問題或異常
- 查看效能指標

### 測試數據準備

**最小數據要求** (AI 分析):
- 至少 3 筆飲食記錄
- 涵蓋 3 天以上
- 建議包含症狀記錄

**理想測試數據**:
- 7 天完整的飲食記錄
- 每天 2-3 筆飲食項目
- 包含不同類型的食物
- 記錄相關症狀和嚴重度

### 問題追蹤流程

發現問題時：
1. **截圖錯誤訊息**
2. **記錄 Request ID** (從 app console logs)
3. **查看對應的後端 logs**:
   ```bash
   ssh gilko@gilko.redirectme.net
   docker logs diet-daily 2>&1 | grep "req_XXXXX"
   ```
4. **記錄問題到 GitHub Issues** (如果是 bug)
5. **更新測試文檔** (如果是新發現的問題)

---

## 📂 相關文檔

### 建立的文檔檔案

1. **[iOS_每日測試流程.md](mobile/react-native-starter-kit/DietDailyMobile/iOS_每日測試流程.md)**
   - 詳細的測試流程說明
   - Build 方法比較
   - 問題診斷指南
   - 監控工具使用

2. **[deploy_to_iphone.sh](mobile/react-native-starter-kit/DietDailyMobile/deploy_to_iphone.sh)**
   - 自動化部署腳本
   - iPhone 連接檢查
   - 互動式 build 類型選擇
   - 自動編譯和安裝

3. **[iOS_Release_Build_完整指南.md](mobile/react-native-starter-kit/DietDailyMobile/iOS_Release_Build_完整指南.md)**
   - Release vs Debug 詳細比較
   - 多種 build 方法
   - 故障排除
   - 自動化腳本範例

### 先前建立的 Debug 文檔

1. **週間AI分析_Debug訊息說明.md** - Debug 系統說明
2. **週間AI分析_Debug改善總結.md** - Debug 改善總結
3. **Mobile_App_網路問題_完整診斷指南.md** - 網路問題診斷
4. **API_URL_問題_修正方案.md** - API URL 修正方案

---

## 🔄 版本控制建議

### Git Workflow

```bash
# 每次更新前提交
git add .
git commit -m "feat: [描述更新內容]"
git push

# 每次成功測試後建立 tag
git tag -a "v1.0.$(date +%Y%m%d)" -m "Daily build $(date +%Y-%m-%d)"
git push --tags
```

### Build Number 管理

在 `app.json` 中維護 build number:

```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1.0.20251025",
      "bundleIdentifier": "com.dietdaily.mobile"
    }
  }
}
```

**建議格式**: `主版本.次版本.YYYYMMDD`

---

## 📈 效能基準

### 目標效能指標

| 指標 | 目標值 | 測量方法 |
|------|--------|----------|
| App 啟動時間 | < 3 秒 | 從點擊圖示到首頁顯示 |
| 頁面切換延遲 | < 500ms | 點擊到新頁面渲染完成 |
| API 回應時間 | < 5 秒 | 從請求發送到收到回應 |
| AI 分析完成 | < 30 秒 | 觸發分析到結果顯示 |
| 飲食記錄儲存 | < 2 秒 | 送出到成功確認 |

### 效能監控

```bash
# 查看 API 回應時間
docker logs diet-daily 2>&1 | grep "耗時"

# 範例輸出:
# ✅ AI 分析完成 (耗時 15.23s)
# ✅ Claude API responded (12.45s)
```

---

## 🚨 緊急情況處理

### Scenario 1: App 完全無法啟動

```bash
# 完全清理並重建
cd /Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile

# 清理所有
rm -rf ios/ node_modules/ .expo/ package-lock.json

# 重新安裝
npm install

# 重新生成
npx expo prebuild --platform ios --clean

# 重新編譯
npx expo run:ios --device --configuration Release

# 如果還是失敗，用 Xcode 檢查
open ios/DietDailyMobile.xcworkspace
# 在 Xcode 中直接 Build 查看詳細錯誤
```

### Scenario 2: API 後端無回應

```bash
# SSH 到 Raspberry Pi
ssh gilko@gilko.redirectme.net

# 檢查容器狀態
docker ps | grep diet-daily

# 查看錯誤 logs
docker logs diet-daily --tail 100

# 重啟容器
docker restart diet-daily

# 檢查重啟後狀態
docker logs -f diet-daily

# 測試 API
curl http://localhost:3000/api/health
```

### Scenario 3: iPhone 無法連接

```bash
# 檢查連接狀態
xcrun devicectl list devices

# 如果看不到裝置
# 1. 重新插拔 USB
# 2. iPhone 上點擊「信任此電腦」
# 3. 重啟 iPhone
# 4. 重啟 Mac

# 檢查開發者模式 (iOS 16+)
# iPhone: 設定 > 隱私權與安全性 > 開發者模式 > 開啟
```

---

## ✅ 當前狀態總結

### 已完成
- ✅ iOS Release build 成功編譯
- ✅ 自動安裝到 iPhone (Gil-Golden device)
- ✅ API URL 環境變數已修正 (包含 `:3000`)
- ✅ 建立完整測試流程文檔
- ✅ 建立自動化部署腳本
- ✅ 後端 Debug logging 系統已就緒

### 待測試
- [ ] 在 iPhone 上啟動 app
- [ ] 驗證 API endpoint 正確 (console logs 顯示 `:3000`)
- [ ] 測試飲食記錄功能
- [ ] 測試症狀記錄功能
- [ ] 測試週間 AI 分析功能
- [ ] 驗證歷史報告載入

### 下一步行動

**立即**:
1. 在 iPhone 上啟動 DietDailyMobile
2. 信任開發者憑證 (如需要)
3. 登入測試帳號
4. 檢查 console logs 確認 API URL

**今天**:
5. 記錄一些飲食和症狀數據
6. 測試 AI 分析功能
7. 查看後端 logs 確認運作正常

**本週**:
8. 持續使用 app 記錄真實數據
9. 每日測試主要功能
10. 記錄任何問題或改進建議
11. 週末執行完整功能測試

---

## 📞 支援資源

### 文檔位置
- **主文檔**: `/Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile/iOS_每日測試流程.md`
- **部署腳本**: `/Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile/deploy_to_iphone.sh`
- **總結報告**: `/Users/gilko/Documents/claude-code/diet_dialy/iOS_每日測試流程_總結.md` (本文檔)

### 常用指令快速參考

```bash
# 快速部署
cd /Users/gilko/Documents/claude-code/diet_dialy/mobile/react-native-starter-kit/DietDailyMobile
./deploy_to_iphone.sh

# 查看後端 logs
ssh gilko@gilko.redirectme.net
docker logs -f diet-daily --tail 100

# 測試 API
curl http://gilko.redirectme.net:3000/api/health

# 完全重建
rm -rf ios/ && npx expo prebuild --platform ios --clean && npx expo run:ios --device --configuration Release
```

### 設備資訊
- **iPhone 名稱**: Gil-Golden
- **裝置 ID**: 00008140-00146D6A2610801C
- **開發者帳號**: hogiboygoy@me.com (L389ABYJDH)
- **Bundle ID**: com.dietdaily.mobile

### 伺服器資訊
- **外部域名**: gilko.redirectme.net
- **內網 IP**: 10.1.1.85
- **API Port**: 3000
- **API Base URL**: http://gilko.redirectme.net:3000

---

**最後更新**: 2025-10-25
**文檔版本**: 1.0
**作者**: Claude Code
**專案**: DietDailyMobile iOS Testing Framework
