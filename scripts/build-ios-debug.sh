#!/usr/bin/env bash

# Build iOS Debug version (DietDailyDev) without installing
# 只編譯 Debug 版本，不進行安裝

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyMobile"

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

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Build DietDailyDev (Debug) - Build Only       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running from project root
print_status "Checking project directory..."
if [ ! -d "$APP_DIR" ]; then
    print_error "Must run from project root (diet_dialy)"
    exit 1
fi
print_success "Project directory verified"

# Navigate to app directory
cd "$APP_DIR"

# Check environment files
print_status "Checking environment configuration..."
if [ ! -f ".env" ] && [ ! -f ".env.development" ]; then
    print_error "No .env or .env.development file found"
    exit 1
fi
print_success "Environment files present"

# Fix app name in Info.plist for Debug builds
print_status "Updating app name to DietDailyDev..."
"${REPO_ROOT}/scripts/fix-debug-app-name.sh" || true

# Build using expo run:ios with --no-install flag (if supported)
# Or use xcodebuild with proper code signing
print_status "Building Debug version (this may take several minutes)..."
echo ""

IOS_DIR="${APP_DIR}/ios"
WORKSPACE="${IOS_DIR}/DietDailyMobile.xcworkspace"
SCHEME="DietDailyMobile"
CONFIGURATION="Debug"

# Set APP_VARIANT to ensure correct bundle ID
export APP_VARIANT="debug"

# Build using xcodebuild with code signing enabled
# Use -allowProvisioningUpdates to allow automatic signing
xcodebuild -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -sdk iphoneos \
    -derivedDataPath "${IOS_DIR}/build" \
    -allowProvisioningUpdates \
    build

BUILD_RESULT=$?

if [ $BUILD_RESULT -eq 0 ]; then
    print_success "Build completed successfully"
    
    # Find the built .app
    APP_PATH=$(find "${IOS_DIR}/build" -name "DietDailyMobile.app" -path "*/Debug-iphoneos/*" 2>/dev/null | head -1)
    
    if [ -n "$APP_PATH" ]; then
        print_success "App built at: $APP_PATH"
        echo ""
        echo "To install, use:"
        echo "  ./scripts/install-ios-debug.sh"
    else
        print_warning "Could not locate built .app file"
    fi
else
    print_error "Build failed with exit code $BUILD_RESULT"
    exit $BUILD_RESULT
fi

