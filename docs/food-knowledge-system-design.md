# AI 食物知識庫系統設計與優化方案

## 問題診斷與分析

### 問題 1: iOS App 無法更新 AI 食物資料庫

**現況分析**:
- ✅ UI 已實作: [SettingsScreen.tsx](../mobile/react-native-starter-kit/DietDailyMobile/src/features/settings/screens/SettingsScreen.tsx#L406-L461)
- ✅ API 已實作: `/api/food-knowledge/status`, `/api/food-knowledge/refresh`
- ✅ 自動入隊: Weekly AI Analysis 會自動將 missing/stale foods 加入佇列
- ❌ **根本問題**: Supabase Edge Function 沒有自動執行機制

**技術細節**:
1. Weekly AI Analysis 檢測到 missing/stale foods → 自動加入 `food_analysis_refresh_queue`
2. 用戶在設定頁面看到佇列項目（status = "pending"）
3. Edge Function `refresh-food-analysis` 需要**手動觸發**才會處理佇列
4. 如果沒有觸發，所有項目永遠停留在 "pending" 狀態

### 問題 2: Dashboard 切換機制（舊方法 vs Chunk 方式）

**背景**:
- **舊方法**: Weekly AI Analysis 一次性分析整週資料（單次 API 呼叫）
- **Chunk 方式**: 將分析拆分成多個小任務，漸進式完成

**切換機制設計需求**:
- 用戶可選擇分析模式
- 保留兩種模式並存（向後相容）
- 提供清晰的 UI 說明差異

### 問題 3: Chunk 方式的食物資料庫更新追蹤

**挑戰**:
- Chunk 方式分批處理食物分析
- 需要追蹤每個 chunk 的進度
- 用戶需要知道「哪些食物已更新」、「哪些還在處理中」

### 問題 4: Dashboard UI 優化 - AI 食物知識庫顯示擁擠

**現況**:
- Dashboard 顯示食物知識庫警告 banner
- 資訊密度高，視覺擁擠
- 考慮使用 Tab 分離不同功能

---

## 解決方案設計

## 1️⃣ 修復 iOS App 食物資料庫更新問題

### 方案 A: 定時任務（推薦）

使用 Supabase pg_cron 定期執行 Edge Function：

```sql
-- supabase/migrations/xxx_setup_food_analysis_cron.sql
SELECT cron.schedule(
  'process-food-analysis-queue',
  '*/5 * * * *',  -- 每 5 分鐘執行一次
  $$
  SELECT
    net.http_post(
      url := current_setting('app.supabase_functions_url') || '/refresh-food-analysis',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

**優點**:
- ✅ 完全自動化
- ✅ 無需用戶干預
- ✅ 可靠且可預測

**缺點**:
- ⚠️ 需要 Supabase Pro 方案（pg_cron 功能）

### 方案 B: 用戶觸發 + UI 改進（暫時方案）

改進 iOS App UI，讓用戶可以手動觸發處理：

```typescript
// mobile/.../.../SettingsScreen.tsx

const handleTriggerProcessor = async () => {
  try {
    setKnowledgeLoading(true)

    // 呼叫 Edge Function 處理佇列
    const response = await fetch(
      `${API_BASE}/functions/v1/refresh-food-analysis`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) throw new Error('Failed to trigger processor')

    const result = await response.json()
    Alert.alert(
      '處理完成',
      `已處理 ${result.processed} 項食物分析`
    )

    await loadFoodKnowledgeStatus()
  } catch (error) {
    Alert.alert('錯誤', '無法觸發處理器')
  } finally {
    setKnowledgeLoading(false)
  }
}
```

**UI 改進**:
```tsx
<TouchableOpacity
  style={styles.processorButton}
  onPress={handleTriggerProcessor}
>
  <Icon name="play-circle" size={20} color="#FFFFFF" />
  <Text style={styles.processorButtonText}>立即處理佇列</Text>
</TouchableOpacity>
```

**優點**:
- ✅ 不需要額外基礎設施
- ✅ 用戶有控制感
- ✅ 快速實作

**缺點**:
- ❌ 需要用戶手動操作
- ❌ 可能被遺忘

### 方案 C: 混合方式（最佳）

結合 A + B：
1. 設定 pg_cron 每小時執行一次（降低頻率節省成本）
2. 提供手動觸發按鈕給急需的用戶
3. 在 UI 顯示「自動處理將在 X 分鐘後執行」

---

## 2️⃣ Dashboard 分析模式切換設計

### 架構設計

```typescript
// src/types/analysis-mode.ts
export type AnalysisMode = 'full' | 'chunked'

export interface AnalysisConfig {
  mode: AnalysisMode
  chunkSize?: number  // chunked 模式的批次大小
  autoRefresh?: boolean
}
```

### API 擴展

```typescript
// src/app/api/ai/weekly-ibd-analysis/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()
  const mode = body.mode ?? 'full'  // 預設使用完整模式

  if (mode === 'chunked') {
    return handleChunkedAnalysis(body)
  }

  return handleFullAnalysis(body)
}

