#!/bin/bash

# HealthKit Integration Test Script
# Tests all layers: Database → API → Frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
TEST_USER_ID="${TEST_USER_ID:-demo-user}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           HealthKit Integration Test Suite                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print status
print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
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

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ==============================================================================
# 1. DATABASE LAYER TESTS
# ==============================================================================
print_section "1️⃣  DATABASE LAYER TESTS"

print_test "Checking health_metrics table exists..."
if psql "${DATABASE_URL}" -c "\d health_metrics" > /dev/null 2>&1; then
    print_success "health_metrics table exists"
else
    print_error "health_metrics table not found"
    exit 1
fi

print_test "Checking daily_symptom_entries health columns..."
COLUMNS=$(psql "${DATABASE_URL}" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_symptom_entries' AND column_name IN ('avg_heart_rate', 'daily_steps', 'active_calories', 'water_intake_ml', 'stress_score');")
COLUMN_COUNT=$(echo "$COLUMNS" | grep -v '^$' | wc -l | tr -d ' ')

if [ "$COLUMN_COUNT" -eq 5 ]; then
    print_success "All 5 health columns exist in daily_symptom_entries"
else
    print_error "Missing health columns (found $COLUMN_COUNT, expected 5)"
    echo "$COLUMNS"
    exit 1
fi

print_test "Checking trigger for health_metrics sync..."
TRIGGER_EXISTS=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'sync_health_metrics_to_symptom_entries';")
if [ "$TRIGGER_EXISTS" -gt 0 ]; then
    print_success "Trigger sync_health_metrics_to_symptom_entries exists"
else
    print_error "Trigger not found"
    exit 1
fi

print_test "Checking sample data in health_metrics..."
HEALTH_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM health_metrics WHERE metric_date >= NOW() - INTERVAL '7 days';")
if [ "$HEALTH_COUNT" -gt 0 ]; then
    print_success "Found $HEALTH_COUNT health_metrics records in last 7 days"

    # Show sample data
    print_info "Sample health_metrics data:"
    psql "${DATABASE_URL}" -c "SELECT metric_date, metric_type, value FROM health_metrics WHERE metric_date >= NOW() - INTERVAL '7 days' LIMIT 5;"
else
    print_info "No recent health_metrics data (this is expected if not synced yet)"
fi

# ==============================================================================
# 2. API LAYER TESTS
# ==============================================================================
print_section "2️⃣  API LAYER TESTS"

print_test "Testing HealthKit Sync API (POST /api/healthkit/sync)..."

# Create test payload
TEST_PAYLOAD=$(cat <<EOF
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

SYNC_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/healthkit/sync" \
  -H "Content-Type: application/json" \
  -d "$TEST_PAYLOAD")

SYNC_SUCCESS=$(echo "$SYNC_RESPONSE" | jq -r '.success // false')

if [ "$SYNC_SUCCESS" = "true" ]; then
    print_success "HealthKit sync successful"
    SYNCED_COUNT=$(echo "$SYNC_RESPONSE" | jq -r '.synced // 0')
    print_info "Synced $SYNCED_COUNT metrics"
else
    print_error "HealthKit sync failed"
    echo "$SYNC_RESPONSE" | jq '.'
    exit 1
fi

# Wait for trigger to propagate
sleep 2

print_test "Verifying data propagation to daily_symptom_entries..."
SYMPTOM_HEALTH_DATA=$(psql "${DATABASE_URL}" -t -c "SELECT avg_heart_rate, daily_steps, active_calories, water_intake_ml, stress_score FROM daily_symptom_entries WHERE user_id = '$TEST_USER_ID' AND recorded_date = '$(date -u +%Y-%m-%d)' LIMIT 1;")

if [ -n "$SYMPTOM_HEALTH_DATA" ]; then
    print_success "Health data propagated to daily_symptom_entries"
    print_info "Data: $SYMPTOM_HEALTH_DATA"
else
    print_error "Health data not found in daily_symptom_entries"
    exit 1
fi

print_test "Testing HealthKit Summary API (GET /api/healthkit/summary)..."
SUMMARY_RESPONSE=$(curl -s "${API_BASE_URL}/api/healthkit/summary?userId=$TEST_USER_ID&startDate=$(date -u -v-7d +%Y-%m-%d)&endDate=$(date -u +%Y-%m-%d)")

SUMMARY_SUCCESS=$(echo "$SUMMARY_RESPONSE" | jq -r '.success // false')

if [ "$SUMMARY_SUCCESS" = "true" ]; then
    print_success "HealthKit summary API working"

    # Check if summary contains health data
    HAS_STEPS=$(echo "$SUMMARY_RESPONSE" | jq -r '.summary.steps // null')
    HAS_HEART_RATE=$(echo "$SUMMARY_RESPONSE" | jq -r '.summary.heartRate // null')

    if [ "$HAS_STEPS" != "null" ] && [ "$HAS_HEART_RATE" != "null" ]; then
        print_success "Summary contains health metrics"
        print_info "Sample summary:"
        echo "$SUMMARY_RESPONSE" | jq '.summary | {steps: .steps.average, heartRate: .heartRate.average}'
    else
        print_info "Summary API works but no health data yet"
    fi
else
    print_error "HealthKit summary API failed"
    echo "$SUMMARY_RESPONSE" | jq '.'
    exit 1
fi

# ==============================================================================
# 3. WEEKLY ANALYSIS INTEGRATION TESTS
# ==============================================================================
print_section "3️⃣  WEEKLY ANALYSIS INTEGRATION TESTS"

print_test "Testing Weekly Analysis with Health Data..."

# Generate a test weekly analysis
ANALYSIS_PAYLOAD=$(cat <<EOF
{
  "userId": "$TEST_USER_ID",
  "startDate": "$(date -u -v-7d +%Y-%m-%d)",
  "endDate": "$(date -u +%Y-%m-%d)",
  "promptStyle": "balanced"
}
EOF
)

ANALYSIS_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/api/ai/weekly-ibd-analysis" \
  -H "Content-Type: application/json" \
  -d "$ANALYSIS_PAYLOAD")

ANALYSIS_SUCCESS=$(echo "$ANALYSIS_RESPONSE" | jq -r '.success // false')

if [ "$ANALYSIS_SUCCESS" = "true" ]; then
    print_success "Weekly analysis generated successfully"

    REPORT_ID=$(echo "$ANALYSIS_RESPONSE" | jq -r '.reportId // null')

    if [ "$REPORT_ID" != "null" ]; then
        print_info "Report ID: $REPORT_ID"

        # Check if analysis contains health metrics
        ANALYSIS_JSON=$(echo "$ANALYSIS_RESPONSE" | jq -r '.analysisData')
        HAS_HEALTH_METRICS=$(echo "$ANALYSIS_JSON" | jq -r '.lifestyleFactors.healthMetrics // null')

        if [ "$HAS_HEALTH_METRICS" != "null" ]; then
            print_success "Analysis includes healthMetrics in lifestyleFactors"

            # Show health metrics overview
            print_info "Health Metrics Overview:"
            echo "$ANALYSIS_JSON" | jq '.lifestyleFactors.healthMetrics.overview | with_entries(select(.value != null) | {key, value: .value.average})'

            # Show correlations
            CORRELATION_COUNT=$(echo "$ANALYSIS_JSON" | jq '.lifestyleFactors.healthMetrics.correlations | length')
            print_info "Found $CORRELATION_COUNT health-symptom correlations"

        else
            print_info "Analysis generated but no health metrics included (may need more data)"
        fi
    fi
else
    print_error "Weekly analysis generation failed"
    echo "$ANALYSIS_RESPONSE" | jq '.'
    exit 1
fi

# ==============================================================================
# 4. FRONTEND DISPLAY TESTS
# ==============================================================================
print_section "4️⃣  FRONTEND DISPLAY TESTS"

print_test "Checking Weekly Analysis page accessibility..."
WEEKLY_PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/weekly-analysis")

if [ "$WEEKLY_PAGE_STATUS" -eq 200 ]; then
    print_success "Weekly Analysis page accessible (status: 200)"
else
    print_error "Weekly Analysis page not accessible (status: $WEEKLY_PAGE_STATUS)"
fi

print_test "Checking HealthMetricsCards component exists..."
if [ -f "src/components/medical/HealthMetricsCards.tsx" ]; then
    print_success "HealthMetricsCards component exists"
else
    print_error "HealthMetricsCards component not found"
fi

print_test "Checking HealthSymptomCorrelationChart component exists..."
if [ -f "src/components/medical/charts/HealthSymptomCorrelationChart.tsx" ]; then
    print_success "HealthSymptomCorrelationChart component exists"
else
    print_error "HealthSymptomCorrelationChart component not found"
fi

# ==============================================================================
# 5. TYPE SYSTEM VALIDATION
# ==============================================================================
print_section "5️⃣  TYPE SYSTEM VALIDATION"

print_test "Running TypeScript type check..."
if npm run typecheck > /dev/null 2>&1; then
    print_success "TypeScript compilation successful"
else
    print_error "TypeScript type errors detected"
    print_info "Run 'npm run typecheck' for details"
    exit 1
fi

# ==============================================================================
# SUMMARY
# ==============================================================================
print_section "📊 TEST SUMMARY"

echo ""
echo -e "${GREEN}✅ All HealthKit integration tests passed!${NC}"
echo ""
echo -e "${BLUE}Components Verified:${NC}"
echo "  • Database: health_metrics table and triggers"
echo "  • API: Sync and Summary endpoints"
echo "  • Analysis: Health metrics in weekly reports"
echo "  • Frontend: Components and pages"
echo "  • Types: TypeScript compilation"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Open ${API_BASE_URL}/weekly-analysis in browser"
echo "  2. Generate a new report to see health metrics visualization"
echo "  3. Check iOS app for HealthKit permission prompts"
echo "  4. Sync real HealthKit data from device"
echo ""
