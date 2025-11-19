# Phase A 藥物紀錄與睡眠運動資料設計

## 背景與目標
- Phase A 要求能紀錄長期療程（口服與針劑）、準時提醒、並追蹤睡眠與運動時間，日後還要串接個人健康資料。
- 主要目標：
  1. **藥物使用**：建立療程設定 + 實際施打/服用事件，支援 28/56 天針劑循環與 PRN 口服藥。
  2. **睡眠 & 運動**：可與早餐打卡一併紀錄，並保留從裝置自動帶入資料的空間。
  3. **提醒與同步**：集中管理提醒規則、健康資料來源狀態與同步紀錄。
  4. **獨立紀錄頁面**：飲食、用藥、運動、睡眠在 iOS App 內各有單純的紀錄畫面，對應 Supabase 單一真實來源，避免重複資料結構。
  5. **飲食/症狀為核心，其餘模組為輔助**：藥物、睡眠、運動維持簡單輸入（主項目 + 時間/頻率），但 schema 預留 `detail_payload` 類欄位以便將來擴充更細節。
  6. **過渡策略**：現階段保留 `food_entries` 供 web/iOS 現有流程使用，同步規劃 `meal_logs` 方案但暫不落地；待實際需求出現再評估是否進行資料遷移。

## 設計準則
- **睡眠以「預計時間 + 時長」為主**：使用者若只輸入預計就寢時間與預計睡眠時長也能完成紀錄；實際開始/結束為進階欄位。
- **運動僅在有紀錄時寫入**：UI 只要求「主要活動」與「花了多久」，其他感測資料（卡路里、心率）為 optional。
- **飲食/症狀是核心流程**：因此保持 `meal_logs` 功能完整，其他表格保持輕量，但透過 `detail_payload` 保留擴充能力。

## 範圍
- Supabase schema（Postgres）新增的表與欄位。
- 將 schema 與實際 user flow（針劑例行/口服臨時、早餐提醒、裝置同步）對應。
- Phase A 僅收斂在資料層與後端 function 所需欄位，不處理畫面稿。

## 資料流程概觀
1. **療程建檔** → 使用者於 App 定義藥品、頻率（28/56 天或 PRN）、開始日期、提醒偏好。
2. **生成提醒與排程** → 所有提醒統一寫入 `user_reminders`（指向療程或健康習慣），並視需要建立週期 (`medication_cycles`)。
3. **實際紀錄** → 每次施打/服用產生 `medication_administrations`，標註是否症狀觸發與依從狀態。
4. **日常健康紀錄** → 使用者透過 Food / Medication / Sleep / Activity 獨立頁面寫入 `meal_logs`、`medication_administrations`、`sleep_sessions`、`activity_sessions`，系統再視需要生成 `daily_wellness_log` 彙總。
5. **裝置同步** → `health_data_sources` 管理授權狀態，資料先進入 staging（HealthKit/GoogleFit）再轉寫正式表，避免重複。

## Schema 設計

### 0. Row Level Security (RLS) 與索引設計

所有使用者資料表均已啟用 RLS 以確保資料隔離與安全性。

#### RLS Policies

**藥物相關表 (medication_regimens / administrations / cycles)**:
- **SELECT**: `auth.uid() = user_id` (直接或透過 JOIN medication_regimens)
- **INSERT/UPDATE/DELETE**: 同上
- 確保使用者只能存取自己的藥物資料，無法查看或修改他人療程

**健康紀錄表 (meal_logs / sleep_sessions / activity_sessions)**:
- **SELECT/INSERT/UPDATE/DELETE**: `auth.uid() = user_id`
- 完全 user-scoped，無跨用戶訪問
- 預留醫療人員訪問權限設計（Phase B）

**提醒表 (user_reminders / reminder_logs)**:
- **SELECT/INSERT/UPDATE/DELETE**: `auth.uid() = user_id`
- 提醒資料完全隔離，確保隱私

**medication_catalog (共用字典)**:
- **SELECT**: 所有已認證使用者可讀
- **INSERT/UPDATE/DELETE**: 僅管理員（透過 service_role）

#### 索引策略

**查詢效能優化索引**:
```sql
-- 提醒頁查詢活躍療程
idx_medication_regimens_user_status ON medication_regimens(user_id, status)

-- 用藥歷史時間排序
idx_medication_admin_regimen_taken ON medication_administrations(regimen_id, taken_at DESC)

-- 計算下次週期
idx_medication_cycles_regimen_status ON medication_cycles(regimen_id, status)

-- 提醒列表分類查詢
idx_user_reminders_user_category ON user_reminders(user_id, reminder_category, status)

-- 睡眠趨勢分析
idx_sleep_sessions_user_date ON sleep_sessions(user_id, start_time DESC)

-- 運動統計彙整
idx_activity_sessions_user_date ON activity_sessions(user_id, start_time DESC)

-- 健康資料去重
idx_sleep_source_dedup ON sleep_sessions(user_id, source, source_record_id)
idx_activity_source_dedup ON activity_sessions(user_id, source, source_record_id)
```

**複合索引設計原則**:
- 高選擇性欄位在前（user_id）
- 篩選條件次之（status, source）
- 排序欄位最後（taken_at DESC, start_time DESC）

### 1. 藥物與療程

#### `medication_catalog`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | 系統產生 |
| `name` | text | 藥品名稱（顯示用） |
| `route` | text | oral / injection / other |
| `is_injection` | boolean | 針劑預設 true |
| `default_interval_days` | int |建議間隔（例：56 天）|
| `default_dosage` | text | 人類可讀，如 “2mg” |
| `notes` | text | 製造商/提醒備註 |
| `created_at/updated_at` | timestamptz |  |

> 未來可擴充成 admin UI 管理的字典；Phase A 可先以常用藥硬寫 seed。

