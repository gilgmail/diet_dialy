#!/usr/bin/env bash

# Install a DietDailyMobile .ipa onto a connected iOS device.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RELEASE_DIR="${REPO_ROOT}/releaseIosApp"
DEFAULT_DEVICE_NAME="Gil-Golden"

IPA_PATH=""
TARGET_DEVICE_UDID=""
TARGET_DEVICE_NAME="${DEFAULT_DEVICE_NAME}"

PYTHON_BIN="${PYTHON:-python3}"
if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
  elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
  else
    echo "❌ Neither python3 nor python found. Please install Python 3 or set \$PYTHON." >&2
    exit 1
  fi
fi

LATEST_IPA="$("${PYTHON_BIN}" - "${RELEASE_DIR}" <<'PY'
import os, sys

release_dir = sys.argv[1]
if not os.path.isdir(release_dir):
    sys.exit(0)

ipa_files = []
for entry in os.listdir(release_dir):
    if entry.lower().endswith(".ipa"):
        full = os.path.join(release_dir, entry)
        if os.path.isfile(full):
            ipa_files.append((os.path.getmtime(full), full))

if not ipa_files:
    sys.exit(0)

ipa_files.sort(reverse=True)
print(ipa_files[0][1])
PY
)"

if [[ -n "${LATEST_IPA}" ]]; then
  IPA_PATH="${LATEST_IPA}"
fi

usage() {
  cat <<'USAGE'
Usage: scripts/install-ios-app.sh [options]

Options:
  --ipa <path>          Path to the .ipa file (defaults to latest build in releaseIosApp/).
  --udid <udid>         Target device UDID.
  --device-name <name>  Friendly device name (defaults to Gil-Golden).
  --list-devices        Show detected devices and exit.
  -h, --help            Show this help message and exit.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ipa)
      [[ $# -ge 2 ]] || { echo "Error: --ipa requires a value" >&2; exit 1; }
      IPA_PATH="$2"
      shift 2
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
    --list-devices)
      echo "🔍 Available devices:"
      xcrun devicectl list devices
      exit 0
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

if [[ -z "${IPA_PATH}" ]]; then
  echo "❌ 未找到任何 .ipa 檔案於 ${RELEASE_DIR}。請先執行發行腳本或使用 --ipa 指定檔案。" >&2
  exit 1
fi

if [[ ! -f "${IPA_PATH}" ]]; then
  echo "❌ IPA not found at ${IPA_PATH}. Use --ipa to specify the file." >&2
  exit 1
fi

echo "============================================"
echo "📲 Installing DietDailyMobile"
echo "============================================"
echo "IPA: ${IPA_PATH}"
echo ""

DEVICE_LIST_OUTPUT="$(xcrun devicectl list devices --json-output - 2>/dev/null || true)"
if [[ -z "${DEVICE_LIST_OUTPUT}" ]]; then
  echo "❌ Failed to query connected devices via xcrun devicectl." >&2
  exit 1
fi

DEVICE_JSON="$(
  DEVICE_LIST_OUTPUT="${DEVICE_LIST_OUTPUT}" "${PYTHON_BIN}" <<'PY'
import os, sys

text = os.environ["DEVICE_LIST_OUTPUT"]
start = text.find('{')
if start == -1:
    sys.exit(1)
sys.stdout.write(text[start:])
PY
)"

if [[ -z "${DEVICE_JSON}" ]]; then
  echo "❌ Unable to parse device list JSON." >&2
  xcrun devicectl list devices || true
  exit 1
fi

RESOLVED="$(JSON_INPUT="${DEVICE_JSON}" "${PYTHON_BIN}" - "${TARGET_DEVICE_UDID}" "${TARGET_DEVICE_NAME}" <<'PY'
import json, os, sys

data = json.loads(os.environ["JSON_INPUT"])
requested_udid = sys.argv[1]
requested_name = sys.argv[2]

devices = data.get("result", {}).get("devices", [])

def is_ios(device):
    return device.get("hardwareProperties", {}).get("platform") == "iOS"

def extract(device):
    udid = device.get("hardwareProperties", {}).get("udid")
    name = device.get("deviceProperties", {}).get("name") or device.get("identifier")
    return udid, name

resolved = None

if requested_udid:
    for device in devices:
        udid, name = extract(device)
        if udid == requested_udid:
            resolved = (udid, name)
            break

if resolved is None and requested_name:
    for device in devices:
        if not is_ios(device):
            continue
        udid, name = extract(device)
        if name == requested_name:
            resolved = (udid, name)
            break

if resolved is None:
    for device in devices:
        if not is_ios(device):
            continue
        udid, name = extract(device)
        if udid:
            resolved = (udid, name)
            break

if resolved:
    print(f"{resolved[0]}|{resolved[1]}")
PY
)"

if [[ -z "${RESOLVED}" ]]; then
  echo "   Device not found. Available devices:"
  xcrun devicectl list devices || true
  echo "❌ Unable to find a physical iOS device to deploy."
  exit 1
fi

TARGET_DEVICE_UDID="${RESOLVED%%|*}"
TARGET_DEVICE_NAME="${RESOLVED#*|}"

DEV_MODE_STATUS="$(
  JSON_INPUT="${DEVICE_JSON}" "${PYTHON_BIN}" - "${TARGET_DEVICE_UDID}" <<'PY'
import json, os, sys

data = json.loads(os.environ["JSON_INPUT"])
target_udid = sys.argv[1]

for device in data.get("result", {}).get("devices", []):
    hardware = device.get("hardwareProperties", {})
    if hardware.get("udid") == target_udid:
        status = device.get("deviceProperties", {}).get("developerModeStatus", "unknown")
        print(status)
        break
PY
)"

if [[ "${DEV_MODE_STATUS}" != "enabled" ]]; then
  echo "❌ Developer Mode is ${DEV_MODE_STATUS:-not enabled} on ${TARGET_DEVICE_NAME}."
  echo "請在 iPhone 上開啟「設定 > 隱私與安全性 > Developer Mode」，開啟後依照指示重新啟動並再次解鎖裝置。"
  exit 1
fi

echo "🔌 Target device: ${TARGET_DEVICE_NAME} (${TARGET_DEVICE_UDID})"
echo "🚀 Installing..."
xcrun devicectl device install app --device "${TARGET_DEVICE_UDID}" "${IPA_PATH}"
echo "✅ Installation request sent to device."
