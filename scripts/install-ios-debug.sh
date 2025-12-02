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
    echo ""
    
    # Debug 版本需要 Metro bundler 運行
    print_status "Checking Metro bundler status..."
    
    # Check if Metro is running on port 8081
    if lsof -ti tcp:8081 >/dev/null 2>&1; then
        print_success "Metro bundler is already running on port 8081"
    else
        print_warning "Metro bundler is not running"
        echo ""
        echo "⚠️  Debug 版本需要 Metro bundler 才能運行"
        echo ""
        echo "請在另一個終端執行以下命令啟動 Metro bundler:"
        echo ""
        echo "  cd $APP_DIR"
        echo "  npx expo start"
        echo ""
        echo "或者使用以下命令自動啟動（會在背景運行）:"
        echo ""
        echo "  ./scripts/start-metro-bundler.sh"
        echo ""
        read -p "是否現在啟動 Metro bundler? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Starting Metro bundler in background..."
            cd "$APP_DIR"
            # Start Metro in background, redirect output to log file
            nohup npx expo start > /tmp/metro-bundler.log 2>&1 &
            METRO_PID=$!
            sleep 3
            
            # Check if Metro started successfully
            if kill -0 $METRO_PID 2>/dev/null && lsof -ti tcp:8081 >/dev/null 2>&1; then
                print_success "Metro bundler started (PID: $METRO_PID)"
                echo "Logs: /tmp/metro-bundler.log"
                echo ""
                echo "要停止 Metro bundler，執行:"
                echo "  kill $METRO_PID"
            else
                print_error "Failed to start Metro bundler"
                echo "請手動執行: cd $APP_DIR && npx expo start"
            fi
        fi
    fi
    echo ""
    echo "📱 現在可以在設備上打開 DietDailyDev 應用程式了"
else
    print_error "Installation failed with exit code $INSTALL_RESULT"
    exit $INSTALL_RESULT
fi

