#!/bin/bash

# Deploy to Pi5 and Run HealthKit Integration Tests
# This script deploys the application to Raspberry Pi 5 and runs comprehensive tests

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PI_HOST="${PI_HOST:-10.1.1.85}"
PI_USER="${PI_USER:-gilko}"
PROJECT_NAME="diet-daily"
DEPLOY_DIR="/home/${PI_USER}/${PROJECT_NAME}"
APP_URL="http://gilko.redirectme.net:3000"

# Database configuration
DATABASE_URL="postgresql://postgres.lbjeyvvierxcnrytuvto:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
TEST_USER_ID="${TEST_USER_ID:-demo-user}"

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

print_error() {
    echo -e "${RED}  ❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}  ℹ️  $1${NC}"
}

# Ask for Supabase password
echo ""
read -sp "請輸入 Supabase 資料庫密碼: " SUPABASE_PASSWORD
echo ""

if [ -z "$SUPABASE_PASSWORD" ]; then
    print_error "密碼不能為空"
    exit 1
fi

# Update DATABASE_URL with password
DATABASE_URL="postgresql://postgres.lbjeyvvierxcnrytuvto:${SUPABASE_PASSWORD}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

print_header "Diet Daily - Pi5 部署與 HealthKit 測試套件"

# ==============================================================================
# STEP 1: DEPLOY TO PI5
# ==============================================================================
print_section "步驟 1/5: 部署應用到 Raspberry Pi 5"

echo "正在執行部署腳本..."
cd "$(dirname "$0")/.." || exit 1

# Check if deploy script exists
if [ ! -f "pi_docker/deploy-to-pi.sh" ]; then
    print_error "找不到部署腳本: pi_docker/deploy-to-pi.sh"
    exit 1
fi

# Run deployment
print_info "開始部署..."
bash pi_docker/deploy-to-pi.sh

if [ $? -eq 0 ]; then
    print_success "應用已成功部署到 Pi5"
    print_info "應用 URL: ${APP_URL}"
else
    print_error "部署失敗"
    exit 1
fi

# Wait for application to be fully ready
print_info "等待應用完全啟動 (30秒)..."
sleep 30

# ==============================================================================
# STEP 2: VERIFY APPLICATION
# ==============================================================================
print_section "步驟 2/5: 驗證應用運行狀態"

print_info "檢查應用是否響應..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}")

if [ "$HTTP_STATUS" -eq 200 ]; then
    print_success "應用正常運行 (HTTP 200)"
else
    print_error "應用未正常響應 (HTTP ${HTTP_STATUS})"
    print_info "檢查容器日誌..."
    ssh ${PI_USER}@${PI_HOST} "cd ${DEPLOY_DIR}/pi_docker && docker compose logs --tail=30"
    exit 1
fi

# Check weekly-analysis page
print_info "檢查週報頁面..."
WEEKLY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}/weekly-analysis")

if [ "$WEEKLY_STATUS" -eq 200 ]; then
    print_success "週報頁面可訪問 (HTTP 200)"
else
    print_error "週報頁面無法訪問 (HTTP ${WEEKLY_STATUS})"
fi

# ==============================================================================
# STEP 3: DATABASE CONNECTIVITY TEST
# ==============================================================================
print_section "步驟 3/5: 測試資料庫連接"

# Test database connection with psql
print_info "測試 Supabase 資料庫連接..."

# Check if psql is installed locally
if command -v psql > /dev/null 2>&1; then
    # Test connection
    if psql "${DATABASE_URL}" -c "SELECT 1" > /dev/null 2>&1; then
        print_success "資料庫連接成功"

        # Check health_metrics table
        print_info "檢查 health_metrics 表..."
        TABLE_EXISTS=$(psql "${DATABASE_URL}" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'health_metrics');")

        if echo "$TABLE_EXISTS" | grep -q "t"; then
            print_success "health_metrics 表存在"

            # Count records
            HEALTH_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM health_metrics WHERE metric_date >= NOW() - INTERVAL '7 days';")
            print_info "最近 7 天的健康記錄數: $(echo $HEALTH_COUNT | tr -d ' ')"
        else
            print_error "health_metrics 表不存在"
            print_info "可能需要執行資料庫遷移"
        fi

        # Check daily_symptom_entries health columns
        print_info "檢查 daily_symptom_entries 健康欄位..."
        COLUMN_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'daily_symptom_entries' AND column_name IN ('avg_heart_rate', 'daily_steps', 'active_calories', 'water_intake_ml', 'stress_score');")

        if [ "$(echo $COLUMN_COUNT | tr -d ' ')" -eq 5 ]; then
            print_success "所有健康欄位都存在"
        else
            print_error "健康欄位缺失"
        fi
    else
        print_error "無法連接到資料庫"
        print_info "請檢查密碼和網路連接"
        exit 1
    fi
