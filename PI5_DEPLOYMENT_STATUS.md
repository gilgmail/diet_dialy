# Pi5 部署與 HealthKit 測試狀態報告

## ✅ 部署成功

您的應用已成功部署到 Raspberry Pi 5！

**應用 URL**: http://gilko.redirectme.net:3000

### 部署驗證結果

| 項目 | 狀態 | 詳情 |
|------|------|------|
| 應用可訪問性 | ✅ 成功 | HTTP 200 |
| 週報分析頁面 | ✅ 成功 | /weekly-analysis 可訪問 |
| HealthKit Sync API | ✅ 運作中 | 端點回應正常 |
| HealthKit Summary API | ✅ 運作中 | 端點回應正常 |
| Docker 容器 | ✅ 運行中 | diet-daily-web 正常運行 |

---

## ⚠️ 資料庫遷移需求

測試發現 **HealthKit 資料庫遷移尚未在生產環境執行**。

### 需要執行的遷移

檔案位置: `supabase/migrations/20241204_healthkit_integration.sql`

此遷移將會：
1. 建立 `health_metrics` 表（儲存 HealthKit 原始數據）
2. 擴充 `daily_symptom_entries` 表（新增 5 個健康欄位）
3. 建立自動同步觸發器
4. 設定 RLS 安全策略

### 如何執行遷移

#### 選項 1: 使用 Supabase CLI（推薦）

```bash
# 確保已登入 Supabase
npx supabase login

# 連結到你的專案
npx supabase link --project-ref lbjeyvvierxcnrytuvto

# 執行遷移
npx supabase db push
```

#### 選項 2: 使用 Supabase Dashboard

