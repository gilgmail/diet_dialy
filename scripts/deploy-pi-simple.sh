#!/bin/bash
# Simple Pi deployment script with better error handling

set -e

PI_HOST="10.1.1.85"
PI_USER="gilko"
DEPLOY_DIR="/home/gilko/diet-daily"

echo "🚀 Starting deployment to Pi..."

# Step 1: Sync files
echo "📦 Syncing files to Pi..."
rsync -av --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'mobile' \
  --exclude 'scripts' \
  --exclude 'claudedocs' \
  --exclude 'docs' \
  --exclude 'ref' \
  --exclude '*.md' \
  . ${PI_USER}@${PI_HOST}:${DEPLOY_DIR}/

# Step 2: Clean old containers and images
echo "🧹 Cleaning old containers..."
ssh ${PI_USER}@${PI_HOST} << 'ENDSSH'
cd ~/diet-daily/pi_docker
docker compose down 2>/dev/null || true
docker system prune -f
ENDSSH

# Step 3: Build on Pi (with better error output)
echo "🔨 Building on Pi (this may take 10-15 minutes)..."
ssh ${PI_USER}@${PI_HOST} << 'ENDSSH'
cd ~/diet-daily/pi_docker

# Build with verbose output
echo "Starting Docker build..."
docker compose build --progress=plain 2>&1 | tee /tmp/docker-build.log

# Check if build succeeded
if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed. Last 50 lines of log:"
  tail -50 /tmp/docker-build.log
  exit 1
fi
ENDSSH

# Step 4: Start containers
echo "▶️ Starting containers..."
ssh ${PI_USER}@${PI_HOST} << 'ENDSSH'
cd ~/diet-daily/pi_docker
docker compose up -d

# Wait for health check
echo "⏳ Waiting for container to be healthy..."
for i in {1..30}; do
  if docker ps | grep -q "diet-daily-web.*healthy"; then
    echo "✅ Container is healthy"
    break
  fi
  echo "Waiting... ($i/30)"
  sleep 2
done

# Show status
docker compose ps
echo ""
echo "📊 Recent logs:"
docker compose logs --tail=20
ENDSSH

# Step 5: Test
echo "🧪 Testing application..."
if curl -f http://gilko.redirectme.net:3000 -o /dev/null -s; then
  echo "✅ Application is accessible!"
else
  echo "⚠️ Application may not be ready yet. Check logs with:"
  echo "   ssh ${PI_USER}@${PI_HOST} 'docker compose -f ~/diet-daily/pi_docker/docker-compose.yml logs -f'"
fi

echo ""
echo "🎉 Deployment complete!"
echo "   URL: http://gilko.redirectme.net:3000"
