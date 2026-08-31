#!/bin/bash
set -e

DOMAIN="deciball.zeusnotfound.codes"
PROJECT_DIR="/opt/deciball"

echo "=== Deciball Deployment ==="

# 1. Pull latest code
echo "[1/7] Pulling latest code..."
cd $PROJECT_DIR
git pull origin main

# 2. Check env files exist
echo "[2/7] Checking env files..."
if [ ! -f apps/web/.env.production ]; then
  echo "ERROR: apps/web/.env.production not found!"
  echo "Copy deploy/.env.production.example and fill in values."
  exit 1
fi
if [ ! -f apps/ws/.env.production ]; then
  echo "ERROR: apps/ws/.env.production not found!"
  exit 1
fi
if [ ! -f .env ]; then
  echo "ERROR: .env not found (for docker-compose)!"
  echo "Create .env with POSTGRES_PASSWORD and REDIS_PASSWORD."
  exit 1
fi

# 3. Build and start containers
echo "[3/7] Building containers..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "[4/7] Starting containers..."
docker compose -f docker-compose.prod.yml up -d

# 5. Wait for postgres to be ready
echo "[5/7] Waiting for Postgres..."
sleep 5
docker exec deciball-web npx prisma migrate deploy --schema=/app/packages/database/prisma/schema.prisma 2>/dev/null || \
  docker exec deciball-web npx prisma db push --schema=/app/packages/database/prisma/schema.prisma 2>/dev/null || \
  echo "Prisma migration skipped (may already be up to date)"

# 6. Setup Nginx
echo "[6/7] Setting up Nginx..."
if [ ! -f /etc/nginx/sites-available/deciball ]; then
  sudo cp deploy/nginx-deciball.conf /etc/nginx/sites-available/deciball
  sudo ln -sf /etc/nginx/sites-available/deciball /etc/nginx/sites-enabled/deciball
  echo "Nginx config installed. Getting SSL certificate..."
  sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@zeusnotfound.codes || echo "Certbot failed — set up SSL manually."
else
  echo "Nginx config already exists."
fi

sudo nginx -t && sudo systemctl reload nginx

# 7. Verify
echo "[7/7] Verifying..."
echo ""
docker compose -f docker-compose.prod.yml ps
echo ""
echo "=== Deployment complete ==="
echo "Web:       https://$DOMAIN"
echo "WebSocket: wss://$DOMAIN/ws"
echo ""
echo "Logs: docker compose -f docker-compose.prod.yml logs -f"
