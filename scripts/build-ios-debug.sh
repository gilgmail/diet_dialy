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

# Set APP_VARIANT to ensure correct bundle ID
export APP_VARIANT="debug"

IOS_DIR="${APP_DIR}/ios"
PROJECT_FILE="${IOS_DIR}/DietDailyMobile.xcodeproj/project.pbxproj"
WORKSPACE="${IOS_DIR}/DietDailyMobile.xcworkspace"

# Prebuild to ensure Xcode project has correct bundle ID
print_status "Running expo prebuild to update Xcode project configuration..."
APP_VARIANT="debug" npx expo prebuild --platform ios --no-install || true

# Update Bundle ID in Xcode project for Debug configuration
print_status "Updating Bundle ID for Debug configuration..."
if [ -f "$PROJECT_FILE" ]; then
    # Update Debug configuration's PRODUCT_BUNDLE_IDENTIFIER
    # Use a more precise pattern to match only Debug configuration
    perl -i -pe 's/(name = Debug;[\s\S]*?PRODUCT_BUNDLE_IDENTIFIER = )com\.gilko\.DietDailyMobile(;)/$1com.gilko.DietDailyMobile.dev$2/g' "$PROJECT_FILE" 2>/dev/null || true
    
    # Verify the change
    DEBUG_BUNDLE_ID=$(grep -A 20 "name = Debug" "$PROJECT_FILE" | grep "PRODUCT_BUNDLE_IDENTIFIER" | head -1 | sed 's/.*PRODUCT_BUNDLE_IDENTIFIER = //;s/;.*//')
    if [[ "$DEBUG_BUNDLE_ID" == "com.gilko.DietDailyMobile.dev" ]]; then
        print_success "Debug Bundle ID configured correctly: $DEBUG_BUNDLE_ID"
    else
        print_warning "Debug Bundle ID is: $DEBUG_BUNDLE_ID (expected: com.gilko.DietDailyMobile.dev)"
    fi
fi

# Fix app name in Info.plist for Debug builds
print_status "Updating app name to DietDailyDev..."
"${REPO_ROOT}/scripts/fix-debug-app-name.sh" || true

# Clean build directory to ensure fresh build
print_status "Cleaning build directory..."
rm -rf "${IOS_DIR}/build" 2>/dev/null || true

# Build using xcodebuild directly to ensure correct Bundle ID
print_status "Building Debug version using xcodebuild (this may take several minutes)..."
echo ""

xcodebuild -workspace "$WORKSPACE" \
    -scheme "DietDailyMobile" \
    -configuration "Debug" \
    -sdk iphoneos \
    -derivedDataPath "${IOS_DIR}/build" \
    -allowProvisioningUpdates \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO \
    build 2>&1 | grep -E "(error|warning|BUILD|succeeded|failed)" || true

BUILD_RESULT=$?

if [ $BUILD_RESULT -eq 0 ]; then
    print_success "Build completed successfully"
    
    # Find the built .app
    APP_PATH=$(find "${IOS_DIR}/build" -name "DietDailyMobile.app" -path "*/Debug-iphoneos/*" 2>/dev/null | head -1)
    
    if [ -n "$APP_PATH" ]; then
        print_success "App built at: $APP_PATH"
        
        # Verify and fix Bundle ID if needed
        ACTUAL_BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$APP_PATH/Info.plist" 2>/dev/null || echo "")
        EXPECTED_BUNDLE_ID="com.gilko.DietDailyMobile.dev"
        
        if [[ "$ACTUAL_BUNDLE_ID" == "$EXPECTED_BUNDLE_ID" ]]; then
            print_success "Bundle ID verified: $ACTUAL_BUNDLE_ID"
        else
            print_warning "Bundle ID mismatch! Fixing..."
            echo "  Expected: $EXPECTED_BUNDLE_ID"
            echo "  Actual:   $ACTUAL_BUNDLE_ID"
            "${REPO_ROOT}/scripts/fix-debug-bundle-id.sh"
            print_success "Bundle ID fixed in Info.plist"
        fi
        
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

