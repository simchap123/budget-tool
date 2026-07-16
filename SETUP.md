# Budget Tool — Complete Setup Guide

Deploy Budget Tool on a DigitalOcean droplet with PocketBase backend.

## Overview

```
Your Computer                DigitalOcean Droplet ($5/month)
┌─────────────┐             ┌────────────────────────────┐
│  Frontend   │─────────→  │  Nginx (reverse proxy)      │
│  (local dev)│            ├────────────────────────────┤
└─────────────┘            │  PocketBase (port 8090)    │
                           │  - SQLite database         │
                           │  - REST API                │
                           │  - File storage            │
                           │                            │
                           │  Frontend build (port 3000)│
                           └────────────────────────────┘
```

## Part 1: Local Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (or PocketBase binary)
- Git

### 1. Install Dependencies

```bash
cd BudgetTool

# Frontend
cd frontend && npm install && cd ..

# Backend (PocketBase) - download binary
cd backend
# Download from https://pocketbase.io/
# Extract pocketbase binary here
cd ..
```

### 2. Create Environment File

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_API_URL=http://localhost:8090
ANTHROPIC_API_KEY=sk-ant-...
PLAID_CLIENT_ID=...
PLAID_SECRET=...
```

### 3. Start Backend (PocketBase)

**Option A: Docker**
```bash
docker-compose up pocketbase
```

**Option B: Binary**
```bash
cd backend
./pocketbase serve
```

Backend runs on: **http://localhost:8090**
Admin panel: **http://localhost:8090/_/** (login with `admin@budgettool.local` / `changeme123`)

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on: **http://localhost:5173**

### 5. Test It

- Visit http://localhost:5173
- Sign up for an account
- Should connect to PocketBase backend

## Part 2: Deploy to DigitalOcean

### Step 1: Create Droplet

1. Go to https://www.digitalocean.com
2. Click "Create" → "Droplets"
3. Select:
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic ($5/month)
   - **Region**: Closest to you
   - **Authentication**: SSH Key (or password)
4. Click "Create Droplet"
5. Wait for initialization (2-3 minutes)
6. Note the IP address

### Step 2: SSH Into Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### Step 3: Install Docker

```bash
apt update && apt install -y docker.io docker-compose git curl

# Add current user to docker group (optional)
usermod -aG docker root
```

### Step 4: Clone Your Repository

```bash
cd /root
git clone YOUR_REPO_URL BudgetTool
cd BudgetTool
```

### Step 5: Configure Environment

```bash
# Create .env file
cat > .env.production << 'EOF'
VITE_API_URL=https://api.budgettool.com
ANTHROPIC_API_KEY=sk-ant-...
PLAID_CLIENT_ID=...
PLAID_SECRET=...
EOF
```

### Step 6: Build Frontend

```bash
cd frontend
npm install
npm run build
# Output in frontend/dist/

cd ..
```

### Step 7: Create Systemd Service Files

Create `/etc/systemd/system/pocketbase.service`:
```ini
[Unit]
Description=PocketBase API Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/BudgetTool/backend
ExecStart=/root/BudgetTool/backend/pocketbase serve
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/frontend.service`:
```ini
[Unit]
Description=Budget Tool Frontend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/BudgetTool/frontend/dist
ExecStart=/usr/bin/python3 -m http.server 3000
Environment="PORT=3000"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start services:
```bash
systemctl daemon-reload
systemctl enable pocketbase
systemctl enable frontend
systemctl start pocketbase
systemctl start frontend

# Check status
systemctl status pocketbase
systemctl status frontend
```

### Step 8: Install & Configure Nginx

```bash
apt install -y nginx certbot python3-certbot-nginx
```

Copy nginx configuration:
```bash
cp /root/BudgetTool/nginx.conf /etc/nginx/nginx.conf
nginx -t  # Test config
systemctl restart nginx
```

### Step 9: Get SSL Certificate

```bash
# Replace budgettool.com with your domain
certbot certonly --standalone -d budgettool.com -d api.budgettool.com -d pb.budgettool.com

# Auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer
```

