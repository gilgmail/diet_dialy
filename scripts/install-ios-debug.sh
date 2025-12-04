#!/usr/bin/env bash

# Install iOS Debug version (DietDailyDev) to device
# 安裝已編譯的 Debug 版本到設備

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyDev"
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

# Find the built .app (could be DietDailyDev.app or DietDailyMobile.app depending on scheme)
print_status "Locating built app..."
APP_PATH=""

# First, try ios/build
APP_PATH=$(find "${IOS_DIR}/build" -name "*.app" -path "*/Debug-iphoneos/*" 2>/dev/null | head -1)

# Try DerivedData - check all possible locations and verify each one has Info.plist
if [ -z "$APP_PATH" ]; then
    for candidate in $(find ~/Library/Developer/Xcode/DerivedData -name "DietDailyDev.app" -type d 2>/dev/null | grep -E "(Build/Products|Index\.noindex/Build/Products)" | grep "Debug-iphoneos"); do
        if [ -f "$candidate/Info.plist" ]; then
            APP_PATH="$candidate"
            break
        fi
    done
fi

# If still not found, try any DietDailyDev.app and check if it's valid
if [ -z "$APP_PATH" ]; then
    for candidate in $(find ~/Library/Developer/Xcode/DerivedData -name "DietDailyDev.app" -type d 2>/dev/null | head -10); do
        if [ -f "$candidate/Info.plist" ]; then
            APP_PATH="$candidate"
            break
        fi
    done
fi

if [ -z "$APP_PATH" ]; then
    print_error "Could not find a valid built .app file"
    echo ""
    echo "所有找到的構建產物都缺少 Info.plist，表示構建未完成。"
    echo ""
    echo "請執行以下步驟："
    echo "1. 確保設備已連接並解鎖"
    echo "2. 運行構建腳本："
    echo "   ./scripts/build-ios-debug.sh"
    echo ""
    echo "如果構建持續失敗，請檢查："
    echo "- 設備連接狀態"
    echo "- Xcode 項目配置"
    echo "- 構建日誌：tail -50 /tmp/debug-build.log"
    exit 1
fi

# Verify the .app bundle is valid (should already be verified, but double-check)
print_status "Verifying app bundle..."
if [ ! -f "$APP_PATH/Info.plist" ]; then
    print_error "Invalid .app bundle: Info.plist missing"
    echo "  Path: $APP_PATH"
    echo ""
    echo "構建產物不完整。請重新運行構建腳本。"
    exit 1
fi

# Verify Bundle ID exists
ACTUAL_BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$APP_PATH/Info.plist" 2>/dev/null || echo "")
if [ -z "$ACTUAL_BUNDLE_ID" ] || [[ "$ACTUAL_BUNDLE_ID" == *"PRODUCT_BUNDLE_IDENTIFIER"* ]]; then
    print_error "Invalid .app bundle: CFBundleIdentifier missing or not resolved"
    echo "  Path: $APP_PATH/Info.plist"
    echo "  Actual CFBundleIdentifier: '$ACTUAL_BUNDLE_ID'"
    echo ""
    echo "構建產物中的 Bundle ID 不正確。請確保 Xcode 項目已正確配置，並重新運行構建腳本。"
    exit 1
fi

# Verify Bundle ID matches expected Debug ID
if [[ "$ACTUAL_BUNDLE_ID" != "$BUNDLE_ID" ]]; then
    print_error "Bundle ID mismatch in built app!"
    echo "  Expected: $BUNDLE_ID"
    echo "  Actual:   $ACTUAL_BUNDLE_ID"
    echo ""
    echo "構建產物中的 Bundle ID 不符合預期。請確保 Xcode 項目已正確配置，並重新運行構建腳本。"
    exit 1
fi

print_success "App bundle verified (Bundle ID: $ACTUAL_BUNDLE_ID)"
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
            print_status "Starting Metro bundler in background (dev-client mode)..."
            cd "$APP_DIR"
            # Use --dev-client for development builds, --lan to allow device connection
            nohup npx expo start --dev-client --lan > /tmp/metro-bundler.log 2>&1 &
            METRO_PID=$!
            sleep 5  # Give Metro more time to start
            
            # Check if Metro started successfully
            if kill -0 $METRO_PID 2>/dev/null && lsof -ti tcp:8081 >/dev/null 2>&1; then
                print_success "Metro bundler started (PID: $METRO_PID)"
                echo "Logs: /tmp/metro-bundler.log"
                echo ""
                echo "要停止 Metro bundler，執行:"
                echo "  kill $METRO_PID"
                echo ""
                echo "⚠️  確保設備和電腦在同一網絡上"
            else
                print_error "Failed to start Metro bundler"
                echo "請手動執行: cd $APP_DIR && npx expo start --dev-client --lan"
                echo "或檢查日誌: tail -f /tmp/metro-bundler.log"
            fi
        fi
    fi
    echo ""
    echo "📱 現在可以在設備上打開 DietDailyDev 應用程式了"
else
    print_error "Installation failed with exit code $INSTALL_RESULT"
    exit $INSTALL_RESULT
fi