#### `medication_regimens`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK |  |
| `user_id` | uuid FK → `auth.users` | 使用者 |
| `medication_id` | uuid FK → `medication_catalog` |  |
| `custom_name` | text | 使用者自訂名稱 |
| `route` | text | 同 catalog，可覆寫 |
| `frequency_type` | text | every_n_days / prn / cron |
| `interval_days` | int | 28、56…，PRN 可為 NULL |
| `cycle_anchor_date` | date | 第一針或第一顆藥 |
| `symptom_trigger_allowed` | boolean | 是否允許症狀觸發 |
| `default_dose` | text | 例：1 tab |
| `status` | text | active / paused / ended |
| `notes` | text | 醫囑、提醒 |
| `created_at/updated_at` | timestamptz |  |

#### `medication_administrations`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `regimen_id` | uuid FK → `medication_regimens` | |
| `scheduled_at` | timestamptz | 排程時間，可 NULL |
| `taken_at` | timestamptz | 實際時間 |
| `dose` | text | 例：1 tab / 0.5ml |
| `route` | text | 口服/皮下注射… |
| `symptom_triggered` | boolean | 為 true 表示臨時服用 |
| `symptom_notes` | text | 何種症狀觸發 |
| `adherence_status` | text | taken / skipped / delayed |
| `captured_via` | text | manual / reminder / wearable |
| `vitals_snapshot` | jsonb | 可放血壓/體重 |
| `side_effects` | jsonb | 結構化副作用 |
| `detail_payload` | jsonb | 預留更細的輸入欄位（例如注射部位） |
| `notes` | text | 額外描述 |
| `created_at` | timestamptz |  |

> **用藥紀錄頁（MedicationLogScreen）**：iOS 端僅呈現日期、劑量、施打方式、症狀觸發與備註欄位，所有資料直接寫入 `medication_administrations`，不經其他中介表，確保與 Supabase schema 一致。

#### `medication_cycles`
用於追蹤 28/56 日期循環（例：下一針日期）。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `regimen_id` | uuid FK | |
| `cycle_number` | int | 第幾輪 |
| `cycle_start_date` | date | 当前週期開始 |
| `expected_next_date` | date | 系統計算 |
| `actual_next_date` | date | 使用者確認後更新 |
| `provider_notes` | text | 醫師/診所資訊 |
| `status` | text | scheduled / completed |
| `created_at/updated_at` | timestamptz | |


### 2. 飲食 / 睡眠 / 運動紀錄（獨立頁面）

所有紀錄以「單一畫面 → 單一表」為原則，iOS 內的四個頁面（FoodLogScreen、MedicationLogScreen、SleepLogScreen、ActivityLogScreen）直接命中 Supabase 對應表，資料結構完全一致，便於共用提醒與 QA。**目前仍會透過 `food_entries` 提供飲食資料給現有流程，`meal_logs` 作為後續升級方案，兩者需維持同步。**

#### `meal_logs`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `logged_at` | timestamptz | 使用者記錄時間（預設當前） |
| `meal_type` | text | breakfast / lunch / dinner / snack |
| `items` | jsonb | { food_name, portion, unit } 陣列 |
| `is_symptom_triggered` | boolean | 是否因症狀補充營養 |
| `notes` | text | 味道感受、提醒 |
| `photo_urls` | text[] | 供 UI 顯示 |
| `captured_via` | text | ios_manual / wearable / import |
| `analysis_status` | text | pending / completed（食物分析 pipeline 用） |
| `created_at/updated_at` | timestamptz | |

> **FoodLogScreen** 僅呈現時間、餐別、食物項目與備註，新增/編輯都寫入 `meal_logs`。若未填字串亦會自動紀錄當前時間，之後若要做早餐提醒，直接查詢 `meal_type = 'breakfast'`。

> **症狀關聯**：此表作為 App 的核心資料來源，症狀記錄或分析（例如腸胃症狀）會 reference `meal_logs.id`，因此保留完整食物列表與備註欄位。

#### `daily_wellness_log`（選用彙總表）
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `user_id` | uuid FK | PK part |
| `log_date` | date | PK part |
| `breakfast_time` | timestamptz | 從 `meal_logs` breakfast 自动計算 |
| `sleep_quality_score` | int | 1-5 主觀分數（來自 `sleep_sessions`） |
| `energy_level` | int | 1-5（使用者快填） |
| `mood_score` | int | 1-5 |
| `activity_minutes` | int | 聚合 `activity_sessions` |
| `notes` | text | 自由填寫 |
| `captured_via` | text | manual / auto |
| `created_at/updated_at` | timestamptz | |

> 此表可以是 view 或 materialized view，僅提供儀表板彙總；真正的資料輸入仍在各自的紀錄表內。

#### `sleep_sessions`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `source` | text | manual / healthkit / googlefit |
| `source_record_id` | text | 去重用 |
| `start_time` | timestamptz | 實際開始（可為 NULL） |
| `end_time` | timestamptz | 實際結束（可為 NULL） |
| `duration_minutes` | int | 實際時長（缺資料時以預計值帶入） |
| `planned_start_time` | time | 使用者輸入的預計上床時間（搭配 `timezone`） |
| `planned_duration_minutes` | int | 使用者輸入的預計睡眠長度 |
| `is_main_sleep` | boolean | 區分午睡 |
| `quality_score` | int | 1-5 或 null |
| `capture_method` | text | breakfast_form / auto_sync |
| `detail_payload` | jsonb | 更完整資料（例如翻覆次數、心率） |
| `created_at` | timestamptz | |

> **SleepLogScreen** 預設只需輸入「預計就寢時間」與「預計睡多久」兩個欄位，實際開始/結束僅在使用者願意打更細資料時才填；Edge Function 會以預計值生成提醒與儀表板資訊。

#### `activity_sessions`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `activity_type` | text | walk / run / yoga… |
| `activity_title` | text | 使用者自訂主要項目（例：核心訓練） |
| `intensity` | text | low / moderate / high |
| `start_time` | timestamptz | |
| `end_time` | timestamptz | |
| `duration_minutes` | int | |
| `calories` | int | 可選 |
| `steps` | int | 可選 |
| `source` | text | manual / healthkit... |
| `capture_method` | text | breakfast_form / auto_sync |
| `notes` | text | |
| `detail_payload` | jsonb | 預留更多感測數據或分段 |
| `created_at` | timestamptz | |

