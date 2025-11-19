# Phase A: TodayScreen 重新設計

## 🎯 目標

將 TodayScreen 從單一長列表重構為雙Tab架構，提供更好的資訊瀏覽和管理體驗。

## 📋 設計方案

### Tab 1: 今日摘要（Summary）
- **目的**：快速瀏覽今天所有記錄狀況
- **設計**：折疊卡片式，顯示數量和簡要資訊
- **互動**：
  - 點擊卡片 → 展開/折疊
  - 點擊 ➕ → 新增該類型記錄
  - 展開後顯示記錄簡要列表

### Tab 2: 詳細管理（Detail）
- **目的**：查看完整記錄並進行編輯/刪除
- **設計**：完整展開的記錄卡片
- **互動**:
  - 完整記錄資訊顯示
  - [編輯] 按鈕 → 導航到編輯頁面
  - [刪除] 按鈕 → 確認對話框 → 刪除

## 📊 資料結構

### 記錄類型
```typescript
type RecordType = 'food' | 'symptom' | 'bowel' | 'medication' | 'sleep' | 'activity'

interface RecordSection {
  id: RecordType
  icon: string
  title: string
  color: string
  count: number
  data: any[]
  visible: boolean // 根據 module settings
}
```

### 狀態管理
```typescript
const [activeTab, setActiveTab] = useState<'summary' | 'detail'>('summary')
const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
```

## 🎨 UI Components

### CollapsibleCard (Summary Tab)
```
┌─────────────────────────────┐
│ 🍎 飲食 (4)   ➕   ▼       │ ← Header (可點擊)
└─────────────────────────────┘

展開後：
┌─────────────────────────────┐
│ 🍎 飲食 (4)   ➕   ▲       │
├─────────────────────────────┤
│ • 08:00 早餐                │
│   雞蛋土司、牛奶             │
├─────────────────────────────┤
│ • 12:30 午餐                │
│   雞肉便當                  │
└─────────────────────────────┘
```

### DetailCard (Detail Tab)
```
┌─────────────────────────────┐
│ 🕐 08:00 早餐               │
│ ─────────────────────────── │
│ 雞蛋土司 (1片)              │
│ 熱量: 150 kcal              │
│                             │
│ 全脂牛奶 (240ml)            │
│ 熱量: 120 kcal              │
│ ─────────────────────────── │
│ 總熱量: 270 kcal            │
│                             │
│  [✏️ 編輯] [🗑️ 刪除]       │
└─────────────────────────────┘
```

## 🛠️ 實現步驟

### Phase 1: 基礎架構 ✅
1. ✅ 添加 useState for tabs and collapse
2. ✅ 添加 LayoutAnimation imports
3. ✅ 建立 Tab 切換 UI
4. ✅ 建立 CollapsibleCard 組件

### Phase 2: Summary Tab ✅
5. ✅ 實現折疊卡片列表
6. ✅ 整合現有數據到卡片
7. ✅ 添加 ➕ 按鈕功能
8. ✅ 實現展開/折疊動畫

### Phase 3: Detail Tab ✅
9. ✅ 完整記錄卡片組件（保留原有實現）
10. ✅ 編輯功能整合（使用現有導航）
11. ⏳ 刪除功能 + 確認對話框（未來 Phase）

### Phase 4: 優化 ✅
12. ✅ 空狀態處理
13. ✅ Loading 狀態（使用 RefreshControl）
14. ✅ 動畫優化（LayoutAnimation）

## 📝 記錄類型配置

```typescript
const RECORD_SECTIONS = [
  {
    id: 'food',
    icon: 'food-apple',
    title: '飲食',
    color: colors.success,
    getData: () => foodEntries,
    addHandler: () => navigation.navigate('AddFoodEntry'),
    visible: true, // 總是顯示
  },
  {
    id: 'symptom',
    icon: 'medical-bag',
    title: '症狀',
    color: colors.error,
    getData: () => symptomEntries,
    addHandler: () => navigation.navigate('AddSymptomEntry'),
    visible: true,
  },
  {
    id: 'bowel',
    icon: 'toilet',
    title: '大便',
    color: '#D2691E',
    getData: () => [], // TODO: fetch bowel data
    addHandler: () => navigation.navigate('AddBowelMovement'),
    visible: true,
  },
  {
    id: 'medication',
    icon: 'pill',
    title: '用藥',
    color: colors.primary[500],
    getData: () => mLogs,
    addHandler: () => navigation.navigate('MedicationLog'),
    visible: showMedication,
  },
  {
    id: 'sleep',
    icon: 'sleep',
    title: '睡眠',
    color: colors.secondary[500],
    getData: () => sSessions,
    addHandler: () => navigation.navigate('SleepLog'),
    visible: showSleep,
  },
  {
    id: 'activity',
    icon: 'run',
    title: '運動',
    color: colors.info,
    getData: () => aSessions,
    addHandler: () => navigation.navigate('ActivityLog'),
    visible: showActivity,
  },
]
```

## ⚠️ 注意事項

1. **向後兼容**：保留所有現有功能和數據查詢邏輯
2. **性能**：折疊狀態避免渲染詳細內容
3. **動畫**：使用 LayoutAnimation 提供流暢過渡
4. **狀態持久化**：可考慮將折疊狀態儲存到 AsyncStorage（Phase 4）

## 🧪 測試檢查項目

- [ ] Tab 切換正常運作
- [ ] 折疊/展開動畫流暢
- [ ] ➕ 按鈕正確導航
- [ ] 數量計算正確
- [ ] 模組開關正確隱藏相應區塊
- [ ] 編輯功能正常
- [ ] 刪除功能 + 確認對話框
- [ ] 空狀態顯示
- [ ] Loading 狀態
- [ ] 下拉刷新

## 📐 樣式設計

### Tab Bar
- 高度: 48px
- 底部邊框: 2px
- Active 顏色: primary[500]
- Inactive 顏色: text.secondary

### Collapsible Card
- 背景: surface
- 邊框: 1px, border color
- 圓角: 12px
- 間距: spacing.sm
- 內邊距: spacing.md

### Detail Card
- 背景: white
- 陰影: elevation 2
- 圓角: 12px
- 間距: spacing.md
- 按鈕: 高度 36px，圓角 8px

---

## ✅ 實現完成

**建立時間**: 2025-11-19
**完成時間**: 2025-11-19
**狀態**: ✅ 已完成並提交
**Commit**: f9ed2a1 - feat: implement dual-tab TodayScreen with collapsible cards
**負責**: Phase A Implementation

### 已實現功能
1. ✅ 雙Tab架構（摘要/詳細）
2. ✅ 6種記錄類型的可折疊卡片
3. ✅ 模組開關整合（Medication/Sleep/Activity）
4. ✅ 流暢的展開/折疊動畫
5. ✅ 快速新增按鈕（每張卡片）
6. ✅ 空狀態顯示
7. ✅ TypeScript 類型安全

### 待測試項目
- [ ] Tab 切換正常運作
- [ ] 折疊/展開動畫流暢
- [ ] ➕ 按鈕正確導航
- [ ] 數量計算正確
- [ ] 模組開關正確隱藏相應區塊
- [ ] 下拉刷新正常
