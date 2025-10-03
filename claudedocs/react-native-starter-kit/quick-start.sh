#!/bin/bash

# Diet Daily React Native 快速啟動腳本
# 使用方式: ./quick-start.sh

set -e

echo "🚀 Diet Daily React Native 專案初始化"
echo "======================================="

# 檢查是否安裝了 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未安裝 Node.js"
    echo "請從 https://nodejs.org/ 安裝 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"
echo ""

# 詢問專案名稱
read -p "請輸入專案名稱 (預設: DietDailyMobile): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-DietDailyMobile}

echo ""
echo "📦 步驟 1/6: 創建 Expo 專案..."
npx create-expo-app@latest "$PROJECT_NAME" --template blank-typescript

cd "$PROJECT_NAME"

echo ""
echo "📦 步驟 2/6: 安裝核心依賴..."
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack \
  react-native-screens react-native-safe-area-context \
  zustand @tanstack/react-query \
  react-native-paper react-native-vector-icons react-native-svg \
  @supabase/supabase-js react-native-url-polyfill \
  react-hook-form zod @hookform/resolvers \
  date-fns axios lodash \
  @react-native-async-storage/async-storage \
  @react-native-community/netinfo

echo ""
echo "📦 步驟 3/6: 安裝開發依賴..."
npm install --save-dev @types/react @types/react-native @types/lodash \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  prettier eslint-config-prettier \
  @testing-library/react-native

echo ""
echo "📝 步驟 4/6: 複製配置檔案..."

# 複製配置檔案（這些檔案應該在 starter-kit 資料夾中）
STARTER_KIT_PATH="../react-native-starter-kit"

if [ -d "$STARTER_KIT_PATH" ]; then
  # 配置檔案
  cp "$STARTER_KIT_PATH/tsconfig.json" .
  cp "$STARTER_KIT_PATH/.eslintrc.js" .
  cp "$STARTER_KIT_PATH/.prettierrc.js" .
  cp "$STARTER_KIT_PATH/babel.config.js" .
  cp "$STARTER_KIT_PATH/.env.example" .env.development

  # 原始碼檔案
  cp -r "$STARTER_KIT_PATH/src" .
  cp "$STARTER_KIT_PATH/App.tsx" .

  echo "✅ 配置檔案已複製"
else
  echo "⚠️  警告: 找不到 starter-kit 資料夾"
  echo "請手動複製配置檔案"
fi

echo ""
echo "📂 步驟 5/6: 創建目錄結構..."
mkdir -p src/app/{navigation,providers}
mkdir -p src/features/{auth,food-diary,symptom-diary,dashboard,food-database,settings}/{components,screens,hooks,services,types}
mkdir -p src/shared/{components,hooks,services/{storage,sync},utils,constants,types}
mkdir -p assets/{images,fonts,icons}
mkdir -p __tests__/{unit,integration,e2e}

echo "✅ 目錄結構已創建"

echo ""
echo "🔧 步驟 6/6: 設定環境變數..."
echo ""
echo "⚠️  重要: 請編輯 .env.development 檔案，填入您的 Supabase 憑證："
echo "  - EXPO_PUBLIC_SUPABASE_URL"
echo "  - EXPO_PUBLIC_SUPABASE_ANON_KEY"
echo ""

echo "✅ 初始化完成！"
echo ""
echo "🎯 下一步:"
echo "  1. 編輯 .env.development 填入 Supabase 憑證"
echo "  2. 從 Next.js 專案複製 src/types/supabase.ts 到 src/shared/types/"
echo "  3. 執行 npm start 啟動開發伺服器"
echo ""
echo "📚 參考文件:"
echo "  - SETUP_INSTRUCTIONS.md - 詳細設定指南"
echo "  - PHASE1_IMPLEMENTATION_GUIDE.md - Week 1-4 實施指南"
echo ""