> **ActivityLogScreen** 只要「做了什麼活動」與「花多久時間」即可送出，其餘強度、卡路里、detail payload 均為選填；沒有填就不會產生紀錄，符合「有記錄才有」的原則。若從裝置匯入則 `source_record_id` 可確保不重複。

### 3. 統一提醒與健康資料來源

#### `user_reminders`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `target_type` | text | medication_regimen / meal_logs / sleep_sessions / activity_sessions |
| `target_id` | uuid | 指向具體資料（例如 regimen_id），若為純習慣提醒可為 NULL |
| `reminder_category` | text | medication / food / sleep / activity |
| `title` | text | iOS 提醒列表顯示文案 |
| `schedule_type` | text | cron / every_n_days / relative_cycle |
| `interval_days` | int | 搭配 every_n_days |
| `window_start` | time | 搭配 `timezone` |
| `window_end` | time | |
| `timezone` | text | IANA |
| `lead_time_minutes` | int | 提前提醒 |
| `snooze_minutes` | int | |
| `auto_dismiss_rule` | text | existing_entry / manual_only |
| `metadata` | jsonb | cron 字串、cycle offset（針劑）、行為設定 |
| `status` | text | active / paused / archived |
| `ios_visible` | boolean | 是否顯示於 iOS 提醒頁 |
| `created_at/updated_at` | timestamptz | |

> iOS App 的「提醒設定」頁直接讀寫 `user_reminders`，因此 SQL schema 與 App UI 共用一套欄位，不需額外表或 view。若是針劑提醒，`target_type = 'medication_regimen'` 並在 `metadata` 存 `cycle_offset_days`；若是早餐提醒則 `target_type = 'meal_logs'` 並在 `auto_dismiss_rule = 'existing_entry'`。

#### `reminder_logs`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `reminder_id` | uuid FK → `user_reminders` | |
| `status` | text | sent / delivered / tapped / dismissed / skipped |
| `deliver_at` | timestamptz | 實際發送 |
| `handled_at` | timestamptz | 使用者互動時間 |
| `context` | jsonb | 包含當時 cycle、預計施打日期等 |
| `created_at` | timestamptz | |

> Edge Function 會在提醒送出與完成紀錄/自動解除時寫入 `reminder_logs`，提供審計與除錯。

#### `health_data_sources`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `provider` | text | apple_healthkit / google_fit / withings |
| `scopes` | text[] | sleep / workout / heart_rate |
| `status` | text | connected / revoked / error |
| `last_synced_at` | timestamptz | |
| `sync_cursor` | jsonb | provider 專屬 cursor |
| `error_payload` | jsonb | 最近錯誤 |
| `created_at/updated_at` | timestamptz | |

#### Staging 表
- `healthkit_sleep_samples`、`healthkit_workouts`：只存 provider record id、原始 payload、解析狀態、對應的 `sleep_session_id` 或 `activity_session_id`。
- 可重用 `source_record_id` 避免重複寫入，亦方便除錯。

## 資料同步與一致性策略

### 4.1 food_entries ↔ meal_logs 同步機制

**過渡期方案（Phase A）**：
- **Source of Truth**: `meal_logs` 為主要資料來源
- **同步方向**: 單向同步 `meal_logs` → `food_entries`
- **同步機制**: Database Trigger 自動執行
- **衝突處理**: meal_logs 修改會完整覆寫對應的 food_entries，反向不同步

**實作邏輯**:
```sql
-- 建立同步 Trigger
CREATE OR REPLACE FUNCTION sync_meal_logs_to_food_entries()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT 時創建對應的 food_entries
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO food_entries (
      user_id, meal_type, consumed_at, foods, notes, created_at
    ) VALUES (
      NEW.user_id,
      NEW.meal_type,
      NEW.logged_at,
      NEW.items::text, -- 轉換 jsonb 為相容格式
      NEW.notes,
      NEW.created_at
    );
    RETURN NEW;

  -- UPDATE 時同步更新
  ELSIF (TG_OP = 'UPDATE') THEN
    UPDATE food_entries SET
      meal_type = NEW.meal_type,
      consumed_at = NEW.logged_at,
      foods = NEW.items::text,
      notes = NEW.notes,
      updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND consumed_at = OLD.logged_at
      AND meal_type = OLD.meal_type;
    RETURN NEW;

  -- DELETE 時刪除對應記錄
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM food_entries
    WHERE user_id = OLD.user_id
      AND consumed_at = OLD.logged_at
      AND meal_type = OLD.meal_type;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_meal_to_food
AFTER INSERT OR UPDATE OR DELETE ON meal_logs
FOR EACH ROW EXECUTE FUNCTION sync_meal_logs_to_food_entries();
```

**資料遷移計畫**:
- Phase A: 雙寫模式，meal_logs 為主，trigger 同步到 food_entries
- Phase B: 逐步淘汰 food_entries 依賴，所有查詢改用 meal_logs
- Phase C: 資料歸檔，將 food_entries 標記為 deprecated

**驗證機制**:
```sql
-- 每日檢查同步一致性
SELECT COUNT(*) as sync_check
FROM meal_logs ml
LEFT JOIN food_entries fe
  ON ml.user_id = fe.user_id
  AND ml.logged_at = fe.consumed_at
WHERE fe.id IS NULL; -- 應為 0
```

### 4.2 提醒計算演算法

#### relative_cycle 模式（針劑長期療程）

**使用場景**: 28 天或 56 天週期性針劑

**計算邏輯**:
```javascript
function calculateNextReminder(regimen, cycle) {
  // 1. 從 medication_cycles 取得預期日期
  const expectedDate = cycle.expected_next_date;

  // 2. 從 user_reminders 取得提醒設定
  const leadTime = reminder.lead_time_minutes || 0;
  const windowStart = reminder.window_start; // e.g., '09:00'
  const timezone = reminder.timezone; // e.g., 'Asia/Taipei'

  // 3. 組合完整提醒時間（使用者時區）
  const reminderDateTime = `${expectedDate} ${windowStart}`;

  // 4. 減去提前提醒時間
  const finalReminderTime = moment.tz(reminderDateTime, timezone)
    .subtract(leadTime, 'minutes')
    .utc(); // 轉為 UTC 儲存

  // 5. 檢查是否在 cycle offset 範圍內
  const cycleOffset = reminder.metadata.cycle_offset_days || 0;
  if (cycleOffset > 0) {
    finalReminderTime.subtract(cycleOffset, 'days');
  }

  return finalReminderTime;
}
```

