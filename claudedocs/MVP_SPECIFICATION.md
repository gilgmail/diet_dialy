# Diet Daily - MVP 產品規格書

**版本**: 1.0
**最後更新**: 2025-01-12
**狀態**: Development Phase

---

## 📋 執行摘要

### 產品概述
Diet Daily 是一個專為 IBD（炎症性腸病）、IBS（腸躁症）、食物過敏和化療患者設計的醫療級飲食與症狀追蹤應用。產品目標是幫助患者記錄飲食和症狀、視覺化資料趨勢、識別食物觸發因素，並為未來的 AI 分析建立完整資料基礎。

### 目標用戶
- **主要**: IBD/IBS 患者、食物過敏患者、化療患者
- **次要**: 關注腸道健康的一般用戶
- **地區**: 台灣、香港（繁體中文市場）

### 核心價值主張（當前 MVP）
1. **完整記錄系統**: 飲食、症狀、藥物、其他因子的完整追蹤
2. **資料視覺化**: 圖表、趨勢分析、資料匯出
3. **跨平台同步**: Web + iOS 無縫同步體驗
4. **遊戲化激勵**: Streak、等級系統提高記錄習慣

### 下一階段價值（Phase 2）
1. **AI 自動分析**: 整合 Claude AI 提供週報和個性化健康洞察
2. **進階遊戲化**: 成就徽章、挑戰任務、社群功能
3. **食物資料庫優化**: 重複檢測、自訂食物、搜尋優化
4. **Android 支援**: 擴大用戶群體

---

## 🎯 MVP 定義說明

### 當前階段重點（Phase 1: MVP 核心）
**核心目標**: 提供穩定、可靠的記錄與視覺化工具

**包含功能**:
- ✅ 完整的飲食與症狀記錄系統
- ✅ 資料報表與圖表視覺化
- ✅ 基礎遊戲化（Streak、等級）
- ✅ Web + iOS 跨平台同步
- ✅ 資料匯出（CSV/JSON）
- ✅ 用戶可手動將資料提供給 AI 分析

**不包含功能**（移至下一階段）:
- ⏳ AI 自動週報生成（下一階段高優先級）
- ⏳ 進階遊戲化功能（下一階段高優先級）
- ⏳ 食物資料庫深度優化（下一階段高優先級）
- ⏳ Android 應用（下一階段高優先級）
- ❌ 圖片上傳功能（暫不實施 - 無儲存空間）
- ❌ 月經週期追蹤（暫不實施 - 非核心需求）

**設計理念**:
1. **先建立資料基礎**: 讓用戶養成記錄習慣，累積足夠資料
2. **後加入智能分析**: 有足夠資料後，AI 分析才更有價值
3. **漸進式功能增加**: 避免初期過於複雜，確保核心體驗穩定
4. **資源合理分配**: 優先完成高價值、可行性高的功能

---

## 🎯 MVP 核心功能（當前階段）

### 1. 用戶認證與管理
**優先級**: 🔴 Critical
**狀態**: ✅ 已完成

#### 功能範圍
- ✅ Google OAuth 登入
- ✅ Email/密碼註冊與登入
- ✅ 用戶個人資料管理
- ✅ 密碼重置功能

#### 技術實現
- NextAuth.js for web authentication
- Supabase Auth for unified backend
- Row-Level Security (RLS) for data isolation

#### 成功指標
- 註冊流程完成率 > 70%
- 登入成功率 > 95%
- 密碼重置成功率 > 90%

---

### 2. 飲食記錄系統
**優先級**: 🔴 Critical
**狀態**: ✅ 核心完成

#### 功能範圍
- ✅ 食物搜尋（20,000+ 台灣食物資料庫）
- ✅ 每日飲食日誌
- ✅ 營養資訊顯示（卡路里、碳水、蛋白質、脂肪）
- ✅ 用餐時間記錄（早、午、晚、點心）
- ✅ 食物份量記錄
- ⏳ 自訂食物建立（下一階段）
- ⏳ 食物圖片上傳（下一階段 - 暫不實施，無儲存空間）

