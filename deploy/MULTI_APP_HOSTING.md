# Multi-App Hosting on One Droplet

Host many apps on a single DigitalOcean droplet, each on its own subdomain of
`grotketech.com` (e.g. `budget.grotketech.com`, `notes.grotketech.com`), behind
one Nginx reverse proxy.

- **Droplet:** `shulgenius-prod` — `68.183.101.60` (Ubuntu 24.04, NYC1)
- **Pattern:** one Nginx server block per app, one shared TLS setup, one script to add an app.

```
Internet ──▶ Nginx (:80 → :443)
             ├─ budget.grotketech.com  → /var/www/budget   + /api → PocketBase :8090
             ├─ <app>.grotketech.com   → /var/www/<app>    + optional /api → :<port>
             └─ ... add more anytime
```

Everything is driven by the repo root `.env`:

```
DOMAIN=grotketech.com
LETSENCRYPT_EMAIL=spentelnik@gmail.com
DIGITALOCEAN_API_TOKEN=dop_v1_...          # droplet/compute management
CLOUDFLARE_API_TOKEN=cfat_...              # DNS for $DOMAIN (Zone:DNS:Edit + Zone:Read)
CLOUDFLARE_ZONE_ID=705a81df8644c7a212e5caebf69ea274
CLOUDFLARE_ACCOUNT_ID=8041200dd37c5d7d2616ffd127aea606
```

> DNS for grotketech.com is on **Cloudflare**; the droplet (compute) is on
> DigitalOcean. The Cloudflare token needs `Zone:DNS:Edit` + `Zone:Read` scoped
> to grotketech.com, and should be **non-expiring** so cert auto-renewal keeps
> working.

---

## Files

```
deploy/
├── nginx/
│   ├── conf.d/00-shared.conf              # http-context: rate-limit zones, upstreams, gzip
│   ├── snippets/ssl.conf                  # shared TLS + security headers (uses __DOMAIN__)
│   └── sites-available/
│       ├── 00-http-redirect.conf          # :80 → :443 for all subdomains + ACME
│       ├── budget.conf                    # the Budget Tool app
│       └── _template.conf                 # copy-me for new apps
└── scripts/
    ├── lib.sh                             # shared: loads .env, DO + Cloudflare API helpers
    ├── cloudflare-dns.sh <sub>            # add/update a subdomain A record (Cloudflare)
    ├── setup-wildcard-ssl.sh              # wildcard *.DOMAIN cert (Let's Encrypt + Cloudflare DNS-01)
    ├── install-nginx-configs.sh           # render + install all configs, reload
    ├── add-app.sh <app> [port]            # scaffold a new app subdomain
    └── deploy-budget.sh                    # build + publish the budget frontend
```

`__DOMAIN__` placeholders are substituted with `$DOMAIN` at install time, so the
committed configs stay domain-agnostic and reusable.

---

## DNS + SSL (Cloudflare)

DNS is on Cloudflare, so records and certs are automated with the Cloudflare token.

**DNS** — one A record per app (add-app.sh does this for you):
```bash
deploy/scripts/cloudflare-dns.sh budget            # budget.grotketech.com -> droplet IP (DNS-only)
deploy/scripts/cloudflare-dns.sh budget '' true    # same, but proxied (orange cloud)
```

**SSL — pick one:**

- **Let's Encrypt wildcard (origin cert, works proxied or not):**
  ```bash
  deploy/scripts/setup-wildcard-ssl.sh   # one *.grotketech.com cert via Cloudflare DNS-01
  ```
  Covers every current + future subdomain; auto-renews. Requires a **non-expiring**
  Cloudflare token (renewal runs every ~60 days). If subdomains are proxied, set the
  Cloudflare zone SSL mode to **Full (strict)**.

- **Cloudflare-proxied + Origin Certificate (set-and-forget, no renewals):**
  1. Create the DNS record **proxied** (orange): `cloudflare-dns.sh budget '' true`
  2. Cloudflare dashboard → SSL/TLS → Origin Server → **Create Certificate** (15-year).
     Save the cert/key on the droplet and point `snippets/ssl.conf` at them.
  3. Set SSL/TLS mode to **Full (strict)**.
  This never touches the token again after DNS — best when the token is short-lived.

> **Current state:** `budget.grotketech.com → 68.183.101.60` already exists as a
> DNS-only record. Flip it to proxied once Nginx + a cert are in place.

---

## First-time droplet setup

```bash
# On the droplet, as root, after `git pull` in the repo:
apt-get update && apt-get install -y nginx rsync

# 1. DNS + SSL — see the Cloudflare section above
#    (cloudflare-dns.sh for records, setup-wildcard-ssl.sh for the cert).

# 2. Install the shared config + all app server blocks.
deploy/scripts/install-nginx-configs.sh      # renders __DOMAIN__, symlinks, nginx -t, reload

# 3. Build + publish the budget frontend.
deploy/scripts/deploy-budget.sh              # → /var/www/budget

# PocketBase must be running on :8090 (existing setup). Create collections:
backend/setup-collections.sh
```

Budget Tool is now live at **https://budget.grotketech.com** (frontend + same-origin `/api`).

---

## Add a new app

```bash
# Static SPA only:
deploy/scripts/add-app.sh notes
#   → notes.grotketech.com, web root /var/www/notes, DNS record, nginx reloaded
#   → build your SPA and rsync its dist to /var/www/notes/

# SPA + its own backend on port 8091:
deploy/scripts/add-app.sh todo 8091
#   → todo.grotketech.com, /api → 127.0.0.1:8091, upstream registered
```

With the wildcard cert already in place, the new subdomain is HTTPS immediately —
no extra cert step. (With the Origin-cert approach, just create the record proxied.)

---

## Notes / safety

- **Coexistence:** this droplet is tagged `shulgenius` and may already run an app.
  The `sites-available`/`sites-enabled` pattern adds files without touching existing
  ones. `install-nginx-configs.sh` removes only the stock `default` site. Inspect
  `/etc/nginx/sites-enabled/` first if an app is already served here.
- **PocketBase admin** (`/_/`) is denied from the public internet. Reach it via
  `ssh -L 8090:localhost:8090 root@68.183.101.60` then open `http://localhost:8090/_/`.
- **Secrets:** `.env` holds the DO token and is git-ignored. Keep it that way.