**metadata 結構範例**:
```json
{
  "cycle_offset_days": 2,
  "reminder_message": "請準備前往診所施打針劑"
}
```

#### every_n_days 模式（口服藥固定間隔）

**使用場景**: 每日或每 N 天口服藥

**計算邏輯**:
```javascript
function calculateDailyReminder(regimen, lastAdministration) {
  // 1. 從上次用藥時間計算
  const lastTaken = lastAdministration
    ? lastAdministration.taken_at
    : regimen.cycle_anchor_date;

  // 2. 加上間隔天數
  const intervalDays = reminder.interval_days || 1;
  let nextDate = moment(lastTaken).add(intervalDays, 'days');

  // 3. 套用時段限制（window_start ~ window_end）
  const windowStart = reminder.window_start; // e.g., '08:00'
  const windowEnd = reminder.window_end;     // e.g., '22:00'
  const timezone = reminder.timezone;

  // 4. 設定提醒時間為 window_start
  nextDate.set({
    hour: parseInt(windowStart.split(':')[0]),
    minute: parseInt(windowStart.split(':')[1]),
    second: 0
  });

  // 5. 轉換時區並返回 UTC
  return moment.tz(nextDate.format('YYYY-MM-DD HH:mm'), timezone).utc();
}
```

#### cron 模式（自訂排程）

**使用場景**: 複雜排程（如每週一三五早上 8 點）

**metadata 結構**:
```json
{
  "cron_expression": "0 8 * * 1,3,5",
  "cron_timezone": "Asia/Taipei"
}
```

**計算邏輯**: 使用 cron-parser 解析並計算下次執行時間

#### auto_dismiss 行為

**觸發條件**:
1. `user_reminders.auto_dismiss_rule = 'existing_entry'`
2. 偵測到對應的紀錄被建立（meal_logs / sleep_sessions / medication_administrations）
3. 紀錄的 `logged_at` / `taken_at` 在提醒的目標日期範圍內（±12 小時）

**執行動作**:
```sql
-- Edge Function: health-log-auto-dismiss
CREATE OR REPLACE FUNCTION auto_dismiss_reminder()
RETURNS TRIGGER AS $$
DECLARE
  target_reminder_id UUID;
BEGIN
  -- 查詢是否有對應的活躍提醒
  SELECT id INTO target_reminder_id
  FROM user_reminders
  WHERE user_id = NEW.user_id
    AND reminder_category = 'food' -- 根據觸發表調整
    AND status = 'active'
    AND auto_dismiss_rule = 'existing_entry'
    AND DATE(NEW.logged_at AT TIME ZONE timezone) = CURRENT_DATE;

  -- 若找到提醒，標記為 auto_dismissed
  IF target_reminder_id IS NOT NULL THEN
    INSERT INTO reminder_logs (
      reminder_id, status, deliver_at, handled_at, context
    ) VALUES (
      target_reminder_id,
      'auto_dismissed',
      NOW(),
      NOW(),
      jsonb_build_object('triggered_by', NEW.id, 'trigger_table', TG_TABLE_NAME)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 應用到各紀錄表
CREATE TRIGGER meal_auto_dismiss
AFTER INSERT ON meal_logs
FOR EACH ROW EXECUTE FUNCTION auto_dismiss_reminder();
```

**iOS 端配合**:
- 監聽 `reminder_logs` 的 realtime 更新
- 收到 `auto_dismissed` 狀態時清除本地通知
- 更新提醒列表 UI 狀態

### 4.3 多來源健康資料去重策略

**優先順序規則**: Last-Write-Wins with Source Priority

**來源優先級**（相同時間範圍內）:
1. **manual** (使用者手動輸入，最高優先)
2. **healthkit** (iOS 官方資料)
3. **googlefit** (Android 官方資料)
4. **wearable** (第三方裝置如 Fitbit, Withings)

**時間重疊定義**:
- 睡眠資料: `start_time` ±15 分鐘內視為同一記錄
- 運動資料: `start_time` ±10 分鐘內視為同一記錄

**去重實作邏輯**:
```sql
-- 建立唯一約束（同來源不可重複）
CREATE UNIQUE INDEX idx_sleep_unique_source_record
ON sleep_sessions(user_id, source, source_record_id)
WHERE source_record_id IS NOT NULL;

-- Upsert 邏輯
CREATE OR REPLACE FUNCTION upsert_sleep_session(
  p_user_id UUID,
  p_source TEXT,
  p_source_record_id TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_duration_minutes INT,
  p_quality_score INT,
  p_detail_payload JSONB
)
RETURNS UUID AS $$
DECLARE
  v_existing_id UUID;
  v_existing_source TEXT;
  v_result_id UUID;
  source_priority_map JSONB := '{"manual": 4, "healthkit": 3, "googlefit": 2, "wearable": 1}';
BEGIN
  -- 1. 檢查是否有相同 source_record_id
  IF p_source_record_id IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM sleep_sessions
    WHERE user_id = p_user_id
      AND source = p_source
      AND source_record_id = p_source_record_id;

    IF v_existing_id IS NOT NULL THEN
      -- 更新現有記錄
      UPDATE sleep_sessions SET
        start_time = p_start_time,
        end_time = p_end_time,
        duration_minutes = p_duration_minutes,
        quality_score = p_quality_score,
        detail_payload = p_detail_payload
      WHERE id = v_existing_id;
      RETURN v_existing_id;
    END IF;
  END IF;

  -- 2. 檢查時間重疊（±15分鐘）
  SELECT id, source INTO v_existing_id, v_existing_source
  FROM sleep_sessions
  WHERE user_id = p_user_id
    AND start_time BETWEEN (p_start_time - INTERVAL '15 minutes')
                       AND (p_start_time + INTERVAL '15 minutes')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- 3. 比較優先級
    IF (source_priority_map->>p_source)::INT > (source_priority_map->>v_existing_source)::INT THEN
      -- 新資料優先級更高，覆蓋舊資料
      UPDATE sleep_sessions SET
        source = p_source,
        source_record_id = p_source_record_id,
        start_time = p_start_time,
        end_time = p_end_time,
        duration_minutes = p_duration_minutes,
        quality_score = p_quality_score,
        detail_payload = p_detail_payload
      WHERE id = v_existing_id;
      RETURN v_existing_id;
    ELSE
      -- 舊資料優先級更高，忽略新資料
      RETURN v_existing_id;
    END IF;
  END IF;

  -- 4. 無重複，插入新記錄
  INSERT INTO sleep_sessions (
    user_id, source, source_record_id, start_time, end_time,
    duration_minutes, quality_score, detail_payload
  ) VALUES (
    p_user_id, p_source, p_source_record_id, p_start_time, p_end_time,
    p_duration_minutes, p_quality_score, p_detail_payload
  ) RETURNING id INTO v_result_id;

  RETURN v_result_id;
END;
$$ LANGUAGE plpgsql;
```

