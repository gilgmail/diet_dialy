# HealthKit Integration Testing Guide

完整的 HealthKit 整合測試指南，涵蓋資料庫、API、AI 分析和前端展示。

## 🎯 測試目標

驗證以下整合是否正常運作：
1. **資料庫層**：`health_metrics` 表與 `daily_symptom_entries` 同步
2. **API 層**：HealthKit 同步和摘要 API 端點
3. **AI 分析層**：週報包含健康因子分析
4. **前端層**：報表頁面正確顯示健康數據

---

## 🚀 快速測試

### 方法 1：自動化測試腳本（推薦）

```bash
# 設定環境變數
export DATABASE_URL="your_database_url"
export API_BASE_URL="http://localhost:3000"
export TEST_USER_ID="your_user_id"

# 執行完整測試套件
./scripts/test-healthkit-integration.sh
```

測試腳本會自動檢查：
- ✅ 資料庫結構
- ✅ API 端點功能
- ✅ 資料同步機制
- ✅ 週報生成
- ✅ 前端組件
- ✅ TypeScript 類型

### 方法 2：手動分層測試

按照以下順序逐層測試。

---

## 📊 Layer 1: 資料庫測試

### 1.1 檢查 `health_metrics` 表

```sql
-- 檢查表是否存在
\d health_metrics

-- 查看最近 7 天的健康數據
SELECT
  user_id,
  metric_date,
  metric_type,
  value,
  unit
FROM health_metrics
WHERE metric_date >= NOW() - INTERVAL '7 days'
ORDER BY metric_date DESC, metric_type
LIMIT 20;

-- 統計各類型指標數量
SELECT
  metric_type,
  COUNT(*) as count,
  MIN(metric_date) as earliest_date,
  MAX(metric_date) as latest_date
FROM health_metrics
GROUP BY metric_type
ORDER BY metric_type;
```

**預期結果**：
- 表存在且包含 `steps`, `heart_rate`, `active_calories`, `water_intake`, `stress_score` 等類型
- 如果已經同步過資料，應該能看到記錄

### 1.2 檢查 `daily_symptom_entries` 健康欄位

```sql
-- 檢查健康欄位是否存在
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'daily_symptom_entries'
  AND column_name IN (
    'avg_heart_rate',
    'daily_steps',
    'active_calories',
    'water_intake_ml',
    'stress_score'
  );

-- 查看有健康數據的症狀記錄
SELECT
  user_id,
  recorded_date,
  avg_heart_rate,
  daily_steps,
  active_calories,
  water_intake_ml,
  stress_score
FROM daily_symptom_entries
WHERE recorded_date >= NOW() - INTERVAL '7 days'
  AND (
    avg_heart_rate IS NOT NULL
    OR daily_steps IS NOT NULL
    OR active_calories IS NOT NULL
    OR water_intake_ml IS NOT NULL
    OR stress_score IS NOT NULL
  )
ORDER BY recorded_date DESC
LIMIT 10;
```

**預期結果**：
- 5 個健康欄位都存在且類型為 `numeric` 或 `integer`
- 如果 `health_metrics` 有資料且 trigger 運作正常，這些欄位應該有值

### 1.3 檢查同步 Trigger

```sql
-- 檢查 trigger 是否存在
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_health_metrics_to_symptom_entries';

-- 測試 trigger：插入測試數據
INSERT INTO health_metrics (user_id, metric_date, metric_type, value, unit)
VALUES
  ('test-user-123', CURRENT_DATE, 'steps', 8000, 'count'),
  ('test-user-123', CURRENT_DATE, 'heart_rate', 72, 'bpm')
ON CONFLICT (user_id, metric_date, metric_type)
DO UPDATE SET value = EXCLUDED.value;

-- 檢查是否同步到 daily_symptom_entries
SELECT
  user_id,
  recorded_date,
  daily_steps,
  avg_heart_rate
FROM daily_symptom_entries
WHERE user_id = 'test-user-123' AND recorded_date = CURRENT_DATE;

-- 清理測試數據
DELETE FROM health_metrics WHERE user_id = 'test-user-123';
DELETE FROM daily_symptom_entries WHERE user_id = 'test-user-123';
```

