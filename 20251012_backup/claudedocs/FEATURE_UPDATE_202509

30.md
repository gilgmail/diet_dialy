# 症狀記錄功能更新

**更新日期**: 2025-09-30
**版本**: v4.2.0
**狀態**: ✅ 開發完成，等待資料庫 migration

---

## 🎯 更新摘要

根據用戶需求，實施了三個重要功能更新：

1. ✅ **增加大便次數總計欄位**
2. ✅ **評分系統改為 0-5 分（0=未填）**
3. ✅ **支援補填/修改其他日期記錄**

---

## 📋 需求詳情

### 需求 1: 增加大便次數總計
- 添加新欄位記錄每日大便次數
- 範圍：0-50 次
- 可選欄位（NULL 表示未記錄）

### 需求 2: 評分改成 1-5 分，0 分是沒填
**原系統**:
- overall_health: 1-5（必填）
- 症狀：0-5（0=無症狀）

**新系統**:
- **所有評分**: 0-5
- **0** = 未填寫此項目
- **1** = 最低分（無症狀/非常差）
- **5** = 最高分（極嚴重/非常好）

### 需求 3: 可補填其他未填日期，或更改其他日期記錄
- 添加日期選擇器
- 可選擇任何過去日期
- 自動載入該日期的記錄（如果存在）
- 支援新增或更新選定日期的記錄

---

## ✅ 已完成的更新

### 1. 資料庫 Migration

**檔案**: `supabase/migrations/002_add_bowel_movement_count.sql`

```sql
-- Add bowel_movement_count column
ALTER TABLE daily_symptom_entries
ADD COLUMN bowel_movement_count INTEGER
CHECK (bowel_movement_count >= 0 AND bowel_movement_count <= 50)
DEFAULT NULL;
```

**功能**:
- 添加大便次數欄位（0-50，可為 NULL）
- 創建索引優化查詢效能
- 添加欄位註釋說明

**執行方式**:
```bash
node scripts/apply-migration-002.js
```
會顯示需要在 Supabase Dashboard SQL Editor 中執行的 SQL。

---

### 2. TypeScript Types 更新

**檔案**: `src/types/medical.ts`

**CoreSymptomScores 介面**:
```typescript
export interface CoreSymptomScores {
  overall_health: 0 | 1 | 2 | 3 | 4 | 5;    // 0=未填, 1=非常差, 5=非常好
  abdominal_pain: 0 | 1 | 2 | 3 | 4 | 5;    // 0=未填, 1=無, 5=極嚴重
  diarrhea: 0 | 1 | 2 | 3 | 4 | 5;          // 0=未填, 1=無, 5=極嚴重
  bloody_stool: 0 | 1 | 2 | 3 | 4 | 5;      // 0=未填, 1=無, 5=極嚴重
  bloating: 0 | 1 | 2 | 3 | 4 | 5;          // 0=未填, 1=無, 5=極嚴重
}
```

**DailySymptomEntry 新增欄位**:
```typescript
export interface DailySymptomEntry extends CoreSymptomScores, ContextualScores {
  // ... 其他欄位
  bowel_movement_count?: number; // 大便次數總計: 0-50, null if not recorded
}
```

---

### 3. UI 組件更新

#### SymptomSelect 組件 (src/components/symptoms/SymptomSelect.tsx)

**新增 0=未填 選項**:
```typescript
const SYMPTOM_CONFIG = {
  overall_health: {
    labels: {
      0: { zh: '未填', en: 'Not Filled', color: 'text-gray-400' },
      1: { zh: '非常差', en: 'Very Poor', color: 'text-red-600' },
      2: { zh: '差', en: 'Poor', color: 'text-orange-600' },
      3: { zh: '一般', en: 'Fair', color: 'text-yellow-600' },
      4: { zh: '好', en: 'Good', color: 'text-green-600' },
      5: { zh: '非常好', en: 'Excellent', color: 'text-green-700' }
    }
  },
  // 症狀：0=未填, 1=無, 2-5=嚴重程度
  abdominal_pain: {
    labels: {
      0: { zh: '未填', en: 'Not Filled', color: 'text-gray-400' },
      1: { zh: '無', en: 'None', color: 'text-green-600' },
      2: { zh: '輕微', en: 'Mild', color: 'text-yellow-600' },
      3: { zh: '溫和', en: 'Moderate', color: 'text-orange-600' },
      4: { zh: '嚴重', en: 'Severe', color: 'text-red-600' },
      5: { zh: '極嚴重', en: 'Very Severe', color: 'text-red-700' }
    }
  }
}
```