async function handleChunkedAnalysis(body: any) {
  // 實作 chunk 分析邏輯
  const chunks = createAnalysisChunks(body.foodIds, body.chunkSize ?? 10)

  // 建立 job 追蹤
  const jobId = await createAnalysisJob({
    userId: body.userId,
    mode: 'chunked',
    totalChunks: chunks.length,
    status: 'in_progress'
  })

  // 非同步處理每個 chunk
  processChunksAsync(jobId, chunks)

  return NextResponse.json({
    success: true,
    jobId,
    totalChunks: chunks.length,
    estimatedTime: chunks.length * 30 // 秒
  })
}

---

## 3️⃣ 食物分析結果呈現（iOS / Web）

### 資料來源總覽
| 資料 | 來源表/檔 | 用途 |
|------|-----------|------|
| 最新食物分析 | `food_analysis_cache` | 顯示每個 `food_id` 的營養/風險摘要 |
| 待處理佇列 | `food_analysis_refresh_queue` | 呈現缺資料或過期的食物，供用戶追蹤 |
| 週報歷史 | Storage bucket `ai-weekly-reports` | Dashboard 歷史報告、PDF/JSON 下載來源 |

### iOS / Dashboard 呈現方案
1. **Dashboard history 卡片**  
   - 已加上 `analysisVersion`、`analysisMode` 顯示。  
   - 可額外顯示「本週主要食物分析（來自 `analysis.foods_to_monitor`）」的摘要。

2. **Settings → AI 食物知識庫區塊**  
   - 透過 `/api/food-knowledge/status` 顯示 queue 內容（food 名稱、reason、狀態）。  
   - 「立即刷新」按鈕呼叫 `/api/food-knowledge/refresh` + Edge Function，使用者可立刻看到結果。

3. **Web Admin / Internal Tool**（建議新增簡易頁面）  
   - `/admin/food-knowledge`：查詢 `food_analysis_cache`，列表顯示 `food_name`、`analysis_version`、`analysis_updated_at`、`risk_profile`。  
   - 佇列檢視：顯示 `food_analysis_refresh_queue` 的 pending / failed 項目，可手動重試或調整 priority。

### API 端點一覽
| 功能 | Method | URL | 備註 |
|------|--------|-----|------|
| 讀取快取狀態 | GET | `/api/food-knowledge/status?userId=...` | 回傳 summary + queue items |
| 手動刷新 | POST | `/api/food-knowledge/refresh` | body `{ userId, foodIds[], reason }` |
| Edge Function | POST | `https://<project>.functions.supabase.co/refresh-food-analysis` | 處理佇列、更新 cache |
| 週報 JSON | GET | `/api/ai/weekly-ibd-analysis/<reportId>/json` | 來自 Storage，含完整分析內容 |

