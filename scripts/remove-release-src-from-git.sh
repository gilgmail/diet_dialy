#!/usr/bin/env bash

# Remove DietDailyMobile/src from Git tracking
# 從 Git 追蹤中移除 DietDailyMobile/src

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TARGET_SRC="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyMobile/src"

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
echo -e "${BLUE}║  Remove DietDailyMobile/src from Git Tracking   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if files are tracked
TRACKED_FILES=$(git ls-files "$TARGET_SRC" 2>/dev/null | wc -l | tr -d ' ')

if [ "$TRACKED_FILES" -eq 0 ]; then
    print_success "DietDailyMobile/src is not tracked in Git"
    echo "Nothing to do."
    exit 0
fi

print_warning "Found $TRACKED_FILES files tracked in Git"
echo ""
echo "This will:"
echo "  - Remove DietDailyMobile/src from Git tracking"
echo "  - Keep local files (they will be synced via sync-src-to-release.sh)"
echo "  - Add DietDailyMobile/src to .gitignore (if not already)"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Cancelled"
    exit 0
fi

# Remove from Git tracking (but keep local files)
print_status "Removing from Git tracking..."
git rm -r --cached "$TARGET_SRC" 2>/dev/null || {
    print_error "Failed to remove from Git tracking"
    exit 1
}

print_success "Removed from Git tracking"

# Ensure .gitignore includes it
print_status "Checking .gitignore..."
if ! grep -q "DietDailyMobile/src" .gitignore 2>/dev/null; then
    print_status "Adding to .gitignore..."
    echo "" >> .gitignore
    echo "# DietDailyMobile/src - synced from DietDailyDev via sync-src-to-release.sh" >> .gitignore
    echo "# Only DietDailyDev/src is tracked in Git" >> .gitignore
    echo "mobile/react-native-starter-kit/DietDailyMobile/src/" >> .gitignore
    print_success "Added to .gitignore"
else
    print_success ".gitignore already configured"
fi

echo ""
print_success "Done!"
echo ""
echo "Next steps:"
echo "  1. Review the changes: git status"
echo "  2. Commit the changes:"
echo "     git commit -m \"chore: remove DietDailyMobile/src from Git tracking\""
echo ""
echo "From now on:"
echo "  - Only DietDailyDev/src will be tracked in Git"
echo "  - DietDailyMobile/src will be synced via sync-src-to-release.sh"
echo "  - Run ./scripts/build-ios-release.sh to automatically sync and build"

