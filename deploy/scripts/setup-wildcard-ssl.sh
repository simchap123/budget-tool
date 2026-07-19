#!/usr/bin/env bash
# Obtain a single wildcard TLS cert (*.DOMAIN + DOMAIN) via Let's Encrypt using
# the DNS-01 challenge and Cloudflare's DNS API. One cert covers every current
# and future subdomain, so adding an app never needs another cert.
#
# Run on the droplet (Ubuntu) as root. Reads DOMAIN + CLOUDFLARE_API_TOKEN from .env
#
# NOTE: certbot auto-renews every ~60 days, so CLOUDFLARE_API_TOKEN must be a
# NON-EXPIRING token with Zone:DNS:Edit + Zone:Read scoped to $DOMAIN.
set -euo pipefail
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
require_domain
require_cf

info "Installing certbot + Cloudflare DNS plugin..."
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y certbot python3-certbot-dns-cloudflare >/dev/null
else
  die "This script expects apt (Ubuntu/Debian). Install certbot + dns-cloudflare manually."
fi

CREDS=/root/.secrets/certbot/cloudflare.ini
mkdir -p "$(dirname "$CREDS")"
umask 077
printf 'dns_cloudflare_api_token = %s\n' "$CLOUDFLARE_API_TOKEN" > "$CREDS"
chmod 600 "$CREDS"

info "Requesting wildcard certificate for *.$DOMAIN and $DOMAIN ..."
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials "$CREDS" \
  --dns-cloudflare-propagation-seconds 30 \
  -d "$DOMAIN" -d "*.$DOMAIN" \
  --non-interactive --agree-tos \
  -m "${LETSENCRYPT_EMAIL:-admin@$DOMAIN}" \
  --keep-until-expiring

info "Certificate obtained. certbot installed a systemd timer for auto-renewal."
info "If your subdomains are Cloudflare-proxied (orange cloud), set the zone SSL"
info "mode to 'Full (strict)' so the edge trusts this origin cert."
info "Reload nginx after installing configs:  systemctl reload nginx"