### 驗證步驟
1. 執行 `supabase/seed_test_data_v2.sql` 建立測試食物與 queue 項目。  
2. 打 `GET /api/food-knowledge/status?userId=<測試用戶>`，確認 queue 顯示 missing/stale 食物。  
3. 在 Settings → AI 食物知識庫中刷新列表，確定 UI 能看到同樣資料；操作「立即刷新」後 queue 狀態更新。  
4. 手動或自動觸發 Edge Function，確認 `food_analysis_cache.analysis_updated_at` 變更，Dashboard history 新報告會標註分析版本與方式。***
```

### 資料庫 Schema

```sql
-- supabase/migrations/xxx_add_analysis_jobs.sql
CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  mode TEXT NOT NULL CHECK (mode IN ('full', 'chunked')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  total_chunks INTEGER,
  completed_chunks INTEGER DEFAULT 0,
  results JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_analysis_jobs_user_status
  ON analysis_jobs(user_id, status, created_at DESC);
```

### Dashboard UI 設計

#### Web Dashboard

```tsx
// src/app/dashboard/page.tsx
export default function DashboardPage() {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('full')

  return (
    <div className="space-y-6">
      {/* 分析模式選擇器 */}
      <Card>
        <CardHeader>
          <CardTitle>分析設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="full"
                checked={analysisMode === 'full'}
                onChange={(e) => setAnalysisMode(e.target.value as AnalysisMode)}
              />
              <div>
                <div className="font-medium">完整分析</div>
                <div className="text-sm text-gray-500">
                  一次性分析整週資料（約 2-3 分鐘）
                </div>
              </div>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="chunked"
                checked={analysisMode === 'chunked'}
                onChange={(e) => setAnalysisMode(e.target.value as AnalysisMode)}
              />
              <div>
                <div className="font-medium">分批分析</div>
                <div className="text-sm text-gray-500">
                  漸進式分析，可即時查看部分結果
                </div>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 其他內容 */}
    </div>
  )
}
```

#### iOS App

```tsx
// mobile/.../DashboardScreen.tsx
const AnalysisModeSelector = () => {
  const [mode, setMode] = useState<'full' | 'chunked'>('full')

  return (
    <View style={styles.modeSelector}>
      <Text style={styles.modeSelectorTitle}>分析模式</Text>
      <View style={styles.modeOptions}>
        <TouchableOpacity
          style={[
            styles.modeOption,
            mode === 'full' && styles.modeOptionActive
          ]}
          onPress={() => setMode('full')}
        >
          <Icon name="flash" size={20} />
          <Text>完整分析</Text>
          <Text style={styles.modeHint}>2-3 分鐘</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeOption,
            mode === 'chunked' && styles.modeOptionActive
          ]}
          onPress={() => setMode('chunked')}
        >
          <Icon name="layers" size={20} />
          <Text>分批分析</Text>
          <Text style={styles.modeHint}>漸進式</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

---

## 3️⃣ Chunk 方式的食物資料庫更新追蹤

### 追蹤機制設計

```typescript
// src/lib/ai/chunked-analysis-tracker.ts
export class ChunkedAnalysisTracker {
  async trackChunkProgress(jobId: string, chunkId: string, foods: string[]) {
    // 記錄每個 chunk 處理的食物
    await this.db.from('analysis_chunk_progress').insert({
      job_id: jobId,
      chunk_id: chunkId,
      food_ids: foods,
      status: 'processing',
      started_at: new Date().toISOString()
    })
  }

  async updateChunkStatus(
    chunkId: string,
    status: 'completed' | 'failed',
    results?: any
  ) {
    await this.db
      .from('analysis_chunk_progress')
      .update({
        status,
        results,
        completed_at: new Date().toISOString()
      })
      .eq('chunk_id', chunkId)
  }

  async getJobProgress(jobId: string) {
    const { data } = await this.db
      .from('analysis_chunk_progress')
      .select('*')
      .eq('job_id', jobId)

    const total = data?.length ?? 0
    const completed = data?.filter(c => c.status === 'completed').length ?? 0
    const failed = data?.filter(c => c.status === 'failed').length ?? 0

    return {
      total,
      completed,
      failed,
      inProgress: total - completed - failed,
      percentage: total > 0 ? (completed / total) * 100 : 0,
      chunks: data
    }
  }
}
```

### Schema

```sql
-- supabase/migrations/xxx_add_chunk_progress.sql
CREATE TABLE IF NOT EXISTS analysis_chunk_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  chunk_id TEXT NOT NULL,
  food_ids TEXT[] NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  results JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chunk_progress_job
  ON analysis_chunk_progress(job_id, status);
```

### UI 顯示