#### 使用者流程
1. 選擇用餐時段
2. 搜尋或選擇食物
3. 輸入份量
4. 查看營養摘要
5. 儲存記錄

#### 技術實現
- Supabase PostgreSQL for food database
- Full-text search with pg_trgm extension
- Real-time sync via Supabase subscriptions

#### 成功指標
- 食物搜尋結果相關性 > 85%
- 平均記錄時間 < 2 分鐘
- 每日記錄完成率 > 60%

---

### 3. 症狀追蹤系統
**優先級**: 🔴 Critical
**狀態**: ✅ 已完成

#### 功能範圍
- ✅ 每日症狀日誌
- ✅ IBD 症狀追蹤（腹痛、腹瀉、血便等）
- ✅ 嚴重程度評分（1-5 級）
- ✅ 排便記錄（次數、Bristol 分類）
- ✅ 藥物記錄
- ⏳ 症狀照片上傳（下一階段 - 暫不實施，無儲存空間）
- ❌ 月經週期追蹤（暫不實施）

#### 症狀類型
- 消化症狀: 腹痛、腹瀉、便秘、脹氣、噁心
- 全身症狀: 疲勞、發燒、體重變化
- 其他: 皮膚問題、關節痛

#### 技術實現
- Structured symptom data model
- Daily entry with timestamp
- Severity scoring system (1-5)

#### 成功指標
- 症狀記錄完成率 > 50%
- 症狀與食物關聯準確率 > 70%
- 用戶每週至少記錄 4 天

---

### 4. 資料報表與視覺化
**優先級**: 🟡 High
**狀態**: ✅ 核心完成

#### 功能範圍
- ✅ 飲食記錄報表（每日/每週/每月）
- ✅ 症狀記錄報表（趨勢圖、統計）
- ✅ 其他因子追蹤（藥物、運動、壓力等）
- ✅ 資料視覺化圖表（折線圖、柱狀圖、圓餅圖）
- ✅ Web 端資料匯出功能
- ✅ 用戶可將資料複製給 AI 分析（手動操作）
- ⏳ 自動 AI 週報生成（下一階段）
- ⏳ PDF 報告自動匯出（下一階段）

#### 報表內容
1. **飲食摘要**: 營養攝取統計、食物類別分布
2. **症狀追蹤**: 症狀頻率、嚴重程度趨勢
3. **關聯分析**: 飲食與症狀的時間關聯（視覺化）
4. **其他因子**: 藥物、運動、壓力等記錄
5. **資料完整度**: 記錄覆蓋率、連續天數

#### 技術實現
- React Query for data fetching
- Victory Native / Recharts for charting
- Date-fns for date manipulation
- CSV/JSON export functionality
- 用戶可手動將資料提供給外部 AI 工具分析

#### 成功指標
- 圖表載入時間 < 2 秒
- 資料匯出成功率 > 95%
- 報表查閱率 > 50%

#### 下一階段規劃（AI 自動化）
- **自動 AI 週報**: 整合 Anthropic Claude API
- **智能分析**: 食物與症狀關聯自動識別
- **個性化建議**: AI 生成飲食調整建議
- **PDF 匯出**: 自動生成醫療級報告

---

### 5. 遊戲化系統（下一階段優先功能）
**優先級**: 🟡 High
**狀態**: ✅ 基礎完成，⏳ 進階功能待開發

#### 當前已完成
- ✅ 連續記錄追蹤（Streak）
- ✅ 資料覆蓋率計算
- ✅ 等級系統（新手/進階/專家）
- ✅ 準備度分數（Readiness Score）
- ✅ 習慣火焰進度條
- ✅ 任務系統（Quest System）
- ✅ GamificationHeroCard 視覺摘要

