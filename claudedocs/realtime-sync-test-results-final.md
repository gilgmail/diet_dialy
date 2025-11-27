# Realtime Sync 測試報告 (自動化驗證)

## 測試日期
2025-11-27

## 測試環境
- Supabase Project: lbjeyvvierxcnrytuvto (Production)
- 測試用戶: 22e990b6-a888-4beb-9ac6-c9a145731542
- 認證方式: 自動登入 (Auto-Login) 使用 Service Role Key 獲取有效 Session

## 測試結果摘要

| 測試項目 | 狀態 | 延遲 (ms) | 備註 |
|---------|------|----------|------|
| **Session 獲取** | ✅ 通過 | - | 成功使用 Service Role Key 生成 Magic Link 並通過 Email OTP 驗證 |
| **Food Entries** | | | |
| - INSERT | ✅ 通過 | 499ms | |
| - UPDATE | ✅ 通過 | 383ms | |
| - DELETE | ✅ 通過 | 346ms | **需啟用 REPLICA IDENTITY FULL** |
| **Symptom Entries** | | | |
| - INSERT | ✅ 通過 | 1333ms | |
| - UPDATE | ✅ 通過 | - | |
| - DELETE | ✅ 通過 | - | **需啟用 REPLICA IDENTITY FULL** |

**總體通過率**: 100% (6/6 測試通過)

## 關鍵修復與發現

### 1. DELETE 事件接收失敗問題
**問題**: 在 RLS 開啟的情況下，DELETE 操作無法觸發 Realtime 事件，或客戶端收不到事件。
**原因**: Supabase Realtime 在 DELETE 事件中預設只發送主鍵 (ID)。如果 RLS 策略依賴其他欄位 (如 `user_id`) 來過濾權限，而這些欄位在 DELETE payload 中缺失，RLS 就會拒絕發送該事件。
**解決方案**: 為相關資料表啟用 `REPLICA IDENTITY FULL`，確保 DELETE 事件包含完整舊記錄。
```sql
ALTER TABLE public.food_entries REPLICA IDENTITY FULL;
ALTER TABLE public.daily_symptom_entries REPLICA IDENTITY FULL;
```

### 2. 自動化測試腳本改進
**問題**: 手動獲取 Access Token 太繁瑣且容易過期。
**解決方案**: 
- 更新了 `test-realtime-sync.js`，集成自動登入功能。
- 使用 `SUPABASE_SERVICE_ROLE_KEY` 自動為測試用戶生成 Magic Link。
- 通過 `email_otp` 或解析 Magic Link Token 自動獲取有效 Session。
- 解決了測試腳本執行完畢後不自動退出的問題 (`process.exit(0)`)。

### 3. Supabase Pooler 連接
**發現**: 使用 `psql` 連接 Supabase Pooler 時，需要準確的主機名。
- `aws-0` 和 `aws-1` 可能都存在，但需根據專案實際配置選擇 (本案使用 `aws-1-ap-southeast-1.pooler.supabase.com`)。
- 必須使用 Session Mode (Port 5432) 或 Transaction Mode (Port 6543) 並指定正確的用戶名格式 `postgres.project_ref`。

## 結論
Realtime Sync 功能已完全驗證並修復。
1. ✅ **雙向同步正常**: INSERT/UPDATE/DELETE 事件均能即時接收。
2. ✅ **RLS 兼容性**: 在嚴格 RLS 策略下，Realtime 事件能正確過濾並發送給授權用戶。
3. ✅ **基礎設施**: 資料庫配置 (`REPLICA IDENTITY`) 已更新以支持完整同步功能。

## 建議
- 在未來的資料表設計中，若需要 RLS + Realtime DELETE 支援，請記得啟用 `REPLICA IDENTITY FULL`。
- 保留 `scripts/test-realtime-sync.js` 作為 CI/CD 或定期健康檢查的一部分。