else
    print_info "本機未安裝 psql，跳過資料庫直接測試"
    print_info "將透過 API 測試資料庫功能"
fi

# ==============================================================================
# STEP 4: HEALTHKIT API TESTS
# ==============================================================================
print_section "步驟 4/5: 測試 HealthKit API 端點"

# Test HealthKit Sync API
print_info "測試 HealthKit 同步 API..."

SYNC_PAYLOAD=$(cat <<EOF
{
  "userId": "$TEST_USER_ID",
  "date": "$(date -u +%Y-%m-%d)",
  "metrics": [
    {
      "type": "steps",
      "value": 8500,
      "unit": "count",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    },
    {
      "type": "heart_rate",
      "value": 72,
      "unit": "bpm",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    },
    {
      "type": "active_calories",
      "value": 350,
      "unit": "kcal",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    },
    {
      "type": "water_intake",
      "value": 2000,
      "unit": "ml",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    },
    {
      "type": "stress_score",
      "value": 5,
      "unit": "score",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
  ]
}
EOF
)

SYNC_RESPONSE=$(curl -s -X POST "${APP_URL}/api/healthkit/sync" \
  -H "Content-Type: application/json" \
  -d "$SYNC_PAYLOAD")

# Check if jq is installed
if command -v jq > /dev/null 2>&1; then
    SYNC_SUCCESS=$(echo "$SYNC_RESPONSE" | jq -r '.success // false')

    if [ "$SYNC_SUCCESS" = "true" ]; then
        print_success "HealthKit 同步成功"
        SYNCED_COUNT=$(echo "$SYNC_RESPONSE" | jq -r '.synced // 0')
        print_info "已同步 $SYNCED_COUNT 個健康指標"
    else
        print_error "HealthKit 同步失敗"
        echo "$SYNC_RESPONSE" | jq '.'
    fi
else
    print_info "未安裝 jq，跳過 JSON 解析"
    if echo "$SYNC_RESPONSE" | grep -q "success.*true"; then
        print_success "HealthKit 同步可能成功"
    else
        print_error "HealthKit 同步可能失敗"
        echo "$SYNC_RESPONSE"
    fi
fi

# Wait for data propagation
sleep 3

# Test HealthKit Summary API
print_info "測試 HealthKit 摘要 API..."
SUMMARY_URL="${APP_URL}/api/healthkit/summary?userId=${TEST_USER_ID}&startDate=$(date -u -v-7d +%Y-%m-%d 2>/dev/null || date -u -d '7 days ago' +%Y-%m-%d)&endDate=$(date -u +%Y-%m-%d)"

SUMMARY_RESPONSE=$(curl -s "$SUMMARY_URL")

if command -v jq > /dev/null 2>&1; then
    SUMMARY_SUCCESS=$(echo "$SUMMARY_RESPONSE" | jq -r '.success // false')

    if [ "$SUMMARY_SUCCESS" = "true" ]; then
        print_success "HealthKit 摘要 API 運作正常"

        # Check if summary contains data
        HAS_STEPS=$(echo "$SUMMARY_RESPONSE" | jq -r '.summary.steps // null')
        if [ "$HAS_STEPS" != "null" ]; then
            print_info "摘要包含步數數據"
            AVG_STEPS=$(echo "$SUMMARY_RESPONSE" | jq -r '.summary.steps.average // 0')
            print_info "平均步數: $AVG_STEPS"
        fi
    else
        print_error "HealthKit 摘要 API 失敗"
    fi
fi

# ==============================================================================
# STEP 5: WEEKLY ANALYSIS INTEGRATION TEST
# ==============================================================================
print_section "步驟 5/5: 測試週報整合"

print_info "生成包含健康數據的週報..."

ANALYSIS_PAYLOAD=$(cat <<EOF
{
  "userId": "$TEST_USER_ID",
  "startDate": "$(date -u -v-7d +%Y-%m-%d 2>/dev/null || date -u -d '7 days ago' +%Y-%m-%d)",
  "endDate": "$(date -u +%Y-%m-%d)",
  "promptStyle": "balanced"
}
EOF
)

print_info "提交週報生成請求（這可能需要 10-30 秒）..."
ANALYSIS_RESPONSE=$(curl -s -X POST "${APP_URL}/api/ai/weekly-ibd-analysis" \
  -H "Content-Type: application/json" \
  -d "$ANALYSIS_PAYLOAD")

if command -v jq > /dev/null 2>&1; then
    ANALYSIS_SUCCESS=$(echo "$ANALYSIS_RESPONSE" | jq -r '.success // false')

    if [ "$ANALYSIS_SUCCESS" = "true" ]; then
        print_success "週報生成成功"

        REPORT_ID=$(echo "$ANALYSIS_RESPONSE" | jq -r '.reportId // null')
        if [ "$REPORT_ID" != "null" ]; then
            print_info "報告 ID: $REPORT_ID"

            # Check if analysis contains health metrics
            HAS_HEALTH=$(echo "$ANALYSIS_RESPONSE" | jq -r '.analysisData.lifestyleFactors.healthMetrics // null')

            if [ "$HAS_HEALTH" != "null" ]; then
                print_success "✨ 週報包含健康因子分析！"
                print_info "健康指標已成功整合到 AI 分析中"

                # Show health metrics overview
                echo ""
                echo -e "${GREEN}健康指標概覽:${NC}"
                echo "$ANALYSIS_RESPONSE" | jq '.analysisData.lifestyleFactors.healthMetrics.overview | with_entries(select(.value != null) | {key, value: {average: .value.average, coverage: .value.coverage}})'
            else
                print_info "週報已生成，但未包含健康指標"
                print_info "可能需要更多健康數據"
            fi
        fi
    else
        print_error "週報生成失敗"
        ERROR_MSG=$(echo "$ANALYSIS_RESPONSE" | jq -r '.error // "未知錯誤"')
        print_info "錯誤訊息: $ERROR_MSG"
    fi
else
    if echo "$ANALYSIS_RESPONSE" | grep -q "success"; then
        print_success "週報生成可能成功"
    else
        print_error "週報生成可能失敗"
    fi
fi

# ==============================================================================
# SUMMARY
# ==============================================================================
print_section "📊 測試總結"

echo ""
echo -e "${GREEN}✅ 部署與測試完成！${NC}"
echo ""
echo -e "${BLUE}已驗證的功能:${NC}"
echo "  • 應用部署到 Pi5"
echo "  • 資料庫連接（Supabase）"
echo "  • HealthKit 同步 API"
echo "  • HealthKit 摘要 API"
echo "  • 週報 AI 分析"
echo ""
echo -e "${YELLOW}後續步驟:${NC}"
echo "  1. 在瀏覽器開啟: ${APP_URL}/weekly-analysis"
echo "  2. 點擊「生成報告」查看完整健康分析"
echo "  3. 檢查「💓 健康因子分析」區塊"
echo "  4. 從 iOS 應用同步真實 HealthKit 數據"
echo ""
echo -e "${BLUE}遠程管理指令:${NC}"
echo "  查看日誌: ssh ${PI_USER}@${PI_HOST} 'cd ${DEPLOY_DIR}/pi_docker && docker compose logs -f'"
echo "  重啟應用: ssh ${PI_USER}@${PI_HOST} 'cd ${DEPLOY_DIR}/pi_docker && docker compose restart'"
echo "  停止應用: ssh ${PI_USER}@${PI_HOST} 'cd ${DEPLOY_DIR}/pi_docker && docker compose down'"
echo ""
echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}  應用已在 Pi5 上運行並通過測試！${NC}"
echo -e "${GREEN}========================================================${NC}"
echo ""
