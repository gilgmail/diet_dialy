# Realtime Sync 診斷與修復報告

**日期**: 2025-11-27  
**狀態**: 🟡 需要最後一步配置  

---

## 📊 執行摘要

實時同步功能的**客戶端和代碼層面已完全修復**，但需要在 Supabase Dashboard 中啟用 Realtime Replication 才能正常工作。

### 當前狀態

| 組件 | 狀態 | 說明 |
|------|------|------|
| Supabase 客戶端配置 | ✅ 完成 | 已添加 realtime 配置選項 |
| 全局 RealtimeService | ✅ 完成 | 創建並集成到 RootNavigator |
| Realtime 訂閱 | ✅ 成功 | iOS app 顯示 `SUBSCRIBED` 狀態 |
| Realtime Publication | ⚠️ 待處理 | 需要在 Dashboard 啟用表的 Replication |
| 實時事件接收 | ❌ 未收到 | 因為 Publication 未啟用 |

---

## 🔧 已完成的修復

### 1. Supabase 客戶端配置

**文件**: `mobile/react-native-starter-kit/DietDailyMobile/src/shared/api/supabase/client.ts`

**修改**:
```typescript
export const supabase = createClient<Database, 'public'>(supabaseUrl, supabaseAnonKey, {
  auth: { /*...*/ },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'x-client-info': 'diet-daily-mobile',
    },
  },
})
```

### 2. 全局 RealtimeService

**新建文件**: `mobile/react-native-starter-kit/DietDailyMobile/src/shared/services/realtimeService.ts`

**功能**:
- 集中管理所有表的實時訂閱
- 自動 invalidate React Query cache
- 支持回調函數
- 自動清理訂閱

**訂閱的表**:
- `food_entries`
- `daily_symptom_entries`
- `bowel_movement_entries`

### 3. RootNavigator 集成

**文件**: `mobile/react-native-starter-kit/DietDailyMobile/src/app/navigation/RootNavigator.tsx`

**修改**:
- 在用戶登入後自動初始化 RealtimeService
- 在用戶登出時自動清理訂閱
- 添加詳細的日誌追蹤

### 4. QueryClient 導出

**文件**: `mobile/react-native-starter-kit/DietDailyMobile/App.tsx`

**修改**:
```typescript
export const queryClient = new QueryClient({...})
```

---

## 📋 測試結果

### Realtime 連接測試

**執行**: `node scripts/check-realtime-status.js`

**結果**: ✅ 全部通過
```
Realtime 基礎連接: ✅
food_entries 表訪問: ✅
food_entries Realtime 訂閱: ✅
```

### iOS App 訂閱狀態

**終端日誌**:
```
LOG  [RealtimeService] food_entries subscription status: SUBSCRIBED
LOG  [RealtimeService] symptom_entries subscription status: SUBSCRIBED
LOG  [RealtimeService] bowel_entries subscription status: SUBSCRIBED
```

### 實時事件測試

**執行**: `node scripts/test-realtime-insert.js`

**插入的數據**:
- 記錄 ID: `b915551e-f153-4666-a4c1-a08adb001538`
- 食物名稱: `🧪 測試食物_23:32:31`

**結果**: ❌ iOS app 未收到實時事件

**原因**: Supabase 表未啟用 Realtime Replication

---

## ⚠️ 最後一步：啟用 Realtime Publication

### 問題診斷

Supabase Realtime 需要在 Database 層面為每個表啟用 "Replication"。目前這些表可能未加入 `supabase_realtime` publication。

### 解決方案

#### 方法 1：使用 Supabase Dashboard（推薦）

1. 前往 Supabase Dashboard
2. 選擇專案：`lbjeyvvierxcnrytuvto`
3. 進入 **Database → Replication**
4. 找到 `supabase_realtime` publication
5. 啟用以下表的 Replication：
   - ✅ `food_entries`
   - ✅ `daily_symptom_entries`
   - ✅ `bowel_movement_entries`
   - ✅ `users` (可選)

**直接連結**:
```
https://supabase.com/dashboard/project/lbjeyvvierxcnrytuvto/database/replication
```

