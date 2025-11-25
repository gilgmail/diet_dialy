# 變更日誌 - 2025-01-12

## 🎮 新增遊戲化英雄卡片組件 (GamificationHeroCard)

### 概述
新增了 `GamificationHeroCard` 組件，提供一個視覺化的遊戲化摘要卡片，顯示用戶的健康冒險進度、連續記錄天數、資料覆蓋率等關鍵指標。

---

## ✨ 新功能

### 1. GamificationHeroCard 組件

**檔案**: `mobile/react-native-starter-kit/DietDailyMobile/src/features/insights/components/GamificationBoard.tsx`

**功能特點**:
- **健康冒險摘要**: 顯示當前等級、準備度分數、連續記錄天數
- **視覺化進度**: 習慣火焰和資料充足度的進度條
- **任務提示**: 顯示待補任務數量，引導用戶完成資料記錄
- **緊湊模式**: 支援 `compact` 屬性，適合在不同頁面使用

**顯示內容**:
- 等級徽章（新手/進階/專家）
- 準備度分數（0-100%）
- 連續記錄天數與最長連續記錄
- 資料覆蓋率百分比
- 習慣火焰進度
- 距離下一個里程碑的提示

### 2. InsightsScreen 整合

**檔案**: `mobile/react-native-starter-kit/DietDailyMobile/src/features/insights/screens/InsightsScreen.tsx`

**變更**:
- 新增 `'hero'` tab，專門顯示遊戲化英雄卡片
- 支援從其他頁面導航到 hero tab（透過 `route.params.tab`）
- 當 hero 模組被關閉時，自動切換到其他 tab

**Tab 結構**:
```
InsightsScreen
├── hero (新增) - 遊戲化摘要卡片
├── quests - 任務列表
├── progress - 進度追蹤
└── reports - 報告
```

### 3. TodayScreen 整合

**檔案**: `mobile/react-native-starter-kit/DietDailyMobile/src/features/today/screens/TodayScreen.tsx`

**變更**:
- 在 `summary` tab 的頂部顯示 `GamificationHeroCard`（緊湊模式）
- 提供快速導航到任務頁面的按鈕
- 根據設定中的 `hero` 模組開關控制顯示/隱藏

**顯示位置**:
- 位於今日摘要頁面的最上方
- 在快速操作按鈕之前

### 4. 設定頁面模組整合

**檔案**: `mobile/react-native-starter-kit/DietDailyMobile/src/features/settings/screens/SettingsScreen.tsx`

**變更**:
- 將 hero 模組整合到統一的模組開關系統
- 使用 `modules.hero` 設定項（取代舊的 `gamificationHeroEnabled`）
- 保持向後兼容性，仍支援 `gamificationHeroEnabled` 設定

**設定位置**:
- 設定頁面 → 模組開關 → Hero 模組

### 5. 類型定義更新

**檔案**: `mobile/react-native-starter-kit/DietDailyMobile/src/features/settings/types/index.ts`

**變更**:
- 在 `ModuleToggleSettings` 中新增 `hero: boolean` 欄位
- 更新 `DEFAULT_SETTINGS` 以包含 `hero: true`
- 保留 `gamificationHeroEnabled` 以維持向後兼容性

---

## 🔧 技術實現

### 組件架構

```typescript
interface GamificationHeroCardProps {
  snapshot: GamificationSnapshot      // 遊戲化快照資料
  alerts?: MissingDataAlert[]         // 缺失資料提醒
  onPressPrimary?: () => void         // 主要按鈕點擊事件
  primaryLabel?: string               // 主要按鈕標籤
  compact?: boolean                   // 是否使用緊湊模式
}
```

### 資料來源

組件使用 `buildGamificationSnapshot()` 函數來建立快照資料：

```typescript
const snapshot = buildGamificationSnapshot(streak, dataCoverage)
```

**包含的資料**:
- `streakDays`: 當前連續記錄天數
- `longestStreak`: 最長連續記錄
- `coveragePercent`: 資料覆蓋率
- `habitScore`: 習慣分數
- `readinessScore`: 準備度分數
- `level`: 當前等級（新手/進階/專家）
- `nextStreakMilestone`: 下一個里程碑
- `coverageGoal`: 覆蓋率目標

### 模組開關邏輯

```typescript
// 優先使用 modules.hero，向後兼容 gamificationHeroEnabled
const heroEnabled = 
  settings.modules?.hero ?? 
  settings.gamificationHeroEnabled ?? 
  DEFAULT_SETTINGS.modules?.hero ?? 
  true
```

---

## 📱 使用者體驗改進

