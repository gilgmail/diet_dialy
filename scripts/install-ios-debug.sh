#!/usr/bin/env bash

# Install iOS Debug version (DietDailyDev) to device
# 安裝已編譯的 Debug 版本到設備

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyMobile"
IOS_DIR="${APP_DIR}/ios"

DEVICE_NAME="Gil-Golden"
DEVICE_ID="00008140-00146D6A2610801C"
BUNDLE_ID="com.gilko.DietDailyMobile.dev"

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
echo -e "${BLUE}║  Install DietDailyDev (Debug) to Device        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check device connection
print_status "Checking device connection..."
DEVICE_LINE=$(xcrun devicectl list devices 2>/dev/null | grep "$DEVICE_NAME" || true)
if [ -z "$DEVICE_LINE" ]; then
    print_error "Device '$DEVICE_NAME' not found"
    echo "Available devices:"
    xcrun devicectl list devices
    exit 1
fi
print_success "Device found: $DEVICE_NAME"

# Find the built .app
print_status "Locating built app..."
APP_PATH=$(find "${IOS_DIR}/build" -name "DietDailyMobile.app" -path "*/Debug-iphoneos/*" 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
    # Try DerivedData
    APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "DietDailyMobile.app" -path "*/Debug-iphoneos/*" 2>/dev/null | head -1)
fi

if [ -z "$APP_PATH" ]; then
    print_error "Could not find built .app file"
    echo "Please build the app first using:"
    echo "  ./scripts/build-ios-debug.sh"
    echo ""
    echo "Or use:"
    echo "  ./scripts/deploy-to-gil-golden.sh debug"
    exit 1
fi

print_success "Found app at: $APP_PATH"

# Install using devicectl
print_status "Installing app to device..."
xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"

INSTALL_RESULT=$?

if [ $INSTALL_RESULT -eq 0 ]; then
    print_success "App installed successfully"
    echo ""
    echo "App: DietDailyDev"
    echo "Bundle ID: $BUNDLE_ID"
    echo "Device: $DEVICE_NAME"
else
    print_error "Installation failed with exit code $INSTALL_RESULT"
    exit $INSTALL_RESULT
fi

