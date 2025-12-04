#!/usr/bin/env bash

# Sync source code from DietDailyMobile to DietDailyDev
# 同步源代碼從 DietDailyMobile 到 DietDailyDev

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyMobile/src"
TARGET_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyDev/src"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Sync Source Code to DietDailyDev              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    print_error "Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Check if target is a symlink
if [ -L "$TARGET_DIR" ]; then
    print_status "Removing existing symlink..."
    rm "$TARGET_DIR"
    print_success "Symlink removed"
fi

# Create target directory if it doesn't exist
if [ ! -d "$TARGET_DIR" ]; then
    print_status "Creating target directory..."
    mkdir -p "$TARGET_DIR"
fi

# Sync files using rsync
print_status "Syncing source code..."
rsync -av --delete \
    --exclude='node_modules' \
    --exclude='.expo' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    "$SOURCE_DIR/" "$TARGET_DIR/"

SYNC_RESULT=$?

if [ $SYNC_RESULT -eq 0 ]; then
    print_success "Source code synced successfully"
    echo ""
    echo "Source: $SOURCE_DIR"
    echo "Target: $TARGET_DIR"
    echo ""
    echo "⚠️  注意：這會複製源代碼，而不是使用符號鏈接"
    echo "   如果需要更新，請重新運行此腳本"
else
    print_error "Sync failed with exit code $SYNC_RESULT"
    exit $SYNC_RESULT
fi

