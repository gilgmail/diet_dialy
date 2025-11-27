# Pi5 Supabase HTTPS 設置完成

## ✅ 設置摘要

已成功在 Pi5 上設置 Supabase 並配置 HTTPS 反向代理。

### 連接資訊

- **API URL**: `https://gilko.redirectme.net/supabase`
- **REST API**: `https://gilko.redirectme.net/supabase/rest/v1/`
- **Realtime WebSocket**: `wss://gilko.redirectme.net/supabase/realtime/v1/`
- **GraphQL**: `https://gilko.redirectme.net/supabase/graphql/v1/`
- **Studio**: `http://10.1.1.85:54323` (僅本地訪問)

### API Keys

```bash
# Publishable Key (前端可用)
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH

# Secret Key (僅後端使用)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
```

---

## 🔧 Nginx 配置

### 配置文件位置

`/etc/nginx/conf.d/n8n.conf` (已添加 Supabase 配置)

### 配置內容

```nginx
# Supabase API 反向代理
location /supabase/ {
    # 移除 /supabase 前綴
    rewrite ^/supabase/(.*) /$1 break;
    
    # 代理到 Supabase API
    proxy_pass http://127.0.0.1:54321;
    proxy_http_version 1.1;
    
    # 基本 headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Prefix /supabase;
    
    # WebSocket 支持（Realtime 需要）
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_cache_bypass $http_upgrade;
    
    # 超時設置
    proxy_read_timeout 600s;
    proxy_connect_timeout 60s;
    proxy_send_timeout 600s;
    
    # 允許大文件上傳
    client_max_body_size 50M;
}
```

---

## 📝 使用步驟

### 1. 更新本地環境變數

運行自動更新腳本：

```bash
./scripts/update-env-for-pi5-supabase.sh
```

或手動更新 `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://gilko.redirectme.net/supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
```

### 2. 驗證配置

```bash
node scripts/check-env-config.js
```

### 3. 測試連接

```bash
# 測試 API 連接
curl https://gilko.redirectme.net/supabase/rest/v1/ \
  -H "apikey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"

# 運行 Realtime 測試
node scripts/test-realtime-sync.js <user_id>
```

---

## 🔍 Realtime 配置狀態

### 已啟用的表

- ✅ `food_entries` - Realtime 已啟用
- ⚠️  `daily_symptom_entries` - 表不存在（需要運行 migrations）

### 啟用 Realtime（如果需要）

在 Pi5 上執行：

```bash
ssh gilko@10.1.1.85
cd ~/diet_dialy

# 使用 supabase db execute
supabase db execute << 'SQL'
ALTER PUBLICATION supabase_realtime ADD TABLE daily_symptom_entries;
SQL
```

---

## 🐛 故障排除

### 問題 1: 無法連接 Supabase

**檢查步驟**:

```bash
# 1. 檢查 Supabase 是否運行
ssh gilko@10.1.1.85 "cd ~/diet_dialy && supabase status"

# 2. 檢查 Nginx 配置
ssh gilko@10.1.1.85 "sudo nginx -t"

# 3. 檢查 Nginx 日誌
ssh gilko@10.1.1.85 "sudo tail -f /var/log/nginx/error.log"
```

### 問題 2: Realtime 事件未收到

**檢查步驟**:

1. **確認表已啟用 Realtime**:
```sql
SELECT tablename FROM pg_publication_tables 
WHERE tablename IN ('food_entries', 'daily_symptom_entries');
```

2. **查看 Realtime 服務日誌**:
```bash
ssh gilko@10.1.1.85
docker ps | grep realtime
docker logs <realtime_container_id> -f
```

3. **檢查 WebSocket 連接**:
```bash
# 在瀏覽器 DevTools > Network > WS 中查看
# 應該看到 wss://gilko.redirectme.net/supabase/realtime/v1/ 的連接
```

---

## 📊 架構圖

```
外部請求
    ↓
https://gilko.redirectme.net/supabase
    ↓
Nginx (443 HTTPS)
    ↓
http://127.0.0.1:54321 (Supabase API)
    ↓
Supabase 服務 (Docker)
    ├─ API (Kong)
    ├─ Realtime
    ├─ Postgres
    └─ Auth
```

---

## 🎯 優勢

1. **HTTPS 加密**: 所有流量通過 SSL/TLS 加密
2. **統一域名**: 使用同一個域名訪問所有服務
3. **路徑分流**: 與其他服務（n8n, Diet Daily）共存
4. **WebSocket 支持**: Realtime 功能正常工作
5. **本地調試**: 可以查看完整的日誌和配置

---

**設置時間**: 2025-11-27
**設置腳本**: `scripts/setup-pi5-supabase-https.sh`
**相關文檔**: 
- [Pi5 Supabase Setup](./pi5-supabase-setup.md)
- [Pi5 Realtime Debug Guide](./pi5-realtime-debug-guide.md)