### Step 10: Configure DNS

In your domain registrar (GoDaddy, Namecheap, etc.):
- Create A record: `budgettool.com` → `YOUR_DROPLET_IP`
- Create A record: `api.budgettool.com` → `YOUR_DROPLET_IP`
- Create A record: `pb.budgettool.com` → `YOUR_DROPLET_IP`

Wait 5-15 minutes for DNS propagation.

### Step 11: Verify Deployment

```bash
# From your computer
curl https://budgettool.com          # Should get frontend
curl https://api.budgettool.com/api  # Should get PocketBase API
curl https://pb.budgettool.com       # PocketBase admin (if allowed)
```

### Step 12: Configure PocketBase Admin

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Change admin password
# Visit https://pb.budgettool.com and login
# Go to Settings → Auth Collections → Users
# Change admin password from 'changeme123' to secure password
```

## Part 3: Maintenance

### Backup Data

```bash
# On droplet
tar -czf pb_backup_$(date +%Y%m%d).tar.gz /root/BudgetTool/backend/pb_data/

# Download to your computer
scp root@YOUR_DROPLET_IP:/root/pb_backup_*.tar.gz ./
```

### Update Code

```bash
# On droplet
cd /root/BudgetTool
git pull origin main

# Rebuild frontend
cd frontend && npm run build && cd ..

# Restart services
systemctl restart pocketbase
systemctl restart frontend
```

### Monitor Services

```bash
# Check service status
systemctl status pocketbase
systemctl status frontend

# View logs
journalctl -u pocketbase -f
journalctl -u frontend -f
```

### Database Management

```bash
# Backup database
cd /root/BudgetTool/backend
./pocketbase backup pb_backup_$(date +%Y%m%d)

# Access PocketBase admin
# Visit https://pb.budgettool.com (internal IP access)
```

## Part 4: Cost Breakdown

| Item | Cost | Notes |
|------|------|-------|
| DigitalOcean Droplet | $5/month | Ubuntu 22.04, 1GB RAM, 25GB SSD |
| Domain | ~$12/year | budgettool.com, etc. |
| SSL Certificate | Free | Let's Encrypt, auto-renewing |
| API Calls | Pay-as-you-go | Anthropic API, Plaid API |
| **Total** | **~$20-30/month** | For most use cases |

## Troubleshooting

### Frontend not loading
```bash
# Check frontend service
systemctl status frontend
journalctl -u frontend -n 50
```

### API errors (502 Bad Gateway)
```bash
# Check PocketBase
systemctl status pocketbase
journalctl -u pocketbase -n 50

# PocketBase might be crashing - check logs
```

### SSL certificate errors
```bash
# Check certificate
certbot certificates

# Renew if needed
certbot renew --dry-run  # Test renewal
certbot renew             # Actually renew
```

### Database issues
```bash
# SSH into droplet
cd /root/BudgetTool/backend

# Stop PocketBase
systemctl stop pocketbase

# Check database
./pocketbase admin

# Restore from backup if needed
# Restart
systemctl start pocketbase
```

## Security Best Practices

1. **Change Default Credentials**
   - PocketBase admin password
   - SSH key instead of password

2. **Firewall Rules**
   ```bash
   ufw enable
   ufw default deny incoming
   ufw allow ssh
   ufw allow http
   ufw allow https
   ```

3. **Keep Updated**
   ```bash
   apt update && apt upgrade -y
   ```

4. **Monitor Services**
   - Use `systemctl` to check service status
   - Check logs regularly
   - Set up log rotation

5. **Secure Admin Panel**
   - Edit nginx.conf to restrict `pb.budgettool.com`
   - Allow only your IP

## Getting Help

- **PocketBase Docs**: https://pocketbase.io/docs
- **DigitalOcean Community**: https://www.digitalocean.com/community
- **Nginx Docs**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org

## Next Steps

1. ✅ Local development working
2. ✅ Droplet deployed
3. → Build more features (categories, rules, AI integration)
4. → Add Plaid integration
5. → Deploy updates

Ready? Start with **Part 1** above! 🚀