**顏色編碼邏輯**:
- **0** = 灰色邊框/背景（未填）
- **健康評分**: 4-5 綠色，3 黃色，1-2 紅色
- **症狀評分**: 1 綠色（無症狀），2-3 黃色，4-5 紅色

---

#### QuickSymptomEntry 組件 (src/components/symptoms/QuickSymptomEntry.tsx)

**預設值改為 0**:
```typescript
const DEFAULT_SCORES: CoreSymptomScores = {
  overall_health: 0,  // 0 = not filled
  abdominal_pain: 0,  // 0 = not filled
  diarrhea: 0,        // 0 = not filled
  bloody_stool: 0,    // 0 = not filled
  bloating: 0         // 0 = not filled
};
```

**新增大便次數輸入欄位**:
```tsx
<Label htmlFor="bowel-movement-count">
  💩 大便次數總計 (Bowel Movement Count)
  <span className="text-gray-500"> - 可選</span>
</Label>
<input
  type="number"
  min="0"
  max="50"
  value={bowelMovementCount ?? ''}
  placeholder="今日大便次數（0-50）"
  className="..."
/>
<p className="text-xs text-gray-500">
  記錄今日大便次數，有助於追蹤消化系統狀況
</p>
```

---

#### Symptoms Page (src/app/symptoms/page.tsx)

**新增日期選擇器**:
```tsx
const [selectedDate, setSelectedDate] = useState<string>(
  new Date().toISOString().split('T')[0]
);

// Date Selector UI
<input
  type="date"
  value={selectedDate}
  onChange={(e) => setSelectedDate(e.target.value)}
  max={new Date().toISOString().split('T')[0]}  // 不能選未來日期
  className="..."
/>
```

**功能特點**:
- 選擇任何過去日期
- 自動載入該日期的記錄
- 顯示該日期是否已有記錄
- 提交時使用選擇的日期而非今天

---

## 🎨 UI 預覽

### 評分選擇器
```
❤️ 整體健康 (Overall Health)
┌─────────────────────────────────────┐
│ 0 - 未填 (Not Filled)            ▼ │  ← 灰色（預設）
│ 1 - 非常差 (Very Poor)              │
│ 2 - 差 (Poor)                       │
│ 3 - 一般 (Fair)                     │
│ 4 - 好 (Good)                       │
│ 5 - 非常好 (Excellent)              │
└─────────────────────────────────────┘

🤕 腹痛 (Abdominal Pain)
┌─────────────────────────────────────┐
│ 0 - 未填 (Not Filled)            ▼ │  ← 灰色（預設）
│ 1 - 無 (None)                       │  ← 綠色
│ 2 - 輕微 (Mild)                     │  ← 黃色
│ 3 - 溫和 (Moderate)                 │  ← 橙色
│ 4 - 嚴重 (Severe)                   │  ← 紅色
│ 5 - 極嚴重 (Very Severe)            │  ← 深紅色
└─────────────────────────────────────┘
```

### 大便次數輸入
```
💩 大便次數總計 (Bowel Movement Count) - 可選
┌─────────────────────────────────────┐
│ 今日大便次數（0-50）                 │
└─────────────────────────────────────┘
記錄今日大便次數，有助於追蹤消化系統狀況
```

### 日期選擇器
```
📅 選擇記錄日期
可補填或修改其他日期的記錄

┌──────────────┐  2025年9月30日 星期一
│  2025-09-30  │  此日期尚未記錄
└──────────────┘
        ↑
   不能選未來日期
```

---

## 🔧 技術細節

### 評分邏輯變更

**健康評分** (overall_health):
- 0 = 未填（灰色）
- 1 = 非常差（紅色）
- 2 = 差（橙色）
- 3 = 一般（黃色）
- 4 = 好（綠色）
- 5 = 非常好（深綠色）

**症狀評分** (abdominal_pain, diarrhea, bloody_stool, bloating):
- 0 = 未填（灰色）
- 1 = 無症狀（綠色）
- 2 = 輕微（黃色）
- 3 = 溫和（橙色）
- 4 = 嚴重（紅色）
- 5 = 極嚴重（深紅色）

### 資料完整度計算

需要更新 API 邏輯以處理 0=未填的情況：
- 0 分應視為未填寫
- 不計入資料完整度
- 1-5 分才算已填寫

---

## 📦 需要執行的步驟

### 步驟 1: 執行資料庫 Migration ⚠️ **必須執行**