#### 下一階段開發
- ⏳ 成就徽章系統
- ⏳ 排行榜功能
- ⏳ 每日挑戰任務
- ⏳ 積分獎勵系統
- ⏳ 社群分享功能

#### 遊戲化指標
- **連續天數**: 連續記錄飲食/症狀的天數
- **資料覆蓋率**: (記錄天數 / 總天數) × 100%
- **習慣分數**: 基於連續天數的 0-100 分數
- **準備度分數**: 綜合連續性和資料完整度

#### 等級系統
- 🥉 **新手 (Novice)**: 0-30 天連續記錄
- 🥈 **進階 (Advanced)**: 31-90 天連續記錄
- 🥇 **專家 (Expert)**: 90+ 天連續記錄

#### 技術實現
- Real-time streak calculation
- Background job for score updates
- Database triggers for automatic updates
- Modular toggle system for customization

#### 成功指標
- 連續記錄達 7 天用戶比例 > 40%
- 連續記錄達 30 天用戶比例 > 15%
- 遊戲化功能使用率 > 70%

---

### 6. 食物資料庫管理（下一階段優化）
**優先級**: 🟢 Medium
**狀態**: ✅ 基礎功能完成

#### 當前功能
- ✅ 20,000+ 台灣食物資料庫
- ✅ 全文搜尋功能
- ✅ 基本營養資訊
- ✅ 食物分類管理
- ✅ Admin panel 基礎管理

#### 下一階段優化
- ⏳ 重複食物自動檢測與合併
- ⏳ 食物資料品質提升
- ⏳ 用戶自訂食物建立 UI
- ⏳ 食物資料眾包驗證
- ⏳ 多語言食物名稱支援
- ⏳ 食材與料理關聯建立

#### 優化目標
- 搜尋準確率提升到 > 90%
- 減少重複食物 50%
- 自訂食物功能使用率 > 30%

---

### 7. 跨平台同步
**優先級**: 🟡 High
**狀態**: ✅ Web + iOS 完成

#### 當前功能
- ✅ Web 應用（Next.js 15）
- ✅ iOS 原生應用（React Native + Expo）
- ✅ 即時資料同步（需網路連線）
- ✅ 跨平台資料一致性

#### 下一階段開發
- ⏳ Android 原生應用
- ⏳ 離線模式支援
- ⏳ 衝突解決機制
- ⏳ 背景自動同步

#### 技術實現
- Supabase PostgreSQL + Realtime
- React Query for data management
- Optimistic UI updates
- Row-Level Security (RLS)

#### 成功指標
- 同步延遲 < 3 秒
- 同步成功率 > 98%
- Web/iOS 資料一致性 > 99%

---

### 8. 管理員功能
**優先級**: 🟢 Medium
**狀態**: ✅ 基礎完成

#### 當前功能
- ✅ 食物資料庫管理
- ✅ 重複食物檢測（基礎）
- ✅ 食物資訊編輯
- ✅ 用戶管理面板（基礎）

#### 下一階段開發
- ⏳ 進階重複檢測算法
- ⏳ 系統監控儀表板
- ⏳ 使用統計分析
- ⏳ 批次操作優化

#### 技術實現
- Secure admin routes
- Role-based access control
- Basic audit logging

#### 優化目標
- 重複食物檢測準確率提升到 > 90%
- 管理操作效率提升 > 50%

---

## 📱 用戶體驗流程

### 新用戶 Onboarding
1. **註冊/登入** (30 秒)
   - 選擇 Google OAuth 或 Email 註冊
   - 設定基本個人資料

2. **初始設定** (2 分鐘)
   - 選擇健康狀況（IBD/IBS/過敏/化療）
   - 設定提醒通知偏好
   - 簡易教學導覽

3. **首次記錄** (3 分鐘)
   - 引導記錄第一餐
   - 引導記錄當日症狀
   - 解釋遊戲化系統

