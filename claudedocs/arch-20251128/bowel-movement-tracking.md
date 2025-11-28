# 大便記錄系統設計文件

## 設計理念

**獨立追蹤系統**：大便記錄完全獨立於症狀記錄，避免資料重複和邏輯複雜化。

## 資料庫結構

### bowel_movement_entries 表

每次大便單獨記錄，包含：

```sql
CREATE TABLE bowel_movement_entries (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES diet_daily_users(id),

    -- 時間資訊
    occurred_at TIMESTAMP WITH TIME ZONE,  -- 實際發生時間
    recorded_date DATE,                     -- 記錄日期（索引用）

    -- 大便特徵
    stool_type INTEGER (1-5),              -- Bristol Stool Scale
    has_blood BOOLEAN,                     -- 是否血便
    difficulty TEXT,                       -- 排便難度（可選）
    duration_minutes INTEGER,              -- 時長（可選）
    notes TEXT,                            -- 備註（可選）

    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### Bristol Stool Scale（1-5 簡化版）

| 值 | 標籤 | 描述 | 圖示 |
|----|------|------|------|
| 1  | 便秘 | 硬球狀 | 🔴 |
| 2  | 偏硬 | 香腸狀但凹凸 | 🟠 |
| 3  | 正常 | 香腸狀光滑 | 🟡 |
| 4  | 偏軟 | 軟便成形 | 🟢 |
| 5  | 腹瀉 | 糊狀或液狀 | 💧 |

## 與症狀記錄的分離

### 為什麼分離？

1. **避免資料重複**：
   - 之前：`bowel_movement_entries` + `daily_symptom_entries.bowel_movement_count/stool_type/has_blood`
   - 現在：只有 `bowel_movement_entries`

2. **避免邏輯複雜化**：
   - 之前：需要 trigger 自動同步兩個表
   - 現在：單一數據源，應用層查詢

3. **腹瀉記錄的重複問題**：
   - 之前：症狀有「腹瀉」欄位 + 大便記錄有 `stool_type=5`（腹瀉）
   - 現在：只在大便記錄中追蹤，症狀記錄移除腹瀉欄位

### 症狀記錄要移除的欄位

```sql
-- 這些欄位已經在 bowel_movement_entries 中追蹤
-- 建議從 daily_symptom_entries 移除：
- diarrhea              -- 改在 bowel_movement_entries.stool_type=5
- bowel_movement_count  -- 從 bowel_movement_entries 查詢
- stool_type            -- 已在 bowel_movement_entries
- has_blood             -- 已在 bowel_movement_entries
```

## 應用層實作

### 1. 資料查詢

直接從 `bowel_movement_entries` 查詢：

```typescript
// 取得特定日期的所有記錄
const entries = await BowelDiaryService.getBowelMovementsByDate(userId, date)

// 取得當日統計
const summary = await useBowelDiarySummary(today)
// 返回：{ totalCount, lastTime, hasBloodToday, hasDiarrhea, hasConstipation }
```

### 2. 輔助函數（SQL）

Migration 010 提供了三個輔助函數：

```sql
-- 取得當日次數
SELECT get_today_bowel_movement_count('user-uuid');

-- 取得最後記錄時間
SELECT get_last_bowel_movement_time('user-uuid');

-- 取得完整統計
SELECT * FROM get_daily_bowel_summary('user-uuid');
```

### 3. UI 顯示

**AddBowelMovementScreen**：
- 顯示「今日已記錄：X 次」
- 顯示「最後記錄：HH:mm」
- 快速記錄（2 點擊）+ 詳細記錄選項

**FoodDayDetailScreen**：
- 獨立的大便記錄區塊
- 按時間排序顯示所有記錄
- 每筆記錄顯示：形態、時間、血便、困難度

## 資料統計與分析

### 每日統計

從單一數據源計算：

```typescript
const dailyStats = {
  totalCount: entries.length,
  hasBlood: entries.some(e => e.has_blood),
  hasDiarrhea: entries.some(e => e.stool_type === 5),
  hasConstipation: entries.some(e => e.stool_type === 1),
  averageType: entries.reduce((sum, e) => sum + e.stool_type, 0) / entries.length,
}
```

### 歷史趨勢

```sql
-- 週期性統計
SELECT
  recorded_date,
  COUNT(*) as daily_count,
  AVG(stool_type) as avg_type,
  BOOL_OR(has_blood) as had_blood
FROM bowel_movement_entries
WHERE user_id = $1
  AND recorded_date >= $2
  AND recorded_date <= $3
GROUP BY recorded_date
ORDER BY recorded_date;
```

## Migration 步驟

### 1. 執行 Migration 010

在 Supabase SQL Editor 執行 `010_bowel_movement_standalone.sql`：
- ✅ 創建 `bowel_movement_entries` 表
- ✅ 創建輔助函數
- ✅ 刪除舊的 auto-sync trigger（如果存在）

### 2. 資料遷移（可選）

如果之前有在 `daily_symptom_entries` 中記錄大便資料，可以遷移：

```sql
INSERT INTO bowel_movement_entries (
  user_id, recorded_date, occurred_at,
  stool_type, has_blood, notes
)
SELECT
  user_id,
  recorded_date,
  recorded_at,
  COALESCE(stool_type, 3),
  COALESCE(has_blood, FALSE),
  NULL
FROM daily_symptom_entries
WHERE bowel_movement_count > 0;
```

### 3. 清理舊欄位（可選）

資料遷移完成後，可以移除 `daily_symptom_entries` 的冗餘欄位：

```sql
ALTER TABLE daily_symptom_entries
  DROP COLUMN IF EXISTS diarrhea,
  DROP COLUMN IF EXISTS bowel_movement_count,
  DROP COLUMN IF EXISTS stool_type,
  DROP COLUMN IF EXISTS has_blood;
```

## 優點總結

✅ **資料不重複**：單一數據源
✅ **邏輯簡單**：無自動同步複雜性
✅ **歷史完整**：每次記錄都保留
✅ **統計靈活**：應用層隨需計算
✅ **獨立管理**：症狀和大便完全分離
✅ **易於維護**：清晰的資料結構

## 未來擴展

可能的功能增強：

1. **圖表分析**：Bristol Scale 趨勢圖
2. **相關性分析**：飲食與大便形態的關聯
3. **提醒功能**：異常狀況（如連續便秘、血便）提醒
4. **匯出報告**：供醫生參考的大便記錄報告
5. **AI 分析**：大便模式與 IBD 症狀的關聯分析
