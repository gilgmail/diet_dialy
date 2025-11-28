#!/usr/bin/env bash

# iOS release automation script.
# Builds the DietDailyMobile iOS app, bumps it to v1.0.0, and archives the build.

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
Usage: scripts/release-ios-app.sh [options]

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

mkdir -p "${RELEASE_DIR}"

echo "1️⃣ Ensuring Info.plist versions match..."
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${APP_VERSION}" "${IOS_DIR}/DietDailyMobile/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${IOS_BUILD_NUMBER}" "${IOS_DIR}/DietDailyMobile/Info.plist"

if [[ "${RUN_CLEAN_BUILD}" == "true" ]]; then
  echo "2️⃣ Cleaning build artifacts..."
  rm -rf "${IOS_DIR}/build"
  if command -v xcodebuild >/dev/null 2>&1; then
    xcodebuild -workspace "${IOS_DIR}/DietDailyMobile.xcworkspace" \
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
xcodebuild -workspace "${IOS_DIR}/DietDailyMobile.xcworkspace" \
  -scheme "DietDailyMobile" \
  -configuration Release \
  -archivePath "${ARCHIVE_PATH}" \
  -allowProvisioningUpdates \
  archive

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
echo "🎉 Done. Use scripts/install-ios-app.sh to deploy the IPA to a device."
