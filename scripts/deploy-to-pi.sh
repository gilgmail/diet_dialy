#!/bin/bash

# Deploy Diet Daily to Raspberry Pi 5
# Target: gilko.redirectme.net

set -e

# Configuration
PI_HOST="gilko.redirectme.net"
PI_USER="${PI_USER:-pi}"
PROJECT_NAME="diet-daily"
DEPLOY_DIR="/home/${PI_USER}/${PROJECT_NAME}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if SSH connection is available
echo_info "Checking SSH connection to ${PI_USER}@${PI_HOST}..."
if ! ssh -o ConnectTimeout=5 ${PI_USER}@${PI_HOST} "echo Connection successful" > /dev/null 2>&1; then
    echo_error "Cannot connect to ${PI_HOST}. Please check:"
    echo "  1. Raspberry Pi is powered on and connected to network"
    echo "  2. SSH is enabled on Raspberry Pi"
    echo "  3. Hostname is correct (gilko.redirectme.net)"
    echo "  4. SSH key is set up or password is available"
    exit 1
fi

echo_info "SSH connection successful!"

# Check if Docker is installed on Pi
echo_info "Checking Docker installation on Raspberry Pi..."
if ! ssh ${PI_USER}@${PI_HOST} "command -v docker > /dev/null 2>&1"; then
    echo_warn "Docker not found on Raspberry Pi. Installing Docker..."
    ssh ${PI_USER}@${PI_HOST} "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker ${PI_USER}"
    echo_info "Docker installed. Please log out and back in on Pi, then run this script again."
    exit 0
fi

# Check if Docker Compose is installed
echo_info "Checking Docker Compose installation..."
if ! ssh ${PI_USER}@${PI_HOST} "command -v docker compose > /dev/null 2>&1"; then
    echo_warn "Docker Compose not found. Installing..."
    ssh ${PI_USER}@${PI_HOST} "sudo apt-get update && sudo apt-get install -y docker-compose-plugin"
fi

# Create project directory on Pi
echo_info "Creating project directory on Raspberry Pi..."
ssh ${PI_USER}@${PI_HOST} "mkdir -p ${DEPLOY_DIR}"

# Copy project files to Pi
echo_info "Copying project files to Raspberry Pi..."
rsync -avz --exclude-from='.dockerignore' \
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
scp .env.production.pi ${PI_USER}@${PI_HOST}:${DEPLOY_DIR}/.env.production.pi

# Build and start Docker containers on Pi
echo_info "Building and starting Docker containers on Raspberry Pi..."
ssh ${PI_USER}@${PI_HOST} "cd ${DEPLOY_DIR} && docker compose down && docker compose build && docker compose up -d"

# Wait for container to be healthy
echo_info "Waiting for application to start..."
sleep 10

# Check container status
echo_info "Checking container status..."
ssh ${PI_USER}@${PI_HOST} "cd ${DEPLOY_DIR} && docker compose ps"

# Test application
echo_info "Testing application..."
if ssh ${PI_USER}@${PI_HOST} "curl -f http://localhost:3000 > /dev/null 2>&1"; then
    echo_info "✓ Application is running successfully!"
    echo_info "Access your app at: http://gilko.redirectme.net:3000"
else
    echo_error "Application health check failed. Checking logs..."
    ssh ${PI_USER}@${PI_HOST} "cd ${DEPLOY_DIR} && docker compose logs --tail=50"
    exit 1
fi

# Show logs
echo_info "Recent logs:"
ssh ${PI_USER}@${PI_HOST} "cd ${DEPLOY_DIR} && docker compose logs --tail=20"

echo ""
echo_info "================================================"
echo_info "Deployment completed successfully!"
echo_info "================================================"
echo_info "Application URL: http://gilko.redirectme.net:3000"
echo_info ""
echo_info "Useful commands:"
echo_info "  View logs:    ssh ${PI_USER}@${PI_HOST} 'cd ${DEPLOY_DIR} && docker compose logs -f'"
echo_info "  Restart:      ssh ${PI_USER}@${PI_HOST} 'cd ${DEPLOY_DIR} && docker compose restart'"
echo_info "  Stop:         ssh ${PI_USER}@${PI_HOST} 'cd ${DEPLOY_DIR} && docker compose down'"
echo_info "  Status:       ssh ${PI_USER}@${PI_HOST} 'cd ${DEPLOY_DIR} && docker compose ps'"
echo_info "================================================"
