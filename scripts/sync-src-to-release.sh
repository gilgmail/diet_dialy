#!/usr/bin/env bash

# Sync source code from DietDailyDev to DietDailyMobile (for Release builds)
# 同步源代碼從 DietDailyDev 到 DietDailyMobile（用於 Release 構建）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyDev/src"
TARGET_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyMobile/src"

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
echo -e "${BLUE}║  Sync Source Code to DietDailyMobile (Release) ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    print_error "Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Check if source is a symlink
if [ -L "$SOURCE_DIR" ]; then
    # If source is a symlink, resolve it to the actual path
    print_status "Source directory is a symlink, resolving to actual path..."
    SOURCE_DIR=$(readlink -f "$SOURCE_DIR" || echo "$SOURCE_DIR")
    print_success "Resolved to: $SOURCE_DIR"
fi

# Verify source directory exists and has content
if [ ! -d "$SOURCE_DIR" ]; then
    print_error "Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    print_status "Target directory not found. Creating..."
    mkdir -p "$TARGET_DIR"
fi

# Show what will be synced
print_status "Preparing to sync source code..."
echo "  Source: $SOURCE_DIR"
echo "  Target: $TARGET_DIR"
echo ""

# Check if running non-interactively (from build script)
NON_INTERACTIVE="${1:-}"
if [[ "$NON_INTERACTIVE" != "--yes" ]] && [[ "$NON_INTERACTIVE" != "-y" ]]; then
    # Ask for confirmation
    read -p "This will overwrite files in DietDailyMobile/src. Continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Sync cancelled"
        exit 0
    fi
else
    print_status "Running in non-interactive mode (auto-confirmed)"
fi

# Sync files using rsync
print_status "Syncing source code..."
rsync -av --delete \
    --exclude='node_modules' \
    --exclude='.expo' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='__tests__' \
    --exclude='*.test.ts' \
    --exclude='*.test.tsx' \
    "$SOURCE_DIR/" "$TARGET_DIR/"

SYNC_RESULT=$?

if [ $SYNC_RESULT -eq 0 ]; then
    print_success "Source code synced successfully"
    echo ""
    echo "Source: $SOURCE_DIR"
    echo "Target: $TARGET_DIR"
    echo ""
    echo "✅ DietDailyMobile is now ready for Release build"
    echo ""
    echo "Next steps:"
    echo "  1. Review changes in DietDailyMobile/src"
    echo "  2. Build Release version: ./scripts/build-ios-release.sh"
    echo "  3. Install to device: ./scripts/install-ios-release.sh"
else
    print_error "Sync failed with exit code $SYNC_RESULT"
    exit $SYNC_RESULT
fi

