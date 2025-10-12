# Supabase 項目設置指南

## 🗃️ 第三步：執行資料庫 Schema

1. **進入 SQL Editor**：
   - 在 Supabase Dashboard 左側選單點擊 **SQL Editor**
   - 點擊 "New query"

2. **複製並執行 Schema**：
   - 打開本地專案的 `supabase/schema.sql` 檔案
   - 複製整個檔案內容
   - 貼到 SQL Editor 中
   - 點擊 "Run" 按鈕執行

3. **驗證表格創建**：
   - 點擊左側選單的 **Table Editor**
   - 應該可以看到 5 個表格：
     - `diet_daily_users`
     - `diet_daily_foods`
     - `food_entries`
     - `medical_reports`
     - `symptom_tracking`

## 🔐 第四步：設定 Google OAuth

1. **啟用 Google Provider**：
   - 點擊左側選單的 **Authentication**
   - 點擊 **Providers** 標籤
   - 找到 **Google** 並點擊啟用

2. **配置 Google OAuth**：
   - **Client ID**: `your-google-client-id.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-your-google-client-secret`
   - **Redirect URL**: `http://localhost:3000/auth/callback`

3. **儲存配置**：
   - 點擊 "Save" 儲存設定

## 🌐 第五步：更新本地環境變數

更新 `.env.local` 檔案：

```env
# Supabase Configuration - 替換為你的實際值
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here

# App Configuration
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_DEBUG_MODE=true
```

## ✅ 驗證設置

1. 重新啟動開發伺服器：`npm run dev`
2. 檢查控制台是否有 Supabase 連線錯誤
3. 確認認證流程可以正常工作

## 🚨 注意事項

- **保護你的憑證**：永遠不要將實際的 URL 和 Key 提交到公開儲存庫
- **RLS 政策**：確保 Row Level Security 已啟用（在我們的 schema 中已設定）
- **測試環境**：建議先在開發環境測試，確認無誤後再部署到生產環境