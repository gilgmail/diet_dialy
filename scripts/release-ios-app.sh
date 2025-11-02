#!/usr/bin/env bash

# iOS release automation script.
# Builds the DietDailyMobile iOS app, bumps it to v1.0.0, archives the build,
# and optionally installs the resulting .ipa onto a connected device.

set -euo pipefail

APP_VERSION="1.0.0"
VERSION_TAG="v${APP_VERSION}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyMobile"
IOS_DIR="${APP_DIR}/ios"
RELEASE_DIR="${REPO_ROOT}/releaseIosApp"

DEFAULT_DEVICE_NAME="Gil-Golden"
DEFAULT_DEVICE_UDID="00008140-00146D6A2610801C"

INSTALL_AFTER_BUILD="false"
TARGET_DEVICE_UDID="${DEFAULT_DEVICE_UDID}"
TARGET_DEVICE_NAME="${DEFAULT_DEVICE_NAME}"
RUN_CLEAN_BUILD="false"

usage() {
  cat <<'USAGE'
Usage: scripts/release-ios-app.sh [options]

Options:
  --install             Install the generated .ipa onto a connected device.
  --udid <udid>         Target device UDID (defaults to Gil-Golden UDID).
  --device-name <name>  Friendly name used for log messages (defaults to Gil-Golden).
  --clean               Run pod install and clean derived data before building.
  --skip-install        Generate the .ipa without installing it (default behaviour).
  -h, --help            Show this help message and exit.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install)
      INSTALL_AFTER_BUILD="true"
      shift
      ;;
    --skip-install)
      INSTALL_AFTER_BUILD="false"
      shift
      ;;
    --udid)
      [[ $# -ge 2 ]] || { echo "Error: --udid requires a value" >&2; exit 1; }
      TARGET_DEVICE_UDID="$2"
      shift 2
      ;;
    --device-name)
      [[ $# -ge 2 ]] || { echo "Error: --device-name requires a value" >&2; exit 1; }
      TARGET_DEVICE_NAME="$2"
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

echo "============================================"
echo "🚀 DietDailyMobile iOS Release - ${VERSION_TAG}"
echo "============================================"
echo ""

mkdir -p "${RELEASE_DIR}"

echo "1️⃣ Updating Expo app.json to version ${APP_VERSION}..."
node <<'NODE' "${APP_DIR}/app.json" "${APP_VERSION}"
const fs = require("fs");
const path = process.argv[2];
const version = process.argv[3];
const data = JSON.parse(fs.readFileSync(path, "utf8"));
if (!data.expo) data.expo = {};
data.expo.version = version;
if (!data.expo.ios) data.expo.ios = {};
data.expo.ios.buildNumber = "1";
fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
NODE

echo "2️⃣ Ensuring Info.plist versions match..."
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${APP_VERSION}" "${IOS_DIR}/DietDailyMobile/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion 1" "${IOS_DIR}/DietDailyMobile/Info.plist"

if [[ "${RUN_CLEAN_BUILD}" == "true" ]]; then
  echo "3️⃣ Cleaning build artifacts..."
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

echo "4️⃣ Building archive..."
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

echo "5️⃣ Exporting .ipa to ${RELEASE_DIR}..."
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

if [[ "${INSTALL_AFTER_BUILD}" == "true" ]]; then
  echo ""
  echo "6️⃣ Installing ${IPA_BASENAME} onto ${TARGET_DEVICE_NAME} (${TARGET_DEVICE_UDID})..."
  if ! xcrun devicectl list devices 2>/dev/null | grep -q "${TARGET_DEVICE_UDID}"; then
    echo "   Device not found via xcrun devicectl. Available devices:"
    xcrun devicectl list devices || true
    echo "❌ Unable to locate device ${TARGET_DEVICE_UDID}."
    exit 1
  fi

  xcrun devicectl install app "${TARGET_DEVICE_UDID}" "${IPA_PATH}"
  echo "✅ Installation request sent to device."
fi

echo ""
echo "🎉 Done. You can distribute ${IPA_PATH} or install it using --install."
