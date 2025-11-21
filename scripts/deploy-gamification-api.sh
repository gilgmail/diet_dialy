#!/bin/bash
# 部署遊戲化 API 到 pi5 服務器

set -e

echo "🚀 開始部署遊戲化 API 到生產環境..."

# 配置
PI5_HOST="gilko@10.1.1.85"
PROJECT_PATH="/home/gilko/diet_dialy"  # 請根據實際路徑修改

echo "📦 步驟 1: 推送代碼到遠程倉庫..."
git push origin main

echo "🔌 步驟 2: 連接到 pi5 服務器..."
ssh $PI5_HOST << 'ENDSSH'
cd /home/gilko/diet_dialy

echo "📥 步驟 3: 拉取最新代碼..."
git pull origin main

echo "🔨 步驟 4: 重新建置 Docker 容器..."
docker-compose build diet-daily-web

echo "🔄 步驟 5: 重啟容器..."
docker-compose restart diet-daily-web

echo "✅ 步驟 6: 檢查容器狀態..."
docker-compose ps diet-daily-web

echo "📋 步驟 7: 查看最新日誌（最後 20 行）..."
docker-compose logs --tail 20 diet-daily-web | grep -E 'gamification|streak|error|Error|ERROR' || echo "沒有相關日誌"

echo "✨ 部署完成！"
ENDSSH

echo ""
echo "🎉 部署流程完成！"
echo "💡 提示：請在 iOS app 中重新測試連續記錄功能"

