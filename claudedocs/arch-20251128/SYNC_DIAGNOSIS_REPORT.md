# Mobile-Web 同步問題診斷報告

**建立時間**: 2025-11-26
**問題**: iOS app 與 Web 資料不同步
**優先級**: 🔴 Critical

---

## ✅ 環境配置檢查

### Supabase 配置一致性
**結論**: ✅ **通過** - Web 和 Mobile 使用相同的 Supabase project

| 項目 | Web (.env.local) | Mobile (.env) | 狀態 |
|------|------------------|---------------|------|
| Supabase URL | `https://lbjeyvvierxcnrytuvto.supabase.co` | `https://lbjeyvvierxcnrytuvto.supabase.co` | ✅ 一致 |
| Anon Key | `eyJhbGci...` | `eyJhbGci...` （相同） | ✅ 一致 |
| Service Role Key | ✅ 已配置 | N/A（不需要） | ✅ 正常 |

---

## 🔍 Supabase Client 配置分析

### Web 端配置（src/lib/supabase/server.ts）
```typescript
// 使用 @supabase/ssr 的 createServerClient
export function createClient() {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) { ... },
      set(name: string, value: string, options: any) { ... },
      remove(name: string, options: any) { ... },
    },
  })
}
```
**特點**:
- ✅ 使用 Server-Side Rendering (SSR) client
- ✅ Cookie-based session management
- ✅ 正確的環境變數讀取

### Mobile 端配置（DietDailyMobile/src/shared/api/supabase/client.ts）
```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = createClient<Database, 'public'>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```
**特點**:
- ✅ 使用標準 supabase-js client
- ✅ AsyncStorage 作為 session 儲存
- ✅ 自動 token refresh 啟用
- ✅ Session 持久化啟用

**配置正確性**: ✅ **兩端配置都正確**

---

## 📊 Data Services 分析

### 1. FoodDiaryService（Mobile）

#### CRUD 操作檢查
- ✅ **CREATE**: `createFoodEntry()` - 使用 `supabase.from('food_entries').insert()`
- ✅ **READ**: `getFoodEntries()` - 使用 `supabase.from('food_entries').select()`
- ✅ **UPDATE**: `updateFoodEntry()` - 使用 `supabase.from('food_entries').update()`
- ✅ **DELETE**: `deleteFoodEntry()` - 使用 `supabase.from('food_entries').delete()`

#### 關鍵發現
- ✅ 表名正確：`food_entries`
- ✅ 正確使用 user_id 過濾：`.eq('user_id', userId)`
- ✅ 有 console.log 用於調試
- ⚠️ **缺少 Realtime Subscriptions**：沒有訂閱資料庫變更

### 2. SymptomDiaryService（Mobile）

#### CRUD 操作檢查
- ✅ **CREATE**: `createSymptomEntry()` - 使用 `supabase.from('daily_symptom_entries').insert()`
- ✅ **READ**: `getSymptomEntries()` - 使用 `supabase.from('daily_symptom_entries').select()`
- ✅ **UPDATE**: `updateSymptomEntry()` - 使用 `supabase.from('daily_symptom_entries').update()`
- ✅ **DELETE**: `deleteSymptomEntry()` - 使用 `supabase.from('daily_symptom_entries').delete()`

#### 關鍵發現
- ✅ 表名正確：`daily_symptom_entries`
- ✅ 正確使用 user_id 過濾
- ✅ 有 `ensureUserProfile()` 機制處理 FK constraint
- ✅ 詳細的 console.log 用於調試
- ⚠️ **缺少 Realtime Subscriptions**

### 3. AuthService（Mobile）

#### Authentication 流程檢查
- ✅ Google OAuth 登入實作正確
- ✅ Session 管理：`getSession()`, `refreshSession()`
- ✅ Auth state listener：`initAuthListener()` 使用 `onAuthStateChange`
- ✅ 正確使用 Zustand store (`useAuthStore`)

---

## ⚠️ 發現的問題

### 🔴 Critical Issue #1: 缺少 Realtime Subscriptions