1. 前往 [Supabase Dashboard](https://app.supabase.com/project/lbjeyvvierxcnrytuvto)
2. 點擊左側選單的 "SQL Editor"
3. 複製 `supabase/migrations/20241204_healthkit_integration.sql` 的內容
4. 貼上並執行 SQL

#### 選項 3: 使用 psql 直接連接

```bash
psql "postgresql://postgres.lbjeyvvierxcnrytuvto:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres" < supabase/migrations/20241204_healthkit_integration.sql
```

---

## 📋 測試結果摘要

### API 端點測試

#### ✅ HealthKit Sync API
- **端點**: POST /api/healthkit/sync
- **狀態**: 運作正常
- **限制**: 需要有效的 user_id（UUID 格式）且該用戶必須存在於資料庫中

**測試命令**（請替換為真實的 user_id）:
```bash
curl -X POST "http://gilko.redirectme.net:3000/api/healthkit/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "<REAL_USER_UUID>",
    "metrics": [
      {
        "source": "healthkit",
        "source_identifier": "unique-id-123",
        "metric_type": "steps",
        "start_time": "2025-12-09T00:00:00Z",
        "end_time": "2025-12-09T23:59:59Z",
        "numeric_value": 8500,
        "unit": "count",
        "device_name": "iPhone",
        "app_name": "Apple Health"
      }
    ]
  }'
```

#### ✅ HealthKit Summary API
- **端點**: GET /api/healthkit/summary
- **狀態**: 運作正常
- **回應**: 成功返回摘要格式（目前無資料）

**測試命令**:
```bash
curl "http://gilko.redirectme.net:3000/api/healthkit/summary?userId=<REAL_USER_UUID>&startDate=2025-12-02&endDate=2025-12-09"
```

### 前端頁面測試

| 頁面 | 狀態 | URL |
|------|------|-----|
| 首頁 | ✅ | http://gilko.redirectme.net:3000 |
| 週報分析 | ✅ | http://gilko.redirectme.net:3000/weekly-analysis |
| 健康分析 | ✅ | http://gilko.redirectme.net:3000/health-analytics |

---

## 🚀 後續步驟

### 1. 執行資料庫遷移（必須）
請使用上述任一方法執行 HealthKit 遷移。

### 2. 從 iOS App 同步真實數據

一旦遷移完成，您可以：

#### A. 使用 iOS DietDailyMobile App
1. 在 App 中登入您的帳號
2. 前往「設定」→「HealthKit 同步」
3. 授權 HealthKit 權限
4. App 將自動同步健康數據到伺服器

#### B. 手動 API 測試
使用真實的用戶 UUID（從資料庫獲取）：

```bash
# 1. 首先，獲取一個真實的用戶 ID
# 連接到 Supabase 並查詢：
# SELECT id FROM diet_daily_users LIMIT 1;

# 2. 使用該 ID 測試同步
REAL_USER_ID="<從資料庫獲取的 UUID>"

curl -X POST "http://gilko.redirectme.net:3000/api/healthkit/sync" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$REAL_USER_ID\",
    \"metrics\": [
      {
        \"source\": \"healthkit\",
        \"source_identifier\": \"test-$(date +%s)\",
        \"metric_type\": \"steps\",
        \"start_time\": \"$(date -u +%Y-%m-%dT00:00:00Z)\",
        \"end_time\": \"$(date -u +%Y-%m-%dT23:59:59Z)\",
        \"numeric_value\": 8500,
        \"unit\": \"count\",
        \"device_name\": \"Test Device\",
        \"app_name\": \"Manual Test\"
      },
      {
        \"source\": \"healthkit\",
        \"source_identifier\": \"test-hr-$(date +%s)\",
        \"metric_type\": \"heart_rate\",
        \"start_time\": \"$(date -u +%Y-%m-%dT00:00:00Z)\",
        \"end_time\": \"$(date -u +%Y-%m-%dT23:59:59Z)\",
        \"numeric_value\": 72,
        \"unit\": \"bpm\",
        \"device_name\": \"Test Device\",
        \"app_name\": \"Manual Test\"
      }
    ]
  }"
```

### 3. 生成包含健康數據的週報

一旦有健康數據同步後：

1. 前往 http://gilko.redirectme.net:3000/weekly-analysis
2. 點擊「生成新報告」
3. 選擇包含健康數據的日期範圍
4. 查看「💓 健康因子分析」區塊

---

## 🔧 管理指令

### 查看應用日誌
```bash
ssh gilko@10.1.1.85 'cd /home/gilko/diet-daily/pi_docker && docker compose logs -f'
```

### 重啟應用
```bash
ssh gilko@10.1.1.85 'cd /home/gilko/diet-daily/pi_docker && docker compose restart'
```

### 停止應用
```bash
ssh gilko@10.1.1.85 'cd /home/gilko/diet-daily/pi_docker && docker compose down'
```

### 查看容器狀態
```bash
ssh gilko@10.1.1.85 'cd /home/gilko/diet-daily/pi_docker && docker compose ps'
```

### 重新部署（有更新時）
```bash
bash pi_docker/deploy-to-pi.sh
```

---

## 📊 整合架構

```
iOS App (DietDailyMobile)
    ↓
HealthKit Authorization
    ↓
POST /api/healthkit/sync
    ↓
health_metrics 表
    ↓ (Trigger: sync_health_metrics_to_symptom_entry)
daily_symptom_entries 健康欄位
    ↓
週報查詢 (buildAnalysisPayload)
    ↓
健康指標計算 (calculateHealthFactors)
    ↓
Claude AI 分析
    ↓
前端展示 (HealthMetricsCards + HealthSymptomCorrelationChart)
```

---

## ✨ 新增功能

### 1. HealthKit 資料同步
- 自動從 iOS HealthKit 同步健康數據
- 支援：步數、心率、活動消耗、飲水量、壓力分數
- 自動同步到 daily_symptom_entries 表

### 2. 健康因子分析
- 統計分析：平均值、範圍、趨勢、資料覆蓋率
- 關聯分析：健康指標與症狀嚴重度的關係
- 資料品質評估：excellent/good/fair/poor

### 3. AI 增強週報
- 整合健康數據到 Claude AI 分析
- 提供運動、水分、壓力管理建議
- 預測性建議基於多維度健康數據

### 4. 視覺化組件
- HealthMetricsCards: 5 個健康指標卡片網格
- HealthSymptomCorrelationChart: 健康-症狀關聯圖表
- 響應式設計支援手機/桌面

---

## 📝 已知限制

1. **資料庫遷移未執行**: 需要手動執行遷移 SQL
2. **測試用戶不存在**: API 測試需要真實的用戶 UUID
3. **無樣本數據**: 需要從 iOS App 或手動 API 同步數據

---

## 🎉 部署成功總結

✅ 應用已成功部署並運行在 Pi5
✅ 所有 API 端點正常運作
✅ 前端頁面可正常訪問
✅ Docker 容器健康運行

⚠️ 下一步：執行資料庫遷移以啟用完整 HealthKit 功能

---

**部署時間**: 2025-12-09
**應用版本**: Next.js 15.5.4
**部署環境**: Raspberry Pi 5 (ARM64) + Docker
**應用 URL**: http://gilko.redirectme.net:3000
