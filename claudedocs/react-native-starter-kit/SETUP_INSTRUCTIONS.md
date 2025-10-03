# React Native 專案快速初始化指南

## 🚀 快速開始（5 分鐘設定）

### 方法 1: 使用 Expo（推薦用於快速開發）

```bash
# 1. 創建新專案
npx create-expo-app@latest DietDailyMobile --template blank-typescript

# 2. 進入專案目錄
cd DietDailyMobile

# 3. 複製本套件中的所有配置檔案到專案根目錄
# (詳見下方檔案清單)

# 4. 安裝所有依賴
npm install

# 5. 啟動開發伺服器
npm start
```

### 方法 2: 使用 React Native CLI（用於更多原生控制）

```bash
# 1. 創建新專案
npx react-native@latest init DietDailyMobile --template react-native-template-typescript

# 2. 進入專案目錄
cd DietDailyMobile

# 3. 複製配置檔案（同上）

# 4. 安裝依賴
npm install

# 5. 啟動 Metro
npm start

# 6. 在另一個終端啟動 iOS 或 Android
npm run ios
# 或
npm run android
```

---

## 📦 檔案清單與用途

本套件包含以下檔案，請依序複製到您的新專案中：

### 1. 配置檔案（專案根目錄）

| 檔案 | 用途 | 位置 |
|------|------|------|
| `package.json` | 專案依賴和腳本 | 專案根目錄 |
| `tsconfig.json` | TypeScript 配置 | 專案根目錄 |
| `.eslintrc.js` | ESLint 規則 | 專案根目錄 |
| `.prettierrc.js` | Prettier 格式化 | 專案根目錄 |
| `.env.example` | 環境變數範例 | 專案根目錄 |
| `babel.config.js` | Babel 配置（path aliases） | 專案根目錄 |

### 2. 原始碼檔案

```
src/
├── theme/                    # 設計系統
│   ├── colors.ts            # 色彩定義
│   ├── typography.ts        # 字體系統
│   ├── spacing.ts           # 間距系統
│   ├── shadows.ts           # 陰影系統
│   └── index.ts             # 統一導出
│
├── shared/
│   ├── api/
│   │   └── supabase/
│   │       └── client.ts    # Supabase 客戶端
│   ├── types/
│   │   └── supabase.ts      # 型別定義（從 Next.js 複製）
│   └── stores/
│       └── authStore.ts     # 認證狀態管理
│
└── app/
    ├── App.tsx              # 應用入口
    └── providers/
        └── QueryProvider.tsx # React Query 配置
```

---

## 🔧 逐步設定說明

### 步驟 1: 創建專案並安裝依賴

```bash
# 使用 Expo（推薦）
npx create-expo-app@latest DietDailyMobile --template blank-typescript
cd DietDailyMobile

# 安裝核心依賴
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install zustand @tanstack/react-query
npm install react-native-paper react-native-vector-icons react-native-svg
npm install @supabase/supabase-js react-native-url-polyfill
npm install react-hook-form zod @hookform/resolvers
npm install date-fns axios lodash
npm install @react-native-async-storage/async-storage
npm install @react-native-community/netinfo

# 安裝開發依賴
npm install --save-dev @types/react @types/react-native
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install --save-dev prettier eslint-config-prettier
npm install --save-dev @testing-library/react-native jest
```

### 步驟 2: 複製配置檔案

從本套件複製以下檔案到專案根目錄：
- `tsconfig.json`
- `.eslintrc.js`
- `.prettierrc.js`
- `babel.config.js`

### 步驟 3: 設定環境變數

1. 複製 `.env.example` 為 `.env.development`
2. 填入您的 Supabase 憑證：

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_ENV=development
```

### 步驟 4: 創建目錄結構

```bash
# 創建主要目錄
mkdir -p src/app/{navigation,providers}
mkdir -p src/features/{auth,food-diary,symptom-diary,dashboard,food-database,settings}/{components,screens,hooks,services,types}
mkdir -p src/shared/{api/{supabase,rest,types},components,hooks,stores,services/{storage,sync},utils,constants,types}
mkdir -p src/theme
mkdir -p assets/{images,fonts,icons}
mkdir -p __tests__/{unit,integration,e2e}
```

### 步驟 5: 複製設計系統檔案

將本套件的 `src/theme/` 目錄完整複製到您的專案中。

### 步驟 6: 複製 Supabase 設定

1. 複製 `src/shared/api/supabase/client.ts`
2. 從您的 Next.js 專案複製 `src/types/supabase.ts` 到 `src/shared/types/supabase.ts`

### 步驟 7: 設定 App.tsx

將本套件的 `src/app/App.tsx` 複製到您的專案，或參考其內容更新現有檔案。

---

## ✅ 驗證設定

執行以下命令確認設定成功：

```bash
# 1. TypeScript 檢查
npx tsc --noEmit

# 2. ESLint 檢查
npx eslint src/

# 3. 啟動開發伺服器
npm start
```

如果沒有錯誤，您的專案已成功初始化！

---

## 🎯 下一步

設定完成後，您可以開始實施：

1. **Week 2: 認證模組**
   - 創建 AuthService
   - 實作登入畫面
   - 設定導航

2. **Week 3: 食物日記**
   - FoodDiaryService
   - 食物記錄表單

3. **Week 4: 症狀日記**
   - SymptomDiaryService
   - 症狀追蹤功能

---

## 🐛 常見問題

### Q: npm install 失敗

**解決方案**：
```bash
# 清除快取重試
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Q: TypeScript 路徑別名無法解析

**解決方案**：
1. 確認 `tsconfig.json` 的 `paths` 配置正確
2. 確認 `babel.config.js` 有設定 module-resolver
3. 重啟 Metro bundler: `npm start -- --reset-cache`

### Q: iOS/Android 無法啟動

**解決方案**：
```bash
# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

---

## 📚 參考資料

- [Expo 文檔](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Supabase React Native](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)
- [React Query](https://tanstack.com/query/latest)
- [Zustand](https://docs.pmnd.rs/zustand)

---

祝您開發順利！ 🚀