**衝突記錄日誌**:
```sql
-- 建立衝突記錄表（用於分析與除錯）
CREATE TABLE health_data_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  data_type TEXT NOT NULL, -- 'sleep' / 'activity'
  conflict_time TIMESTAMPTZ NOT NULL,
  existing_source TEXT NOT NULL,
  new_source TEXT NOT NULL,
  resolution TEXT NOT NULL, -- 'kept_existing' / 'replaced' / 'ignored'
  existing_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 時區處理統一規範

**儲存原則**:
- **TIMESTAMPTZ 欄位**: 統一以 UTC 儲存（Postgres 自動轉換）
  - 範例: `taken_at`, `start_time`, `end_time`, `logged_at`
- **TIME 欄位 + timezone 文字欄位**: 用於「每日固定時間」提醒
  - 範例: `window_start='08:00'`, `timezone='Asia/Taipei'`
  - 意義: 每天早上 8 點（台北時間）

**查詢轉換**:
```sql
-- Edge Function 查詢時使用 AT TIME ZONE 轉換
SELECT
  taken_at AT TIME ZONE 'Asia/Taipei' as local_time,
  taken_at as utc_time
FROM medication_administrations
WHERE user_id = 'xxx';
```

**前端顯示**:
```javascript
// 使用 moment-timezone 或 date-fns-tz
import { utcToZonedTime, format } from 'date-fns-tz';

const userTimezone = 'Asia/Taipei'; // 從 user profile 或裝置取得
const utcDate = new Date('2025-11-19T02:30:00Z');
const localDate = utcToZonedTime(utcDate, userTimezone);
const displayText = format(localDate, 'yyyy-MM-dd HH:mm', { timeZone: userTimezone });
// 輸出: "2025-11-19 10:30"
```

**提醒觸發邏輯**:
```javascript
// Cron job 以 UTC 運行，轉換到使用者時區後比對
function shouldTriggerReminder(reminder, currentUTC) {
  const userTimezone = reminder.timezone;
  const windowStart = reminder.window_start; // '08:00'

  // 將 UTC 時間轉為使用者本地時間
  const localNow = moment.utc(currentUTC).tz(userTimezone);
  const localHour = localNow.format('HH:mm');

  // 比對是否在提醒時段
  if (localHour >= reminder.window_start && localHour <= reminder.window_end) {
    return true;
  }
  return false;
}
```

**邊界情況處理**:
- **跨日提醒**: window_start='23:00', window_end='01:00' → 需特殊邏輯處理
- **夏令時轉換**: 使用 IANA timezone 資料庫自動處理
- **用戶旅行**: 允許使用者手動調整 timezone，提醒時間跟隨調整

### 4.5 jsonb detail_payload 擴充策略

**版本控制結構**:
```json
{
  "schema_version": "1.0",
  "injection_site": "left_thigh",
  "pain_level": 2,
  "nurse_name": "王護理師"
}
```

**向後相容原則**:
- 新增欄位不影響舊資料讀取
- 查詢時檢查 `schema_version`，適配不同版本
- 不刪除舊欄位，僅標記為 deprecated

**版本遷移範例**:
```sql
-- 批次升級 schema version
UPDATE medication_administrations
SET detail_payload = jsonb_set(
  detail_payload,
  '{schema_version}',
  '"2.0"'
)
WHERE detail_payload->>'schema_version' = '1.0'
  AND detail_payload ? 'old_field_name';
```

**讀取邏輯**:
```typescript
function parseDetailPayload(payload: any) {
  const version = payload.schema_version || '1.0';

  switch(version) {
    case '1.0':
      return {
        injectionSite: payload.injection_site,
        painLevel: payload.pain_level
      };
    case '2.0':
      return {
        injectionSite: payload.injection_site || payload.site, // 相容舊欄位
        painLevel: payload.pain_level,
        nurseName: payload.nurse_name // 新欄位
      };
    default:
      throw new Error(`Unsupported schema version: ${version}`);
  }
}
```

### 4.6 daily_wellness_log Materialized View 策略

**Refresh 策略**:
- **每日全量更新**: 00:00 UTC 執行 `REFRESH MATERIALIZED VIEW`
- **即時查詢觸發**: 查詢當日資料時，若資料過舊則 `REFRESH CONCURRENTLY`
- **新鮮度要求**: 7 日內資料保持高新鮮度（<1 小時延遲），歷史資料允許延遲

**Materialized View 定義**:
```sql
CREATE MATERIALIZED VIEW daily_wellness_log AS
SELECT
  ml.user_id,
  DATE(ml.logged_at AT TIME ZONE u.timezone) as log_date,
  MIN(CASE WHEN ml.meal_type = 'breakfast' THEN ml.logged_at END) as breakfast_time,
  AVG(ss.quality_score)::INT as sleep_quality_score,
  SUM(act.duration_minutes)::INT as activity_minutes,
  NULL::INT as energy_level, -- 需使用者手動輸入
  NULL::INT as mood_score,
  'auto'::TEXT as captured_via,
  NOW() as created_at,
  NOW() as updated_at
