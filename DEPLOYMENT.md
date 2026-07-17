# Budget Tool: Complete Deployment & DevOps Strategy

## Table of Contents

1. [Docker Containerization](#docker-containerization)
2. [Docker Compose (Development)](#docker-compose-development)
3. [Production Deployment](#production-deployment)
4. [Database Management](#database-management)
5. [Environment Configuration](#environment-configuration)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Database Migrations](#database-migrations)
8. [Zero-Downtime Deployment](#zero-downtime-deployment)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Log Aggregation](#log-aggregation)
11. [Performance Monitoring](#performance-monitoring)
12. [Scaling Strategy](#scaling-strategy)
13. [Disaster Recovery](#disaster-recovery)
14. [SSL/TLS Management](#ssltls-management)

---

## Docker Containerization

### 1.1 Backend Dockerfile (PocketBase)

**File: `backend/Dockerfile`**

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache wget unzip ca-certificates

# Download PocketBase binary
ARG POCKETBASE_VERSION=0.20.4
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip && \
    unzip pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip && \
    rm pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip

# Production stage
FROM alpine:3.18

WORKDIR /pb

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tini curl

# Create non-root user for security
RUN addgroup -g 1000 pocketbase && \
    adduser -u 1000 -G pocketbase -s /sbin/nologin -D pocketbase

# Copy PocketBase binary
COPY --from=builder --chown=pocketbase:pocketbase /app/pocketbase /pb/pocketbase

# Copy configuration files
COPY --chown=pocketbase:pocketbase pb.yml /pb/pb.yml
COPY --chown=pocketbase:pocketbase pb_migrations /pb/pb_migrations/
COPY --chown=pocketbase:pocketbase pb_hooks /pb/pb_hooks/

# Data volume
RUN mkdir -p /pb/pb_data && chown -R pocketbase:pocketbase /pb/pb_data
VOLUME ["/pb/pb_data"]

# Switch to non-root user
USER pocketbase

EXPOSE 8090

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8090/api/health || exit 1

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

### 1.2 Frontend Dockerfile (Vite + React)

**File: `frontend/Dockerfile`**

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies and http-server
RUN npm install -g http-server

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1000 frontend && \
    adduser -u 1000 -G frontend -s /sbin/nologin -D frontend

RUN chown -R frontend:frontend /app
USER frontend

EXPOSE 3000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

CMD ["http-server", "dist", "-p", "3000", "--gzip"]
```

### 1.3 Nginx Reverse Proxy Dockerfile

**File: `nginx/Dockerfile`**

```dockerfile
FROM nginx:1.25-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Create non-root user
RUN addgroup -g 1001 nginx && \
    adduser -u 1001 -G nginx -s /sbin/nologin -D nginx || true

# Fix permissions
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /var/run/nginx

EXPOSE 80 443

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

---

## Docker Compose (Development)

### 2.1 Development Configuration

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  # Frontend: React + Vite
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: budget-frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8090
      - VITE_APP_NAME=Budget Tool
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
    command: npm run dev
    networks:
      - budget-network
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

  # Backend: PocketBase
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: budget-backend
    ports:
      - "8090:8090"
    volumes:
      - ./backend/pb_data:/pb/pb_data
      - ./backend/pb_hooks:/pb/pb_hooks
      - ./backend/pb_migrations:/pb/pb_migrations
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
      - PLAID_CLIENT_ID=${PLAID_CLIENT_ID:-}
      - PLAID_SECRET=${PLAID_SECRET:-}
      - PLAID_ENV=sandbox
    networks:
      - budget-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8090/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    restart: unless-stopped

  # Redis: Caching layer (optional, for future scaling)
  redis:
    image: redis:7-alpine
    container_name: budget-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-changeme}
    networks:
      - budget-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  # Nginx: Reverse proxy (for local production testing)
  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    container_name: budget-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx-cache:/var/cache/nginx
    networks:
      - budget-network
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    profiles:
      - production-testing

volumes:
  redis-data:
  nginx-cache:

networks:
  budget-network:
    driver: bridge
```

### 2.2 Development Environment File

**File: `.env.local`**

```bash
# Frontend Configuration
VITE_API_URL=http://localhost:8090
VITE_APP_NAME=Budget Tool

# Backend - API Keys (use sandbox/test values in development)
ANTHROPIC_API_KEY=sk-ant-v0-test-key
PLAID_CLIENT_ID=test_client_id
PLAID_SECRET=test_secret
PLAID_ENV=sandbox

# Redis
REDIS_PASSWORD=changeme

# Application Settings
NODE_ENV=development
LOG_LEVEL=debug
DEBUG=budget-tool:*
```

### 2.3 Local Development Commands

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend
docker-compose up -d frontend

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Remove volumes (caution: deletes data)
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Execute commands in container
docker-compose exec backend /pb/pocketbase admin

# Scale service (optional)
docker-compose up -d --scale frontend=2
```

---

## Production Deployment

### 3.1 DigitalOcean Droplet Setup

**Instance Configuration:**
- **Size**: Standard 4GB/2CPU ($24/month) - scale as needed
- **OS**: Ubuntu 22.04 LTS
- **Region**: Choose closest to users (US-East, US-West, etc.)
- **Backups**: Enable automated snapshots
- **Monitoring**: Enable DigitalOcean monitoring

### 3.2 Initial Server Setup Script

**File: `scripts/setup-do-droplet.sh`**

```bash
#!/bin/bash
set -e

echo "=== Budget Tool - DigitalOcean Droplet Setup ==="

# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
usermod -aG docker $USER

# Install essential tools
apt-get install -y \
    git \
    curl \
    wget \
    htop \
    vim \
    net-tools \
    postgresql-client \
    ufw \
    certbot \
    python3-certbot-nginx

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Create application directory
mkdir -p /opt/budget-tool
cd /opt/budget-tool

# Clone repository
git clone https://github.com/your-username/budget-tool .

# Create .env.production
cat > .env.production << 'EOF'
NODE_ENV=production
VITE_API_URL=https://yourdomain.com
VITE_APP_NAME=Budget Tool

ANTHROPIC_API_KEY=sk-ant-v0-xxxxx
PLAID_CLIENT_ID=xxxxx
PLAID_SECRET=xxxxx
PLAID_ENV=production

REDIS_PASSWORD=change-me-to-strong-password
LOG_LEVEL=info
EOF

echo "Setup complete. Configure .env.production with your API keys."
echo "Then run: docker-compose -f docker-compose.prod.yml up -d"
```

### 3.3 Production Docker Compose

**File: `docker-compose.prod.yml`**

```yaml
version: '3.8'

services:
  frontend:
    image: budget-tool-frontend:${VERSION:-latest}
    restart: always
    networks:
      - budget-network
    environment:
      - NODE_ENV=production
      - VITE_API_URL=${VITE_API_URL}
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  backend:
    image: budget-tool-backend:${VERSION:-latest}
    restart: always
    networks:
      - budget-network
    volumes:
      - pb-data:/pb/pb_data
      - pb-backups:/pb/pb_backups
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - PLAID_CLIENT_ID=${PLAID_CLIENT_ID}
      - PLAID_SECRET=${PLAID_SECRET}
      - PLAID_ENV=${PLAID_ENV}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8090/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    restart: always
    networks:
      - budget-network
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:1.25-alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    networks:
      - budget-network
    volumes:
      - ./nginx/conf.d/production.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx-cache:/var/cache/nginx
      - ./nginx/html:/usr/share/nginx/html:ro
    depends_on:
      - frontend
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  pb-data:
  pb-backups:
  redis-data:
  nginx-cache:

networks:
  budget-network:
    driver: bridge
```

### 3.4 Production Nginx Configuration

**File: `nginx/conf.d/production.conf`**

```nginx
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:8090;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Compression
    gzip on;
    gzip_types text/plain text/css text/xml application/json application/javascript;
    gzip_min_length 1000;

    # Logging
    access_log /var/log/nginx/access.log combined buffer=32k flush=5s;
    error_log /var/log/nginx/error.log warn;

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # API endpoints - proxy to backend
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # PocketBase admin panel
    location /_/ {
        proxy_pass http://backend/_/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend - SPA routing
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SPA routing: serve index.html for 404s
        error_page 404 =200 /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://frontend;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ ~$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

---

## Database Management

### 4.1 PostgreSQL Backup Strategy

PocketBase uses SQLite, but this guide includes PostgreSQL backup procedures for future migration.

**File: `scripts/backup-database.sh`**

```bash
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/opt/budget-tool/backups"
POCKETBASE_DATA="/opt/budget-tool/backend/pb_data"
RETENTION_DAYS=30
DO_SPACES_BUCKET="your-bucket-name"
AWS_REGION="nyc3"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pb_backup_$TIMESTAMP.tar.gz"

echo "Starting backup at $(date)"

# Backup PocketBase data directory
tar -czf "$BACKUP_FILE" -C "$POCKETBASE_DATA" . || {
    echo "Error: Failed to create backup archive"
    exit 1
}

echo "Created backup: $BACKUP_FILE"

# Upload to DigitalOcean Spaces
if command -v s3cmd &> /dev/null; then
    s3cmd put "$BACKUP_FILE" \
        "s3://$DO_SPACES_BUCKET/backups/$(basename $BACKUP_FILE)" \
        --region="$AWS_REGION" && \
        echo "Uploaded to Spaces: $DO_SPACES_BUCKET"
fi

# Local retention: delete backups older than $RETENTION_DAYS
find "$BACKUP_DIR" -name "pb_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleaned up backups older than $RETENTION_DAYS days"

# Backup database integrity check
echo "Database backup integrity:"
tar -tzf "$BACKUP_FILE" | head -20
echo "..."
echo "Backup complete at $(date)"
```

### 4.2 PostgreSQL Backup & Recovery (Future Migration)

**File: `scripts/pg-backup.sh`**

```bash
#!/bin/bash
set -e

DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-budget_production}"
DB_HOST="${DB_HOST:-localhost}"
BACKUP_DIR="/opt/budget-tool/backups"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

echo "Starting PostgreSQL backup..."

# Create backup
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose \
    --format=plain | gzip > "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"
echo "Size: $(du -h $BACKUP_FILE | cut -f1)"

# Upload to DigitalOcean Spaces
if command -v s3cmd &> /dev/null; then
    s3cmd put "$BACKUP_FILE" "s3://your-bucket/backups/"
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Backup verification
gunzip -t "$BACKUP_FILE" && echo "Backup integrity verified"
```

### 4.3 PostgreSQL Recovery

**File: `scripts/pg-restore.sh`**

```bash
#!/bin/bash
set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

BACKUP_FILE="$1"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-budget_production}"
DB_HOST="${DB_HOST:-localhost}"

echo "Restoring from backup: $BACKUP_FILE"

# Create new database if needed
PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    PGPASSWORD="$DB_PASSWORD" createdb \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        "$DB_NAME"

# Restore from backup
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --verbose

echo "Database restored successfully"
```

---

## Environment Configuration

### 5.1 Environment Variables Structure

**File: `.env.production`**

```bash
# ============================================================================
# DEPLOYMENT ENVIRONMENT
# ============================================================================
NODE_ENV=production
ENVIRONMENT=production
LOG_LEVEL=info

# ============================================================================
# APPLICATION CONFIGURATION
# ============================================================================
VITE_API_URL=https://yourdomain.com
VITE_APP_NAME=Budget Tool
VERSION=1.0.0
RELEASE_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# ============================================================================
# EXTERNAL API KEYS (SENSITIVE - NEVER COMMIT)
# ============================================================================
ANTHROPIC_API_KEY=sk-ant-v0-xxxxxxxxxxxxx
PLAID_CLIENT_ID=xxxxxxxxxxxxx
PLAID_SECRET=xxxxxxxxxxxxx
PLAID_ENV=production

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================
# For PocketBase (SQLite)
POCKETBASE_DATA_DIR=/pb/pb_data

# For PostgreSQL (future migration)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=budget_production
DB_USER=postgres
DB_PASSWORD=change-me-to-strong-password
DB_SSL=require

# ============================================================================
# REDIS CONFIGURATION
# ============================================================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=change-me-to-strong-password
REDIS_DB=0
REDIS_MAXMEMORY=256mb

# ============================================================================
# SECURITY
# ============================================================================
JWT_SECRET=change-me-to-long-random-string
SESSION_SECRET=change-me-to-long-random-string
ENCRYPT_KEY=change-me-to-32-char-hex-string

# ============================================================================
# MONITORING & LOGGING
# ============================================================================
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
DATADOG_API_KEY=xxxxxxxxxxxxx
LOG_RETENTION_DAYS=30

# ============================================================================
# PERFORMANCE
# ============================================================================
CACHE_TTL=3600
DB_POOL_SIZE=10
WORKER_THREADS=4

# ============================================================================
# FEATURE FLAGS
# ============================================================================
ENABLE_PLAID=true
ENABLE_AI_CATEGORIZATION=true
ENABLE_UPLOADS=true
ENABLE_ANALYTICS=true
```

### 5.2 Secrets Management with Docker Secrets

**File: `scripts/setup-secrets.sh`**

```bash
#!/bin/bash
set -e

echo "Setting up Docker secrets..."

# Create secrets directory
mkdir -p /opt/budget-tool/secrets

# Function to create secret from environment variable or generate
create_secret() {
    local secret_name=$1
    local env_var=$2
    local secret_file="/opt/budget-tool/secrets/$secret_name"

    if [ -n "${!env_var}" ]; then
        echo "${!env_var}" > "$secret_file"
        chmod 600 "$secret_file"
        echo "Created $secret_name from $env_var"
    else
        # Generate random secret
        openssl rand -base64 32 > "$secret_file"
        chmod 600 "$secret_file"
        echo "Generated random $secret_name"
    fi
}

# Create secrets
create_secret "anthropic_api_key" "ANTHROPIC_API_KEY"
create_secret "plaid_client_id" "PLAID_CLIENT_ID"
create_secret "plaid_secret" "PLAID_SECRET"
create_secret "db_password" "DB_PASSWORD"
create_secret "redis_password" "REDIS_PASSWORD"
create_secret "jwt_secret" "JWT_SECRET"
create_secret "session_secret" "SESSION_SECRET"

echo "Secrets setup complete"
```

---

## CI/CD Pipeline

### 6.1 GitHub Actions Workflow

**File: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
      - production
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Frontend Tests
        run: |
          cd frontend
          npm ci
          npm run lint
          npm run type-check

      - name: Build Frontend
        run: |
          cd frontend
          npm run build

  build:
    name: Build Docker Images
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      frontend-tag: ${{ steps.meta-frontend.outputs.tags }}
      backend-tag: ${{ steps.meta-backend.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Frontend metadata
        id: meta-frontend
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Frontend image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ steps.meta-frontend.outputs.tags }}
          labels: ${{ steps.meta-frontend.outputs.labels }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:buildcache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:buildcache,mode=max

      - name: Extract Backend metadata
        id: meta-backend
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push Backend image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta-backend.outputs.tags }}
          labels: ${{ steps.meta-backend.outputs.labels }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:buildcache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:buildcache,mode=max

  security-scan:
    name: Security Scan
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ needs.build.outputs.frontend-tag }}
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  deploy:
    name: Deploy to Production
    needs: [test, build, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DO_DROPLET_IP }}
          username: root
          key: ${{ secrets.DO_DROPLET_SSH_KEY }}
          script: |
            cd /opt/budget-tool
            git pull origin main
            
            # Load environment
            set -a
            source .env.production
            set +a
            
            # Pull latest images
            docker-compose -f docker-compose.prod.yml pull
            
            # Run migrations
            docker-compose -f docker-compose.prod.yml run --rm backend /pb/pocketbase migrate exec
            
            # Deploy with zero-downtime
            docker-compose -f docker-compose.prod.yml up -d --no-deps --build
            
            # Health check
            sleep 5
            curl -f https://yourdomain.com/health || exit 1
            
            # Cleanup
            docker image prune -f

      - name: Notify Deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()

  rollback:
    name: Rollback on Failure
    needs: deploy
    runs-on: ubuntu-latest
    if: failure()
    steps:
      - uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DO_DROPLET_IP }}
          username: root
          key: ${{ secrets.DO_DROPLET_SSH_KEY }}
          script: |
            cd /opt/budget-tool
            # Rollback to previous version
            git revert HEAD --no-edit
            docker-compose -f docker-compose.prod.yml up -d
            echo "Rollback complete"

  smoke-tests:
    name: Smoke Tests
    needs: deploy
    runs-on: ubuntu-latest
    if: success()
    steps:
      - uses: actions/checkout@v4

      - name: Run Smoke Tests
        run: |
          bash ./scripts/smoke-tests.sh https://yourdomain.com
```

### 6.2 Automated Testing Script

**File: `scripts/smoke-tests.sh`**

```bash
#!/bin/bash
set -e

DOMAIN="${1:-https://yourdomain.com}"
TIMEOUT=10

echo "Running smoke tests against $DOMAIN"

# Test 1: Frontend health
echo "Test 1: Frontend accessibility..."
curl -f -L "$DOMAIN" -m $TIMEOUT > /dev/null || { echo "FAIL: Frontend not responding"; exit 1; }
echo "PASS"

# Test 2: API health
echo "Test 2: API health check..."
curl -f "$DOMAIN/api/health" -m $TIMEOUT > /dev/null || { echo "FAIL: API not responding"; exit 1; }
echo "PASS"

# Test 3: Authentication endpoint
echo "Test 3: Auth endpoint..."
curl -f -X POST "$DOMAIN/api/collections/users/auth-with-password" \
    -H "Content-Type: application/json" \
    -d '{"identity":"test@test.com","password":"test"}' \
    -m $TIMEOUT || echo "Expected auth failure (test credentials)" 
echo "PASS"

# Test 4: SSL certificate
echo "Test 4: SSL certificate validation..."
curl -I "$DOMAIN" -m $TIMEOUT | grep -q "200\|301\|302" || { echo "FAIL: SSL issue"; exit 1; }
echo "PASS"

# Test 5: Response time
echo "Test 5: Response time check..."
RESPONSE_TIME=$(curl -w %{time_total} -o /dev/null -s "$DOMAIN" | cut -d. -f1)
if [ "$RESPONSE_TIME" -gt 5 ]; then
    echo "WARNING: Slow response time: ${RESPONSE_TIME}s"
else
    echo "PASS: Response time: ${RESPONSE_TIME}s"
fi

echo ""
echo "All smoke tests passed!"
```

---

## Database Migrations

### 7.1 PocketBase Migration Strategy

**File: `backend/pb_migrations/example.js`**

```javascript
// Migration: Add audit logging fields
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("transactions");

  // Add new fields
  collection.fields.add(new Field({
    name: "auditCreatedAt",
    type: "date",
    required: false
  }));

  collection.fields.add(new Field({
    name: "auditUpdatedAt",
    type: "date",
    required: false
  }));

  return dao.saveCollection(collection);
}, (db) => {
  // Rollback
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("transactions");

  collection.fields.removeById("auditCreatedAt");
  collection.fields.removeById("auditUpdatedAt");

  return dao.saveCollection(collection);
});
```

### 7.2 PostgreSQL Migration with Prisma (Future)

**File: `prisma/migrations/0001_initial.sql`**

```sql
-- CreateTable users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- CreateTable accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  accountType VARCHAR(50) NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_accounts_userId ON accounts(userId);
```

### 7.3 Migration Runner Script

**File: `scripts/run-migrations.sh`**

```bash
#!/bin/bash
set -e

echo "Running database migrations..."

# PocketBase migrations
docker-compose -f docker-compose.prod.yml run --rm backend \
    /pb/pocketbase migrate exec

# PostgreSQL migrations (if using Prisma)
if [ -f "prisma/schema.prisma" ]; then
    docker-compose -f docker-compose.prod.yml run --rm backend \
        npx prisma migrate deploy
fi

# Verify migrations
docker-compose -f docker-compose.prod.yml run --rm backend \
    /pb/pocketbase migrate list

echo "Migrations complete"
```

---

## Zero-Downtime Deployment

### 8.1 Blue-Green Deployment Script

**File: `scripts/blue-green-deploy.sh`**

```bash
#!/bin/bash
set -e

BLUE_PORT=3000
GREEN_PORT=3001
SERVICE_NAME="budget-tool"
HEALTH_CHECK_TIMEOUT=60

echo "Starting blue-green deployment..."

# Determine current active environment
CURRENT=$(docker-compose ps -q frontend 2>/dev/null || echo "")
if [ -z "$CURRENT" ]; then
    echo "No active containers. Starting green environment..."
    TARGET="green"
    TARGET_PORT=$GREEN_PORT
else
    echo "Current: BLUE. Deploying to GREEN..."
    TARGET="green"
    TARGET_PORT=$GREEN_PORT
fi

echo "Deploying to $TARGET environment on port $TARGET_PORT"

# Pull latest images
echo "Pulling latest images..."
docker-compose pull

# Start new environment
echo "Starting $TARGET environment..."
docker-compose -f docker-compose.prod.yml up -d \
    --no-deps \
    --scale frontend=2

# Health check
echo "Waiting for health checks to pass..."
START_TIME=$(date +%s)

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))

    if [ $ELAPSED -gt $HEALTH_CHECK_TIMEOUT ]; then
        echo "Health check timeout after ${HEALTH_CHECK_TIMEOUT}s. Rollback..."
        docker-compose stop
        exit 1
    fi

    if curl -f http://localhost/health > /dev/null 2>&1; then
        echo "Health check passed!"
        break
    fi

    echo "Waiting for service to be healthy..."
    sleep 2
done

# Run smoke tests
echo "Running smoke tests..."
bash ./scripts/smoke-tests.sh http://localhost

# Switch traffic (handled by Nginx upstream)
echo "Switching traffic to $TARGET..."
docker-compose -f docker-compose.prod.yml up -d nginx

# Verify new environment
echo "Verifying deployment..."
sleep 5
if curl -f http://localhost/health > /dev/null; then
    echo "Deployment successful!"
    
    # Cleanup old containers
    docker system prune -f
else
    echo "Deployment verification failed. Rolling back..."
    docker-compose down
    exit 1
fi

echo "Blue-green deployment complete"
```

### 8.2 Rolling Update Configuration

**File: `docker-compose.rolling.yml`**

```yaml
version: '3.8'

services:
  frontend:
    image: budget-tool-frontend:${VERSION:-latest}
    restart: always
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
    networks:
      - budget-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 40s

  backend:
    image: budget-tool-backend:${VERSION:-latest}
    restart: always
    deploy:
      replicas: 1
      update_config:
        parallelism: 1
        delay: 10s
    networks:
      - budget-network
    volumes:
      - pb-data:/pb/pb_data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8090/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3

networks:
  budget-network:
    driver: bridge

volumes:
  pb-data:
```

---

## Monitoring & Alerting

### 9.1 Prometheus Monitoring Setup

**File: `monitoring/prometheus.yml`**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'budget-tool'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alert-rules.yml'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']

  - job_name: 'backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['backend:8090']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

### 9.2 Alert Rules

**File: `monitoring/alert-rules.yml`**

```yaml
groups:
  - name: application_alerts
    interval: 15s
    rules:
      - alert: HighErrorRate
        expr: |
          (sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m]))) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: ServiceDown
        expr: up{job!~"pushgateway|prometheus"} == 0
        for: 2m
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service has been down for more than 2 minutes"

      - alert: HighCPUUsage
        expr: node_cpu_seconds_total > 0.8
        for: 5m
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"

      - alert: HighMemoryUsage
        expr: |
          (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.8
        for: 5m
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"

      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{fstype=~"ext4|xfs"} /
          node_filesystem_size_bytes) < 0.1
        for: 10m
        annotations:
          summary: "Low disk space on {{ $labels.device }}"
          description: "Less than 10% disk space available"

      - alert: DatabaseConnectionPoolExhausted
        expr: db_pool_connections_available == 0
        for: 2m
        annotations:
          summary: "Database connection pool exhausted"

      - alert: ResponseTimeHigh
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "95th percentile response time > 1s"
```

### 9.3 Alertmanager Configuration

**File: `monitoring/alertmanager.yml`**

```yaml
global:
  resolve_timeout: 5m

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  routes:
    - match:
        severity: critical
      receiver: 'critical'
      continue: true
    - match:
        severity: warning
      receiver: 'warning'

receivers:
  - name: 'default'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'critical'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#critical-alerts'
        title: 'CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'

  - name: 'warning'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#warnings'
```

### 9.4 Monitoring Stack Docker Compose

**File: `docker-compose.monitoring.yml`**

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./monitoring/alert-rules.yml:/etc/prometheus/alert-rules.yml:ro
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    networks:
      - budget-network
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager-data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    environment:
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
      - PAGERDUTY_SERVICE_KEY=${PAGERDUTY_SERVICE_KEY}
    networks:
      - budget-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
      - GF_SERVER_ROOT_URL=https://yourdomain.com/monitoring
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources:ro
    networks:
      - budget-network
    depends_on:
      - prometheus
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - budget-network
    restart: unless-stopped

  redis-exporter:
    image: oliver006/redis_exporter:latest
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    networks:
      - budget-network
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  prometheus-data:
  alertmanager-data:
  grafana-data:

networks:
  budget-network:
    driver: bridge
```

---

## Log Aggregation

### 10.1 Loki Configuration

**File: `monitoring/loki-config.yml`**

```yaml
auth_enabled: false

ingester:
  chunk_idle_period: 3m
  chunk_max_bytes: 999999
  max_chunk_age: 1h
  chunk_retain_period: 1m
  max_concurrent_streams: 10

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema:
        version: v11
        index:
          prefix: index_
          period: 24h

server:
  http_listen_port: 3100
  log_level: info

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
  filesystem:
    directory: /loki/chunks
```

### 10.2 Promtail Configuration (Log Shipper)

**File: `monitoring/promtail-config.yml`**

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker: {}
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'

  - job_name: systemd
    journal:
      path: /var/log/journal
      labels:
        job: systemd-journal
    relabel_configs:
      - source_labels: ['__journal__systemd_unit']
        target_label: 'unit'

  - job_name: syslog
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*.log
```

### 10.3 Log Aggregation Stack

**File: `docker-compose.logging.yml`**

```yaml
version: '3.8'

services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - budget-network
    restart: unless-stopped

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./monitoring/promtail-config.yml:/etc/promtail/config.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/log:/var/log
    command: -config.file=/etc/promtail/config.yml
    networks:
      - budget-network
    depends_on:
      - loki
    restart: unless-stopped

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.10.0
    volumes:
      - ./monitoring/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock
    command: filebeat -e -strict.perms=false
    networks:
      - budget-network
    depends_on:
      - elasticsearch
    restart: unless-stopped

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - budget-network
    restart: unless-stopped

  kibana:
    image: docker.elastic.co/kibana/kibana:8.10.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - budget-network
    depends_on:
      - elasticsearch
    restart: unless-stopped

volumes:
  loki-data:
  elasticsearch-data:

networks:
  budget-network:
    driver: bridge
```

---

## Performance Monitoring

### 11.1 APM Configuration (DataDog/New Relic)

**File: `monitoring/apm-config.js`**

```javascript
// APM setup for performance monitoring
const apm = require('elastic-apm-node');

apm.start({
  serviceName: 'budget-tool',
  serverUrl: process.env.APM_SERVER_URL || 'http://localhost:8200',
  logLevel: 'info',
  apiRequestSize: '10mb',
  transactionMaxSpans: 500,
  transactionSampleRate: 0.1, // Sample 10% of transactions
  centralConfig: true,
  metricsInterval: '30s',
});

module.exports = apm;
```

### 11.2 Performance Monitoring Metrics

**File: `monitoring/performance-metrics.md`**

```markdown
# Performance Monitoring Metrics

## Key Metrics to Track

### Response Time
- p50: Target < 200ms
- p95: Target < 500ms
- p99: Target < 1000ms

### Error Rate
- Target: < 0.1% (99.9% success)
- Alert threshold: > 1%

### Throughput
- Requests per second (RPS)
- Database queries per second
- API calls per second

### Resource Utilization
- CPU: Target < 70%
- Memory: Target < 80%
- Disk I/O: Monitor for bottlenecks

### Database Metrics
- Query execution time
- Connection pool utilization
- Slow query log (queries > 1s)

### Frontend Metrics
- Page load time
- First contentful paint (FCP)
- Largest contentful paint (LCP)
- Cumulative layout shift (CLS)
```

---

## Scaling Strategy

### 12.1 Horizontal Scaling (Multiple Droplets)

**File: `scripts/scale-horizontally.sh`**

```bash
#!/bin/bash
set -e

echo "Scaling deployment horizontally..."

# Configuration
NUM_REPLICAS=3
LOAD_BALANCER_IP="your-load-balancer-ip"
FIREWALL_ID="your-firewall-id"

# Create additional droplets
for i in $(seq 2 $NUM_REPLICAS); do
    echo "Creating droplet $i..."
    
    doctl compute droplet create budget-tool-$i \
        --region nyc3 \
        --size s-2vcpu-4gb \
        --image ubuntu-22-04-x64 \
        --ssh-keys $(doctl compute ssh-key list --format ID --no-header) \
        --enable-backups \
        --enable-monitoring \
        --format ID,Name,Status \
        --wait
done

# Add droplets to load balancer
echo "Adding droplets to load balancer..."
doctl compute load-balancer add-droplets $LOAD_BALANCER_ID \
    --droplet-ids $(doctl compute droplet list --format ID --no-header | grep budget-tool)

# Add droplets to firewall
echo "Adding droplets to firewall..."
doctl compute firewall add-droplets $FIREWALL_ID \
    --droplet-ids $(doctl compute droplet list --format ID --no-header | grep budget-tool)

echo "Horizontal scaling complete"
```

### 12.2 Vertical Scaling (Larger Droplet)

**File: `scripts/scale-vertically.sh`**

```bash
#!/bin/bash
set -e

echo "Scaling droplet vertically..."

DROPLET_ID="your-droplet-id"
NEW_SIZE="s-4vcpu-16gb"

# Power off droplet
echo "Powering off droplet..."
doctl compute droplet-action power-off $DROPLET_ID --wait

# Resize droplet
echo "Resizing droplet to $NEW_SIZE..."
doctl compute droplet-action resize $DROPLET_ID \
    --size $NEW_SIZE \
    --resize \
    --wait

# Power on droplet
echo "Powering on droplet..."
doctl compute droplet-action power-on $DROPLET_ID --wait

# Verify upgrade
sleep 10
echo "Verification:"
doctl compute droplet get $DROPLET_ID --format ID,Name,Memory,Vcpus,Region

echo "Vertical scaling complete"
```

### 12.3 Database Scaling

**File: `scripts/setup-db-replication.sh`**

```bash
#!/bin/bash
set -e

echo "Setting up database replication..."

PRIMARY_IP="primary-db-ip"
REPLICA_IP="replica-db-ip"

# On Primary
ssh -i ~/.ssh/id_rsa root@$PRIMARY_IP << 'EOF'
  # Create replication user
  psql -U postgres << SQL
    CREATE ROLE replicator WITH REPLICATION ENCRYPTED PASSWORD 'replicator_password';
    ALTER ROLE replicator LOGIN;
  SQL

  # Configure pg_hba.conf
  echo "host  replication  replicator  $REPLICA_IP/32  md5" >> /etc/postgresql/15/main/pg_hba.conf

  # Restart PostgreSQL
  systemctl restart postgresql
EOF

# On Replica
ssh -i ~/.ssh/id_rsa root@$REPLICA_IP << EOF
  # Stop PostgreSQL
  systemctl stop postgresql

  # Clean data directory
  rm -rf /var/lib/postgresql/15/main/*

  # Perform base backup
  pg_basebackup -h $PRIMARY_IP -U replicator -D /var/lib/postgresql/15/main -P -v --wal-method=stream

  # Create recovery configuration
  cat > /var/lib/postgresql/15/main/recovery.conf << 'SQL'
    standby_mode = 'on'
    primary_conninfo = 'host=$PRIMARY_IP user=replicator password=replicator_password'
  SQL

  chown postgres:postgres /var/lib/postgresql/15/main -R

  # Start PostgreSQL
  systemctl start postgresql
EOF

echo "Database replication configured"
```

---

## Disaster Recovery

### 13.1 Disaster Recovery Plan

**File: `DISASTER_RECOVERY.md`**

```markdown
# Disaster Recovery Plan

## Recovery Time Objectives (RTO)
- Critical Services: 1 hour
- Data Restore: 4 hours
- Full System: 24 hours

## Recovery Point Objectives (RPO)
- Database: 15 minutes (hourly backups)
- Application: 1 hour (from GitHub)
- Configuration: Immediate (in version control)

## Backup Strategy
- Daily automated backups
- 30-day retention
- Monthly long-term backups (90 days)
- Cross-region backups

## Recovery Procedures

### Database Restore from Backup
1. Stop all services
2. Restore from latest backup
3. Verify data integrity
4. Start services
5. Run smoke tests

### Application Restore
1. Restore from GitHub commit
2. Rebuild Docker images
3. Deploy to new infrastructure
4. Verify all services

### Full System Recovery
1. Create new droplet
2. Run setup scripts
3. Restore database from backup
4. Deploy application
5. Verify functionality

## Testing
- Monthly backup restoration test
- Quarterly full system recovery drill
- Document any issues found
```

### 13.2 Backup & Recovery Scripts

**File: `scripts/backup-strategy.sh`**

```bash
#!/bin/bash
set -e

BACKUP_DIR="/backups/budget-tool"
DO_SPACES_BUCKET="budget-tool-backups"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Full system backup
full_backup() {
    echo "Starting full backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/full_backup_$TIMESTAMP.tar.gz"
    
    # Backup PocketBase data
    tar -czf "$BACKUP_FILE" \
        -C /opt/budget-tool backend/pb_data/ \
        -C /opt/budget-tool .env.production
    
    # Upload to DigitalOcean Spaces
    s3cmd put "$BACKUP_FILE" "s3://$DO_SPACES_BUCKET/full_backups/"
    
    # Cleanup old backups
    find "$BACKUP_DIR" -name "full_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    echo "Full backup complete: $BACKUP_FILE"
}

# Incremental backup
incremental_backup() {
    echo "Starting incremental backup..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/incremental_backup_$TIMESTAMP.tar.gz"
    
    tar -czf "$BACKUP_FILE" \
        --newer-mtime-than /backups/last_full_backup \
        -C /opt/budget-tool backend/pb_data/
    
    s3cmd put "$BACKUP_FILE" "s3://$DO_SPACES_BUCKET/incremental_backups/"
    
    echo "Incremental backup complete"
}

# Schedule backups
case "${1:-full}" in
    full)
        full_backup
        ;;
    incremental)
        incremental_backup
        ;;
    *)
        echo "Usage: $0 {full|incremental}"
        exit 1
        ;;
esac
```

---

## SSL/TLS Management

### 14.1 Let's Encrypt Certificate Management

**File: `scripts/setup-ssl.sh`**

```bash
#!/bin/bash
set -e

DOMAIN="yourdomain.com"
EMAIL="admin@yourdomain.com"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

echo "Setting up SSL certificate with Let's Encrypt..."

# Install Certbot
apt-get update
apt-get install -y certbot python3-certbot-nginx python3-certbot-dns-digitalocean

# Create certificate
certbot certonly \
    --dns-digitalocean \
    --dns-digitalocean-credentials ~/.secrets/certbot/digitalocean.ini \
    --dns-digitalocean-propagation-seconds 60 \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --force-renewal

# Configure auto-renewal
cat > /etc/cron.d/certbot-renewal << EOF
# Renew Let's Encrypt certificates daily
0 0 * * * root certbot renew --quiet && systemctl reload nginx
EOF

# Copy certificates to Docker volumes
cp $CERT_DIR/fullchain.pem /opt/budget-tool/nginx/ssl/cert.pem
cp $CERT_DIR/privkey.pem /opt/budget-tool/nginx/ssl/key.pem

# Fix permissions
chmod 644 /opt/budget-tool/nginx/ssl/cert.pem
chmod 600 /opt/budget-tool/nginx/ssl/key.pem

# Reload Nginx
docker-compose -f /opt/budget-tool/docker-compose.prod.yml up -d nginx

echo "SSL setup complete"
```

### 14.2 SSL Certificate Renewal Script

**File: `scripts/renew-ssl.sh`**

```bash
#!/bin/bash
set -e

DOMAIN="yourdomain.com"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"
SSL_DEST="/opt/budget-tool/nginx/ssl"

echo "Renewing SSL certificate..."

# Renew certificate
certbot renew --quiet

# Copy renewed certificates
cp $CERT_DIR/fullchain.pem $SSL_DEST/cert.pem
cp $CERT_DIR/privkey.pem $SSL_DEST/key.pem

# Fix permissions
chmod 644 $SSL_DEST/cert.pem
chmod 600 $SSL_DEST/key.pem

# Reload Nginx
cd /opt/budget-tool
docker-compose -f docker-compose.prod.yml restart nginx

echo "SSL renewal complete"
```

### 14.3 DigitalOcean Credentials for Certbot

**File: `~/.secrets/certbot/digitalocean.ini`**

```ini
dns_digitalocean_token = your-digitalocean-api-token
```

Permissions:
```bash
chmod 600 ~/.secrets/certbot/digitalocean.ini
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security scan passed
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] SSL certificate valid
- [ ] Backups completed
- [ ] Monitoring configured
- [ ] Alerts configured

### Deployment
- [ ] Code pushed to main branch
- [ ] GitHub Actions triggered
- [ ] Docker images built
- [ ] Images pushed to registry
- [ ] Zero-downtime deployment started
- [ ] Health checks passing
- [ ] Smoke tests passed
- [ ] Monitoring shows normal metrics

### Post-Deployment
- [ ] Verify in production environment
- [ ] Check error logs
- [ ] Monitor resource usage
- [ ] Verify all features working
- [ ] Document deployment notes
- [ ] Notify users if needed

---

## Quick Reference Commands

### Local Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Rebuild images
docker-compose build --no-cache

# Stop services
docker-compose down
```

### Production Operations
```bash
# Check service status
ssh root@SERVER "docker-compose -f /opt/budget-tool/docker-compose.prod.yml ps"

# View logs
ssh root@SERVER "docker-compose -f /opt/budget-tool/docker-compose.prod.yml logs -f"

# Restart service
ssh root@SERVER "docker-compose -f /opt/budget-tool/docker-compose.prod.yml restart backend"

# Deploy new version
ssh root@SERVER "cd /opt/budget-tool && bash scripts/blue-green-deploy.sh"

# Backup database
ssh root@SERVER "bash /opt/budget-tool/scripts/backup-database.sh"
```

### Monitoring
```bash
# Prometheus metrics
curl http://SERVER:9090/api/v1/query?query=up

# Health check
curl https://yourdomain.com/health

# Check certificate
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | grep -A5 'Certificate'
```

---

## Cost Optimization

### DigitalOcean Recommendations
- **Droplet**: Start with Standard 4GB ($24/mo), scale up as needed
- **Backups**: Enable automated ($0.20/mo per backup)
- **Monitoring**: Enable ($10/mo per droplet)
- **Spaces**: Use for backups ($5/mo + storage)
- **Load Balancer**: Add when scaling horizontally ($10/mo)

### Cost Monitoring
```bash
doctl billing get --format-csv
```

---

## Support & Resources

- **PocketBase Docs**: https://pocketbase.io/docs
- **Docker Documentation**: https://docs.docker.com
- **DigitalOcean Docs**: https://docs.digitalocean.com
- **Let's Encrypt**: https://letsencrypt.org
- **Prometheus**: https://prometheus.io/docs
- **Grafana**: https://grafana.com/docs

---

**Last Updated**: July 16, 2024
**Version**: 1.0.0