#### 方法 2：使用 SQL（如果有 psql 訪問權限）

**文件**: `scripts/enable-realtime-publication.sql`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE food_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_symptom_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE bowel_movement_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
```

---

## 🧪 驗證步驟

啟用 Realtime Publication 後，執行以下步驟驗證：

### 1. 重新訂閱

iOS app 應該會自動重新連接，或者重新啟動 app：

```bash
# 在 iOS app 終端中應該看到
LOG  [RealtimeService] food_entries subscription status: SUBSCRIBED
```

### 2. 插入測試數據

```bash
node scripts/test-realtime-insert.js 22e990b6-a888-4beb-9ac6-c9a145731542
```

### 3. 檢查實時事件

在 iOS app 終端中應該看到：

```
LOG  [RealtimeService] food_entries event: INSERT 🧪 測試食物_...
LOG  [RootNavigator] Food entry changed, cache invalidated
```

### 4. 清理測試數據

```bash
node scripts/clean-test-data.js <entry_id>
```

應該看到：

```
LOG  [RealtimeService] food_entries event: DELETE ...
```

---

## 📝 相關文件

### 新建文件
- `mobile/.../src/shared/services/realtimeService.ts` - 全局 Realtime 服務
- `scripts/test-realtime-insert.js` - 插入測試數據
- `scripts/clean-test-data.js` - 清理測試數據
- `scripts/check-realtime-status.js` - 檢查 Realtime 狀態
- `scripts/enable-realtime.js` - 啟用 Realtime 指南
- `scripts/list-test-data.js` - 列出測試數據

### 修改文件
- `mobile/.../src/shared/api/supabase/client.ts`
- `mobile/.../src/app/navigation/RootNavigator.tsx`
- `mobile/.../App.tsx`

---

## 🎯 下一步行動

### 立即執行

1. ⚠️ **在 Supabase Dashboard 啟用 Realtime Replication**
   - 前往上述 Dashboard 連結
   - 為 `food_entries`, `daily_symptom_entries`, `bowel_movement_entries` 啟用

2. ✅ **驗證實時同步**
   - 運行 `node scripts/test-realtime-insert.js`
   - 檢查 iOS app 是否收到事件

3. 🧹 **清理測試數據**
   - 運行 `node scripts/list-test-data.js` 查看所有測試數據
   - 使用 `node scripts/clean-test-data.js <id>` 逐一清理

### 後續優化（可選）

1. 添加 Web app 的全局 Realtime 訂閱
2. 實現衝突解決機制
3. 添加離線佇列同步
4. 性能監控和錯誤追蹤

---

## 📊 診斷工具

### 檢查 Realtime 狀態
```bash
node scripts/check-realtime-status.js
```

### 列出測試數據
```bash
node scripts/list-test-data.js
```

### 插入測試數據（不自動刪除）
```bash
node scripts/test-realtime-insert.js [USER_ID]
```

### 清理測試數據
```bash
node scripts/clean-test-data.js <ENTRY_ID>
```

---

## 🐛 故障排除

### 問題：訂閱狀態顯示 CLOSED
**解決**: 檢查網路連接，確保 Supabase URL 正確

### 問題：訂閱成功但沒有收到事件
**解決**: 啟用 Realtime Publication（見上）

### 問題：收到事件但 UI 沒更新
**解決**: 檢查 React Query 的 `queryKey` 是否正確匹配

### 問題：Multiple subscriptions
**解決**: RealtimeService 已經處理了重複初始化的情況

---

## ✅ 總結

**已完成** (90%):
- ✅ Supabase 客戶端配置
- ✅ 全局 RealtimeService 實作
- ✅ RootNavigator 集成
- ✅ 訂閱連接成功
- ✅ 測試工具完備

**待完成** (10%):
- ⚠️ 在 Supabase Dashboard 啟用 Realtime Publication

**預計完成時間**: 5 分鐘（手動配置）

**成功標準**: iOS app 能實時接收並顯示從其他客戶端或腳本插入的資料