```tsx
// 進度顯示組件
const ChunkedAnalysisProgress = ({ jobId }: { jobId: string }) => {
  const { data: progress } = useChunkProgress(jobId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>分析進度</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={progress?.percentage ?? 0} />
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500">已完成</div>
            <div className="text-2xl font-bold text-green-600">
              {progress?.completed ?? 0}
            </div>
          </div>
          <div>
            <div className="text-gray-500">處理中</div>
            <div className="text-2xl font-bold text-blue-600">
              {progress?.inProgress ?? 0}
            </div>
          </div>
          <div>
            <div className="text-gray-500">失敗</div>
            <div className="text-2xl font-bold text-red-600">
              {progress?.failed ?? 0}
            </div>
          </div>
        </div>

        {/* 食物列表 */}
        <div className="mt-4 space-y-2">
          <h4 className="font-medium">已分析食物</h4>
          {progress?.chunks
            ?.filter(c => c.status === 'completed')
            .flatMap(c => c.food_ids)
            .map((foodId) => (
              <div key={foodId} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>{foodId}</span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 4️⃣ Dashboard UI 優化 - Tab 設計

### 設計原則

- 將 Dashboard 分成多個 Tab，降低單一頁面資訊密度
- 保持核心指標在主 Tab
- 將進階功能（AI 食物知識庫、詳細分析）移到專屬 Tab

### Tab 結構設計

```
┌─────────────────────────────────────┐
│  Dashboard                          │
├─────────────────────────────────────┤
│  [概覽] [AI 分析] [食物知識庫] [設定]│
└─────────────────────────────────────┘
```

### Web Dashboard 實作

```tsx
// src/app/dashboard/page.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <Activity className="w-4 h-4 mr-2" />
            概覽
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <TrendingUp className="w-4 h-4 mr-2" />
            AI 分析
          </TabsTrigger>
          <TabsTrigger value="food-knowledge">
            <Database className="w-4 h-4 mr-2" />
            食物知識庫
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            設定
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: 概覽 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="今日飲食記錄" value={stats.todayFoodEntries} />
            <StatCard title="本週記錄" value={stats.weekTotalEntries} />
            <StatCard title="症狀追蹤" value={stats.weekSymptomEntries} />
            <StatCard title="分析報告" value={analysisHistory?.length ?? 0} />
          </div>

          {/* 近期活動 */}
          <Card>
            <CardHeader>
              <CardTitle>近期活動</CardTitle>
            </CardHeader>
            <CardContent>
              {/* 活動列表 */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: AI 分析 */}
        <TabsContent value="analysis" className="space-y-6">
          {/* 分析模式選擇器 */}
          <AnalysisModeSelector />

          {/* 分析歷史 */}
          <AnalysisHistoryList />

          {/* 觸發新分析 */}
          <Button onClick={handleTriggerAnalysis}>
            開始新分析
          </Button>
        </TabsContent>

        {/* Tab 3: 食物知識庫 */}
        <TabsContent value="food-knowledge" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI 食物知識庫狀態</CardTitle>
              <CardDescription>
                追蹤食物分析快取的更新狀態
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 統計概覽 */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard
                  title="待建立"
                  value={knowledgeStatus?.missingCount ?? 0}
                  variant="warning"
                />
                <StatCard
                  title="需更新"
                  value={knowledgeStatus?.staleCount ?? 0}
                  variant="info"
                />
                <StatCard
                  title="處理中"
                  value={knowledgeStatus?.inProgressCount ?? 0}
                  variant="processing"
                />
              </div>

              {/* 佇列項目列表 */}
              <FoodKnowledgeQueueList items={knowledgeStatus?.items ?? []} />

              {/* 操作按鈕 */}
              <div className="flex gap-2">
                <Button onClick={handleRefreshQueue}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新整理狀態
                </Button>
                <Button onClick={handleTriggerProcessor} variant="secondary">
                  <Play className="w-4 h-4 mr-2" />
                  立即處理佇列
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: 設定 */}
        <TabsContent value="settings" className="space-y-6">
          <AIModelSelector />
          <NotificationSettings />
          <DataManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### iOS App Tab 實作

