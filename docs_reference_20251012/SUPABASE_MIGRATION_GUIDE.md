# Diet Daily - Supabase 遷移指南

## 📋 遷移計畫概要

### ✅ 已完成的項目

1. **依賴套件安裝**
   - ✅ @supabase/supabase-js
   - ✅ @supabase/ssr

2. **基礎架構設置**
   - ✅ Supabase 客戶端配置 (`src/lib/supabase/client.ts`)
   - ✅ 服務器端配置 (`src/lib/supabase/server.ts`)
   - ✅ 中介軟體配置 (`src/lib/supabase/middleware.ts`)
   - ✅ Next.js 中介軟體 (`middleware.ts`)

3. **數據庫 Schema**
   - ✅ 完整的 PostgreSQL Schema (`supabase/schema.sql`)
   - ✅ 5個主要數據表
     - `diet_daily_users` - 用戶資料
     - `diet_daily_foods` - 食物資料庫
     - `food_entries` - 食物記錄
     - `medical_reports` - 醫療報告
     - `symptom_tracking` - 症狀追蹤

4. **TypeScript 類型定義**
   - ✅ 完整的 Supabase 類型 (`src/types/supabase.ts`)
   - ✅ 便利的類型別名

5. **數據服務層**
   - ✅ 認證服務 (`src/lib/supabase/auth.ts`)
   - ✅ 食物服務 (`src/lib/supabase/foods.ts`)
   - ✅ 食物記錄服務 (`src/lib/supabase/food-entries.ts`)
   - ✅ 醫療報告服務 (`src/lib/supabase/medical-reports.ts`)

6. **React Hook**
   - ✅ 認證 Hook (`src/hooks/useSupabaseAuth.ts`)

7. **環境配置**
   - ✅ 更新 `.env.local` 支援 Supabase

## 🚧 待完成的項目

### 1. Supabase 項目設置

```bash
# 1. 創建 Supabase 項目
# 前往 https://supabase.com 創建新項目

# 2. 執行數據庫 Schema
# 在 Supabase Dashboard > SQL Editor 中執行 supabase/schema.sql

# 3. 配置 Google OAuth
# 在 Authentication > Providers 中啟用 Google OAuth
# 設置重定向 URL: http://localhost:3000/auth/callback

# 4. 更新環境變數
# 將 .env.local 中的 Supabase URL 和 Key 替換為實際值
```

### 2. 認證回調頁面

```tsx
// src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${requestUrl.origin}/food-diary`)
}
```

### 3. 新頁面結構

根據需求，需要重構以下頁面：

#### 主頁 (`/`)
- ✅ 架構已準備
- 🚧 需要替換現有首頁

#### 設定頁面 (`/settings`)
```tsx
// 功能需求：
// - Google OAuth 登入/登出
// - 醫療狀況設定
// - 個人偏好設定
```

#### 食物日記 (`/food-diary`)
```tsx
// 功能需求：
// - 記錄食物攝取
// - 即時同步到 Supabase
// - 醫療評分顯示
```

#### 食物資料庫 (`/foods`)
```tsx
// 功能需求：
// - 瀏覽 diet_daily_foods 表
// - 搜尋和篩選功能
// - 管理員驗證狀態顯示
```

#### 食物追蹤 (`/history`)
```tsx
// 功能需求：
// - 查看個人食物記錄
// - 統計分析和圖表
// - 症狀關聯分析
```

#### 醫療報告 (`/reports`)
```tsx
// 功能需求：
// - 生成 PDF 報告
// - 基於 Supabase 數據
// - 趨勢分析
```

#### 管理員驗證 (`/admin/verification`)
```tsx
// 功能需求：
// - 僅管理員可訪問
// - 驗證待審核食物
// - 批准/拒絕操作
```

### 4. 數據遷移策略

如果有現有 Google Sheets 數據需要遷移：

```tsx
// src/lib/migration/google-sheets-to-supabase.ts
// 實現數據遷移邏輯
```

### 5. 移除 Google Sheets 相關代碼

需要移除的檔案和代碼：
- `src/lib/google/` 目錄下的所有檔案 (除了可能保留的認證部分)
- `src/components/google/` 中的 Sheets 相關組件
- 相關的 API 路由
- 依賴套件清理

## 🔧 實施步驟

### 第一階段：基礎設置
1. ✅ 安裝依賴
2. ✅ 創建 Supabase 配置
3. ✅ 設置數據庫 Schema
4. ✅ 實現服務層

### 第二階段：認證系統
1. 🚧 設置 Supabase Google OAuth
2. 🚧 實現認證回調
3. 🚧 測試登入流程

### 第三階段：頁面重構
1. 🚧 實現設定頁面
2. 🚧 重構食物日記頁面
3. 🚧 實現食物資料庫頁面
4. 🚧 重構歷史記錄頁面
5. 🚧 實現醫療報告頁面
6. 🚧 實現管理員驗證頁面

### 第四階段：數據遷移和清理
1. 🚧 遷移現有數據 (如需要)
2. 🚧 移除 Google Sheets 相關代碼
3. 🚧 清理不需要的依賴
4. 🚧 更新導航和路由

### 第五階段：測試和優化
1. 🚧 功能測試
2. 🚧 性能優化
3. 🚧 安全性審查
4. 🚧 用戶體驗改善

## 📝 重要注意事項

1. **數據安全**：所有用戶數據將存儲在 Supabase，確保啟用 RLS (Row Level Security)

2. **認證流程**：完全基於 Supabase Auth，支援 Google OAuth

3. **即時同步**：利用 Supabase 的即時功能替代 Google Sheets 同步

4. **管理員功能**：通過數據庫的 `is_admin` 欄位控制權限

5. **離線支援**：可考慮使用 Supabase 的離線功能

6. **擴展性**：新架構更容易添加新功能和整合

## 🚀 下一步行動

1. 立即執行 Supabase 項目設置
2. 更新環境變數為實際值
3. 實現認證回調頁面
4. 開始頁面重構工作

這個遷移將大幅提升應用的可維護性、擴展性和用戶體驗！