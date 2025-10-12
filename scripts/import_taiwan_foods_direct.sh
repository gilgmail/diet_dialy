#!/bin/bash

# 台灣食物資料庫直接匯入腳本 (繞過 RLS 限制)
# 使用 PostgreSQL 直接連線到 Supabase

echo "🔗 台灣食物資料庫直接匯入..."
echo "=================================="

# Supabase 連線資訊
DB_HOST="db.lbjeyvvierxcnrytuvto.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

# 檢查是否提供密碼
if [ -z "$1" ]; then
    echo "❌ 使用方式: $0 <DATABASE_PASSWORD>"
    echo ""
    echo "範例: $0 your_supabase_password"
    echo ""
    echo "💡 您可以在 Supabase Dashboard → Settings → Database 找到密碼"
    exit 1
fi

DB_PASSWORD="$1"
CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "🔍 測試資料庫連線..."

# 測試連線
/opt/homebrew/opt/postgresql@14/bin/psql "$CONNECTION_STRING" -c "SELECT version();" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ 資料庫連線失敗！請檢查："
    echo "   1. 密碼是否正確"
    echo "   2. 網路連線是否正常"
    echo "   3. Supabase 專案是否啟用"
    exit 1
fi

echo "✅ 資料庫連線成功！"

# 檢查現有台灣食物數量
echo ""
echo "🔍 檢查現有台灣食物數量..."
EXISTING_COUNT=$(/opt/homebrew/opt/postgresql@14/bin/psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM diet_daily_foods WHERE taiwan_origin = true;" 2>/dev/null | xargs)

echo "   現有台灣食物: $EXISTING_COUNT 種"

# 詢問是否繼續
echo ""
echo "🚀 準備匯入台灣食物資料庫..."
echo "   檔案: taiwan_1000_foods_database.sql"
echo "   預期新增: ~1020 種台灣食物"
echo ""
read -p "是否繼續匯入？(y/N): " confirm

if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "❌ 匯入已取消"
    exit 0
fi

# 開始匯入
echo ""
echo "📦 開始匯入台灣食物資料庫..."
echo "   這可能需要 1-2 分鐘..."

# 執行 SQL 檔案
/opt/homebrew/opt/postgresql@14/bin/psql "$CONNECTION_STRING" -f taiwan_1000_foods_database.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 匯入完成！"

    # 驗證匯入結果
    echo ""
    echo "📊 驗證匯入結果..."

    NEW_COUNT=$(/opt/homebrew/opt/postgresql@14/bin/psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM diet_daily_foods WHERE taiwan_origin = true;" 2>/dev/null | xargs)
    IMPORTED_COUNT=$((NEW_COUNT - EXISTING_COUNT))

    echo "   匯入前: $EXISTING_COUNT 種"
    echo "   匯入後: $NEW_COUNT 種"
    echo "   新增數量: $IMPORTED_COUNT 種"

    # 按分類統計
    echo ""
    echo "📋 按分類統計:"
    /opt/homebrew/opt/postgresql@14/bin/psql "$CONNECTION_STRING" -c "
    SELECT
        category,
        COUNT(*) as food_count
    FROM diet_daily_foods
    WHERE taiwan_origin = true
    GROUP BY category
    ORDER BY food_count DESC;" 2>/dev/null

    echo ""
    echo "✅ 台灣食物資料庫匯入成功！"
    echo "🎯 您現在擁有完整的台灣飲食文化資料庫"

else
    echo ""
    echo "❌ 匯入過程中發生錯誤"
    echo "💡 請檢查 SQL 檔案是否存在且格式正確"
    echo "   檔案位置: taiwan_1000_foods_database.sql"
fi