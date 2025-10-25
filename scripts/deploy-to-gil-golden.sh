#!/bin/bash

# Deploy DietDaily Mobile to Gil-Golden iPhone
# This script builds and installs the iOS app with pre-deployment checks

set -e  # Exit on error

DEVICE_NAME="Gil-Golden"
DEVICE_ID="A23495EF-156D-5726-8391-01E2B18B8B90"
APP_DIR="mobile/react-native-starter-kit/DietDailyMobile"
BUNDLE_ID="com.gilko.DietDailyMobile"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  DietDaily Mobile - Deploy to Gil-Golden      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

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
    print_error "Device '$DEVICE_NAME' is not available: $DEVICE_STATUS"
    exit 1
fi
print_success "Device ready: $DEVICE_NAME ($DEVICE_STATUS)"

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

# Display build info
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}Build Configuration:${NC}"
echo -e "  Device: ${GREEN}$DEVICE_NAME${NC}"
echo -e "  Bundle ID: ${GREEN}$BUNDLE_ID${NC}"
if [ -n "$INSTALLED_VERSION" ]; then
    echo -e "  Current Version: ${GREEN}$INSTALLED_VERSION${NC}"
fi
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Build and deploy
print_status "Starting build process (this may take several minutes)..."
echo ""

# Run build (macOS uses gtimeout from coreutils, fallback to no timeout)
if command -v gtimeout &> /dev/null; then
    gtimeout 600 npx expo run:ios --device "$DEVICE_NAME" 2>&1
    BUILD_RESULT=$?
else
    npx expo run:ios --device "$DEVICE_NAME" 2>&1
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
