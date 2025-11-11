# 大便記錄功能設計文檔

## 已完成的部分

### 1. 資料庫 Schema ✅
- **檔案**: `supabase/migrations/007_add_bowel_movement_fields.sql`
- **欄位**:
  - `bowel_movement_count`: 大便次數 (0-50)
  - `stool_type`: 大便形態 (1-5, Bristol Stool Scale)
  - `has_blood`: 是否血便 (boolean)
  - `bloody_stool`: 血便嚴重度分數 (0-5, 用於分析)

### 2. TypeScript 類型定義 ✅
- **檔案**: `src/features/bowel-diary/types/index.ts`
- **主要類型**:
  - `BowelMovementEntry`: 大便記錄實體
  - `CreateBowelMovementInput`: 新增輸入
  - `UpdateBowelMovementInput`: 更新輸入
  - `StoolType`: 1-5 分類
  - `STOOL_TYPES`: 形態選項配置
  - `BLOOD_STATUS`: 血便狀態選項

### 3. 服務層 ✅
- **檔案**: `src/features/bowel-diary/services/BowelDiaryService.ts`
- **方法**:
  - `getBowelMovementsByDateRange()`: 取得日期範圍記錄
  - `getBowelMovementByDate()`: 取得特定日期記錄
  - `upsertBowelMovement()`: 新增或更新記錄
  - `updateBowelMovement()`: 更新現有記錄
  - `deleteBowelMovement()`: 刪除記錄（清空欄位）

### 4. React Hook ✅
- **檔案**: `src/features/bowel-diary/hooks/useBowelDiary.ts`
- **功能**: 提供 React Query 封裝的 CRUD 操作

## 待實作的部分

### 5. 新增大便記錄畫面 (AddBowelMovementScreen)

#### 檔案位置
`src/features/bowel-diary/screens/AddBowelMovementScreen.tsx`

#### UI 設計

```
┌─────────────────────────────────┐
│  ← 大便記錄                      │
├─────────────────────────────────┤
│                                 │
│  📅 日期選擇                     │
│  [2025年01月11日 (六)]          │
│                                 │
│  🔢 大便次數 *                   │
│  [  1  ] ⊖  ⊕  (0-10)          │
│                                 │
│  💩 大便形態 *                   │
│  ┌───┬───┬───┬───┬───┐         │
│  │🔴 │🟠 │🟡 │🟢 │💧 │         │
│  │便秘│偏硬│正常│偏軟│腹瀉│         │
│  │ 1 │ 2 │ 3 │ 4 │ 5 │         │
│  └───┴───┴───┴───┴───┘         │
│     (選中的會有底色)              │
│                                 │
│  🩸 是否有血便 *                 │
│  ○ 無    ● 有血便               │
│                                 │
│  📝 備註 (選填)                  │
│  ┌───────────────────┐         │
│  │                   │         │
│  │                   │         │
│  └───────────────────┘         │
│                                 │
├─────────────────────────────────┤
│  [刪除記錄]    [儲存記錄]        │
└─────────────────────────────────┘
```

#### 主要功能

1. **日期選擇器**
   - 預設為今天
   - 支援選擇歷史日期
   - 從 FoodDayDetailScreen 傳入 date 參數

2. **次數選擇**
   - 使用 +/- 按鈕或直接輸入
   - 範圍 0-10（實際可到 50）
   - 預設值 1

3. **形態選擇（Bristol Stool Scale）**
   - 5 個圖示按鈕
   - 單選，預設值 3（正常）
   - 顯示圖示、標籤、描述

4. **血便狀態**
   - 兩個選項：無 / 有血便
   - 單選，預設無
   - 有血便時顯示警告色

5. **備註欄位**
   - 選填
   - 多行文字輸入

6. **編輯模式**
   - 支援編輯現有記錄
   - 顯示刪除按鈕
   - 預填現有資料

#### 程式碼結構範例

```typescript
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native'
import { Button, IconButton, RadioButton } from 'react-native-paper'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { useBowelDiary } from '../hooks/useBowelDiary'
import { STOOL_TYPES, BLOOD_STATUS } from '../types'
import type { StoolType } from '../types'

export function AddBowelMovementScreen({ navigation, route }: Props) {
  const { upsertEntry, updateEntry, deleteEntry, entries } = useBowelDiary()

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [bowelCount, setBowelCount] = useState(1)
  const [stoolType, setStoolType] = useState<StoolType>(3)
  const [hasBlood, setHasBlood] = useState(false)
  const [notes, setNotes] = useState('')

  // 編輯模式邏輯
  const entryId = route.params?.entryId
  const isEditMode = !!entryId

  // 載入現有資料...

  const handleSubmit = async () => {
    try {
      if (isEditMode) {
        await updateEntry({
          entryId,
          input: {
            bowel_movement_count: bowelCount,
            stool_type: stoolType,
            has_blood: hasBlood,
            notes,
            occurred_at: selectedDate.toISOString(),
          },
        })
        Alert.alert('成功', '已更新大便記錄')
      } else {
        await upsertEntry({
          bowel_movement_count: bowelCount,
          stool_type: stoolType,
          has_blood: hasBlood,
          notes,
          occurred_at: selectedDate.toISOString(),
        })
        Alert.alert('成功', '已新增大便記錄')
      }
      navigation.goBack()
    } catch (error) {
      Alert.alert('錯誤', '儲存失敗')
    }
  }

  // UI 元件渲染...
}
```