**預期結果**：
- Trigger 存在且綁定在 `health_metrics` 表的 INSERT/UPDATE 事件
- 插入 `health_metrics` 後，`daily_symptom_entries` 自動更新

---

## 🔌 Layer 2: API 測試

### 2.1 測試 HealthKit 同步 API

**端點**：`POST /api/healthkit/sync`

```bash
# 同步測試數據
curl -X POST http://localhost:3000/api/healthkit/sync \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "date": "'$(date +%Y-%m-%d)'",
    "metrics": [
      {
        "type": "steps",
        "value": 8500,
        "unit": "count",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      },
      {
        "type": "heart_rate",
        "value": 72,
        "unit": "bpm",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      },
      {
        "type": "active_calories",
        "value": 350,
        "unit": "kcal",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      },
      {
        "type": "water_intake",
        "value": 2000,
        "unit": "ml",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      },
      {
        "type": "stress_score",
        "value": 5,
        "unit": "score",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      }
    ]
  }' | jq '.'
```

**預期回應**：
```json
{
  "success": true,
  "synced": 5,
  "message": "Successfully synced 5 health metrics"
}
```

### 2.2 測試 HealthKit 摘要 API

**端點**：`GET /api/healthkit/summary`

```bash
# 獲取最近 7 天的健康數據摘要
curl "http://localhost:3000/api/healthkit/summary?userId=demo-user&startDate=$(date -v-7d +%Y-%m-%d)&endDate=$(date +%Y-%m-%d)" | jq '.'
```

**預期回應**：
```json
{
  "success": true,
  "summary": {
    "steps": {
      "average": 8500,
      "min": 5000,
      "max": 12000,
      "coverage": 85.7
    },
    "heartRate": {
      "average": 72,
      "min": 60,
      "max": 85,
      "coverage": 85.7
    },
    "activeCalories": {...},
    "waterIntake": {...},
    "stressScore": {...}
  },
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-07",
    "totalDays": 7,
    "daysWithData": 6
  }
}
```

---

## 🤖 Layer 3: AI 分析測試

### 3.1 生成包含健康數據的週報

```bash
# 生成週報
curl -X POST http://localhost:3000/api/ai/weekly-ibd-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user",
    "startDate": "'$(date -v-7d +%Y-%m-%d)'",
    "endDate": "'$(date +%Y-%m-%d)'",
    "promptStyle": "balanced"
  }' | jq '.'
```

### 3.2 檢查分析結果中的健康指標

```bash
# 獲取最新報表
curl "http://localhost:3000/api/ai/weekly-ibd-analysis?userId=demo-user&limit=1" | jq '.history[0].analysis_data.lifestyleFactors.healthMetrics'
```

**預期結果**：
```json
{
  "overview": {
    "steps": {
      "average": 8500,
      "min": 5000,
      "max": 12000,
      "trend": "improving",
      "coverage": 85.7
    },
    "heartRate": {...},
    "activeCalories": {...},
    "waterIntake": {...},
    "stressScore": {...}
  },
  "correlations": [
    {
      "metric": "daily_steps",
      "metricLabel": "每日步數",
      "ranges": {
        "low": {
          "label": "0-5000 步",
          "avgSymptomScore": 3.2,
          "dayCount": 2
        },
        "medium": {...},
        "high": {...}
      },
      "insight": "步數較高時症狀較輕微，建議維持每日 8000 步以上的活動量",
      "significance": "moderate"
    }
  ],
  "dataQuality": "good",
  "qualityNotes": [
    "資料覆蓋率 85.7%，分析結果具有參考價值"
  ]
}
```

---

## 🎨 Layer 4: 前端測試

### 4.1 檢查週報頁面

1. **開啟報表頁面**：
   ```
   http://localhost:3000/weekly-analysis
   ```

