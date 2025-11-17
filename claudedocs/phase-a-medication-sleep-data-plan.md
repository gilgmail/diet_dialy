# Phase A 藥物紀錄與睡眠運動資料設計

## 背景與目標
- Phase A 要求能紀錄長期療程（口服與針劑）、準時提醒、並追蹤睡眠與運動時間，日後還要串接個人健康資料。
- 主要目標：
  1. **藥物使用**：建立療程設定 + 實際施打/服用事件，支援 28/56 天針劑循環與 PRN 口服藥。
  2. **睡眠 & 運動**：可與早餐打卡一併紀錄，並保留從裝置自動帶入資料的空間。
  3. **提醒與同步**：集中管理提醒規則、健康資料來源狀態與同步紀錄。

## 範圍
- Supabase schema（Postgres）新增的表與欄位。
- 將 schema 與實際 user flow（針劑例行/口服臨時、早餐提醒、裝置同步）對應。
- Phase A 僅收斂在資料層與後端 function 所需欄位，不處理畫面稿。

## 資料流程概觀
1. **療程建檔** → 使用者於 App 定義藥品、頻率（28/56 天或 PRN）、開始日期、提醒偏好。
2. **生成提醒與排程** → 依 `medication_regimens` 設定建立提醒 (`medication_reminders`) 與週期 (`medication_cycles`)。
3. **實際紀錄** → 每次施打/服用產生 `medication_administrations`，標註是否症狀觸發與依從狀態。
4. **日常健康紀錄** → 使用者在早餐時段填寫 `daily_wellness_log`，並可同步 `sleep_sessions`、`activity_sessions`。
5. **裝置同步** → `health_data_sources` 管理授權狀態，資料先進入 staging（HealthKit/GoogleFit）再轉寫正式表，避免重複。

## Schema 設計

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
| `notes` | text | 額外描述 |
| `created_at` | timestamptz |  |

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

#### `medication_reminders` & `reminder_logs`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `regimen_id` | uuid FK | |
| `reminder_type` | text | pre-dose / follow-up / refill |
| `channel` | text | push / sms / email |
| `lead_time_minutes` | int | 例：提前 1440 分提醒 |
| `window_start` | time | 例：08:00 |
| `window_end` | time | |
| `timezone` | text | IANA |
| `snooze_minutes` | int | 可選 |
| `active` | boolean | |
| `metadata` | jsonb | cron、weekday mask 等 |
| `created_at/updated_at` | timestamptz | |

`reminder_logs`（對應 `reminder_id`）保存送達、點擊、跳過、因資料已存在而自動解除等狀態，便於調適提醒策略。

### 2. 睡眠 / 運動 / 早餐聯動

#### `daily_wellness_log`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `user_id` | uuid FK | PK part |
| `log_date` | date | PK part |
| `breakfast_time` | timestamptz | 早餐記錄時間 |
| `sleep_quality_score` | int | 1-5 主觀分數 |
| `energy_level` | int | 1-5 |
| `mood_score` | int | 1-5 |
| `activity_minutes` | int | 當日總運動時長 |
| `notes` | text | 自由填寫 |
| `captured_via` | text | manual / auto |
| `created_at/updated_at` | timestamptz | |

早餐畫面可以一次帶入 `sleep_quality_score`、`activity_minutes` 等欄位。

#### `sleep_sessions`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `source` | text | manual / healthkit / googlefit |
| `source_record_id` | text | 去重用 |
| `start_time` | timestamptz | |
| `end_time` | timestamptz | |
| `duration_minutes` | int | 冗餘儲存 |
| `is_main_sleep` | boolean | 區分午睡 |
| `quality_score` | int | 1-5 或 null |
| `capture_method` | text | breakfast_form / auto_sync |
| `created_at` | timestamptz | |

#### `activity_sessions`
| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `activity_type` | text | walk / run / yoga… |
| `intensity` | text | low / moderate / high |
| `start_time` | timestamptz | |
| `end_time` | timestamptz | |
| `duration_minutes` | int | |
| `calories` | int | 可選 |
| `steps` | int | 可選 |
| `source` | text | manual / healthkit... |
| `capture_method` | text | breakfast_form / auto_sync |
| `notes` | text | |
| `created_at` | timestamptz | |

### 3. Reminders 與健康資料來源

#### `habit_reminders`
可共用於睡眠/運動/早餐提醒。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `habit_type` | text | sleep_log / activity_log / breakfast_bundle |
| `preferred_window_start` | time | 搭配 `timezone` |
| `preferred_window_end` | time | |
| `frequency_pattern` | text | daily / weekdays / custom |
| `auto_complete_condition` | text | 若已存在同日資料則自動完成 |
| `notification_channel` | text | push / sms |
| `snooze_minutes` | int | |
| `status` | text | active / paused |
| `metadata` | jsonb | cron 表達式等 |
| `created_at/updated_at` | timestamptz | |

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

## Phase A 實作優先順序
1. **Migration 檔**：依上面順序拆成多支 SQL（建議 `009_medication_base.sql`、`010_sleep_activity.sql`、`011_reminders_health_sources.sql`），並更新 `seed_test_data.sql` 方便 QA。
2. **Supabase Edge Functions**：
   - 產生/更新療程時建立預設提醒與下一次 cycle。
   - 每次 `medication_administration` 寫入後，如與提醒對應則更新 `reminder_logs`。
3. **早餐頁面 API**：
   - 新增 `daily_wellness_log` CRUD。
   - 寫入手動 `sleep_sessions`/`activity_sessions`。
4. **健康資料同步骨架**：
   - 先實作 `health_data_sources` 狀態（連動 App UI）。
   - 撰寫 cron job (Edge Function / worker) 將 staging 轉正式表。

## 風險與待確認事項
- **提醒與通知管線**：現有 push queue 是否可重用？或需新增 job table？需與 infra 討論。
- **PRN 藥品排程**：是否仍需顯示預設提醒？目前假設 PRN 沒有固定提醒，由症狀觸發記錄即可。
- **早餐頁面資料模型**：若同日多次填寫，`daily_wellness_log` 是否覆蓋？建議僅保留最新並在 UI 做提醒。
- **健康資料去重策略**：若多來源同時同步（HealthKit + 手動），優先順序需在產品確認。
- **安全與稽核**：藥物紀錄是否需要 HIPAA 等級稽核？若需要，`medication_administrations` 可能要額外紀錄 who/when 修改。

## 附件 / 參考
- 相關需求：使用者「2 個月一次針劑」與「症狀才吃口服藥」。
- 現有檔案參考：
  - `supabase/functions/refresh-food-analysis/index.ts`（Edge Function 風格）
  - `supabase/migrations/007_add_bowel_movement_fields.sql`（命名與 migration 結構）
  - `claudedocs/bowel-movement-feature-design.md`（文件格式示例）