### 6. 整合到 FoodDayDetailScreen

#### 新增顯示區塊

在 symptoms 區塊後加入：

```tsx
{/* Bowel Movement Records */}
{bowelMovement && (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Icon name="toilet" size={20} color={colors.primary[500]} />
      <Text style={styles.sectionTitle}>大便記錄</Text>
    </View>

    <TouchableOpacity
      style={styles.bowelCard}
      onPress={() => handleEditBowelMovement(bowelMovement)}
    >
      <View style={styles.bowelInfo}>
        <Text style={styles.bowelCount}>
          🔢 {bowelMovement.bowel_movement_count} 次
        </Text>
        <Text style={styles.bowelType}>
          {STOOL_TYPES.find(t => t.value === bowelMovement.stool_type)?.icon}
          {STOOL_TYPES.find(t => t.value === bowelMovement.stool_type)?.label}
        </Text>
        {bowelMovement.has_blood && (
          <Text style={styles.bowelBlood}>⚠️ 有血便</Text>
        )}
      </View>
      <IconButton icon="pencil-outline" size={20} />
    </TouchableOpacity>
  </View>
)}
```

#### 查詢大便記錄

```typescript
const { data: bowelMovement } = useQuery({
  queryKey: ['bowelMovement', user?.id, date],
  queryFn: async () => {
    if (!user?.id) return null
    const result = await BowelDiaryService.getBowelMovementByDate(
      user.id,
      new Date(`${date}T12:00:00`)
    )
    return result.data
  },
  enabled: !!user?.id,
})
```

### 7. 整合到快速新增按鈕

在 `CustomTabBar.tsx` 中間 + 按鈕的選單加入：

```tsx
<Menu.Item
  onPress={() => {
    setMenuVisible(false)
    navigation.navigate('AddBowelMovement')
  }}
  title="大便記錄"
  leadingIcon="toilet"
/>
```

### 8. 更新導航配置

**檔案**: `src/app/navigation/types.ts`

```typescript
export type MainStackParamList = {
  // ...existing routes
  AddBowelMovement: {
    entryId?: string
    date?: string
  }
}
```

**檔案**: `src/app/navigation/MainNavigator.tsx`

```tsx
import { AddBowelMovementScreen } from '@/features/bowel-diary/screens/AddBowelMovementScreen'

// In Stack.Navigator
<Stack.Screen
  name="AddBowelMovement"
  component={AddBowelMovementScreen}
  options={{ title: '大便記錄' }}
/>
```

## Bristol Stool Scale 說明

| 類型 | 描述 | 意義 |
|------|------|------|
| 1 | 硬球狀，難以排出 | 嚴重便秘 |
| 2 | 香腸狀但表面凹凸 | 輕微便秘 |
| 3 | 香腸狀表面有裂紋 | **正常** |
| 4 | 軟便或香腸狀，表面光滑 | 正常偏軟 |
| 5 | 糊狀或液狀 | 腹瀉 |

## 資料關聯

- 大便記錄儲存在 `daily_symptom_entries` 表
- 每天每個用戶只有一筆記錄（unique constraint）
- 與食物和症狀記錄共用同一筆資料
- 使用 `upsert` 操作確保不會重複

## 顏色設計

- **正常** (type 3): 黃色/金色 #D2691E
- **便秘** (type 1-2): 深棕色 #8B4513
- **腹瀉** (type 4-5): 淺棕色/米色 #DEB887
- **血便警告**: 紅色 #EF4444
- **無血便**: 綠色 #10B981

## 下一步執行順序

1. ✅ 執行 migration: `007_add_bowel_movement_fields.sql`
2. ✅ 確認 types, service, hook 已創建
3. ⏳ 創建 `AddBowelMovementScreen.tsx`
4. ⏳ 更新導航類型和配置
5. ⏳ 整合到 `FoodDayDetailScreen.tsx`
6. ⏳ 整合到快速新增按鈕
7. ⏳ 測試完整流程
8. ⏳ Commit and push

## 注意事項

- 大便記錄是選填的，不是每天必須記錄
- 編輯模式要正確載入現有資料
- 刪除時只清空大便相關欄位，保留其他症狀資料
- 日期選擇要處理時區問題（使用 T12:00:00）
- 表單驗證：次數必須 >= 0
