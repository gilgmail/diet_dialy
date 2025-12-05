#!/bin/bash

# Deploy DietDaily Mobile to Gil-Golden iPhone
# This script builds and installs the iOS app with pre-deployment checks

set -e  # Exit on error

DEVICE_NAME="Gil-Golden"
DEVICE_ID="00008140-00146D6A2610801C"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_APP_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyMobile"
RELEASE_APP_NAME="DietDailyMobile"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
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

VARIANT="${1:-release}"
case "$VARIANT" in
    release)
        APP_NAME="$RELEASE_APP_NAME"
        APP_DIR="$RELEASE_APP_DIR"
        BUNDLE_ID="com.gilko.DietDailyMobile"
        APP_VARIANT_ENV="release"
        VARIANT_LABEL="Release"
        XCODE_CONFIGURATION="Release"
        ;;
    -h|--help)
        echo "Usage: $0 [release]"
        echo "  release (default) - deploys DietDailyMobile to device"
        exit 0
        ;;
    *)
        print_error "Unknown variant '$VARIANT'. Use 'release' only (Debug version removed)."
        exit 1
        ;;
esac

# No need to export APP_VARIANT since each directory has fixed config

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ${APP_NAME} - Deploy to Gil-Golden              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

print_status "Selected app variant: ${VARIANT_LABEL}"

# Check if running from project root
print_status "Checking project directory..."
if [ ! -d "$APP_DIR" ]; then
    print_error "Must run from project root (diet_dialy)"
    exit 1
fi
print_success "Project directory verified"

# Check device connection
print_status "Checking device connection..."
DEVICE_LINE=$(xcrun devicectl list devices | grep "$DEVICE_NAME")
if [ -z "$DEVICE_LINE" ]; then
    print_error "Device '$DEVICE_NAME' not found"
    echo "Available devices:"
    xcrun devicectl list devices
    exit 1
fi

# Extract state (column 4 onwards, may contain spaces like "available (paired)")
DEVICE_STATUS=$(echo "$DEVICE_LINE" | awk '{for(i=4;i<=NF-1;i++) printf "%s ", $i; print ""}' | sed 's/ $//')

# Check if device is available (connected or paired)
if [[ ! "$DEVICE_STATUS" =~ available ]]; then
    print_warning "Device '$DEVICE_NAME' status: $DEVICE_STATUS"
    print_warning "Device may need to be unlocked or trusted. Continuing anyway..."
else
    print_success "Device ready: $DEVICE_NAME ($DEVICE_STATUS)"
fi

# Check for uncommitted changes
print_status "Checking git status..."
if ! git diff-index --quiet HEAD -- "$APP_DIR"; then
    print_warning "Uncommitted changes detected in $APP_DIR"
    git status --short "$APP_DIR"
else
    print_success "No uncommitted changes"
fi

# Check current app version on device
print_status "Checking installed app version..."
# devicectl output format: AppName BundleID Version BuildNumber
# We need to find the line with our BUNDLE_ID and extract the app name (first column)
INSTALLED_APP_NAME=$(xcrun devicectl device info apps --device "$DEVICE_ID" 2>/dev/null | grep "$BUNDLE_ID" | awk '{print $1}' | head -1)
if [ -n "$INSTALLED_APP_NAME" ]; then
    print_success "Current app on device: $INSTALLED_APP_NAME (Bundle ID: $BUNDLE_ID)"
    INSTALLED_VERSION=$(xcrun devicectl device info apps --device "$DEVICE_ID" 2>/dev/null | grep "$BUNDLE_ID" | awk '{print $3}' | head -1)
    if [ -n "$INSTALLED_VERSION" ]; then
        echo "  Version: $INSTALLED_VERSION"
    fi
else
    print_warning "App with Bundle ID '$BUNDLE_ID' not currently installed on device"
fi

# Clean watchman to prevent build issues
print_status "Cleaning watchman..."
watchman watch-del "$(pwd)" 2>/dev/null || true
watchman watch-project "$(pwd)" >/dev/null 2>&1
print_success "Watchman cleaned"

# For Debug builds, sync source code if using symlink
if [[ "$VARIANT" == "debug" ]]; then
    print_status "Checking source code sync (Debug builds)..."
    TARGET_SRC="${APP_DIR}/src"
    if [ -L "$TARGET_SRC" ]; then
        print_warning "Source directory is a symlink. Syncing to ensure compatibility..."
        SYNC_SCRIPT="${REPO_ROOT}/scripts/sync-src-to-debug.sh"
        if [ -f "$SYNC_SCRIPT" ]; then
            "$SYNC_SCRIPT"
        else
            print_warning "Sync script not found. Continuing with symlink (may cause issues)..."
        fi
    else
        print_success "Source directory is not a symlink (already synced)"
    fi
fi

# Navigate to app directory
cd "$APP_DIR"

# Check environment files
print_status "Checking environment configuration..."
if [ ! -f ".env" ] && [ ! -f ".env.development" ]; then
    print_error "No .env or .env.development file found"
    exit 1
fi
print_success "Environment files present"

# Clear Expo/Metro caches (equivalent to --clear)
print_status "Clearing Expo / Metro caches..."
rm -rf .expo
rm -rf node_modules/.cache/metro
rm -rf node_modules/.cache/expo
rm -rf ios/.xcode.env.local
# Also clear watchman cache for symbol links
watchman watch-del-all 2>/dev/null || true
print_success "Caches cleared"

