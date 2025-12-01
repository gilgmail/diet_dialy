#!/usr/bin/env bash

# Fix Debug app name in Info.plist
# 修正 Debug 版本的應用程式名稱

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyMobile"
INFO_PLIST="${APP_DIR}/ios/DietDailyMobile/Info.plist"

if [ ! -f "$INFO_PLIST" ]; then
    echo "❌ Info.plist not found: $INFO_PLIST"
    exit 1
fi

echo "🔧 Updating CFBundleDisplayName to DietDailyDev for Debug builds..."

# Update CFBundleDisplayName
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName DietDailyDev" "$INFO_PLIST" 2>/dev/null || true

# Also update CFBundleName if it exists
/usr/libexec/PlistBuddy -c "Set :CFBundleName DietDailyDev" "$INFO_PLIST" 2>/dev/null || true

echo "✅ Info.plist updated"

