#!/usr/bin/env bash
set -euo pipefail

# ===================================================================
# Supabase 自動安裝腳本 - Raspberry Pi 5 (ARM64)
# ===================================================================
# 用途: 在 Pi 5 上安裝 Docker、Docker Compose、Supabase CLI
#      並啟動本地 Supabase 測試環境
# 使用: ./setup_supabase_pi5.sh
# ===================================================================

# 配置變數
SUPABASE_VERSION=${SUPABASE_VERSION:-"latest"}
SUPABASE_ARCHIVE="supabase_${SUPABASE_VERSION}_linux_arm64.tar.gz"
PROJECT_DIR=${PROJECT_DIR:-"$HOME/diet_dialy"}

echo "🚀 Supabase Pi 5 安裝腳本"
echo "===================================="
echo "📦 Supabase 版本: ${SUPABASE_VERSION}"
echo "📂 專案目錄: ${PROJECT_DIR}"
echo "===================================="

# === 系統更新 ===
echo ""
echo "👉 [1/6] 更新系統套件..."
sudo apt update && sudo apt upgrade -y

# === 安裝 Docker ===
echo ""
echo "👉 [2/6] 檢查並安裝 Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "   → 下載並安裝 Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  rm get-docker.sh

  echo "   → 將當前用戶加入 docker 群組..."
  sudo usermod -aG docker "$USER"

  echo ""
  echo "⚠️  Docker 已安裝，但需要重新登入才能使用"
  echo "⚠️  請執行: newgrp docker"
  echo "⚠️  或重新 SSH 登入後再繼續執行此腳本"
  echo ""
  read -p "按 Enter 繼續安裝其他組件，或 Ctrl+C 退出後重新登入..."
else
  echo "   ✅ Docker 已安裝: $(docker --version)"
fi

# === 安裝 Docker Compose ===
echo ""
echo "👉 [3/6] 安裝 Docker Compose CLI..."
if ! docker compose version >/dev/null 2>&1; then
  sudo apt install -y docker-compose-plugin
fi
echo "   ✅ $(docker compose version)"

# === 安裝 Supabase CLI ===
echo ""
echo "👉 [4/6] 安裝 Supabase CLI (${SUPABASE_VERSION})..."
if ! command -v supabase >/dev/null 2>&1; then
  echo "   → 下載 Supabase CLI for ARM64..."

  # 使用 GitHub Releases 下載（更可靠）
  DOWNLOAD_URL="https://github.com/supabase/cli/releases/latest/download/supabase_linux_arm64.tar.gz"

  echo "   → 從 ${DOWNLOAD_URL} 下載..."
  curl -fsSL "${DOWNLOAD_URL}" -o supabase_cli.tar.gz

  echo "   → 解壓縮並安裝..."
  sudo tar -xzf supabase_cli.tar.gz -C /usr/local/bin
  rm supabase_cli.tar.gz

  # 確認安裝
  if ! command -v supabase >/dev/null 2>&1; then
    echo "   ❌ Supabase CLI 安裝失敗"
    exit 1
  fi
fi
echo "   ✅ Supabase CLI: $(supabase --version)"

# === 準備專案目錄 ===
echo ""
echo "👉 [5/6] 準備專案目錄..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# 檢查專案目錄是否有必要的檔案
if [ ! -f "package.json" ]; then
  echo ""
  echo "⚠️  未偵測到專案檔案 (package.json)"
  echo "⚠️  請確保專案檔案已同步到 ${PROJECT_DIR}"
  exit 1
fi

echo "   ✅ 專案目錄: $(pwd)"

# === 啟動 Supabase ===
echo ""
echo "👉 [6/6] 啟動 Supabase 本地服務..."
echo "   → 啟動 Docker 容器 (這可能需要幾分鐘)..."

# 檢查是否已經在運行
if supabase status >/dev/null 2>&1; then
  echo "   ⚠️  Supabase 已在運行中"
  read -p "   是否重啟? (y/N): " restart
  if [[ "$restart" =~ ^[Yy]$ ]]; then
    supabase stop
    supabase start
  fi
else
  supabase start
fi

# === 套用 Migrations ===
echo ""
echo "👉 套用資料庫 migrations..."
if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations)" ]; then
  supabase db push
  echo "   ✅ Migrations 已套用"
else
  echo "   ⚠️  未找到 migrations 檔案，跳過"
fi

# === 顯示連線資訊 ===
echo ""
echo "===================================="
echo "✅ Supabase 安裝完成！"
echo "===================================="
echo ""
supabase status
echo ""
echo "📝 連線資訊:"
echo "   API URL: http://localhost:54321"
echo "   Studio URL: http://localhost:54323"
echo "   DB URL: postgresql://postgres:postgres@localhost:54322/postgres"
echo ""
echo "💡 有用的指令:"
echo "   supabase status    # 查看服務狀態"
echo "   supabase stop      # 停止服務"
echo "   supabase start     # 啟動服務"
echo "   supabase db reset  # 重置資料庫"
echo "===================================="
