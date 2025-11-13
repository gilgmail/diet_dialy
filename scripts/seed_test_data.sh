#!/bin/bash
# ============================================================
# 測試資料載入腳本
# ============================================================
# 用途: 載入測試用的食物分析快取和刷新佇列資料
# 使用: ./scripts/seed_test_data.sh
# ============================================================

set -euo pipefail

# 載入環境變數
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
fi

# 確認 DATABASE_URL 存在
if [ -z "${DATABASE_URL:-}" ]; then
    echo "❌ ERROR: DATABASE_URL not found in .env"
    echo "Please set DATABASE_URL in .env file"
    exit 1
fi

echo "🔄 Loading test data into database..."
echo "📍 Database: ${DATABASE_URL%%@*}@***"
echo ""

# 執行 seed script
psql "$DATABASE_URL" -f supabase/seed_test_data.sql

echo ""
echo "✅ Test data loaded successfully!"
echo ""
echo "📊 Test data includes:"
echo "   - 5 test foods (TEST_白飯, TEST_雞胸肉, TEST_青花菜, TEST_香蕉, TEST_牛奶)"
echo "   - 3 cached analyses (正常/過期/即將過期)"
echo "   - 4 queue items (pending/in_progress/completed)"
echo ""
echo "🧪 You can now test:"
echo "   1. Weekly AI Analysis API"
echo "   2. Food Knowledge Cache detection"
echo "   3. Refresh Queue processing"
echo ""
