# Diet Daily 專案文件目錄

本目錄包含 Diet Daily 醫療級飲食追蹤 PWA 的完整技術文件。

## 📋 最新文件 (v2.1.0)

### 🔧 核心修復文件
- **[IBD_SCORING_FIXES.md](./IBD_SCORING_FIXES.md)** - IBD 醫療評分系統修復詳細報告
- **[BILINGUAL_RISK_FACTORS.md](./BILINGUAL_RISK_FACTORS.md)** - 雙語風險因子系統技術文件

### 📚 專案規格和系統文件
- **[DietDaily_ProjectSpecification_Updated.md](./DietDaily_ProjectSpecification_Updated.md)** - 🆕 更新專案規格 (移除照片識別，專注文字輸入)
- **[DietDaily_SimpleRoadmap.md](./DietDaily_SimpleRoadmap.md)** - 🔄 更新開發路線圖 (Week 2 完成狀態)
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - 完整 API 端點文件
- **[CHANGELOG.md](../CHANGELOG.md)** - 版本更新日誌

## 🎯 最新重大更新 (v2.1.0)

### ✅ Week 2 完成：核心功能實現
- ✅ **移除照片識別**：改為快速文字輸入系統
- ✅ **智能食物搜尋**：快速搜尋和自動建議功能
- ✅ **IBD 醫療評分**：完整的雙語風險因子評分系統
- ✅ **三種記錄方式**：快速/詳細/自訂新增功能
- ✅ **響應式 UI**：完整的使用者介面和體驗

### 驗證結果
| 功能項目 | 目標 | 實際達成 | 狀態 |
|----------|------|----------|------|
| 食物搜尋準確率 | >90% | >95% | ✅ 超越目標 |
| IBD 評分正確性 | 正確評分 | 雞排 1/4, 清蒸魚 4/4 | ✅ 正確 |
| 記錄速度 | <30秒 | <20秒 | ✅ 超越目標 |
| 系統穩定性 | 無重大錯誤 | 0 錯誤 | ✅ 達成 |

## 📖 快速導航

