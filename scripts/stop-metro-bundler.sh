#!/usr/bin/env bash

# Stop Metro bundler
# 停止 Metro bundler

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Stop Metro Bundler                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Metro is running
if ! lsof -ti tcp:8081 >/dev/null 2>&1; then
    print_warning "Metro bundler is not running on port 8081"
    exit 0
fi

# Get all PIDs using port 8081
PIDS=$(lsof -ti tcp:8081)

print_status "Stopping Metro bundler processes on port 8081..."
for pid in $PIDS; do
    echo "  Stopping process $pid..."
    kill $pid 2>/dev/null || true
done

sleep 2

# Check if any processes are still running
STILL_RUNNING=$(lsof -ti tcp:8081 2>/dev/null || true)
if [ -n "$STILL_RUNNING" ]; then
    print_warning "Some processes are still running, force killing..."
    for pid in $STILL_RUNNING; do
        kill -9 $pid 2>/dev/null || true
    done
fi

# Final check
if lsof -ti tcp:8081 >/dev/null 2>&1; then
    print_error "Failed to stop Metro bundler"
    exit 1
else
    print_success "Metro bundler stopped successfully"
fi