4. **探索功能** (5 分鐘)
   - 查看今日摘要
   - 了解 AI 週報功能
   - 設定每日提醒

### 日常使用流程
1. **早晨** (2 分鐘)
   - 打開 app 查看今日摘要
   - 查看 Hero Card 了解進度
   - 查看待完成任務

2. **用餐時** (1-2 分鐘/餐)
   - 記錄食物攝取
   - 查看營養摘要
   - 設定下次提醒

3. **晚上** (2-3 分鐘)
   - 記錄全天症狀
   - 查看今日資料完整度
   - 保持連續記錄 Streak

4. **週日** (5-10 分鐘)
   - 查看 AI 生成的週報
   - 閱讀健康建議
   - 調整下週飲食計劃

---

## 🛠️ 技術架構

### Frontend Stack
```yaml
Web:
  Framework: Next.js 15 (App Router)
  UI Library: React 19
  Language: TypeScript 5
  Styling: Tailwind CSS + shadcn/ui
  State: React Query + Zustand

Mobile:
  Framework: React Native + Expo SDK 52
  Navigation: Expo Router
  UI: React Native Paper + Custom Components
  State: React Query + Zustand
  Storage: Async Storage
```

### Backend Stack
```yaml
Database: Supabase PostgreSQL
Authentication: Supabase Auth
Storage: Supabase Storage
Realtime: Supabase Realtime Subscriptions
Security: Row-Level Security (RLS)

AI Services:
  Primary: Anthropic Claude API
  Fallback: OpenAI GPT-4

File Generation:
  PDF: pdf-lib
  Charts: Victory Native (mobile) / Recharts (web)
```

### Infrastructure
```yaml
Hosting:
  Web: Vercel / Self-hosted (Raspberry Pi 5)
  Mobile: Expo EAS Build + Update

CI/CD:
  Platform: GitHub Actions
  Testing: Playwright (E2E) + Jest (unit)
  Quality: ESLint + TypeScript Compiler

Monitoring:
  Analytics: TBD
  Errors: TBD
  Performance: TBD
```

---

## 📊 資料模型

### 核心資料表

#### users (diet_daily_users)
```sql
- id: uuid (primary key)
- email: string
- name: string
- avatar_url: string
- created_at: timestamp
- updated_at: timestamp
```

#### food_entries (food_entries_new)
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key)
- food_id: uuid (foreign key)
- entry_date: date
- meal_type: enum (breakfast, lunch, dinner, snack)
- quantity: decimal
- unit: string
- created_at: timestamp
```

#### symptom_entries (daily_symptom_entries)
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key)
- entry_date: date
- symptoms: jsonb
- severity: integer (1-5)
- bowel_movements: integer
- bristol_type: integer (1-7)
- notes: text
- created_at: timestamp
```

#### gamification_streaks
```sql
- id: uuid (primary key)
- user_id: uuid (foreign key)
- current_streak: integer
- longest_streak: integer
- last_entry_date: date
- total_points: integer
- created_at: timestamp
- updated_at: timestamp
```

#### foods (foods_new)
```sql
- id: uuid (primary key)
- name: string
- category: string
- calories: decimal
- protein: decimal
- carbs: decimal
- fat: decimal
- fiber: decimal
- serving_size: string
- source: string
```

---

## 🔐 安全性與隱私

### 資料保護
- ✅ Row-Level Security (RLS) 確保用戶只能存取自己的資料
- ✅ HTTPS 加密傳輸
- ✅ 密碼 bcrypt 雜湊儲存
- ✅ API key 環境變數管理
- 🚧 資料加密存儲（敏感欄位）
- 🚧 定期資料備份

### 合規性
- **GDPR**: 提供資料匯出和刪除功能
- **台灣個資法**: 遵循個人資料保護規範
- **香港 PDPO**: 符合隱私條例
- **HIPAA-ready**: 採用醫療級安全實踐

