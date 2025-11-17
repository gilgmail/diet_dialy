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
