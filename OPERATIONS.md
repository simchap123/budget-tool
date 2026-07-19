# Budget Tool — Operations & Next Steps

Practical runbook for the live deployment. The app is complete and live at
**https://budget.grotketech.com**. The items below are the remaining *external*
actions (dashboards, not code) plus day-to-day ops.

---

## 1. Finish live Chase sync (Plaid)

The Plaid integration is fully built and proven in sandbox (48 txns synced). Chase's
OAuth server currently returns a 500 because **Chase isn't yet enabled for your
Plaid production account** — this is an approval step on Plaid's side, not a bug.

1. **Confirm production access** — Plaid Dashboard → *Overview*. You need an approved
   Production application (not just Production keys). If it says "limited"/"pending",
   complete the application (company info, use case, app display info).
2. **Institution status** — Dashboard → *Institutions* / OAuth institutions. Check
   Chase's status for your account; large banks (Chase = JPMorgan) require per-customer
   enrollment and can take 1–2 days after the registration requirements are met.
3. **Verify the pipeline meanwhile** — connect a *different* bank via the app's
   "Connect Bank" button. If it syncs, the pipeline is 100% working and Chase is purely
   an enrollment matter to raise with Plaid support.
4. Redirect URI is already registered (`https://budget.grotketech.com`) and accepted.

**Flip Plaid env** (already `production`): edit `PLAID_ENV` in
`/opt/budget-tool/pocketbase.ecosystem.config.js` and
`pm2 restart budget-tool-pocketbase --update-env` (or `pm2 delete` + `pm2 start` the
ecosystem file, which is more reliable).

---

## 2. Enable Gemini (AI category fallback)

Category suggestions already work from your own history (no AI needed). The Gemini
*fallback* (for brand-new merchants) needs quota:

1. Google AI Studio / Cloud Console → the project behind the key → **enable billing**
   (the key currently returns `quota: 0`).
2. No code change needed — `GEMINI_API_KEY` is already wired into the PocketBase env.

---

## 3. Rotate the credentials shared in chat

These were pasted into a chat and should be rotated:

- **Plaid production secret** — Dashboard → Keys → Rotate. Update `PLAID_SECRET_PRODUCTION`
  in the ecosystem file, restart PocketBase.
- **Cloudflare token** — expires **2026-07-26** anyway. Create a **non-expiring** token
  (`Zone:DNS:Edit` + `Zone:Read`, scoped to grotketech.com) so cert auto-renewal keeps
  working; update `CLOUDFLARE_API_TOKEN` in `.env`.
- **DigitalOcean token** — rotate in the DO control panel; update `.env`.

`.env` on your machine is git-ignored; the droplet secrets live in the pm2 ecosystem
file (root-only).

---

## 4. Deploy / operate

**Droplet:** `shulgenius-prod` (68.183.101.60), Ubuntu 24.04. SSH as root.

**Deploy the frontend** (after `git pull` locally or on the droplet):
```bash
cd frontend && npm ci && npm run build
# then publish (from your machine):
cd dist && tar czf - . | ssh root@68.183.101.60 'rm -rf /var/www/budget-tool/* && tar xzf - -C /var/www/budget-tool'
```
`http-server` serves `/var/www/budget-tool` on :3001 with no-cache, so changes appear on
refresh. Nginx (`/etc/nginx/sites-available/grotketech`) proxies `budget.grotketech.com`
→ :3001 and `/api` → PocketBase :8090.

**Backend hooks** (Plaid/AI): edit `backend/pb_hooks/*.pb.js`, copy to
`/opt/budget-tool/pb_hooks/`, `pm2 restart budget-tool-pocketbase`.

**Admin panel:** `admin@grotketech.com`. Reach it privately:
`ssh -L 8090:localhost:8090 root@68.183.101.60` → http://localhost:8090/_/

**Backups:** SQLite at `/opt/budget-tool/pb_data/data.db`; timestamped copies in
`/root/data.db.bak-*`. Nginx config backup: `/root/nginx-backup-*.tar.gz`.

**Tests:** `cd frontend && npm test` (43 tests). CI-style gate: `npm run type-check && npm run lint && npm test && npm run build`.

---

## 5. Add another app on its own subdomain

All apps live under grotketech.com. To add one (see `deploy/MULTI_APP_HOSTING.md`):
```bash
deploy/scripts/cloudflare-dns.sh <app>          # DNS record -> droplet
deploy/scripts/add-app.sh <app> [backendPort]   # nginx vhost (wildcard cert reused)
# deploy the app's build to /var/www/<app>
```
The wildcard `*.grotketech.com` cert already covers new subdomains (no per-app cert).

---

## 6. Current apps on the droplet

| Subdomain | App | Backend |
|---|---|---|
| budget.grotketech.com | Budget Tool | PocketBase :8090 + static :3001 |
| amstar.grotketech.com | Amstar Supplies | :3020 / :3021 |
| app.grotketech.com | ShulGenius | :3000 |
| chords.grotketech.com | Chord Library | :3022 |
| intake.grotketech.com | ShulGenius Intake | :3025 |
| voice.grotketech.com | Voice agent | :4188 |

Old `*.shulgenius.com` URLs 301-redirect to the grotketech equivalents.
