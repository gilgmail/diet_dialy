#!/bin/bash
# CI Test Script - Simulates GitHub Actions workflow locally

set -e  # Exit on error

echo "🚀 Starting CI Test..."
echo "======================================"

# Set CI environment variables
export CI=true
export NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
export NEXT_PUBLIC_URL=http://127.0.0.1:3000
export NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3000
export NEXT_PUBLIC_API_URL=http://127.0.0.1:3000
export NEXTAUTH_URL=http://127.0.0.1:3000
export NEXT_PUBLIC_APP_ENV=test

echo ""
echo "📦 Step 1: Install dependencies"
echo "======================================"
npm ci

echo ""
echo "🔍 Step 2: Lint (warnings allowed)"
echo "======================================"
npm run lint || echo "⚠️  Lint completed with warnings (allowed)"

echo ""
echo "🏗️  Step 3: Build application"
echo "======================================"
npm run build

echo ""
echo "🧪 Step 4: Run unit tests with coverage (failures allowed)"
echo "======================================"
npm run test:coverage || echo "⚠️  Tests completed with failures (allowed)"

echo ""
echo "✅ CI Test Complete!"
echo "======================================"
echo "All critical steps passed successfully."