2. **生成新報告**：
   - 點擊「生成報告」按鈕
   - 等待報告生成（約 10-30 秒）

3. **查看完整分析**：
   - 點擊報告卡片上的「📖 查看完整分析」
   - 在模態視窗中查找「💓 健康因子分析」區塊

### 4.2 驗證健康數據展示

**有健康數據時應該顯示**：

1. **健康指標卡片網格** (`HealthMetricsCards`)：
   - 每日步數卡片（顯示平均、範圍、趨勢）
   - 平均心率卡片
   - 活動消耗卡片
   - 飲水量卡片
   - 壓力分數卡片

2. **健康-症狀關聯圖表** (`HealthSymptomCorrelationChart`)：
   - 每個有意義關聯的健康指標顯示一張圖表
   - 雙軸圖表：左軸為症狀分數，右軸為樣本天數
   - X 軸分為低/中/高三個範圍
   - 顯示相關性強度標籤（強/中/弱）

**無健康數據時應該顯示**：
- 提示框：「啟用健康指標追蹤」
- 說明文字：「連接 HealthKit 以追蹤運動、壓力、水分攝取...」
- 連結：「前往設定 HealthKit 同步 →」

### 4.3 響應式測試

測試不同螢幕尺寸的佈局：
- **桌面 (≥1024px)**：健康卡片 3 列網格
- **平板 (768-1023px)**：健康卡片 2 列網格
- **手機 (<768px)**：健康卡片單列堆疊

---

## 🧪 完整端到端測試流程

### 情境：新用戶首次同步健康數據

```bash
# 1. 同步今日健康數據
curl -X POST http://localhost:3000/api/healthkit/sync \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "new-user-123",
    "date": "'$(date +%Y-%m-%d)'",
    "metrics": [
      {"type": "steps", "value": 10000, "unit": "count"},
      {"type": "heart_rate", "value": 75, "unit": "bpm"},
      {"type": "active_calories", "value": 400, "unit": "kcal"},
      {"type": "water_intake", "value": 2500, "unit": "ml"},
      {"type": "stress_score", "value": 6, "unit": "score"}
    ]
  }'

# 2. 等待 2 秒讓 trigger 完成
sleep 2

# 3. 檢查資料庫
psql $DATABASE_URL -c "SELECT recorded_date, daily_steps, avg_heart_rate FROM daily_symptom_entries WHERE user_id = 'new-user-123' ORDER BY recorded_date DESC LIMIT 1;"

# 4. 生成週報（需要至少 3 天數據才有意義的分析）
# 重複步驟 1 數次，改變日期和數值

# 5. 生成 AI 分析
curl -X POST http://localhost:3000/api/ai/weekly-ibd-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "new-user-123",
    "startDate": "'$(date -v-7d +%Y-%m-%d)'",
    "endDate": "'$(date +%Y-%m-%d)'"
  }' | jq '.analysisData.lifestyleFactors.healthMetrics'

# 6. 在瀏覽器中查看
open "http://localhost:3000/weekly-analysis"
```

---

## ✅ 成功標準檢查清單

### 資料庫層
- [ ] `health_metrics` 表存在且結構正確
- [ ] `daily_symptom_entries` 包含 5 個健康欄位
- [ ] Trigger `sync_health_metrics_to_symptom_entries` 存在且運作
- [ ] 插入 `health_metrics` 會自動更新 `daily_symptom_entries`

### API 層
- [ ] POST `/api/healthkit/sync` 回傳 `success: true`
- [ ] GET `/api/healthkit/summary` 回傳正確的統計數據
- [ ] API 錯誤處理正常（測試無效輸入）

### AI 分析層
- [ ] 週報 payload 包含 `lifestyleFactors.healthMetrics`
- [ ] `healthMetrics.overview` 包含各指標統計
- [ ] `healthMetrics.correlations` 包含有意義的關聯分析
- [ ] `dataQuality` 和 `qualityNotes` 正確評估

