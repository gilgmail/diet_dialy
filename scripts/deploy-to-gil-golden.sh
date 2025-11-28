#!/bin/bash

# Deploy DietDaily Mobile to Gil-Golden iPhone
# This script builds and installs the iOS app with pre-deployment checks

set -e  # Exit on error

DEVICE_NAME="Gil-Golden"
DEVICE_ID="00008140-00146D6A2610801C"
APP_DIR="mobile/react-native-starter-kit/DietDailyMobile"
DEBUG_APP_NAME="DietDailyDev"
RELEASE_APP_NAME="DietDailyMobile"
APP_NAME="$RELEASE_APP_NAME"

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

VARIANT="${1:-debug}"
case "$VARIANT" in
    debug)
        APP_NAME="$DEBUG_APP_NAME"
        BUNDLE_ID="com.gilko.DietDailyMobile.dev"
        APP_VARIANT_ENV="debug"
        VARIANT_LABEL="Debug"
        XCODE_CONFIGURATION="Debug"
        ;;
    release)
        APP_NAME="$RELEASE_APP_NAME"
        BUNDLE_ID="com.gilko.DietDailyMobile"
        APP_VARIANT_ENV="release"
        VARIANT_LABEL="Release"
        XCODE_CONFIGURATION="Release"
        ;;
    -h|--help)
        echo "Usage: $0 [debug|release]"
        echo "  debug   (default) - deploys the debug bundle ID (com.gilko.DietDailyMobile.dev)"
        echo "  release           - deploys the production bundle ID"
        exit 0
        ;;
    *)
        print_error "Unknown variant '$VARIANT'. Use 'release' or 'debug'."
        exit 1
        ;;
esac

export APP_VARIANT="$APP_VARIANT_ENV"

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
INSTALLED_VERSION=$(xcrun devicectl device info apps --device "$DEVICE_ID" 2>/dev/null | grep -A1 "$BUNDLE_ID" | tail -1 | awk '{print $1}')
if [ -n "$INSTALLED_VERSION" ]; then
    print_success "Current version on device: $INSTALLED_VERSION"
else
    print_warning "App not currently installed on device"
fi

# Clean watchman to prevent build issues
print_status "Cleaning watchman..."
watchman watch-del "$(pwd)" 2>/dev/null || true
watchman watch-project "$(pwd)" >/dev/null 2>&1
print_success "Watchman cleaned"

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
# Try device name first, fall back to UDID if name doesn't work
if command -v gtimeout &> /dev/null; then
    APP_VARIANT="$APP_VARIANT_ENV" gtimeout 600 npx expo run:ios \
        --device "$DEVICE_ID" \
        --configuration "$XCODE_CONFIGURATION" \
        --no-build-cache \
        2>&1
    BUILD_RESULT=$?
else
    APP_VARIANT="$APP_VARIANT_ENV" npx expo run:ios \
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

NEW_VERSION=$(xcrun devicectl device info apps --device "$DEVICE_ID" 2>/dev/null | grep -A1 "$BUNDLE_ID" | tail -1 | awk '{print $1}')

if [ -n "$NEW_VERSION" ]; then
    print_success "App successfully installed on device"
    echo -e "  Version: ${GREEN}$NEW_VERSION${NC}"

    # Show what changed if we had a previous version
    if [ -n "$INSTALLED_VERSION" ] && [ "$INSTALLED_VERSION" != "$NEW_VERSION" ]; then
        echo -e "  ${YELLOW}Updated from version $INSTALLED_VERSION${NC}"
    fi
else
    print_error "Failed to verify app installation"
    exit 1
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
echo ""
