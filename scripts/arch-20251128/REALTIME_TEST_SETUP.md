# Realtime 測試設置指南

## 📋 配置 ANON Key 進行 Realtime 測試

### 方法 1: 使用 Anon Key（推薦用於測試 Realtime）

#### 步驟 1: 修改 `.env.local` 文件

在項目根目錄的 `.env.local` 文件中：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# 註釋或移除 Service Role Key（這樣腳本會使用 anon key）
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 步驟 2: (可選) 設置 Access Token 以通過 RLS

如果要測試需要認證的操作，需要設置 `TEST_ACCESS_TOKEN`：

```bash
# 在 .env.local 中添加
TEST_ACCESS_TOKEN=your-access-token-here
```

**如何獲取 Access Token**:

### 方法 1: 使用輔助腳本（最簡單）

```bash
# 運行輔助腳本查看所有方法
node scripts/get-access-token.js

# 或嘗試自動生成（需要 Service Role Key）
node scripts/get-access-token.js <user_id>
```

### 方法 2: 從瀏覽器獲取（推薦）

1. 打開你的 Web App (http://localhost:3000)
2. **登入你的帳號**
3. 打開瀏覽器 DevTools (F12)
4. 前往 **Application > Cookies**
5. 找到你的域名下的 cookies
6. 尋找包含 `auth-token` 或 `supabase` 的 cookie
   - 名稱可能是: `sb-<project-id>-auth-token`
   - 或: `supabase-auth-token`
7. 複製 cookie 的值（通常是 JSON 格式）
8. 從 JSON 中提取 `access_token` 的值

**範例**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "expires_at": 1234567890
}
```
複製 `access_token` 的值。

### 方法 3: 從 Mobile App 獲取

1. 在 Mobile App 中登入
2. 使用 React Native Debugger
3. 檢查 AsyncStorage
4. 找到 `supabase.auth.token`
5. 提取 `access_token` 值

### 方法 4: 使用 Supabase Dashboard

1. 前往 Supabase Dashboard > Authentication > Users
2. 找到你的用戶
3. 點擊用戶詳情
4. 查看 Access Token（如果可用）

#### 步驟 3: 運行測試

```bash
node scripts/test-realtime-sync.js <user_id>
```

---

### 方法 2: 使用 Service Role Key（不推薦用於 Realtime 測試）

Service Role Key 會繞過 RLS，但 **可能無法觸發 Realtime 事件**。

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 🔍 驗證配置

運行腳本時，查看開頭輸出：

### ✅ 正確配置（使用 Anon Key）
```
✅ 使用 Anon Key（適合測試 Realtime）
✅ 已設置 Access Token（將通過 RLS 政策）
```

### ⚠️ 部分配置（使用 Anon Key 但未認證）
```
✅ 使用 Anon Key（適合測試 Realtime）
⚠️  未設置 Access Token（可能無法通過 RLS 政策）
```

### ⚠️ 不適合 Realtime 測試
```
⚠️  使用 Service Role Key（將繞過 RLS 政策）
⚠️  注意: Service Role Key 可能無法觸發 Realtime 事件
```

---

## 📝 環境變數說明

| 變數名 | 必需 | 說明 | 位置 |
|--------|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 項目 URL | `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase Anon Key | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | Service Role Key（會繞過 RLS） | `.env.local` |
| `TEST_ACCESS_TOKEN` | ❌ | 用戶 Access Token（用於通過 RLS） | `.env.local` |

---

## 🎯 測試 Realtime 的最佳實踐

1. **使用 Anon Key** 而非 Service Role Key
2. **設置 Access Token** 以通過 RLS 政策
3. **確保 Supabase Realtime 已啟用**:
   - 前往 Supabase Dashboard
   - Database > Realtime
   - 確認 `food_entries` 和 `daily_symptom_entries` 表的 Realtime 已啟用

---

## 🐛 常見問題

### Q: 為什麼使用 Service Role Key 時收不到 Realtime 事件？

A: Service Role Key 繞過了 Supabase 的認證系統，Realtime 服務可能無法正確識別用戶上下文，導致事件不會觸發。

### Q: 如何確認 Realtime 是否正常工作？

A: 
1. 檢查 Supabase Dashboard > Database > Realtime 中的連接數
2. 查看腳本輸出中的 "Subscription 狀態: SUBSCRIBED"
3. 觀察是否收到事件（應該在 3 秒內收到）

### Q: Access Token 過期了怎麼辦？

A: Access Token 通常有 1 小時的有效期。過期後需要重新獲取：
- 重新登入 Web/Mobile app
- 從新的 session 中提取 access_token
- 更新 `.env.local` 中的 `TEST_ACCESS_TOKEN`
- 或使用 `node scripts/get-access-token.js` 查看獲取方法

### Q: 沒有 Access Token 可以測試嗎？

A: 可以，但有幾個選項：

1. **使用 Service Role Key**（不推薦用於 Realtime 測試）:
   ```bash
   # 在 .env.local 中
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   # 註釋掉 TEST_ACCESS_TOKEN
   ```
   - ✅ 可以繞過 RLS 政策
   - ❌ 可能無法觸發 Realtime 事件

2. **檢查 RLS 政策是否允許匿名訪問**:
   - 如果 RLS 政策允許匿名用戶讀寫，可以不設置 Access Token
   - 但這通常不建議用於生產環境

3. **從實際的 Web/Mobile App 獲取**:
   - 登入你的應用
   - 使用上述方法獲取 Access Token

---

**最後更新**: 2025-01-12

