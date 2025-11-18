#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

DATABASE_URL="${1:-${DATABASE_URL:-}}"

if [[ -z "${DATABASE_URL}" ]]; then
  echo "Error: DATABASE_URL is not set."
  echo "Usage: $0 <database-url>"
  echo "   or export DATABASE_URL before running this script."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Error: psql command not found. Please install PostgreSQL client tools."
  exit 1
fi

run_sql() {
  local file="$1"
  echo ">>> Running ${file}"
  psql "${DATABASE_URL}" -f "${file}"
}

pushd "${REPO_ROOT}" >/dev/null

run_sql "supabase/migrations/011_create_medication_tables.sql"
run_sql "supabase/migrations/012_create_health_logging_tables.sql"
run_sql "supabase/migrations/013_create_reminders_and_health_sources.sql"
run_sql "supabase/seed_test_data.sql"
run_sql "supabase/seed_test_data_v2.sql"

popd >/dev/null

echo "Phase A migrations and seed data applied successfully."
