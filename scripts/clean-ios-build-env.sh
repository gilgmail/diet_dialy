#!/usr/bin/env bash

# iOS Build Environment Cleanup Script
# 清理 iOS 編譯環境：端口、快取、build artifacts

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/mobile/react-native-starter-kit/DietDailyMobile"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
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

CLEAN_NODE_MODULES="false"

usage() {
    cat <<'USAGE'
Usage: scripts/clean-ios-build-env.sh [options]

Options:
  --clean-node-modules    Also remove node_modules (requires reinstall)
  -h, --help             Show this help message and exit.
USAGE
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --clean-node-modules)
            CLEAN_NODE_MODULES="true"
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

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  iOS Build Environment Cleanup                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Stop ports
print_status "Stopping processes on ports 8080, 8081, 3000..."

PORTS=(8080 8081 3000)

if ! command -v lsof >/dev/null 2>&1; then
    print_warning "lsof not found. Skipping port cleanup."
else
    for port in "${PORTS[@]}"; do
        pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
        
        if [[ -z "$pids" ]]; then
            print_success "Port $port: No process found"
            continue
        fi
        
        echo "  Stopping processes on port $port: $pids"
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
            echo "  Force killing lingering processes: ${still_running[*]}"
            kill -9 "${still_running[@]}" 2>/dev/null || true
        fi
        
        print_success "Port $port: Cleaned"
    done
fi

# 2. Clean Watchman
print_status "Cleaning Watchman..."
if command -v watchman >/dev/null 2>&1; then
    watchman watch-del "$REPO_ROOT" 2>/dev/null || true
    watchman watch-del-all 2>/dev/null || true
    print_success "Watchman cleaned"
else
    print_warning "Watchman not found. Skipping."
fi

# 3. Clean Expo/Metro caches
print_status "Cleaning Expo / Metro caches..."
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    
    # Remove Expo cache
    if [ -d ".expo" ]; then
        rm -rf .expo
        print_success "Removed .expo directory"
    fi
    
    # Remove Metro cache
    if [ -d "node_modules/.cache/metro" ]; then
        rm -rf node_modules/.cache/metro
        print_success "Removed Metro cache"
    fi
    
    # Remove Expo cache in node_modules
    if [ -d "node_modules/.cache/expo" ]; then
        rm -rf node_modules/.cache/expo
        print_success "Removed Expo cache"
    fi
    
    # Remove Xcode env local
    if [ -f "ios/.xcode.env.local" ]; then
        rm -f ios/.xcode.env.local
        print_success "Removed ios/.xcode.env.local"
    fi
    
    cd "$REPO_ROOT"
else
    print_warning "App directory not found: $APP_DIR"
fi

# 4. Clean Xcode Build Artifacts
print_status "Cleaning Xcode build artifacts..."
if [ -d "$APP_DIR/ios" ]; then
    cd "$APP_DIR"
    
    # Remove DerivedData
    if [ -d "ios/DerivedData" ]; then
        rm -rf ios/DerivedData
        print_success "Removed ios/DerivedData"
    fi
    
    # Remove build directory
    if [ -d "ios/build" ]; then
        rm -rf ios/build
        print_success "Removed ios/build"
    fi
    
    # Clean Pods cache but keep Pods directory
    if [ -d "ios/Pods" ]; then
        cd ios
        pod cache clean --all 2>/dev/null || true
        cd ..
        print_success "Cleaned Pods cache"
    fi
    
    cd "$REPO_ROOT"
else
    print_warning "iOS directory not found: $APP_DIR/ios"
fi

# 5. Clean TypeScript build info
print_status "Cleaning TypeScript build info..."
find "$REPO_ROOT" -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
print_success "Removed TypeScript build info files"

# 6. Optional: Clean node_modules
if [[ "$CLEAN_NODE_MODULES" == "true" ]]; then
    print_status "Cleaning node_modules (this will require reinstall)..."
    if [ -d "$APP_DIR/node_modules" ]; then
        rm -rf "$APP_DIR/node_modules"
        print_success "Removed node_modules"
        print_warning "You will need to run 'npm install' in $APP_DIR"
    fi
fi

# 7. Clean npm/yarn cache (optional, commented out by default)
# print_status "Cleaning npm cache..."
# npm cache clean --force 2>/dev/null || true

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Environment Cleanup Complete! 🎉            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo "Ready for iOS build."

