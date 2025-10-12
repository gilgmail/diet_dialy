#!/bin/bash

set -euo pipefail

PSQL_BIN="/opt/homebrew/opt/postgresql@14/bin/psql"
if [ ! -x "$PSQL_BIN" ]; then
  if command -v psql >/dev/null 2>&1; then
    PSQL_BIN="$(command -v psql)"
  else
    echo "❌ 找不到 psql 指令，請先安裝 PostgreSQL 用戶端工具"
    exit 1
  fi
fi

if [ $# -lt 1 ]; then
  echo "使用方式: $0 <DATABASE_PASSWORD> [輸出檔案路徑]"
  echo ""
  echo "例如: $0 your_password data/exports/diet_daily_foods.csv"
  exit 1
fi

DB_PASSWORD="$1"
OUTPUT_PATH="${2:-data/exports/diet_daily_foods_$(date +%Y%m%d_%H%M%S).csv}"

DB_HOST="db.lbjeyvvierxcnrytuvto.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

mkdir -p "$(dirname "$OUTPUT_PATH")"

echo "🔐 測試 Supabase 連線..."
if ! "$PSQL_BIN" "$CONNECTION_STRING" -c "SELECT 1;" >/dev/null 2>&1; then
  echo "❌ 無法連線到資料庫，請確認密碼與網路設定"
  exit 1
fi

echo "✅ 連線成功，開始匯出 diet_daily_foods 資料表"

TEMP_FILE="${OUTPUT_PATH}.tmp"

if "$PSQL_BIN" "$CONNECTION_STRING" -c "\\copy diet_daily_foods TO '${TEMP_FILE}' WITH (FORMAT csv, HEADER true)"; then
  mv "$TEMP_FILE" "$OUTPUT_PATH"
  echo "🎉 匯出完成：$OUTPUT_PATH"
else
  rm -f "$TEMP_FILE"
  echo "❌ 匯出失敗"
  exit 1
fi