### 視覺設計
- **漸層背景效果**: 使用裝飾性圓形元素創造視覺層次
- **等級徽章**: 根據用戶進度顯示不同顏色的等級標籤
- **進度條**: 直觀顯示習慣火焰和資料充足度
- **統計資訊**: 清晰展示連續天數、覆蓋率、最長記錄

### 互動設計
- **主要按鈕**: 提供快速導航到任務頁面
- **任務提示**: 顯示待補任務數量，鼓勵用戶完成記錄
- **里程碑提示**: 顯示距離下一個里程碑的天數

### 響應式設計
- **緊湊模式**: 在 TodayScreen 中使用較小的間距
- **完整模式**: 在 InsightsScreen 的 hero tab 中使用完整尺寸

---

## 🔄 向後兼容性

### 設定遷移
- 保留 `gamificationHeroEnabled` 設定項
- 自動遷移到 `modules.hero` 系統
- 如果只有舊設定，會自動建立新的 `modules` 物件

### 導航兼容
- 支援從其他頁面導航到 hero tab
- 如果 hero 模組被關閉，自動切換到其他可用 tab

---

## 📊 影響範圍

### 新增檔案
- 無（組件新增在現有的 `GamificationBoard.tsx` 中）

### 修改檔案
1. `mobile/.../GamificationBoard.tsx` - 新增 `GamificationHeroCard` 組件
2. `mobile/.../InsightsScreen.tsx` - 新增 hero tab 並整合組件
3. `mobile/.../TodayScreen.tsx` - 在摘要頁面顯示 hero card
4. `mobile/.../SettingsScreen.tsx` - 整合 hero 模組開關
5. `mobile/.../SettingsService.ts` - 處理設定遷移邏輯
6. `mobile/.../types/index.ts` - 更新類型定義

### 新增配置
- `worktrees.json` - 簡化工作樹設置的配置文件

---

## 🧪 測試建議

### 功能測試
1. ✅ 驗證 hero card 在 InsightsScreen 的 hero tab 中正確顯示
2. ✅ 驗證 hero card 在 TodayScreen 的 summary tab 中正確顯示（緊湊模式）
3. ✅ 驗證設定頁面的 hero 模組開關功能
4. ✅ 驗證關閉 hero 模組後，相關頁面不再顯示 hero card
5. ✅ 驗證從其他頁面導航到 hero tab 的功能

### 資料測試
1. ✅ 驗證不同等級（新手/進階/專家）的正確顯示
2. ✅ 驗證連續記錄天數和覆蓋率的計算
3. ✅ 驗證里程碑提示的正確性
4. ✅ 驗證任務提醒的顯示邏輯

### 兼容性測試
1. ✅ 驗證舊的 `gamificationHeroEnabled` 設定能正確遷移
2. ✅ 驗證沒有設定時使用預設值（啟用）
3. ✅ 驗證導航參數的正確處理

---

## 🚀 後續改進建議

### 短期
1. **動畫效果**: 為進度條和統計數字添加動畫
2. **個人化**: 根據用戶偏好調整顯示內容
3. **分享功能**: 允許用戶分享成就到社交媒體

### 中期
1. **更多里程碑**: 增加更多有意義的里程碑
2. **成就系統**: 整合完整的成就徽章系統
3. **排行榜**: 添加好友排行榜功能（需隱私保護）

### 長期
1. **AI 建議**: 根據遊戲化數據提供個性化建議
2. **挑戰模式**: 添加限時挑戰和特殊活動
3. **獎勵系統**: 整合實際獎勵機制

---

## 📝 相關文件

- [遊戲化設計文檔](./claudedocs/gamification-design.md)
- [進度追蹤設計](./claudedocs/progress-tracking-design.md)
- [模組開關修復摘要](./claudedocs/phase-a-module-toggle-fix-summary.md)

---

**變更日期**: 2025-01-12  
**影響範圍**: 移動應用程式 UI、遊戲化系統、設定系統  
**測試狀態**: ⏳ 待測試  
**部署狀態**: ✅ 已提交到版本控制

---

## Git Commits 記錄

```
feat: 新增 GamificationHeroCard 組件並整合至多個頁面

- 在 GamificationBoard 中新增 GamificationHeroCard 組件，顯示遊戲化摘要
- 更新 InsightsScreen 和 TodayScreen 以支援新的 hero 模組
- 調整設定頁面以整合 hero 模組的開關
- 新增 worktrees.json 配置文件以簡化工作樹設置
- 更新 types.ts 以包含新的 tab 參數類型
```

---

**維護者**: Development Team  
**最後更新**: 2025-01-12