**方法 A: Supabase Dashboard（推薦）**
1. 訪問 https://supabase.com/dashboard
2. 選擇專案
3. SQL Editor → New query
4. 複製 `supabase/migrations/002_add_bowel_movement_count.sql` 的內容
5. 貼上並執行

**方法 B: 查看 Migration 內容**
```bash
node scripts/apply-migration-002.js
```

**驗證**:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_symptom_entries'
AND column_name = 'bowel_movement_count';
```

應該看到：
```
column_name            | data_type | is_nullable
-----------------------+-----------+-------------
bowel_movement_count   | integer   | YES
```

---

### 步驟 2: 測試功能

1. **訪問症狀記錄頁面**:
   ```
   http://localhost:3000/symptoms
   ```

2. **測試日期選擇**:
   - 選擇不同日期
   - 驗證能載入該日期的記錄
   - 嘗試選擇未來日期（應該被阻止）

3. **測試評分系統**:
   - 所有評分預設為 0（未填）
   - 選擇不同評分觀察顏色變化
   - 驗證 0=灰色（未填）

4. **測試大便次數**:
   - 輸入 0-50 範圍的數字
   - 留空（可選欄位）
   - 驗證能正確儲存

5. **測試提交**:
   - 填寫完整記錄並提交
   - 切換到另一日期
   - 回到原日期驗證資料保留

---

## 📊 資料庫 Schema 變更

### daily_symptom_entries 表

**新增欄位**:
```sql
bowel_movement_count INTEGER CHECK (bowel_movement_count >= 0 AND bowel_movement_count <= 50) DEFAULT NULL
```

**新增索引**:
```sql
CREATE INDEX idx_daily_symptom_entries_bowel_movement
ON daily_symptom_entries(user_id, recorded_date)
WHERE bowel_movement_count IS NOT NULL;
```

**欄位說明**:
- 欄位名稱：bowel_movement_count
- 資料類型：INTEGER
- 允許 NULL：是
- 檢查約束：0 ≤ 值 ≤ 50
- 預設值：NULL
- 註釋：大便次數總計 - Daily bowel movement count

---

## 🐛 已知問題

### RLS 政策錯誤
**症狀**: 提交記錄時出現 Row Level Security 錯誤
```
Error: new row violates row-level security policy for table "daily_symptom_entries"
```

**影響**: 資料無法儲存到資料庫

**臨時解決方案**: 需要檢查 RLS 政策設定，確保用戶可以插入自己的記錄

---

## 🎯 待辦事項

- [ ] 執行 migration 002 到 Supabase
- [ ] 更新 DailySymptomTracker（詳細記錄模式）支援大便次數
- [ ] 修復 RLS 政策問題
- [ ] 更新 API 邏輯處理 0=未填
- [ ] 更新測試案例支援新評分系統
- [ ] 建立完整的 E2E 測試

---

## 📚 相關檔案

### 新增檔案
- `supabase/migrations/002_add_bowel_movement_count.sql`
- `scripts/apply-migration-002.js`

### 修改檔案
- `src/types/medical.ts`
- `src/components/symptoms/SymptomSelect.tsx`
- `src/components/symptoms/QuickSymptomEntry.tsx`
- `src/app/symptoms/page.tsx`

### 待更新檔案
- `src/components/symptoms/DailySymptomTracker.tsx`
- `src/app/api/medical/daily-symptoms/route.ts`
- `src/__tests__/components/symptoms/*.test.tsx`

---

## 💡 使用建議

### 記錄最佳實踐

1. **每日固定時間記錄**: 建議每天同一時間（例如睡前）記錄症狀
2. **使用 0=未填**: 不確定或未觀察的症狀可以保持 0（未填）
3. **大便次數**: 記錄全日總次數，有助於追蹤消化狀況
4. **補填記錄**: 忘記記錄時可以回到過去日期補填
5. **修改記錄**: 發現錯誤時可以選擇該日期重新修改

### 評分指南

**整體健康**:
- 1 = 非常差（無法正常活動）
- 3 = 一般（可以進行日常活動）
- 5 = 非常好（完全沒有不適）

**症狀評分**:
- 1 = 無症狀
- 2 = 輕微（不影響日常生活）
- 3 = 溫和（稍微影響）
- 4 = 嚴重（明顯影響）
- 5 = 極嚴重（無法忍受）

---

**文檔版本**: 1.0.0
**最後更新**: 2025-09-30
**狀態**: 開發完成，等待測試