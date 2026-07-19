#!/usr/bin/env bash
# Render the repo's nginx configs (substitute __DOMAIN__) and install them into
# /etc/nginx, then test + reload. Idempotent. Run on the droplet as root.
#
# Reads DOMAIN from .env
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_domain

SRC="$REPO_ROOT/deploy/nginx"

info "Installing shared HTTP config + snippets (domain=$DOMAIN)..."
install -d /etc/nginx/conf.d /etc/nginx/snippets /etc/nginx/sites-available /etc/nginx/sites-enabled /var/www/certbot

# conf.d (http-context shared settings) — copied verbatim.
cp "$SRC/conf.d/00-shared.conf" /etc/nginx/conf.d/00-shared.conf

# snippets — substitute the domain into the shared SSL cert paths.
sed "s/__DOMAIN__/$DOMAIN/g" "$SRC/snippets/ssl.conf" > /etc/nginx/snippets/ssl.conf

# Ensure the base nginx.conf includes sites-enabled (Ubuntu default does; add if missing).
if ! grep -q 'sites-enabled' /etc/nginx/nginx.conf; then
  sed -i '/http {/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
fi

install_site() {
  local name="$1"
  sed "s/__DOMAIN__/$DOMAIN/g" "$SRC/sites-available/$name" > "/etc/nginx/sites-available/$name"
  ln -sf "/etc/nginx/sites-available/$name" "/etc/nginx/sites-enabled/$name"
  info "  installed $name"
}

# Install the http-redirect and every real app (skip the _template).
install_site "00-http-redirect.conf"
for f in "$SRC"/sites-available/*.conf; do
  base="$(basename "$f")"
  case "$base" in
    _template.conf|00-http-redirect.conf) continue ;;
  esac
  install_site "$base"
done

# Remove the default Ubuntu site if present (it steals :80/:443).
rm -f /etc/nginx/sites-enabled/default

info "Testing nginx config..."
nginx -t
info "Reloading nginx..."
systemctl reload nginx
info "Done."