### 醫療免責聲明
- 明確標示為健康追蹤工具，非醫療診斷
- 建議用戶諮詢專業醫療人員
- AI 建議僅供參考，不替代醫療諮詢

---

## 📈 成功指標 (KPIs)

### 用戶獲取
- **註冊用戶數**: 目標 1,000 (3 個月內)
- **註冊轉換率**: > 5% (訪客到註冊)
- **推薦率**: > 20% (用戶推薦其他用戶)

### 用戶參與度
- **DAU (Daily Active Users)**: > 200
- **MAU (Monthly Active Users)**: > 600
- **每日記錄率**: > 60% (活躍用戶)
- **7 天留存率**: > 40%
- **30 天留存率**: > 20%

### 功能使用
- **飲食記錄**: 平均每天 2.5 餐
- **症狀記錄**: 平均每週 4+ 次
- **AI 週報查閱率**: > 60%
- **遊戲化功能使用**: > 70%
- **PDF 報告下載**: > 30%

### 技術指標
- **Web 頁面載入時間**: < 2 秒
- **Mobile app 啟動時間**: < 3 秒
- **API 回應時間**: < 500ms (p95)
- **系統可用性**: > 99.5%
- **錯誤率**: < 1%

### 用戶滿意度
- **NPS (Net Promoter Score)**: > 40
- **App Store 評分**: > 4.0/5.0
- **功能滿意度**: > 4/5
- **AI 報告有用性**: > 80%

---

## 🚀 發布計劃（重新定義）

### Phase 1: MVP 核心（當前階段）✅
**時間**: 2024 Q4 - 2025 Q1
**目標**: 核心功能穩定，可用性驗證
**狀態**: 約 80% 完成

#### 已完成功能
- ✅ 用戶認證系統（Google OAuth + Email/Password）
- ✅ 飲食記錄系統（20,000+ 食物資料庫）
- ✅ 症狀追蹤系統（完整症狀記錄）
- ✅ 資料報表與視覺化（圖表、匯出）
- ✅ 遊戲化基礎（Streak、等級、Hero Card）
- ✅ Web 應用（Next.js 15）
- ✅ iOS 應用（React Native + Expo）
- ✅ 跨平台即時同步

#### 待完成工作
- 🚧 Mobile-Web 同步優化
- 🚧 效能調整與 bug 修復
- 🚧 測試覆蓋率提升（目標 40%）
- 🚧 生產環境部署準備

#### 交付標準
- 核心功能穩定運行（無重大 bug）
- 同步成功率 > 98%
- 基礎測試覆蓋
- 可供早期用戶測試

---

### Phase 2: 進階功能與優化 ⏳
**時間**: 2025 Q2 - Q3
**目標**: 功能增強、用戶體驗優化、市場準備
**優先級排序**:

#### 🔴 高優先級（必須完成）
1. **AI 自動週報系統**
   - 整合 Anthropic Claude API
   - 自動生成週健康分析報告
   - 食物與症狀關聯自動識別
   - PDF 報告自動匯出
   - 工作量：2-3 週

2. **遊戲化進階功能**
   - 成就徽章系統
   - 每日挑戰任務
   - 積分獎勵機制
   - 里程碑慶祝動畫
   - 工作量：2-3 週

3. **食物資料庫優化**
   - 重複食物自動檢測與合併
   - 用戶自訂食物建立 UI
   - 食物資料品質提升
   - 搜尋準確率優化
   - 工作量：2-3 週

4. **Android 應用開發**
   - React Native Android 適配
   - Android 特定 UI 優化
   - Google Play 提交準備
   - 工作量：3-4 週

#### 🟡 中優先級（建議完成）
5. **離線模式支援**
   - AsyncStorage 資料暫存
   - 同步佇列機制
   - 衝突解決策略
   - 工作量：2-3 週

6. **進階資料分析**
   - 長期趨勢追蹤（3 個月、6 個月）
   - 症狀預測模型
   - 食物風險評分系統
   - 工作量：2 週