```tsx
// mobile/.../DashboardScreen.tsx
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'

const Tab = createMaterialTopTabNavigator()

export function DashboardScreen() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarIndicatorStyle: {
          backgroundColor: colors.primary[500]
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600'
        },
        tabBarStyle: {
          backgroundColor: colors.background
        }
      }}
    >
      <Tab.Screen
        name="Overview"
        component={OverviewTab}
        options={{ title: '概覽' }}
      />
      <Tab.Screen
        name="Analysis"
        component={AnalysisTab}
        options={{ title: 'AI 分析' }}
      />
      <Tab.Screen
        name="FoodKnowledge"
        component={FoodKnowledgeTab}
        options={{ title: '食物知識' }}
      />
    </Tab.Navigator>
  )
}

// 各個 Tab 組件
const OverviewTab = () => (
  <ScrollView style={styles.tabContainer}>
    <StatCards />
    <RecentActivities />
  </ScrollView>
)

const AnalysisTab = () => (
  <ScrollView style={styles.tabContainer}>
    <AnalysisModeSelector />
    <AnalysisHistoryList />
    <TriggerAnalysisButton />
  </ScrollView>
)

const FoodKnowledgeTab = () => (
  <ScrollView style={styles.tabContainer}>
    <FoodKnowledgeStatus />
    <QueueProgressView />
    <ActionButtons />
  </ScrollView>
)
```

---

## 實作優先級建議

### Phase 1: 立即修復（1-2 天）
1. ✅ **修復食物資料庫更新問題**
   - 實作方案 B（用戶手動觸發）
   - 改進 iOS UI 說明
   - 文件化操作流程

### Phase 2: 短期改進（1 週）
2. ✅ **Dashboard Tab 重構**
   - Web Dashboard 加入 Tabs
   - iOS App 使用 Tab Navigator
   - 移動食物知識庫到專屬 Tab

### Phase 3: 中期功能（2-3 週）
3. ✅ **Chunk 分析模式**
   - 實作 analysis_jobs 和 chunk_progress 表
   - 開發 chunked analysis API
   - 實作進度追蹤 UI

4. ✅ **自動化處理**
   - 設定 pg_cron 定時任務
   - 或實作外部 cron job

### Phase 4: 長期優化（1-2 個月）
5. ✅ **監控和告警**
   - 佇列處理失敗告警
   - 處理時間監控
   - 自動重試機制

6. ✅ **效能優化**
   - Chunk 大小動態調整
   - 並行處理多個 chunks
   - 快取策略優化

---

## 監控指標

### 關鍵指標

1. **佇列健康度**
   - Pending 項目數量
   - 平均處理時間
   - 失敗率

2. **用戶體驗**
   - 從檢測到完成的平均時間
   - 手動觸發次數
   - Tab 使用分佈

3. **系統效能**
   - API 回應時間
   - Edge Function 執行時間
   - Database query 效能

### Dashboard 監控查詢

```sql
-- 佇列狀態概覽
SELECT
  status,
  reason,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_seconds
FROM food_analysis_refresh_queue
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status, reason;

-- 失敗項目分析
SELECT
  food_id,
  failure_reason,
  attempts,
  updated_at
FROM food_analysis_refresh_queue
WHERE status = 'failed'
ORDER BY updated_at DESC
LIMIT 10;

-- Chunk 分析效能
SELECT
  DATE(created_at) as date,
  mode,
  COUNT(*) as total_jobs,
  AVG(completed_chunks::float / NULLIF(total_chunks, 0)) as avg_completion_rate,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
FROM analysis_jobs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), mode
ORDER BY date DESC;
```

---

## 總結

### 問題 1 解決方案
- **短期**: 提供手動觸發按鈕 + UI 說明
- **長期**: 設定 pg_cron 自動處理

### 問題 2 解決方案
- 實作雙模式支援（full + chunked）
- 提供清晰的 UI 選擇器
- 保持向後相容

### 問題 3 解決方案
- 使用 job + chunk_progress 表追蹤
- 提供即時進度 UI
- 詳細的食物級別追蹤

### 問題 4 解決方案
- 使用 Tab 分離功能
- 降低單一頁面資訊密度
- 改善用戶體驗和導航

所有方案均已考慮：
- ✅ 技術可行性
- ✅ 用戶體驗
- ✅ 系統效能
- ✅ 可維護性
- ✅ 漸進式實作
