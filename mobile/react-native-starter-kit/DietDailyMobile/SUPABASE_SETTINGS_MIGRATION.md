# Supabase 設定遷移說明

## 📝 變更摘要

已將設定儲存方式從 **AsyncStorage** 改為 **Supabase**，實現：

### ✨ 新功能
1. **跨設備同步** - 使用者在不同裝置登入時，設定自動同步
2. **雲端備份** - 設定資料安全存放在 Supabase，不會因刪除 App 而遺失
3. **即時同步** - 使用 Supabase Realtime，設定變更立即同步到所有裝置
4. **統一管理** - 所有資料都在 Supabase，便於管理和追蹤

## 🗄️ 資料庫結構

### 新增 Table: `user_settings`

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),

  -- 時區設定
  timezone TEXT DEFAULT 'Asia/Taipei',
  timezone_offset TEXT DEFAULT '+08:00',

  -- 健康設定
  chronic_disease TEXT DEFAULT 'IBD',

  -- 通知設定
  notifications_enabled BOOLEAN DEFAULT true,
  breakfast_time TEXT DEFAULT '08:00',
  lunch_time TEXT DEFAULT '12:30',
  dinner_time TEXT DEFAULT '18:30',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);
```

### RLS 政策
- ✅ 使用者只能讀取自己的設定
- ✅ 使用者只能新增/更新/刪除自己的設定
- ✅ 完整的 Row Level Security 保護

## 📂 檔案變更

### 新增檔案

1. **`/supabase/migrations/20250106_create_user_settings.sql`**
   - 資料庫 schema 和 RLS 政策
   - 自動更新 `updated_at` 的 trigger

2. **`/src/features/settings/services/SettingsService.ts`**
   - Supabase CRUD 操作
   - 即時訂閱功能
   - 自動創建預設設定

### 修改檔案

1. **`/src/features/settings/stores/settingsStore.ts`**
   - 移除 AsyncStorage persistence
   - 新增 `initializeSettings(userId)` - 從 Supabase 載入設定
   - 新增 `updateSettings(userId, partial)` - 更新到 Supabase
   - 新增 `subscribeToChanges(userId)` - 訂閱即時變更
   - 新增 `isLoading` 和 `isInitialized` 狀態

2. **`/src/features/settings/screens/SettingsScreen.tsx`**
   - 在 mount 時呼叫 `initializeSettings()`
   - 訂閱設定變更以實現即時同步
   - 所有更新操作都需要傳入 `userId`
   - 新增載入指示器

## 🔄 遷移步驟

### 1. 執行 Migration

**本地開發環境：**
```bash
# 確保 Docker 正在運行
npx supabase db reset --local
```

**Production (Pi Docker)：**
```bash
# SSH 到 Pi
ssh pi@10.1.1.85

# 進入專案目錄
cd diet-daily

# 執行 migration
npx supabase db push

# 或使用 Docker
cd pi_docker
./deploy-to-pi.sh
```

### 2. 資料遷移（選擇性）

如果有使用者已經在 AsyncStorage 中儲存設定，需要遷移：

```typescript
// 一次性遷移腳本（可在 App 啟動時執行一次）
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SettingsService } from '@/features/settings/services/SettingsService'

async function migrateSettingsToSupabase(userId: string) {
  try {
    // 從 AsyncStorage 讀取舊設定
    const oldData = await AsyncStorage.getItem('diet-daily-settings')
    if (!oldData) return

    const oldSettings = JSON.parse(oldData)

    // 寫入 Supabase
    await SettingsService.updateUserSettings(userId, oldSettings.state.settings)

    // 清除 AsyncStorage（可選）
    await AsyncStorage.removeItem('diet-daily-settings')

    console.log('[Migration] Settings migrated to Supabase')
  } catch (error) {
    console.error('[Migration] Failed to migrate settings:', error)
  }
}
```

## 🧪 測試

### 單一裝置測試
1. 開啟 App，進入設定頁面
2. 修改任一設定（例如：時區、通知時間）
3. 重啟 App
4. 確認設定已保留

### 跨設備同步測試
1. 在裝置 A 登入帳號
2. 修改設定（例如：變更早餐時間為 07:00）
3. 在裝置 B 登入同一帳號
4. 確認設定已同步（早餐時間顯示 07:00）
5. 在裝置 B 修改設定
6. 確認裝置 A 即時收到更新（不需重啟）

### 驗證 RLS
```sql
-- 以其他使用者身份嘗試讀取設定（應該失敗）
SELECT * FROM user_settings WHERE user_id != auth.uid();
```

## 🔍 除錯

### 查看設定資料
```sql
-- 查看所有設定
SELECT * FROM user_settings;

-- 查看特定使用者設定
SELECT * FROM user_settings WHERE user_id = 'YOUR_USER_ID';
```

### 檢查即時訂閱
```typescript
// 在 Console 中應該看到
console.log('[SettingsStore] Settings updated from subscription:', settings)
```

### 常見問題

**Q: 設定沒有同步到其他裝置？**
- 檢查網路連線
- 確認已登入相同帳號
- 檢查 Supabase Realtime 是否啟用

**Q: 更新設定失敗？**
- 檢查 RLS 政策
- 確認 user_id 正確
- 查看 Supabase logs

**Q: 第一次使用沒有預設設定？**
- 檢查 `createDefaultSettings()` 是否被呼叫
- 確認 migration 已正確執行

## 📊 效能考量

### 樂觀更新（Optimistic Update）
- UI 立即反應，不等待 Supabase 回應
- 如果更新失敗，自動回滾
- 提供更好的使用者體驗

### 快取策略
- 設定載入後存在 Zustand store
- 只在必要時重新載入
- 使用 `isInitialized` 避免重複初始化

### 即時訂閱
- 使用 Supabase Realtime Channel
- 自動清理訂閱（component unmount）
- 避免記憶體洩漏

## 🚀 優勢對比

### AsyncStorage（舊）
- ❌ 只在本地儲存
- ❌ 刪除 App 會遺失資料
- ❌ 無法跨設備同步
- ✅ 離線可用
- ✅ 速度快

### Supabase（新）
- ✅ 雲端備份，安全可靠
- ✅ 跨設備自動同步
- ✅ 即時更新
- ✅ 統一資料管理
- ✅ 支援離線快取（透過 Zustand）
- ⚠️ 需要網路連線（首次載入）

## 📝 未來擴展

可以考慮的功能：
- [ ] 設定版本控制（追蹤變更歷史）
- [ ] 批次更新優化
- [ ] 更細緻的快取策略
- [ ] 設定匯出/匯入功能
- [ ] 設定備份與還原

## 🔐 安全性

- ✅ 使用 RLS 保護資料
- ✅ 只能存取自己的設定
- ✅ 所有操作都經過驗證
- ✅ SQL injection 防護（使用 Supabase client）

## 🎯 結論

這次遷移大幅提升了使用者體驗：
1. **更安全** - 雲端備份，不怕資料遺失
2. **更方便** - 跨設備自動同步
3. **更即時** - 設定變更立即生效
4. **更可靠** - 統一的資料源，易於管理

使用者不需要做任何操作，升級後自動享受新功能！🎉