7. **社群分享功能**
   - 成就分享到社交媒體
   - 匿名經驗交流
   - 社群挑戰活動
   - 工作量：1-2 週

#### 🟢 低優先級（可選）
8. **排行榜系統**（隱私優先設計）
9. **多設備登入管理**
10. **系統監控與分析儀表板**

#### 暫不實施
- ❌ 圖片上傳功能（食物、症狀照片）- 無儲存空間
- ❌ 月經週期追蹤 - 非核心用戶需求
- ❌ AI 圖片辨識 - 成本過高

---

### Phase 3: 公開發布準備 📋
**時間**: 2025 Q3 - Q4
**目標**: 市場推廣、規模化準備

#### 產品準備
- 完整功能測試（UAT）
- 效能優化與壓力測試
- 安全性審計
- App Store / Google Play 提交
- 用戶文檔與教學影片

#### 市場準備
- 行銷網站建立
- 社交媒體帳號設立
- 推廣素材製作
- Beta 用戶招募計劃
- 媒體合作接洽

#### 商業準備
- 定價策略確定
- 付費功能實施
- 客戶支援系統
- 隱私政策與服務條款
- 合規性文件準備

---

### Phase 4: 成長與迭代 🚀
**時間**: 2025 Q4+
**目標**: 用戶增長、功能迭代、商業化

#### 用戶增長
- 用戶反饋收集與改進
- A/B 測試優化
- 推薦計劃（Referral Program）
- SEO / ASO 優化

#### 功能迭代
- 根據數據調整優先級
- 新功能實驗性發布
- 用戶建議功能開發

#### 商業拓展
- 與醫療機構合作
- 企業版本開發
- 研究機構資料合作（去識別化）
- 國際市場擴展

---

## 💰 商業模式

### Freemium 模式

#### 免費版
- 每日飲食記錄（無限制）
- 每日症狀記錄（無限制）
- 基礎遊戲化功能
- 每月 1 份 AI 週報
- 基礎資料視覺化

#### 付費版 (Premium)
**價格**: NTD 299/月 或 NTD 2,990/年

- 無限 AI 週報生成
- 進階資料分析與預測
- PDF 報告無限匯出
- 優先客戶支援
- 多設備同步（>2 台）
- 資料匯出功能
- 去除廣告（如有）

#### 企業版 (Enterprise)
**價格**: 客製化報價

- 多用戶管理
- 機構級資料分析
- 客製化報告範本
- API 整合
- 專屬客戶經理
- SLA 保證

---

## 🎯 目標用戶故事

### Persona 1: IBD 患者 Amy (28歲, 台北)
**背景**:
- 診斷潰瘍性結腸炎 2 年
- 上班族，常外食
- 想找出觸發食物

**使用場景**:
1. 每天用 mobile app 記錄三餐和症狀
2. 週日查看 AI 週報了解本週健康狀況
3. 發現辣椒和乳製品與症狀相關
4. 調整飲食後症狀改善，連續記錄達 60 天
5. 將 PDF 報告帶給醫生討論

**期望成果**:
- 識別 3-5 種觸發食物
- 症狀嚴重度降低 40%
- 提高生活品質

### Persona 2: IBS 患者 David (35歲, 香港)
**背景**:
- IBS-D 多年
- 自由工作者，壓力大
- 嘗試過多種飲食法

**使用場景**:
1. 記錄飲食和症狀，追蹤低 FODMAP 飲食效果
2. 使用遊戲化系統保持記錄習慣
3. AI 分析發現壓力與症狀相關性
4. 結合運動和冥想記錄（未來功能）
5. 長期追蹤找到最適合的飲食模式

**期望成果**:
- 找到個人化飲食方案
- 症狀頻率減少 50%
- 建立穩定的健康習慣

### Persona 3: 化療患者 Linda (45歲, 台中)
**背景**:
- 乳癌化療中
- 食慾不振、噁心
- 需要營養監控