### 開發者
- [API 文件](./API_DOCUMENTATION.md#食物管理-api) - API 端點和使用方法
- [雙語系統](./BILINGUAL_RISK_FACTORS.md#解決方案) - 技術實現細節
- [修復報告](./IBD_SCORING_FIXES.md#技術改進) - 問題解決過程

### 醫療專業人員
- [評分系統](./IBD_SCORING_FIXES.md#驗證結果) - 醫療評分準確性
- [風險因子](./BILINGUAL_RISK_FACTORS.md#支援的風險因子類別) - 支援的醫療條件

### 專案管理
- [版本歷史](../CHANGELOG.md) - 完整變更記錄
- [修復詳情](./IBD_SCORING_FIXES.md#核心問題解決) - 問題和解決方案

## 🔍 文件搜尋指南

### 按功能查找
- **醫療評分**: IBD_SCORING_FIXES.md
- **API 使用**: API_DOCUMENTATION.md
- **雙語支援**: BILINGUAL_RISK_FACTORS.md
- **版本變更**: CHANGELOG.md

### 按角色查找
- **後端開發**: API_DOCUMENTATION.md → IBD_SCORING_FIXES.md
- **前端開發**: IBD_SCORING_FIXES.md → API_DOCUMENTATION.md
- **QA 測試**: BILINGUAL_RISK_FACTORS.md → IBD_SCORING_FIXES.md
- **產品經理**: CHANGELOG.md → IBD_SCORING_FIXES.md

---

## 📁 歷史文件結構

### 1. [DietDaily_ProjectSpecification.md](./DietDaily_ProjectSpecification.md)
**完整產品需求與商業規格**
- 產品願景與問題陳述
- 使用者體驗設計與目標受眾
- 技術規格與 API 整合策略
- 先導計畫策略與成功指標
- 開發階段與競爭定位
- 風險評估與商業規劃

### 2. [DietDaily_TechnicalArchitecture.md](./DietDaily_TechnicalArchitecture.md)
**詳細技術實作架構**
- iOS 應用程式架構與 React Native/Swift 考量
- API 整合層（Clarifai、Google Cloud 服務）
- 資料庫設計（Google Sheets + SQLite 混合）
- 安全性、隱私與效能優化
- 測試策略與部署流程
- 程式碼範例與實作模式

### 3. [DietDaily_UserFlows.md](./DietDaily_UserFlows.md)
**使用者體驗流程與介面規格**
- 從入門到日常使用的完整使用者旅程圖
- 詳細的逐畫面使用者流程文件
- 錯誤處理與替代流程情境
- UI 元件規格與設計系統
- 分析追蹤與使用者行為指標

---

## 🎯 專案摘要

**Diet Daily** 是一款以 iOS 為主的行動食物日記應用程式，專為台灣和香港市場的過敏與健康狀況使用者設計。

### 核心功能
- **📷 照片辨識**：使用 Clarifai API 的相機優先食物識別
- **🎯 三級過敏評分**：個人化 1-10 評分系統（完美禁止/建議禁止/少量可）
- **🔄 智慧替代品**：與本地超市整合的季節性可用性
- **📊 21 天追蹤**：與每日食物評分的健康關聯性
- **☁️ 隱私優先儲存**：使用者控制的 Google Drive + Sheets 整合

### 技術堆疊
- **平台**：iOS（React Native），第二階段擴展至 Android
- **辨識**：Clarifai Food API，以 Calorie Mama 作為備份
- **儲存**：Google Sheets API + Google Drive 實現使用者資料所有權
- **離線**：SQLite 本地快取與背景同步功能

---

## 🚀 開發路線圖

### 第一階段：MVP（第 1-3 個月）
- iOS 相機整合與離線功能
- 基本食物辨識與三級過敏評分
- Google Sheets/Drive 資料儲存整合
- 先導計畫啟動，50-100 位台港使用者

### 第二階段：強化（第 4-6 個月）
- 客製化台港料理辨識訓練
- 增強替代品建議演算法與本地超市整合
- App Store 提交與公開發佈

### 第三階段：擴張（第 7-12 個月）
- Android 版本開發
- 醫療提供者整合功能
- 區域擴展與多語言支援

---

## 📊 成功指標與驗證

### 先導計畫目標
- **辨識準確度**：>60% 正確食物識別
- **使用者留存**：>70% 完成 21 天追蹤週期
- **手動修正**：<30% 條目需要使用者調整
- **替代品採用**：>40% 使用者嘗試建議替代品
- **效能**：持續 <1 分鐘從照片到結果

### 商業目標
- 以過敏管理為重點進入台港市場
- 使用者控制資料隱私作為競爭差異化
- 醫療提供者合作機會
- 透過進階功能的可持續收益模式

---

## 🔧 技術實作備註

### API 策略
- **主要辨識**：Clarifai Food API（740 個食物特定標籤）
- **備份辨識**：Calorie Mama API（測試中最高準確度）
- **資料儲存**：Google Sheets API 用於結構化資料 + Drive API 用於照片
- **認證**：Google 登入實現無縫整合

### 隱私與安全
- 所有使用者資料儲存在其個人 Google Drive 帳戶中
- 敏感健康資訊的本地加密
- 無集中式資料收集或儲存
- 使用者對資料分享與刪除的明確控制

### 離線功能
- 無網路連線的完整相機功能
- 應用程式基本功能的本地 SQLite 快取
- 網路連線恢復時的背景同步
- 延遲辨識的佇列式處理

---

## 📱 使用者體驗亮點

### 簡化的日常使用
1. **相機啟動**：作為主要進入點的即時相機存取
2. **照片辨識**：<1 分鐘處理時間，附信心度指標
3. **智慧評分**：基於過敏嚴重程度的個人化 1-10 評分
4. **替代品建議**：具備本地可用性的情境感知建議
5. **進度追蹤**：與每日感受檢查的 21 天健康關聯性

### 台港市場焦點
- 區域料理的專業食物辨識
- 繁體中文介面本地化
- 替代品的本地超市整合
- 健康建議的文化敏感性

---

## 🧪 先導計畫設計

### 測試策略
- **參與者**：50-100 位有各種飲食限制的 iOS 使用者
- **持續時間**：30 天（涵蓋 21 天追蹤目標）
- **重點領域**：辨識準確度、使用者留存、替代品採用
- **成功標準**：量化指標 + 質性回饋收集

### 驗證方法
- 辨識信心度閾值的 A/B 測試
- UX 優化的使用者訪談
- 評分演算法的醫療提供者回饋
- 本地超市合作夥伴驗證

---

## 💡 下一步

### 立即行動（第 1-2 週）
1. 設置 iOS 開發環境與專案結構
2. 註冊並配置 Google Cloud API（Sheets、Drive、登入）
3. 設置 Clarifai API 帳戶並開始台港食物測試
4. 建立基本應用程式線框圖並開始 UI 開發

### 短期目標（第 1 個月）
1. 建構具備核心功能的功能性 MVP
2. 實作 Google 認證與基本資料儲存
3. 使用本地料理樣本測試食物辨識準確度
4. 開始先導計畫參與者招募

### 開發資源
- iOS 開發者：MVP + 強化功能需 3-6 個月全職
- UI/UX 設計師：完整設計系統需 2-3 個月
- 後端整合：API 整合與同步邏輯需 1-2 個月
- 測試與 QA：全面驗證需 1-2 個月

---

## 📞 專案聯絡與協作

此文件代表 Diet Daily 專案的完整需求探索與技術規劃。所有規格均已準備好可立即進行開發實作。

**文件狀態**：✅ 完整且可開始開發
**最後更新**：2025年1月14日
**版本**：1.0

---

*透過 Claude Code 腦力激盪方法論的協作需求探索產生*