#!/bin/bash

# Upload development docker-compose file to the Pi so dev sync workflow can run

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f "pi_docker/docker-compose.dev.yml" ]; then
  echo "❌ 找不到 pi_docker/docker-compose.dev.yml"
  exit 1
fi

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
fi

PI_USER="${PI_USER:-gilko}"
PI_HOST="${PI_HOST:-10.1.1.85}"
PI_DIR="${PI_DIR:-~/diet-daily}"

echo "📤 上傳 docker-compose.dev.yml 到 Pi..."
rsync -av pi_docker/docker-compose.dev.yml "${PI_USER}@${PI_HOST}:${PI_DIR}/pi_docker/"

echo "✅ 完成，現在可使用 ./scripts/pi-dev-sync.sh"