# Clean Xcode build artifacts (but keep Pods)
print_status "Cleaning Xcode build artifacts..."
if [ -d "ios" ]; then
    rm -rf ios/DerivedData
    rm -rf ios/build
    rm -rf ios/.xcode.env.local
    # Clean Pods cache but keep Pods directory
    if [ -d "ios/Pods" ]; then
        cd ios && pod cache clean --all 2>/dev/null || true
        cd ..
    fi
    print_success "Xcode build artifacts cleaned"
else
    print_warning "No ios directory found, skipping Xcode clean"
fi

# Display build info
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}Build Configuration:${NC}"
echo -e "  App: ${GREEN}${APP_NAME}${NC}"
echo -e "  Device: ${GREEN}$DEVICE_NAME${NC}"
echo -e "  Variant: ${GREEN}${VARIANT_LABEL}${NC}"
echo -e "  Bundle ID: ${GREEN}$BUNDLE_ID${NC}"
if [ -n "$INSTALLED_VERSION" ]; then
    echo -e "  Current Version: ${GREEN}$INSTALLED_VERSION${NC}"
fi
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Check device connection method
print_status "Checking device connection method..."
DEVICE_INFO=$(xcrun devicectl list devices | grep "$DEVICE_NAME")
if echo "$DEVICE_INFO" | grep -q "network\|WiFi\|wireless"; then
    print_success "Device connected via network/WiFi"
else
    print_warning "Device connection method: $(echo "$DEVICE_INFO" | awk '{print $NF}')"
    print_warning "If build fails, ensure device is on same WiFi network"
fi

# Build and deploy
print_status "Starting clean build process (this may take several minutes)..."
echo ""

# Run build with clean flag
# Using --no-build-cache to ensure fresh build (clears native derived data)
# No need to set APP_VARIANT since each directory has fixed config
if command -v gtimeout &> /dev/null; then
    gtimeout 600 npx expo run:ios \
        --device "$DEVICE_ID" \
        --configuration "$XCODE_CONFIGURATION" \
        --no-build-cache \
        2>&1
    BUILD_RESULT=$?
else
    npx expo run:ios \
        --device "$DEVICE_ID" \
        --configuration "$XCODE_CONFIGURATION" \
        --no-build-cache \
        2>&1
    BUILD_RESULT=$?
fi

# Check build result
echo ""
if [ $BUILD_RESULT -eq 0 ]; then
    print_success "Build completed successfully"
elif [ $BUILD_RESULT -eq 124 ]; then
    print_warning "Build process timed out, but may have succeeded"
    echo "Checking device installation status..."
else
    print_error "Build failed with exit code $BUILD_RESULT"
    exit $BUILD_RESULT
fi

# Verify installation
print_status "Verifying app installation..."
sleep 2  # Give device time to register app

# devicectl output format: AppName BundleID Version BuildNumber
NEW_APP_NAME=$(xcrun devicectl device info apps --device "$DEVICE_ID" 2>/dev/null | grep "$BUNDLE_ID" | awk '{print $1}' | head -1)
NEW_VERSION=$(xcrun devicectl device info apps --device "$DEVICE_ID" 2>/dev/null | grep "$BUNDLE_ID" | awk '{print $3}' | head -1)

if [ -n "$NEW_APP_NAME" ]; then
    print_success "App successfully installed on device"
    echo -e "  App: ${GREEN}$NEW_APP_NAME${NC}"
    if [ -n "$NEW_VERSION" ]; then
        echo -e "  Version: ${GREEN}$NEW_VERSION${NC}"
    fi

    # Show what changed if we had a previous version
    if [ -n "$INSTALLED_VERSION" ] && [ -n "$NEW_VERSION" ] && [ "$INSTALLED_VERSION" != "$NEW_VERSION" ]; then
        echo -e "  ${YELLOW}Updated from version $INSTALLED_VERSION${NC}"
    fi
else
    print_error "Failed to verify app installation"
    exit 1
fi

# For Debug builds, check Metro bundler status
if [[ "$VARIANT" == "debug" ]]; then
    echo ""
    print_status "Checking Metro bundler status (required for Debug builds)..."
    
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
        echo "  npx expo start --dev-client --lan"
        echo ""
        echo "或者使用以下命令自動啟動（會在背景運行）:"
        echo ""
        echo "  ./scripts/start-metro-bundler.sh --background"
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
                echo "或"
                echo "  ./scripts/stop-metro-bundler.sh"
                echo ""
                echo "⚠️  確保設備和電腦在同一網絡上"
            else
                print_error "Failed to start Metro bundler"
                echo "請手動執行: cd $APP_DIR && npx expo start --dev-client --lan"
                echo "或檢查日誌: tail -f /tmp/metro-bundler.log"
            fi
        fi
    fi
fi

# Show recent git commits for context
echo ""
print_status "Recent changes deployed:"
cd ../../..  # Back to project root
git log -3 --oneline --no-decorate

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Deployment Complete! 🎉                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "App is ready to use on ${GREEN}$DEVICE_NAME${NC}"
if [[ "$VARIANT" == "debug" ]]; then
    echo ""
    echo "⚠️  Debug 版本需要 Metro bundler 運行才能正常使用"
    echo "   如果看到 \"no script URL provided\" 錯誤，請確保 Metro bundler 正在運行"
fi
echo ""
