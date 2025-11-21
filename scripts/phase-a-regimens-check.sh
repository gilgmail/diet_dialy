#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== Phase A | Medication Regimen API checks =="

cd "$ROOT_DIR"

echo "1) Running TypeScript type-check (Phase A scope)..."
npx tsc --project tsconfig.phase-a.json --pretty false

PHASE_A_TEST_FILE="tests/api/medication-regimens.test.ts"
if [[ -f "$PHASE_A_TEST_FILE" ]]; then
  echo "2) Running targeted API tests..."
  npx jest "$PHASE_A_TEST_FILE" --runInBand
else
  echo "2) Skipping API tests (tests/api/medication-regimens.test.ts not found)."
  echo "   Add the test file above to enable automated endpoint assertions."
fi

echo "Phase A checks complete."
