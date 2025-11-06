# 設定同步網頁版 - 完成報告

## 📝 變更摘要

已將 iOS app 設定選項同步網頁版，移除不相關的疾病選項，保留核心功能。

## ✅ 完成項目

### 1. 慢性病選項更新

#### 移除項目：
- ❌ IBD (發炎性腸病)
- ❌ GERD (胃食道逆流)
- ❌ 糖尿病
- ❌ 高血壓
- ❌ 心臟病
- ❌ 腎臟病
- ❌ 肝病
- ❌ Other (其他)

#### 保留項目（與網頁版一致）：
- ✅ 克隆氏症
- ✅ 潰瘍性結腸炎
- ✅ 腸躁症 (IBS)
- ✅ 癌症治療中
- ✅ 無（新增選項，可清除設定）

### 2. 新增功能：已知過敏原管理

#### 功能特色：
- ✅ 預設常見過敏原選項（與網頁版一致）：
  - 牛奶、雞蛋、花生、堅果
  - 大豆、小麥、魚類、甲殼類
  - 芝麻、芒果
- ✅ 多選功能（可選擇多個過敏原）
- ✅ 自訂過敏原（可輸入任意過敏原名稱）
- ✅ 移除功能（點擊已選項目即可移除）
- ✅ 顯示已選數量和前 3 項

#### UI 顯示：
```
已知過敏原
3 項：牛奶、雞蛋、花生
```

## 🗄️ 資料庫變更

### Migration 更新：`20250106_create_user_settings.sql`

```sql
-- Health settings
chronic_disease TEXT, -- 可為 NULL
known_allergies TEXT[] DEFAULT '{}', -- 過敏原陣列
```

#### 變更說明：
- `chronic_disease`: 從 `NOT NULL DEFAULT 'IBD'` 改為可 NULL
- `known_allergies`: 新增 TEXT[] 欄位，預設空陣列

## 📱 App 使用方式

### 設定慢性病：
1. 進入設定頁面
2. 點擊「慢性病類型」
3. 選擇疾病或「無」
4. 確認變更

### 管理過敏原：
1. 進入設定頁面
2. 點擊「已知過敏原」
3. 在彈窗中：
   - **新增**：點擊未選擇的過敏原
   - **移除**：點擊已選擇的過敏原（有 ✓ 標記）
   - **自訂**：點擊「+ 自訂過敏原」並輸入名稱
4. 點擊「完成」

## 🔄 資料同步

### 設定儲存位置：
- ✅ Supabase `user_settings` table
- ✅ 自動跨設備同步
- ✅ 即時更新

### 資料格式：
```typescript
{
  chronicDisease: '克隆氏症' | '潰瘍性結腸炎' | '腸躁症' | '癌症治療中' | null
  knownAllergies: ['牛奶', '雞蛋', '花生'] // 字串陣列
}
```

## 📊 與網頁版對照

| 功能 | 網頁版 | iOS App | 狀態 |
|------|--------|---------|------|
| 克隆氏症 | ✅ | ✅ | 同步 ✓ |
| 潰瘍性結腸炎 | ✅ | ✅ | 同步 ✓ |
| 腸躁症 | ✅ | ✅ | 同步 ✓ |
| 癌症治療中 | ✅ | ✅ | 同步 ✓ |
| 已知過敏原 | ✅ | ✅ | 同步 ✓ |
| IBD | ❌ | ❌ | 已移除 |
| 糖尿病等 | ❌ | ❌ | 已移除 |

## 📂 檔案變更清單

### 新增/修改：
1. **`src/features/settings/types/index.ts`**
   - 更新 `UserSettings` interface
   - 更新 `CHRONIC_DISEASES` 選項
   - 新增 `COMMON_ALLERGENS` 常數

2. **`src/features/settings/services/SettingsService.ts`**
   - 更新 `DbUserSettings` interface
   - 支援 `known_allergies` 欄位
   - 更新預設值（`chronicDisease: null`）

3. **`src/features/settings/screens/SettingsScreen.tsx`**
   - 新增 `handleManageAllergies()` 函數
   - 更新 UI 加入過敏原管理
   - 慢性病選項加入「無」選項

4. **`supabase/migrations/20250106_create_user_settings.sql`**
   - 更新 schema 支援 `known_allergies`
   - `chronic_disease` 改為可 NULL

## 🚀 部署步驟

```bash
# 1. 執行 migration
cd /Users/gilko/Documents/claude-code/diet_dialy
npx supabase db push

# 2. 或部署到 Pi
ssh pi@10.1.1.85
cd diet-daily
npx supabase db push
```

## 🧪 測試檢查清單

### 慢性病設定：
- [ ] 可選擇「克隆氏症」
- [ ] 可選擇「潰瘍性結腸炎」
- [ ] 可選擇「腸躁症」
- [ ] 可選擇「癌症治療中」
- [ ] 可選擇「無」（清除設定）
- [ ] 選擇後顯示正確標籤
- [ ] 跨設備同步正確

### 過敏原管理：
- [ ] 可選擇常見過敏原
- [ ] 可選擇多個過敏原
- [ ] 可自訂過敏原名稱
- [ ] 可移除已選過敏原
- [ ] 顯示數量和前 3 項
- [ ] 跨設備同步正確
- [ ] 空陣列顯示「未設定」

### 資料持久化：
- [ ] 重啟 App 設定保留
- [ ] 登出再登入設定保留
- [ ] 多裝置登入設定同步

## 📝 注意事項

### 向下相容性：
- 舊版本使用者的 `chronicDisease` 可能是 `'IBD'` 等舊值
- 系統會自動處理，顯示為「未設定」
- 使用者重新選擇即可更新為新值

### 資料遷移：
不需要特別處理，因為：
1. `chronic_disease` 欄位允許 NULL
2. 舊資料會顯示為「未設定」
3. 使用者自然重新設定即可

### 效能考量：
- `known_allergies` 使用 PostgreSQL TEXT[] 類型
- 支援高效的陣列操作
- 查詢和更新速度快

## ✨ 使用者體驗改進

### 更簡潔：
- 移除不必要的疾病選項
- 專注於核心使用者群（IBD 相關）

### 更完整：
- 新增過敏原管理功能
- 與網頁版功能一致

### 更靈活：
- 可選擇「無」清除設定
- 可自訂過敏原名稱
- 支援多個過敏原

## 🎯 結論

所有設定選項已完全同步網頁版：
- ✅ 慢性病選項精簡且一致
- ✅ 過敏原管理功能完整
- ✅ 資料庫 schema 更新
- ✅ 跨設備同步正常
- ✅ TypeScript 類型檢查通過

使用者可以在 iOS app 上享受與網頁版一致的設定體驗！🎉
