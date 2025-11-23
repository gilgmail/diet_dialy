#!/bin/bash

# Deploy Diet Daily to Raspberry Pi 5 (VPN Connection)
# Target: Use when connected via VPN
# This script is for VPN connections, use deploy-to-pi.sh for direct network connections

set -e

# Load environment variables from .env file
if [ -f "$(dirname "$0")/../.env" ]; then
    set -a
    source "$(dirname "$0")/../.env"
    set +a
fi

# Configuration for VPN connection
# Override these in .env file or export before running:
# export PI_HOST_VPN="10.42.0.1"  # VPN IP address (default from SSH config pi1)
# export PI_USER_VPN="gilko"       # SSH username
PI_HOST="${PI_HOST_VPN:-10.42.0.1}"
PI_USER="${PI_USER_VPN:-gilko}"
PROJECT_NAME="diet-daily"
DEPLOY_DIR="/home/${PI_USER}/${PROJECT_NAME}"

# VPN-specific settings
SSH_TIMEOUT="${SSH_TIMEOUT:-10}"  # Longer timeout for VPN connections

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo_vpn() {
    echo -e "${BLUE}[VPN]${NC} $1"
}

# VPN connection notice
echo_vpn "================================================"
echo_vpn "VPN Deployment Mode"
echo_vpn "================================================"
echo_info "Target: ${PI_USER}@${PI_HOST}"
echo_info "Make sure you are connected to VPN before proceeding."
echo ""

# Check if SSH connection is available (with longer timeout for VPN)
echo_info "Checking SSH connection to ${PI_USER}@${PI_HOST} (VPN mode, timeout: ${SSH_TIMEOUT}s)..."
if ! ssh -o ConnectTimeout=${SSH_TIMEOUT} -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
    ${PI_USER}@${PI_HOST} "echo Connection successful" > /dev/null 2>&1; then
    echo_error "Cannot connect to ${PI_HOST}. Please check:"
    echo "  1. VPN connection is active"
    echo "  2. Raspberry Pi is powered on and accessible via VPN"
    echo "  3. SSH is enabled on Raspberry Pi"
    echo "  4. VPN IP address is correct (current: ${PI_HOST})"
    echo "  5. SSH key is set up or password is available"
    echo ""
    echo_warn "To set custom VPN IP, export PI_HOST_VPN before running:"
    echo_warn "  export PI_HOST_VPN=\"your-vpn-ip\""
    echo_warn "  ./pi_docker/deploy-to-pi1.sh"
    exit 1
fi

echo_info "SSH connection successful via VPN!"

# Check if Docker is installed on Pi
echo_info "Checking Docker installation on Raspberry Pi..."
if ! ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} "command -v docker > /dev/null 2>&1"; then
    echo_warn "Docker not found on Raspberry Pi. Installing Docker..."
    ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} \
        "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker ${PI_USER}"
    echo_info "Docker installed. Please log out and back in on Pi, then run this script again."
    exit 0
fi

# Check if Docker Compose is installed
echo_info "Checking Docker Compose installation..."
if ! ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} "command -v docker compose > /dev/null 2>&1"; then
    echo_warn "Docker Compose not found. Installing..."
    ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} \
        "sudo apt-get update && sudo apt-get install -y docker-compose-plugin"
fi

# Create project directory on Pi
echo_info "Creating project directory on Raspberry Pi..."
ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} "mkdir -p ${DEPLOY_DIR}"

# Copy project files to Pi (with compression for VPN)
echo_info "Copying project files to Raspberry Pi (VPN mode, using compression)..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.." || exit 1

# Use compression for better performance over VPN
rsync -avz --compress-level=6 \
    --exclude-from='pi_docker/.dockerignore' \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --progress \
    ./ ${PI_USER}@${PI_HOST}:${DEPLOY_DIR}/

# Check if .env.production.pi exists
if [ ! -f .env.production.pi ]; then
    echo_warn ".env.production.pi not found. Creating template..."
    cat > .env.production.pi << 'EOF'
# Production Environment Configuration for Raspberry Pi
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://gilko.redirectme.net:3000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth (if needed)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Anthropic API (if needed)
ANTHROPIC_API_KEY=your_anthropic_api_key
EOF
    echo_warn "Please edit .env.production.pi with your actual configuration, then run this script again."
    exit 0
fi

# Copy environment file
echo_info "Copying environment configuration..."
scp -o ConnectTimeout=${SSH_TIMEOUT} .env.production.pi ${PI_USER}@${PI_HOST}:${DEPLOY_DIR}/.env.production.pi

# Build and start Docker containers on Pi
echo_info "Building and starting Docker containers on Raspberry Pi (this may take longer over VPN)..."
ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} "cd ${DEPLOY_DIR} && \
  set -a && source .env.production.pi && set +a && \
  cd pi_docker && \
  (docker compose down --remove-orphans || true) && \
  (docker rm -f diet-daily-web >/dev/null 2>&1 || true) && \
  docker compose build && docker compose up -d"

# Wait for container to be healthy
echo_info "Waiting for application to start..."
sleep 10

# Check container status
echo_info "Checking container status..."
ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} "cd ${DEPLOY_DIR}/pi_docker && docker compose ps"

# Test application
echo_info "Testing application..."
if ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} "curl -f http://localhost:3000 > /dev/null 2>&1"; then
    echo_info "✓ Application is running successfully!"
    echo_info "Access your app at: http://gilko.redirectme.net:3000"
else
    echo_error "Application health check failed. Checking logs..."
    ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} "cd ${DEPLOY_DIR}/pi_docker && docker compose logs --tail=50"
    exit 1
fi

# Show logs
echo_info "Recent logs:"
ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} "cd ${DEPLOY_DIR}/pi_docker && docker compose logs --tail=20"

echo ""
echo_info "================================================"
echo_info "VPN Deployment completed successfully!"
echo_info "================================================"
echo_info "Application URL: http://gilko.redirectme.net:3000"
echo_info ""
echo_info "Useful commands (VPN mode):"
echo_info "  View logs:    ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} 'cd ${DEPLOY_DIR}/pi_docker && docker compose logs -f'"
echo_info "  Restart:      ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} 'cd ${DEPLOY_DIR}/pi_docker && docker compose restart'"
echo_info "  Stop:         ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} 'cd ${DEPLOY_DIR}/pi_docker && docker compose down'"
echo_info "  Status:       ssh -o ConnectTimeout=${SSH_TIMEOUT} ${PI_USER}@${PI_HOST} 'cd ${DEPLOY_DIR}/pi_docker && docker compose ps'"
echo_info "================================================"

