#!/bin/bash

# Run core failing test suites and save output for log analysis

set -u
set -o pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="$REPO_ROOT/logs"
LOG_FILE="$LOG_DIR/test-fix-plan-$TIMESTAMP.log"

mkdir -p "$LOG_DIR"

echo "🧪 Running target tests (log: $LOG_FILE)"
echo "DietDaily test-fix-plan run @ $TIMESTAMP" | tee "$LOG_FILE"
echo "======================================" | tee -a "$LOG_FILE"

failures=0
failed_suites=()

run_suite() {
  local label="$1"
  shift

  echo "" | tee -a "$LOG_FILE"
  echo "---- $label ----" | tee -a "$LOG_FILE"

  "$@" 2>&1 | tee -a "$LOG_FILE"
  local status=${PIPESTATUS[0]}

  if [ $status -ne 0 ]; then
    failures=$((failures + 1))
    failed_suites+=("$label (exit $status)")
    echo "❌ $label failed (exit $status)" | tee -a "$LOG_FILE"
  else
    echo "✅ $label passed" | tee -a "$LOG_FILE"
  fi
}

run_suite "Daily Symptom Integration" npm test -- src/__tests__/integration/daily-symptoms-integration.test.ts
run_suite "SymptomAnalysisEngine" npm test -- src/__tests__/components/medical/SymptomAnalysisEngine.test.tsx
run_suite "HealthTrendPredictor" npm test -- src/__tests__/components/medical/HealthTrendPredictor.test.tsx
run_suite "API Weekly Analysis" npm test -- src/__tests__/integration/api-weekly-analysis.test.ts

echo "" | tee -a "$LOG_FILE"
if [ $failures -eq 0 ]; then
  echo "🎉 All target suites passed" | tee -a "$LOG_FILE"
  exit 0
else
  echo "⚠️  $failures suite(s) failed:" | tee -a "$LOG_FILE"
  for suite in "${failed_suites[@]}"; do
    echo " - $suite" | tee -a "$LOG_FILE"
  done
  exit 1
fi
