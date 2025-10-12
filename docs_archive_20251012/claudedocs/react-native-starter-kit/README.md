# Diet Daily React Native Starter Kit

React Native 專案初始化套件，用於快速建立 Diet Daily 行動應用。

## 📦 套件內容

### 配置檔案
- `package.json` - 完整依賴列表
- `tsconfig.json` - TypeScript 配置
- `.eslintrc.js` - ESLint 規則
- `.prettierrc.js` - Prettier 格式化
- `babel.config.js` - Babel 配置（含 path aliases）
- `.env.example` - 環境變數範例

### 原始碼
```
src/
├── theme/                      # 設計系統
│   ├── colors.ts              # 色彩系統
│   ├── typography.ts          # 字體系統
│   ├── spacing.ts             # 間距系統
│   ├── shadows.ts             # 陰影系統
│   └── index.ts               # 統一導出
│
├── shared/
│   ├── api/supabase/
│   │   └── client.ts          # Supabase 客戶端配置
│   └── stores/
│       └── authStore.ts       # 認證狀態管理 (Zustand)
│
└── App.tsx                     # 應用入口
```

### 文檔
- `SETUP_INSTRUCTIONS.md` - 詳細設定指南
- `README.md` - 本文件

### 工具
- `quick-start.sh` - 自動化初始化腳本

---

## 🚀 快速開始

### 方法 A: 使用自動化腳本（推薦）

```bash
# 1. 進入 starter-kit 目錄
cd react-native-starter-kit

# 2. 執行初始化腳本
./quick-start.sh

# 3. 進入新建的專案
cd DietDailyMobile

# 4. 編輯環境變數
nano .env.development

# 5. 啟動開發伺服器
npm start
```

### 方法 B: 手動設定

請參考 `SETUP_INSTRUCTIONS.md` 的詳細步驟。

---

## ✅ 包含的功能

### Week 1 已實施
- ✅ 專案初始化（Expo）
- ✅ TypeScript 配置
- ✅ ESLint + Prettier
- ✅ 完整設計系統
  - 色彩系統（primary, secondary, semantic colors）
  - 字體系統（sizes, weights, line heights）
  - 間距系統（xs to 3xl）
  - 陰影系統（sm to xl）
- ✅ Supabase 客戶端設定
- ✅ 認證 Store (Zustand)
- ✅ React Query 配置
- ✅ React Navigation 設定
- ✅ 完整依賴安裝

### 已安裝的核心依賴
- React Navigation v6
- Zustand (狀態管理)
- React Query (資料獲取)
- React Native Paper (UI 庫)
- Supabase JS SDK
- React Hook Form + Zod
- AsyncStorage
- NetInfo

---

## 📝 設定步驟摘要

1. **創建 Expo 專案**
   ```bash
   npx create-expo-app@latest DietDailyMobile --template blank-typescript
   ```

2. **安裝依賴**
   ```bash
   npm install
   # (所有依賴已列在 package.json)
   ```

3. **複製配置檔案**
   - tsconfig.json
   - .eslintrc.js
   - .prettierrc.js
   - babel.config.js

4. **複製原始碼**
   - src/theme/ (設計系統)
   - src/shared/api/supabase/client.ts
   - src/shared/stores/authStore.ts
   - App.tsx

5. **設定環境變數**
   ```bash
   cp .env.example .env.development
   # 編輯 .env.development 填入 Supabase 憑證
   ```

6. **複製型別定義**
   ```bash
   # 從 Next.js 專案複製
   cp ../diet_dialy/src/types/supabase.ts src/shared/types/
   ```

7. **啟動開發伺服器**
   ```bash
   npm start
   ```

---

## 🎯 下一步實施

完成 Week 1 初始化後，繼續實施：

### Week 2: 認證模組
- [ ] AuthService (Google OAuth)
- [ ] 歡迎畫面
- [ ] 登入畫面
- [ ] 認證導航

### Week 3: 食物日記
- [ ] FoodDiaryService
- [ ] 食物搜尋
- [ ] 食物記錄表單
- [ ] 食物列表

### Week 4: 症狀日記
- [ ] SymptomDiaryService
- [ ] 症狀記錄表單
- [ ] 症狀列表

---

## 📚 相關文檔

| 文件 | 描述 |
|------|------|
| `SETUP_INSTRUCTIONS.md` | 詳細設定指南 |
| `../PHASE1_IMPLEMENTATION_GUIDE.md` | Week 1-4 完整實施指南 |
| `../REACT_NATIVE_ARCHITECTURE_DESIGN.md` | 完整架構設計 |
| `../iOS_APP_DEVELOPMENT_ANALYSIS.md` | iOS 開發策略分析 |

---

## 🐛 故障排除

### TypeScript 錯誤
```bash
# 重啟 TypeScript 服務
# 在 VS Code: Cmd+Shift+P > TypeScript: Restart TS Server
```

### Metro Bundler 快取問題
```bash
npm start -- --reset-cache
```

### 依賴安裝失敗
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### 路徑別名無法解析
確認 `babel.config.js` 已正確配置 module-resolver plugin

---

## 📞 支援

如有問題，請參考：
- [Expo 文檔](https://docs.expo.dev/)
- [React Navigation 文檔](https://reactnavigation.org/)
- [Supabase React Native 指南](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)

---

## 📄 授權

本套件為 Diet Daily 專案內部使用。
