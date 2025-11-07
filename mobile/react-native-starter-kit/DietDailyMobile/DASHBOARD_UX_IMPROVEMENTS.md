# Dashboard UX 改進說明

## 實施的三大功能

### 1. ✅ 登出按鈕移至最右邊

**位置**: [DashboardScreen.tsx](src/features/dashboard/screens/DashboardScreen.tsx#L834)

**實施內容**:
- 在 Header 右側新增 `headerRight` 容器
- 包含設定按鈕（⚙️）和登出按鈕（🚪）
- 使用 `flexDirection: 'row'` 水平排列

**UI 結構**:
```
┌─────────────────────────────────────┐
│ 健康儀表板          ⚙️  🚪         │
│ user@email.com                      │
└─────────────────────────────────────┘
```

### 2. ✅ Tab 切換導航

**位置**: [DashboardScreen.tsx](src/features/dashboard/screens/DashboardScreen.tsx#L853)

**實施內容**:
- 4 個 Tab: 📊 記錄 / 📈 趨勢 / 💡 洞察 / 📝 報告
- 使用 `activeTab` state 控制顯示內容
- 底部有藍色下劃線標示當前 Tab
- 點擊 Tab 立即切換，無需滾動

**Tab 對應內容**:
| Tab | 內容 |
|-----|------|
| 📊 記錄 | Quick Stats (今日/本週 飲食/症狀) |
| 📈 趨勢 | Weekly Charts (每日飲食/症狀圖表) |
| 💡 洞察 | Health Insights + AI 分析按鈕 |
| 📝 報告 | AI Analysis History |

**優勢**:
- ✅ 不用一直下滑
- ✅ 快速切換到想看的區塊
- ✅ 視覺更清晰，內容更聚焦

### 3. ✅ Debug 模式 - AI 提示詞調整

**位置**: [SettingsScreen.tsx](src/features/settings/screens/SettingsScreen.tsx#L470)

**實施內容**:
- 在 Settings 新增「開發者選項」區塊
- Debug 模式開關（Switch）
- 開啟後顯示多行文字輸入框
- 支援自訂 AI 分析提示詞
- 自動儲存（失焦時）+ 手動儲存按鈕

**資料結構**:
```typescript
interface UserSettings {
  // ... 其他欄位
  debugMode?: boolean        // Debug 模式開關
  customPrompt?: string      // 自訂 AI 提示詞
}
```

**使用方式**:
1. 進入 Settings → 開發者選項
2. 開啟 Debug 模式
3. 輸入自訂提示詞，例如：
   ```
   請特別關注以下食物：
   - 高 FODMAP 食物（洋蔥、大蒜、麵包）
   - 乳製品（牛奶、起司）
   - 辛辣食物

   分析重點：
   1. 食物與腹痛的關聯性
   2. 排便頻率變化
   3. 飲食時間對症狀的影響
   ```
4. 點擊「儲存提示詞」或離開輸入框自動儲存
5. 下次執行 AI 分析時會使用此提示詞

**應用場景**:
- 🔬 **測試不同提示詞效果**：比較分析結果的差異
- 🎯 **針對性分析**：聚焦特定食物或症狀
- 📝 **提示詞優化**：逐步調整以獲得最佳分析結果
- 🔧 **開發調試**：測試新的分析邏輯

## 技術實現

### Tab 切換機制
```typescript
const [activeTab, setActiveTab] = useState<'stats' | 'trends' | 'insights' | 'reports'>('stats')

// 條件渲染
{activeTab === 'stats' && <QuickStats />}
{activeTab === 'trends' && <WeeklyCharts />}
{activeTab === 'insights' && <HealthInsights />}
{activeTab === 'reports' && <AnalysisHistory />}
```

### Debug 模式儲存
```typescript
// 失焦自動儲存
onBlur={async () => {
  if (user?.id) {
    await updateSettings(user.id, { customPrompt })
  }
}}

// 手動儲存
onPress={async () => {
  if (user?.id) {
    await updateSettings(user.id, { customPrompt })
    Alert.alert('已儲存', '自訂提示詞已更新')
  }
}}
```

### Supabase Schema
需要在 `user_settings` 表加入以下欄位：
```sql
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS debug_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_prompt TEXT;
```

## 使用者體驗改進

### 改進前
```
❌ 需要滾動很長才能看到 AI 報告
❌ 登出按鈕在 Settings 裡面，要多點一次
❌ 無法調整 AI 分析的重點
```

### 改進後
```
✅ Tab 切換，立即跳轉到想看的區塊
✅ 登出在 Dashboard 右上角，一鍵登出
✅ Debug 模式可自訂提示詞，針對性分析
```

## 後續建議

### 短期優化
1. **Tab 持久化**：記住使用者最後選擇的 Tab
2. **提示詞範本**：提供常用提示詞範本選擇
3. **分析結果比對**：並排顯示不同提示詞的分析結果

### 中期優化
1. **提示詞歷史**：記錄過往使用的提示詞
2. **分享提示詞**：分享有效的提示詞給其他使用者
3. **AI 回應展示**：在 Debug 模式下顯示完整 AI 回應

### 長期規劃
1. **視覺化編輯器**：拖拉式提示詞建構工具
2. **A/B 測試**：自動測試不同提示詞效果
3. **社群提示詞庫**：精選有效提示詞分享平台

## 測試清單

- [ ] Tab 切換流暢，無卡頓
- [ ] 登出按鈕在右上角，功能正常
- [ ] Debug 模式開關正常
- [ ] 提示詞輸入支援多行
- [ ] 失焦自動儲存
- [ ] 手動儲存顯示成功訊息
- [ ] Supabase 正確儲存 debugMode 和 customPrompt
- [ ] AI 分析使用自訂提示詞

## 部署檢查

1. ✅ TypeScript 編譯無錯誤
2. ✅ Git commit 已提交
3. ✅ Git push 已推送到 remote
4. ⏳ 準備部署到 Gil-Golden iPhone

## 相關檔案

- `DashboardScreen.tsx`: Tab 導航 + 登出按鈕
- `SettingsScreen.tsx`: Debug 模式 + 提示詞編輯
- `settings/types/index.ts`: Settings 型別定義
- `DASHBOARD_PERFORMANCE_OPTIMIZATION.md`: 效能優化說明

---

**下一步**: 部署到真機測試所有新功能！
