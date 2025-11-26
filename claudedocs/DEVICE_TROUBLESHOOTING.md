# iOS 實體設備連接故障排除

**問題**: 安裝 app 到實體設備 "Gil-Golden" 時出現錯誤
**設備**: iPhone 16 Pro (iOS)
**錯誤訊息**: `Error: null` 在連接到 Gil-Golden 時

---

## ✅ 設備連接狀態確認

執行 `xcrun devicectl list devices` 顯示：
```
Name              State                Model
---------------   ------------------   ----------------------------
Gil-Golden        available (paired)   iPhone 16 Pro (iPhone17,1)
```

✅ 設備已連接並配對

---

## 🔧 故障排除步驟

### 方案 1: 快速修復（推薦用於測試）

**使用 iOS 模擬器進行測試**

模擬器的優點：
- 無需證書配置
- 安裝速度快
- Console logs 更容易查看
- 適合開發和測試階段

```bash
# 啟動 iPhone 16 Pro 模擬器（匹配實體設備型號）
xcrun simctl boot "iPhone 16 Pro" 2>/dev/null || echo "Already booted"

# 開啟 Simulator app
open -a Simulator

# 在模擬器上運行 app
cd mobile/react-native-starter-kit/DietDailyMobile
npx expo run:ios --simulator
```

---

### 方案 2: 修復實體設備連接問題

#### Step 1: 檢查設備信任

在 iPhone 上：
1. 確保設備已解鎖
2. 查看是否有「信任此電腦」提示
3. 如果有，點擊「信任」

#### Step 2: 重新配對設備

```bash
# 1. 拔掉 Lightning/USB-C 線
# 2. 關閉 iPhone 的「查找我的 iPhone」（設定 → Apple ID → 尋找 → 查找我的 iPhone）
# 3. 重新插入線材
# 4. 在 iPhone 上信任此電腦
```

#### Step 3: 清理並重建

```bash
cd mobile/react-native-starter-kit/DietDailyMobile

# 清理 build cache
rm -rf ios/build
rm -rf ios/Pods
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 重新安裝 pods
cd ios
pod deintegrate
pod install
cd ..

# 重新運行
npx expo run:ios --device
```

#### Step 4: 檢查開發者證書

在 Xcode 中：
1. 開啟專案：`open ios/DietDailyMobile.xcworkspace`
2. 選擇專案 → Signing & Capabilities
3. 確認：
   - ✅ Team 已選擇
   - ✅ Bundle Identifier 正確
   - ✅ Signing Certificate 有效
4. 選擇 "Gil-Golden" 為運行目標
5. 點擊 ▶️ 運行

#### Step 5: 使用 devicectl 直接安裝

```bash
# 找到 .app 路徑
APP_PATH="$HOME/Library/Developer/Xcode/DerivedData/DietDailyMobile-*/Build/Products/Debug-iphoneos/DietDailyMobile.app"

# 直接安裝到設備
xcrun devicectl device install app --device A23495EF-156D-5726-8391-01E2B18B8B90 "$APP_PATH"

# 啟動 app
xcrun devicectl device process launch --device A23495EF-156D-5726-8391-01E2B18B8B90 com.dietdaily.mobile
```

---

## 📱 方案比較

| 項目 | 模擬器 | 實體設備 |
|------|--------|----------|
| 設置複雜度 | ⭐ 簡單 | ⭐⭐⭐ 複雜 |
| 測試速度 | ⭐⭐⭐ 快 | ⭐⭐ 中等 |
| Console logs | ⭐⭐⭐ 清晰 | ⭐⭐ 需要額外工具 |
| 真實體驗 | ⭐⭐ 接近 | ⭐⭐⭐ 完全真實 |
| 相機/感測器 | ❌ 不可用 | ✅ 完整支援 |
| 網路測試 | ⭐⭐⭐ 容易 | ⭐⭐ 需要實際環境 |

---

## 🎯 建議方案

### 對於 MVP 測試階段（現在）：

**推薦使用模擬器** ✅

原因：
1. 快速開始測試
2. 更容易查看 Console logs（Realtime 事件）
3. 無需處理證書和配對問題
4. 核心功能測試不需要實體硬體

### 對於發布前測試（後期）：

**使用實體設備** ✅

原因：
1. 驗證真實使用體驗
2. 測試相機功能（食物照片識別）
3. 測試實際網路環境
4. 驗證效能和電池消耗

---

## 🚀 立即開始測試（模擬器）

```bash
# 1. 啟動模擬器
xcrun simctl boot "iPhone 16 Pro" 2>/dev/null
open -a Simulator

# 2. 在新終端啟動 Metro
cd mobile/react-native-starter-kit/DietDailyMobile
npm start

# 3. 在另一個終端運行 app
npx expo run:ios --simulator

# 4. 查看 Console logs
# Logs 會直接顯示在 Metro bundler 的終端中
# 尋找：[useFoodDiary], [useSymptomDiary], [useBowelDiary] 的 Realtime 訊息
```

---

## 📊 測試檢查表

準備好後，使用以下文件進行測試：
- **快速測試**: [IOS_MVP_QUICK_CHECKLIST.md](./IOS_MVP_QUICK_CHECKLIST.md)
- **詳細測試**: [IOS_MVP_MANUAL_TESTING.md](./IOS_MVP_MANUAL_TESTING.md)

重點測試項目：
1. ✅ 三大核心功能（飲食、症狀、大便記錄）
2. ✅ Realtime 同步（查看 Console logs）
3. ✅ 資料輸出功能
4. ✅ 使用體驗和效能

---

## 💡 Console Logs 驗證

測試 Realtime 同步時，應該看到：

```
# Mobile 端啟動時
[useFoodDiary] Setting up realtime subscription for user: <user-id>
[useSymptomDiary] Setting up realtime subscription for user: <user-id>
[useBowelDiary] Setting up realtime subscription for user: <user-id>

# Subscription 建立
[useFoodDiary] Subscription status: SUBSCRIBED

# 當 Web 端新增記錄時
[useFoodDiary] Realtime event received: INSERT
[useFoodDiary] Invalidating queries for user: <user-id>

# React Query refetch
Fetching foodEntries...
```

---

**文件版本**: 1.0
**建立時間**: 2025-11-26
**最後更新**: 2025-11-26
