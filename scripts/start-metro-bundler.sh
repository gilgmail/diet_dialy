#!/usr/bin/env bash

# Start Metro bundler for Debug iOS builds
# 啟動 Metro bundler 供 Debug iOS 版本使用

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyDev"

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
echo -e "${BLUE}║  Start Metro Bundler for Debug Builds          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Metro is already running
if lsof -ti tcp:8081 >/dev/null 2>&1; then
    METRO_PID=$(lsof -ti tcp:8081 | head -1)
    print_warning "Metro bundler is already running on port 8081 (PID: $METRO_PID)"
    echo ""
    read -p "是否要停止現有的 Metro bundler 並重新啟動? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Stopping existing Metro bundler..."
        kill $METRO_PID 2>/dev/null || true
        sleep 2
        # Force kill if still running
        if lsof -ti tcp:8081 >/dev/null 2>&1; then
            kill -9 $(lsof -ti tcp:8081) 2>/dev/null || true
        fi
        print_success "Stopped existing Metro bundler"
    else
        print_success "Using existing Metro bundler"
        exit 0
    fi
fi

# Navigate to app directory
cd "$APP_DIR"

# Check if we should run in background
BACKGROUND="${1:-}"
CLEAR_CACHE="${2:-}"

# Clear cache if requested or if --clear flag is provided
if [[ "$CLEAR_CACHE" == "--clear" ]] || [[ "$1" == "--clear" ]]; then
    print_status "Clearing Metro bundler cache..."
    rm -rf .expo
    rm -rf node_modules/.cache
    watchman watch-del-all 2>/dev/null || true
    print_success "Cache cleared"
fi

if [[ "$BACKGROUND" == "--background" ]] || [[ "$BACKGROUND" == "-b" ]]; then
    print_status "Starting Metro bundler in background (dev-client mode)..."
    # Use --dev-client for development builds, --lan to allow device connection
    # Add --clear if cache was cleared
    CMD="npx expo start --dev-client --lan"
    if [[ "$CLEAR_CACHE" == "--clear" ]] || [[ "$1" == "--clear" ]]; then
        CMD="$CMD --clear"
    fi
    nohup $CMD > /tmp/metro-bundler.log 2>&1 &
    METRO_PID=$!
    sleep 5  # Give Metro more time to start
    
    if kill -0 $METRO_PID 2>/dev/null && lsof -ti tcp:8081 >/dev/null 2>&1; then
        print_success "Metro bundler started in background (PID: $METRO_PID)"
        echo "Logs: /tmp/metro-bundler.log"
        echo ""
        echo "要停止 Metro bundler，執行:"
        echo "  kill $METRO_PID"
        echo "或"
        echo "  ./scripts/stop-metro-bundler.sh"
        echo ""
        echo "⚠️  確保設備和電腦在同一網絡上"
        echo "    Metro bundler 運行在端口 8081（不是 8080）"
    else
        print_error "Failed to start Metro bundler"
        echo "檢查日誌: tail -f /tmp/metro-bundler.log"
        exit 1
    fi
else
    print_status "Starting Metro bundler (foreground mode, dev-client)..."
    echo ""
    echo "按 Ctrl+C 停止 Metro bundler"
    echo ""
    echo "⚠️  確保設備和電腦在同一網絡上"
    echo "    Metro bundler 運行在端口 8081（不是 8080）"
    echo ""
    # Use --dev-client for development builds, --lan to allow device connection
    CMD="npx expo start --dev-client --lan"
    if [[ "$CLEAR_CACHE" == "--clear" ]] || [[ "$1" == "--clear" ]]; then
        CMD="$CMD --clear"
    fi
    $CMD
fi

