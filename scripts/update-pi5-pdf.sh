#!/bin/bash

# 更新 Pi5 上的 PDF 生成代碼
# 由於 Pi5 上的 diet-daily 不是 git repository，需要直接複製檔案

set -e

# Load environment variables from .env file
if [ -f "$(dirname "$0")/../.env" ]; then
    set -a
    source "$(dirname "$0")/../.env"
    set +a
fi

PI_HOST="${PI_USER}@${PI_HOST:-10.1.1.85}"
PI_DIR="~/diet-daily"
LOCAL_PDF_FILE="src/components/medical/PDFReportExporter.tsx"

echo "🔧 Updating PDF code on Pi5..."

# 1. 備份現有檔案
echo "📦 Backing up existing file..."
ssh $PI_HOST "cp $PI_DIR/$LOCAL_PDF_FILE $PI_DIR/$LOCAL_PDF_FILE.backup.$(date +%Y%m%d-%H%M%S)" || true

# 2. 複製新檔案
echo "📤 Uploading new PDF code..."
scp $LOCAL_PDF_FILE $PI_HOST:$PI_DIR/$LOCAL_PDF_FILE

# 3. 重新編譯
echo "🔨 Building on Pi5..."
ssh $PI_HOST "cd $PI_DIR && npm run build"

# 4. 重啟服務
echo "🔄 Restarting service..."
ssh $PI_HOST "pm2 restart diet-daily"

echo "✅ Pi5 PDF code updated successfully!"
echo ""
echo "📊 Changes:"
echo "  - PDF 使用純文字生成（檔案大小減少 80-90%）"
echo "  - 中文字保證正確顯示"
echo "  - 生成速度更快"