**問題描述**:
Mobile 端的 `FoodDiaryService` 和 `SymptomDiaryService` 都沒有實作 Supabase Realtime subscriptions，這意味著：
- Mobile 新增的資料不會即時同步到 Web
- Web 新增的資料不會即時同步到 Mobile
- 用戶需要手動刷新才能看到最新資料

**影響**:
- 同步體驗差
- 資料不一致的感知

**解決方案**:
需要在 Mobile 端的 hooks（useFoodDiary, useSymptomDiary）中新增 realtime subscriptions

### 🟡 Potential Issue #2: Auth Token 傳遞

**問題描述**:
需要驗證 auth token 是否正確附加到每個 API 請求的 headers

**檢查項目**:
- [ ] 確認 AsyncStorage 中的 auth token 正確儲存
- [ ] 確認每個 API 請求都包含正確的 Authorization header
- [ ] 確認 token refresh 機制正常運作

### 🟢 Potential Issue #3: RLS Policies

**問題描述**:
需要驗證 Row-Level Security policies 對 mobile client 正確運作

**檢查項目**:
- [ ] 確認 RLS policies 允許 authenticated users 存取自己的資料
- [ ] 確認 mobile client 的 auth context 正確應用到 RLS

---

## 📝 下一步行動計劃

### Phase 1: 驗證基本連線（1 天）
1. **測試 Auth Flow**
   - [ ] 在 mobile 登入並檢查 AsyncStorage 中的 session
   - [ ] 驗證 `supabase.auth.getSession()` 返回正確的 session
   - [ ] 檢查 console logs 是否有 auth errors

2. **測試資料讀取**
   - [ ] 在 mobile 執行 `getFoodEntries()` 並檢查返回的資料
   - [ ] 在 mobile 執行 `getSymptomEntries()` 並檢查返回的資料
   - [ ] 對比 Web 端的資料是否一致

3. **測試資料寫入**
   - [ ] 在 mobile 執行 `createFoodEntry()` 並檢查是否成功
   - [ ] 在 Web 查看是否出現新的記錄
   - [ ] 在 Web 新增記錄，在 mobile 刷新查看是否出現

### Phase 2: 實作 Realtime Subscriptions（2-3 天）

#### 2.1 在 useFoodDiary hook 新增訂閱
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('food_entries_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'food_entries',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      // 處理資料變更
      refetchFoodEntries()
    })
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [userId])
```

#### 2.2 在 useSymptomDiary hook 新增訂閱
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('symptom_entries_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'daily_symptom_entries',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      // 處理資料變更
      refetchSymptomEntries()
    })
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [userId])
```

### Phase 3: 驗證同步功能（1 天）
1. **E2E 測試**
   - [ ] Web 新增記錄 → Mobile 即時顯示（< 3 秒）
   - [ ] Mobile 新增記錄 → Web 即時顯示（< 3 秒）
   - [ ] 編輯記錄雙向同步
   - [ ] 刪除記錄雙向同步

2. **效能測試**
   - [ ] 測試同步延遲
   - [ ] 測試大量資料同步（100+ 筆）
   - [ ] 測試網路不穩定情況

3. **錯誤處理測試**
   - [ ] 測試網路斷線後重連
   - [ ] 測試 token 過期處理
   - [ ] 測試 RLS violation 錯誤

---

## 🔧 需要檢查的檔案

### Mobile 端
- [ ] `/mobile/react-native-starter-kit/DietDailyMobile/src/features/food-diary/hooks/useFoodDiary.ts`
- [ ] `/mobile/react-native-starter-kit/DietDailyMobile/src/features/symptom-diary/hooks/useSymptomDiary.ts`
- [ ] `/mobile/react-native-starter-kit/DietDailyMobile/src/shared/stores/authStore.ts`

### Web 端（參考）
- [ ] Web 端的對應 hooks（看看是否有 realtime subscriptions）
- [ ] Web 端的資料 fetching 邏輯

---

## 📈 預期成果

完成所有修復後，應達到：
- ✅ 同步成功率 ≥ 98%
- ✅ 同步延遲 < 3 秒
- ✅ 資料一致性 100%
- ✅ 完善的錯誤處理和重試機制

---

**文件版本**: 1.0
**最後更新**: 2025-11-26
**下次更新**: 完成 Phase 1 驗證後
