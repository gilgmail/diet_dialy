# Pi Docker 文檔索引

本目錄包含 Raspberry Pi 5 Docker 部署的所有相關文檔。

## 📚 主要文檔

### [README.md](./README.md) ⭐ 必讀
完整的 Pi5 部署指南，整合了所有部署流程、配置說明和故障排除資訊。

**包含內容**:
- ✅ 快速開始
- ✅ 系統需求
- ✅ 完整部署流程
- ✅ 配置說明（Docker、環境變數、網路）
- ✅ 故障排除（常見問題 + 解決方案）
- ✅ 維護操作（日誌、重啟、更新、備份）
- ✅ 性能優化
- ✅ 技術架構圖

**推薦閱讀順序**: 📖 第一份必讀文檔

---

## 🔧 專題文檔

### [HTTPS_PATH_ROUTING_SETUP.md](./HTTPS_PATH_ROUTING_SETUP.md)
HTTPS 與路徑路由設定指南

**涵蓋主題**:
- DDNS (Dynamic DNS) 設定
- 路由器端口轉發配置
- Nginx 反向代理設定
- SSL/TLS 證書配置
- 路徑重寫規則

**適用場景**: 需要從外網訪問 Pi5 服務時

---

### [IOS_DEPLOYMENT_SUMMARY.md](./IOS_DEPLOYMENT_SUMMARY.md)
iOS 應用部署總結

**涵蓋主題**:
- iOS app 構建流程
- 實體設備部署
- TestFlight 配置
- 常見 iOS 部署問題

**適用場景**: 需要部署或更新 iOS app 時

---

### [IOS_APP_HTTPS_TEST_RESULTS.md](./IOS_APP_HTTPS_TEST_RESULTS.md)
iOS 應用 HTTPS 連接測試結果

**涵蓋主題**:
- HTTPS API 連接測試
- iOS 網路安全配置
- ATS (App Transport Security) 設定
- 實際測試結果與效能數據

**適用場景**: 調試 iOS app 網路連接問題時

---

### [UPDATE_PDF_ON_PI5.md](./UPDATE_PDF_ON_PI5.md)
Pi5 PDF 生成功能更新記錄

**涵蓋主題**:
- PDF 生成功能的演進歷史
- 從 HTML → Canvas → 純文字的轉變
- 中文字顯示問題解決方案
- 效能優化記錄

**適用場景**: 了解 PDF 功能開發歷程或解決 PDF 相關問題時

---

## 📂 核心配置檔案

### [Dockerfile](./Dockerfile)
Docker 映像構建定義

**關鍵特性**:
- 多階段構建（deps → builder → runner）
- Build args 支援環境變數注入
- Node.js 18 Alpine 基礎映像
- 針對 ARM64 (Pi5) 優化

---

### [docker-compose.yml](./docker-compose.yml)
Docker Compose 服務編排

**配置內容**:
- Web 服務定義
- 環境變數載入
- 網路配置
- 健康檢查設定
- 卷掛載

---

### [.dockerignore](./.dockerignore)
Docker 構建排除規則

**排除項目**:
- node_modules
- .git
- .next
- 測試檔案
- 文檔檔案
- 開發工具配置

---

### [.env.production.pi](./.env.production.pi)
Pi5 生產環境配置

**包含變數**:
- Supabase 連接資訊
- Anthropic API 金鑰
- 應用配置
- 效能調整參數

⚠️ **注意**: 此檔案包含敏感資訊，不應提交到 Git

---

## 🚀 部署腳本

### [deploy-to-pi.sh](./deploy-to-pi.sh)
主要部署腳本

**功能**:
1. SSH 連接檢查
2. Docker 環境驗證
3. 項目檔案同步（rsync）
4. 環境配置複製
5. Docker 映像構建（包含 build args）
6. 容器啟動
7. 健康檢查
8. 部署結果報告

**使用方式**:
```bash
./deploy-to-pi.sh
```

**相關文檔**: [scripts/README.md](../scripts/README.md)

---

## 📦 存檔文檔

過時或已整合的文檔移至 [archive/](./archive/) 目錄：

- `archive/README.old.md` - 舊版 README
- `archive/DEPLOYMENT.md` - 已整合到新 README
- `archive/QUICK_START.md` - 已整合到新 README
- `archive/TEST_RESULTS.md` - 測試結果記錄（歷史參考）

---

## 📖 閱讀建議

### 初次部署
1. 📖 [README.md](./README.md) - 完整閱讀
2. 🔧 確保 `.env.production.pi` 配置正確
3. 🚀 執行 `./deploy-to-pi.sh`

### 外網訪問設定
1. 📖 [HTTPS_PATH_ROUTING_SETUP.md](./HTTPS_PATH_ROUTING_SETUP.md)
2. 🔧 配置路由器端口轉發
3. 🔧 設定 DDNS
4. 🔧 （可選）配置 Nginx 反向代理

### iOS 應用部署
1. 📖 [IOS_DEPLOYMENT_SUMMARY.md](./IOS_DEPLOYMENT_SUMMARY.md)
2. 📖 [IOS_APP_HTTPS_TEST_RESULTS.md](./IOS_APP_HTTPS_TEST_RESULTS.md)
3. 🚀 執行 iOS 部署腳本

### 問題排查
1. 📖 [README.md - 故障排除](./README.md#故障排除)
2. 🔍 檢查相關專題文檔
3. 📝 查看 [archive/TEST_RESULTS.md](./archive/TEST_RESULTS.md) 中的歷史測試結果

---

## 🆘 獲取幫助

### 快速問題解決

| 問題類型 | 查看文檔 |
|---------|---------|
| 環境變數未載入 | [README.md - 故障排除 #1](./README.md#1-環境變數未載入) |
| package-lock.json 錯誤 | [README.md - 故障排除 #2](./README.md#2-package-lockjson-找不到) |
| 容器名稱衝突 | [README.md - 故障排除 #3](./README.md#3-容器名稱衝突) |
| 健康檢查失敗 | [README.md - 故障排除 #4](./README.md#4-健康檢查失敗) |
| HTTPS 連接問題 | [HTTPS_PATH_ROUTING_SETUP.md](./HTTPS_PATH_ROUTING_SETUP.md) |
| iOS app 連接失敗 | [IOS_APP_HTTPS_TEST_RESULTS.md](./IOS_APP_HTTPS_TEST_RESULTS.md) |
| PDF 顯示問題 | [UPDATE_PDF_ON_PI5.md](./UPDATE_PDF_ON_PI5.md) |

### 聯繫支援

- 📧 提交 GitHub Issue
- 💬 聯繫開發團隊

---

## 📝 文檔維護

### 更新文檔時

1. **主要變更**: 更新 [README.md](./README.md)
2. **專題內容**: 更新對應的專題文檔
3. **歷史記錄**: 重大變更記錄在文檔末尾的「版本歷史」
4. **索引更新**: 如新增文檔，更新本索引

### 文檔品質標準

- ✅ 清晰的標題階層
- ✅ 實用的程式碼範例
- ✅ 完整的故障排除步驟
- ✅ 最後更新日期
- ✅ 相關文檔的交叉引用

---

**最後更新**: 2025-10-29
**維護者**: Development Team
**文檔版本**: 2.0