**使用場景**:
1. 記錄每日飲食攝取和副作用
2. 追蹤營養指標（卡路里、蛋白質）
3. AI 建議高營養密度食物
4. 將報告提供給營養師參考
5. 家人協助記錄和監測

**期望成果**:
- 維持足夠營養攝取
- 減輕化療副作用
- 改善整體體力狀況

---

## 🔬 驗證與測試計劃

### Alpha 測試 (已完成)
- **對象**: 內部團隊 + 5-10 早期用戶
- **目標**: 功能驗證、重大 bug 修復
- **期間**: 4 週

### Beta 測試 (進行中)
- **對象**: 50-100 真實用戶
- **目標**: 使用體驗優化、效能調整
- **期間**: 8 週
- **收集指標**:
  - 用戶反饋問卷
  - 使用行為分析
  - Bug 回報
  - 功能需求建議

### 上線前測試
- ✅ 單元測試覆蓋率 > 70%
- ✅ E2E 測試核心流程
- 🚧 效能測試（負載、壓力）
- 🚧 安全性審計
- 🚧 無障礙性測試
- 🚧 跨瀏覽器/設備測試

---

## 🚧 已知限制與改進方向

### 當前限制
1. **AI 分析**:
   - 需要至少一週資料才能生成報告
   - 分析準確度取決於用戶記錄完整度
   - 每月 AI 請求成本較高

2. **離線支援**:
   - Mobile app 需網路連線才能同步
   - 無完整離線模式

3. **資料隱私**:
   - 尚未實施端到端加密
   - 資料匯出功能未完成

4. **社群功能**:
   - 無用戶間互動功能
   - 無經驗分享機制

### 短期改進 (3 個月)
- ✅ Android app 完成開發
- ✅ 離線模式基礎架構
- ✅ 進階圖表分析
- ⏳ 自訂食物建立
- ⏳ 食物圖片辨識 (AI)
- ⏳ 藥物追蹤功能

### 中期改進 (6 個月)
- 端到端加密實施
- 完整資料匯出功能
- 即時症狀預測
- 社群功能（選擇性）
- 多語言支援擴展
- 與健康設備整合

### 長期願景 (12+ 個月)
- AI 個人化營養師功能
- 與醫療機構系統整合
- 研究資料去識別化貢獻
- 全球市場擴展
- 進階生物標記追蹤

---

## 📞 聯絡與支援

### 技術支援
- **GitHub Issues**: [github.com/your-org/diet-daily/issues]
- **Email**: support@dietdaily.app
- **Discord**: [社群伺服器連結]

### 商務合作
- **Email**: business@dietdaily.app
- **網站**: www.dietdaily.app

### 醫療專業人員
- **Email**: medical@dietdaily.app
- **合作夥伴計劃**: [連結]

---

## 📄 附錄

### A. 參考文獻
1. IBD 飲食管理指南
2. IBS 低 FODMAP 飲食研究
3. 化療營養支持指引
4. 數位健康應用設計原則

### B. 競品分析
- MyFitnessPal
- Cara Care
- Bowelle
- FoodMarble AIRE

### C. 技術文件
- [API 文檔](./API_DOCUMENTATION.md)
- [資料庫 Schema](./DATABASE_SCHEMA.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [開發指南](./AGENT.md)

### D. 設計資源
- [UI/UX 設計稿](./designs/)
- [品牌指南](./BRAND_GUIDELINES.md)
- [Icon 資源](./assets/)

---

**文件版本**: 1.0
**最後更新**: 2025-01-12
**維護者**: Development Team
**審核狀態**: ✅ Approved for Development

**變更歷史**:
- 2025-01-12: 初版完成，包含 MVP 完整規格
- 2025-01-12: 新增 GamificationHeroCard 功能描述
- 2025-01-12: 更新技術架構與發布計劃