FROM diet_daily_users u
LEFT JOIN meal_logs ml ON ml.user_id = u.id
LEFT JOIN sleep_sessions ss ON ss.user_id = u.id
  AND DATE(ss.start_time AT TIME ZONE u.timezone) = DATE(ml.logged_at AT TIME ZONE u.timezone)
LEFT JOIN activity_sessions act ON act.user_id = u.id
  AND DATE(act.start_time AT TIME ZONE u.timezone) = DATE(ml.logged_at AT TIME ZONE u.timezone)
WHERE ml.logged_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY u.id, u.timezone, DATE(ml.logged_at AT TIME ZONE u.timezone);

-- 建立索引加速查詢
CREATE UNIQUE INDEX idx_daily_wellness_user_date
ON daily_wellness_log(user_id, log_date);
```

**定時 Refresh Cron**:
```sql
-- Supabase Edge Function: daily-wellness-refresh
SELECT cron.schedule(
  'refresh-daily-wellness',
  '0 0 * * *', -- 每日 00:00 UTC
  $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_wellness_log;
  $$
);
```

**條件式 Refresh** (查詢時觸發):
```typescript
// API Handler: GET /api/daily-wellness-log
async function getDailyWellness(userId: string, date: string) {
  const result = await supabase
    .from('daily_wellness_log')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', date)
    .single();

  // 若資料不存在或超過 1 小時未更新，觸發 refresh
  if (!result.data ||
      new Date() - new Date(result.data.updated_at) > 3600000) {
    await supabase.rpc('refresh_daily_wellness_for_user', {
      p_user_id: userId,
      p_date: date
    });

    // 重新查詢
    return await supabase
      .from('daily_wellness_log')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', date)
      .single();
  }

  return result;
}
```

## Phase A 實作優先順序
1. **Migration 檔**：依上面順序拆成多支 SQL（建議 `009_medication_base.sql`、`010_sleep_activity.sql`、`011_reminders_health_sources.sql`），並更新 `seed_test_data.sql` 方便 QA。
2. **Supabase Edge Functions**：
   - 產生/更新療程時建立預設 `user_reminders` 與下一次 cycle。
   - 每次 `medication_administration` 寫入後，如與提醒對應則更新 `reminder_logs`。
   - 飲食/睡眠/運動紀錄建立時觸發 auto-dismiss 流程，確保提醒頁狀態與實際紀錄同步。
3. **紀錄頁 API**：
   - 建立 `meal_logs`、`sleep_sessions`、`activity_sessions` 手動寫入端點，供 iOS 四個紀錄頁共用。
   - `daily_wellness_log` 僅提供查詢（或 materialized view refresh）作為儀表板資料。
4. **健康資料同步骨架**：
   - 先實作 `health_data_sources` 狀態（連動 App UI）。
   - 撰寫 cron job (Edge Function / worker) 將 staging 轉正式表。

## 風險與決策記錄

### 已確認決策
- ✅ **健康資料去重策略**: 採用 Last-Write-Wins with Source Priority，優先順序 manual > healthkit > googlefit > wearable（詳見 4.3）
- ✅ **資料同步機制**: meal_logs → food_entries 單向同步，使用 Database Trigger 自動執行（詳見 4.1）
- ✅ **時區處理**: TIMESTAMPTZ 統一 UTC 儲存，TIME + timezone 用於提醒設定（詳見 4.4）
- ✅ **RLS 安全策略**: 所有使用者資料表啟用 RLS，完全 user-scoped 隔離（詳見 0.0）

### 待確認事項
- ⏳ **提醒與通知管線**：現有 push queue 是否可重用？或需新增 job table？需與 infra 討論。
  - **建議**: 使用 Supabase Realtime + Edge Functions 組合，避免額外 infrastructure
- ⏳ **PRN 藥品排程**：是否仍需顯示預設提醒？目前假設 PRN 沒有固定提醒，由症狀觸發記錄即可。
  - **建議**: Phase A 不提供 PRN 提醒，僅允許手動記錄；Phase B 評估需求
- ⏳ **早餐頁面資料模型**：若同日多次填寫，`daily_wellness_log` 是否覆蓋？建議僅保留最新並在 UI 做提醒。
  - **建議**: 允許同日多筆 meal_logs，daily_wellness_log 取 MIN(breakfast_time) 作為代表值
- ⏳ **安全與稽核**：藥物紀錄是否需要 HIPAA 等級稽核？若需要，`medication_administrations` 可能要額外紀錄 who/when 修改。
  - **建議**: Phase A 先實作基本 audit log (reminder_logs)，Phase B 評估 HIPAA 合規需求

### 潛在風險
| 風險 | 影響 | 緩解措施 | 優先級 |
|------|------|----------|--------|
| 提醒計算邏輯複雜度高 | 實作時間延長、Bug 風險 | 詳細文檔化演算法（見 4.2）、單元測試覆蓋 | 🔴 高 |
| 多來源資料衝突頻繁 | 使用者體驗不佳 | 建立衝突記錄表、提供 UI 手動解決機制 | 🟡 中 |
| Trigger 效能影響 | 寫入延遲增加 | 非同步執行、監控 Trigger 執行時間 | 🟡 中 |
| 時區轉換錯誤 | 提醒時間不準確 | 完整測試案例、使用成熟函式庫 | 🔴 高 |
| jsonb schema 演化失控 | 資料不一致、查詢困難 | 版本控制策略（見 4.5）、Migration 腳本 | 🟢 低 |

## 實作進度（2025-11-19 更新）

### Schema & Migration (100% 完成)
- ✅ `supabase/migrations/011_create_medication_tables.sql`
  - ✅ 藥物字典、療程、紀錄與週期表
  - ✅ RLS policies (user-scoped access)
  - ✅ 效能索引 (user_id, status, taken_at 等)
  - ✅ 資料完整性約束 (CHECK, UNIQUE)
- ✅ `supabase/migrations/012_create_health_logging_tables.sql`
  - ✅ meal_logs, sleep_sessions, activity_sessions 完整欄位
  - ✅ RLS policies 與索引
- ✅ `supabase/migrations/013_create_reminders_and_health_sources.sql`
  - ✅ user_reminders 支援多種 schedule_type
  - ✅ health_data_sources 與 staging 表結構
  - ✅ reminder_logs 審計表
- ✅ `supabase/migrations/014_create_sync_triggers.sql` **[新增]**
  - ✅ meal_logs → food_entries 同步 Trigger
  - ✅ auto_dismiss_reminder() 通用函式
  - ✅ updated_at 自動更新 Triggers
  - ✅ meal_sync_check 驗證視圖
- ✅ `supabase/migrations/015_create_helper_functions.sql` **[新增]**
  - ✅ upsert_sleep_session() 去重函式
  - ✅ upsert_activity_session() 去重函式
  - ✅ health_data_conflicts 衝突記錄表
  - ✅ calculate_next_cycle_reminder() 針劑提醒計算
  - ✅ calculate_next_daily_reminder() 口服藥提醒計算
  - ✅ refresh_daily_wellness_for_user() 彙總更新
  - ✅ to_user_timezone() / from_user_timezone() 時區轉換
- ✅ 更新 Type 定義
  - ✅ `src/types/supabase.ts` (Web)
  - ✅ `DietDailyMobile/src/shared/types/supabase.ts` (iOS)

### 資料同步與一致性 (100% 實作)
- ✅ **已實作**: food_entries ↔ meal_logs 同步 Trigger (014 migration)
- ✅ **已實作**: 健康資料去重 upsert_sleep_session() 函式 (015 migration)
- ✅ **已實作**: auto_dismiss_reminder() Trigger (014 migration)
- ✅ **已實作**: refresh_daily_wellness_for_user() 函式 (015 migration)

### Edge Functions (20% 實作)
- ✅ **已實作**: medication-regimen-sync Edge Function
  - ✅ 支援 create/update/pause/resume 操作
  - ✅ 自動建立/更新 medication_cycles
  - ✅ 自動建立/更新 user_reminders
  - ✅ 支援 relative_cycle / every_n_days / cron 三種模式
  - ✅ PRN 藥物自動暫停提醒
- ⏳ **待實作**: medication-reminder-handler Edge Function
- ⏳ **待實作**: health-data-import-worker Edge Function
- ⏳ **待實作**: daily-wellness-refresh Cron Job

### API Route Handlers (0% 實作)
- ⏳ **待實作**: `/api/medications/regimens` (POST, GET, PATCH, DELETE)
- ⏳ **待實作**: `/api/medications/administrations` (POST, GET, PATCH)
- ⏳ **待實作**: `/api/sleep-sessions` (POST, GET, PATCH)
- ⏳ **待實作**: `/api/activity-sessions` (POST, GET, PATCH)
- ⏳ **待實作**: `/api/daily-wellness-log` (GET)

### Seed Data (100% 完成)
- ✅ **已實作**: `supabase/seed_medication_catalog.sql`
  - ✅ 24 種常見 IBD 藥品
  - ✅ 涵蓋生物製劑（5）、免疫調節劑（3）、5-ASA（3）
  - ✅ 類固醇（2）、小分子藥物（3）、症狀緩解（2）
  - ✅ 輔助補充劑（4）、含 PRN 藥物
- ✅ **已實作**: `supabase/seed_phase_a_test_data.sql`
  - ✅ 3 位測試用戶（不同時區與療程類型）
  - ✅ 4 個療程範例（Humira, Pentasa, Entyvio, Imodium PRN）
  - ✅ medication_cycles 與 user_reminders 測試資料
  - ✅ 飲食、睡眠、運動健康紀錄範例
  - ✅ reminder_logs 測試資料

### 整體進度總覽
- **A1 Schema / 種子資料**: 100% 完成 ✅
- **A2 Edge Functions**: 20% 完成（1/4 完成）
- **A3 Database Functions**: 100% 完成 ✅
- **A4 API Gateway**: 0% 完成
- **A5 Mobile / Web UI**: 0% 完成
- **A6 QA & 測試**: 0% 完成

**目前總進度**: ~40% (Schema + Functions + Seed Data 完成)

## 開發拆解與時程（Phase A）

| Workstream | 交付物 | 主要工作 | 依賴 | 預估工時 | 狀態 |
| --- | --- | --- | --- | --- | --- |
| **A1 Schema / 種子資料** | 011–013 migration、medication seed SQL、同步 triggers | ✅ Migration 撰寫<br>✅ RLS policies<br>✅ 索引設計<br>⏳ 同步 Triggers (4.1, 4.2, 4.3)<br>⏳ IBD 藥品 seed<br>⏳ 測試資料 seed | 無 | 3 日<br>(+1 日 triggers) | 75% 完成 |
| **A2 Edge Functions** | medication-regimen-sync<br>medication-reminder-handler<br>health-log-auto-dismiss<br>health-data-import-worker | 建立療程時生成 cycles 與 reminders<br>提醒邏輯計算（見 4.2）<br>auto-dismiss 流程<br>健康資料匯入與去重（見 4.3） | A1 完成 | 4 日<br>(+1 日複雜度) | 0% 完成 |
| **A3 Database Functions** | upsert_sleep_session()<br>upsert_activity_session()<br>refresh_daily_wellness_for_user() | 去重邏輯實作（見 4.3）<br>Materialized view refresh（見 4.6）<br>時區轉換 helpers（見 4.4） | A1 完成 | 2 日 | 0% 完成 |
| **A4 API Gateway** | `/api/medications/*`<br>`/api/sleep-sessions`<br>`/api/activity-sessions`<br>`/api/daily-wellness-log` | Next.js Route Handler<br>呼叫 Edge Functions<br>錯誤處理與驗證<br>批次 upsert 端點 | A2, A3 完成 | 3 日 | 0% 完成 |
| **A5 Mobile / Web UI** | iOS 紀錄頁（4個）<br>Web admin 控制台<br>提醒設定頁 | FoodLogScreen<br>MedicationLogScreen<br>SleepLogScreen<br>ActivityLogScreen<br>ReminderSettingsScreen<br>共用 hooks 與 types | A4 API 完成 | 5 日<br>(+1 日 4 頁面) | 0% 完成 |
| **A6 QA & 測試** | 單元測試<br>E2E 測試<br>資料驗證腳本 | Edge Functions 測試（Deno）<br>API 測試（Jest）<br>Playwright 提醒流程<br>時區邊界測試<br>去重邏輯測試<br>資料同步驗證 | 全部模組完成 | 3 日<br>(+1 日測試案例) | 0% 完成 |

**總計預估**: 20 個工作日（4 週，考慮並行執行與緩衝）

**修正後時程規劃**:
- **Week 1**: A1 完成（Schema + Triggers + Seed）
- **Week 2**: A2 & A3 並行（Edge Functions + Database Functions）
- **Week 3**: A4 & A5 並行（API 開發，Mobile UI 開發）
- **Week 4**: A6 測試 + 整合 + 文件更新

**並行策略**:
- A2 (Edge Functions) 與 A3 (Database Functions) 可並行開發
- A4 (API) 完成後立即啟動 A5 (Mobile UI)
- A6 (QA) 可在各模組完成後逐步進行

**關鍵路徑**: A1 → A2/A3 → A4 → A5 → A6

> **時程調整說明**: 原估計 13 日過於樂觀，實際應為 20 日（4 週）。主要增加工時在：
> 1. 同步 Triggers 實作與測試 (+1 日)
> 2. Edge Functions 提醒邏輯複雜度 (+1 日)
> 3. Mobile UI 四個獨立頁面 (+1 日)
> 4. QA 測試案例覆蓋（時區、去重、同步）(+1 日)

## API 與 Edge Function 實作細節
### REST / Route Handler
- `POST /api/medications/regimens`：驗證 `medication_id | custom_name` + `frequency_type`；呼叫 `supabase.functions.invoke('medication-regimen-sync')` 建立提醒/週期。錯誤需回傳 `REGIMEN_DUPLICATED`、`INVALID_CYCLE_DATE` 等代碼。
- `POST /api/medications/administrations`：支援批次寫入，多筆共 transaction；可選帶 `reminder_id` 以串 `reminder_logs`。
- `POST /api/sleep-sessions`：允許僅提供 `planned_start_time + planned_duration_minutes`，Service 層自動換算預測 `end_time`。若帶 `source_record_id` 則 upsert。
- `POST /api/activity-sessions`：簡易欄位 + optional detail payload。提供 `/bulk` 端點供匯入 staging 後的資料。
- `GET /api/daily-wellness-log?date=`：讀 materialized view，若不存在會觸發 Edge Function 以 `meal_logs`/`sleep_sessions` 聚合後回寫。

### Edge Functions / Workers
1. `medication-regimen-sync`
   - Input：`regimen_id` + `operation` (create/update)
   - Actions：維護 `medication_cycles`、在 `user_reminders` 建立/更新 `schedule_type=relative_cycle` 設定、對 PRN 只同步提醒 metadata。
2. `medication-reminder-handler`
   - 由 `reminder_logs` 觸發（Edge job）。若 reminder 已對應 `medication_administration` 則自動將狀態改為 `dismissed`；若超時 2 小時未有紀錄，發 `skipped`。
3. `health-log-auto-dismiss`
   - 監聽 `meal_logs`/`sleep_sessions`/`activity_sessions` insert，查詢對應 `user_reminders` 並寫 `reminder_logs` + 更新 `auto_dismiss_rule`。
4. `health-data-import-worker`
   - 每小時抓取 staging（HealthKit/Google Fit），利用 `source_record_id` upsert 至正式表，寫 `sync_cursor`。

## 測試與驗證
- **SQL Migration**：使用 `scripts/run-migrations.ts --db-url=$TEST_DB` 自動化測試；加入 `supabase/tests/schema-medication.test.sql` 以檢查 FK、enum 值。
- **Edge Functions**：採用 `supabase/functions/_tests/*.spec.ts`（Deno）模擬事件，覆蓋提醒建立、PRN 行為、auto-dismiss。
- **API**：新增 `tests/api/medication-regimens.test.ts` 等 Jest 測試，mock Supabase client；Playwright scenario 覆蓋「建立療程 → 接收提醒 → 紀錄施打 → 提醒自動完成」。
- **Mobile manual QA**：TestFlight 測試腳本，確保四個紀錄頁能 offline draft + 回寫；檢查 `detail_payload` JSON 正確儲存。
- **資料充足度儀表**：`scripts/verify-phase-a-data.ts` 每日跑 cron，輸出 `daily_wellness_log` coverage 給 Admin dashboard。

## 上線與觀察計畫
1. **Staging 演練**：在 `staging` 專案執行 011–013 migration，利用 seed script 建立 5 位測試用戶，檢查 Edge Functions log。
2. **灰度釋出**：App 設定 feature flag `phase_a_medication_enabled`；先讓 10% 測試者改用新紀錄頁，觀察 3 日。
3. **監控**：在 Grafana 加上 `reminder_logs` 成功率、`health_data_sources` sync 錯誤率面板；每小時檢查兩次。
4. **Roll-back 策略**：若 schema 導致舊 flow 失敗，可透過 view/trigger 將 `meal_logs` 退回 `food_entries`（保留 `insert into food_entries select ...` 腳本），Edge Function 可切回舊版（保留上一版 zip）。
5. **文件與培訓**：完成此文檔 + `README_phase_a.md`，在 FE/BE 站會上 walkthrough；錄製 5 分鐘 Loom 供醫療顧問預覽流程。

## 附件 / 參考
- 相關需求：使用者「2 個月一次針劑」與「症狀才吃口服藥」。
- 現有檔案參考：
  - `supabase/functions/refresh-food-analysis/index.ts`（Edge Function 風格）
  - `supabase/migrations/007_add_bowel_movement_fields.sql`（命名與 migration 結構）
  - `claudedocs/bowel-movement-feature-design.md`（文件格式示例）
