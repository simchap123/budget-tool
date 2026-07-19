# Manual Deployment Guide

If you can't run the DEPLOY.sh script, follow these manual steps to update the production server.

## Quick Fix for White-on-White Issue

**The Problem**: The server at `68.183.101.60` is serving an outdated build without the dark theme CSS.

**The Solution**: Copy the latest built files to the server.

---

## Step 1: Build Locally

```bash
cd frontend
npm run build
```

✓ Creates fresh build in `frontend/dist/`

---

## Step 2: Upload to Server

Use SCP (Secure Copy) to upload the dist folder:

```bash
# SSH into the server and prepare directory
ssh root@68.183.101.60 "mkdir -p /var/www/budget-tool"

# Copy all built files
scp -r frontend/dist/* root@68.183.101.60:/var/www/budget-tool/
```

---

## Step 3: Verify on Server

```bash
# Check files are there
ssh root@68.183.101.60 "ls -lah /var/www/budget-tool/"

# Should show:
# index.html
# manifest.json
# service-worker.js
# assets/ (folder with CSS and JS)
```

---

## Step 4: Test in Browser

1. Open http://68.183.101.60 in your browser
2. **Hard refresh** to clear cache:
   - Windows/Linux: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`
3. Page should now show **dark background** with **light text**

---

## Alternative: Using Nginx/Web Server

If files are not directly served at the root, update your Nginx config:

```nginx
server {
    listen 80;
    server_name 68.183.101.60;

    root /var/www/budget-tool;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;  # For SPA routing
    }

    location /api {
        proxy_pass http://localhost:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Cache assets (CSS, JS, images)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Then reload Nginx:
```bash
sudo systemctl reload nginx
```

---

## Troubleshooting

### Still Seeing Old Version?

**Check 1**: Browser Cache
- Hard refresh: `Ctrl + Shift + R` (not just `Ctrl + R`)
- Clear entire cache: DevTools → Storage → Clear All

**Check 2**: Server Files
```bash
ssh root@68.183.101.60 "cat /var/www/budget-tool/index.html | head -20"
# Should show:
# <link rel="manifest" href="/manifest.json" />
# <meta name="theme-color" content="#0a0a0a" />
```

**Check 3**: CSS is Loading
1. Open http://68.183.101.60
2. Open DevTools (F12)
3. Go to Network tab
4. Refresh page
5. Look for `index-*.css` file
6. Click it, check the status is 200 (not 304 cached)
7. Click Preview tab
8. Scroll to bottom, should see dark theme colors like `#0a0a0a`, `#191919`

**Check 4**: Verify Web Server is Serving Files
```bash
ssh root@68.183.101.60 "head -5 /var/www/budget-tool/index.html"
# Should show the new index.html content
```

---

## Files Deployed

After deployment, the server should have:

```
/var/www/budget-tool/
├── index.html           (React SPA entry point)
├── manifest.json        (PWA metadata)
├── service-worker.js    (Offline support)
└── assets/
    ├── index-*.js       (React app compiled)
    └── index-*.css      (Dark theme styles)
```

---

## Post-Deployment Verification

### Desktop Browser
- [ ] Dark background visible (not white)
- [ ] Light text readable
- [ ] Header navigation works
- [ ] Can login/signup
- [ ] Dashboard shows transactions
- [ ] Month filter works
- [ ] Charts display (Reports page)
- [ ] Budget page loads
- [ ] Categories page loads
- [ ] Analytics page loads

### Mobile Browser
- [ ] Hamburger menu appears
- [ ] Navigation menu works
- [ ] Layouts responsive
- [ ] Touch targets visible
- [ ] Can tap buttons without missing

### PWA Features
- [ ] Manifest loads (DevTools → Application → Manifest)
- [ ] Service worker registered (DevTools → Application → Service Workers)
- [ ] Install button appears (address bar)
- [ ] Works offline

---

## Emergency Rollback

If something breaks, revert to previous version:

```bash
# Check git history
git log --oneline | head -5

# Download previous working build
git checkout <previous-commit> -- frontend/

# Rebuild and redeploy
cd frontend && npm run build
scp -r frontend/dist/* root@68.183.101.60:/var/www/budget-tool/

# Then restore main branch
git checkout master -- frontend/
```

---

## Questions?

- **Is the server running?** Check: `ssh root@68.183.101.60 "uptime"`
- **Is Nginx running?** Check: `ssh root@68.183.101.60 "systemctl status nginx"`
- **Are ports open?** Check: `ssh root@68.183.101.60 "netstat -tlnp | grep :80"`
- **Check server logs**: `ssh root@68.183.101.60 "tail -50 /var/log/nginx/access.log"`

