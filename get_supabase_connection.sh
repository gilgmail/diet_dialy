#!/bin/bash

echo "🔍 Supabase 連線資訊檢測..."
echo "=================================="

# 嘗試不同的 Supabase 主機格式
PROJECT_REF="lbjeyvvierxcnrytuvto"
PASSWORD="QXf7fUzUTML2Gh5k"

# 常見的 Supabase 主機格式
HOSTS=(
    "db.${PROJECT_REF}.supabase.co"
    "${PROJECT_REF}.supabase.co"
    "db-${PROJECT_REF}.supabase.co"
    "aws-0-ap-southeast-1.pooler.supabase.com"
)

echo "🔍 測試不同的主機格式..."

for HOST in "${HOSTS[@]}"; do
    echo ""
    echo "測試: $HOST"

    # 測試 DNS 解析
    if nslookup "$HOST" >/dev/null 2>&1; then
        echo "  ✅ DNS 解析成功"

        # 測試端口連線
        if nc -z "$HOST" 5432 2>/dev/null; then
            echo "  ✅ 端口 5432 可連接"

            # 測試 PostgreSQL 連線
            echo "  🔗 測試 PostgreSQL 連線..."
            CONNECTION_STRING="postgresql://postgres:${PASSWORD}@${HOST}:5432/postgres"

            if /opt/homebrew/opt/postgresql@14/bin/psql "$CONNECTION_STRING" -c "SELECT 1;" >/dev/null 2>&1; then
                echo "  🎉 PostgreSQL 連線成功！"
                echo ""
                echo "✅ 找到正確的連線資訊:"
                echo "   主機: $HOST"
                echo "   連線字串: $CONNECTION_STRING"

                # 更新匯入腳本
                sed -i '' "s/db\.lbjeyvvierxcnrytuvto\.supabase\.co/$HOST/g" import_taiwan_foods_direct.sh
                echo "   ✅ 已更新匯入腳本"

                exit 0
            else
                echo "  ❌ PostgreSQL 連線失敗"
            fi
        else
            echo "  ❌ 端口 5432 無法連接"
        fi
    else
        echo "  ❌ DNS 解析失敗"
    fi
done

echo ""
echo "❌ 所有主機格式都無法連接"
echo ""
echo "💡 請檢查："
echo "1. Supabase 專案是否暫停或刪除"
echo "2. 網路連線是否正常"
echo "3. 防火牆是否阻擋外部資料庫連線"
echo "4. Supabase 專案 URL 是否正確"