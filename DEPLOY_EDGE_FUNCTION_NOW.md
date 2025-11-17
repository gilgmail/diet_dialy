# 🚀 立即部署 Edge Function

## ✅ 已完成

1. ✅ AI 分析 API 已實作並部署到生產環境
2. ✅ Edge Function 程式碼已更新
3. ✅ 測試確認 AI API 正常運作

## 📝 現在需要你做的事

### 步驟 1: 取得 Supabase Access Token

1. 前往 https://supabase.com/dashboard/account/tokens
2. 點擊「Generate new token」
3. 名稱：`CLI Deploy`
4. 複製產生的 token（sk-...）

### 步驟 2: 部署 Edge Function

```bash
# 方法 1: 使用 token 直接部署（推薦）
npx supabase functions deploy refresh-food-analysis \
  --project-ref lbjeyvvierxcnrytuvto \
  --token YOUR_ACCESS_TOKEN

# 方法 2: 設定環境變數後部署
export SUPABASE_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
npx supabase functions deploy refresh-food-analysis --project-ref lbjeyvvierxcnrytuvto
```

### 步驟 3: 設定環境變數（重要！）

Edge Function 需要這些環境變數才能呼叫 AI API：

```bash
npx supabase secrets set \
  --project-ref lbjeyvvierxcnrytuvto \
  API_BASE_URL=http://gilko.redirectme.net:3000 \
  FOOD_ANALYSIS_VERSION=queue-auto \
  FOOD_ANALYSIS_MAX_BATCH=5
```

### 步驟 4: 驗證部署

測試 Edge Function 是否正常運作：

```bash
curl -X POST "https://lbjeyvvierxcnrytuvto.supabase.co/functions/v1/refresh-food-analysis" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

預期回應：
- 如果佇列為空：`{"success": true, "processed": 0}`
- 如果有項目：`{"success": true, "processed": 2, "results": [...]}`

### 步驟 5: 從 iOS App 測試

1. 開啟 iOS App
2. 前往：設定 → AI 食物知識庫
3. 點擊：「立即處理」
4. 應該看到成功訊息（不再是 404）

---

## 🔍 如何取得 ANON_KEY

如果需要測試 Edge Function，你的 ANON_KEY 在：
1. Supabase Dashboard → Project Settings → API
2. 複製「anon public」key

---

## ✨ 部署後的效果

部署完成後，當使用者點擊「立即處理」：

1. iOS App 呼叫 Edge Function
2. Edge Function 呼叫 AI API (`http://gilko.redirectme.net:3000/api/ai/analyze-food`)
3. AI API 使用 Claude 3.5 Haiku 分析食物
4. 產生完整的 IBD 食物分析：
   - 風險評估（triggers + severity）
   - 有益特性（supportive_attributes）
   - 食用建議（serving_guidelines）
   - 專業摘要（summary）
5. 儲存到 `food_analysis_cache` 表
6. 使用者可以看到完整的 AI 分析內容

---

## 📊 監控

部署後，你可以在這些地方監控：

1. **Supabase Dashboard** → Edge Functions → refresh-food-analysis → Logs
   - 查看函數執行記錄
   - 檢查錯誤訊息

2. **資料庫查詢**：
   ```sql
   -- 查看最近處理的食物
   SELECT
     f.name,
     c.risk_profile->>'severity' as severity,
     c.analysis_tokens,
     c.analysis_updated_at
   FROM food_analysis_cache c
   JOIN diet_daily_foods f ON f.id = c.food_id
   WHERE c.analysis_source = 'ai_generated'
   ORDER BY c.analysis_updated_at DESC
   LIMIT 10;
   ```

3. **AI 使用量**：
   ```sql
   SELECT
     COUNT(*) as total_analyses,
     SUM(total_tokens) as total_tokens,
     AVG(total_tokens) as avg_tokens
   FROM ai_usage_logs
   WHERE feature = 'food_knowledge_analysis'
     AND created_at > NOW() - INTERVAL '24 hours';
   ```

---

## 🎉 完成！

一旦部署完成，系統就會真正使用 AI 分析食物，產生有價值的內容給使用者了！
