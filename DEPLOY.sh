#!/bin/bash
# Budget Tool Deployment Script
# Deploys the latest frontend build to the production server

set -e

REMOTE_USER="root"
REMOTE_HOST="68.183.101.60"
REMOTE_PATH="/var/www/budget-tool"
LOCAL_BUILD="./frontend/dist"

echo "🚀 Deploying Budget Tool to $REMOTE_HOST"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Build locally
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

# Step 2: Deploy to server
echo "📤 Uploading to production..."
ssh-keyscan $REMOTE_HOST >> ~/.ssh/known_hosts 2>/dev/null || true

# Create remote directory if it doesn't exist
ssh $REMOTE_USER@$REMOTE_HOST "mkdir -p $REMOTE_PATH"

# Copy new build
scp -r $LOCAL_BUILD/* $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/

echo "✅ Deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 App URL: http://68.183.101.60"
echo ""
echo "🔍 Verify deployment:"
echo "  - Open http://68.183.101.60 in browser"
echo "  - Check DevTools → Network to see CSS file is loading"
echo "  - Hard refresh (Ctrl+Shift+R) to clear browser cache"
echo ""
echo "Note: Clear browser cache if still seeing old version!"
