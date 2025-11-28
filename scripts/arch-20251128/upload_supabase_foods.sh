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

if [ $# -lt 2 ]; then
  echo "使用方式: $0 <DATABASE_PASSWORD> <CSV檔案路徑> [--truncate]"
  echo ""
  echo "例如: $0 your_password data/exports/diet_daily_foods.csv --truncate"
  exit 1
fi

DB_PASSWORD="$1"
CSV_PATH="$2"
SHOULD_TRUNCATE="${3:-}"

if [ ! -f "$CSV_PATH" ]; then
  echo "❌ 找不到檔案: $CSV_PATH"
  exit 1
fi

DB_HOST="db.lbjeyvvierxcnrytuvto.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "🔐 測試 Supabase 連線..."
if ! "$PSQL_BIN" "$CONNECTION_STRING" -c "SELECT 1;" >/dev/null 2>&1; then
  echo "❌ 無法連線到資料庫，請確認密碼與網路設定"
  exit 1
fi

echo "✅ 連線成功"

if [ "$SHOULD_TRUNCATE" = "--truncate" ]; then
  echo "⚠️  將清空 diet_daily_foods 再重新匯入"
  read -p "確定要繼續嗎？(y/N): " confirm
  if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "🚫 已取消"
    exit 0
  fi

  echo "🧹 清空 diet_daily_foods..."
  "$PSQL_BIN" "$CONNECTION_STRING" -c "TRUNCATE TABLE diet_daily_foods RESTART IDENTITY CASCADE;"
fi

echo "⬆️  匯入 $CSV_PATH 至 diet_daily_foods..."
if "$PSQL_BIN" "$CONNECTION_STRING" -c "\\copy diet_daily_foods FROM '${CSV_PATH}' WITH (FORMAT csv, HEADER true)"; then
  echo "🎉 匯入完成"
else
  echo "❌ 匯入失敗"
  exit 1
fi

