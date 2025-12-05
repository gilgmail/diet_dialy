# HealthKit Setup Instructions

## ✅ 已完成的設定

1. **npm 套件安裝** - `react-native-health` v1.19.0
2. **iOS CocoaPods** - `RNAppleHealthKit` pod 已安裝
3. **Info.plist 權限** - 健康數據讀取/更新權限說明已添加

## 🔧 需要手動完成的設定

### 在 Xcode 中啟用 HealthKit Capability

1. **開啟 Xcode workspace**
   ```bash
   open ios/DietDailyMobile.xcworkspace
   ```

2. **選擇專案目標**
   - 在左側導航欄選擇 `DietDailyMobile` 專案
   - 在 TARGETS 下選擇 `DietDailyMobile`

3. **添加 HealthKit Capability**
   - 點擊頂部的 `Signing & Capabilities` 標籤
   - 點擊 `+ Capability` 按鈕
   - 搜尋並選擇 **"HealthKit"**
   - 確認 HealthKit 已添加到 Capabilities 列表中

4. **選擇 HealthKit 數據類型（可選）**
   - 在 HealthKit section 中，可以看到 "Clinical Health Records" 選項
   - 對於本專案，不需要勾選這個選項（我們只使用基礎健康數據）

5. **驗證設定**
   - 確認專案中出現 `DietDailyMobile.entitlements` 文件
   - 文件內容應包含：
     ```xml
     <key>com.apple.developer.healthkit</key>
     <true/>
     ```

## 📱 測試 HealthKit 權限

在真實 iOS 裝置上運行 app 後，首次請求 HealthKit 權限時會看到系統彈窗：

```
DietDailyMobile 想要存取您的健康數據

我們需要讀取您的健康數據（睡眠、運動、心率、步數）
來分析飲食與症狀的關聯性，幫助您更好地管理腸道健康。

[不允許] [允許]
```

## ⚠️ 重要注意事項

1. **HealthKit 只能在真實裝置上測試**
   - iOS 模擬器不支援 HealthKit
   - 需要使用實體 iPhone/iPad 進行開發和測試

2. **需要 Apple Developer Account**
   - HealthKit 需要正確的 provisioning profile
   - 確保您的 Apple Developer Account 已設定

3. **Bundle Identifier**
   - 確保 Bundle ID 與 Apple Developer Portal 中的 App ID 一致
   - HealthKit capability 必須在 App ID 中啟用

## 🚀 下一步

完成 Xcode 設定後，您可以：

1. 建置並運行 app：
   ```bash
   npx expo run:ios --device
   ```

2. 測試 HealthKit 權限請求功能

3. 開始使用 HealthKitService 同步數據

---

**設定完成檢查清單：**
- [ ] Xcode 中已添加 HealthKit Capability
- [ ] 出現 `.entitlements` 文件
- [ ] 在真實裝置上測試權限請求
- [ ] 確認可以讀取 HealthKit 數據
