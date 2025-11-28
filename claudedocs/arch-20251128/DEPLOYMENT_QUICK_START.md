# 🚀 Quick Start: Deploy Edge Function with AI Analysis

## Current Status
✅ iOS app code complete (manual trigger button implemented)
✅ AI Analysis API created (`/api/ai/analyze-food`)
✅ Edge Function updated to call AI API
❌ Edge Function **NOT DEPLOYED** to Supabase (causing 404 error)
❌ Environment variables not configured

## What You Need to Do

Deploy the Edge Function and configure environment variables to enable real AI food analysis.

### Step 1: Deploy Next.js App with AI API

確保你的 Next.js app 已部署並可存取，因為 Edge Function 需要呼叫 `/api/ai/analyze-food`。

**環境變數檢查**:
```bash
# 確認 ANTHROPIC_API_KEY 已設定
echo $ANTHROPIC_API_KEY
```

如果沒有，請在 `.env` 或部署環境中設定：
```bash
ANTHROPIC_API_KEY=sk-ant-api03-xxx...
```

### Step 2: Deploy Edge Function (CLI - Recommended) ⚡

```bash
# Step 1: Navigate to supabase directory
cd supabase

# Step 2: Login to Supabase
npx supabase login

# Step 3: Link your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Step 4: Deploy the function
npx supabase functions deploy refresh-food-analysis

# Step 5: Set environment variables (REQUIRED)
npx supabase secrets set \
  FOOD_ANALYSIS_VERSION=queue-auto \
  FOOD_ANALYSIS_MAX_BATCH=5 \
  API_BASE_URL=https://YOUR_DOMAIN.com
```

**重要**: `API_BASE_URL` 必須設定為你的 Next.js app URL（例如：`https://gilko.redirectme.net` 或 `https://your-domain.com`）

**Find YOUR_PROJECT_REF**:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Look at the URL: `https://YOUR_PROJECT_REF.supabase.co`

### Option 2: Manual Upload via Dashboard 🖱️

1. Go to https://supabase.com/dashboard
2. Select your project → Edge Functions
3. Click "Create a new function"
4. Name: `refresh-food-analysis`
5. Copy contents from `supabase/functions/refresh-food-analysis/index.ts`
6. Click Deploy

## Step 3: Test AI Analysis API ✅

首先測試 AI 分析 API 是否正常運作：

```bash
# 本地測試
./scripts/test-food-analysis-api.sh http://localhost:3000

# 生產環境測試
./scripts/test-food-analysis-api.sh https://YOUR_DOMAIN.com
```

**預期結果**: 應該看到 AI 生成的食物分析，包含：
- `risk_profile` - 風險評估
- `supportive_attributes` - 有益特性
- `serving_guidelines` - 食用建議
- `summary` - 摘要

## Step 4: Verify Edge Function Deployment ✅

測試 Edge Function 是否可以成功呼叫 AI API：

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/refresh-food-analysis" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected responses**:
- 如果佇列為空: `{"success": true, "processed": 0}`
- 如果有處理項目: `{"success": true, "processed": 2, "results": [...]}`

## Test from iOS App 📱

1. Open iOS app
2. Go to Settings (設定)
3. Scroll to "AI 食物知識庫" section
4. Tap "立即處理" button
5. Should see success message (not 404 error)

## Need More Details?

See complete guide: [docs/deploy-edge-function-guide.md](docs/deploy-edge-function-guide.md)

---

## Implementation Summary

### ✅ Completed Work

**Problem 1: iOS App Cannot Update Food Database**
- **Root Cause**: Weekly AI analysis detects missing/stale foods and adds to queue, but Edge Function requires manual trigger
- **Solution**: Added manual trigger button in iOS Settings
- **Files Changed**:
  - [mobile/.../FoodKnowledgeService.ts](mobile/react-native-starter-kit/DietDailyMobile/src/features/settings/services/FoodKnowledgeService.ts) - Added `triggerProcessor()` method
  - [mobile/.../SettingsScreen.tsx](mobile/react-native-starter-kit/DietDailyMobile/src/features/settings/screens/SettingsScreen.tsx) - Added UI button and handler
  - [supabase/functions/refresh-food-analysis/index.ts](supabase/functions/refresh-food-analysis/index.ts) - Edge Function (exists, needs deployment)

**Documentation Created**:
- [docs/food-knowledge-system-design.md](docs/food-knowledge-system-design.md) - Complete system design for all 4 problems
- [docs/food-knowledge-manual-processor-guide.md](docs/food-knowledge-manual-processor-guide.md) - User guide for manual processor
- [docs/deploy-edge-function-guide.md](docs/deploy-edge-function-guide.md) - Deployment instructions

### ⏳ Pending User Action

**Deploy Edge Function** - Required to fix 404 error and enable iOS trigger feature

### 📋 Next Phase (After Deployment)

**Problems 2-4** - Design complete, awaiting confirmation:
- Dashboard mode switching (full vs chunked analysis)
- Chunked analysis progress tracking
- Dashboard UI tab reorganization

See design details in [docs/food-knowledge-system-design.md](docs/food-knowledge-system-design.md)
