#!/usr/bin/env bash

# Build iOS Release version (DietDailyMobile) and generate .ipa file
# 編譯 iOS Release 版本並生成 .ipa 檔案

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyMobile"
IOS_DIR="${APP_DIR}/ios"
RELEASE_DIR="${REPO_ROOT}/releaseIosApp"
CONFIG_FILE="${SCRIPT_DIR}/release-ios-app.conf"

RUN_CLEAN_BUILD="false"

usage() {
  cat <<'USAGE'
Usage: scripts/build-ios-release.sh [options]

Options:
  --config <path>      Specify custom config file (default: scripts/release-ios-app.conf).
  --clean               Run pod install and clean derived data before building.
  -h, --help            Show this help message and exit.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --config)
      if [[ -z "${2:-}" ]]; then
        echo "Missing value for --config" >&2
        exit 1
      fi
      CONFIG_FILE="$2"
      shift 2
      ;;
    --clean)
      RUN_CLEAN_BUILD="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "❌ Configuration file not found: ${CONFIG_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "${CONFIG_FILE}"

APP_VERSION="${APP_VERSION:-}"
IOS_BUILD_NUMBER="${IOS_BUILD_NUMBER:-1}"

if [[ -z "${APP_VERSION}" ]]; then
  echo "❌ APP_VERSION is not set in ${CONFIG_FILE}" >&2
  exit 1
fi

VERSION_TAG="v${APP_VERSION}"

echo "============================================"
echo "🚀 DietDailyMobile iOS Release - ${VERSION_TAG}"
echo "============================================"
echo "Using config: ${CONFIG_FILE}"
echo "  APP_VERSION     = ${APP_VERSION}"
echo "  IOS_BUILD_NUMBER= ${IOS_BUILD_NUMBER}"
echo ""

# Automatically sync source code from DietDailyDev to DietDailyMobile
# DietDailyMobile/src is not tracked in Git, so we always sync before building
SOURCE_DEV="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyDev/src"
SYNC_SCRIPT="${SCRIPT_DIR}/sync-src-to-release.sh"
if [ -d "$SOURCE_DEV" ] && [ -f "$SYNC_SCRIPT" ]; then
    # Always sync before building Release (DietDailyMobile/src is not in Git)
    echo "🔄 Syncing source code from DietDailyDev to DietDailyMobile..."
    echo "   (DietDailyMobile/src is not tracked in Git, syncing from DietDailyDev)"
    echo ""
    # Run sync script non-interactively
    bash "$SYNC_SCRIPT" --yes || {
        echo "❌ Sync failed. Cannot proceed with Release build."
        echo "   Please run ./scripts/sync-src-to-release.sh manually"
        exit 1
    }
    echo ""
fi

mkdir -p "${RELEASE_DIR}"

echo "1️⃣ Ensuring Info.plist versions match..."
INFO_PLIST="${IOS_DIR}/DietDailyMobile/Info.plist"
if [[ ! -f "${INFO_PLIST}" ]]; then
  echo "⚠️  Info.plist not found at ${INFO_PLIST}"
  echo "   Running expo prebuild to generate iOS project..."
  cd "${APP_DIR}"
  npx expo prebuild --platform ios --no-install || true
  if [[ ! -f "${INFO_PLIST}" ]]; then
    echo "❌ Failed to generate Info.plist. Please run 'npx expo prebuild --platform ios --clean' manually." >&2
    exit 1
  fi
fi
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${APP_VERSION}" "${INFO_PLIST}" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Add :CFBundleShortVersionString string ${APP_VERSION}" "${INFO_PLIST}"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${IOS_BUILD_NUMBER}" "${INFO_PLIST}" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Add :CFBundleVersion string ${IOS_BUILD_NUMBER}" "${INFO_PLIST}"

# Ensure workspace exists (run pod install if needed)
WORKSPACE="${IOS_DIR}/DietDailyMobile.xcworkspace"
if [[ ! -d "${WORKSPACE}" ]]; then
  echo "2️⃣ Workspace not found, running pod install..."
  (cd "${IOS_DIR}" && pod install)
  if [[ ! -d "${WORKSPACE}" ]]; then
    echo "❌ Failed to create workspace. Please run 'cd ${IOS_DIR} && pod install' manually." >&2
    exit 1
  fi
fi

if [[ "${RUN_CLEAN_BUILD}" == "true" ]]; then
  echo "2️⃣ Cleaning build artifacts..."
  rm -rf "${IOS_DIR}/build"
  if command -v xcodebuild >/dev/null 2>&1; then
    xcodebuild -workspace "${WORKSPACE}" \
      -scheme "DietDailyMobile" \
      -configuration Release \
      clean
  fi
  echo "   Running pod install..."
  (cd "${IOS_DIR}" && pod install)
fi

ARCHIVE_PATH="${RELEASE_DIR}/DietDailyMobile-${VERSION_TAG}.xcarchive"
IPA_BASENAME="DietDailyMobile-${VERSION_TAG}"
IPA_PATH="${RELEASE_DIR}/${IPA_BASENAME}.ipa"

echo "3️⃣ Building archive..."
echo "   Note: If signing fails, ensure you have set up a development team in Xcode:"
echo "   - Open ${WORKSPACE} in Xcode"
echo "   - Select DietDailyMobile target → Signing & Capabilities"
echo "   - Choose your development team for Release configuration"
echo ""

# Try to build with automatic signing
xcodebuild -workspace "${WORKSPACE}" \
  -scheme "DietDailyMobile" \
  -configuration Release \
  -archivePath "${ARCHIVE_PATH}" \
  -allowProvisioningUpdates \
  archive 2>&1 | tee /tmp/release-build.log

BUILD_RESULT=${PIPESTATUS[0]}

if [[ ${BUILD_RESULT} -ne 0 ]]; then
  echo ""
  echo "❌ Archive failed. Checking error details..."
  if grep -q "requires a development team" /tmp/release-build.log 2>/dev/null; then
    echo ""
    echo "⚠️  簽名錯誤：需要在 Xcode 中設定開發團隊"
    echo ""
    echo "解決方案："
    echo "1. 在 Xcode 中設定（推薦）："
    echo "   open ${WORKSPACE}"
    echo "   然後選擇 DietDailyMobile target → Signing & Capabilities → 選擇開發團隊"
    echo ""
    echo "2. 或使用 deploy-to-gil-golden.sh（自動處理簽名）："
    echo "   ./scripts/deploy-to-gil-golden.sh release"
    echo ""
    exit 1
  else
    echo "查看完整錯誤日誌："
    tail -30 /tmp/release-build.log
    exit ${BUILD_RESULT}
  fi
fi

EXPORT_OPTIONS_PLIST="$(mktemp)"
cat <<'PLIST' > "${EXPORT_OPTIONS_PLIST}"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>development</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>uploadBitcode</key>
  <false/>
  <key>compileBitcode</key>
  <false/>
</dict>
</plist>
PLIST

echo "4️⃣ Exporting .ipa to ${RELEASE_DIR}..."
xcodebuild -exportArchive \
  -archivePath "${ARCHIVE_PATH}" \
  -exportOptionsPlist "${EXPORT_OPTIONS_PLIST}" \
  -exportPath "${RELEASE_DIR}" \
  -allowProvisioningUpdates

rm -f "${EXPORT_OPTIONS_PLIST}"

if [[ -f "${RELEASE_DIR}/DietDailyMobile.ipa" ]]; then
  mv -f "${RELEASE_DIR}/DietDailyMobile.ipa" "${IPA_PATH}"
fi

if [[ ! -f "${IPA_PATH}" ]]; then
  echo "❌ Failed to produce ${IPA_PATH}" >&2
  exit 1
fi

echo ""
echo "✅ Release artifact ready: ${IPA_PATH}"
echo ""
echo "🎉 Done. Use scripts/install-ios-release.sh to deploy the IPA to a device."

