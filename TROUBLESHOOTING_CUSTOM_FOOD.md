# 🔧 自訂食物創建故障排除指南

## ❌ 常見錯誤訊息與解決方案

### 1. "創建失敗，請重試"

**可能原因**：
- ❌ 資料庫表格不存在
- ❌ 用戶未登入
- ❌ 網路連接問題
- ❌ 必填欄位缺失

**解決步驟**：

#### 🗄️ 檢查資料庫表格
```bash
# 執行檢查腳本
node check_tables_and_setup.js
```

如果顯示表格不存在，請：
1. 登入 Supabase Dashboard: https://app.supabase.com
2. 選擇專案: `lbjeyvvierxcnrytuvto`
3. 進入 SQL Editor
4. 執行 `create_food_tables.sql` 腳本

#### 👤 檢查用戶認證
```bash
# 開啟設定頁面進行登入
open http://localhost:3001/settings
```

確認：
- 完成 Google 登入
- 用戶資料已保存
- 認證狀態正常

#### 📋 檢查表單驗證
- **食物名稱**: 必填，不能為空
- **分類**: 必須選擇一個分類
- **營養成分**: 數值必須為正數

### 2. "Could not find the table 'public.diet_daily_foods'"

**解決方案**：
```sql
-- 在 Supabase SQL Editor 執行
CREATE TABLE IF NOT EXISTS diet_daily_foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    calories DECIMAL(8,2),
    protein DECIMAL(8,2),
    carbohydrates DECIMAL(8,2),
    fat DECIMAL(8,2),
    fiber DECIMAL(8,2),
    medical_scores JSONB DEFAULT '{}'::jsonb,
    allergens JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    verification_status TEXT DEFAULT 'approved',
    created_by UUID,
    is_custom BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. "Row Level Security policy violation"

**解決方案**：
```sql
-- 在 Supabase SQL Editor 執行 RLS 政策
ALTER TABLE diet_daily_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create custom foods" ON diet_daily_foods
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Anyone can view approved foods" ON diet_daily_foods
    FOR SELECT USING (verification_status = 'approved' OR created_by = auth.uid());
```

### 4. "Auth session missing!"

**解決方案**：
1. 開啟 http://localhost:3001/settings
2. 點擊「使用 Google 登入」
3. 完成 OAuth 認證流程
4. 填寫並保存用戶設定

## 🔍 偵錯步驟

### 1. 開啟瀏覽器開發者工具
```javascript
// 在 Console 中檢查錯誤
console.log('Current user:', user)
console.log('Auth state:', { isAuthenticated, isLoading })
```

### 2. 檢查網路請求
- 開啟 Network 分頁
- 查看 Supabase API 請求
- 檢查回應狀態碼和錯誤訊息

### 3. 檢查 Supabase 連接
```javascript
// 在 Console 中測試連接
await supabase.from('diet_daily_foods').select('count', { count: 'exact' })
```

## ⚡ 快速修復

### 自動診斷腳本
```bash
# 執行全面檢查
node check_tables_and_setup.js

# 檢查特定問題
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://lbjeyvvierxcnrytuvto.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiamV5dnZpZXJ4Y25yeXR1dnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTc5MjksImV4cCI6MjA3Mzk3MzkyOX0.Logawrtn7zprlSJFu9Bf3Lh-QHTNHiWpjK503ACUYyg'
);
supabase.from('diet_daily_foods').select('count').then(console.log).catch(console.error);
"
```

### 重置步驟
如果問題持續，請按順序執行：

1. **重新啟動開發服務器**
```bash
# 停止當前服務器 (Ctrl+C)
npm run dev
```

2. **清除瀏覽器快取**
- 開啟開發者工具
- 右鍵重新載入按鈕
- 選擇「清空快取並強制重新載入」

3. **重新登入**
- 到 http://localhost:3001/settings
- 登出後重新登入

## 📞 支援資源

### 檢查清單
- [ ] Supabase 專案正常運行
- [ ] 資料庫表格已建立
- [ ] 用戶已完成認證
- [ ] 表單欄位填寫正確
- [ ] 網路連接正常

### 日誌檢查位置
- **瀏覽器 Console**: 前端錯誤訊息
- **Network 分頁**: API 請求狀態
- **Supabase Dashboard**: 資料庫連接狀態
- **終端機**: 開發服務器日誌

### 聯絡支援
如果問題持續存在，請提供：
1. 完整的錯誤訊息
2. 瀏覽器 Console 截圖
3. 網路請求狀態
4. 當前認證狀態

---

**最常見解決方案**: 99% 的創建失敗問題都是因為資料庫表格缺失。請先確保執行了 `create_food_tables.sql` 腳本！