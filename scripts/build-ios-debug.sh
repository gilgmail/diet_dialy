#!/usr/bin/env bash

# Build iOS Debug version (DietDailyDev) without installing
# 只編譯 Debug 版本，不進行安裝

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyDev"
DEVICE_ID="00008140-00146D6A2610801C"

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

IOS_DIR="${APP_DIR}/ios"

# Prebuild to ensure Xcode project has correct bundle ID
print_status "Running expo prebuild to update Xcode project configuration..."
npx expo prebuild --platform ios --no-install || true

# Run pod install to sync Podfile.lock with sandbox
print_status "Running pod install to sync dependencies..."
cd "${IOS_DIR}"
pod install || {
    print_error "pod install failed"
    exit 1
}
cd "$APP_DIR"

# Clean build directory but don't delete generated files
# ReactCodegen generates these files during the build process
# They are created in build/generated/ios/ by the build system
print_status "Cleaning build directory..."
# Only clean if build directory exists and has content
if [ -d "${IOS_DIR}/build" ]; then
    # Remove build artifacts but preserve generated directory structure
    # The generated files will be recreated during build
    find "${IOS_DIR}/build" -type f -name "*.o" -delete 2>/dev/null || true
    find "${IOS_DIR}/build" -type d -name "*.app" -exec rm -rf {} + 2>/dev/null || true
    # Clean derived data
    rm -rf "${IOS_DIR}/build/Build" 2>/dev/null || true
    rm -rf "${IOS_DIR}/build/Intermediates.noindex" 2>/dev/null || true
    # Note: We don't delete build/generated as it will be populated during build
fi

# Build using expo run:ios to ensure app.config.ts Bundle ID is respected
# This is more reliable than xcodebuild for ensuring correct Bundle ID
print_status "Building Debug version using expo run:ios (this may take several minutes)..."
echo ""

# Use expo run:ios with --no-install to build without installing
# This ensures app.config.ts configuration is properly applied
# Note: We don't use --no-build-cache here as ReactCodegen needs to generate files
npx expo run:ios \
    --configuration Debug \
    --no-install \
    --device "$DEVICE_ID" \
    2>&1 | tee /tmp/debug-build.log | grep -E "(error|warning|BUILD|succeeded|failed|bundleIdentifier)" || true

BUILD_RESULT=$?

# Check for timeout or device connection issues
if grep -q "Timed out waiting\|Device is busy\|Connecting to" /tmp/debug-build.log 2>/dev/null; then
    print_warning "Build timed out or device is busy"
    echo ""
    echo "可能的原因："
    echo "1. 設備正在連接中，請稍候再試"
    echo "2. 設備被其他進程佔用"
    echo "3. 設備未解鎖或未信任此電腦"
    echo ""
    echo "建議："
    echo "1. 確保設備已解鎖"
    echo "2. 檢查設備是否被 Xcode 或其他工具佔用"
    echo "3. 重新連接設備"
    echo "4. 或使用模擬器進行構建"
    exit 1
fi

if [ $BUILD_RESULT -eq 0 ]; then
    print_success "Build completed successfully"
elif [ $BUILD_RESULT -eq 70 ]; then
    print_error "Build failed: Device connection timeout"
    echo ""
    echo "設備連接超時。請檢查："
    echo "1. 設備是否已連接並解鎖"
    echo "2. 設備是否信任此電腦"
    echo "3. 是否有其他進程正在使用設備"
    exit 1
else
    print_error "Build failed with exit code $BUILD_RESULT"
    echo ""
    echo "查看完整錯誤日誌："
    tail -50 /tmp/debug-build.log | grep -v "^$" | tail -20
    exit $BUILD_RESULT
fi

# Find the built .app in multiple possible locations
APP_PATH=""
# Check in ios/build first
APP_PATH=$(find "${IOS_DIR}/build" -name "*.app" -path "*/Debug-iphoneos/*" 2>/dev/null | head -1)
# Check in DerivedData if not found
if [ -z "$APP_PATH" ]; then
    APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "DietDailyDev.app" -path "*/Build/Products/Debug-iphoneos/*" 2>/dev/null | head -1)
fi

if [ -n "$APP_PATH" ]; then
    # Verify the .app bundle is complete
    if [ ! -f "$APP_PATH/Info.plist" ]; then
        print_error "Built .app is incomplete: Info.plist missing"
        echo "  Path: $APP_PATH"
        echo ""
        echo "構建產物不完整。這可能是因為："
        echo "1. 構建過程被中斷"
        echo "2. 構建配置有問題"
        echo "3. 設備連接問題導致構建失敗"
        echo ""
        echo "建議重新運行構建腳本。"
        exit 1
    fi
    
    print_success "App built at: $APP_PATH"
    
    # Verify Bundle ID
    ACTUAL_BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$APP_PATH/Info.plist" 2>/dev/null || echo "")
    EXPECTED_BUNDLE_ID="com.gilko.DietDailyMobile.dev"
    
    if [ -z "$ACTUAL_BUNDLE_ID" ]; then
        print_error "Bundle ID is missing in Info.plist"
        echo "  Path: $APP_PATH/Info.plist"
        echo ""
        echo "構建產物缺少 Bundle ID。請檢查 Xcode 項目配置。"
        exit 1
    fi
    
    if [[ "$ACTUAL_BUNDLE_ID" == "$EXPECTED_BUNDLE_ID" ]]; then
        print_success "Bundle ID verified: $ACTUAL_BUNDLE_ID"
    else
        print_error "Bundle ID mismatch!"
        echo "  Expected: $EXPECTED_BUNDLE_ID"
        echo "  Actual:   $ACTUAL_BUNDLE_ID"
        echo ""
        echo "⚠️  The Bundle ID is incorrect. This will cause installation to fail."
        echo "   The app needs to be rebuilt with the correct Bundle ID from the start."
        echo "   Please run this script again after ensuring expo prebuild applies the correct Bundle ID."
        exit 1
    fi
    
    echo ""
    echo "To install, use:"
    echo "  ./scripts/install-ios-debug.sh"
else
    print_warning "Could not locate built .app file"
    echo ""
    echo "構建可能未完成。請檢查："
    echo "1. 構建日誌：tail -50 /tmp/debug-build.log"
    echo "2. 設備連接狀態"
    echo "3. Xcode DerivedData 目錄"
fi

