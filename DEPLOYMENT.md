# Budget Tool Deployment Guide

## Current Status
✅ Frontend: Running on port 3001  
✅ Backend: PocketBase running on port 8090  
✅ Database: SQLite initialized  
⏳ Database Schema: Needs setup  

## Access Points
- **Frontend**: http://68.183.101.60:3001
- **Backend API**: http://68.183.101.60:8090/api
- **Admin UI**: http://68.183.101.60:8090/_/

## Initial Setup Steps

### 1. Create Admin Account
1. Navigate to http://68.183.101.60:8090/_/
2. You'll see the PocketBase setup screen
3. Create your admin account (email & password)
4. Note these credentials - you'll need them for the next step

### 2. Set Up Database Schema
Once admin account is created, run the collection setup script:

```bash
ssh root@68.183.101.60
cd /opt/budget-tool

# Set your admin credentials
export ADMIN_EMAIL="your-admin@email.com"
export ADMIN_PASSWORD="your-admin-password"

# Run setup script
bash backend/setup-collections.sh
```

This will create the following collections:
- **accounts**: Bank accounts connected to the user
- **transactions**: Individual transactions from bank statements
- **categories**: Transaction categories
- **rules**: Auto-categorization rules
- **statements**: Uploaded bank statements

### 3. Test the Application
1. Navigate to http://68.183.101.60:3001
2. Create a new account (Sign Up)
3. Log in
4. You should see the dashboard

## Troubleshooting

### Frontend not loading
```bash
# Check if http-server is running
ssh root@68.183.101.60 "pm2 status | grep budget-tool-frontend"

# Check logs
ssh root@68.183.101.60 "pm2 logs budget-tool-frontend --lines 50"

# Rebuild frontend if needed
ssh root@68.183.101.60
cd /opt/budget-tool/frontend
npm install --legacy-peer-deps
npm run build
pm2 restart budget-tool-frontend
```

### Backend not responding
```bash
# Check PocketBase status
ssh root@68.183.101.60 "pm2 status | grep budget-tool-pocketbase"

# Check health
curl http://68.183.101.60:8090/api/health

# Check logs
ssh root@68.183.101.60 "pm2 logs budget-tool-pocketbase --lines 50"
```

## Auto-Deployment
The droplet has a cron job that auto-deploys from GitHub:
- Every 10 minutes, it pulls the latest code from `github.com/simchap123/budget-tool`
- Rebuilds the frontend
- Restarts PM2 services

To trigger a deployment:
1. Make changes and push to GitHub master branch
2. Wait up to 10 minutes for auto-deployment
3. Check deployment status: `ssh root@68.183.101.60 "cat /opt/budget-tool/deploy.log | tail -20"`

## Project Structure
```
/opt/budget-tool/
├── frontend/           # React app (port 3001)
├── backend/           # PocketBase binary
├── pb_data/           # PocketBase data (SQLite)
├── ecosystem.config.js # PM2 configuration
└── deploy.sh          # Auto-deployment script
```

## Next Steps
1. Create admin account in PocketBase admin UI
2. Run collection setup script
3. Test the application
4. Implement Plaid integration for bank connections
5. Implement Claude AI for transaction categorization
6. Build bank statement upload feature
