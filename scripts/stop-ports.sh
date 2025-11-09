#!/usr/bin/env bash

set -euo pipefail

PORTS=(8080 8081)

if ! command -v lsof >/dev/null 2>&1; then
  echo "lsof not found. Please install it to use this script." >&2
  exit 1
fi

for port in "${PORTS[@]}"; do
  pids=$(lsof -ti tcp:"$port" || true)

  if [[ -z "$pids" ]]; then
    echo "No process found on port $port"
    continue
  fi

  echo "Stopping processes on port $port: $pids"
  # Try graceful termination first
  kill $pids 2>/dev/null || true
  sleep 1

  # Force kill if still running
  still_running=()
  for pid in $pids; do
    if kill -0 "$pid" 2>/dev/null; then
      still_running+=("$pid")
    fi
  done

  if [[ ${#still_running[@]} -gt 0 ]]; then
    echo "Force killing lingering processes: ${still_running[*]}"
    kill -9 "${still_running[@]}" 2>/dev/null || true
  fi
done

echo "Done."
