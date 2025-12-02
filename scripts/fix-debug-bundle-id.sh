#!/usr/bin/env bash

# Fix Debug app Bundle ID in compiled .app
# 修正已編譯 Debug 版本的 Bundle ID

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyMobile"
IOS_DIR="${APP_DIR}/ios"

# Find the built .app
APP_PATH=$(find "${IOS_DIR}/build" -name "DietDailyMobile.app" -path "*/Debug-iphoneos/*" 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
    # Try DerivedData
    APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "DietDailyMobile.app" -path "*/Debug-iphoneos/*" 2>/dev/null | head -1)
fi

if [ -z "$APP_PATH" ]; then
    echo "❌ Could not find built .app file"
    exit 1
fi

echo "🔧 Fixing Bundle ID in: $APP_PATH"

# Update Bundle ID
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.gilko.DietDailyMobile.dev" "$APP_PATH/Info.plist" 2>/dev/null || {
    echo "❌ Failed to update Bundle ID"
    exit 1
}

# Verify
ACTUAL_BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$APP_PATH/Info.plist" 2>/dev/null)
if [[ "$ACTUAL_BUNDLE_ID" == "com.gilko.DietDailyMobile.dev" ]]; then
    echo "✅ Bundle ID fixed: $ACTUAL_BUNDLE_ID"
    
    # Re-sign the app after modifying Info.plist
    echo "🔧 Re-signing app..."
    codesign --force --sign - --entitlements "${APP_PATH%/*}/DietDailyMobile.app.xcent" "$APP_PATH" 2>/dev/null || {
        # Try without entitlements file
        codesign --force --sign - "$APP_PATH" 2>/dev/null || {
            echo "⚠️  Warning: Could not re-sign app. You may need to rebuild."
        }
    }
    echo "✅ App re-signed"
else
    echo "❌ Bundle ID is still: $ACTUAL_BUNDLE_ID"
    exit 1
fi

