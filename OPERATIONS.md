# Budget Tool — Operations & Next Steps

Practical runbook for the live deployment. The app is complete and live at
**https://budget.grotketech.com**. The items below are the remaining *external*
actions (dashboards, not code) plus day-to-day ops.

---

## 1. Connect Chase (Plaid — fully built)

The full Plaid **Hosted Link** flow is built, secured, and verified end-to-end in
sandbox. Chase availability is **confirmed in production**: `/institutions/search`
with the live production creds returns **Chase `ins_56`, `oauth: true`, transactions
product** — so there is no Plaid enrollment/access blocker. The production
`create-hosted-link` returns a real `link-production-*` token on `secure.plaid.com`,
and the webhook is publicly reachable + fail-closed (401 without the key).
**The only remaining step is entering your Chase login.**

### How it works (all live)
- **"Connect Bank"** → `POST /api/plaid/create-hosted-link` → redirects you to
  Plaid's own secure page (`secure.plaid.com/hl/...`). No embedded JS, so no cache
  or cross-device issues.
- You connect Chase there → Plaid calls **`POST /api/plaid/webhook`** (public,
  authenticated by a `?key=<PLAID_WEBHOOK_SECRET>` — Plaid doesn't support custom
  webhook headers, and ES256/JWK verification isn't feasible in the JSVM, so this
  URL secret + the `plaid_pending` mapping is the auth).
- The webhook exchanges the token, stores the item (`plaid_items`), and syncs.
- `TRANSACTIONS/SYNC_UPDATES_AVAILABLE` webhooks keep pulling data server-side as
  Plaid prepares your full history (Chase histories are large and arrive async).
  All syncs dedupe by `plaidId` (no duplicates).
- On return (`/?plaid=done`) the app watches your transaction count for ~90s using
  cheap local checks (not repeated Plaid calls) and **auto-refreshes the moment
  transactions land** — so a large Chase history appears without a manual reload.
- Afterwards, **"Sync now"** in the *Connected banks* panel pulls newly-posted
  transactions on demand (reports the count; safely idempotent).

### To connect
1. Open **budget.grotketech.com** in an **incognito** window; log in.
2. **Connect Bank** → pick **Chase** on Plaid's page → sign in → authorize.
3. Transactions import automatically and appear on the dashboard within ~90s;
   use **Sync now** anytime to pull the latest.

### If Chase errors on Plaid's page
Chase `ins_56` is confirmed available for this account (see above), so the code and
access are ruled out — an error here would be a Plaid/Chase **production-enrollment**
matter (not our code):
- Plaid Dashboard → confirm the Production application is fully **approved**.
- JPMorgan may require per-customer enrollment (can take 1–2 days after meeting
  registration requirements) even though the institution shows available.
- Sanity check: connect a *different* bank — if it syncs, Chase is purely enrollment.
- Read the authenticated webhook + `pm2 logs budget-tool-pocketbase` to see the
  exact Plaid-side result.

**Env** (`PLAID_ENV`, secrets) lives in `/opt/budget-tool/pocketbase.ecosystem.config.js`.
Apply changes with `pm2 delete budget-tool-pocketbase && pm2 start …ecosystem.config.js`
(more reliable than `--update-env`).

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
