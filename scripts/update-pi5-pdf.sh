#!/bin/bash

# 快速更新特定檔案到 Pi5 並重新部署
# 注意：這個腳本用於快速測試單個檔案變更
# 完整部署請使用：../pi_docker/deploy-to-pi.sh

set -e

# Load environment variables from .env file
if [ -f "$(dirname "$0")/../.env" ]; then
    set -a
    source "$(dirname "$0")/../.env"
    set +a
fi

PI_USER="${PI_USER:-gilko}"
PI_HOST="${PI_HOST:-10.1.1.85}"
PI_DIR="~/diet-daily"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 Quick Update to Pi5${NC}"
echo ""

# Check if file argument provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <file_path>${NC}"
    echo "Example: $0 src/app/api/ai/weekly-ibd-analysis/route.ts"
    exit 1
fi

FILE_PATH="$1"

# Check if file exists locally
if [ ! -f "$FILE_PATH" ]; then
    echo "❌ Error: File not found: $FILE_PATH"
    exit 1
fi

# 1. Backup existing file on Pi
echo "📦 Backing up existing file..."
ssh ${PI_USER}@${PI_HOST} "mkdir -p $PI_DIR/backups && cp $PI_DIR/$FILE_PATH $PI_DIR/backups/$(basename $FILE_PATH).backup.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

# 2. Upload new file
echo "📤 Uploading $FILE_PATH..."
scp $FILE_PATH ${PI_USER}@${PI_HOST}:$PI_DIR/$FILE_PATH

# 3. Rebuild and restart Docker container
echo "🔨 Rebuilding Docker container..."
ssh ${PI_USER}@${PI_HOST} "cd $PI_DIR/pi_docker && set -a && source .env.production.pi && set +a && docker compose build && docker compose up -d"

# 4. Check status
echo "🔍 Checking container status..."
ssh ${PI_USER}@${PI_HOST} "cd $PI_DIR/pi_docker && docker compose ps"

echo ""
echo -e "${GREEN}✅ Quick update completed!${NC}"
echo ""
echo "🔗 Test your changes at: http://gilko.redirectme.net:3000"
echo ""
echo -e "${YELLOW}Note: For full deployment with all changes, use:${NC}"
echo "  ../pi_docker/deploy-to-pi.sh"
