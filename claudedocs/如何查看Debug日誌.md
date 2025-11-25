# 如何查看 React Native Debug 日誌

## 📱 當前狀態

從終端輸出看，您正在安裝 **Debug 版本** (`DietDailyDev.app`)，但沒有看到 debug 訊息。

## 🔍 查看 Debug 日誌的方法

### 方法 1: Metro Bundler 終端（推薦）

如果使用 Debug 模式，Metro bundler 會顯示 console 日誌：

```bash
# 確保 Metro bundler 正在運行
cd mobile/react-native-starter-kit/DietDailyMobile
npx expo start

# 或者如果已經在運行，查看終端輸出
# 所有 console.log, console.error 等會顯示在這裡
```

**注意**：如果使用 `expo run:ios --device`，Metro bundler 應該會自動啟動。檢查是否有另一個終端視窗顯示 Metro 日誌。

### 方法 2: Xcode Console

1. 打開 Xcode：
```bash
cd mobile/react-native-starter-kit/DietDailyMobile
open ios/DietDailyMobile.xcworkspace
```

2. 在 Xcode 中：
   - 選擇您的設備（Gil-Golden）
   - 點擊底部工具欄的 "Debug area" 按鈕（或按 `Cmd + Shift + Y`）
   - 運行 app（`Cmd + R`）
   - 所有 console 日誌會顯示在底部面板

### 方法 3: React Native Debugger

安裝並使用 React Native Debugger：

```bash
# 安裝（使用 Homebrew）
brew install --cask react-native-debugger

# 或從官網下載
# https://github.com/jhen0409/react-native-debugger
```

使用方式：
1. 打開 React Native Debugger
2. 在 app 中搖動設備（或按 `Cmd + D`）
3. 選擇 "Debug"
4. 在 Debugger 中可以看到所有 console 日誌

### 方法 4: 使用 iOS 設備日誌

```bash
# 使用 idevicesyslog（需要安裝 libimobiledevice）
brew install libimobiledevice

# 查看設備日誌
idevicesyslog | grep -i "DietDaily\|ReactNative\|console"
```

### 方法 5: 在程式碼中啟用詳細日誌

如果還是看不到日誌，可以在程式碼中強制啟用：

```typescript
// 在 App.tsx 或入口檔案中添加
if (__DEV__) {
  console.log('🔍 Debug mode enabled')
  console.log('Environment:', process.env.NODE_ENV)
  console.log('App Variant:', process.env.EXPO_PUBLIC_APP_VARIANT)
}
```

## 🚨 常見問題

### 問題 1: 沒有看到 Metro Bundler 日誌

**原因**：可能使用了 Release 模式，或者 Metro 沒有正確啟動

**解決方案**：
```bash
# 確保使用 Debug 模式
npx expo run:ios --device --configuration Debug

# 或明確啟動 Metro
npx expo start --dev-client
```

### 問題 2: Console 日誌被過濾

**原因**：某些 console 語句可能被生產環境過濾

**解決方案**：使用 `console.warn` 或 `console.error`，這些通常不會被過濾：

```typescript
console.warn('⚠️ Debug message:', data)
console.error('❌ Error:', error)
```

### 問題 3: 日誌太多，找不到需要的訊息

**解決方案**：使用標記來過濾：

```typescript
console.log('[TodayScreen] Navigation:', data)
console.log('[SettingsService] Update:', data)
```

然後在終端中過濾：
```bash
# Metro bundler 終端中
# 只顯示包含 [TodayScreen] 的日誌
```

## 📊 檢查當前模式

在 app 中檢查當前是否為 Debug 模式：

```typescript
// 在任何組件中
import { Platform } from 'react-native'

console.log('Platform:', Platform.OS)
console.log('__DEV__:', __DEV__)
console.log('App Name:', Constants.expoConfig?.name) // 應該是 'DietDailyDev' 如果是 debug
```

## ✅ 快速檢查清單

- [ ] Metro bundler 是否正在運行？
- [ ] 是否使用 Debug configuration？
- [ ] Xcode console 是否打開？
- [ ] 程式碼中是否有 console.log 語句？
- [ ] 是否在 `__DEV__` 條件下輸出日誌？

## 🔧 建議的 Debug 設定

在 `app.config.ts` 中，確保 Debug 模式正確設定：

```typescript
const isDebug = process.env.APP_VARIANT === 'debug' || __DEV__

// 在 extra 中添加 debug flag
extra: {
  isDebug,
  // ...
}
```

然後在程式碼中使用：

```typescript
import Constants from 'expo-constants'

const isDebug = Constants.expoConfig?.extra?.isDebug ?? __DEV__

if (isDebug) {
  console.log('Debug mode is ON')
}
```

---

**提示**：如果使用 Release 模式，console 日誌通常會被移除以優化效能。要查看日誌，必須使用 Debug 模式。

