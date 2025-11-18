#!/bin/bash

# Sync src/app changes to Pi and ensure dev container is running
# Requires docker-compose.dev.yml on the Pi side.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
fi

PI_USER="${PI_USER:-gilko}"
PI_HOST="${PI_HOST:-10.1.1.85}"
PI_DIR="${PI_DIR:-~/diet-daily}"

changes=$(git status --porcelain src/app)

if [ -z "$changes" ]; then
  echo "✅ src/app 沒有待同步的變更"
  exit 0
fi

upload_files=()
delete_files=()

while IFS= read -r line; do
  status="${line:0:2}"
  path="${line:3}"

  if [[ "$status" == R* ]]; then
    old_path="${path%% -> *}"
    new_path="${path##* -> }"
    delete_files+=("$old_path")
    upload_files+=("$new_path")
  elif [[ "$status" == "D " || "$status" == " D" || "$status" == "DD" ]]; then
    delete_files+=("$path")
  else
    upload_files+=("$path")
  fi
done <<< "$changes"

echo "📂 將同步以下檔案到 Pi："
for file in "${upload_files[@]}"; do
  echo "  - $file"
done

if [ "${#delete_files[@]}" -gt 0 ]; then
  echo "🗑️ 會在 Pi 刪除以下檔案："
  for file in "${delete_files[@]}"; do
    echo "  - $file"
  done
fi

read -p "繼續同步並啟動 dev server？(y/N) " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "⚠️ 已取消同步"
  exit 1
fi

if [ "${#upload_files[@]}" -gt 0 ]; then
  echo "📤 上傳檔案..."
  rsync -av --relative "${upload_files[@]/#/.\/}" "${PI_USER}@${PI_HOST}:${PI_DIR}/"
fi

if [ "${#delete_files[@]}" -gt 0 ]; then
  echo "🧹 刪除舊檔案..."
  for file in "${delete_files[@]}"; do
    ssh "${PI_USER}@${PI_HOST}" "rm -f ${PI_DIR}/${file}"
  done
fi

echo "🚀 確保 dev 容器執行中..."
ssh "${PI_USER}@${PI_HOST}" "cd ${PI_DIR}/pi_docker && docker compose -f docker-compose.dev.yml up -d"

echo "✅ 已同步完成，可透過 Pi dev 連線檢視最新結果"
