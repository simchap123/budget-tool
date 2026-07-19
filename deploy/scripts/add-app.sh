#!/usr/bin/env bash
# Scaffold a NEW app on its own subdomain. Renders the template into
# deploy/nginx/sites-available/<app>.conf, adds a DNS record, creates the web
# root, and (on the droplet) installs + reloads nginx.
#
# Usage:
#   ./add-app.sh <app> [backend_port]
#     <app>          subdomain + name, e.g. notes  ->  notes.$DOMAIN
#     [backend_port] optional; if given, wires /api -> 127.0.0.1:<port>
#                    and registers an upstream. Omit for a static-only app.
#
# Examples:
#   ./add-app.sh notes            # static SPA at notes.$DOMAIN
#   ./add-app.sh todo 8091        # SPA + backend on :8091 at todo.$DOMAIN
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_domain

APP="${1:?Usage: add-app.sh <app> [backend_port]}"
PORT="${2:-}"
SRC="$REPO_ROOT/deploy/nginx"
DEST="$SRC/sites-available/$APP.conf"

[ -e "$DEST" ] && die "$DEST already exists. Edit it directly or remove it first."

BACKEND="${APP}_backend"
info "Rendering nginx config for $APP.$DOMAIN ..."
sed -e "s/__APP__/$APP/g" -e "s/__DOMAIN__/$DOMAIN/g" -e "s/__BACKEND__/$BACKEND/g" \
  "$SRC/sites-available/_template.conf" > "$DEST"

if [ -n "$PORT" ]; then
  # Register the upstream (once) in the shared conf.
  if ! grep -q "upstream $BACKEND " "$SRC/conf.d/00-shared.conf"; then
    printf '\nupstream %s { server 127.0.0.1:%s; }\n' "$BACKEND" "$PORT" >> "$SRC/conf.d/00-shared.conf"
    info "Registered upstream $BACKEND -> 127.0.0.1:$PORT"
  fi
else
  # Static-only: strip the /api proxy block from the rendered config.
  # Removes the block from the "# --- Backend proxy" marker through its closing brace.
  sed -i '/# --- Backend proxy/,/^    }$/d' "$DEST"
  info "Static-only app (no backend). Removed /api block."
fi

info "Created $DEST"

# DNS via Cloudflare (safe to skip when running off-droplet or without creds).
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ZONE_ID:-}" ]; then
  "$(dirname "${BASH_SOURCE[0]}")/cloudflare-dns.sh" "$APP" || info "DNS step skipped/failed (add $APP A record in Cloudflare manually)."
else
  info "Cloudflare creds not set — add an A record for $APP.$DOMAIN -> droplet IP manually."
fi

# If we're on the droplet, create the web root and install.
if [ -d /etc/nginx ]; then
  install -d "/var/www/$APP"
  "$(dirname "${BASH_SOURCE[0]}")/install-nginx-configs.sh"
  info "App live. Deploy its build output to /var/www/$APP/ (SPA) and it's reachable at https://$APP.$DOMAIN"
else
  info "Not on the droplet — commit deploy/nginx/ and run install-nginx-configs.sh there."
fi