### 前端層
- [ ] `/weekly-analysis` 頁面載入正常
- [ ] 有健康數據時顯示 `HealthMetricsCards` 組件
- [ ] 有健康數據時顯示 `HealthSymptomCorrelationChart` 組件
- [ ] 無健康數據時顯示「啟用健康指標追蹤」提示
- [ ] 響應式佈局在各螢幕尺寸正常
- [ ] 摺疊/展開功能正常

### 類型安全
- [ ] `npm run typecheck` 無錯誤
- [ ] 所有 TypeScript 類型定義完整

---

## 🐛 常見問題排查

### 問題 1：資料未同步到 `daily_symptom_entries`

**可能原因**：
- Trigger 未正確執行
- `daily_symptom_entries` 該日期的記錄不存在

**排查方法**：
```sql
-- 檢查 trigger 是否存在
SELECT * FROM pg_trigger WHERE tgname = 'sync_health_metrics_to_symptom_entries';

-- 手動執行 trigger 邏輯
INSERT INTO daily_symptom_entries (user_id, recorded_date, recorded_at)
VALUES ('test-user', CURRENT_DATE, NOW())
ON CONFLICT (user_id, recorded_date) DO NOTHING;

-- 再次同步健康數據
```

### 問題 2：週報不包含健康指標

**可能原因**：
- 健康數據不足（< 3 天）
- 資料品質評為 'poor'
- `calculateHealthFactors()` 未正確整合

**排查方法**：
```bash
# 檢查原始症狀記錄是否包含健康欄位
psql $DATABASE_URL -c "SELECT COUNT(*) FROM daily_symptom_entries WHERE user_id = 'demo-user' AND (daily_steps IS NOT NULL OR avg_heart_rate IS NOT NULL) AND recorded_date >= NOW() - INTERVAL '7 days';"

# 檢查 health-metrics-calculator 是否正確匯入
grep "calculateHealthFactors" src/lib/ai/weekly-ibd-analysis.ts
```

### 問題 3：前端不顯示健康組件

**可能原因**：
- 組件檔案不存在
- 路由錯誤
- API 回應結構不符預期

**排查方法**：
```bash
# 檢查組件檔案
ls -la src/components/medical/HealthMetricsCards.tsx
ls -la src/components/medical/charts/HealthSymptomCorrelationChart.tsx

# 檢查前端是否正確匯入
grep "HealthMetricsCards" src/app/weekly-analysis/page.tsx

# 在瀏覽器開發者工具檢查 Network 標籤
# 查看 API 回應是否包含 healthMetrics
```

---

## 📚 相關文件

- [HealthKit Integration Plan](/Users/gilko/.claude/plans/serene-crafting-papert.md)
- [HealthKit Setup Guide](mobile/react-native-starter-kit/DietDailyMobile/HEALTHKIT_SETUP.md)
- [Database Migration](supabase/migrations/20241204_healthkit_integration.sql)
- [API Documentation](src/app/api/healthkit/README.md) *(如果有)*

---

## 🎓 測試最佳實踐

1. **分層測試**：從下往上測試（資料庫 → API → 前端）
2. **測試數據隔離**：使用專用的測試用戶 ID（如 `test-user-xxx`）
3. **清理測試數據**：測試完成後刪除測試記錄
4. **自動化**：使用 `test-healthkit-integration.sh` 腳本進行 CI/CD 整合
5. **監控生產**：設定告警監控健康數據同步失敗

---

## 🚦 快速狀態檢查

```bash
# 一鍵檢查所有層級是否正常
./scripts/test-healthkit-integration.sh

# 或手動檢查關鍵指標
echo "1. Database: $(psql $DATABASE_URL -t -c 'SELECT COUNT(*) FROM health_metrics;') health_metrics records"
echo "2. API: $(curl -s http://localhost:3000/api/healthkit/summary?userId=demo-user | jq -r '.success')"
echo "3. Frontend: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/weekly-analysis)"
```

---

**最後更新**：2024-12-08
**版本**：v1.0
